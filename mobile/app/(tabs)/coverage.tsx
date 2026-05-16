import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../lib/api';

type Tier = {
  name: string;
  description?: string;
  maxDependents?: number;
  annualLimit?: number;
  inpatientLimit?: number;
  outpatientLimit?: number;
};

type Enrollment = {
  _id: string;
  status: string;
  effectiveDate?: string;
  expiryDate?: string;
  tier?: Tier;
  insuredPersons?: Array<{
    firstName: string;
    lastName: string;
    relationship: string;
    dependents?: Array<{ firstName: string; lastName: string; relationship: string }>;
  }>;
};

export default function CoverageScreen() {
  const insets = useSafeAreaInsets();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/enrollments', { params: { status: 'active' } });
      const list = res.data.enrollments;
      if (Array.isArray(list) && list.length) {
        const detail = await api.get(`/enrollments/${list[0]._id}`);
        setEnrollment(detail.data.enrollment);
      }
    } catch (e) {
      console.error('Coverage load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;
  }

  if (!enrollment) {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyTitle}>No Active Coverage</Text>
        <Text style={styles.emptyText}>You don't have an active enrollment. Contact your HR department.</Text>
      </View>
    );
  }

  const tier = enrollment.tier;
  const mainInsured = enrollment.insuredPersons?.[0];
  const dependents = mainInsured?.dependents || [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a5f" />}
    >
      <Text style={styles.pageTitle}>My Coverage</Text>

      {/* Policy Summary Card */}
      <View style={styles.policyCard}>
        <View style={styles.policyCardHeader}>
          <Text style={styles.policyCardLabel}>CURRENT PLAN</Text>
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
            <Text style={styles.activeBadgeText}> ACTIVE</Text>
          </View>
        </View>
        <Text style={styles.planName}>{tier?.name || 'Standard Plan'}</Text>
        {tier?.description && <Text style={styles.planDesc}>{tier.description}</Text>}
        <View style={styles.dateRow}>
          {enrollment.effectiveDate && (
            <Text style={styles.dateText}>From: {new Date(enrollment.effectiveDate).toLocaleDateString()}</Text>
          )}
          {enrollment.expiryDate && (
            <Text style={styles.dateText}>To: {new Date(enrollment.expiryDate).toLocaleDateString()}</Text>
          )}
        </View>
      </View>

      {/* Coverage Limits */}
      {tier && (
        <>
          <Text style={styles.sectionTitle}>Coverage Limits</Text>
          <View style={styles.limitsGrid}>
            {tier.annualLimit && <LimitCard label="Annual Limit" value={`ETB ${tier.annualLimit.toLocaleString()}`} icon="wallet-outline" color="#1e3a5f" />}
            {tier.inpatientLimit && <LimitCard label="Inpatient" value={`ETB ${tier.inpatientLimit.toLocaleString()}`} icon="bed-outline" color="#7c3aed" />}
            {tier.outpatientLimit && <LimitCard label="Outpatient" value={`ETB ${tier.outpatientLimit.toLocaleString()}`} icon="medical-outline" color="#0891b2" />}
            {tier.maxDependents && <LimitCard label="Max Dependents" value={tier.maxDependents.toString()} icon="people-outline" color="#059669" />}
          </View>
        </>
      )}

      {/* Covered Members */}
      <Text style={styles.sectionTitle}>Covered Members</Text>
      {mainInsured && (
        <MemberCard
          name={`${mainInsured.firstName} ${mainInsured.lastName}`}
          relationship="Primary Insured"
          primary
        />
      )}
      {dependents.map((d, i) => (
        <MemberCard
          key={i}
          name={`${d.firstName} ${d.lastName}`}
          relationship={d.relationship}
        />
      ))}
      {dependents.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyBoxText}>No dependents registered. Contact HR to add family members.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function LimitCard({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <View style={[styles.limitCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.limitValue, { color }]}>{value}</Text>
      <Text style={styles.limitLabel}>{label}</Text>
    </View>
  );
}

function MemberCard({ name, relationship, primary = false }: { name: string; relationship: string; primary?: boolean }) {
  return (
    <View style={styles.memberCard}>
      <View style={[styles.memberAvatar, primary && { backgroundColor: '#1e3a5f' }]}>
        <Text style={styles.memberAvatarText}>{name[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{name}</Text>
        <Text style={styles.memberRel}>{relationship}</Text>
      </View>
      {primary && (
        <View style={styles.primaryBadge}>
          <Ionicons name="star" size={10} color="#1d4ed8" />
          <Text style={styles.primaryBadgeText}> PRIMARY</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 20 },
  policyCard: {
    backgroundColor: '#1e3a5f', borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#1e3a5f', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  policyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  policyCardLabel: { fontSize: 11, color: '#93c5fd', letterSpacing: 1, fontWeight: '600' },
  activeBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, flexDirection: 'row', alignItems: 'center',
  },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  planName: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 6 },
  planDesc: { fontSize: 13, color: '#cbd5e1', marginBottom: 10 },
  dateRow: { flexDirection: 'row', gap: 16 },
  dateText: { fontSize: 12, color: '#94a3b8' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  limitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  limitCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  limitValue: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  limitLabel: { fontSize: 12, color: '#6b7280' },
  memberCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  memberRel: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize', marginTop: 2 },
  primaryBadge: {
    backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, flexDirection: 'row', alignItems: 'center',
  },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },
  emptyBox: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  emptyBoxText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
