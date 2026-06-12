import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  const role = user?.role;

  const isInsured     = !role || role === 'insured_person';
  const isBroker      = role === 'sales_broker';
  const isInstitution = role === 'institution_admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 74,
          paddingBottom: 16,
          paddingTop: 10,
          shadowColor: '#0a1628',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        },
        tabBarActiveTintColor: '#1e3a5f',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 3 },
      }}
    >
      {/* ── Home — all roles ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size ?? 24} color={color} />,
        }}
      />

      {/* ── Insured-only tabs ── */}
      <Tabs.Screen
        name="coverage"
        options={{
          title: 'Coverage',
          href: isInsured ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size ?? 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="claims"
        options={{
          title: 'Claims',
          href: isInsured ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size ?? 24} color={color} />,
        }}
      />

      {/* ── Broker-only tab ── */}
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          href: isBroker ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size ?? 24} color={color} />,
        }}
      />

      {/* ── Institution-only tab ── */}
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          href: isInstitution ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size ?? 24} color={color} />,
        }}
      />

      {/* ── Profile — all roles ── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size ?? 24} color={color} />,
        }}
      />
    </Tabs>
  );
}
