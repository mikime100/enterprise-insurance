import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../lib/api';

type Claim = {
  _id: string;
  claimNumber: string;
  status: string;
  claimType: string;
  claimedAmount: number;
  approvedAmount?: number;
  createdAt: string;
  description?: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  submitted: { bg: '#dbeafe', color: '#1d4ed8' },
  under_review: { bg: '#fef9c3', color: '#a16207' },
  approved: { bg: '#dcfce7', color: '#16a34a' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
  paid: { bg: '#f0fdf4', color: '#15803d' },
};

export default function ClaimsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const load = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter) params.status = filter;
      const res = await api.get('/claims', { params });
      if (Array.isArray(res.data.claims)) setClaims(res.data.claims);
    } catch (e) {
      console.error('Claims load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [filter]);
  const onRefresh = () => { setRefreshing(true); load(); };
  const filters = [null, 'submitted', 'under_review', 'approved', 'paid', 'rejected'];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.pageTitle}>My Claims</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/new-claim')}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {filters.map(f => (
          <TouchableOpacity
            key={f ?? 'all'}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f ? f.replace(/_/g, ' ') : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>
      ) : claims.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={56} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Claims Yet</Text>
          <Text style={styles.emptyText}>Tap "+ New" to file your first claim</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a5f" />}
        >
          {claims.map(claim => {
            const s = STATUS_COLORS[claim.status] || { bg: '#f3f4f6', color: '#374151' };
            return (
              <TouchableOpacity
                key={claim._id}
                style={styles.claimCard}
                onPress={() => router.push(`/claim/${claim._id}`)}
              >
                <View style={styles.claimCardTop}>
                  <Text style={styles.claimNumber}>{claim.claimNumber}</Text>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>
                      {claim.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.claimType}>{claim.claimType?.replace(/_/g, ' ')}</Text>
                {claim.description && (
                  <Text style={styles.claimDesc} numberOfLines={1}>{claim.description}</Text>
                )}
                <View style={styles.claimCardBottom}>
                  <View>
                    <Text style={styles.amountLabel}>Claimed</Text>
                    <Text style={styles.amountValue}>ETB {claim.claimedAmount?.toLocaleString()}</Text>
                  </View>
                  {claim.approvedAmount != null && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.amountLabel}>Approved</Text>
                      <Text style={[styles.amountValue, { color: '#16a34a' }]}>
                        ETB {claim.approvedAmount.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.claimDate}>
                    {new Date(claim.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 8, backgroundColor: '#f8fafc',
  },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  newBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterBar: { maxHeight: 48 },
  filterContent: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  filterChipText: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#6b7280' },
  list: { flex: 1 },
  listContent: { padding: 20, gap: 12, paddingBottom: 32 },
  claimCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  claimCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  claimNumber: { fontSize: 15, fontWeight: '700', color: '#111827' },
  claimType: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize', marginBottom: 4 },
  claimDesc: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },
  claimCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  amountLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  amountValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  claimDate: { fontSize: 12, color: '#9ca3af' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
