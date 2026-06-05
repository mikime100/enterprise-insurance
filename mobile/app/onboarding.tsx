import { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

type Slide = {
  key: string;
  gradient: readonly [string, string, string];
  accentColor: string;
  glowColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  tagIcon: keyof typeof Ionicons.glyphMap;
  tag: string;
  title: string;
  subtitle: string;
  stat: string;
  statLabel: string;
  decorCircle1: string;
  decorCircle2: string;
};

const SLIDES: Slide[] = [
  {
    key: '1',
    gradient: ['#0a1628', '#0f2d52', '#1a4a8a'],
    accentColor: '#60a5fa',
    glowColor: 'rgba(96,165,250,0.15)',
    icon: 'shield-checkmark',
    tagIcon: 'shield-half',
    tag: 'Trusted Protection',
    title: 'Welcome to\nEnterprise Insurance',
    subtitle: 'Comprehensive coverage for individuals, families, and enterprises — all in one platform.',
    stat: '50,000+',
    statLabel: 'People Protected',
    decorCircle1: 'rgba(37,99,235,0.25)',
    decorCircle2: 'rgba(96,165,250,0.10)',
  },
  {
    key: '2',
    gradient: ['#052e16', '#0f4c2a', '#166534'],
    accentColor: '#4ade80',
    glowColor: 'rgba(74,222,128,0.15)',
    icon: 'heart',
    tagIcon: 'medkit',
    tag: 'Health & Life',
    title: 'Coverage That\nCares For You',
    subtitle: 'From routine checkups to critical care — plans designed to protect what matters most.',
    stat: '1,200+',
    statLabel: 'Health Claims Settled',
    decorCircle1: 'rgba(22,163,74,0.3)',
    decorCircle2: 'rgba(74,222,128,0.12)',
  },
  {
    key: '3',
    gradient: ['#431407', '#7c2d12', '#9a3412'],
    accentColor: '#fb923c',
    glowColor: 'rgba(251,146,60,0.15)',
    icon: 'flash',
    tagIcon: 'document-text',
    tag: 'Fast Processing',
    title: 'Claims in\nMinutes, Not Months',
    subtitle: 'Submit a claim from your phone, track it live, and get settled — no paperwork, no hassle.',
    stat: '< 48 hrs',
    statLabel: 'Average Claim Time',
    decorCircle1: 'rgba(194,65,12,0.35)',
    decorCircle2: 'rgba(251,146,60,0.12)',
  },
  {
    key: '4',
    gradient: ['#1e1b4b', '#3730a3', '#4f46e5'],
    accentColor: '#a78bfa',
    glowColor: 'rgba(167,139,250,0.15)',
    icon: 'people',
    tagIcon: 'business',
    tag: 'For Everyone',
    title: 'Individual, Team\nor Enterprise',
    subtitle: 'Whether you self-enroll, are invited by HR, or registered by a broker — we have you covered.',
    stat: '30+',
    statLabel: 'Partner Institutions',
    decorCircle1: 'rgba(79,70,229,0.35)',
    decorCircle2: 'rgba(167,139,250,0.12)',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
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
  const current = SLIDES[currentIndex];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Full-bleed slide pager */}
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
        renderItem={({ item }) => <SlideItem item={item} insets={insets} />}
      />

      {/* Floating bottom controls — overlaid on top of slides */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 32, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity, backgroundColor: current.accentColor },
                ]}
              />
            );
          })}
        </View>

        {/* Skip + Next/Get Started */}
        <View style={styles.btnRow}>
          {!isLast && (
            <TouchableOpacity
              onPress={finish}
              style={styles.skipBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={goNext}
            style={[styles.nextBtn, { backgroundColor: current.accentColor }, isLast && styles.nextBtnWide]}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextText, { color: isLast ? '#fff' : '#000' }]}>
              {isLast ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={isLast ? 'arrow-forward-circle' : 'chevron-forward'}
              size={20}
              color={isLast ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SlideItem({ item, insets }: { item: Slide; insets: { top: number } }) {
  return (
    <View style={{ width, height }}>
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles — background depth */}
      <View style={[styles.decoCircle1, { backgroundColor: item.decorCircle1 }]} />
      <View style={[styles.decoCircle2, { backgroundColor: item.decorCircle2 }]} />
      <View style={[styles.decoCircle3, { backgroundColor: item.decorCircle1, opacity: 0.4 }]} />

      {/* Tag pill — top */}
      <View style={[styles.tagRow, { paddingTop: insets.top + 24 }]}>
        <View style={[styles.tagPill, { borderColor: `${item.accentColor}40`, backgroundColor: `${item.accentColor}18` }]}>
          <Ionicons name={item.tagIcon} size={13} color={item.accentColor} />
          <Text style={[styles.tagText, { color: item.accentColor }]}>{item.tag}</Text>
        </View>
      </View>

      {/* Central icon area */}
      <View style={styles.iconArea}>
        {/* Outer glow */}
        <View style={[styles.iconGlow, { backgroundColor: item.glowColor }]} />
        {/* Icon ring */}
        <View style={[styles.iconRing, { borderColor: `${item.accentColor}30` }]}>
          <View style={[styles.iconInner, { backgroundColor: `${item.accentColor}20` }]}>
            <Ionicons name={item.icon} size={72} color={item.accentColor} />
          </View>
        </View>

        {/* Floating stat card */}
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: item.accentColor }]}>{item.stat}</Text>
          <Text style={styles.statLabel}>{item.statLabel}</Text>
        </View>
      </View>

      {/* Bottom text overlay with gradient fade */}
      <LinearGradient
        colors={['transparent', `${item.gradient[0]}cc`, item.gradient[0]]}
        style={styles.textOverlay}
        pointerEvents="none"
      >
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        {/* Extra padding so text clears the controls */}
        <View style={{ height: 120 }} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a1628' },

  // Decorative background shapes
  decoCircle1: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    top: -80,
    right: -100,
  },
  decoCircle2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: height * 0.3,
    left: -80,
  },
  decoCircle3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: height * 0.25,
    right: -40,
  },

  // Tag
  tagRow: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  // Icon area
  iconArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  iconGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  iconRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(12px)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // Bottom text overlay
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 0,
  },
  slideTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f8fafc',
    lineHeight: 42,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.60)',
    lineHeight: 24,
  },

  // Controls — floats over the slide
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipBtn: { paddingVertical: 16, paddingHorizontal: 4 },
  skipText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnWide: { flex: 1 },
  nextText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
