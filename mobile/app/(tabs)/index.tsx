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

type Enrollment = {
  _id: string;
  tier?: { name: string };
  status: string;
  effectiveDate?: string;
  expiryDate?: string;
};

type Claim = {
  _id: string;
  claimNumber: string;
  status: string;
  claimType: string;
  claimedAmount: number;
  createdAt: string;
};

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };
  const openClaims = claims.filter(c => ['submitted', 'under_review', 'approved'].includes(c.status)).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a5f" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a5f" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day,</Text>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
        </View>
      </View>

      {/* Policy Card */}
      <View style={styles.policyCard}>
        <Text style={styles.policyLabel}>Active Policy</Text>
        {enrollment ? (
          <>
            <Text style={styles.policyTier}>{enrollment.tier?.name || 'Standard Plan'}</Text>
            <View style={styles.policyMeta}>
              <Text style={styles.policyMetaText}>Status: </Text>
              <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.badgeText, { color: '#16a34a' }]}>{enrollment.status.toUpperCase()}</Text>
              </View>
            </View>
            {enrollment.expiryDate && (
              <Text style={styles.policyExpiry}>
                Expires: {new Date(enrollment.expiryDate).toLocaleDateString()}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.noPolicy}>No active enrollment found</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Open Claims" value={openClaims} color="#f59e0b" />
        <StatCard label="Total Claims" value={claims.length > 0 ? `${claims.length}+` : 0} color="#3b82f6" />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/new-claim')}>
          <Ionicons name="create-outline" size={28} color="#1e3a5f" />
          <Text style={styles.actionLabel}>File Claim</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/claims')}>
          <Ionicons name="list-outline" size={28} color="#1e3a5f" />
          <Text style={styles.actionLabel}>My Claims</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/coverage')}>
          <Ionicons name="shield-checkmark-outline" size={28} color="#1e3a5f" />
          <Text style={styles.actionLabel}>Coverage</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Claims */}
      {claims.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Claims</Text>
          {claims.map(claim => (
            <TouchableOpacity
              key={claim._id}
              style={styles.claimRow}
              onPress={() => router.push(`/claim/${claim._id}`)}
            >
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    submitted: { bg: '#dbeafe', color: '#1d4ed8' },
    under_review: { bg: '#fef9c3', color: '#a16207' },
    approved: { bg: '#dcfce7', color: '#16a34a' },
    rejected: { bg: '#fee2e2', color: '#dc2626' },
    paid: { bg: '#f0fdf4', color: '#15803d' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  greeting: { fontSize: 14, color: '#6b7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  policyCard: {
    backgroundColor: '#1e3a5f', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#1e3a5f', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  policyLabel: { fontSize: 12, color: '#93c5fd', marginBottom: 4, letterSpacing: 1 },
  policyTier: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  policyMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  policyMetaText: { fontSize: 13, color: '#cbd5e1' },
  policyExpiry: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  noPolicy: { fontSize: 15, color: '#94a3b8' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
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
  claimLeft: { flex: 1 },
  claimNumber: { fontSize: 14, fontWeight: '700', color: '#111827' },
  claimType: { fontSize: 12, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  claimRight: { alignItems: 'flex-end' },
  claimAmount: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
