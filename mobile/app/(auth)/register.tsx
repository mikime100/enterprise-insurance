import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../../lib/api';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId, planName, planType } = useLocalSearchParams<{
    planId: string; planName: string; planType: string;
  }>();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'Enter your full name.';
    if (!form.email.trim() || !form.email.includes('@')) return 'Enter a valid email.';
    if (!form.phone.trim()) return 'Enter your phone number.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async () => {
    const err = validate();
    if (err) { Alert.alert('Check your details', err); return; }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: 'insured_person',
        ...(planId ? { intendedPlanId: planId } : {}),
      });

      // Store password temporarily so verify-otp can auto-login after OTP
      await AsyncStorage.multiSet([
        ['_reg_email', form.email.trim().toLowerCase()],
        ['_reg_pass', form.password],
      ]);

      router.push({
        pathname: '/(auth)/verify-otp' as any,
        params: { email: form.email.trim().toLowerCase() },
      });
    } catch (e: any) {
      Alert.alert('Registration Failed', e?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSub}>Fill in your details to get started</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Selected plan banner */}
        {planName ? (
          <View style={styles.planBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.planBannerText}>
              Selected: <Text style={styles.planBannerName}>{planName}</Text>
            </Text>
          </View>
        ) : null}

        {/* Name row */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Abebe"
              placeholderTextColor="#9ca3af"
              value={form.firstName}
              onChangeText={set('firstName')}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Kebede"
              placeholderTextColor="#9ca3af"
              value={form.lastName}
              onChangeText={set('lastName')}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.email}
            onChangeText={set('email')}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+251 9xx xxx xxx"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={set('phone')}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="At least 6 characters"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPwd}
              value={form.password}
              onChangeText={set('password')}
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showPwd}
            value={form.confirm}
            onChangeText={set('confirm')}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
        </View>

        <Text style={styles.hint}>
          A 6-digit OTP will be sent to your email to verify your account.
        </Text>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitText}>Create Account & Send OTP</Text>
              <Ionicons name="mail" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.loginLinkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { padding: 20, gap: 4 },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  planBannerText: { fontSize: 14, color: '#374151' },
  planBannerName: { fontWeight: '700', color: '#15803d' },
  row: { flexDirection: 'row', gap: 12 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  eyeBtn: {
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#e5e7eb',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
  },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  submitBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center', padding: 8 },
  loginLinkText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
});
