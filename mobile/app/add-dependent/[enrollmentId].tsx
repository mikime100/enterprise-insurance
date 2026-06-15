import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';
import { C, R, F, SHADOW } from '../../lib/theme';
import { REL_META, REQUIRED_DOCS, QUALIFYING_EVENTS, CHRONIC_CONDITIONS, calcAge } from '../../lib/dependents';
import { FadeIn, Press, Button } from '../../components/ui';

const STEP_TITLES = ['Relationship', 'Personal Details', 'Qualifying Event', 'Documents', 'Review'];
const GENDERS = [{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }];

export default function AddDependentScreen() {
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [enrollment, setEnrollment] = useState<any>(null);
  const [loadingEnr, setLoadingEnr] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    relationship: '', firstName: '', lastName: '', dateOfBirth: '', gender: '', nationalId: '',
    qualifyingEvent: '', qualifyingEventNote: '',
    hasHealth: false, chronicConditions: [] as string[], currentMedications: '', smoker: '',
  });
  const [docs, setDocs] = useState<{ url: string; name: string; type: string }[]>([]);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const prog = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.timing(prog, { toValue: (step + 1) / 5, duration: 320, useNativeDriver: false }).start();
  }, [step]);

  useEffect(() => {
    api.get(`/enrollments/${enrollmentId}`)
      .then(r => setEnrollment(r.data.enrollment || r.data))
      .catch(() => {})
      .finally(() => setLoadingEnr(false));
  }, [enrollmentId]);

  const relMeta = REL_META[form.relationship];
  const reqDocs = REQUIRED_DOCS[form.relationship] || [];
  const isHealth = enrollment?.product?.productType === 'health';

  const uploadFiles = async (files: { uri: string; name: string; mimeType: string }[]) => {
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append('file', { uri: f.uri, name: f.name, type: f.mimeType } as any);
        const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setDocs(prev => [...prev, { url: up.data.url, name: up.data.originalName || f.name, type: 'id_document' }]);
      }
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message || 'Could not upload file.');
    } finally { setUploading(false); }
  };
  const pickDoc = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    await uploadFiles(res.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream' })));
  };
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 });
    if (res.canceled) return;
    await uploadFiles(res.assets.map((a, i) => ({ uri: a.uri, name: a.fileName || `doc-${Date.now()}-${i}.jpg`, mimeType: a.mimeType || 'image/jpeg' })));
  };

  const stepValid = () => {
    if (step === 0) return !!form.relationship;
    if (step === 1) return !!form.firstName.trim() && !!form.lastName.trim() && /^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth);
    if (step === 2) return !!form.qualifyingEvent;
    return true;
  };
  const next = () => {
    if (!stepValid()) {
      Alert.alert('Missing information',
        step === 0 ? 'Select the relationship.'
        : step === 1 ? 'Enter first name, last name, and date of birth (YYYY-MM-DD).'
        : 'Select a qualifying event.');
      return;
    }
    if (step < 4) setStep(s => s + 1);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/endorsements', {
        enrollmentId,
        type: 'add_dependent',
        details: {
          dependent: {
            firstName: form.firstName, lastName: form.lastName, dateOfBirth: form.dateOfBirth,
            gender: form.gender, nationalId: form.nationalId, relationship: form.relationship,
          },
          qualifyingEvent: form.qualifyingEvent,
          qualifyingEventNote: form.qualifyingEventNote,
          documents: docs,
          healthDeclaration: form.hasHealth ? {
            chronicConditions: form.chronicConditions,
            currentMedications: form.currentMedications,
            smoker: form.smoker,
          } : null,
          calculatedAge: calcAge(form.dateOfBirth),
        },
      });
      Alert.alert('Request Submitted ✓', 'Your insurer will review the dependent addition within 1–3 business days.',
        [{ text: 'Done', onPress: () => router.replace('/dependents' as any) }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const barWidth = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => step > 0 ? setStep(st => st - 1) : router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{STEP_TITLES[step]}</Text>
          <Text style={s.headerStep}>Step {step + 1} of 5</Text>
        </View>
        <View style={s.progTrack}><Animated.View style={[s.progFill, { width: barWidth }]} /></View>
      </View>

      {loadingEnr ? (
        <ActivityIndicator color={C.navy} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 130 }]} keyboardShouldPersistTaps="handled">
          {/* STEP 0 — Relationship */}
          {step === 0 && (
            <FadeIn key="d0">
              <Text style={s.label}>WHO ARE YOU ADDING?</Text>
              <View style={s.relGrid}>
                {Object.entries(REL_META).map(([key, m]) => {
                  const sel = form.relationship === key;
                  return (
                    <Press key={key} onPress={() => set('relationship', key)} style={[s.relCard, sel && s.relCardSel]}>
                      <Text style={{ fontSize: 30 }}>{m.icon}</Text>
                      <Text style={[s.relLabel, sel && { color: C.greenDark }]}>{m.label}</Text>
                    </Press>
                  );
                })}
              </View>
              {!!relMeta && (
                <View style={s.eligBox}>
                  <Ionicons name="information-circle" size={16} color={C.blue} />
                  <Text style={s.eligText}>{relMeta.eligibility}</Text>
                </View>
              )}
            </FadeIn>
          )}

          {/* STEP 1 — Personal details */}
          {step === 1 && (
            <FadeIn key="d1">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>FIRST NAME *</Text>
                  <TextInput style={s.input} value={form.firstName} placeholder="First name" placeholderTextColor={C.grayLight} onChangeText={v => set('firstName', v)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>LAST NAME *</Text>
                  <TextInput style={s.input} value={form.lastName} placeholder="Last name" placeholderTextColor={C.grayLight} onChangeText={v => set('lastName', v)} />
                </View>
              </View>
              <Text style={s.label}>DATE OF BIRTH *</Text>
              <TextInput style={s.input} value={form.dateOfBirth} placeholder="YYYY-MM-DD" placeholderTextColor={C.grayLight} onChangeText={v => set('dateOfBirth', v)} />
              <Text style={s.label}>GENDER</Text>
              <View style={s.chipsRow}>
                {GENDERS.map(g => {
                  const sel = form.gender === g.v;
                  return <TouchableOpacity key={g.v} style={[s.chip, sel && s.chipSel]} onPress={() => set('gender', g.v)}><Text style={[s.chipText, sel && s.chipTextSel]}>{g.l}</Text></TouchableOpacity>;
                })}
              </View>
              <Text style={s.label}>NATIONAL ID</Text>
              <TextInput style={s.input} value={form.nationalId} placeholder="National ID (if applicable)" placeholderTextColor={C.grayLight} onChangeText={v => set('nationalId', v)} />
              {!!relMeta?.ageLimit && (
                <Text style={s.warnText}>⚠ Coverage for a {relMeta.label.toLowerCase()} ends at age {relMeta.ageLimit} (or upon loss of student status).</Text>
              )}
            </FadeIn>
          )}

          {/* STEP 2 — Qualifying event */}
          {step === 2 && (
            <FadeIn key="d2">
              <Text style={s.label}>QUALIFYING EVENT *</Text>
              {QUALIFYING_EVENTS.map(ev => {
                const sel = form.qualifyingEvent === ev.value;
                return (
                  <Press key={ev.value} onPress={() => set('qualifyingEvent', ev.value)} style={[s.eventRow, sel && s.eventRowSel]}>
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={20} color={sel ? C.greenDark : '#cbd5e1'} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventLabel}>{ev.label}</Text>
                      <Text style={s.eventDesc}>{ev.desc}</Text>
                    </View>
                  </Press>
                );
              })}
              {form.qualifyingEvent === 'other' && (
                <TextInput style={[s.input, { marginTop: 12, height: 80 }]} multiline textAlignVertical="top"
                  value={form.qualifyingEventNote} placeholder="Describe the reason…" placeholderTextColor={C.grayLight}
                  onChangeText={v => set('qualifyingEventNote', v)} />
              )}
            </FadeIn>
          )}

          {/* STEP 3 — Documents */}
          {step === 3 && (
            <FadeIn key="d3">
              {reqDocs.length > 0 && (
                <View style={s.reqBox}>
                  <Text style={s.reqTitle}>REQUIRED FOR {relMeta?.label?.toUpperCase()}</Text>
                  {reqDocs.map((d, i) => (
                    <View key={i} style={s.reqItem}><Ionicons name="ellipse" size={5} color="#92400e" /><Text style={s.reqItemText}>{d}</Text></View>
                  ))}
                </View>
              )}
              <View style={s.pickRow}>
                <Press onPress={pickPhoto} style={s.pickBtn}><View style={s.pickIcon}><Ionicons name="images" size={20} color={C.navy} /></View><Text style={s.pickText}>Gallery</Text></Press>
                <Press onPress={pickDoc} style={s.pickBtn}><View style={s.pickIcon}><Ionicons name="folder" size={20} color={C.navy} /></View><Text style={s.pickText}>Files</Text></Press>
              </View>
              {uploading && <View style={s.uploadingRow}><ActivityIndicator size="small" color={C.navy} /><Text style={s.uploadingText}>Uploading…</Text></View>}
              {docs.map(d => (
                <View key={d.url} style={s.docRow}>
                  <Ionicons name="document-text" size={18} color={C.blue} />
                  <Text style={s.docName} numberOfLines={1}>{d.name}</Text>
                  <TouchableOpacity onPress={() => setDocs(prev => prev.filter(x => x.url !== d.url))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={C.red} />
                  </TouchableOpacity>
                </View>
              ))}
              {docs.length === 0 && !uploading && <Text style={s.optionalText}>Documents are optional here but speed up approval.</Text>}
            </FadeIn>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <FadeIn key="d4">
              <View style={s.reviewCard}>
                <Rev label="Relationship" value={relMeta?.label} />
                <Rev label="Name" value={`${form.firstName} ${form.lastName}`} />
                <Rev label="Date of Birth" value={form.dateOfBirth} />
                <Rev label="Gender" value={form.gender} cap />
                <Rev label="National ID" value={form.nationalId || '—'} />
                <Rev label="Qualifying Event" value={QUALIFYING_EVENTS.find(e => e.value === form.qualifyingEvent)?.label} />
                <Rev label="Documents" value={docs.length ? `${docs.length} attached` : 'None'} />
              </View>

              {/* Optional health declaration for health policies */}
              {isHealth && (
                <View style={s.healthCard}>
                  <Press onPress={() => set('hasHealth', !form.hasHealth)} style={s.healthToggle}>
                    <Ionicons name={form.hasHealth ? 'checkbox' : 'square-outline'} size={20} color={form.hasHealth ? C.greenDark : C.grayLight} />
                    <Text style={s.healthToggleText}>Add a health declaration (recommended for health plans)</Text>
                  </Press>
                  {form.hasHealth && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={s.label}>CHRONIC CONDITIONS</Text>
                      <View style={[s.chipsRow, { flexWrap: 'wrap' }]}>
                        {CHRONIC_CONDITIONS.map(c => {
                          const sel = form.chronicConditions.includes(c);
                          return (
                            <TouchableOpacity key={c} style={[s.chip, sel && s.chipSel]}
                              onPress={() => set('chronicConditions', sel ? form.chronicConditions.filter(x => x !== c) : [...form.chronicConditions, c])}>
                              <Text style={[s.chipText, sel && s.chipTextSel]}>{c}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={s.label}>CURRENT MEDICATIONS</Text>
                      <TextInput style={s.input} value={form.currentMedications} placeholder="List any (or leave blank)" placeholderTextColor={C.grayLight} onChangeText={v => set('currentMedications', v)} />
                      <Text style={s.label}>SMOKER?</Text>
                      <View style={s.chipsRow}>
                        {[{ v: 'no', l: 'No' }, { v: 'yes', l: 'Yes' }].map(o => {
                          const sel = form.smoker === o.v;
                          return <TouchableOpacity key={o.v} style={[s.chip, sel && s.chipSel]} onPress={() => set('smoker', o.v)}><Text style={[s.chipText, sel && s.chipTextSel]}>{o.l}</Text></TouchableOpacity>;
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={s.noteBox}>
                <Ionicons name="information-circle" size={15} color="#0369a1" />
                <Text style={s.noteText}>Adding a dependent may change your premium. Nothing is charged until you accept the revised amount.</Text>
              </View>
            </FadeIn>
          )}
        </ScrollView>
      )}

      <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
        {step === 0 ? (
          <Button label="Continue" icon="arrow-forward" onPress={next} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Back" variant="outline" color={C.slate} onPress={() => setStep(st => st - 1)} style={{ flex: 1 }} />
            {step < 4
              ? <Button label="Continue" icon="arrow-forward" onPress={next} disabled={uploading} style={{ flex: 2 }} />
              : <Button label="Submit Request" icon="paper-plane" onPress={submit} loading={submitting} style={{ flex: 2 }} />}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Rev({ label, value, cap }: { label: string; value?: string; cap?: boolean }) {
  return (
    <View style={s.revRow}>
      <Text style={s.revLabel}>{label}</Text>
      <Text style={[s.revValue, cap && { textTransform: 'capitalize' }]} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.navyDark, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 21, fontFamily: F.head },
  headerStep: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: F.bodySemi },
  progTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progFill: { height: 6, backgroundColor: C.green, borderRadius: 3 },

  content: { padding: 20 },
  label: { fontSize: 11, fontFamily: F.bodySemi, color: C.gray, letterSpacing: 1.1, marginBottom: 10, marginTop: 16 },

  relGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  relCard: { width: '47.5%', backgroundColor: '#fff', borderRadius: R.md, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 22, borderWidth: 1.5, borderColor: 'transparent', ...SHADOW.card },
  relCardSel: { backgroundColor: '#f0fdf4', borderColor: C.greenDark },
  relLabel: { fontSize: 14, fontFamily: F.bodySemi, color: C.ink },
  eligBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: R.md, padding: 13, marginTop: 16 },
  eligText: { flex: 1, fontSize: 12.5, color: '#0c4a6e', lineHeight: 18, fontFamily: F.body },

  input: { backgroundColor: '#fff', borderRadius: R.md, padding: 14, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: '#e2e8f0', fontFamily: F.body },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, marginBottom: 8 },
  chipSel: { backgroundColor: '#f0fdf4', borderColor: C.greenDark },
  chipText: { fontSize: 13.5, color: C.slate, fontFamily: F.bodySemi },
  chipTextSel: { color: C.greenDark },
  warnText: { fontSize: 12.5, color: '#92400e', backgroundColor: '#fffbeb', borderRadius: R.sm, padding: 11, marginTop: 14, fontFamily: F.body, lineHeight: 18 },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: R.md, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent', ...SHADOW.card },
  eventRowSel: { borderColor: C.greenDark, backgroundColor: '#f6fef9' },
  eventLabel: { fontSize: 14.5, fontFamily: F.bodySemi, color: C.ink },
  eventDesc: { fontSize: 12, color: C.gray, marginTop: 1, fontFamily: F.body },

  reqBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: R.md, padding: 14, marginTop: 4 },
  reqTitle: { fontSize: 11, fontFamily: F.bodyBold, color: '#92400e', letterSpacing: 0.8, marginBottom: 8 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  reqItemText: { fontSize: 13, color: '#78350f', fontFamily: F.body },
  pickRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  pickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: R.md, paddingVertical: 18, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  pickIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dbe6f5', alignItems: 'center', justifyContent: 'center' },
  pickText: { fontSize: 12.5, fontFamily: F.bodySemi, color: C.slate },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  uploadingText: { color: C.gray, fontSize: 13, fontFamily: F.body },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: R.sm, padding: 12, borderWidth: 1, borderColor: C.line, marginTop: 8 },
  docName: { flex: 1, fontSize: 13, fontFamily: F.bodySemi, color: C.slate },
  optionalText: { fontSize: 12.5, color: C.grayLight, fontFamily: F.body, textAlign: 'center', marginTop: 20 },

  reviewCard: { backgroundColor: '#fff', borderRadius: R.lg, paddingHorizontal: 16, paddingVertical: 4, ...SHADOW.card, marginTop: 8 },
  revRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  revLabel: { fontSize: 13, color: C.gray, fontFamily: F.body },
  revValue: { flex: 1, fontSize: 13.5, fontFamily: F.bodySemi, color: C.ink, textAlign: 'right' },

  healthCard: { backgroundColor: '#fff', borderRadius: R.lg, padding: 16, marginTop: 14, ...SHADOW.card },
  healthToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  healthToggleText: { flex: 1, fontSize: 13.5, color: C.slate, fontFamily: F.bodySemi },

  noteBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: R.md, padding: 13, marginTop: 14 },
  noteText: { flex: 1, fontSize: 12, color: '#0c4a6e', lineHeight: 18, fontFamily: F.body },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
});
