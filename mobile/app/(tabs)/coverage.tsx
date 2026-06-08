import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import api from '../../lib/api';

const NAVY  = '#1e3a5f';
const BLUE  = '#2563eb';
const GREEN = '#22c55e';

const CLAIM_COV_MAP: Record<string, string> = {
  inpatient: 'Inpatient', outpatient: 'Outpatient', dental: 'Dental',
  optical: 'Optical', maternity: 'Maternity', pharmacy: 'Pharmacy',
  death: 'Life', disability: 'Life',
};

const EXCLUSIONS: Record<string, string[]> = {
  health: [
    'Pre-existing conditions during the waiting period',
    'Cosmetic or elective procedures not medically necessary',
    'Experimental treatments not approved by medical authority',
    'Self-inflicted injuries',
    'Injuries from illegal activities',
    'Infertility or assisted reproduction treatment',
    'Weight-loss programs and obesity treatment',
  ],
  auto: [
    'Mechanical/electrical breakdown not caused by accident',
    'Normal wear and tear',
    'Driving under the influence of alcohol or drugs',
    'Racing, rallying, or speed testing',
    'War or civil unrest',
    'Driving without a valid licence',
    'Pre-existing damage not declared at enrollment',
  ],
  life: [
    'Suicide within the first two years of the policy',
    'Death from illegal activities',
    'Death from war or civil unrest',
    'Pre-existing terminal illness not disclosed at enrollment',
  ],
};

function getExclusions(productType: string): string[] {
  return EXCLUSIONS[productType] || [
    'Pre-existing conditions during waiting period',
    'Illegal activities',
    'War and civil unrest',
    'Fraud or misrepresentation',
    'Intentional self-harm',
  ];
}

function agreementText(tierName: string, productName: string, premium: number) {
  return `ENTERPRISE INSURANCE S.C. — POLICY AGREEMENT

Plan: ${productName} — ${tierName}
Annual Premium: ETB ${premium.toLocaleString()}
Agreement Version: v1.0

1. COVERAGE
Coverage takes effect upon payment confirmation and remains active for one (1) policy year from the effective date stated in your enrollment.

2. PREMIUM PAYMENT
The annual premium of ETB ${premium.toLocaleString()} is due in full upon enrollment. Your policy will not become active until payment is confirmed via Chapa.

3. PLAN CHANGES
You may request a plan change within 30 days of your policy start date without penalty. Changes after this period are subject to underwriting review.

4. CLAIMS SUBMISSION
All claims must be submitted within 90 days of the incident or date of service. Supporting documentation — medical certificates, original receipts, diagnosis reports, or police reports — is required. Enterprise Insurance S.C. reserves the right to investigate any claim.

5. EXCLUSIONS
Standard exclusions apply as listed in the coverage details. Claims from excluded conditions or events will not be honored.

6. WAITING PERIOD
Certain benefits are subject to a waiting period from the policy start date. Emergency services are exempt from waiting periods.

7. CANCELLATION
Either party may cancel with 30 days' written notice. A pro-rated refund will be issued for unused coverage, less a 10% administrative fee. No refund after 11 months of coverage.

8. DATA PRIVACY
Your personal and medical information is processed in compliance with Ethiopian data protection laws and shared with service providers solely for claims processing.

9. MISREPRESENTATION
Any material misrepresentation during application or claims may result in policy cancellation and forfeiture of premiums paid.

10. DISPUTE RESOLUTION
Disputes shall first be addressed through direct negotiation. If unresolved within 30 days, they shall be submitted to the Ethiopian Insurance Regulatory Authority (NIBE).

By signing, you confirm that you are 18+, all registration information is accurate, and you have read and agree to all terms above.`;
}

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const remaining = Math.max(limit - used, 0);
  const barColor = pct > 0.85 ? '#ef4444' : pct > 0.6 ? '#f59e0b' : color;
  return (
    <View style={uStyles.row}>
      <View style={uStyles.header}>
        <Text style={uStyles.label}>{label}</Text>
        <Text style={uStyles.values}>ETB {used.toLocaleString()} <Text style={uStyles.dim}>/ {limit.toLocaleString()}</Text></Text>
      </View>
      <View style={uStyles.track}>
        <View style={[uStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={[uStyles.remaining, { color: pct > 0.85 ? '#ef4444' : '#6b7280' }]}>
        ETB {remaining.toLocaleString()} remaining
      </Text>
    </View>
  );
}
const uStyles = StyleSheet.create({
  row: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  values: { fontSize: 13, fontWeight: '700', color: '#111827' },
  dim: { color: '#9ca3af', fontWeight: '400' },
  track: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  remaining: { fontSize: 11, marginTop: 4 },
});

// ─── Plan Detail + Agreement modal ──────────────────────────────────────────

function PlanDetailModal({
  tier, product, onClose, onConfirmPay, paying,
}: {
  tier: any; product: any; onClose: () => void;
  onConfirmPay: (sigName: string) => void; paying: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [sigName, setSigName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const canPay = sigName.trim().length >= 3 && agreed && !paying;

  const coverages: any[] = tier?.coverages || [];
  const exclusions = getExclusions(product?.productType || '');
  const terms = agreementText(tier?.name || '', product?.name || '', tier?.annualPremium || 0);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <StatusBar style="dark" />
      <View style={[dm.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={dm.header}>
          <View style={{ flex: 1 }}>
            <Text style={dm.headerTitle} numberOfLines={1}>{product?.name}</Text>
            <Text style={dm.headerSub}>{tier?.name} · ETB {tier?.annualPremium?.toLocaleString()} / year</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={26} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[dm.scroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>

          {/* Pricing */}
          <View style={dm.section}>
            <Text style={dm.sectionTitle}>Pricing</Text>
            <View style={dm.infoGrid}>
              <View style={dm.infoCell}>
                <Text style={dm.infoCellLabel}>Annual Premium</Text>
                <Text style={dm.infoCellValue}>ETB {tier?.annualPremium?.toLocaleString()}</Text>
              </View>
              <View style={dm.infoCell}>
                <Text style={dm.infoCellLabel}>Monthly Equivalent</Text>
                <Text style={dm.infoCellValue}>ETB {Math.round((tier?.annualPremium || 0) / 12).toLocaleString()}</Text>
              </View>
              <View style={dm.infoCell}>
                <Text style={dm.infoCellLabel}>Payment Method</Text>
                <Text style={dm.infoCellValue}>Chapa (annual)</Text>
              </View>
              <View style={dm.infoCell}>
                <Text style={dm.infoCellLabel}>Max Dependents</Text>
                <Text style={dm.infoCellValue}>{tier?.maxDependents > 0 ? `Up to ${tier.maxDependents}` : 'Not applicable'}</Text>
              </View>
            </View>
          </View>

          {/* Covered services */}
          {coverages.length > 0 && (
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Covered Services</Text>
              {coverages.map((tc: any, i: number) => {
                const cov = tc.coverage;
                const limit = tc.customLimit ?? cov?.limits?.annual ?? cov?.limits?.perClaim ?? 0;
                return (
                  <View key={i} style={dm.covRow}>
                    <View style={dm.covCheck}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.covName}>{cov?.name || 'Coverage'}</Text>
                      {cov?.description ? <Text style={dm.covDesc}>{cov.description}</Text> : null}
                    </View>
                    {limit > 0 && (
                      <Text style={dm.covLimit}>up to ETB {limit.toLocaleString()}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Exclusions */}
          <View style={dm.section}>
            <Text style={dm.sectionTitle}>What Is Not Covered</Text>
            {exclusions.map((ex, i) => (
              <View key={i} style={dm.exRow}>
                <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                <Text style={dm.exText}>{ex}</Text>
              </View>
            ))}
          </View>

          {/* Key terms */}
          {(product?.waitingPeriodMonths > 0 || product?.features?.length > 0) && (
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Key Terms</Text>
              {product?.waitingPeriodMonths > 0 && (
                <View style={dm.termRow}>
                  <Text style={dm.termKey}>Waiting Period</Text>
                  <Text style={dm.termVal}>{product.waitingPeriodMonths} months</Text>
                </View>
              )}
              {product?.features?.map((f: string, i: number) => (
                <View key={i} style={dm.termRow}>
                  <Ionicons name="information-circle-outline" size={14} color={BLUE} />
                  <Text style={[dm.termVal, { flex: 1, marginLeft: 6 }]}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Policy agreement */}
          <View style={dm.section}>
            <Text style={dm.sectionTitle}>Policy Agreement</Text>
            <View style={dm.termsBox}>
              <Text style={dm.termsText}>{terms}</Text>
            </View>
          </View>

          {/* Digital signature */}
          <View style={dm.section}>
            <Text style={dm.sectionTitle}>Digital Signature</Text>
            <Text style={dm.sigInstructions}>
              Type your full legal name below to sign this agreement. This constitutes your legally binding digital signature.
            </Text>
            <TextInput
              style={dm.sigInput}
              placeholder="Full legal name"
              placeholderTextColor="#9ca3af"
              value={sigName}
              onChangeText={setSigName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {sigName.trim().length >= 3 && (
              <View style={dm.sigPreview}>
                <Text style={dm.sigPreviewText}>{sigName.trim()}</Text>
                <Text style={dm.sigPreviewDate}>Signed: {new Date().toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              </View>
            )}

            <TouchableOpacity style={dm.checkRow} onPress={() => setAgreed(a => !a)} activeOpacity={0.8}>
              <View style={[dm.checkbox, agreed && dm.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={dm.checkLabel}>
                I have read the full policy agreement above and agree to all terms and conditions.
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Sticky footer */}
        <View style={[dm.footer, { paddingBottom: insets.bottom + 12 }]}>
          {!canPay && (
            <Text style={dm.footerHint}>
              {!sigName.trim() ? 'Type your full name to sign.' : !agreed ? 'Check the agreement box to continue.' : ''}
            </Text>
          )}
          <TouchableOpacity
            style={[dm.payBtn, !canPay && dm.payBtnDisabled]}
            onPress={() => canPay && onConfirmPay(sigName.trim())}
            disabled={!canPay}
            activeOpacity={0.85}
          >
            {paying
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={dm.payBtnText}>Sign &amp; Pay with Chapa</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} disabled={paying} style={{ marginTop: 10, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 13, color: '#6b7280', marginTop: 2 },
  scroll: { padding: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCell: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', minWidth: '45%', flex: 1 },
  infoCellLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoCellValue: { fontSize: 14, fontWeight: '700', color: '#111827' },

  covRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  covCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  covName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  covDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  covLimit: { fontSize: 12, fontWeight: '700', color: NAVY, flexShrink: 0 },

  exRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  exText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },

  termRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  termKey: { fontSize: 12, color: '#6b7280', width: 110 },
  termVal: { fontSize: 13, fontWeight: '600', color: '#111827' },

  termsBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  termsText: { fontSize: 12, color: '#374151', lineHeight: 20 },

  sigInstructions: { fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 19 },
  sigInput: {
    borderWidth: 2, borderColor: NAVY, borderRadius: 12,
    padding: 14, fontSize: 16, color: '#111827',
    backgroundColor: '#fff', marginBottom: 12,
  },
  sigPreview: { backgroundColor: '#f0f6ff', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'flex-start' },
  sigPreviewText: { fontSize: 22, fontStyle: 'italic', color: NAVY, fontWeight: '600' },
  sigPreviewDate: { fontSize: 11, color: '#6b7280', marginTop: 4 },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  checkLabel: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },

  footer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 20, paddingTop: 14 },
  footerHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 8 },
  payBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  payBtnDisabled: { backgroundColor: '#94a3b8' },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ─── Tier card (browse) ──────────────────────────────────────────────────────

function TierCard({ tier, product, onDetails }: { tier: any; product: any; onDetails: (t: any, p: any) => void }) {
  const coverageNames: string[] = (tier.coverages || [])
    .map((c: any) => c.coverage?.name || '').filter(Boolean);

  return (
    <View style={tc.card}>
      <View style={tc.header}>
        <View>
          <Text style={tc.name}>{tier.name}</Text>
          <Text style={tc.desc}>{tier.description || ''}</Text>
        </View>
        <View style={tc.priceBox}>
          <Text style={tc.price}>ETB {tier.annualPremium?.toLocaleString()}</Text>
          <Text style={tc.priceLabel}>/year</Text>
        </View>
      </View>

      {coverageNames.length > 0 && (
        <View style={tc.pills}>
          {coverageNames.slice(0, 4).map((name, i) => (
            <View key={i} style={tc.pill}>
              <Ionicons name="checkmark-circle" size={12} color={GREEN} />
              <Text style={tc.pillText}>{name.split('&')[0].trim()}</Text>
            </View>
          ))}
          {coverageNames.length > 4 && (
            <View style={tc.pill}>
              <Text style={tc.pillText}>+{coverageNames.length - 4} more</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={tc.btn} onPress={() => onDetails(tier, product)} activeOpacity={0.85}>
        <Ionicons name="document-text-outline" size={16} color="#fff" />
        <Text style={tc.btnText}>View Details &amp; Enroll</Text>
      </TouchableOpacity>
    </View>
  );
}

const tc = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  name:  { fontSize: 17, fontWeight: '700', color: '#111827' },
  desc:  { fontSize: 12, color: '#6b7280', marginTop: 2, maxWidth: 200 },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '800', color: NAVY },
  priceLabel: { fontSize: 11, color: '#9ca3af' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#bbf7d0' },
  pillText: { fontSize: 11, color: '#166534', fontWeight: '600' },
  btn:  { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Product section ─────────────────────────────────────────────────────────

function ProductSection({ product, onDetails }: { product: any; onDetails: (t: any, p: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const tiers: any[] = product.tiers || [];
  const typeIcon: Record<string, string> = { health: 'medkit', life: 'heart', auto: 'car', travel: 'airplane', disability: 'body' };

  return (
    <View style={{ marginBottom: 20 }}>
      <TouchableOpacity style={ps.header} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={ps.icon}>
          <Ionicons name={(typeIcon[product.productType] || 'shield') as any} size={22} color={NAVY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ps.name}>{product.name}</Text>
          <Text style={ps.sub}>{tiers.length} tier{tiers.length !== 1 ? 's' : ''} · {product.payer?.name || ''}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingTop: 4 }}>
          {product.description ? <Text style={ps.desc}>{product.description}</Text> : null}
          {product.features?.length > 0 && (
            <View style={ps.features}>
              {product.features.map((f: string, i: number) => (
                <View key={i} style={ps.featureRow}>
                  <Ionicons name="checkmark" size={14} color={BLUE} />
                  <Text style={ps.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
          {tiers.map((t: any) => <TierCard key={t._id} tier={t} product={product} onDetails={onDetails} />)}
        </View>
      )}
    </View>
  );
}

const ps = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  icon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  name:   { fontSize: 15, fontWeight: '700', color: '#111827' },
  sub:    { fontSize: 12, color: '#6b7280', marginTop: 2 },
  desc:   { fontSize: 13, color: '#4b5563', marginHorizontal: 4, marginBottom: 12, lineHeight: 19 },
  features: { marginBottom: 12, gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 4 },
  featureText: { fontSize: 12, color: '#374151', flex: 1 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CoverageScreen() {
  const insets = useSafeAreaInsets();

  const [enrollment,  setEnrollment]  = useState<any>(null);
  const [claims,      setClaims]      = useState<any[]>([]);
  const [products,    setProducts]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // Detail + agreement modal
  const [detailTier,  setDetailTier]  = useState<any>(null);
  const [detailProd,  setDetailProd]  = useState<any>(null);
  const [paying,      setPaying]      = useState(false);

  const load = useCallback(async () => {
    try {
      const [enrRes, prodsRes] = await Promise.allSettled([
        api.get('/enrollments', { params: { status: 'active' } }),
        api.get('/products', { params: { withTiers: 'true' } }),
      ]);

      if (enrRes.status === 'fulfilled') {
        const list = enrRes.value.data.enrollments || [];
        if (list.length > 0) {
          const detail = await api.get(`/enrollments/${list[0]._id}`);
          setEnrollment(detail.data.enrollment);
          const claimsRes = await api.get('/claims');
          setClaims((claimsRes.data.claims || []).filter((c: any) =>
            ['submitted','acknowledged','under_review','assessment','approved',
             'partially_approved','payment_initiated','settled'].includes(c.status)
          ));
        }
      }
      if (prodsRes.status === 'fulfilled') setProducts(prodsRes.value.data.products || []);
    } catch (e) {
      console.error('Coverage load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  function buildUsageMap(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const claim of claims) {
      const key = CLAIM_COV_MAP[claim.claimType];
      if (!key) continue;
      map[key] = (map[key] || 0) + (claim.settlementAmount ?? claim.approvedAmount ?? claim.claimedAmount ?? 0);
    }
    return map;
  }

  const openDetails = (tier: any, product: any) => {
    setDetailTier(tier);
    setDetailProd(product);
  };

  const handlePay = async (sigName: string) => {
    if (!detailTier || !detailProd) return;
    setPaying(true);
    try {
      // Save signed agreement
      await api.post('/policy-agreements', {
        productId: detailProd._id,
        tierId:    detailTier._id,
        signatureData: sigName,
        agreed: true,
      });

      // Create enrollment
      const enrRes = await api.post('/enrollments/self', {
        productId: detailProd._id,
        tierId:    detailTier._id,
      });
      const enrId = enrRes.data.enrollment._id;

      // Open Chapa
      const payRes = await api.post('/chapa/initialize', {
        enrollmentId: enrId,
        amount:       detailTier.annualPremium,
        currency:     'ETB',
        description:  `${detailTier.name} — ${detailProd.name}`,
      });
      const url = payRes.data.checkout_url;
      if (url) {
        setDetailTier(null);
        setDetailProd(null);
        await Linking.openURL(url);
      } else {
        Alert.alert('Payment Error', 'Could not initiate payment. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Enrollment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={NAVY} /></View>;

  const usageMap = buildUsageMap();
  const tier = enrollment?.tier;
  const tierCoverages: any[] = tier?.coverages || [];
  const product = enrollment?.product;
  const insuredPersons: any[] = enrollment?.insuredPersons || [];
  const startDate = enrollment?.startDate ? new Date(enrollment.startDate).toLocaleDateString() : '—';
  const endDate   = enrollment?.endDate   ? new Date(enrollment.endDate).toLocaleDateString()   : '—';
  const daysLeft  = enrollment?.endDate
    ? Math.max(0, Math.ceil((new Date(enrollment.endDate).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <>
      <StatusBar style="dark" />
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}
      >
        {/* ── Active enrollment ──────────────────────────────────────────────── */}
        {enrollment ? (
          <>
            <View style={s.policyCard}>
              <View style={s.cardTopRow}>
                <Text style={s.cardEyebrow}>ACTIVE POLICY</Text>
                <View style={s.activePill}>
                  <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                  <Text style={s.activePillText}> ACTIVE</Text>
                </View>
              </View>
              <Text style={s.planName}>{tier?.name || 'Standard Plan'}</Text>
              <Text style={s.productName}>{product?.name || ''}</Text>

              <View style={s.datesRow}>
                <View style={s.dateItem}><Text style={s.dateLabel}>Start</Text><Text style={s.dateValue}>{startDate}</Text></View>
                <View style={s.dateDivider} />
                <View style={s.dateItem}><Text style={s.dateLabel}>Expires</Text><Text style={s.dateValue}>{endDate}</Text></View>
                {daysLeft !== null && (
                  <><View style={s.dateDivider} />
                  <View style={s.dateItem}>
                    <Text style={s.dateLabel}>Days left</Text>
                    <Text style={[s.dateValue, daysLeft < 30 && { color: '#f59e0b' }]}>{daysLeft}</Text>
                  </View></>
                )}
              </View>

              {enrollment.premium?.amount && (
                <View style={s.premiumRow}>
                  <Ionicons name="card-outline" size={14} color="#93c5fd" />
                  <Text style={s.premiumText}>
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
              <View style={s.section}>
                <Text style={s.sectionTitle}>Coverage Usage</Text>
                <Text style={s.sectionSub}>Based on submitted &amp; settled claims this policy year</Text>
                <View style={s.card}>
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
                    return <UsageBar key={i} label={cov.name} used={used} limit={limit} color={colors[i % colors.length]} />;
                  })}
                </View>
              </View>
            )}

            {/* Covered members */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Covered Members</Text>
              {insuredPersons.length === 0 ? (
                <View style={s.emptyBox}><Text style={s.emptyBoxText}>No members linked to this policy.</Text></View>
              ) : (
                insuredPersons.map((p: any, i: number) => (
                  <View key={i} style={s.memberRow}>
                    <View style={[s.memberAvatar, { backgroundColor: i === 0 ? NAVY : '#7c3aed' }]}>
                      <Text style={s.memberAvatarText}>{p.firstName?.[0]}{p.lastName?.[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>{p.firstName} {p.lastName}</Text>
                      <Text style={s.memberEmail}>{p.email}</Text>
                    </View>
                    {i === 0 && <View style={s.primaryBadge}><Text style={s.primaryBadgeText}>PRIMARY</Text></View>}
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <View style={s.noEnrollCard}>
            <Ionicons name="shield-outline" size={48} color="#cbd5e1" />
            <Text style={s.noEnrollTitle}>No Active Coverage</Text>
            <Text style={s.noEnrollSub}>
              You don't have an active policy yet. Browse the plans below and enroll today.
            </Text>
          </View>
        )}

        {/* ── Browse plans — always visible ─────────────────────────────────── */}
        {products.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              {enrollment ? 'Explore More Coverage Options' : 'Available Plans'}
            </Text>
            <Text style={s.sectionSub}>
              {enrollment
                ? 'You can add supplemental or alternative coverage alongside your current policy.'
                : 'Tap any plan to view full details, coverage limits, and policy terms before enrolling.'}
            </Text>

            {/* Info note for users with existing coverage */}
            {enrollment && (
              <View style={s.infoNote}>
                <Ionicons name="information-circle-outline" size={16} color="#0369a1" />
                <Text style={s.infoNoteText}>
                  Enrolling in an additional plan creates a separate policy. Your existing coverage remains active.
                </Text>
              </View>
            )}

            {products.map((p: any) => (
              <ProductSection key={p._id} product={p} onDetails={openDetails} />
            ))}
          </View>
        )}

        {products.length === 0 && !enrollment && (
          <View style={s.emptyBox}>
            <Ionicons name="alert-circle-outline" size={32} color="#d1d5db" />
            <Text style={[s.emptyBoxText, { marginTop: 8 }]}>
              No individual plans are currently available. Contact support for assistance.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Plan details + agreement modal */}
      {detailTier && detailProd && (
        <PlanDetailModal
          tier={detailTier}
          product={detailProd}
          onClose={() => { if (!paying) { setDetailTier(null); setDetailProd(null); } }}
          onConfirmPay={handlePay}
          paying={paying}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  policyCard: { backgroundColor: NAVY, borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: NAVY, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
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
  premiumRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  premiumText: { fontSize: 12, color: '#bfdbfe' },

  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub:   { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  infoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f0f9ff', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bae6fd' },
  infoNoteText: { flex: 1, fontSize: 12, color: '#0c4a6e', lineHeight: 17 },

  memberRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  memberAvatar:     { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberName:       { fontSize: 14, fontWeight: '600', color: '#111827' },
  memberEmail:      { fontSize: 12, color: '#6b7280', marginTop: 1 },
  primaryBadge:     { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },

  noEnrollCard:  { alignItems: 'center', paddingVertical: 32, gap: 10, backgroundColor: '#fff', borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#e5e7eb' },
  noEnrollTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  noEnrollSub:   { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  emptyBox:      { backgroundColor: '#f9fafb', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyBoxText:  { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
