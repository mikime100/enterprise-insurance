import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Image,
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
  C, R, F, SHADOW, CLAIM_TYPE_LABELS, CLAIM_TYPE_ICONS, CLAIM_TYPES_BY_PRODUCT,
  ALL_CLAIM_TYPES, THIRD_PARTY_TYPES, DOC_TYPES, fmtMoney,
} from '../lib/theme';
import { FadeIn, Press, Button } from '../components/ui';

type Doc = { uri?: string; url: string; name: string; mimeType: string; docType: string; size?: number };

const STEP_TITLES = ['File a Claim', 'Incident Details', 'Evidence & Docs', 'Review Claim'];

const fmtSize = (b?: number) =>
  b == null ? '' : b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

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
  const [tpOpen, setTpOpen]           = useState(false);
  const [docs, setDocs]               = useState<Doc[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Animated progress bar
  const prog = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    Animated.timing(prog, { toValue: (step + 1) / 4, duration: 350, useNativeDriver: false }).start();
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
  const photoCount = docs.filter(d => d.mimeType.includes('image')).length;
  const docCount   = docs.length - photoCount;

  // ── Upload helpers ────────────────────────────────────────────────────────
  const uploadFile = async (file: { uri: string; name: string; mimeType: string }) => {
    const fd = new FormData();
    fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
    const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  };

  const addFiles = async (files: { uri: string; name: string; mimeType: string }[]) => {
    setUploading(true);
    try {
      for (const f of files) {
        const up = await uploadFile(f);
        setDocs(prev => [...prev, {
          uri: f.uri, url: up.url, name: up.originalName || f.name,
          mimeType: f.mimeType, size: up.size, docType: guessDocType(f.name, claimType),
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

  // ── Validation / nav ──────────────────────────────────────────────────────
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
    if (step < 3) setStep(s => s + 1);
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

      {/* ── Unified navy header: back · title · step badge · progress ───── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => step > 0 ? setStep(st => st - 1) : router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{STEP_TITLES[step]}</Text>
          <Text style={s.headerStep}>Step {step + 1} of 4</Text>
        </View>
        <View style={s.progTrack}>
          <Animated.View style={[s.progFill, { width: barWidth }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 130 }]}
        keyboardShouldPersistTaps="handled">

        {/* ── STEP 0 — Select policy & claim type ─────────────────────────── */}
        {step === 0 && (
          <FadeIn key="s0">
            <Text style={s.label}>SELECT POLICY</Text>
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
                <Press key={e._id} onPress={() => { setEnrollment(e); setClaimType(''); }}>
                  <LinearGradient
                    colors={sel ? [C.navyDark, C.navy] : ['#fff', '#fff']}
                    start={{ x: 0, y: 0 }} end={{ x: 1.3, y: 1.3 }}
                    style={[s.policyCard, !sel && s.policyCardIdle]}>
                    <View style={s.policyDecor} />
                    <View style={{ flex: 1 }}>
                      <View style={[s.activeChip, !sel && { backgroundColor: '#eef4fb', borderColor: C.line }]}>
                        <Text style={[s.activeChipText, !sel && { color: C.gray }]}>
                          {sel ? '✓ SELECTED' : 'ACTIVE'}
                        </Text>
                      </View>
                      <Text style={[s.policyName, !sel && { color: C.ink }]}>{e.product?.name || 'Policy'}</Text>
                      <Text style={[s.policyNumber, !sel && { color: C.gray }]}>{e.enrollmentNumber}{e.tier?.name ? `  ·  ${e.tier.name}` : ''}</Text>
                    </View>
                    <View style={[s.policyIconRing, !sel && { backgroundColor: '#eef4fb' }]}>
                      <Ionicons name="shield-checkmark" size={22} color={sel ? '#fff' : C.navy} />
                    </View>
                  </LinearGradient>
                </Press>
              );
            })}

            {enrollment && (
              <FadeIn key={enrollment._id} delay={80}>
                <Text style={[s.label, { marginTop: 24 }]}>SELECT CLAIM TYPE</Text>
                <View style={s.typeGrid}>
                  {typeOptions.map(t => {
                    const sel = claimType === t;
                    return (
                      <Press key={t} onPress={() => setClaimType(t)}
                        style={[s.typeCard, sel && s.typeCardSel]}>
                        <Ionicons name={CLAIM_TYPE_ICONS[t] as any} size={26} color={sel ? C.greenDark : C.navy} />
                        <Text style={[s.typeCardText, sel && { color: C.greenDark }]}>{CLAIM_TYPE_LABELS[t]}</Text>
                      </Press>
                    );
                  })}
                </View>
              </FadeIn>
            )}
          </FadeIn>
        )}

        {/* ── STEP 1 — Incident details ────────────────────────────────────── */}
        {step === 1 && (
          <FadeIn key="s1">
            <Text style={s.label}>DATE OF INCIDENT</Text>
            <View style={s.quickDates}>
              {[
                { d: 0, lbl: 'Today' },
                { d: 1, lbl: 'Yesterday' },
              ].map(({ d, lbl }) => {
                const dt = new Date(Date.now() - d * 86_400_000).toISOString().split('T')[0];
                const sel = form.incidentDate === dt;
                return (
                  <TouchableOpacity key={d} style={[s.dateChip, sel && s.dateChipSel]} onPress={() => set('incidentDate', dt)}>
                    <Text style={[s.dateChipText, sel && s.dateChipTextSel]}>{lbl}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={[s.dateChip, { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }]}>
                <Ionicons name="calendar-outline" size={14} color={C.gray} />
                <TextInput
                  style={s.dateInput} value={form.incidentDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={C.grayLight}
                  onChangeText={v => set('incidentDate', v)} />
              </View>
            </View>

            {/* Estimated loss amount card */}
            <View style={s.amountCard}>
              <Text style={s.amountTitle}>Estimated Loss Amount</Text>
              <View style={s.amountRow}>
                <TextInput
                  style={s.amountInput} value={form.claimedAmount}
                  placeholder="0.00" placeholderTextColor="#cbd5e1" keyboardType="numeric"
                  onChangeText={v => set('claimedAmount', v.replace(/[^0-9.]/g, ''))} />
                <Text style={s.amountSuffix}>ETB</Text>
              </View>
              <Text style={s.amountHelp}>Provide your best estimate. This can be adjusted later.</Text>
            </View>

            <Text style={s.label}>INCIDENT DESCRIPTION</Text>
            <TextInput style={[s.input, s.textarea]} value={form.description} multiline textAlignVertical="top"
              placeholder="Briefly describe what happened…"
              placeholderTextColor={C.grayLight} onChangeText={v => set('description', v)} />

            <Text style={s.label}>LOCATION OF INCIDENT</Text>
            <View style={s.inputIconRow}>
              <Ionicons name="location-outline" size={18} color={C.grayLight} />
              <TextInput style={s.inputFlex} value={form.incidentLocation}
                placeholder="e.g. Bole Road, Addis Ababa" placeholderTextColor={C.grayLight}
                onChangeText={v => set('incidentLocation', v)} />
            </View>

            <Text style={s.label}>POLICE REPORT NUMBER (OPTIONAL)</Text>
            <TextInput style={s.input} value={form.policeReportRef}
              placeholder="e.g. PR-2026-8472" placeholderTextColor={C.grayLight}
              onChangeText={v => set('policeReportRef', v)} />

            {isHealth && (
              <>
                <Text style={s.label}>DIAGNOSIS (IF APPLICABLE)</Text>
                <TextInput style={s.input} value={form.diagnosis}
                  placeholder="e.g. Acute appendicitis" placeholderTextColor={C.grayLight}
                  onChangeText={v => set('diagnosis', v)} />
              </>
            )}

            {/* Third party — collapsible navy bar */}
            {needsThirdParty && (
              <>
                <Press onPress={() => setTpOpen(o => !o)} style={s.tpBar}>
                  <View style={s.tpBarIcon}>
                    <Ionicons name="people" size={16} color="#fff" />
                  </View>
                  <Text style={s.tpBarText}>Third Party Details</Text>
                  <Ionicons name={tpOpen ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.7)" />
                </Press>
                {tpOpen && (
                  <FadeIn from={8}>
                    <View style={s.tpBody}>
                      <TextInput style={s.inputSm} value={form.tpName} placeholder="Third party full name"
                        placeholderTextColor={C.grayLight} onChangeText={v => set('tpName', v)} />
                      <TextInput style={s.inputSm} value={form.tpContact} placeholder="Their phone or email"
                        placeholderTextColor={C.grayLight} onChangeText={v => set('tpContact', v)} />
                      <TextInput style={s.inputSm} value={form.tpVehicle} placeholder="Licence plate / vehicle description"
                        placeholderTextColor={C.grayLight} onChangeText={v => set('tpVehicle', v)} />
                      <TextInput style={[s.inputSm, { marginBottom: 0 }]} value={form.tpInsurer} placeholder="Their insurance company (if known)"
                        placeholderTextColor={C.grayLight} onChangeText={v => set('tpInsurer', v)} />
                    </View>
                  </FadeIn>
                )}
              </>
            )}
          </FadeIn>
        )}

        {/* ── STEP 2 — Evidence & docs ─────────────────────────────────────── */}
        {step === 2 && (
          <FadeIn key="s2">
            <Text style={s.intro}>
              Please provide clear photos of the damage and any supporting documents like a police report or receipts.
            </Text>

            <Text style={s.label}>UPLOAD SOURCE</Text>
            <View style={s.pickRow}>
              {[
                { icon: 'camera',  lbl: 'Camera',  fn: () => pickImage(true) },
                { icon: 'image',   lbl: 'Gallery', fn: () => pickImage(false) },
                { icon: 'folder',  lbl: 'Files',   fn: pickDocument },
              ].map(p => (
                <Press key={p.lbl} onPress={p.fn} style={s.pickBtn}>
                  <View style={s.pickIconCircle}>
                    <Ionicons name={p.icon as any} size={20} color={C.navy} />
                  </View>
                  <Text style={s.pickText}>{p.lbl}</Text>
                </Press>
              ))}
            </View>

            <View style={s.filesHead}>
              <Text style={[s.label, { marginTop: 0, marginBottom: 0 }]}>UPLOADED FILES</Text>
              <Text style={s.filesCount}>{docs.length} item{docs.length !== 1 ? 's' : ''}</Text>
            </View>

            {uploading && (
              <View style={s.uploadingRow}>
                <ActivityIndicator size="small" color={C.navy} />
                <Text style={{ color: C.gray, fontSize: 13, fontFamily: F.body }}>Uploading…</Text>
              </View>
            )}

            {docs.map((d, i) => {
              const isImg = d.mimeType.includes('image');
              return (
                <FadeIn key={d.url} delay={i * 60} from={10}>
                  <View style={s.fileCard}>
                    {isImg && d.uri ? (
                      <Image source={{ uri: d.uri }} style={s.fileThumb} />
                    ) : (
                      <View style={[s.fileThumb, s.fileThumbDoc]}>
                        <Ionicons name="document-text" size={22} color={C.blue} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.fileName} numberOfLines={1}>{d.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
                        <View style={s.fileTag}>
                          <Text style={s.fileTagText}>{isImg ? 'PHOTO' : 'DOCUMENT'}</Text>
                        </View>
                        {!!d.size && <Text style={s.fileSize}>{fmtSize(d.size)}</Text>}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setDocs(prev => prev.filter(x => x.url !== d.url))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={19} color={C.red} />
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
              );
            })}

            {docs.length === 0 && !uploading && (
              <View style={s.noDocs}>
                <Ionicons name="cloud-upload-outline" size={36} color="#cbd5e1" />
                <Text style={{ color: C.grayLight, fontSize: 13, textAlign: 'center', fontFamily: F.body }}>
                  No documents yet — you can also skip and add them later if requested.
                </Text>
              </View>
            )}
          </FadeIn>
        )}

        {/* ── STEP 3 — Review ──────────────────────────────────────────────── */}
        {step === 3 && (
          <FadeIn key="s3">
            {/* Navy value hero */}
            <LinearGradient colors={[C.navyDark, C.navy]} start={{ x: 0, y: 0 }} end={{ x: 1.3, y: 1.3 }} style={s.reviewHero}>
              <Text style={s.reviewHeroLabel}>ESTIMATED CLAIM VALUE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={s.reviewHeroAmt}>{Number(form.claimedAmount).toLocaleString()}</Text>
                <Text style={s.reviewHeroCur}>ETB</Text>
              </View>
              <View style={s.reviewHeroDivider} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={s.reviewHeroPolicyLabel}>Policy</Text>
                  <Text style={s.reviewHeroPolicy}>{enrollment?.product?.name}</Text>
                </View>
                <View style={s.verifiedChip}>
                  <Ionicons name="checkmark-circle" size={12} color="#86efac" />
                  <Text style={s.verifiedChipText}>ACTIVE</Text>
                </View>
              </View>
            </LinearGradient>

            <Text style={s.label}>INCIDENT DETAILS</Text>
            <View style={s.reviewCard}>
              <ReviewRow icon={CLAIM_TYPE_ICONS[claimType] || 'document'} label="Claim Type"
                value={CLAIM_TYPE_LABELS[claimType]} onEdit={() => setStep(0)} />
              <ReviewRow icon="calendar" label="Date of Incident" value={form.incidentDate} onEdit={() => setStep(1)} />
              <ReviewRow icon="location" label="Location" value={form.incidentLocation || '—'} onEdit={() => setStep(1)} />
              {!!form.policeReportRef && <ReviewRow icon="shield" label="Police Report" value={form.policeReportRef} onEdit={() => setStep(1)} />}
              {!!form.diagnosis && <ReviewRow icon="medkit" label="Diagnosis" value={form.diagnosis} onEdit={() => setStep(1)} />}
              {needsThirdParty && !!form.tpName && <ReviewRow icon="people" label="Third Party" value={form.tpName} onEdit={() => setStep(1)} />}
            </View>

            <Press onPress={() => setStep(2)} style={s.docsRow}>
              <View style={s.docsRowIcon}>
                <Ionicons name="images" size={20} color={C.navy} />
                {docs.length > 0 && (
                  <View style={s.docsBadge}><Text style={s.docsBadgeText}>{docs.length}</Text></View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.docsRowTitle}>Supporting Documents</Text>
                <Text style={s.docsRowSub}>
                  {docs.length === 0 ? 'None attached'
                    : [photoCount && `Photos (${photoCount})`, docCount && `Documents (${docCount})`].filter(Boolean).join(', ')}
                </Text>
              </View>
              <Text style={s.docsView}>VIEW</Text>
            </Press>

            <Text style={s.disclaimer}>
              By submitting this claim, you confirm that all provided information is accurate to the best of your knowledge.
            </Text>
          </FadeIn>
        )}
      </ScrollView>

      {/* ── Unified footer: Back (outline) + green primary ─────────────────── */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
        {step === 0 ? (
          <Button label="Next Step" icon="arrow-forward" onPress={next} disabled={uploading} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Back" variant="outline" color={C.slate}
              onPress={() => setStep(st => st - 1)} style={{ flex: 1 }} />
            {step < 3 ? (
              <Button label={step === 2 && docs.length === 0 ? 'Skip for now' : 'Next Step'}
                icon="arrow-forward" onPress={next} disabled={uploading} style={{ flex: 2 }} />
            ) : (
              <Button label="Submit Claim" icon="paper-plane" onPress={submit} loading={submitting} style={{ flex: 2 }} />
            )}
          </View>
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

function ReviewRow({ icon, label, value, onEdit }: { icon: string; label: string; value?: string; onEdit?: () => void }) {
  return (
    <View style={s.revRow}>
      <View style={s.revIcon}>
        <Ionicons name={icon as any} size={17} color={C.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.revLabel}>{label}</Text>
        <Text style={s.revValue} numberOfLines={1}>{value || '—'}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil" size={16} color={C.blue} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: { backgroundColor: C.navyDark, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 22, fontFamily: F.head, letterSpacing: -0.2 },
  headerStep: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: F.bodySemi, letterSpacing: 0.5 },
  progTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progFill: { height: 6, backgroundColor: C.green, borderRadius: 3 },

  content: { padding: 20 },
  label: { fontSize: 11, fontFamily: F.bodySemi, color: C.gray, letterSpacing: 1.2, marginBottom: 10, marginTop: 18 },
  intro: { fontSize: 15, color: C.slate, lineHeight: 22, fontFamily: F.body, marginTop: 6 },

  warnBox: { flexDirection: 'row', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: R.md, padding: 14 },
  warnText: { flex: 1, color: '#92400e', fontSize: 13, lineHeight: 19, fontFamily: F.body },

  // Step 0 — policy gradient card (per Stitch step-1 design)
  policyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: R.lg, padding: 18, marginBottom: 10, overflow: 'hidden', ...SHADOW.card,
  },
  policyCardIdle: { borderWidth: 1.5, borderColor: C.line },
  policyDecor: {
    position: 'absolute', left: -30, top: -40, width: 130, height: 130,
    borderRadius: 65, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  activeChip: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  activeChipText: { color: '#fff', fontSize: 10, fontFamily: F.bodyBold, letterSpacing: 1 },
  policyName: { color: '#fff', fontSize: 20, fontFamily: F.head, letterSpacing: -0.2 },
  policyNumber: { color: '#8aa4cf', fontSize: 13, fontFamily: F.bodySemi, marginTop: 4, letterSpacing: 1 },
  policyIconRing: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Claim type grid — 2-col, green selected state (per Stitch)
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: {
    width: '47.5%', backgroundColor: '#fff', borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 26,
    borderWidth: 1.5, borderColor: 'transparent', ...SHADOW.card,
  },
  typeCardSel: { backgroundColor: '#f0fdf4', borderColor: C.greenDark },
  typeCardText: { fontSize: 14, fontFamily: F.bodySemi, color: C.ink, textAlign: 'center', paddingHorizontal: 6 },

  // Step 1
  quickDates: { flexDirection: 'row', gap: 8 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#e9edf2' },
  dateChipSel: { backgroundColor: C.navyDark },
  dateChipText: { fontSize: 13, color: C.slate, fontFamily: F.bodySemi },
  dateChipTextSel: { color: '#fff' },
  dateInput: { flex: 1, fontSize: 13, color: C.ink, fontFamily: F.bodySemi, padding: 0 },

  amountCard: { backgroundColor: '#fff', borderRadius: R.lg, padding: 18, marginTop: 22, ...SHADOW.card },
  amountTitle: { fontSize: 16, fontFamily: F.headSemi, color: C.ink, marginBottom: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', borderBottomWidth: 1.5, borderBottomColor: C.line, paddingBottom: 8 },
  amountInput: { flex: 1, fontSize: 28, fontFamily: F.bodyBold, color: C.ink, padding: 0 },
  amountSuffix: { fontSize: 16, fontFamily: F.bodyBold, color: C.ink },
  amountHelp: { fontSize: 11.5, color: C.grayLight, fontFamily: F.body, marginTop: 8, letterSpacing: 0.2 },

  input: {
    backgroundColor: '#fff', borderRadius: R.md, padding: 14, fontSize: 15,
    color: C.ink, borderWidth: 1, borderColor: '#e2e8f0', fontFamily: F.body,
  },
  inputIconRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: R.md, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  inputFlex: { flex: 1, paddingVertical: 14, fontSize: 15, color: C.ink, fontFamily: F.body },
  inputSm: {
    backgroundColor: '#fff', borderRadius: R.sm, padding: 12, fontSize: 14,
    color: C.ink, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10, fontFamily: F.body,
  },
  textarea: { height: 110, paddingTop: 13 },

  tpBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.navy, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 14, marginTop: 22,
  },
  tpBarIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tpBarText: { flex: 1, color: '#fff', fontSize: 15, fontFamily: F.bodySemi },
  tpBody: { backgroundColor: '#f0f6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: R.md, padding: 14, marginTop: 10 },

  // Step 2
  pickRow: { flexDirection: 'row', gap: 10 },
  pickBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: R.md, paddingVertical: 18,
    alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed',
  },
  pickIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dbe6f5', alignItems: 'center', justifyContent: 'center' },
  pickText: { fontSize: 12.5, fontFamily: F.bodySemi, color: C.slate },

  filesHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 },
  filesCount: { fontSize: 12, color: C.grayLight, fontFamily: F.bodySemi },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },

  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: R.md, padding: 12, ...SHADOW.card, marginBottom: 6,
  },
  fileThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#eef4fb' },
  fileThumbDoc: { alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 14, fontFamily: F.bodySemi, color: C.ink },
  fileTag: { backgroundColor: '#e9edf2', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2.5 },
  fileTagText: { fontSize: 9.5, fontFamily: F.bodyBold, color: C.slate, letterSpacing: 0.8 },
  fileSize: { fontSize: 11.5, color: C.grayLight, fontFamily: F.body },

  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  chipSel: { backgroundColor: '#f0fdf4', borderColor: C.greenDark },
  chipText: { fontSize: 12, color: C.slate, fontFamily: F.bodySemi },
  chipTextSel: { color: C.greenDark },
  docTypeRow: { gap: 6, paddingBottom: 14 },

  noDocs: { alignItems: 'center', gap: 10, paddingVertical: 30 },

  // Step 3 — review
  reviewHero: { borderRadius: R.lg, padding: 20, marginTop: 8, overflow: 'hidden', ...SHADOW.float },
  reviewHeroLabel: { color: '#8aa4cf', fontSize: 11, fontFamily: F.bodySemi, letterSpacing: 1.4, marginBottom: 8 },
  reviewHeroAmt: { color: '#fff', fontSize: 36, fontFamily: F.bodyBold, letterSpacing: -1 },
  reviewHeroCur: { color: C.green, fontSize: 18, fontFamily: F.bodyBold },
  reviewHeroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 14 },
  reviewHeroPolicyLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: F.body, marginBottom: 2 },
  reviewHeroPolicy: { color: '#fff', fontSize: 15, fontFamily: F.bodySemi },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  verifiedChipText: { color: '#86efac', fontSize: 10, fontFamily: F.bodyBold, letterSpacing: 0.8 },

  reviewCard: { backgroundColor: '#fff', borderRadius: R.lg, paddingHorizontal: 16, paddingVertical: 4, ...SHADOW.card },
  revRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  revIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  revLabel: { fontSize: 11, color: C.grayLight, fontFamily: F.bodySemi, letterSpacing: 0.4, marginBottom: 2 },
  revValue: { fontSize: 14.5, fontFamily: F.bodySemi, color: C.ink, textTransform: 'capitalize' },

  docsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: R.lg, padding: 16, marginTop: 14, ...SHADOW.card,
  },
  docsRowIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  docsBadge: {
    position: 'absolute', top: -5, right: -5, backgroundColor: C.greenDark,
    minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  docsBadgeText: { color: '#fff', fontSize: 10, fontFamily: F.bodyBold },
  docsRowTitle: { fontSize: 14.5, fontFamily: F.bodySemi, color: C.ink },
  docsRowSub: { fontSize: 12, color: C.grayLight, fontFamily: F.body, marginTop: 1 },
  docsView: { fontSize: 12, fontFamily: F.bodyBold, color: C.navy, letterSpacing: 0.8 },

  disclaimer: { fontSize: 12, color: C.grayLight, textAlign: 'center', lineHeight: 18, fontFamily: F.body, marginTop: 18, paddingHorizontal: 20 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: C.line,
  },
});
