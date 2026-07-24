import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { themedAlert } from '../../components/ThemedAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { C, R, F, SHADOW } from '../../lib/theme';
import { FadeIn, Press, Button, DateField } from '../../components/ui';

const STEP_TITLES = ['Your Details', 'Your Profile', 'Documents & Review'];

const GENDERS = [{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }];
const MARITAL = [{ v: 'single', l: 'Single' }, { v: 'married', l: 'Married' }, { v: 'divorced', l: 'Divorced' }, { v: 'widowed', l: 'Widowed' }];
const INCOME = [
  { v: '<5000', l: 'Under 5,000' }, { v: '5000-15000', l: '5,000–15,000' },
  { v: '15000-30000', l: '15,000–30,000' }, { v: '30000-50000', l: '30,000–50,000' },
  { v: '>50000', l: 'Over 50,000' },
];
const CLAIMS = [
  { v: 'none', l: 'None' }, { v: 'low', l: 'Low' },
  { v: 'moderate', l: 'Moderate' }, { v: 'high', l: 'High' },
];

export default function ApplyScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [loadingProd, setLoadingProd] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [docs, setDocs] = useState<{ url: string; name: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    dateOfBirth: '', nationalId: '', gender: '', maritalStatus: '', phone: user?.phone || '',
    occupation: '', incomeRange: '', dependentCount: '0', claimsHistory: 'none',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const prog = useRef(new Animated.Value(0.33)).current;
  useEffect(() => {
    Animated.timing(prog, { toValue: (step + 1) / 3, duration: 320, useNativeDriver: false }).start();
  }, [step]);

  useEffect(() => {
    api.get(`/products/${productId}`)
      .then(r => setProduct(r.data.product || r.data))
      .catch(() => themedAlert('Error', 'Could not load this plan.'))
      .finally(() => setLoadingProd(false));
  }, [productId]);

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
      themedAlert('Upload failed', e?.response?.data?.message || 'Could not upload file.');
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
    if (step === 0) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth)) return false;
      if (!form.nationalId.trim()) return false;
      if (!form.gender) return false;
      if (!form.phone.trim()) return false;
      return true;
    }
    if (step === 1) return !!form.occupation.trim() && !!form.incomeRange;
    return true;
  };

  const next = () => {
    if (!stepValid()) {
      themedAlert('Missing information', step === 0
        ? 'Select your date of birth, and enter your national ID, gender, and phone.'
        : 'Enter your occupation and income range.');
      return;
    }
    if (step < 2) setStep(s => s + 1);
  };

  const submit = async () => {
    const payerId = product?.payer?._id || product?.payer;
    if (!payerId) { themedAlert('Unavailable', 'This plan has no insurer assigned. Please contact support.'); return; }
    setSubmitting(true);
    try {
      const dob = new Date(form.dateOfBirth);
      const age = Math.floor((Date.now() - dob.getTime()) / 31557600000);
      await api.post('/quotes', {
        product: productId,
        payer: payerId,
        insuredPerson: user?.linkedEntity?.entityId,
        memberCount: parseInt(form.dependentCount || '0', 10) + 1,
        riskFactors: { averageAge: age, claimsHistory: form.claimsHistory },
        applicationData: { ...form },
        documents: docs,
      });
      themedAlert('Application Submitted ✓',
        'An underwriter will review your application and prepare a personalised offer within 1–3 business days.',
        [{ text: 'Track in My Applications', onPress: () => router.replace('/applications' as any) }]);
    } catch (e: any) {
      themedAlert('Error', e?.response?.data?.message || 'Failed to submit application');
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
          <Text style={s.headerStep}>Step {step + 1} of 3</Text>
        </View>
        {!!product && <Text style={s.headerProduct}>Applying for {product.name}</Text>}
        <View style={s.progTrack}><Animated.View style={[s.progFill, { width: barWidth }]} /></View>
      </View>

      {loadingProd ? (
        <ActivityIndicator color={C.navy} style={{ flex: 1 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {step === 0 && (
            <FadeIn key="a0">
              <Field label="DATE OF BIRTH *">
                <DateField value={form.dateOfBirth} placeholder="Tap to select your date of birth"
                  onChange={v => set('dateOfBirth', v)} minYear={1920} />
              </Field>
              <Field label="NATIONAL ID *">
                <TextInput style={s.input} value={form.nationalId} placeholder="National ID number"
                  placeholderTextColor={C.grayLight} onChangeText={v => set('nationalId', v)} />
              </Field>
              <Field label="GENDER *">
                <Chips options={GENDERS} value={form.gender} onChange={v => set('gender', v)} />
              </Field>
              <Field label="MARITAL STATUS">
                <Chips options={MARITAL} value={form.maritalStatus} onChange={v => set('maritalStatus', v)} />
              </Field>
              <Field label="PHONE *">
                <TextInput style={s.input} value={form.phone} placeholder="+251 9.." keyboardType="phone-pad"
                  placeholderTextColor={C.grayLight} onChangeText={v => set('phone', v)} />
              </Field>
            </FadeIn>
          )}

          {step === 1 && (
            <FadeIn key="a1">
              <Field label="OCCUPATION *">
                <TextInput style={s.input} value={form.occupation} placeholder="e.g. Software Engineer"
                  placeholderTextColor={C.grayLight} onChangeText={v => set('occupation', v)} />
              </Field>
              <Field label="MONTHLY INCOME (ETB) *">
                <Chips options={INCOME} value={form.incomeRange} onChange={v => set('incomeRange', v)} wrap />
              </Field>
              <Field label="NUMBER OF DEPENDENTS">
                <TextInput style={s.input} value={form.dependentCount} placeholder="0" keyboardType="numeric"
                  placeholderTextColor={C.grayLight} onChangeText={v => set('dependentCount', v.replace(/[^0-9]/g, ''))} />
              </Field>
              <Field label="PAST CLAIMS HISTORY">
                <Chips options={CLAIMS} value={form.claimsHistory} onChange={v => set('claimsHistory', v)} />
                <Text style={s.helpText}>Be honest — this helps us set a fair premium and avoids issues at claim time.</Text>
              </Field>
            </FadeIn>
          )}

          {step === 2 && (
            <FadeIn key="a2">
              <Text style={s.intro}>Attach your ID and any supporting documents (income proof, medical records). Optional, but speeds up underwriting.</Text>
              <View style={s.pickRow}>
                <Press onPress={pickPhoto} style={s.pickBtn}>
                  <View style={s.pickIcon}><Ionicons name="images" size={20} color={C.navy} /></View>
                  <Text style={s.pickText}>Gallery</Text>
                </Press>
                <Press onPress={pickDoc} style={s.pickBtn}>
                  <View style={s.pickIcon}><Ionicons name="folder" size={20} color={C.navy} /></View>
                  <Text style={s.pickText}>Files</Text>
                </Press>
              </View>
              {uploading && <View style={s.uploadingRow}><ActivityIndicator size="small" color={C.navy} /><Text style={s.uploadingText}>Uploading…</Text></View>}
              {docs.map((d) => (
                <View key={d.url} style={s.docRow}>
                  <Ionicons name="document-text" size={18} color={C.blue} />
                  <Text style={s.docName} numberOfLines={1}>{d.name}</Text>
                  <TouchableOpacity onPress={() => setDocs(prev => prev.filter(x => x.url !== d.url))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={C.red} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Review */}
              <Text style={[s.label, { marginTop: 22 }]}>REVIEW</Text>
              <View style={s.reviewCard}>
                <Rev label="Plan" value={product?.name} />
                <Rev label="Date of Birth" value={form.dateOfBirth} />
                <Rev label="National ID" value={form.nationalId} />
                <Rev label="Gender" value={form.gender} cap />
                <Rev label="Occupation" value={form.occupation} />
                <Rev label="Income" value={INCOME.find(i => i.v === form.incomeRange)?.l} />
                <Rev label="Dependents" value={form.dependentCount} />
                <Rev label="Documents" value={docs.length ? `${docs.length} attached` : 'None'} />
              </View>
              <View style={s.noteBox}>
                <Ionicons name="lock-closed" size={15} color="#0369a1" />
                <Text style={s.noteText}>Your information is used only for underwriting and is handled per Ethiopian data-protection law.</Text>
              </View>
            </FadeIn>
          )}
        </ScrollView>
      )}

      <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
        {step === 0 ? (
          <Button label="Continue" icon="arrow-forward" onPress={next} disabled={uploading} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Back" variant="outline" color={C.slate} onPress={() => setStep(st => st - 1)} style={{ flex: 1 }} />
            {step < 2
              ? <Button label="Continue" icon="arrow-forward" onPress={next} disabled={uploading} style={{ flex: 2 }} />
              : <Button label="Submit Application" icon="paper-plane" onPress={submit} loading={submitting} style={{ flex: 2 }} />}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ marginBottom: 4 }}><Text style={s.label}>{label}</Text>{children}</View>;
}

function Chips({ options, value, onChange, wrap }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void; wrap?: boolean }) {
  return (
    <View style={[s.chipsRow, wrap && { flexWrap: 'wrap' }]}>
      {options.map(o => {
        const sel = value === o.v;
        return (
          <TouchableOpacity key={o.v} style={[s.chip, sel && s.chipSel]} onPress={() => onChange(o.v)}>
            <Text style={[s.chipText, sel && s.chipTextSel]}>{o.l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 21, fontFamily: F.head },
  headerStep: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: F.bodySemi },
  headerProduct: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontFamily: F.body, marginTop: 6, marginBottom: 12 },
  progTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progFill: { height: 6, backgroundColor: C.green, borderRadius: 3 },

  content: { padding: 20 },
  label: { fontSize: 11, fontFamily: F.bodySemi, color: C.gray, letterSpacing: 1.1, marginBottom: 10, marginTop: 14 },
  intro: { fontSize: 14.5, color: C.slate, lineHeight: 21, fontFamily: F.body, marginTop: 4, marginBottom: 6 },
  helpText: { fontSize: 12, color: C.grayLight, fontFamily: F.body, marginTop: 8, lineHeight: 17 },

  input: { backgroundColor: '#fff', borderRadius: R.md, padding: 14, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: '#e2e8f0', fontFamily: F.body },

  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, marginBottom: 8 },
  chipSel: { backgroundColor: '#f0fdf4', borderColor: C.greenDark },
  chipText: { fontSize: 13.5, color: C.slate, fontFamily: F.bodySemi },
  chipTextSel: { color: C.greenDark },

  pickRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  pickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: R.md, paddingVertical: 18, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  pickIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dbe6f5', alignItems: 'center', justifyContent: 'center' },
  pickText: { fontSize: 12.5, fontFamily: F.bodySemi, color: C.slate },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  uploadingText: { color: C.gray, fontSize: 13, fontFamily: F.body },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: R.sm, padding: 12, borderWidth: 1, borderColor: C.line, marginTop: 8 },
  docName: { flex: 1, fontSize: 13, fontFamily: F.bodySemi, color: C.slate },

  reviewCard: { backgroundColor: '#fff', borderRadius: R.lg, paddingHorizontal: 16, paddingVertical: 4, ...SHADOW.card },
  revRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  revLabel: { fontSize: 13, color: C.gray, fontFamily: F.body },
  revValue: { flex: 1, fontSize: 13.5, fontFamily: F.bodySemi, color: C.ink, textAlign: 'right' },
  noteBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: R.md, padding: 13, marginTop: 14 },
  noteText: { flex: 1, fontSize: 12, color: '#0c4a6e', lineHeight: 18, fontFamily: F.body },

  footer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
});
