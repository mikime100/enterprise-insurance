import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { C, R, F, SHADOW, quoteCfg, QUOTE_STAGES, fmtMoney, fmtDate } from '../../lib/theme';
import { FadeIn, Press, Button, Skeleton } from '../../components/ui';

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [quote, setQuote]           = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting]   = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/quotes/${id}`);
      setQuote(r.data.quote || r.data);
    } catch { /* keep */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const bestPremium = (q: any): number =>
    q?.finalPremium || q?.scenarios?.[0]?.annualPremium || q?.product?.basePrice || 0;

  const acceptAndPay = async () => {
    setAccepting(true);
    try {
      const res = await api.post(`/quotes/${id}/accept`);
      const enrollmentId = res.data?.enrollment?._id;
      if (!enrollmentId) throw new Error('No enrollment created');
      // Test-mode payment: the live Chapa gateway is skipped. The enrollment is
      // created pending; the insured submits their Chapa payment receipt from
      // My Policy, and a payer admin verifies it to activate coverage.
      Alert.alert(
        'Offer Accepted ✓',
        'Your enrollment is created. Submit your Chapa payment receipt on My Policy so our team can verify and activate your coverage.',
        [{ text: 'Go to My Policy', onPress: () => router.replace('/(tabs)/coverage' as any) }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not accept this offer.');
    } finally { setAccepting(false); }
  };

  const confirmAccept = () => {
    Alert.alert('Accept Offer', `Accept this policy at ${fmtMoney(bestPremium(quote))}/year and continue to payment?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept & Continue', onPress: acceptAndPay },
    ]);
  };

  if (loading) {
    return <View style={[s.root, { paddingTop: insets.top + 60, paddingHorizontal: 20, gap: 14 }]}>
      <Skeleton height={140} /><Skeleton height={120} /><Skeleton height={160} />
    </View>;
  }
  if (!quote) {
    return <View style={s.centered}>
      <Text style={{ color: C.gray, marginBottom: 12 }}>Application not found</Text>
      <TouchableOpacity onPress={() => router.back()}><Text style={{ color: C.navy, fontFamily: F.bodyBold }}>Go Back</Text></TouchableOpacity>
    </View>;
  }

  const cfg = quoteCfg(quote.status);
  const scenarios: any[] = quote.scenarios || [];
  const isApproved = quote.status === 'approved';
  const isAccepted = quote.status === 'accepted';
  const isRejected = quote.status === 'rejected';

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient colors={[C.navyDark, C.navy]} style={[s.hero, { paddingTop: insets.top + 10 }]}>
        <View style={s.heroNav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.heroNavTitle}>Application</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={s.heroProduct}>{quote.product?.name || 'Coverage Application'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <View style={[s.pill, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
            <Text style={[s.pillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={s.heroNumber}>{quote.quoteNumber}</Text>
        </View>
        {/* Stage tracker */}
        <View style={s.stageRow}>
          {QUOTE_STAGES.map((label, i) => {
            const done = i < cfg.step, current = i === cfg.step;
            const color = isRejected && current ? C.red : done || current ? C.green : 'rgba(255,255,255,0.25)';
            return (
              <View key={label} style={s.stageItem}>
                <View style={s.stageTop}>
                  {i > 0 && <View style={[s.stageLine, { backgroundColor: i <= cfg.step ? C.green : 'rgba(255,255,255,0.2)' }]} />}
                  <View style={[s.stageDot, { backgroundColor: color }]}>{done && <Ionicons name="checkmark" size={9} color="#fff" />}</View>
                  {i < QUOTE_STAGES.length - 1 && <View style={[s.stageLine, { backgroundColor: i < cfg.step ? C.green : 'rgba(255,255,255,0.2)' }]} />}
                </View>
                <Text style={[s.stageLabel, current && { color: '#fff', fontFamily: F.bodyBold }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + (isApproved ? 110 : 40) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.navy} />}>

        {/* Status-specific banner */}
        {(quote.status === 'submitted' || quote.status === 'under_review') && (
          <FadeIn>
            <View style={[s.banner, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <Ionicons name="hourglass" size={18} color="#b45309" />
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: '#92400e' }]}>
                  {quote.status === 'submitted' ? 'Application Received' : 'Under Review'}
                </Text>
                <Text style={[s.bannerBody, { color: '#78350f' }]}>
                  {quote.status === 'submitted'
                    ? 'Your application is queued for an underwriter. You will be notified when an offer is ready.'
                    : 'An underwriter is assessing your profile and preparing a personalised premium.'}
                </Text>
              </View>
            </View>
          </FadeIn>
        )}

        {isRejected && (
          <FadeIn>
            <View style={[s.banner, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
              <Ionicons name="close-circle" size={18} color={C.red} />
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: '#991b1b' }]}>Application Declined</Text>
                {!!quote.underwriterNote && <Text style={[s.bannerBody, { color: '#7f1d1d' }]}>{quote.underwriterNote}</Text>}
              </View>
            </View>
          </FadeIn>
        )}

        {isAccepted && (
          <FadeIn>
            <View style={[s.banner, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
              <Ionicons name="checkmark-circle" size={18} color={C.greenDark} />
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: '#166534' }]}>Offer Accepted</Text>
                <Text style={[s.bannerBody, { color: '#14532d' }]}>Your policy is being activated. Track it under My Policy.</Text>
              </View>
            </View>
          </FadeIn>
        )}

        {/* Approved offer */}
        {isApproved && (
          <FadeIn>
            <LinearGradient colors={['#064e3b', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1.3, y: 1.3 }} style={s.offerHero}>
              <Text style={s.offerLabel}>YOUR PERSONALISED PREMIUM</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={s.offerAmt}>{bestPremium(quote).toLocaleString()}</Text>
                <Text style={s.offerCur}>ETB / yr</Text>
              </View>
              <Text style={s.offerMonthly}>≈ {fmtMoney(Math.round(bestPremium(quote) / 12))} / month</Text>
              {!!quote.validUntil && (
                <View style={s.validRow}>
                  <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={s.validText}>Valid until {fmtDate(quote.validUntil)} — accept before it expires</Text>
                </View>
              )}
            </LinearGradient>

            {scenarios.length > 1 && (
              <>
                <Text style={s.sectionLabel}>OPTIONS</Text>
                {scenarios.map((sc, i) => (
                  <View key={i} style={s.scenarioRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.scenarioName}>{sc.name || sc.tier?.name || `Option ${i + 1}`}</Text>
                      {!!sc.tier?.name && <Text style={s.scenarioTier}>{sc.tier.name} tier</Text>}
                    </View>
                    <Text style={s.scenarioPrice}>{fmtMoney(sc.annualPremium)}/yr</Text>
                  </View>
                ))}
              </>
            )}
          </FadeIn>
        )}

        {/* Application summary */}
        {!!quote.applicationData && (
          <FadeIn delay={80}>
            <Text style={s.sectionLabel}>YOUR APPLICATION</Text>
            <View style={s.card}>
              <Row label="Date of Birth" value={quote.applicationData.dateOfBirth} />
              <Row label="National ID" value={quote.applicationData.nationalId} />
              <Row label="Occupation" value={quote.applicationData.occupation} />
              <Row label="Dependents" value={String(quote.applicationData.dependentCount ?? '0')} />
              <Row label="Members covered" value={String(quote.memberCount ?? 1)} />
            </View>
          </FadeIn>
        )}
      </ScrollView>

      {isApproved && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
          <Button label="Accept Offer & Pay" icon="card" onPress={confirmAccept} loading={accepting} />
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={s.detRow}>
      <Text style={s.detLabel}>{label}</Text>
      <Text style={s.detValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hero: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heroNavTitle: { color: '#fff', fontSize: 17, fontFamily: F.headSemi },
  heroProduct: { color: '#fff', fontSize: 22, fontFamily: F.head },
  heroNumber: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: F.body },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontFamily: F.bodyBold, textTransform: 'capitalize' },

  stageRow: { flexDirection: 'row', marginTop: 18 },
  stageItem: { flex: 1, alignItems: 'center' },
  stageTop: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 18 },
  stageLine: { flex: 1, height: 2.5 },
  stageDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stageLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.5)', fontFamily: F.bodySemi, marginTop: 5 },

  banner: { flexDirection: 'row', gap: 10, borderWidth: 1.5, borderRadius: R.lg, padding: 16, marginBottom: 16 },
  bannerTitle: { fontSize: 15, fontFamily: F.headSemi },
  bannerBody: { fontSize: 13, lineHeight: 19, marginTop: 3, fontFamily: F.body },

  offerHero: { borderRadius: R.lg, padding: 20, marginBottom: 16, ...SHADOW.float },
  offerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: F.bodySemi, letterSpacing: 1.4, marginBottom: 8 },
  offerAmt: { color: '#fff', fontSize: 38, fontFamily: F.bodyBold, letterSpacing: -1 },
  offerCur: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontFamily: F.bodyBold },
  offerMonthly: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, fontFamily: F.body },
  validRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  validText: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontFamily: F.body },

  sectionLabel: { fontSize: 11, fontFamily: F.bodySemi, color: C.gray, letterSpacing: 1, marginBottom: 10, marginTop: 6 },
  scenarioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: R.md, padding: 14, marginBottom: 8, ...SHADOW.card },
  scenarioName: { fontSize: 14.5, fontFamily: F.bodySemi, color: C.ink },
  scenarioTier: { fontSize: 12, color: C.gray, marginTop: 1, fontFamily: F.body },
  scenarioPrice: { fontSize: 15, fontFamily: F.bodyBold, color: C.greenDark },

  card: { backgroundColor: '#fff', borderRadius: R.lg, paddingHorizontal: 16, paddingVertical: 4, ...SHADOW.card },
  detRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  detLabel: { fontSize: 13, color: C.gray, fontFamily: F.body },
  detValue: { flex: 1, fontSize: 13.5, fontFamily: F.bodySemi, color: C.ink, textAlign: 'right' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
});
