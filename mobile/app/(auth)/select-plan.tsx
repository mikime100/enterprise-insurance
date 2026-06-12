import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { API_BASE } from '../../lib/api';

type Tier = {
  _id: string;
  name: string;
  annualPremium: number;
  description?: string;
};

type Product = {
  _id: string;
  name: string;
  productType: string;
  description?: string;
  tiers?: Tier[];
};

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  health:   { icon: 'heart',           color: '#16a34a', bg: '#dcfce7' },
  life:     { icon: 'shield-checkmark',color: '#2563eb', bg: '#dbeafe' },
  auto:     { icon: 'car',             color: '#d97706', bg: '#fef3c7' },
  home:     { icon: 'home',            color: '#7c3aed', bg: '#ede9fe' },
  travel:   { icon: 'airplane',        color: '#0891b2', bg: '#cffafe' },
  business: { icon: 'business',        color: '#be185d', bg: '#fce7f3' },
};

const fallback: Product[] = [
  { _id: 'h1', name: 'Essential Health Plan', productType: 'health', description: 'Outpatient, inpatient, and emergency coverage for individuals.' },
  { _id: 'l1', name: 'Term Life Plan', productType: 'life', description: 'Protect your family with affordable term life coverage.' },
  { _id: 'a1', name: 'Motor Comprehensive', productType: 'auto', description: 'Full coverage for your vehicle — collision, theft, and third-party.' },
];

export default function SelectPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/products`, { params: { withTiers: 'true' } })
      .then(res => {
        const list: Product[] = res.data.products || res.data || [];
        setProducts(list.length ? list : fallback);
      })
      .catch(() => setProducts(fallback))
      .finally(() => setLoading(false));
  }, []);

  const proceed = () => {
    const plan = products.find(p => p._id === selected);
    if (!plan) { Alert.alert('Select a Plan', 'Please choose a plan to continue.'); return; }
    router.push({
      pathname: '/(auth)/register' as any,
      params: { planId: plan._id, planName: plan.name, planType: plan.productType },
    });
  };

  const formatPrice = (tiers?: Tier[]) => {
    if (!tiers?.length) return null;
    const min = Math.min(...tiers.map(t => t.annualPremium));
    return `From ETB ${min.toLocaleString()} / yr`;
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color="#1e3a5f" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Choose a Plan</Text>
          <Text style={styles.headerSub}>Select coverage that fits your needs</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1e3a5f" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {products.map(product => {
            const meta = TYPE_META[product.productType] || TYPE_META.health;
            const isSelected = selected === product._id;
            const price = formatPrice(product.tiers);
            return (
              <TouchableOpacity
                key={product._id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(product._id)}
                activeOpacity={0.8}
              >
                <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={28} color={meta.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardName, isSelected && { color: '#1e3a5f' }]}>{product.name}</Text>
                  <Text style={styles.cardType}>{product.productType.toUpperCase()}</Text>
                  {product.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>{product.description}</Text>
                  ) : null}
                  {price ? <Text style={styles.cardPrice}>{price}</Text> : null}

                  {/* Tier chips */}
                  {product.tiers && product.tiers.length > 0 && (
                    <View style={styles.tiers}>
                      {product.tiers.slice(0, 3).map(t => (
                        <View key={t._id} style={[styles.tierChip, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.tierChipText, { color: meta.color }]}>{t.name}</Text>
                        </View>
                      ))}
                      {product.tiers.length > 3 && (
                        <Text style={styles.moreText}>+{product.tiers.length - 3} more</Text>
                      )}
                    </View>
                  )}
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Proceed button */}
      {!loading && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={16} color="#0369a1" style={{ marginTop: 1 }} />
            <Text style={styles.disclaimerText}>
              Your selection is not final — you can change your plan after signing in. Full coverage details and payment will be reviewed inside your account before any charges are made.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.proceedBtn, !selected && styles.proceedBtnDisabled]}
            onPress={proceed}
            activeOpacity={0.85}
          >
            <Text style={styles.proceedText}>Continue with this Plan</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'flex-start',
  },
  cardSelected: {
    borderColor: '#1e3a5f',
    backgroundColor: '#f0f6ff',
  },
  typeIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardType: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 6 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: '#16a34a', marginBottom: 8 },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tierChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierChipText: { fontSize: 11, fontWeight: '600' },
  moreText: { fontSize: 11, color: '#9ca3af', alignSelf: 'center' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: { borderColor: '#1e3a5f' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1e3a5f' },
  footer: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  proceedBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedBtnDisabled: { backgroundColor: '#94a3b8' },
  proceedText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#f0f9ff', borderRadius: 10,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#bae6fd',
  },
  disclaimerText: { flex: 1, fontSize: 12, color: '#0c4a6e', lineHeight: 17 },
});
