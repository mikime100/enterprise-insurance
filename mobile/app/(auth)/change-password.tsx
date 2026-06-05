import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) {
      Alert.alert('Too Short', 'Password must be at least 6 characters.'); return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      await api.post('/auth/set-password', { newPassword: password });
      // RootGuard will re-check user after this — navigate to tabs directly
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* No back button — this screen is mandatory */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Set Your Password</Text>
          <Text style={styles.headerSub}>You must set a new password before continuing</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={22} color="#2563eb" />
          <Text style={styles.infoText}>
            {user?.firstName
              ? `Hi ${user.firstName}, your account was registered by an admin or broker. Set a permanent password to continue.`
              : 'Your account requires a password change before you can access the app.'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="At least 6 characters"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat your new password"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showPwd}
            value={confirm}
            onChangeText={setConfirm}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {/* Password strength hint */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {['6+ chars', 'Uppercase', 'Number'].map(hint => {
                const passes =
                  hint === '6+ chars' ? password.length >= 6
                  : hint === 'Uppercase' ? /[A-Z]/.test(password)
                  : /\d/.test(password);
                return (
                  <View key={hint} style={[styles.strengthPill, passes && styles.strengthPillOk]}>
                    <Ionicons
                      name={passes ? 'checkmark' : 'close'}
                      size={12}
                      color={passes ? '#16a34a' : '#9ca3af'}
                    />
                    <Text style={[styles.strengthText, passes && { color: '#16a34a' }]}>{hint}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitText}>Set Password & Continue</Text>
              <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
            </>
          )}
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
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  logoutBtn: { padding: 6 },
  body: { padding: 24, gap: 8 },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 14, color: '#1e40af', lineHeight: 20 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
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
  strengthRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  strengthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  strengthPillOk: { backgroundColor: '#f0fdf4' },
  strengthText: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
