import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../lib/api';

const CLAIM_TYPES = [
  { value: 'outpatient', label: 'Outpatient' },
  { value: 'inpatient', label: 'Inpatient' },
  { value: 'dental', label: 'Dental' },
  { value: 'optical', label: 'Optical' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other' },
];

export default function NewClaimScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    claimType: '',
    claimedAmount: '',
    description: '',
    dateOfService: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const submit = async () => {
    if (!form.claimType) { Alert.alert('Error', 'Please select a claim type'); return; }
    if (!form.claimedAmount || isNaN(Number(form.claimedAmount))) {
      Alert.alert('Error', 'Please enter a valid amount'); return;
    }
    if (!form.description.trim()) { Alert.alert('Error', 'Please describe your claim'); return; }

    setLoading(true);
    try {
      await api.post('/claims', {
        claimType: form.claimType,
        claimedAmount: Number(form.claimedAmount),
        description: form.description.trim(),
        dateOfService: form.dateOfService,
      });
      Alert.alert('Success', 'Your claim has been submitted successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/claims') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>New Claim</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>CLAIM TYPE *</Text>
        <View style={styles.typeGrid}>
          {CLAIM_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeChip, form.claimType === t.value && styles.typeChipActive]}
              onPress={() => set('claimType', t.value)}
            >
              <Text style={[styles.typeChipText, form.claimType === t.value && styles.typeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>CLAIMED AMOUNT (ETB) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={form.claimedAmount}
          onChangeText={v => set('claimedAmount', v)}
        />

        <Text style={styles.sectionLabel}>DATE OF SERVICE *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
          value={form.dateOfService}
          onChangeText={v => set('dateOfService', v)}
        />

        <Text style={styles.sectionLabel}>DESCRIPTION *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe the reason for this claim, symptoms, diagnosis, or incident..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={form.description}
          onChangeText={v => set('description', v)}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            📎 Supporting documents (receipts, prescriptions) can be submitted to your HR department or at the clinic.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Claim</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 60 },
  backText: { fontSize: 15, color: '#1e3a5f', fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  typeChipActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  typeChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb',
  },
  textarea: { height: 100, paddingTop: 12 },
  infoBox: {
    backgroundColor: '#f0f9ff', borderRadius: 10, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: '#bae6fd',
  },
  infoBoxText: { fontSize: 13, color: '#0369a1', lineHeight: 18 },
  submitBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
