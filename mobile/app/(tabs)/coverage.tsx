import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import api from '../../lib/api';

const NAVY  = '#1e3a5f';
const BLUE  = '#2563eb';
const GREEN = '#22c55e';

// claim type → coverage name fragment
const CLAIM_COV_MAP: Record<string, string> = {
  inpatient:        'Inpatient',
  outpatient:       'Outpatient',
  dental:           'Dental',
  optical:          'Optical',
  maternity:        'Maternity',
  pharmacy:         'Pharmacy',
  death:            'Life',
  disability:       'Life',
};

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const remaining = Math.max(limit - used, 0);
  const barColor  = pct > 0.85 ? '#ef4444' : pct > 0.6 ? '#f59e0b' : color;

  return (
    <View style={usageStyles.row}>
      <View style={usageStyles.header}>
        <Text style={usageStyles.label}>{label}</Text>
        <Text style={usageStyles.values}>
          ETB {used.toLocaleString()} <Text style={usageStyles.dim}>/ {limit.toLocaleString()}</Text>
        </Text>
      </View>
      <View style={usageStyles.track}>
        <View style={[usageStyles.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[usageStyles.remaining, { color: pct > 0.85 ? '#ef4444' : '#6b7280' }]}>
        ETB {remaining.toLocaleString()} remaining
      </Text>
    </View>
  );
}

const usageStyles = StyleSheet.create({
  row:       { marginBottom: 16 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label:     { fontSize: 13, fontWeight: '600', color: '#374151' },
  values:    { fontSize: 13, fontWeight: '700', color: '#111827' },
  dim:       { color: '#9ca3af', fontWeight: '400' },
  track:     { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  fill:      { height: 8, borderRadius: 4 },
  remaining: { fontSize: 11, marginTop: 4 },
});

// ─── Tier card (plan browser) ─────────────────────────────────────────────────

function TierCard({ tier, product, onEnroll }: { tier: any; product: any; onEnroll: (tier: any, product: any) => void }) {
  const coverageNames: string[] = (tier.coverages || [])
    .map((c: any) => c.coverage?.name || '')
    .filter(Boolean);

  return (
    <View style={planStyles.tierCard}>
      <View style={planStyles.tierHeader}>
        <View>
          <Text style={planStyles.tierName}>{tier.name}</Text>
          <Text style={planStyles.tierDesc}>{tier.description || ''}</Text>
        </View>
        <View style={planStyles.priceBox}>
          <Text style={planStyles.price}>ETB {tier.annualPremium?.toLocaleString()}</Text>
          <Text style={planStyles.priceLabel}>/year</Text>
        </View>
      </View>

      {coverageNames.length > 0 && (
        <View style={planStyles.coverageList}>
          {coverageNames.map((name, i) => (
            <View key={i} style={planStyles.coveragePill}>
              <Ionicons name="checkmark-circle" size={12} color={GREEN} />
              <Text style={planStyles.coveragePillText}>{name.split('&')[0].trim()}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={planStyles.enrollBtn} onPress={() => onEnroll(tier, product)} activeOpacity={0.85}>
        <Ionicons name="shield-checkmark" size={16} color="#fff" />
        <Text style={planStyles.enrollBtnText}>Enroll &amp; Pay with Chapa</Text>
      </TouchableOpacity>
    </View>
  );
}

const planStyles = StyleSheet.create({
  tierCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  tierName:   { fontSize: 17, fontWeight: '700', color: '#111827' },
  tierDesc:   { fontSize: 12, color: '#6b7280', marginTop: 2, maxWidth: 200 },
  priceBox:   { alignItems: 'flex-end' },
  price:      { fontSize: 16, fontWeight: '800', color: NAVY },
  priceLabel: { fontSize: 11, color: '#9ca3af' },
  coverageList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  coveragePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  coveragePillText: { fontSize: 11, color: '#166534', fontWeight: '600' },
  enrollBtn: {
    backgroundColor: BLUE, borderRadius: 12, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  enrollBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Product section in browser ───────────────────────────────────────────────

function ProductSection({ product, onEnroll }: { product: any; onEnroll: (tier: any, product: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const tiers: any[] = product.tiers || [];

  const typeIcon: Record<string, string> = {
    health: 'medkit', life: 'heart', auto: 'car', travel: 'airplane', disability: 'body',
  };

  return (
    <View style={{ marginBottom: 20 }}>
      <TouchableOpacity style={pStyles.productHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={pStyles.productIcon}>
          <Ionicons name={(typeIcon[product.productType] || 'shield') as any} size={22} color={NAVY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pStyles.productName}>{product.name}</Text>
          <Text style={pStyles.productSub}>{tiers.length} tiers · {product.payer?.name || ''}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingTop: 4 }}>
          {product.description ? (
            <Text style={pStyles.productDesc}>{product.description}</Text>
          ) : null}
          {product.features?.length > 0 && (
            <View style={pStyles.featureList}>
              {product.features.slice(0, 3).map((f: string, i: number) => (
                <View key={i} style={pStyles.featureRow}>
                  <Ionicons name="checkmark" size={14} color={BLUE} />
                  <Text style={pStyles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
          {tiers.map((t: any) => (
            <TierCard key={t._id} tier={t} product={product} onEnroll={onEnroll} />
          ))}
        </View>
      )}
    </View>
  );
}

const pStyles = StyleSheet.create({
  productHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  productIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  productSub:  { fontSize: 12, color: '#6b7280', marginTop: 2 },
  productDesc: { fontSize: 13, color: '#4b5563', marginHorizontal: 4, marginBottom: 12, lineHeight: 19 },
  featureList: { marginBottom: 12, gap: 6 },
  featureRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 4 },
  featureText: { fontSize: 12, color: '#374151', flex: 1 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CoverageScreen() {
  const insets = useSafeAreaInsets();

  // Enrollment state
  const [enrollment, setEnrollment] = useState<any>(null);
  const [claims,     setClaims]     = useState<any[]>([]);
  const [products,   setProducts]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Enroll confirmation modal
  const [enrolling,    setEnrolling]    = useState(false);
  const [pendingTier,  setPendingTier]  = useState<any>(null);
  const [pendingProd,  setPendingProd]  = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [enrRes, prodsRes] = await Promise.allSettled([
        api.get('/enrollments', { params: { status: 'active' } }),
        api.get('/products', { params: { withTiers: 'true', availableForIndividual: 'true' } }),
      ]);

      let activeEnrollment: any = null;
      if (enrRes.status === 'fulfilled') {
        const list = enrRes.value.data.enrollments || [];
        if (list.length > 0) {
          const detailRes = await api.get(`/enrollments/${list[0]._id}`);
          activeEnrollment = detailRes.data.enrollment;
          setEnrollment(activeEnrollment);

          // Load claims for usage tracker
          const claimsRes = await api.get('/claims');
          const allClaims = claimsRes.data.claims || [];
          setClaims(allClaims.filter((c: any) =>
            ['submitted', 'acknowledged', 'under_review', 'assessment', 'approved',
             'partially_approved', 'payment_initiated', 'settled'].includes(c.status)
          ));
        }
      }

      if (prodsRes.status === 'fulfilled') {
        setProducts(prodsRes.value.data.products || []);
      }
    } catch (e) {
      console.error('Coverage load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // ── Usage calculation ──────────────────────────────────────────────────────

  function buildUsageMap(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const claim of claims) {
      const key = CLAIM_COV_MAP[claim.claimType];
      if (!key) continue;
      const amount = claim.settlementAmount ?? claim.approvedAmount ?? claim.claimedAmount ?? 0;
      map[key] = (map[key] || 0) + amount;
    }
    return map;
  }

  // ── Enroll handler ─────────────────────────────────────────────────────────

  const handleEnrollPress = (tier: any, product: any) => {
    setPendingTier(tier);
    setPendingProd(product);
  };

  const confirmEnroll = async () => {
    if (!pendingTier || !pendingProd) return;
    setEnrolling(true);
    try {
      // 1. Create enrollment (pending)
      const enrRes = await api.post('/enrollments/self', {
        productId: pendingProd._id,
        tierId:    pendingTier._id,
      });
      const enrId = enrRes.data.enrollment._id;

      // 2. Initialize Chapa payment
      const payRes = await api.post('/chapa/initialize', {
        enrollmentId: enrId,
        amount:       pendingTier.annualPremium,
        currency:     'ETB',
        description:  `${pendingTier.name} — ${pendingProd.name}`,
      });

      const checkoutUrl = payRes.data.checkout_url;
      if (checkoutUrl) {
        setPendingTier(null);
        setPendingProd(null);
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert('Payment Error', 'Could not initiate payment. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Enrollment failed. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={NAVY} /></View>;
  }

  const usageMap = buildUsageMap();
  const tier = enrollment?.tier;
  const tierCoverages: any[] = tier?.coverages || [];
  const product = enrollment?.product;
  const insuredPersons: any[] = enrollment?.insuredPersons || [];

  const startDate  = enrollment?.startDate  ? new Date(enrollment.startDate).toLocaleDateString()  : '—';
  const endDate    = enrollment?.endDate    ? new Date(enrollment.endDate).toLocaleDateString()    : '—';
  const daysLeft   = enrollment?.endDate
    ? Math.max(0, Math.ceil((new Date(enrollment.endDate).getTime() - Date.now()) / 86_400_000))
    : null;

  // Filter products: if user has group enrollment, show individual plans only; otherwise all
  const browsePlans = products.filter(p => p.availableForIndividual);

  return (
    <>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}
      >
        {/* ── Active enrollment ────────────────────────────────────────────── */}
        {enrollment ? (
          <>
            {/* Policy card */}
            <View style={styles.policyCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardEyebrow}>ACTIVE POLICY</Text>
                <View style={styles.activePill}>
                  <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                  <Text style={styles.activePillText}> ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.planName}>{tier?.name || 'Standard Plan'}</Text>
              <Text style={styles.productName}>{product?.name || ''}</Text>

              <View style={styles.datesRow}>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Start</Text>
                  <Text style={styles.dateValue}>{startDate}</Text>
                </View>
                <View style={styles.dateDivider} />
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Expires</Text>
                  <Text style={styles.dateValue}>{endDate}</Text>
                </View>
                {daysLeft !== null && (
                  <>
                    <View style={styles.dateDivider} />
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>Days left</Text>
                      <Text style={[styles.dateValue, daysLeft < 30 && { color: '#f59e0b' }]}>{daysLeft}</Text>
                    </View>
                  </>
                )}
              </View>

              {enrollment.premium?.amount && (
                <View style={styles.premiumRow}>
                  <Ionicons name="card-outline" size={14} color="#93c5fd" />
                  <Text style={styles.premiumText}>
                    ETB {enrollment.premium.amount.toLocaleString()} / year
                    {enrollment.premium.employeeShare > 0
                      ? `  ·  Your share: ETB ${enrollment.premium.employeeShare.toLocaleString()}`
                      : '  ·  Fully employer-covered'}
                  </Text>
                </View>
              )}
            </View>

            {/* Usage tracker */}
            {tierCoverages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Coverage Usage</Text>
                <Text style={styles.sectionSub}>Based on submitted &amp; settled claims this policy year</Text>
                <View style={styles.card}>
                  {tierCoverages.map((tc: any, i: number) => {
                    const cov = tc.coverage;
                    if (!cov) return null;
                    const limit = tc.customLimit ?? cov.limits?.annual ?? cov.limits?.perClaim ?? 0;
                    if (!limit) return null;
                    const covKey = Object.keys(CLAIM_COV_MAP).find(k =>
                      cov.name?.toLowerCase().includes(CLAIM_COV_MAP[k].toLowerCase())
                    );
                    const used = covKey ? (usageMap[CLAIM_COV_MAP[covKey]] || 0) : 0;
                    const colors = ['#2563eb','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#475569'];
                    return (
                      <UsageBar
                        key={i}
                        label={cov.name}
                        used={used}
                        limit={limit}
                        color={colors[i % colors.length]}
                      />
                    );
                  })}
                </View>
              </View>
            )}

            {/* Covered members */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Covered Members</Text>
              {insuredPersons.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyBoxText}>No members linked to this policy.</Text>
                </View>
              ) : (
                insuredPersons.map((p: any, i: number) => (
                  <View key={i} style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: i === 0 ? NAVY : '#7c3aed' }]}>
                      <Text style={styles.memberAvatarText}>{p.firstName?.[0]}{p.lastName?.[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{p.firstName} {p.lastName}</Text>
                      <Text style={styles.memberEmail}>{p.email}</Text>
                    </View>
                    {i === 0 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          /* No enrollment state */
          <View style={styles.noEnrollCard}>
            <Ionicons name="shield-outline" size={48} color="#cbd5e1" />
            <Text style={styles.noEnrollTitle}>No Active Coverage</Text>
            <Text style={styles.noEnrollSub}>
              You don't have an active policy yet. Browse the plans below and enroll today.
            </Text>
          </View>
        )}

        {/* ── Browse Available Plans ────────────────────────────────────────── */}
        {browsePlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {enrollment ? 'Explore Other Plans' : 'Available Plans'}
            </Text>
            <Text style={styles.sectionSub}>
              {enrollment
                ? 'Upgrade or add supplemental coverage'
                : 'Select a plan and pay securely with Chapa'}
            </Text>
            {browsePlans.map((p: any) => (
              <ProductSection key={p._id} product={p} onEnroll={handleEnrollPress} />
            ))}
          </View>
        )}

        {/* No plans at all */}
        {!enrollment && browsePlans.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="alert-circle-outline" size={32} color="#d1d5db" />
            <Text style={[styles.emptyBoxText, { marginTop: 8 }]}>
              No plans are currently available for individual enrollment. Contact support.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Enroll confirmation modal ─────────────────────────────────────── */}
      <Modal
        visible={!!pendingTier}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!enrolling) { setPendingTier(null); setPendingProd(null); } }}
      >
        <View style={modal.overlay}>
          <View style={modal.box}>
            <View style={modal.iconWrap}>
              <Ionicons name="shield-checkmark" size={32} color={BLUE} />
            </View>
            <Text style={modal.title}>Confirm Enrollment</Text>
            <Text style={modal.planLabel}>{pendingTier?.name} — {pendingProd?.name}</Text>

            <View style={modal.summaryRow}>
              <Text style={modal.summaryKey}>Annual Premium</Text>
              <Text style={modal.summaryVal}>ETB {pendingTier?.annualPremium?.toLocaleString()}</Text>
            </View>
            <View style={modal.summaryRow}>
              <Text style={modal.summaryKey}>Payment via</Text>
              <Text style={modal.summaryVal}>Chapa (ETB)</Text>
            </View>
            <Text style={modal.disclaimer}>
              Tapping "Pay Now" will create your enrollment and open Chapa checkout. Your policy activates after payment is confirmed.
            </Text>

            <TouchableOpacity
              style={[modal.payBtn, enrolling && { opacity: 0.6 }]}
              onPress={confirmEnroll}
              disabled={enrolling}
              activeOpacity={0.85}
            >
              {enrolling
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="card" size={18} color="#fff" /><Text style={modal.payBtnText}>Pay Now</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setPendingTier(null); setPendingProd(null); }} disabled={enrolling}>
              <Text style={modal.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  policyCard: {
    backgroundColor: NAVY, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: NAVY, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  cardTopRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardEyebrow:    { fontSize: 10, color: '#93c5fd', fontWeight: '700', letterSpacing: 1.2 },
  activePill:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  activePillText: { fontSize: 10, color: '#16a34a', fontWeight: '700' },
  planName:       { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  productName:    { fontSize: 13, color: '#93c5fd', marginBottom: 14 },

  datesRow:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 12 },
  dateItem:    { flex: 1, alignItems: 'center' },
  dateLabel:   { fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: '600' },
  dateValue:   { fontSize: 13, color: '#fff', fontWeight: '700' },
  dateDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  premiumText: { fontSize: 12, color: '#bfdbfe' },

  section:     { marginBottom: 24 },
  sectionTitle:{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub:  { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  memberRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  memberAvatar:{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberName:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  memberEmail: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  primaryBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },

  noEnrollCard: { alignItems: 'center', paddingVertical: 32, gap: 10, backgroundColor: '#fff', borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#e5e7eb' },
  noEnrollTitle:{ fontSize: 18, fontWeight: '700', color: '#374151' },
  noEnrollSub:  { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },

  emptyBox:     { backgroundColor: '#f9fafb', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyBoxText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box:     { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 380 },
  iconWrap:{ alignItems: 'center', marginBottom: 12 },
  title:   { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  planLabel: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryKey:  { fontSize: 14, color: '#6b7280' },
  summaryVal:  { fontSize: 14, fontWeight: '700', color: '#111827' },
  disclaimer:  { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginVertical: 16, lineHeight: 18 },
  payBtn:      { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 },
  payBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel:      { textAlign: 'center', color: '#6b7280', fontSize: 14, paddingVertical: 6 },
});
