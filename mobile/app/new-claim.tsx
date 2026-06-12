import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import api from '../lib/api';
import {
  C, R, SHADOW, CLAIM_TYPE_LABELS, CLAIM_TYPE_ICONS, CLAIM_TYPES_BY_PRODUCT,
  ALL_CLAIM_TYPES, THIRD_PARTY_TYPES, DOC_TYPES, fmtMoney,
} from '../lib/theme';
import { FadeIn, Press, Button } from '../components/ui';

type Doc = { uri?: string; url: string; name: string; mimeType: string; docType: string };

const STEPS = ['Policy', 'Incident', 'Documents', 'Review'];

export default function NewClaimScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  // Data
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnr, setLoadingEnr]   = useState(true);
  const [enrollment, setEnrollment]   = useState<any>(null);
  const [claimType, setClaimType]     = useState('');
  const [form, setForm] = useState({
    incidentDate: new Date().toISOString().split('T')[0],
    claimedAmount: '', description: '', diagnosis: '',
    incidentLocation: '', policeReportRef: '',
    tpName: '', tpContact: '', tpVehicle: '', tpInsurer: '',
  });
  const [docs, setDocs]           = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Animated progress bar
  const prog = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(prog, { toValue: (step + 1) / STEPS.length, duration: 350, useNativeDriver: false }).start();
  }, [step]);

  useEffect(() => {
    api.get('/enrollments', { params: { status: 'active' } })
      .then(r => {
        const list = Array.isArray(r.data.enrollments) ? r.data.enrollments : [];
        setEnrollments(list);
        if (list.length === 1) setEnrollment(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingEnr(false));
  }, []);

  const productType = enrollment?.product?.productType || '';
  const typeOptions = CLAIM_TYPES_BY_PRODUCT[productType] || ALL_CLAIM_TYPES;
  const needsThirdParty = THIRD_PARTY_TYPES.includes(claimType);
  const isHealth = ['health', 'travel', 'pet'].includes(productType) || !productType;

  // ── Upload helpers ────────────────────────────────────────────────────────
  const uploadFile = async (file: { uri: string; name: string; mimeType: string }) => {
    const fd = new FormData();
    fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
    const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data; // { url, filename, originalName, mimeType, size }
  };

  const addFiles = async (files: { uri: string; name: string; mimeType: string }[]) => {
    setUploading(true);
    try {
      for (const f of files) {
        const up = await uploadFile(f);
        setDocs(prev => [...prev, {
          uri: f.uri, url: up.url, name: up.originalName || f.name,
          mimeType: f.mimeType, docType: guessDocType(f.name, claimType),
        }]);
      }
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message || 'Could not upload file. Max size is 5 MB.');
    } finally { setUploading(false); }
  };

  const pickImage = async (camera: boolean) => {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow access to continue.'); return; }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 });
    if (res.canceled) return;
    await addFiles(res.assets.map((a, i) => ({
      uri: a.uri,
      name: a.fileName || `photo-${Date.now()}-${i}.jpg`,
      mimeType: a.mimeType || 'image/jpeg',
    })));
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      multiple: true, copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    await addFiles(res.assets.map(a => ({
      uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream',
    })));
  };

  // ── Validation per step ───────────────────────────────────────────────────
  const stepValid = () => {
    if (step === 0) return !!enrollment && !!claimType;
    if (step === 1) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.incidentDate)) return false;
      if (!form.claimedAmount || isNaN(Number(form.claimedAmount)) || Number(form.claimedAmount) <= 0) return false;
      if (!form.description.trim()) return false;
      return true;
    }
    return true;
  };

  const next = () => {
    if (!stepValid()) {
      Alert.alert('Missing information', step === 0
        ? 'Select your policy and the type of claim.'
        : 'Fill the incident date (YYYY-MM-DD), a valid amount, and a description.');
      return;
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const thirdParty = needsThirdParty && form.tpName.trim() ? {
        name: form.tpName.trim(), contact: form.tpContact.trim() || undefined,
        vehicle: form.tpVehicle.trim() || undefined, insurerName: form.tpInsurer.trim() || undefined,
      } : undefined;

      await api.post('/claims', {
        enrollmentId:   enrollment._id,
        claimType,
        incidentDate:     form.incidentDate,
        incidentLocation: form.incidentLocation.trim() || undefined,
        policeReportRef:  form.policeReportRef.trim()  || undefined,
        thirdParty,
        description: form.description.trim(),
        diagnosis:   form.diagnosis.trim() || undefined,
        claimedAmount: Number(form.claimedAmount),
        submissionType: 'insured_reimbursement',
        documents: docs.map(d => ({ name: d.name, type: d.docType, url: d.url })),
      });
      Alert.alert('Claim Submitted ✓', 'Your claim has been filed. You can track its progress in My Claims.', [
        { text: 'View My Claims', onPress: () => router.replace('/(tabs)/claims') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit claim');
    } finally { setSubmitting(false); }
  };

  const barWidth = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      {/* Gradient header */}
      <LinearGradient colors={[C.navyDark, C.navy]} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => step > 0 ? setStep(st => st - 1) : router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>File a Claim</Text>
            <Text style={s.headerSub}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
        <View style={s.progTrack}>
          <Animated.View style={[s.progFill, { width: barWidth }]} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled">

        {/* ── STEP 0 — Policy & type ─────────────────────────────────────── */}
        {step === 0 && (
          <FadeIn key="s0">
            <Text style={s.label}>WHICH POLICY IS THIS CLAIM FOR?</Text>
            {loadingEnr ? (
              <ActivityIndicator color={C.navy} style={{ marginVertical: 24 }} />
            ) : enrollments.length === 0 ? (
              <View style={s.warnBox}>
                <Ionicons name="alert-circle" size={18} color="#b45309" />
                <Text style={s.warnText}>You need an active policy before filing a claim. Browse plans in the Coverage tab.</Text>
              </View>
            ) : enrollments.map(e => {
              const sel = enrollment?._id === e._id;
              return (
                <Press key={e._id} onPress={() => { setEnrollment(e); setClaimType(''); }}
                  style={[s.policyOpt, sel && s.policyOptSel]}>
                  <View style={[s.policyIcon, sel && { backgroundColor: C.navy }]}>
                    <Ionicons name="shield-checkmark" size={20} color={sel ? '#fff' : C.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.policyName}>{e.product?.name || 'Policy'}</Text>
                    <Text style={s.policyMeta}>{e.enrollmentNumber}{e.tier?.name ? ` · ${e.tier.name}` : ''}</Text>
                  </View>
                  <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? C.green : '#cbd5e1'} />
                </Press>
              );
            })}

            {enrollment && (
              <FadeIn key={enrollment._id} delay={80}>
                <Text style={[s.label, { marginTop: 24 }]}>TYPE OF CLAIM</Text>
                <View style={s.typeGrid}>
                  {typeOptions.map(t => {
                    const sel = claimType === t;
                    return (
                      <Press key={t} onPress={() => setClaimType(t)}
                        style={[s.typeCard, sel && s.typeCardSel]}>
                        <Ionicons name={CLAIM_TYPE_ICONS[t] as any} size={22} color={sel ? '#fff' : C.navy} />
                        <Text style={[s.typeCardText, sel && { color: '#fff' }]}>{CLAIM_TYPE_LABELS[t]}</Text>
                      </Press>
                    );
                  })}
                </View>
              </FadeIn>
            )}
          </FadeIn>
        )}

        {/* ── STEP 1 — Incident details ──────────────────────────────────── */}
        {step === 1 && (
          <FadeIn key="s1">
            <Text style={s.label}>DATE OF INCIDENT *</Text>
            <View style={s.quickDates}>
              {[0, 1, 2].map(d => {
                const dt = new Date(Date.now() - d * 86_400_000).toISOString().split('T')[0];
                const lbl = d === 0 ? 'Today' : d === 1 ? 'Yesterday' : '2 days ago';
                const sel = form.incidentDate === dt;
                return (
                  <TouchableOpacity key={d} style={[s.chip, sel && s.chipSel]} onPress={() => set('incidentDate', dt)}>
                    <Text style={[s.chipText, sel && s.chipTextSel]}>{lbl}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput style={s.input} value={form.incidentDate} placeholder="YYYY-MM-DD"
              placeholderTextColor={C.grayLight} onChangeText={v => set('incidentDate', v)} />

            <Text style={s.label}>AMOUNT CLAIMED (ETB) *</Text>
            <TextInput style={[s.input, { fontSize: 20, fontWeight: '800' }]} value={form.claimedAmount}
              placeholder="0" placeholderTextColor={C.grayLight} keyboardType="numeric"
              onChangeText={v => set('claimedAmount', v.replace(/[^0-9.]/g, ''))} />

            <Text style={s.label}>DESCRIPTION OF INCIDENT *</Text>
            <TextInput style={[s.input, s.textarea]} value={form.description} multiline textAlignVertical="top"
              placeholder="Describe what happened and the treatment or service received…"
              placeholderTextColor={C.grayLight} onChangeText={v => set('description', v)} />

            <Text style={s.label}>INCIDENT LOCATION</Text>
            <TextInput style={s.input} value={form.incidentLocation}
              placeholder="e.g. Bole Road, Addis Ababa" placeholderTextColor={C.grayLight}
              onChangeText={v => set('incidentLocation', v)} />

            <Text style={s.label}>POLICE / AUTHORITY REPORT REF</Text>
            <TextInput style={s.input} value={form.policeReportRef}
              placeholder="e.g. POL-2026-00123 (if applicable)" placeholderTextColor={C.grayLight}
              onChangeText={v => set('policeReportRef', v)} />

            {isHealth && (
              <>
                <Text style={s.label}>DIAGNOSIS (IF APPLICABLE)</Text>
                <TextInput style={s.input} value={form.diagnosis}
                  placeholder="e.g. Acute appendicitis" placeholderTextColor={C.grayLight}
                  onChangeText={v => set('diagnosis', v)} />
              </>
            )}

            {needsThirdParty && (
              <View style={s.tpBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="people" size={16} color={C.blueDeep} />
                  <Text style={s.tpTitle}>Third Party Details (optional)</Text>
                </View>
                <TextInput style={s.inputSm} value={form.tpName} placeholder="Third party full name"
                  placeholderTextColor={C.grayLight} onChangeText={v => set('tpName', v)} />
                <TextInput style={s.inputSm} value={form.tpContact} placeholder="Their phone or email"
                  placeholderTextColor={C.grayLight} onChangeText={v => set('tpContact', v)} />
                <TextInput style={s.inputSm} value={form.tpVehicle} placeholder="Licence plate / vehicle description"
                  placeholderTextColor={C.grayLight} onChangeText={v => set('tpVehicle', v)} />
                <TextInput style={[s.inputSm, { marginBottom: 0 }]} value={form.tpInsurer} placeholder="Their insurance company (if known)"
                  placeholderTextColor={C.grayLight} onChangeText={v => set('tpInsurer', v)} />
              </View>
            )}
          </FadeIn>
        )}

        {/* ── STEP 2 — Documents ─────────────────────────────────────────── */}
        {step === 2 && (
          <FadeIn key="s2">
            <Text style={s.label}>SUPPORTING DOCUMENTS</Text>
            <Text style={s.hint}>
              Attach receipts, reports, or photos of the damage. Clear documents speed up your claim.
            </Text>

            <View style={s.pickRow}>
              <Press onPress={() => pickImage(true)} style={s.pickBtn}>
                <Ionicons name="camera" size={24} color={C.navy} />
                <Text style={s.pickText}>Camera</Text>
              </Press>
              <Press onPress={() => pickImage(false)} style={s.pickBtn}>
                <Ionicons name="images" size={24} color={C.navy} />
                <Text style={s.pickText}>Gallery</Text>
              </Press>
              <Press onPress={pickDocument} style={s.pickBtn}>
                <Ionicons name="document-attach" size={24} color={C.navy} />
                <Text style={s.pickText}>Files</Text>
              </Press>
            </View>

            {uploading && (
              <View style={s.uploadingRow}>
                <ActivityIndicator size="small" color={C.navy} />
                <Text style={{ color: C.gray, fontSize: 13 }}>Uploading…</Text>
              </View>
            )}

            {docs.map((d, i) => (
              <FadeIn key={d.url} delay={i * 60} from={10}>
                <View style={s.docRow}>
                  <Ionicons
                    name={d.mimeType.includes('pdf') ? 'document-text' : d.mimeType.includes('image') ? 'image' : 'document'}
                    size={20} color={d.mimeType.includes('pdf') ? C.red : C.blue} />
                  <Text style={s.docName} numberOfLines={1}>{d.name}</Text>
                  <TouchableOpacity onPress={() => setDocs(prev => prev.filter(x => x.url !== d.url))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={C.grayLight} />
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.docTypeRow}>
                  {DOC_TYPES.map(t => {
                    const sel = d.docType === t.value;
                    return (
                      <TouchableOpacity key={t.value} style={[s.chip, sel && s.chipSel]}
                        onPress={() => setDocs(prev => prev.map(x => x.url === d.url ? { ...x, docType: t.value } : x))}>
                        <Text style={[s.chipText, sel && s.chipTextSel]}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </FadeIn>
            ))}

            {docs.length === 0 && !uploading && (
              <View style={s.noDocs}>
                <Ionicons name="cloud-upload-outline" size={36} color="#cbd5e1" />
                <Text style={{ color: C.grayLight, fontSize: 13, textAlign: 'center' }}>
                  No documents yet — you can also skip and add them later if requested.
                </Text>
              </View>
            )}
          </FadeIn>
        )}

        {/* ── STEP 3 — Review ────────────────────────────────────────────── */}
        {step === 3 && (
          <FadeIn key="s3">
            <View style={s.reviewCard}>
              <View style={s.reviewAmtBox}>
                <Text style={s.reviewAmtLabel}>You are claiming</Text>
                <Text style={s.reviewAmt}>{fmtMoney(Number(form.claimedAmount))}</Text>
              </View>
              <ReviewRow icon="shield-checkmark" label="Policy" value={`${enrollment?.product?.name || ''} (${enrollment?.enrollmentNumber || ''})`} />
              <ReviewRow icon={CLAIM_TYPE_ICONS[claimType] || 'document'} label="Claim type" value={CLAIM_TYPE_LABELS[claimType]} />
              <ReviewRow icon="calendar" label="Incident date" value={form.incidentDate} />
              {!!form.incidentLocation && <ReviewRow icon="location" label="Location" value={form.incidentLocation} />}
              {!!form.policeReportRef && <ReviewRow icon="shield" label="Police report" value={form.policeReportRef} />}
              {!!form.diagnosis && <ReviewRow icon="medkit" label="Diagnosis" value={form.diagnosis} />}
              {needsThirdParty && !!form.tpName && <ReviewRow icon="people" label="Third party" value={form.tpName} />}
              <ReviewRow icon="attach" label="Documents" value={docs.length ? `${docs.length} attached` : 'None'} />
              <View style={{ marginTop: 10 }}>
                <Text style={s.reviewDescLabel}>Description</Text>
                <Text style={s.reviewDesc}>{form.description}</Text>
              </View>
            </View>
            <View style={s.noteBox}>
              <Ionicons name="information-circle" size={16} color="#0369a1" />
              <Text style={s.noteText}>
                By submitting you confirm the information is accurate. False claims may lead to policy cancellation.
              </Text>
            </View>
          </FadeIn>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
        {step < STEPS.length - 1 ? (
          <Button label={step === 2 && docs.length === 0 ? 'Skip for now' : 'Continue'}
            icon="arrow-forward" onPress={next} disabled={uploading} />
        ) : (
          <Button label="Submit Claim" icon="paper-plane" color={C.greenDark}
            onPress={submit} loading={submitting} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function guessDocType(filename: string, claimType: string): string {
  const f = filename.toLowerCase();
  if (f.includes('police')) return 'police_report';
  if (f.includes('receipt') || f.includes('invoice')) return 'receipt';
  if (f.includes('medical') || f.includes('report')) return 'medical_report';
  if (/\.(jpe?g|png|heic|webp)$/.test(f)) return 'photo';
  if (THIRD_PARTY_TYPES.includes(claimType)) return 'photo';
  return 'other';
}

function ReviewRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={s.revRow}>
      <Ionicons name={icon as any} size={15} color={C.grayLight} />
      <Text style={s.revLabel}>{label}</Text>
      <Text style={s.revValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  progTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progFill: { height: 5, backgroundColor: C.green, borderRadius: 3 },

  content: { padding: 20 },
  label: { fontSize: 11, fontWeight: '800', color: C.gray, letterSpacing: 1, marginBottom: 10, marginTop: 18 },
  hint: { fontSize: 13, color: C.grayLight, lineHeight: 19, marginBottom: 14, marginTop: -4 },

  warnBox: { flexDirection: 'row', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: R.md, padding: 14 },
  warnText: { flex: 1, color: '#92400e', fontSize: 13, lineHeight: 19 },

  policyOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: R.md, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: C.line, ...SHADOW.card,
  },
  policyOptSel: { borderColor: C.navy },
  policyIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  policyName: { fontSize: 15, fontWeight: '700', color: C.ink },
  policyMeta: { fontSize: 12, color: C.gray, marginTop: 2 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '30.5%', aspectRatio: 1.06, backgroundColor: '#fff', borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.line,
  },
  typeCardSel: { backgroundColor: C.navy, borderColor: C.navy },
  typeCardText: { fontSize: 11.5, fontWeight: '700', color: C.slate, textAlign: 'center', paddingHorizontal: 4 },

  quickDates: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  chipSel: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { fontSize: 12, color: C.slate, fontWeight: '600' },
  chipTextSel: { color: '#fff' },

  input: {
    backgroundColor: '#fff', borderRadius: R.md, padding: 14, fontSize: 15,
    color: C.ink, borderWidth: 1.5, borderColor: C.line,
  },
  inputSm: {
    backgroundColor: '#fff', borderRadius: R.sm, padding: 12, fontSize: 14,
    color: C.ink, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 10,
  },
  textarea: { height: 110, paddingTop: 13 },

  tpBox: { backgroundColor: '#f0f6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: R.md, padding: 14, marginTop: 20 },
  tpTitle: { fontSize: 13, fontWeight: '800', color: C.blueDeep },

  pickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pickBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: R.md, paddingVertical: 18,
    alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed',
  },
  pickText: { fontSize: 12, fontWeight: '700', color: C.slate },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },

  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: R.sm, padding: 13,
    borderWidth: 1, borderColor: C.line, marginBottom: 6,
  },
  docName: { flex: 1, fontSize: 13, fontWeight: '600', color: C.slate },
  docTypeRow: { gap: 6, paddingBottom: 14 },

  noDocs: { alignItems: 'center', gap: 10, paddingVertical: 30 },

  reviewCard: { backgroundColor: '#fff', borderRadius: R.lg, padding: 18, ...SHADOW.card, marginTop: 8 },
  reviewAmtBox: { alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.lineSoft, marginBottom: 14 },
  reviewAmtLabel: { fontSize: 12, color: C.gray },
  reviewAmt: { fontSize: 32, fontWeight: '900', color: C.navy, letterSpacing: -1, marginTop: 4 },
  revRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  revLabel: { fontSize: 13, color: C.gray, width: 100 },
  revValue: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink, textAlign: 'right' },
  reviewDescLabel: { fontSize: 11, fontWeight: '800', color: C.grayLight, letterSpacing: 0.5, marginBottom: 6 },
  reviewDesc: { fontSize: 13.5, color: C.slate, lineHeight: 20 },

  noteBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: R.md, padding: 13, marginTop: 14 },
  noteText: { flex: 1, fontSize: 12, color: '#0c4a6e', lineHeight: 18 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: C.line,
  },
});
