import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { C, R, SHADOW, statusCfg, fmtMoney, CLAIM_TYPE_ICONS } from '../../lib/theme';
import { FadeIn, Press, StatusPill, EmptyState, Skeleton } from '../../components/ui';

// Statuses needing the user to act now
const ACTION_NEEDED = ['awaiting_client_approval', 'documentation_requested'];
const OPEN_STATUSES = [
  'submitted', 'acknowledged', 'under_review', 'documentation_requested',
  'investigation', 'assessment', 'awaiting_client_approval', 'disputed',
  'pending_finance_approval', 'approved', 'partially_approved', 'payment_initiated',
];

const FILTERS: { key: string; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'action',  label: 'Action Needed' },
  { key: 'open',    label: 'In Progress' },
  { key: 'settled', label: 'Settled' },
  { key: 'denied',  label: 'Denied' },
];

export default function ClaimsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [claims, setClaims]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('all');

  const load = async () => {
    try {
      const res = await api.get('/claims');
      if (Array.isArray(res.data.claims)) setClaims(res.data.claims);
    } catch { /* keep last */ }
    finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const actionCount = claims.filter(c => ACTION_NEEDED.includes(c.status)).length;

  const filtered = claims.filter(c => {
    if (filter === 'all')     return true;
    if (filter === 'action')  return ACTION_NEEDED.includes(c.status);
    if (filter === 'open')    return OPEN_STATUSES.includes(c.status);
    if (filter === 'settled') return ['settled', 'closed'].includes(c.status);
    if (filter === 'denied')  return c.status === 'denied';
    return true;
  });

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>My Claims</Text>
          <Text style={s.pageSub}>{claims.length} total{actionCount > 0 ? ` · ${actionCount} need your action` : ''}</Text>
        </View>
        <Press onPress={() => router.push('/new-claim')} style={s.newBtn}>
          <Ionicons name="add" size={19} color="#fff" />
          <Text style={s.newBtnText}>New Claim</Text>
        </Press>
      </View>

      {/* Filter chips */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {FILTERS.map(f => {
            const sel = filter === f.key;
            const showDot = f.key === 'action' && actionCount > 0;
            return (
              <TouchableOpacity key={f.key} style={[s.chip, sel && s.chipSel]} onPress={() => setFilter(f.key)}>
                <Text style={[s.chipText, sel && s.chipTextSel]}>{f.label}</Text>
                {showDot && <View style={s.chipDot}><Text style={s.chipDotText}>{actionCount}</Text></View>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={130} /><Skeleton height={130} /><Skeleton height={130} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState icon="document-text-outline"
          title={filter === 'all' ? 'No claims yet' : 'Nothing here'}
          sub={filter === 'all' ? 'Tap "New Claim" to file your first reimbursement claim.' : 'No claims match this filter.'} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 90, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.navy} />}
        >
          {filtered.map((claim, i) => {
            const cfg = statusCfg(claim.status);
            const needsAction = ACTION_NEEDED.includes(claim.status);
            return (
              <FadeIn key={claim._id} delay={Math.min(i * 50, 350)} from={14}>
                <Press onPress={() => router.push(`/claim/${claim._id}`)}
                  style={[s.card, needsAction && { borderWidth: 1.5, borderColor: cfg.color }]}>
                  {needsAction && (
                    <View style={[s.actionStrip, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={claim.status === 'awaiting_client_approval' ? 'cash' : 'document-attach'} size={13} color={cfg.color} />
                      <Text style={[s.actionStripText, { color: cfg.color }]}>
                        {claim.status === 'awaiting_client_approval'
                          ? `Settlement offer of ${fmtMoney(claim.offeredAmount)} — respond now`
                          : 'Documents requested — upload to continue'}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color={cfg.color} />
                    </View>
                  )}
                  <View style={s.cardTop}>
                    <View style={s.typeIcon}>
                      <Ionicons name={(CLAIM_TYPE_ICONS[claim.claimType] || 'document') as any} size={18} color={C.navy} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.claimNumber}>{claim.claimNumber}</Text>
                      <Text style={s.claimType}>{claim.claimType?.replace(/_/g, ' ')}</Text>
                    </View>
                    <StatusPill status={claim.status} size="sm" />
                  </View>
                  <View style={s.cardBottom}>
                    <View>
                      <Text style={s.amtLabel}>Claimed</Text>
                      <Text style={s.amtValue}>{fmtMoney(claim.claimedAmount)}</Text>
                    </View>
                    {claim.approvedAmount != null ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.amtLabel}>Approved</Text>
                        <Text style={[s.amtValue, { color: C.greenDark }]}>{fmtMoney(claim.approvedAmount)}</Text>
                      </View>
                    ) : claim.offeredAmount != null ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.amtLabel}>Offered</Text>
                        <Text style={[s.amtValue, { color: '#9333ea' }]}>{fmtMoney(claim.offeredAmount)}</Text>
                      </View>
                    ) : null}
                    <Text style={s.date}>{new Date(claim.createdAt).toLocaleDateString()}</Text>
                  </View>
                </Press>
              </FadeIn>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: C.ink, letterSpacing: -0.5 },
  pageSub: { fontSize: 12.5, color: C.grayLight, marginTop: 2 },
  newBtn: {
    backgroundColor: C.navy, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5, ...SHADOW.float,
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },

  filterRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: C.line,
  },
  chipSel: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { fontSize: 13, color: C.gray, fontWeight: '600' },
  chipTextSel: { color: '#fff', fontWeight: '700' },
  chipDot: { backgroundColor: C.red, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  card: { backgroundColor: '#fff', borderRadius: R.lg, padding: 16, ...SHADOW.card, overflow: 'hidden' },
  actionStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: -16, marginTop: -16, marginBottom: 13,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  actionStripText: { flex: 1, fontSize: 12, fontWeight: '700' },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  typeIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  claimNumber: { fontSize: 14.5, fontWeight: '800', color: C.ink },
  claimType: { fontSize: 12, color: C.gray, textTransform: 'capitalize', marginTop: 1 },

  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderTopWidth: 1, borderTopColor: C.lineSoft, paddingTop: 11,
  },
  amtLabel: { fontSize: 10.5, color: C.grayLight, marginBottom: 2, fontWeight: '600' },
  amtValue: { fontSize: 15, fontWeight: '800', color: C.ink },
  date: { fontSize: 11.5, color: C.grayLight },
});
