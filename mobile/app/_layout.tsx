import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Check if user has seen onboarding (runs once on mount)
  useEffect(() => {
    AsyncStorage.getItem('onboarded').then(v => setOnboarded(v === 'true'));
  }, []);

  useEffect(() => {
    // Wait until both auth and AsyncStorage have resolved
    if (loading || onboarded === null) return;

    const inAuth = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';

    // First-time user: show onboarding
    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    // No user logged in
    if (!user) {
      if (!inAuth && !inOnboarding) router.replace('/(auth)/welcome');
      return;
    }

    // User has a temp password — must change it before anything else
    if (user.mustChangePassword) {
      const inChangePassword = inAuth && segments[1] === 'change-password';
      if (!inChangePassword) router.replace('/(auth)/change-password');
      return;
    }

    // Authenticated user with no pending action — send to tabs
    if (inAuth || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, onboarded]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootGuard />
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
