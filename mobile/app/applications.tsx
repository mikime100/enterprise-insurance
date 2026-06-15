import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../lib/api';
import { C, R, F, SHADOW, quoteCfg, QUOTE_STAGES, needsUnderwriting, fmtMoney, fmtDate } from '../lib/theme';
import { FadeIn, Press, Button, EmptyState, Skeleton } from '../components/ui';

export default function ApplicationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [quotes, setQuotes]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [products, setProducts]     = useState<any[]>([]);

  const load = async () => {
    try {
      const r = await api.get('/quotes');
      setQuotes(Array.isArray(r.data.quotes) ? r.data.quotes : []);
    } catch { /* keep */ }
    finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const openPicker = async () => {
    setPickerOpen(true);
    if (!products.length) {
      try {
        const r = await api.get('/products', { params: { withTiers: 'true' } });
        setProducts((r.data.products || []).filter((p: any) => needsUnderwriting(p.productType)));
      } catch { /* show empty */ }
    }
  };

  const approved = quotes.filter(q => q.status === 'approved').length;
  const accepted = quotes.filter(q => q.status === 'accepted').length;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={[C.navyDark, C.navy]} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Applications</Text>
          <View style={{ width: 24 }} />
        </View>
        {approved > 0 && (
          <View style={s.offerBanner}>
            <Ionicons name="pricetag" size={16} color="#86efac" />
            <Text style={s.offerBannerText}>
              {approved} approved offer{approved > 1 ? 's' : ''} ready to accept
            </Text>
          </View>
        )}
      </LinearGradient>

      {loading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={90} /><Skeleton height={120} /><Skeleton height={120} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.navy} />}
        >
          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={[s.statValue, { color: C.greenDark }]}>{approved}</Text>
              <Text style={s.statLabel}>Offers Ready</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statValue, { color: C.blue }]}>{accepted}</Text>
              <Text style={s.statLabel}>Accepted</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statValue, { color: C.navy }]}>{quotes.length}</Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
          </View>

          {/* How it works */}
          <View style={s.howCard}>
            <Text style={s.howTitle}>How it works</Text>
            <View style={s.howRow}>
              {QUOTE_STAGES.map((label, i) => (
                <View key={label} style={s.howStep}>
                  <View style={s.howDot}><Text style={s.howDotText}>{i + 1}</Text></View>
                  <Text style={s.howLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.howSub}>
              Apply with your details, our underwriters review and send a personalised offer, then accept & pay to activate.
            </Text>
          </View>

          {/* List */}
          {quotes.length === 0 ? (
            <EmptyState icon="document-text-outline" title="No applications yet"
              sub="Apply for life, health, or disability coverage and track the offer here." />
          ) : (
            quotes.map((q, i) => {
              const cfg = quoteCfg(q.status);
              const isApproved = q.status === 'approved';
              return (
                <FadeIn key={q._id} delay={Math.min(i * 50, 300)} from={14}>
                  <Press onPress={() => router.push(`/application/${q._id}` as any)}
                    style={[s.card, isApproved && { borderWidth: 1.5, borderColor: cfg.color }]}>
                    {isApproved && (
                      <View style={[s.actionStrip, { backgroundColor: cfg.bg }]}>
                        <Ionicons name="pricetag" size={13} color={cfg.color} />
                        <Text style={[s.actionStripText, { color: cfg.color }]}>
                          Offer ready{q.scenarios?.[0]?.annualPremium ? ` — from ${fmtMoney(q.scenarios[0].annualPremium)}/yr` : ''} — tap to review
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color={cfg.color} />
                      </View>
                    )}
                    <View style={s.cardTop}>
                      <View style={s.cardIcon}>
                        <Ionicons name="shield-half" size={18} color={C.navy} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{q.product?.name || 'Coverage Application'}</Text>
                        <Text style={s.cardMeta}>{q.quoteNumber} · {fmtDate(q.createdAt)}</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
                        <Text style={[s.pillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </Press>
                </FadeIn>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Floating apply CTA */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Button label="Apply for New Coverage" icon="add-circle" onPress={openPicker} />
      </View>

      {/* Product picker modal */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Choose Coverage to Apply For</Text>
            <Text style={s.modalSub}>These plans require a quick underwriting review.</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {products.length === 0 ? (
                <Text style={s.modalEmpty}>No underwritten plans available right now. Simple plans can be bought instantly from the Coverage tab.</Text>
              ) : products.map(p => (
                <Press key={p._id} onPress={() => { setPickerOpen(false); router.push(`/apply/${p._id}` as any); }}
                  style={s.prodRow}>
                  <View style={s.prodIcon}>
                    <Ionicons name="shield-checkmark" size={20} color={C.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prodName}>{p.name}</Text>
                    <Text style={s.prodMeta}>{(p.tiers?.length || 0)} tier{p.tiers?.length !== 1 ? 's' : ''} · {String(p.productType || '').toUpperCase()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.grayLight} />
                </Press>
              ))}
            </ScrollView>
            <Button label="Close" variant="outline" color={C.gray} onPress={() => setPickerOpen(false)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: F.head },
  offerBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginTop: 14, alignSelf: 'flex-start' },
  offerBannerText: { color: '#86efac', fontSize: 12.5, fontFamily: F.bodySemi },

  statsRow: { flexDirection: 'row', gap: 11, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: R.md, padding: 14, alignItems: 'center', ...SHADOW.card },
  statValue: { fontSize: 24, fontFamily: F.bodyBold, letterSpacing: -0.5 },
  statLabel: { fontSize: 10.5, color: C.gray, marginTop: 3, fontFamily: F.bodySemi, letterSpacing: 0.4, textTransform: 'uppercase' },

  howCard: { backgroundColor: '#fff', borderRadius: R.lg, padding: 16, marginBottom: 18, ...SHADOW.card },
  howTitle: { fontSize: 15, fontFamily: F.headSemi, color: C.ink, marginBottom: 14 },
  howRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  howStep: { alignItems: 'center', flex: 1 },
  howDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  howDotText: { color: C.navy, fontFamily: F.bodyBold, fontSize: 13 },
  howLabel: { fontSize: 11, color: C.slate, fontFamily: F.bodySemi },
  howSub: { fontSize: 12.5, color: C.grayLight, lineHeight: 18, fontFamily: F.body },

  card: { backgroundColor: '#fff', borderRadius: R.lg, padding: 16, marginBottom: 12, ...SHADOW.card, overflow: 'hidden' },
  actionStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: -16, marginTop: -16, marginBottom: 13, paddingHorizontal: 14, paddingVertical: 9 },
  actionStripText: { flex: 1, fontSize: 12, fontFamily: F.bodySemi },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  cardIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14.5, fontFamily: F.bodyBold, color: C.ink },
  cardMeta: { fontSize: 12, color: C.gray, marginTop: 1, fontFamily: F.body },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontFamily: F.bodyBold, textTransform: 'capitalize' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontFamily: F.head, color: C.ink },
  modalSub: { fontSize: 13, color: C.gray, marginTop: 3, marginBottom: 14, fontFamily: F.body },
  modalEmpty: { fontSize: 13, color: C.grayLight, textAlign: 'center', paddingVertical: 24, lineHeight: 19, fontFamily: F.body },
  prodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: R.md, padding: 14, marginBottom: 10, ...SHADOW.card },
  prodIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  prodName: { fontSize: 15, fontFamily: F.bodySemi, color: C.ink },
  prodMeta: { fontSize: 12, color: C.gray, marginTop: 1, fontFamily: F.body },
});
