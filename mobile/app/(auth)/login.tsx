import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // RootGuard handles routing: mustChangePassword → change-password, else → tabs
    } catch (e: any) {
      Alert.alert('Sign In Failed', e?.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Back to welcome */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(auth)/welcome' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#93c5fd" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Brand */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>EI</Text>
          </View>
          <Text style={styles.brand}>Enterprise Insurance</Text>
          <Text style={styles.tagline}>Your coverage, anytime anywhere</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createLink}
            onPress={() => (router.push as (h: string) => void)('/(auth)/select-plan')}
          >
            <Text style={styles.createLinkText}>New user? Create an account</Text>
          </TouchableOpacity>

          {/* Demo credentials — tap to fill */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo credentials — tap to fill</Text>
            {[
              { label: 'Employee (has claims)',  email: 'biruk@ethiotelecom.et',          password: 'Insured@123' },
              { label: 'Individual insured',     email: 'daniel.tesfaye@gmail.com',       password: 'Insured@123' },
              { label: 'Sales Broker',           email: 'broker@enterpriseinsurance.com', password: 'Broker@123'  },
              { label: 'Institution HR Admin',   email: 'hr@ethiotelecom.et',             password: 'Institution@123' },
            ].map(cred => (
              <TouchableOpacity
                key={cred.email}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#bae6fd', gap: 8 }}
                onPress={() => { setEmail(cred.email); setPassword(cred.password); }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369a1' }}>{cred.label}</Text>
                  <Text style={{ fontSize: 11, color: '#0c4a6e', marginTop: 1 }}>{cred.email}</Text>
                </View>
                <Ionicons name="arrow-down-circle-outline" size={18} color="#0369a1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e3a5f' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
    alignSelf: 'flex-start',
  },
  backText: { color: '#93c5fd', fontSize: 15, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { fontSize: 24, fontWeight: '800', color: '#1e3a5f' },
  brand: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  tagline: { fontSize: 13, color: '#93c5fd', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#111827', marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  inputFlex: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0, marginBottom: 0 },
  eyeBtn: {
    borderWidth: 1, borderLeftWidth: 0, borderColor: '#e5e7eb',
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    padding: 14, backgroundColor: '#f9fafb',
  },
  btn: {
    backgroundColor: '#1e3a5f', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 4, marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  createLink: { alignItems: 'center', marginBottom: 16 },
  createLinkText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  demoBox: {
    backgroundColor: '#f0f9ff', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#bae6fd', gap: 6,
  },
  demoTitle: { fontSize: 12, fontWeight: '700', color: '#0369a1', marginBottom: 2 },
  demoLine: { fontSize: 12, color: '#0c4a6e', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  demoBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#bae6fd', gap: 8,
  },
  demoBtnLabel: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
  demoBtnEmail: { fontSize: 11, color: '#0c4a6e', marginTop: 1 },
});
