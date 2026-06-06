import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// ─── Branded splash shown while AuthContext resolves ─────────────────────────
// Prevents the (tabs) stack from rendering before we know if the user is
// logged in, which was causing a blank spinner flash on every cold start.

function AppLoadingScreen() {
  return (
    <View style={splash.root}>
      <StatusBar style="light" />
      <View style={splash.logoBox}>
        <Text style={splash.logoText}>EI</Text>
      </View>
      <Text style={splash.brand}>Enterprise Insurance</Text>
      <Text style={splash.tagline}>Your coverage, anytime anywhere</Text>
      <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" style={{ marginTop: 40 }} />
    </View>
  );
}

const splash = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' },
  logoBox:  { width: 80, height: 80, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 28, fontWeight: '800', color: '#1e3a5f' },
  brand:    { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  tagline:  { fontSize: 13, color: '#93c5fd', marginTop: 6 },
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

function RootGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const redirect = async () => {
      const stored   = await AsyncStorage.getItem('onboarded');
      const onboarded = stored === 'true';

      const seg0 = segments[0] as string;
      const seg1 = segments[1] as string | undefined;
      const inAuth       = seg0 === '(auth)';
      const inOnboarding = seg0 === 'onboarding';

      if (!onboarded && !inOnboarding) {
        // @ts-ignore
        router.replace('/onboarding');
        return;
      }

      if (!user) {
        // @ts-ignore
        if (!inAuth && !inOnboarding) router.replace('/(auth)/welcome');
        return;
      }

      if (user.mustChangePassword) {
        const inChangePassword = inAuth && seg1 === 'change-password';
        // @ts-ignore
        if (!inChangePassword) router.replace('/(auth)/change-password');
        return;
      }

      if (inAuth || inOnboarding) {
        router.replace('/(tabs)');
      }
    };

    redirect();
  }, [user, loading, segments]);

  return null;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

function Inner() {
  const { loading } = useAuth();

  // Block the entire navigator while auth state resolves.
  // Without this, expo-router renders (tabs) immediately and InsuredHome
  // shows a context-free spinner before the redirect fires.
  if (loading) return <AppLoadingScreen />;

  return (
    <>
      <StatusBar style="auto" />
      <RootGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Inner />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
