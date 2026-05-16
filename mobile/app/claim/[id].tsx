import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../lib/api';

type StatusHistory = { status: string; changedAt: string; note?: string };
type Claim = {
  _id: string;
  claimNumber: string;
  status: string;
  claimType: string;
  claimedAmount: number;
  approvedAmount?: number;
  description?: string;
  dateOfService?: string;
  createdAt: string;
  statusHistory?: StatusHistory[];
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  submitted: { bg: '#dbeafe', color: '#1d4ed8' },
  under_review: { bg: '#fef9c3', color: '#a16207' },
  approved: { bg: '#dcfce7', color: '#16a34a' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
  paid: { bg: '#f0fdf4', color: '#15803d' },
};

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/claims/${id}`)
      .then(res => setClaim(res.data.claim))
      .catch(e => console.error('Claim detail failed:', e))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;
  }

  if (!claim) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Claim not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const s = STATUS_COLORS[claim.status] || { bg: '#f3f4f6', color: '#374151' };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Claim Detail</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.claimNumber}>{claim.claimNumber}</Text>
            <View style={[styles.badge, { backgroundColor: s.bg }]}>
              <Text style={[styles.badgeText, { color: s.color }]}>
                {claim.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
          <Text style={styles.claimType}>{claim.claimType?.replace(/_/g, ' ')}</Text>
          <Text style={styles.submitDate}>
            Submitted {new Date(claim.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Amounts */}
        <View style={styles.amountsRow}>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Claimed Amount</Text>
            <Text style={styles.amountValue}>ETB {claim.claimedAmount?.toLocaleString()}</Text>
          </View>
          {claim.approvedAmount != null && (
            <View style={[styles.amountBox, { borderLeftWidth: 3, borderLeftColor: '#16a34a' }]}>
              <Text style={styles.amountLabel}>Approved Amount</Text>
              <Text style={[styles.amountValue, { color: '#16a34a' }]}>
                ETB {claim.approvedAmount.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Details</Text>
          {claim.dateOfService && (
            <DetailRow label="Date of Service" value={new Date(claim.dateOfService).toLocaleDateString()} />
          )}
          {claim.description && (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Description</Text>
              <Text style={styles.descText}>{claim.description}</Text>
            </View>
          )}
        </View>

        {/* Status history */}
        {claim.statusHistory && claim.statusHistory.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Status History</Text>
            {claim.statusHistory.map((h, i) => {
              const hs = STATUS_COLORS[h.status] || { bg: '#f3f4f6', color: '#374151' };
              return (
                <View key={i} style={styles.historyRow}>
                  <View style={[styles.historyDot, { backgroundColor: hs.color }]} />
                  <View style={styles.historyContent}>
                    <View style={[styles.badge, { backgroundColor: hs.bg }]}>
                      <Text style={[styles.badgeText, { color: hs.color }]}>
                        {h.status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <Text style={styles.historyDate}>{new Date(h.changedAt).toLocaleString()}</Text>
                    {h.note && <Text style={styles.historyNote}>{h.note}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6b7280', marginBottom: 12 },
  backLink: { fontSize: 15, color: '#1e3a5f', fontWeight: '600' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 60 },
  backText: { fontSize: 15, color: '#1e3a5f', fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { padding: 20, paddingBottom: 40 },
  headerCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  claimNumber: { fontSize: 18, fontWeight: '700', color: '#111827' },
  claimType: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize', marginBottom: 6 },
  submitDate: { fontSize: 12, color: '#9ca3af' },
  amountsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  amountBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  amountLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  amountValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  detailSection: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  descBox: { marginTop: 4 },
  descLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  descText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  historyRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  historyContent: { flex: 1 },
  historyDate: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  historyNote: { fontSize: 13, color: '#374151', marginTop: 4, fontStyle: 'italic' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
