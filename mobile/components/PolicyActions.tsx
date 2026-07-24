import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { themedAlert } from './ThemedAlert';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { C, R, F, SHADOW, SERVER_ROOT, fmtMoney } from '../lib/theme';
import { Press, Button } from './ui';

// ─── Download the policy PDF (authenticated) and open the share sheet ──────────
export async function downloadPolicyDocument(enrollmentId: string, label?: string) {
  const token = await AsyncStorage.getItem('token');
  const url = `${SERVER_ROOT}/api/enrollments/${enrollmentId}/policy-document`;
  const target = `${FileSystem.cacheDirectory}policy-${(label || enrollmentId).replace(/[^a-z0-9]/gi, '-')}.pdf`;
  const res = await FileSystem.downloadAsync(url, target, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status !== 200) throw new Error('Could not download the policy document.');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: 'Policy Document', UTI: 'com.adobe.pdf' });
  } else {
    themedAlert('Downloaded', 'Saved to app storage.');
  }
}

// ─── Endorsement (policy change) request ──────────────────────────────────────
const ENDORSEMENT_TYPES = [
  { value: 'tier_change',    label: 'Change Coverage Tier', desc: 'Upgrade or downgrade your plan tier', icon: 'swap-vertical', danger: false },
  { value: 'contact_update', label: 'Update Contact Info',  desc: 'Change your phone number or email',     icon: 'call',          danger: false },
  { value: 'suspension',     label: 'Request Suspension',   desc: 'Temporarily pause your coverage',       icon: 'pause-circle',  danger: false },
  { value: 'cancellation',   label: 'Cancel Policy',        desc: 'Permanently cancel this enrollment',    icon: 'close-circle',  danger: true },
];

export function EndorsementModal({ enrollment, visible, onClose, onSubmitted }: {
  enrollment: any; visible: boolean; onClose: () => void; onSubmitted: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState('');
  const [details, setDetails] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setDetails((d: any) => ({ ...d, [k]: v }));

  const reset = () => { setType(''); setDetails({}); };
  const close = () => { reset(); onClose(); };

  const tiers = (enrollment?.product?.tiers || []).filter((t: any) => t._id !== enrollment?.tier?._id);

  const valid = () => {
    if (type === 'tier_change')    return !!details.requestedTierId;
    if (type === 'contact_update') return !!details.field && !!details.newValue;
    if (type === 'suspension')     return !!details.reason?.trim();
    if (type === 'cancellation')   return !!details.reason?.trim();
    return false;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/endorsements', { enrollmentId: enrollment._id, type, details });
      themedAlert('Request Submitted', 'Your insurer will review this change shortly.');
      reset(); onSubmitted(); onClose();
    } catch (e: any) {
      themedAlert('Error', e?.response?.data?.message || 'Could not submit request');
    } finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />
          <Text style={s.title}>Request a Policy Change</Text>
          <Text style={s.sub}>Select what you'd like to change. All requests are reviewed by your insurer.</Text>
          <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
            {ENDORSEMENT_TYPES.map(t => {
              const sel = type === t.value;
              return (
                <Press key={t.value} onPress={() => { setType(t.value); setDetails({}); }}
                  style={[s.typeRow, sel && (t.danger ? s.typeRowDanger : s.typeRowSel)]}>
                  <View style={[s.typeIcon, { backgroundColor: t.danger ? '#fef2f2' : '#eef4fb' }]}>
                    <Ionicons name={t.icon as any} size={18} color={t.danger ? C.red : C.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.typeLabel, t.danger && sel && { color: C.red }]}>{t.label}</Text>
                    <Text style={s.typeDesc}>{t.desc}</Text>
                  </View>
                  <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={20} color={sel ? (t.danger ? C.red : C.greenDark) : '#cbd5e1'} />
                </Press>
              );
            })}

            {/* Type-specific fields */}
            {type === 'tier_change' && (
              <View style={s.fieldBox}>
                <Text style={s.fieldLabel}>SELECT NEW TIER</Text>
                {tiers.length === 0 ? (
                  <Text style={s.muted}>No alternative tiers available. Contact your insurer.</Text>
                ) : tiers.map((t: any) => {
                  const sel = details.requestedTierId === t._id;
                  return (
                    <TouchableOpacity key={t._id} style={[s.tierRow, sel && s.tierRowSel]} onPress={() => set('requestedTierId', t._id)}>
                      <Text style={s.tierName}>{t.name}</Text>
                      <Text style={s.tierPrice}>{fmtMoney(t.annualPremium)}/yr</Text>
                    </TouchableOpacity>
                  );
                })}
                <TextInput style={s.input} placeholder="Reason (optional)" placeholderTextColor={C.grayLight}
                  value={details.reason || ''} onChangeText={v => set('reason', v)} />
              </View>
            )}
            {type === 'contact_update' && (
              <View style={s.fieldBox}>
                <Text style={s.fieldLabel}>WHAT TO UPDATE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {[{ v: 'phone', l: 'Phone' }, { v: 'email', l: 'Email' }].map(o => {
                    const sel = details.field === o.v;
                    return <TouchableOpacity key={o.v} style={[s.miniChip, sel && s.miniChipSel]} onPress={() => set('field', o.v)}><Text style={[s.miniChipText, sel && { color: C.greenDark }]}>{o.l}</Text></TouchableOpacity>;
                  })}
                </View>
                <TextInput style={s.input} placeholder={details.field === 'email' ? 'new@email.com' : 'New value'}
                  placeholderTextColor={C.grayLight} value={details.newValue || ''} onChangeText={v => set('newValue', v)}
                  keyboardType={details.field === 'email' ? 'email-address' : 'default'} autoCapitalize="none" />
              </View>
            )}
            {(type === 'suspension' || type === 'cancellation') && (
              <View style={s.fieldBox}>
                {type === 'cancellation' && (
                  <View style={s.dangerNote}>
                    <Ionicons name="warning" size={15} color={C.red} />
                    <Text style={s.dangerText}>Cancelling ends your coverage. A pro-rated refund may apply per your policy terms.</Text>
                  </View>
                )}
                <Text style={s.fieldLabel}>REASON</Text>
                <TextInput style={[s.input, { height: 80 }]} multiline textAlignVertical="top"
                  placeholder="Tell us why…" placeholderTextColor={C.grayLight}
                  value={details.reason || ''} onChangeText={v => set('reason', v)} />
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button label="Cancel" variant="outline" color={C.gray} onPress={close} style={{ flex: 1 }} />
            <Button label="Submit Request" icon="send" color={type === 'cancellation' ? C.red : C.greenDark}
              onPress={submit} loading={submitting} disabled={!valid()} style={{ flex: 1.6 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Manual bank-transfer payment proof ───────────────────────────────────────
export function PaymentProofModal({ enrollment, visible, onClose, onSubmitted, pickReceipt }: {
  enrollment: any; visible: boolean; onClose: () => void; onSubmitted: () => void;
  pickReceipt: () => Promise<{ url: string; name: string } | null>;
}) {
  const insets = useSafeAreaInsets();
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = () => { setReceipt(null); setNote(''); onClose(); };

  const submit = async () => {
    if (!receipt) { themedAlert('Receipt required', 'Please attach your bank-transfer receipt.'); return; }
    setSubmitting(true);
    try {
      let receiptUrl = receipt.url;
      if (receiptUrl && !receiptUrl.startsWith('http')) receiptUrl = `${SERVER_ROOT}${receiptUrl}`;
      await api.post(`/enrollments/${enrollment._id}/submit-payment-proof`, { receiptUrl, note: note.trim() });
      themedAlert('Proof Submitted', 'Your payment proof was sent for verification.');
      setReceipt(null); setNote(''); onSubmitted(); onClose();
    } catch (e: any) {
      themedAlert('Error', e?.response?.data?.message || 'Could not submit payment proof');
    } finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />
          <Text style={s.title}>Submit Payment Receipt</Text>
          <Text style={s.sub}>Upload your Chapa payment receipt (photo or PDF). A payer admin will verify it and activate your policy — usually within 1 business day.</Text>

          {receipt ? (
            <View style={s.receiptRow}>
              <Ionicons name="document-text" size={18} color={C.blue} />
              <Text style={s.receiptName} numberOfLines={1}>{receipt.name}</Text>
              <TouchableOpacity onPress={() => setReceipt(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={18} color={C.red} />
              </TouchableOpacity>
            </View>
          ) : (
            <Press onPress={async () => { const r = await pickReceipt(); if (r) setReceipt(r); }} style={s.uploadBtn}>
              <Ionicons name="cloud-upload-outline" size={22} color={C.navy} />
              <Text style={s.uploadText}>Attach receipt (photo or PDF)</Text>
            </Press>
          )}

          <Text style={s.fieldLabel}>NOTE (OPTIONAL)</Text>
          <TextInput style={[s.input, { height: 70 }]} multiline textAlignVertical="top"
            placeholder="Transfer reference, bank, date…" placeholderTextColor={C.grayLight}
            value={note} onChangeText={setNote} />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button label="Cancel" variant="outline" color={C.gray} onPress={close} style={{ flex: 1 }} />
            <Button label="Submit Proof" icon="send" onPress={submit} loading={submitting} style={{ flex: 1.6 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontFamily: F.head, color: C.ink },
  sub: { fontSize: 13, color: C.gray, marginTop: 3, marginBottom: 14, fontFamily: F.body, lineHeight: 18 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: R.md, padding: 13, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent', ...SHADOW.card },
  typeRowSel: { borderColor: C.greenDark, backgroundColor: '#f6fef9' },
  typeRowDanger: { borderColor: C.red, backgroundColor: '#fef6f6' },
  typeIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 14.5, fontFamily: F.bodySemi, color: C.ink },
  typeDesc: { fontSize: 12, color: C.gray, marginTop: 1, fontFamily: F.body },

  fieldBox: { backgroundColor: '#fff', borderRadius: R.md, padding: 14, marginTop: 4, marginBottom: 8, ...SHADOW.card },
  fieldLabel: { fontSize: 11, fontFamily: F.bodySemi, color: C.gray, letterSpacing: 0.8, marginBottom: 10 },
  muted: { fontSize: 13, color: C.grayLight, fontFamily: F.body },
  input: { backgroundColor: '#fff', borderRadius: R.md, padding: 12, fontSize: 14, color: C.ink, borderWidth: 1.5, borderColor: C.line, fontFamily: F.body, marginTop: 8 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: R.sm, padding: 12, marginBottom: 8 },
  tierRowSel: { borderColor: C.greenDark, backgroundColor: '#f0fdf4' },
  tierName: { fontSize: 14, fontFamily: F.bodySemi, color: C.ink },
  tierPrice: { fontSize: 13, fontFamily: F.bodyBold, color: C.greenDark },
  miniChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff' },
  miniChipSel: { borderColor: C.greenDark, backgroundColor: '#f0fdf4' },
  miniChipText: { fontSize: 13, fontFamily: F.bodySemi, color: C.slate },
  dangerNote: { flexDirection: 'row', gap: 8, backgroundColor: '#fef2f2', borderRadius: R.sm, padding: 11, marginBottom: 12 },
  dangerText: { flex: 1, fontSize: 12.5, color: '#991b1b', lineHeight: 18, fontFamily: F.body },

  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: R.md, padding: 13, borderWidth: 1, borderColor: C.line },
  receiptName: { flex: 1, fontSize: 13.5, fontFamily: F.bodySemi, color: C.slate },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: R.md, paddingVertical: 20, borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  uploadText: { fontSize: 13.5, fontFamily: F.bodySemi, color: C.slate },
});
