import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Always read fresh from AsyncStorage — avoids stale state when
    // finish() sets 'onboarded' then immediately navigates away
    const redirect = async () => {
      const stored = await AsyncStorage.getItem('onboarded');
      const onboarded = stored === 'true';

      const seg0 = segments[0] as string;
      const seg1 = segments[1] as string | undefined;
      const inAuth = seg0 === '(auth)';
      const inOnboarding = seg0 === 'onboarding';

      if (!onboarded && !inOnboarding) {
        // @ts-ignore — onboarding not in typed routes
        router.replace('/onboarding');
        return;
      }

      if (!user) {
        // @ts-ignore — welcome not in typed routes
        if (!inAuth && !inOnboarding) router.replace('/(auth)/welcome');
        return;
      }

      if (user.mustChangePassword) {
        const inChangePassword = inAuth && seg1 === 'change-password';
        // @ts-ignore — change-password not in typed routes
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
