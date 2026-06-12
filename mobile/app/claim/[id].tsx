import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  TextInput, Linking, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../lib/api';
import { C, R, F, SHADOW, statusCfg, absUrl, fmtMoney, fmtDate, DOC_TYPES } from '../../lib/theme';
import { FadeIn, Press, StatusPill, ClaimProgress, Button, Skeleton } from '../../components/ui';

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [claim, setClaim]           = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Offer response
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState('');
  const [responding, setResponding]   = useState(false);

  // Appeal
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [appealing, setAppealing]   = useState(false);

  // Doc-request response
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/claims/${id}`);
      setClaim(r.data.claim);
    } catch { /* keep last state */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // ── Settlement offer ───────────────────────────────────────────────────────
  const respondToOffer = async (accepted: boolean) => {
    if (!accepted && !disputeText.trim()) return;
    setResponding(true);
    try {
      await api.post(`/claims/${id}/client-respond`, {
        accepted, reason: accepted ? undefined : disputeText.trim(),
      });
      setDisputeOpen(false); setDisputeText('');
      Alert.alert(
        accepted ? 'Offer Accepted ✓' : 'Dispute Submitted',
        accepted
          ? 'Payment will be initiated shortly. You can track it on this screen.'
          : 'The claims team will review your dispute and contact you with a revised offer.',
      );
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit response');
    } finally { setResponding(false); }
  };

  const confirmAccept = () => {
    Alert.alert('Accept Settlement Offer', `Accept ${fmtMoney(claim.offeredAmount)} as final settlement?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept Offer', onPress: () => respondToOffer(true) },
    ]);
  };

  // ── Appeal ─────────────────────────────────────────────────────────────────
  const submitAppeal = async () => {
    if (!appealText.trim()) return;
    setAppealing(true);
    try {
      await api.post(`/claims/${id}/appeal`, { appealNote: appealText.trim() });
      setAppealOpen(false); setAppealText('');
      Alert.alert('Appeal Submitted', 'We will review your appeal within 3 business days.');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit appeal');
    } finally { setAppealing(false); }
  };

  // ── Documentation response ─────────────────────────────────────────────────
  const uploadRequestedDocs = async (fromCamera: boolean, asFile?: boolean) => {
    let files: { uri: string; name: string; mimeType: string }[] = [];
    if (asFile) {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true });
      if (res.canceled) return;
      files = res.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream' }));
    } else {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 });
      if (res.canceled) return;
      files = res.assets.map((a, i) => ({ uri: a.uri, name: a.fileName || `doc-${Date.now()}-${i}.jpg`, mimeType: a.mimeType || 'image/jpeg' }));
    }
    if (!files.length) return;

    setUploadingDocs(true);
    try {
      const documents: any[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append('file', { uri: f.uri, name: f.name, type: f.mimeType } as any);
        const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        documents.push({ name: up.data.originalName || f.name, type: 'other', url: up.data.url });
      }
      await api.post(`/claims/${id}/add-documents`, { documents });
      Alert.alert('Documents Submitted ✓', 'Your claim is back under review.');
      load();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message || 'Could not upload documents.');
    } finally { setUploadingDocs(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 60, paddingHorizontal: 20, gap: 14 }]}>
        <Skeleton height={150} /><Skeleton height={90} /><Skeleton height={200} />
      </View>
    );
  }
  if (!claim) {
    return (
      <View style={s.centered}>
        <Text style={{ fontSize: 16, color: C.gray, marginBottom: 12 }}>Claim not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 15, color: C.navy, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const externalNotes = (claim.notes || []).filter((n: any) => !n.isInternal);
  const history = [...(claim.statusHistory || [])].reverse();

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Hero header */}
      <LinearGradient colors={[C.navyDark, C.navy]} style={[s.hero, { paddingTop: insets.top + 10 }]}>
        <View style={s.heroNav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.heroNavTitle}>Claim Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={s.heroNumber}>{claim.claimNumber}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <StatusPill status={claim.status} />
          <Text style={s.heroDate}>Filed {fmtDate(claim.createdAt)}</Text>
        </View>
        <View style={s.heroProgress}>
          <ClaimProgress status={claim.status} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.navy} />}
      >
        {/* ── SETTLEMENT OFFER — awaiting client approval ─────────────────── */}
        {claim.status === 'awaiting_client_approval' && (
          <FadeIn>
            <View style={s.offerCard}>
              <View style={s.offerHead}>
                <Ionicons name="cash" size={20} color="#9333ea" />
                <Text style={s.offerTitle}>Settlement Offer Received</Text>
              </View>
              <View style={s.offerAmtBox}>
                <Text style={s.offerAmtLabel}>Offered Amount</Text>
                <Text style={s.offerAmt}>{fmtMoney(claim.offeredAmount)}</Text>
                <Text style={s.offerVs}>You claimed {fmtMoney(claim.claimedAmount)}</Text>
              </View>
              <Text style={s.offerBody}>
                The insurance company has assessed your claim and proposed this settlement.
                Accept to proceed to payment, or dispute with a reason.
              </Text>
              {!disputeOpen ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button label="Dispute" color={C.gray} variant="outline"
                    onPress={() => setDisputeOpen(true)} disabled={responding} style={{ flex: 1 }} />
                  <Button label="Accept Offer" icon="checkmark-circle" color={C.greenDark}
                    onPress={confirmAccept} loading={responding} style={{ flex: 1.4 }} />
                </View>
              ) : (
                <View>
                  <Text style={s.disputeLabel}>Why are you disputing? *</Text>
                  <TextInput style={s.textarea} multiline textAlignVertical="top"
                    placeholder="Explain why this offer is unfair and what amount you believe is right…"
                    placeholderTextColor={C.grayLight}
                    value={disputeText} onChangeText={setDisputeText} />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <Button label="Cancel" variant="outline" color={C.gray}
                      onPress={() => { setDisputeOpen(false); setDisputeText(''); }} style={{ flex: 1 }} />
                    <Button label="Submit Dispute" icon="send" color={C.red}
                      onPress={() => respondToOffer(false)} loading={responding}
                      disabled={!disputeText.trim()} style={{ flex: 2 }} />
                  </View>
                </View>
              )}
            </View>
          </FadeIn>
        )}

        {/* ── DISPUTED — renegotiation ────────────────────────────────────── */}
        {claim.status === 'disputed' && (
          <FadeIn>
            <View style={[s.bannerCard, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
              <View style={s.bannerHead}>
                <Ionicons name="alert-circle" size={18} color="#ea580c" />
                <Text style={[s.bannerTitle, { color: '#c2410c' }]}>Under Renegotiation</Text>
              </View>
              <Text style={[s.bannerBody, { color: '#9a3412' }]}>
                You disputed the settlement offer. The claims team is reviewing and will respond with a revised proposal.
              </Text>
              {!!claim.clientApproval?.reason && (
                <View style={s.quoteBox}>
                  <Text style={s.quoteText}>"{claim.clientApproval.reason}"</Text>
                </View>
              )}
            </View>
          </FadeIn>
        )}

        {/* ── DOCS REQUESTED — upload response ────────────────────────────── */}
        {claim.status === 'documentation_requested' && (
          <FadeIn>
            <View style={[s.bannerCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <View style={s.bannerHead}>
                <Ionicons name="document-attach" size={18} color={C.amber} />
                <Text style={[s.bannerTitle, { color: '#92400e' }]}>Additional Documents Required</Text>
              </View>
              {(claim.documentationRequested || []).map((d: string, i: number) => (
                <View key={i} style={s.reqRow}>
                  <Ionicons name="ellipse" size={6} color="#b45309" />
                  <Text style={s.reqText}>{d}</Text>
                </View>
              ))}
              <Text style={[s.bannerBody, { color: '#78350f', marginTop: 8 }]}>
                Upload the requested documents — your claim automatically returns to review.
              </Text>
              {uploadingDocs ? (
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 }}>
                  <ActivityIndicator color={C.amber} />
                  <Text style={{ color: '#92400e', fontSize: 13 }}>Uploading…</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Button label="Camera" icon="camera" color={C.amber} onPress={() => uploadRequestedDocs(true)} style={{ flex: 1 }} />
                  <Button label="Gallery" icon="images" color={C.amber} onPress={() => uploadRequestedDocs(false)} style={{ flex: 1 }} />
                  <Button label="Files" icon="folder-open" color={C.amber} onPress={() => uploadRequestedDocs(false, true)} style={{ flex: 1 }} />
                </View>
              )}
            </View>
          </FadeIn>
        )}

        {/* ── DENIED — appeal ─────────────────────────────────────────────── */}
        {claim.status === 'denied' && claim.appealStatus !== 'submitted' && claim.appealStatus !== 'reviewed' && (
          <FadeIn>
            <View style={[s.bannerCard, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
              <View style={s.bannerHead}>
                <Ionicons name="close-circle" size={18} color={C.red} />
                <Text style={[s.bannerTitle, { color: '#991b1b' }]}>Claim Denied</Text>
              </View>
              {!!claim.resolution && (
                <Text style={[s.bannerBody, { color: '#7f1d1d' }]}>Reason: {claim.resolution}</Text>
              )}
              <Text style={[s.bannerBody, { color: '#991b1b' }]}>
                If you believe this is incorrect, you can submit a formal appeal.
              </Text>
              {!appealOpen ? (
                <Button label="Submit an Appeal" icon="megaphone" color={C.red} variant="outline"
                  onPress={() => setAppealOpen(true)} />
              ) : (
                <View>
                  <TextInput style={s.textarea} multiline textAlignVertical="top"
                    placeholder="Explain why the denial was incorrect, with any supporting context…"
                    placeholderTextColor={C.grayLight}
                    value={appealText} onChangeText={setAppealText} />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <Button label="Cancel" variant="outline" color={C.gray}
                      onPress={() => setAppealOpen(false)} style={{ flex: 1 }} />
                    <Button label="Submit Appeal" icon="send" color={C.red}
                      onPress={submitAppeal} loading={appealing}
                      disabled={!appealText.trim()} style={{ flex: 2 }} />
                  </View>
                </View>
              )}
            </View>
          </FadeIn>
        )}

        {claim.appealStatus === 'submitted' && (
          <FadeIn>
            <View style={[s.bannerCard, { backgroundColor: '#eff6ff', borderColor: '#93c5fd' }]}>
              <View style={s.bannerHead}>
                <Ionicons name="checkmark-circle" size={18} color={C.blueDeep} />
                <Text style={[s.bannerTitle, { color: '#1e40af' }]}>Appeal Submitted</Text>
              </View>
              <Text style={[s.bannerBody, { color: '#1e40af' }]}>{claim.appealNote}</Text>
              <Text style={{ fontSize: 12, color: '#3b82f6' }}>We will respond within 3 business days.</Text>
            </View>
          </FadeIn>
        )}

        {/* ── Amounts — Claimed / Offered / Approved, with Pending placeholder ── */}
        <FadeIn delay={60}>
          <View style={s.amountsCard}>
            <AmountCell label="Claimed" value={fmtMoney(claim.claimedAmount)} color={C.ink} />
            {claim.offeredAmount != null && (
              <AmountCell label="Offered" value={fmtMoney(claim.offeredAmount)} color="#9333ea" />
            )}
            {claim.settlementAmount != null ? (
              <AmountCell label="Settled" value={fmtMoney(claim.settlementAmount)} color={C.cyan} />
            ) : claim.approvedAmount != null ? (
              <AmountCell label="Approved" value={fmtMoney(claim.approvedAmount)} color={C.greenDark} />
            ) : claim.offeredAmount != null ? (
              <AmountCell label="Approved" value="Pending" color={C.grayLight} pending />
            ) : null}
          </View>
        </FadeIn>

        {/* ── Details ─────────────────────────────────────────────────────── */}
        <FadeIn delay={120}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Incident Details</Text>
            <DetailRow icon="pricetag" label="Type" value={claim.claimType?.replace(/_/g, ' ')} cap />
            <DetailRow icon="calendar" label="Incident date" value={fmtDate(claim.incidentDate || claim.dateOfService)} />
            {!!claim.incidentLocation && <DetailRow icon="location" label="Location" value={claim.incidentLocation} />}
            {!!claim.policeReportRef && <DetailRow icon="shield" label="Police report" value={claim.policeReportRef} />}
            {!!claim.diagnosis && <DetailRow icon="medkit" label="Diagnosis" value={claim.diagnosis} />}
            {!!claim.description && (
              <View style={{ marginTop: 10 }}>
                <Text style={s.descLabel}>DESCRIPTION</Text>
                <Text style={s.descText}>{claim.description}</Text>
              </View>
            )}
          </View>
        </FadeIn>

        {/* Third party */}
        {!!claim.thirdParty?.name && (
          <FadeIn delay={150}>
            <View style={[s.card, { backgroundColor: '#f0f6ff', borderWidth: 1, borderColor: '#bfdbfe' }]}>
              <Text style={[s.cardTitle, { color: '#1e40af' }]}>Third Party</Text>
              <DetailRow icon="person" label="Name" value={claim.thirdParty.name} />
              {!!claim.thirdParty.contact && <DetailRow icon="call" label="Contact" value={claim.thirdParty.contact} />}
              {!!claim.thirdParty.vehicle && <DetailRow icon="car" label="Vehicle" value={claim.thirdParty.vehicle} />}
              {!!claim.thirdParty.insurerName && <DetailRow icon="business" label="Their insurer" value={claim.thirdParty.insurerName} />}
            </View>
          </FadeIn>
        )}

        {/* ── Documents ───────────────────────────────────────────────────── */}
        {claim.documents?.length > 0 && (
          <FadeIn delay={180}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Documents ({claim.documents.length})</Text>
              {claim.documents.map((d: any, i: number) => (
                <Press key={i} onPress={() => d.url && Linking.openURL(absUrl(d.url))} style={s.docRow}>
                  <View style={s.docIcon}>
                    <Ionicons name={(DOC_TYPES.find(t => t.value === d.type)?.icon || 'document') as any} size={17} color={C.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.docName} numberOfLines={1}>{d.name || 'Document'}</Text>
                    <Text style={s.docType}>{(d.type || 'other').replace(/_/g, ' ')}</Text>
                  </View>
                  <Ionicons name="open-outline" size={17} color={C.blue} />
                </Press>
              ))}
            </View>
          </FadeIn>
        )}

        {/* ── Adjuster notes — amber card per design system ───────────────── */}
        {externalNotes.length > 0 && (
          <FadeIn delay={210}>
            <View style={s.adjusterCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Ionicons name="chatbox-ellipses" size={14} color="#b45309" />
                <Text style={s.adjusterTitle}>ADJUSTER NOTES</Text>
              </View>
              {externalNotes.map((n: any, i: number) => (
                <View key={i} style={i > 0 ? { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#fde68a' } : undefined}>
                  <Text style={s.adjusterContent}>"{n.content}"</Text>
                  <Text style={s.adjusterDate}>{new Date(n.createdAt || n.timestamp || Date.now()).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </FadeIn>
        )}

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <FadeIn delay={240}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Status History</Text>
              {history.map((h: any, i: number) => {
                const hc = statusCfg(h.status);
                return (
                  <View key={i} style={s.histRow}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={[s.histDot, { backgroundColor: hc.color }]} />
                      {i < history.length - 1 && <View style={s.histLine} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: i < history.length - 1 ? 16 : 0 }}>
                      <StatusPill status={h.status} size="sm" />
                      <Text style={s.histDate}>{new Date(h.timestamp || h.changedAt).toLocaleString()}</Text>
                      {!!h.reason && <Text style={s.histReason}>{h.reason}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </FadeIn>
        )}
      </ScrollView>
    </View>
  );
}

function AmountCell({ label, value, color, pending }: { label: string; value: string; color: string; pending?: boolean }) {
  return (
    <View style={s.amtCell}>
      <Text style={s.amtLabel}>{label}</Text>
      <Text style={[s.amtValue, { color }, pending && { fontStyle: 'italic', fontFamily: F.body }]}
        numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value, cap }: { icon: string; label: string; value?: string; cap?: boolean }) {
  return (
    <View style={s.detRow}>
      <Ionicons name={icon as any} size={14} color={C.grayLight} />
      <Text style={s.detLabel}>{label}</Text>
      <Text style={[s.detValue, cap && { textTransform: 'capitalize' }]} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hero: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heroNavTitle: { color: '#fff', fontSize: 17, fontFamily: F.headSemi },
  heroNumber: { color: '#fff', fontSize: 24, fontFamily: F.head, letterSpacing: 0.3 },
  heroDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  heroProgress: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: R.md, paddingHorizontal: 8, paddingVertical: 10, marginTop: 14 },

  offerCard: {
    backgroundColor: '#fdf4ff', borderWidth: 1.5, borderColor: '#d8b4fe',
    borderRadius: R.lg, padding: 18, marginBottom: 16, ...SHADOW.card,
  },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  offerTitle: { fontSize: 16, fontWeight: '800', color: '#7e22ce' },
  offerAmtBox: { backgroundColor: '#fff', borderRadius: R.md, padding: 16, alignItems: 'center', marginBottom: 12 },
  offerAmtLabel: { fontSize: 12, color: C.gray },
  offerAmt: { fontSize: 30, fontWeight: '900', color: '#7e22ce', letterSpacing: -1, marginTop: 2 },
  offerVs: { fontSize: 12, color: C.grayLight, marginTop: 4 },
  offerBody: { fontSize: 13, color: '#6b21a8', lineHeight: 19, marginBottom: 14 },
  disputeLabel: { fontSize: 13, fontWeight: '700', color: C.slate, marginBottom: 8 },

  bannerCard: { borderWidth: 1.5, borderRadius: R.lg, padding: 16, marginBottom: 16, gap: 10 },
  bannerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTitle: { fontSize: 15, fontWeight: '800' },
  bannerBody: { fontSize: 13, lineHeight: 19 },
  quoteBox: { backgroundColor: '#fff', borderRadius: R.sm, padding: 12 },
  quoteText: { fontSize: 13, color: '#78350f', fontStyle: 'italic' },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  reqText: { fontSize: 13.5, color: '#78350f', fontWeight: '600' },

  textarea: {
    backgroundColor: '#fff', borderRadius: R.md, padding: 13, fontSize: 14,
    color: C.ink, borderWidth: 1.5, borderColor: C.line, height: 96,
  },

  amountsCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: R.lg,
    padding: 16, marginBottom: 16, ...SHADOW.card,
  },
  amtCell: { flex: 1, alignItems: 'center' },
  amtLabel: { fontSize: 10.5, fontWeight: '700', color: C.grayLight, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  amtValue: { fontSize: 15, fontWeight: '800' },

  card: { backgroundColor: '#fff', borderRadius: R.lg, padding: 18, marginBottom: 16, ...SHADOW.card },
  cardTitle: { fontSize: 17, fontFamily: F.head, color: C.ink, marginBottom: 12 },

  detRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  detLabel: { fontSize: 13, color: C.gray, width: 100 },
  detValue: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink, textAlign: 'right' },
  descLabel: { fontSize: 10.5, fontWeight: '800', color: C.grayLight, letterSpacing: 0.8, marginBottom: 6 },
  descText: { fontSize: 13.5, color: C.slate, lineHeight: 20 },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  docIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  docType: { fontSize: 11.5, color: C.grayLight, textTransform: 'capitalize', marginTop: 1 },

  adjusterCard: {
    backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fde68a',
    borderLeftWidth: 4, borderLeftColor: C.amber,
    borderRadius: R.md, padding: 14, marginBottom: 16,
  },
  adjusterTitle: { fontSize: 11, fontFamily: F.bodyBold, color: '#b45309', letterSpacing: 1 },
  adjusterContent: { fontSize: 13.5, color: '#713f12', lineHeight: 20, fontStyle: 'italic', fontFamily: F.body },
  adjusterDate: { fontSize: 11, color: '#b45309', marginTop: 6, fontFamily: F.body },

  histRow: { flexDirection: 'row', gap: 12 },
  histDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  histLine: { width: 2, flex: 1, backgroundColor: C.line, marginTop: 2 },
  histDate: { fontSize: 11.5, color: C.grayLight, marginTop: 5 },
  histReason: { fontSize: 12.5, color: C.slate, marginTop: 3, lineHeight: 18 },
});
