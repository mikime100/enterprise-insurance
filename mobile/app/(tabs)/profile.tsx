import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { C, R, SHADOW } from '../../lib/theme';
import { FadeIn, Press } from '../../components/ui';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

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
            <Text style={s.cardTitle}>Account Information</Text>
            <InfoRow icon="person" label="First Name" value={user?.firstName} />
            <InfoRow icon="person" label="Last Name" value={user?.lastName} />
            <InfoRow icon="mail" label="Email" value={user?.email} />
            {!!user?.phone && <InfoRow icon="call" label="Phone" value={user.phone} />}
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
