import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleInput = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (!digit && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const fullOtp = otp.join('');
  const isComplete = fullOtp.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isComplete) { Alert.alert('Enter OTP', 'Please enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/verify-email`, { email, otp: fullOtp });

      // Auto-login using stored credentials
      const [[, storedEmail], [, storedPass]] = await AsyncStorage.multiGet([
        '_reg_email', '_reg_pass',
      ]);

      if (storedEmail && storedPass) {
        await login(storedEmail, storedPass);
        await AsyncStorage.multiRemove(['_reg_email', '_reg_pass']);
        // RootGuard will route to (tabs) automatically after login succeeds
      } else {
        // Fallback: go to login screen
        router.replace('/(auth)/login');
      }
    } catch (e: any) {
      Alert.alert('Verification Failed', e?.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      await axios.post(`${API_BASE}/auth/resend-otp`, { email });
      setResendCooldown(60);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      Alert.alert('Code Sent', 'A new OTP has been sent to your email.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color="#1e3a5f" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Verify Email</Text>
          <Text style={styles.headerSub}>Enter the code sent to your inbox</Text>
        </View>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="mail-open" size={56} color="#2563eb" />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.desc}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {Array(OTP_LENGTH).fill(null).map((_, i) => (
            <TextInput
              key={i}
              ref={el => { inputs.current[i] = el; }}
              style={[styles.otpBox, otp[i] ? styles.otpBoxFilled : null]}
              value={otp[i]}
              onChangeText={val => handleInput(val, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.verifyBtn, (!isComplete || loading) && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={!isComplete || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.verifyText}>Verify & Sign In</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive it? </Text>
          {resendCooldown > 0 ? (
            <Text style={styles.resendTimer}>Resend in {resendCooldown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={styles.resendLink}>Resend Code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 10 },
  desc: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  emailHighlight: { color: '#1e3a5f', fontWeight: '700' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 36 },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  otpBoxFilled: { borderColor: '#1e3a5f', backgroundColor: '#f0f6ff' },
  verifyBtn: {
    width: '100%',
    backgroundColor: '#1e3a5f',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  verifyBtnDisabled: { backgroundColor: '#94a3b8' },
  verifyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: { flexDirection: 'row', alignItems: 'center' },
  resendLabel: { fontSize: 14, color: '#6b7280' },
  resendTimer: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  resendLink: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
});
