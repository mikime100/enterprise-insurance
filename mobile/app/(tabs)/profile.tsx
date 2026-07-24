import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { C, R, F, SHADOW } from '../../lib/theme';
import { FadeIn, Press, Button } from '../../components/ui';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  // Edit profile
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const openEdit = () => {
    setForm({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Required', 'First and last name are required.'); return;
    }
    setSavingProfile(true);
    try {
      await api.patch('/auth/me', {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim(),
      });
      await refreshUser();
      setEditOpen(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not update profile.');
    } finally { setSavingProfile(false); }
  };

  const savePassword = async () => {
    if (pw.next.length < 8) { Alert.alert('Too short', 'Password must be at least 8 characters.'); return; }
    if (pw.next !== pw.confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    setSavingPw(true);
    try {
      await api.post('/auth/set-password', { newPassword: pw.next });
      setPwOpen(false); setPw({ next: '', confirm: '' });
      Alert.alert('Done', 'Your password has been changed.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not change password.');
    } finally { setSavingPw(false); }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
      {/* Gradient header */}
      <LinearGradient colors={[C.navyDark, C.navy]} style={[s.hero, { paddingTop: insets.top + 28 }]}>
        <FadeIn>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
          </View>
          <Text style={s.fullName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#86efac" />
            <Text style={s.roleText}>{user?.role?.replace(/_/g, ' ')}</Text>
          </View>
        </FadeIn>
      </LinearGradient>

      <View style={{ padding: 20 }}>
        {/* Account info */}
        <FadeIn delay={80}>
          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Text style={s.cardTitle}>Account Information</Text>
              <TouchableOpacity onPress={openEdit} style={s.editChip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="create-outline" size={14} color={C.blue} />
                <Text style={s.editChipText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <InfoRow icon="person" label="First Name" value={user?.firstName} />
            <InfoRow icon="person" label="Last Name" value={user?.lastName} />
            <InfoRow icon="mail" label="Email" value={user?.email} />
            <InfoRow icon="call" label="Phone" value={user?.phone || '—'} />
          </View>
        </FadeIn>

        {/* Security */}
        <FadeIn delay={120}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Security</Text>
            <Press onPress={() => { setPw({ next: '', confirm: '' }); setPwOpen(true); }} style={s.linkRow}>
              <View style={[s.linkIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="key" size={17} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle}>Change Password</Text>
                <Text style={s.linkSub}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.grayLight} />
            </Press>
          </View>
        </FadeIn>

        {/* Support */}
        <FadeIn delay={140}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Support</Text>
            <Press onPress={() => Linking.openURL('mailto:support@enterpriseinsurance.et')} style={s.linkRow}>
              <View style={[s.linkIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="mail" size={17} color={C.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle}>Email Support</Text>
                <Text style={s.linkSub}>support@enterpriseinsurance.et</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.grayLight} />
            </Press>
            <Press onPress={() => Linking.openURL('tel:+251911000000')} style={s.linkRow}>
              <View style={[s.linkIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="call" size={17} color={C.greenDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.linkTitle}>Call Us</Text>
                <Text style={s.linkSub}>+251 91 100 0000 · 24/7</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.grayLight} />
            </Press>
          </View>
        </FadeIn>

        {/* App */}
        <FadeIn delay={200}>
          <View style={s.card}>
            <Text style={s.cardTitle}>App</Text>
            <InfoRow icon="code-slash" label="Version" value="2.0.0" />
            <InfoRow icon="business" label="Provider" value="Enterprise Insurance S.C." />
          </View>
        </FadeIn>

        {/* Sign out */}
        <FadeIn delay={260}>
          <Press onPress={handleLogout} style={s.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={C.red} />
            <Text style={s.logoutText}>Sign Out</Text>
          </Press>
        </FadeIn>
      </View>

      {/* Edit profile modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Edit Profile</Text>
            <Text style={s.sheetLabel}>FIRST NAME</Text>
            <TextInput style={s.input} value={form.firstName} placeholder="First name" placeholderTextColor={C.grayLight}
              onChangeText={v => setForm(f => ({ ...f, firstName: v }))} />
            <Text style={s.sheetLabel}>LAST NAME</Text>
            <TextInput style={s.input} value={form.lastName} placeholder="Last name" placeholderTextColor={C.grayLight}
              onChangeText={v => setForm(f => ({ ...f, lastName: v }))} />
            <Text style={s.sheetLabel}>PHONE</Text>
            <TextInput style={s.input} value={form.phone} placeholder="+251 9.." keyboardType="phone-pad" placeholderTextColor={C.grayLight}
              onChangeText={v => setForm(f => ({ ...f, phone: v }))} />
            <Text style={s.sheetNote}>Email and role can only be changed by your administrator.</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button label="Cancel" variant="outline" color={C.gray} onPress={() => setEditOpen(false)} style={{ flex: 1 }} />
              <Button label="Save" icon="checkmark" onPress={saveProfile} loading={savingProfile} style={{ flex: 1.4 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change password modal */}
      <Modal visible={pwOpen} transparent animationType="slide" onRequestClose={() => setPwOpen(false)}>
        <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Change Password</Text>
            <Text style={s.sheetLabel}>NEW PASSWORD</Text>
            <TextInput style={s.input} value={pw.next} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={C.grayLight}
              onChangeText={v => setPw(p => ({ ...p, next: v }))} />
            <Text style={s.sheetLabel}>CONFIRM PASSWORD</Text>
            <TextInput style={s.input} value={pw.confirm} secureTextEntry placeholder="Repeat new password" placeholderTextColor={C.grayLight}
              onChangeText={v => setPw(p => ({ ...p, confirm: v }))} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button label="Cancel" variant="outline" color={C.gray} onPress={() => setPwOpen(false)} style={{ flex: 1 }} />
              <Button label="Update" icon="key" color={C.amber} onPress={savePassword} loading={savingPw} style={{ flex: 1.4 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoLeft}>
        <Ionicons name={icon} size={15} color={C.grayLight} style={{ marginRight: 10 }} />
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={s.infoValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: { alignItems: 'center', paddingBottom: 30, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatar: {
    width: 86, height: 86, borderRadius: 43, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14, alignSelf: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  fullName: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.4 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, textAlign: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center',
    backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginTop: 10,
  },
  roleText: { fontSize: 11.5, fontWeight: '700', color: '#86efac', textTransform: 'capitalize' },

  card: { backgroundColor: '#fff', borderRadius: R.lg, padding: 17, marginBottom: 14, ...SHADOW.card },
  cardTitle: { fontSize: 12, fontWeight: '800', color: C.grayLight, marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  editChipText: { fontSize: 12, fontFamily: F.bodyBold, color: C.blue },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontFamily: F.head, color: C.ink, marginBottom: 6 },
  sheetLabel: { fontSize: 11, fontFamily: F.bodySemi, color: C.gray, letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  sheetNote: { fontSize: 12, color: C.grayLight, fontFamily: F.body, marginTop: 12, lineHeight: 17 },
  input: { backgroundColor: '#fff', borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, padding: 13, fontSize: 15, color: C.ink, fontFamily: F.body },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  infoLeft: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: C.gray },
  infoValue: { fontSize: 14, fontWeight: '700', color: C.ink, maxWidth: '55%' },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  linkIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  linkSub: { fontSize: 12, color: C.grayLight, marginTop: 1 },

  logoutBtn: {
    backgroundColor: '#fff', borderRadius: R.md, padding: 16, marginTop: 4,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: C.red },
});
