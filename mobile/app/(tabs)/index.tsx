import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { C, R, F, SHADOW, statusCfg, fmtMoney, fmtDate, CLAIM_TYPE_ICONS } from '../../lib/theme';
import { FadeIn, Press, StatusPill, Skeleton } from '../../components/ui';

const ACTION_NEEDED = ['awaiting_client_approval', 'documentation_requested'];

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Header({ user, subtitle }: { user: any; subtitle?: string }) {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <View style={st.header}>
      <View style={{ flex: 1 }}>
        <Text style={st.greeting}>{greet},</Text>
        <Text style={st.name}>{user?.firstName} {user?.lastName}</Text>
        {subtitle ? <Text style={st.headerSub}>{subtitle}</Text> : null}
      </View>
      <View style={st.avatar}>
        <Text style={st.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, color, icon, delay = 0 }: {
  label: string; value: string | number; color: string; icon: string; delay?: number;
}) {
  return (
    <FadeIn delay={delay} style={{ flex: 1 }}>
      <View style={st.statCard}>
        <View style={[st.statIcon, { backgroundColor: `${color}16` }]}>
          <Ionicons name={icon as any} size={17} color={color} />
        </View>
        <Text style={st.statValue}>{value}</Text>
        <Text style={st.statLabel}>{label}</Text>
      </View>
    </FadeIn>
  );
}

function ActionTile({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={st.actionTile}>
      <View style={[st.actionIcon, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon as any} size={23} color={color} />
      </View>
      <Text style={st.actionLabel}>{label}</Text>
    </Press>
  );
}

// ─── Insured home ─────────────────────────────────────────────────────────────

function InsuredHome({ user, router, insets }: any) {
  const [enrollment, setEnrollment] = useState<any>(null);
  const [claims, setClaims]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [eRes, cRes] = await Promise.allSettled([
        api.get('/enrollments', { params: { status: 'active' } }),
        api.get('/claims'),
      ]);
      if (eRes.status === 'fulfilled') {
        const list = eRes.value.data.enrollments;
        if (Array.isArray(list) && list.length) setEnrollment(list[0]);
      }
      if (cRes.status === 'fulfilled') {
        const list = cRes.value.data.claims;
        if (Array.isArray(list)) setClaims(list);
      }
    } finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const openClaims    = claims.filter(c => !['settled', 'closed', 'denied'].includes(c.status));
  const actionClaims  = claims.filter(c => ACTION_NEEDED.includes(c.status));
  const settledAmt    = claims.filter(c => c.status === 'settled')
    .reduce((sum, c) => sum + (c.settlementAmount || c.approvedAmount || 0), 0);
  const daysLeft = enrollment?.endDate
    ? Math.max(0, Math.ceil((new Date(enrollment.endDate).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <ScrollView style={st.root}
      contentContainerStyle={[st.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.navy} />}>
      <Header user={user} />

      {loading ? (
        <View style={{ gap: 14 }}>
          <Skeleton height={170} radius={R.xl} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton height={92} style={{ flex: 1 }} /><Skeleton height={92} style={{ flex: 1 }} /><Skeleton height={92} style={{ flex: 1 }} />
          </View>
          <Skeleton height={120} />
        </View>
      ) : (
        <>
          {/* ── Action needed banners ──────────────────────────────────── */}
          {actionClaims.map((c, i) => {
            const cfg = statusCfg(c.status);
            const isOffer = c.status === 'awaiting_client_approval';
            return (
              <FadeIn key={c._id} delay={i * 70}>
                <Press onPress={() => router.push(`/claim/${c._id}`)}
                  style={[st.alertCard, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                  <View style={[st.alertIcon, { backgroundColor: cfg.color }]}>
                    <Ionicons name={isOffer ? 'cash' : 'document-attach'} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.alertTitle, { color: cfg.color }]}>Action Needed</Text>
                    <Text style={st.alertSub} numberOfLines={2}>
                      {isOffer
                        ? `A settlement offer of ${fmtMoney(c.offeredAmount)} for ${c.claimNumber} is awaiting your response.`
                        : `Additional documents were requested for ${c.claimNumber}.`}
                    </Text>
                    <Text style={[st.alertCta, { color: cfg.color }]}>
                      {isOffer ? 'REVIEW OFFER  →' : 'UPLOAD DOCUMENTS  →'}
                    </Text>
                  </View>
                </Press>
              </FadeIn>
            );
          })}

          {/* ── Policy hero card ───────────────────────────────────────── */}
          <FadeIn delay={60}>
            <LinearGradient colors={[C.navyDark, C.navy, '#27548a']} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1.2 }}
              style={st.hero}>
              <View style={st.heroDecor} />
              <View style={st.heroDecor2} />
              <View style={st.heroTopRow}>
                <Text style={st.heroEyebrow}>MY POLICY</Text>
                {enrollment && (
                  <View style={st.heroPill}>
                    <View style={st.heroPillDot} />
                    <Text style={st.heroPillText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              {enrollment ? (
                <>
                  <Text style={st.heroPlan}>{enrollment.product?.name || enrollment.tier?.name || 'My Plan'}</Text>
                  <Text style={st.heroProduct}>{enrollment.tier?.name ? `${enrollment.tier.name} Tier` : ''}</Text>
                  <Text style={st.heroMetaLabel}>POLICY NUMBER</Text>
                  <Text style={st.heroPolicyNo}>{enrollment.enrollmentNumber || '—'}</Text>
                  <View style={st.heroFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons name="timer-outline" size={15} color={C.green} />
                      <Text style={st.heroExpires}>
                        {daysLeft !== null ? `Expires in ${daysLeft} days` : `Expires ${fmtDate(enrollment.endDate)}`}
                      </Text>
                    </View>
                    <Press onPress={() => router.push('/(tabs)/coverage')} style={st.renewBtn}>
                      <Text style={st.renewBtnText}>Renew</Text>
                    </Press>
                  </View>
                </>
              ) : (
                <>
                  <Text style={st.heroPlan}>No active coverage</Text>
                  <Text style={st.heroProduct}>Protect yourself and your family today.</Text>
                  <Press onPress={() => router.push('/(tabs)/coverage')} style={st.heroCta}>
                    <Text style={st.heroCtaText}>Browse Plans</Text>
                    <Ionicons name="arrow-forward" size={15} color={C.navyDark} />
                  </Press>
                </>
              )}
            </LinearGradient>
          </FadeIn>

          {/* ── Stats ──────────────────────────────────────────────────── */}
          <View style={st.statsRow}>
            <StatCard label="Open Claims" value={openClaims.length} color={C.amber} icon="time" delay={120} />
            <StatCard label="Total Claims" value={claims.length} color={C.blue} icon="documents" delay={170} />
            <StatCard label="Settled" value={settledAmt > 0 ? `${(settledAmt / 1000).toFixed(settledAmt >= 10000 ? 0 : 1)}k` : '0'} color={C.green} icon="wallet" delay={220} />
          </View>

          {/* ── Quick actions ──────────────────────────────────────────── */}
          <FadeIn delay={260}>
            <Text style={st.sectionTitle}>Quick Actions</Text>
            <View style={st.actionsRow}>
              <ActionTile icon="add-circle" label="File Claim" color={C.green} onPress={() => router.push('/new-claim')} />
              <ActionTile icon="folder-open" label="My Claims" color={C.blue} onPress={() => router.push('/(tabs)/claims')} />
              <ActionTile icon="shield-checkmark" label="My Policy" color={C.purple} onPress={() => router.push('/(tabs)/coverage')} />
              <ActionTile icon="person-circle" label="Profile" color={C.cyan} onPress={() => router.push('/(tabs)/profile')} />
            </View>
          </FadeIn>

          {/* ── Recent claims ──────────────────────────────────────────── */}
          {claims.length > 0 && (
            <FadeIn delay={320}>
              <View style={st.recentHead}>
                <Text style={st.sectionTitle}>Recent Claims</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/claims')}>
                  <Text style={st.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              {claims.slice(0, 3).map(claim => (
                <Press key={claim._id} onPress={() => router.push(`/claim/${claim._id}`)} style={st.claimRow}>
                  <View style={st.claimIcon}>
                    <Ionicons name={(CLAIM_TYPE_ICONS[claim.claimType] || 'document') as any} size={17} color={C.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.claimNumber}>{claim.claimNumber}</Text>
                    <Text style={st.claimType}>{claim.claimType?.replace(/_/g, ' ')} · {fmtMoney(claim.claimedAmount)}</Text>
                  </View>
                  <StatusPill status={claim.status} size="sm" />
                </Press>
              ))}
            </FadeIn>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Broker home ──────────────────────────────────────────────────────────────

function BrokerHome({ user, router, insets }: any) {
  const [customers, setCustomers]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/broker/customers');
      setCustomers(res.data.customers || []);
    } finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const active  = customers.filter(c => !c.mustChangePassword).length;
  const pending = customers.filter(c => c.mustChangePassword).length;

  return (
    <ScrollView style={st.root}
      contentContainerStyle={[st.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.navy} />}>
      <Header user={user} subtitle="Broker Portal" />
      {loading ? <Skeleton height={150} radius={R.xl} /> : (
        <>
          <FadeIn>
            <LinearGradient colors={['#1e1b4b', '#312e81', '#4338ca']} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1.2 }} style={st.hero}>
              <Text style={st.heroEyebrow}>SALES DASHBOARD</Text>
              <Text style={st.heroPlan}>{customers.length} Customers</Text>
              <Text style={st.heroProduct}>{active} active · {pending} pending activation</Text>
            </LinearGradient>
          </FadeIn>
          <View style={st.statsRow}>
            <StatCard label="Active" value={active} color={C.green} icon="checkmark-circle" delay={80} />
            <StatCard label="Pending" value={pending} color={C.amber} icon="time" delay={130} />
            <StatCard label="Total" value={customers.length} color={C.blue} icon="people" delay={180} />
          </View>
          <FadeIn delay={220}>
            <Text style={st.sectionTitle}>Quick Actions</Text>
            <View style={st.actionsRow}>
              <ActionTile icon="person-add" label="Register" color="#4338ca" onPress={() => router.push('/(tabs)/customers')} />
              <ActionTile icon="people" label="Customers" color={C.blue} onPress={() => router.push('/(tabs)/customers')} />
            </View>
          </FadeIn>
          {customers.slice(0, 5).map((c, i) => (
            <FadeIn key={c._id} delay={260 + i * 50}>
              <View style={st.claimRow}>
                <View style={st.claimIcon}><Text style={{ fontWeight: '800', color: C.navy, fontSize: 13 }}>{c.firstName?.[0]}{c.lastName?.[0]}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.claimNumber}>{c.firstName} {c.lastName}</Text>
                  <Text style={st.claimType}>{c.email}</Text>
                </View>
                <StatusPill status={c.mustChangePassword ? 'submitted' : 'settled'} size="sm" />
              </View>
            </FadeIn>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Institution home ─────────────────────────────────────────────────────────

function InstitutionHome({ user, router, insets }: any) {
  const [employees, setEmployees]     = useState<any[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const load = async () => {
    try {
      const [eRes, iRes] = await Promise.allSettled([
        api.get('/institution/employees'),
        api.get('/institution/info'),
      ]);
      if (eRes.status === 'fulfilled') setEmployees(eRes.value.data.employees || []);
      if (iRes.status === 'fulfilled') setInstitution(iRes.value.data.institution);
    } finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const activated = employees.filter(e => !e.mustChangePassword).length;
  const pending   = employees.filter(e => e.mustChangePassword).length;

  return (
    <ScrollView style={st.root}
      contentContainerStyle={[st.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.navy} />}>
      <Header user={user} subtitle="Institution HR" />
      {loading ? <Skeleton height={150} radius={R.xl} /> : (
        <>
          <FadeIn>
            <LinearGradient colors={[C.navyDark, '#0f2847', C.navy]} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1.2 }} style={st.hero}>
              <Text style={st.heroEyebrow}>INSTITUTION HR</Text>
              <Text style={st.heroPlan}>{institution?.name || 'My Organisation'}</Text>
              <Text style={st.heroProduct}>{employees.length} employees on record</Text>
            </LinearGradient>
          </FadeIn>
          <View style={st.statsRow}>
            <StatCard label="Active" value={activated} color={C.green} icon="checkmark-circle" delay={80} />
            <StatCard label="Pending" value={pending} color={C.amber} icon="time" delay={130} />
            <StatCard label="Total" value={employees.length} color={C.blue} icon="business" delay={180} />
          </View>
          <FadeIn delay={220}>
            <Text style={st.sectionTitle}>Quick Actions</Text>
            <View style={st.actionsRow}>
              <ActionTile icon="person-add" label="Invite" color={C.blue} onPress={() => router.push('/(tabs)/employees')} />
              <ActionTile icon="people" label="Employees" color={C.navy} onPress={() => router.push('/(tabs)/employees')} />
            </View>
          </FadeIn>
          {employees.slice(0, 5).map((e, i) => (
            <FadeIn key={e._id} delay={260 + i * 50}>
              <View style={st.claimRow}>
                <View style={st.claimIcon}><Text style={{ fontWeight: '800', color: C.navy, fontSize: 13 }}>{e.firstName?.[0]}{e.lastName?.[0]}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.claimNumber}>{e.firstName} {e.lastName}</Text>
                  <Text style={st.claimType}>{e.email}</Text>
                </View>
                <StatusPill status={e.mustChangePassword ? 'submitted' : 'settled'} size="sm" />
              </View>
            </FadeIn>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();

  if (user?.role === 'sales_broker')      return <BrokerHome      user={user} router={router} insets={insets} />;
  if (user?.role === 'institution_admin') return <InstitutionHome user={user} router={router} insets={insets} />;
  return <InsuredHome user={user} router={router} insets={insets} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { fontSize: 13, color: C.gray, fontFamily: F.bodySemi, letterSpacing: 0.6, textTransform: 'uppercase' },
  name:     { fontSize: 25, fontFamily: F.head, color: C.ink, letterSpacing: -0.3 },
  headerSub:{ fontSize: 12, color: C.grayLight, marginTop: 2 },
  avatar:   { width: 46, height: 46, borderRadius: 23, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', ...SHADOW.card },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: R.md, borderWidth: 1.5, padding: 13, marginBottom: 12,
  },
  alertIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 15, fontFamily: F.headSemi },
  alertSub: { fontSize: 12.5, color: C.slate, marginTop: 2, fontFamily: F.body, lineHeight: 18 },
  alertCta: { fontSize: 11.5, fontFamily: F.bodyBold, letterSpacing: 1, marginTop: 8 },

  hero: { borderRadius: R.xl, padding: 22, marginBottom: 16, overflow: 'hidden', ...SHADOW.float },
  heroDecor: {
    position: 'absolute', right: -50, top: -50, width: 170, height: 170,
    borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroDecor2: {
    position: 'absolute', right: 30, bottom: -70, width: 140, height: 140,
    borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroEyebrow: { fontSize: 10.5, color: 'rgba(147,197,253,0.9)', fontWeight: '800', letterSpacing: 1.4 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(34,197,94,0.18)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  heroPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  heroPillText: { fontSize: 10, color: '#86efac', fontWeight: '800', letterSpacing: 0.5 },
  heroPlan: { fontSize: 28, fontFamily: F.head, color: '#fff', letterSpacing: -0.3 },
  heroProduct: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontFamily: F.body },
  heroMetaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: F.bodyBold, letterSpacing: 1.2, marginTop: 16, marginBottom: 4 },
  heroPolicyNo: { fontSize: 17, color: '#fff', fontFamily: F.bodyBold, letterSpacing: 2.5 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  heroExpires: { fontSize: 13, color: C.green, fontFamily: F.bodySemi },
  renewBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  renewBtnText: { color: C.navyDark, fontFamily: F.bodyBold, fontSize: 13 },
  heroCta: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16,
  },
  heroCtaText: { color: C.navyDark, fontWeight: '800', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 11, marginBottom: 20 },
  statCard: { backgroundColor: '#fff', borderRadius: R.md, padding: 13, ...SHADOW.card },
  statIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  statValue: { fontSize: 21, fontFamily: F.bodyBold, color: C.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: C.gray, marginTop: 2, fontFamily: F.bodySemi, letterSpacing: 0.6, textTransform: 'uppercase' },

  sectionTitle: { fontSize: 19, fontFamily: F.head, color: C.ink, marginBottom: 12, letterSpacing: -0.2 },
  actionsRow: { flexDirection: 'row', gap: 11, marginBottom: 22 },
  actionTile: { flex: 1, backgroundColor: '#fff', borderRadius: R.md, paddingVertical: 15, alignItems: 'center', gap: 7, ...SHADOW.card },
  actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '700', color: C.slate },

  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { fontSize: 13, color: C.blue, fontWeight: '700', marginBottom: 12 },
  claimRow: {
    backgroundColor: '#fff', borderRadius: R.md, padding: 14, marginBottom: 9,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOW.card,
  },
  claimIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  claimNumber: { fontSize: 13.5, fontWeight: '800', color: C.ink },
  claimType: { fontSize: 11.5, color: C.gray, marginTop: 1, textTransform: 'capitalize' },
});
