import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../../lib/api';

const NAVY  = '#1e3a5f';
const BLUE  = '#2563eb';
const GREEN = '#22c55e';

type Employee = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mustChangePassword?: boolean;
  createdAt: string;
};

type Tier = {
  _id: string;
  name: string;
  annualPremium: number;
  product?: { name: string };
};

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ visible, onClose, onSuccess }: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm]     = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [tiers, setTiers]   = useState<Tier[]>([]);
  const [tierId, setTierId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [tiersLoading, setTiersLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    api.get('/institution/tiers')
      .then(r => setTiers(r.data.tiers || []))
      .catch(() => {})
      .finally(() => setTiersLoading(false));
  }, [visible]);

  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const reset = () => {
    setForm({ firstName: '', lastName: '', email: '', phone: '' });
    setTierId('');
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim())
      return Alert.alert('Missing', 'Enter first and last name.');
    if (!form.email.trim() || !form.email.includes('@'))
      return Alert.alert('Invalid', 'Enter a valid email address.');

    setLoading(true);
    try {
      await api.post('/institution/employees/invite', {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim().toLowerCase(),
        phone:     form.phone.trim(),
        ...(tierId ? { tierId } : {}),
      });
      Alert.alert('Done', `Invitation sent to ${form.firstName}. They will receive login credentials by email.`);
      reset();
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not invite employee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={modal.root}>
          <View style={modal.header}>
            <Text style={modal.title}>Invite Employee</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modal.body} keyboardShouldPersistTaps="handled">
            <View style={modal.infoBanner}>
              <Ionicons name="mail-outline" size={18} color={BLUE} />
              <Text style={modal.infoText}>
                A temporary password will be emailed. The employee must change it on first login.
              </Text>
            </View>

            <View style={modal.row}>
              <View style={[modal.field, { flex: 1 }]}>
                <Text style={modal.label}>First Name *</Text>
                <TextInput style={modal.input} placeholder="Abebe" placeholderTextColor="#9ca3af"
                  value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" />
              </View>
              <View style={[modal.field, { flex: 1 }]}>
                <Text style={modal.label}>Last Name *</Text>
                <TextInput style={modal.input} placeholder="Kebede" placeholderTextColor="#9ca3af"
                  value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" />
              </View>
            </View>

            <View style={modal.field}>
              <Text style={modal.label}>Email Address *</Text>
              <TextInput style={modal.input} placeholder="employee@company.com" placeholderTextColor="#9ca3af"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                value={form.email} onChangeText={set('email')} />
            </View>

            <View style={modal.field}>
              <Text style={modal.label}>Phone Number</Text>
              <TextInput style={modal.input} placeholder="+251 9xx xxx xxx" placeholderTextColor="#9ca3af"
                keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />
            </View>

            {/* Tier selection */}
            <View style={modal.field}>
              <Text style={modal.label}>Enroll in Coverage Tier (optional)</Text>
              {tiersLoading ? (
                <ActivityIndicator size="small" color={NAVY} style={{ marginTop: 8 }} />
              ) : tiers.length === 0 ? (
                <Text style={modal.noTiers}>No tiers configured for your institution.</Text>
              ) : (
                <View style={modal.tierList}>
                  {/* None option */}
                  <TouchableOpacity
                    style={[modal.tierRow, tierId === '' && modal.tierRowSelected]}
                    onPress={() => setTierId('')}
                  >
                    <View style={[modal.tierRadio, tierId === '' && modal.tierRadioSelected]}>
                      {tierId === '' && <View style={modal.tierRadioDot} />}
                    </View>
                    <Text style={[modal.tierName, tierId === '' && { color: NAVY }]}>
                      No tier — invite only
                    </Text>
                  </TouchableOpacity>

                  {tiers.map(t => (
                    <TouchableOpacity
                      key={t._id}
                      style={[modal.tierRow, tierId === t._id && modal.tierRowSelected]}
                      onPress={() => setTierId(t._id)}
                    >
                      <View style={[modal.tierRadio, tierId === t._id && modal.tierRadioSelected]}>
                        {tierId === t._id && <View style={modal.tierRadioDot} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[modal.tierName, tierId === t._id && { color: NAVY }]}>
                          {t.name}
                          {t.product?.name ? ` · ${t.product.name}` : ''}
                        </Text>
                        <Text style={modal.tierPrice}>
                          ETB {t.annualPremium?.toLocaleString()} / year
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[modal.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <><Text style={modal.submitText}>Send Invitation</Text><Ionicons name="send" size={18} color="#fff" /></>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Employee Row ─────────────────────────────────────────────────────────────

function EmployeeRow({ employee }: { employee: Employee }) {
  const initials  = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
  const isPending = employee.mustChangePassword;
  const joined    = new Date(employee.createdAt).toLocaleDateString();

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: isPending ? '#f59e0b' : BLUE }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{employee.firstName} {employee.lastName}</Text>
        <Text style={styles.rowEmail}>{employee.email}</Text>
        <Text style={styles.rowDate}>Joined {joined}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: isPending ? '#fef9c3' : '#dcfce7' }]}>
        <Text style={[styles.badgeText, { color: isPending ? '#a16207' : '#16a34a' }]}>
          {isPending ? 'Pending' : 'Active'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EmployeesScreen() {
  const insets = useSafeAreaInsets();
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [search, setSearch]         = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/institution/employees');
      setEmployees(res.data.employees || []);
    } catch {
      Alert.alert('Error', 'Could not load employees.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = search.trim()
    ? employees.filter(e =>
        `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(search.toLowerCase()))
    : employees;

  const active  = employees.filter(e => !e.mustChangePassword).length;
  const pending = employees.filter(e =>  e.mustChangePassword).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Employees</Text>
          <Text style={styles.headerSub}>{employees.length} total · {active} active · {pending} pending setup</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="person-add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={NAVY} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>{search ? 'No results' : 'No employees yet'}</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try a different search term.' : 'Tap Invite to add your first employee.'}
              </Text>
            </View>
          ) : (
            filtered.map(e => <EmployeeRow key={e._id} employee={e} />)
          )}
        </ScrollView>
      )}

      <InviteModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={load}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BLUE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  list: { padding: 16, gap: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rowInfo:    { flex: 1 },
  rowName:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowEmail:   { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rowDate:    { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151' },
  emptySub:   { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});

const modal = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title:   { fontSize: 18, fontWeight: '700', color: '#111827' },
  body:    { padding: 20, gap: 4 },

  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },

  row:   { flexDirection: 'row', gap: 12 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },

  noTiers: { fontSize: 13, color: '#9ca3af', marginTop: 6 },

  tierList: { gap: 8, marginTop: 4 },
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  tierRowSelected: { borderColor: NAVY, backgroundColor: '#f0f6ff' },
  tierRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  tierRadioSelected: { borderColor: NAVY },
  tierRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: NAVY },
  tierName:  { fontSize: 14, fontWeight: '600', color: '#374151' },
  tierPrice: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  submitBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
