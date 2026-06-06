import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

const NAVY  = '#1e3a5f';
const GREEN = '#22c55e';
const BLUE  = '#2563eb';

// ─── Shared components ────────────────────────────────────────────────────────

function Header({ user }: { user: any }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Good day,</Text>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, color = NAVY }: { icon: string; label: string; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Ionicons name={icon as any} size={28} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    submitted:    { bg: '#dbeafe', color: '#1d4ed8' },
    under_review: { bg: '#fef9c3', color: '#a16207' },
    approved:     { bg: '#dcfce7', color: '#16a34a' },
    denied:       { bg: '#fee2e2', color: '#dc2626' },
    settled:      { bg: '#f0fdf4', color: '#15803d' },
    active:       { bg: '#dcfce7', color: '#16a34a' },
    pending:      { bg: '#fef9c3', color: '#a16207' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

// ─── Insured home ─────────────────────────────────────────────────────────────

function InsuredHome({ user, router, insets }: any) {
  const [enrollment, setEnrollment] = useState<any>(null);
  const [claims, setClaims]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [eRes, cRes] = await Promise.allSettled([
        api.get('/enrollments', { params: { status: 'active' } }),
        api.get('/claims', { params: { limit: 3 } }),
      ]);
      if (eRes.status === 'fulfilled') {
        const list = eRes.value.data.enrollments;
        if (Array.isArray(list) && list.length) setEnrollment(list[0]);
      }
      if (cRes.status === 'fulfilled') {
        const list = cRes.value.data.claims;
        if (Array.isArray(list)) setClaims(list.slice(0, 3));
      }
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };
  const openClaims = claims.filter(c => ['submitted', 'under_review', 'approved'].includes(c.status)).length;

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={NAVY} /></View>;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}>
      <Header user={user} />

      {/* Policy card */}
      <View style={styles.policyCard}>
        <Text style={styles.policyLabel}>ACTIVE POLICY</Text>
        {enrollment ? (
          <>
            <Text style={styles.policyTier}>{enrollment.tier?.name || 'Standard Plan'}</Text>
            <View style={styles.policyMeta}>
              <Text style={styles.policyMetaText}>Status: </Text>
              <StatusBadge status={enrollment.status} />
            </View>
            {enrollment.expiryDate && (
              <Text style={styles.policyExpiry}>Expires: {new Date(enrollment.expiryDate).toLocaleDateString()}</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.noPolicy}>No active coverage yet</Text>
            <TouchableOpacity style={styles.getStartedBtn} onPress={() => router.push('/(tabs)/coverage')}>
              <Text style={styles.getStartedText}>Browse Plans →</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Open Claims" value={openClaims} color="#f59e0b" icon="alert-circle" />
        <StatCard label="Total Claims" value={claims.length || 0} color={BLUE} icon="document-text" />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <ActionBtn icon="create-outline"          label="File Claim" onPress={() => router.push('/new-claim')} />
        <ActionBtn icon="list-outline"            label="My Claims"  onPress={() => router.push('/(tabs)/claims')} />
        <ActionBtn icon="shield-checkmark-outline" label="Coverage"  onPress={() => router.push('/(tabs)/coverage')} />
      </View>

      {claims.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Claims</Text>
          {claims.map(claim => (
            <TouchableOpacity key={claim._id} style={styles.claimRow} onPress={() => router.push(`/claim/${claim._id}`)}>
              <View style={styles.claimLeft}>
                <Text style={styles.claimNumber}>{claim.claimNumber}</Text>
                <Text style={styles.claimType}>{claim.claimType?.replace(/_/g, ' ')}</Text>
              </View>
              <View style={styles.claimRight}>
                <Text style={styles.claimAmount}>ETB {claim.claimedAmount?.toLocaleString()}</Text>
                <StatusBadge status={claim.status} />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Broker home ──────────────────────────────────────────────────────────────

function BrokerHome({ user, router, insets }: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/broker/customers');
      setCustomers(res.data.customers || []);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  const active   = customers.filter(c => !c.mustChangePassword).length;
  const pending  = customers.filter(c => c.mustChangePassword).length;
  const recent   = customers.slice(0, 5);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={NAVY} /></View>;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}>
      <Header user={user} />

      {/* Broker banner */}
      <View style={[styles.policyCard, { backgroundColor: '#312e81' }]}>
        <Text style={styles.policyLabel}>BROKER PORTAL</Text>
        <Text style={styles.policyTier}>Sales Dashboard</Text>
        <Text style={styles.policyExpiry}>{customers.length} customers registered</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Active"  value={active}  color={GREEN} icon="checkmark-circle" />
        <StatCard label="Pending" value={pending} color="#f59e0b" icon="time" />
        <StatCard label="Total"   value={customers.length} color={BLUE} icon="people" />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <ActionBtn icon="person-add-outline" label="Register" onPress={() => router.push('/(tabs)/customers')} color="#312e81" />
        <ActionBtn icon="people-outline"     label="Customers" onPress={() => router.push('/(tabs)/customers')} color={BLUE} />
      </View>

      {recent.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Customers</Text>
          {recent.map(c => (
            <View key={c._id} style={styles.claimRow}>
              <View style={styles.claimLeft}>
                <Text style={styles.claimNumber}>{c.firstName} {c.lastName}</Text>
                <Text style={styles.claimType}>{c.email}</Text>
              </View>
              <StatusBadge status={c.mustChangePassword ? 'pending' : 'active'} />
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Institution home ─────────────────────────────────────────────────────────

function InstitutionHome({ user, router, insets }: any) {
  const [employees, setEmployees]   = useState<any[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [eRes, iRes] = await Promise.allSettled([
        api.get('/institution/employees'),
        api.get('/institution/info'),
      ]);
      if (eRes.status === 'fulfilled') setEmployees(eRes.value.data.employees || []);
      if (iRes.status === 'fulfilled') setInstitution(iRes.value.data.institution);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  const activated = employees.filter(e => !e.mustChangePassword).length;
  const pending   = employees.filter(e => e.mustChangePassword).length;
  const recent    = employees.slice(0, 5);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={NAVY} /></View>;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}>
      <Header user={user} />

      <View style={[styles.policyCard, { backgroundColor: '#0f2847' }]}>
        <Text style={styles.policyLabel}>INSTITUTION HR</Text>
        <Text style={styles.policyTier}>{institution?.name || 'My Organisation'}</Text>
        <Text style={styles.policyExpiry}>{employees.length} employees on record</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Active"  value={activated} color={GREEN}   icon="checkmark-circle" />
        <StatCard label="Pending" value={pending}   color="#f59e0b" icon="time" />
        <StatCard label="Total"   value={employees.length} color={BLUE} icon="business" />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <ActionBtn icon="person-add-outline" label="Invite"     onPress={() => router.push('/(tabs)/employees')} color={BLUE} />
        <ActionBtn icon="people-outline"     label="Employees"  onPress={() => router.push('/(tabs)/employees')} color={NAVY} />
      </View>

      {recent.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Employees</Text>
          {recent.map(e => (
            <View key={e._id} style={styles.claimRow}>
              <View style={styles.claimLeft}>
                <Text style={styles.claimNumber}>{e.firstName} {e.lastName}</Text>
                <Text style={styles.claimType}>{e.email}</Text>
              </View>
              <StatusBadge status={e.mustChangePassword ? 'pending' : 'active'} />
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();

  if (user?.role === 'sales_broker')      return <BrokerHome      user={user} router={router} insets={insets} />;
  if (user?.role === 'institution_admin') return <InstitutionHome user={user} router={router} insets={insets} />;
  return <InsuredHome user={user} router={router} insets={insets} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: '#6b7280' },
  name:     { fontSize: 22, fontWeight: '700', color: '#111827' },
  avatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  policyCard: {
    backgroundColor: NAVY, borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: NAVY, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  policyLabel:    { fontSize: 11, color: '#93c5fd', marginBottom: 4, letterSpacing: 1, fontWeight: '700' },
  policyTier:     { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  policyMeta:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  policyMetaText: { fontSize: 13, color: '#cbd5e1' },
  policyExpiry:   { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  noPolicy:       { fontSize: 15, color: '#94a3b8', marginBottom: 12 },
  getStartedBtn:  { alignSelf: 'flex-start', backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  getStartedText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionsRow:   { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn:    {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },

  claimRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  claimLeft:   { flex: 1 },
  claimNumber: { fontSize: 14, fontWeight: '700', color: '#111827' },
  claimType:   { fontSize: 12, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  claimRight:  { alignItems: 'flex-end' },
  claimAmount: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },

  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
