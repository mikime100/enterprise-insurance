import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../lib/api';
import { C, R, F, SHADOW, fmtDate } from '../lib/theme';
import { REL_META, DEP_STATUS, QUALIFYING_EVENTS, calcAge } from '../lib/dependents';
import { FadeIn, Press, Button, EmptyState, Skeleton } from '../components/ui';

export default function DependentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Remove modal
  const [removeTarget, setRemoveTarget] = useState<{ enr: any; dep: any } | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    try {
      const [enrRes, endRes] = await Promise.allSettled([
        api.get('/enrollments'),
        api.get('/endorsements', { params: { type: 'dependent' } }),
      ]);
      if (enrRes.status === 'fulfilled') {
        const list = (enrRes.value.data.enrollments || []).filter((e: any) => ['active', 'pending_renewal'].includes(e.status));
        setEnrollments(list);
      }
      if (endRes.status === 'fulfilled') {
        const all = Array.isArray(endRes.value.data.endorsements) ? endRes.value.data.endorsements : [];
        setEndorsements(all.filter((e: any) => ['add_dependent', 'remove_dependent'].includes(e.type)));
      }
    } catch { /* keep */ }
    finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const endorsementsFor = (enrId: string) =>
    endorsements.filter(e => (e.enrollment?._id || e.enrollment) === enrId);

  const submitRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.post('/endorsements', {
        enrollmentId: removeTarget.enr._id,
        type: 'remove_dependent',
        details: {
          dependentId: removeTarget.dep._id,
          dependentName: `${removeTarget.dep.firstName} ${removeTarget.dep.lastName}`,
          reason: removeReason.trim() || 'Requested by policyholder',
        },
      });
      setRemoveTarget(null); setRemoveReason('');
      Alert.alert('Request Submitted', 'Your removal request was sent to the insurer for review.');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit request');
    } finally { setRemoving(false); }
  };

  const totalDeps = enrollments.reduce((sum, e) => sum + (e.insuredPersons?.[0]?.dependents?.length || 0), 0);
  const pendingCount = endorsements.filter(e => ['pending', 'under_review'].includes(e.status)).length;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient colors={[C.navyDark, C.navy]} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Dependents</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={s.headerSub}>
          {totalDeps} covered{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={{ padding: 20, gap: 12 }}><Skeleton height={120} /><Skeleton height={120} /></View>
      ) : enrollments.length === 0 ? (
        <EmptyState icon="people-outline" title="No active policy"
          sub="You need an active policy before adding dependents." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.navy} />}>

          <View style={s.noteBox}>
            <Ionicons name="information-circle" size={16} color="#0369a1" />
            <Text style={s.noteText}>
              Adding a dependent may change your premium. Nothing is charged until you accept the revised amount. All changes are reviewed by the insurer.
            </Text>
          </View>

          {enrollments.map((enr, idx) => {
            const deps = enr.insuredPersons?.[0]?.dependents || [];
            const enrEnds = endorsementsFor(enr._id);
            const pendingEnds = enrEnds.filter(e => ['pending', 'under_review'].includes(e.status));
            const decidedEnds = enrEnds.filter(e => ['approved', 'rejected'].includes(e.status)).slice(0, 5);
            return (
              <FadeIn key={enr._id} delay={idx * 80}>
                <View style={s.planBlock}>
                  <View style={s.planHead}>
                    <Ionicons name="shield-checkmark" size={16} color={C.navy} />
                    <Text style={s.planName}>{enr.product?.name || 'Policy'}</Text>
                    <Text style={s.planNo}>{enr.enrollmentNumber}</Text>
                  </View>

                  {/* Current dependents */}
                  {deps.length === 0 ? (
                    <Text style={s.emptyDeps}>No dependents on this policy yet.</Text>
                  ) : deps.map((dep: any, i: number) => {
                    const m = REL_META[dep.relationship] || REL_META.other;
                    const age = calcAge(dep.dateOfBirth);
                    return (
                      <View key={dep._id || i} style={s.depRow}>
                        <View style={[s.depIcon, { backgroundColor: m.bg }]}>
                          <Text style={{ fontSize: 18 }}>{m.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.depName}>{dep.firstName} {dep.lastName}</Text>
                          <Text style={s.depMeta}>
                            {m.label}{age != null ? ` · ${age} yrs` : ''}{dep.gender ? ` · ${dep.gender}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => { setRemoveReason(''); setRemoveTarget({ enr, dep }); }}
                          style={s.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="person-remove-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {/* Pending requests */}
                  {pendingEnds.map((e) => {
                    const cfg = DEP_STATUS[e.status] || DEP_STATUS.pending;
                    const dep = e.details?.dependent || {};
                    const isAdd = e.type === 'add_dependent';
                    return (
                      <View key={e._id} style={[s.pendRow, { borderColor: cfg.bg }]}>
                        <Ionicons name={isAdd ? 'person-add' : 'person-remove'} size={15} color={cfg.color} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.pendName}>
                            {isAdd ? `Add ${dep.firstName || ''} ${dep.lastName || ''}` : `Remove ${e.details?.dependentName || 'dependent'}`}
                          </Text>
                          <Text style={s.pendMeta}>Submitted {fmtDate(e.createdAt)}</Text>
                        </View>
                        <View style={[s.pill, { backgroundColor: cfg.bg }]}>
                          <Text style={[s.pillText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Recently decided */}
                  {decidedEnds.map((e) => {
                    const cfg = DEP_STATUS[e.status] || DEP_STATUS.pending;
                    const dep = e.details?.dependent || {};
                    const isAdd = e.type === 'add_dependent';
                    return (
                      <View key={e._id} style={s.decidedRow}>
                        <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                        <Text style={s.decidedText} numberOfLines={1}>
                          {isAdd ? `Add ${dep.firstName || ''}` : `Remove ${e.details?.dependentName || ''}`} — {cfg.label}
                        </Text>
                        {!!e.reviewNote && <Text style={s.decidedNote} numberOfLines={1}>“{e.reviewNote}”</Text>}
                      </View>
                    );
                  })}

                  <Button label="Add Dependent" icon="person-add" variant="outline" color={C.navy}
                    onPress={() => router.push(`/add-dependent/${enr._id}` as any)} style={{ marginTop: 12 }} />
                </View>
              </FadeIn>
            );
          })}
        </ScrollView>
      )}

      {/* Remove modal */}
      <Modal visible={!!removeTarget} transparent animationType="fade" onRequestClose={() => setRemoveTarget(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Ionicons name="warning" size={20} color={C.amber} />
              <Text style={s.modalTitle}>Remove Dependent</Text>
            </View>
            <Text style={s.modalBody}>
              Submit a request to remove{' '}
              <Text style={{ fontFamily: F.bodyBold }}>{removeTarget?.dep?.firstName} {removeTarget?.dep?.lastName}</Text>{' '}
              from this policy. Coverage ends on the insurer-approved effective date.
            </Text>
            <Text style={s.modalLabel}>Reason</Text>
            <TextInput style={s.modalInput} multiline textAlignVertical="top" value={removeReason}
              onChangeText={setRemoveReason} placeholder="e.g. No longer financially dependent"
              placeholderTextColor={C.grayLight} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button label="Cancel" variant="outline" color={C.gray} onPress={() => setRemoveTarget(null)} style={{ flex: 1 }} />
              <Button label="Submit" icon="send" color={C.red} onPress={submitRemove} loading={removing} style={{ flex: 1.4 }} />
            </View>
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
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 8, fontFamily: F.body },

  noteBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: R.md, padding: 13, marginBottom: 16 },
  noteText: { flex: 1, fontSize: 12, color: '#0c4a6e', lineHeight: 18, fontFamily: F.body },

  planBlock: { backgroundColor: '#fff', borderRadius: R.lg, padding: 16, marginBottom: 16, ...SHADOW.card },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  planName: { flex: 1, fontSize: 15, fontFamily: F.headSemi, color: C.ink },
  planNo: { fontSize: 11, color: C.grayLight, fontFamily: F.body },
  emptyDeps: { fontSize: 13, color: C.grayLight, fontFamily: F.body, paddingVertical: 8 },

  depRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  depIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  depName: { fontSize: 14.5, fontFamily: F.bodySemi, color: C.ink },
  depMeta: { fontSize: 12, color: C.gray, marginTop: 1, fontFamily: F.body, textTransform: 'capitalize' },
  removeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' },

  pendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fafbfc', borderWidth: 1, borderRadius: R.sm, padding: 11, marginTop: 8 },
  pendName: { fontSize: 13.5, fontFamily: F.bodySemi, color: C.ink, textTransform: 'capitalize' },
  pendMeta: { fontSize: 11.5, color: C.grayLight, marginTop: 1, fontFamily: F.body },
  pill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontFamily: F.bodyBold },

  decidedRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, paddingLeft: 2 },
  decidedText: { fontSize: 12.5, color: C.slate, fontFamily: F.body, textTransform: 'capitalize' },
  decidedNote: { fontSize: 11.5, color: C.grayLight, fontFamily: F.body, fontStyle: 'italic' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: R.lg, padding: 20 },
  modalTitle: { fontSize: 17, fontFamily: F.head, color: C.ink },
  modalBody: { fontSize: 13.5, color: C.slate, lineHeight: 20, fontFamily: F.body, marginBottom: 14 },
  modalLabel: { fontSize: 11, fontFamily: F.bodySemi, color: C.gray, letterSpacing: 0.8, marginBottom: 8 },
  modalInput: { backgroundColor: '#fff', borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, padding: 12, fontSize: 14, color: C.ink, height: 80, fontFamily: F.body },
});
