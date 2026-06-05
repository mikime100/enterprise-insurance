import { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    icon: 'shield-checkmark' as const,
    title: 'Welcome to\nEnterprise Insurance',
    subtitle: 'Comprehensive coverage for individuals, teams, and businesses — all in one place.',
    bg: '#0a1628',
    iconBg: '#1e3a5f',
    iconColor: '#60a5fa',
  },
  {
    key: '2',
    icon: 'heart' as const,
    title: 'Health & Life\nCoverage',
    subtitle: 'From routine checkups to major procedures, plans that protect what matters most.',
    bg: '#0d2137',
    iconBg: '#064e3b',
    iconColor: '#34d399',
  },
  {
    key: '3',
    icon: 'document-text' as const,
    title: 'Fast Claims\nProcessing',
    subtitle: 'Submit and track claims from your phone in minutes. No paperwork, no hassle.',
    bg: '#0a1628',
    iconBg: '#431407',
    iconColor: '#fb923c',
  },
  {
    key: '4',
    icon: 'people' as const,
    title: 'For Everyone',
    subtitle: 'Individual plans, HR group policies, and broker-managed accounts — one platform.',
    bg: '#0d2137',
    iconBg: '#2e1065',
    iconColor: '#c084fc',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    router.replace('/(auth)/welcome');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, backgroundColor: item.bg, paddingTop: insets.top + 40 }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={76} color={item.iconColor} />
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Enterprise Insurance</Text>
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Bottom controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Dot progress */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
            );
          })}
        </View>

        <View style={styles.btnRow}>
          {!isLast && (
            <TouchableOpacity onPress={finish} style={styles.skipBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={goNext}
            style={[styles.nextBtn, isLast && styles.nextBtnGreen]}
            activeOpacity={0.85}
          >
            <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Ionicons
              name={isLast ? 'arrow-forward-circle' : 'chevron-forward'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a1628' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 152,
    height: 152,
    borderRadius: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: { color: '#94a3b8', fontSize: 12, fontWeight: '600', letterSpacing: 0.8 },
  slideTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  slideSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
  },
  controls: {
    backgroundColor: '#0a1628',
    paddingHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipBtn: { paddingVertical: 16, paddingHorizontal: 8 },
  skipText: { color: '#475569', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnGreen: { backgroundColor: '#16a34a' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
