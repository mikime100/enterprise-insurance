import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
      <StatusBar style="light" />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>EI</Text>
        </View>
        <Text style={styles.brand}>Enterprise Insurance</Text>
        <Text style={styles.tagline}>Your coverage, simplified</Text>

        {/* Feature pills */}
        <View style={styles.pills}>
          {['Health', 'Life', 'Auto', 'Business'].map(label => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Auth options */}
      <View style={styles.options}>
        <Text style={styles.prompt}>How would you like to continue?</Text>

        {/* Create Account — for new individuals */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={() => router.push('/(auth)/select-plan')}
          activeOpacity={0.85}
        >
          <View style={[styles.cardIcon, { backgroundColor: '#1d4ed8' }]}>
            <Ionicons name="person-add-outline" size={26} color="#fff" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSub}>New? Choose a plan and register.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#93c5fd" />
        </TouchableOpacity>

        {/* Sign In — for broker-registered, institution, or returning users */}
        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <View style={[styles.cardIcon, { backgroundColor: '#e0e7ff' }]}>
            <Ionicons name="log-in-outline" size={26} color="#1e3a5f" />
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: '#111827' }]}>Sign In</Text>
            <Text style={[styles.cardSub, { color: '#6b7280' }]}>
              Already have an account — including broker or employer-registered.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logoText: { fontSize: 30, fontWeight: '800', color: '#1e3a5f' },
  brand: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  tagline: { fontSize: 15, color: '#93c5fd', marginBottom: 20 },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: { color: '#bfdbfe', fontSize: 13, fontWeight: '600' },
  options: { gap: 12 },
  prompt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardSub: { fontSize: 13, color: '#bfdbfe', lineHeight: 18 },
});
