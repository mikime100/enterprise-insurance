import { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Vertical zones (fraction of screen height)
const TAG_TOP       = 0.07;   // tag pill
const ICON_CENTER   = 0.38;   // center of the icon ring
const TEXT_BOTTOM   = 148;    // px from bottom (above controls)

type Slide = {
  key: string;
  image: number; // require() returns a number for local assets in React Native
  overlayColors: readonly [string, string, string];
  accentColor: string;
  tagIcon: keyof typeof Ionicons.glyphMap;
  tag: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  stat: string;
  statLabel: string;
};

const SLIDES: Slide[] = [
  {
    key: '1',
    image: require('../assets/slide1.png'),
    overlayColors: ['rgba(10,22,40,0.35)', 'rgba(10,22,40,0.55)', 'rgba(10,22,40,0.92)'],
    accentColor: '#60a5fa',
    tagIcon: 'shield-half',
    tag: 'Trusted Protection',
    icon: 'shield-checkmark',
    title: 'Welcome to\nEnterprise Insurance',
    subtitle: 'Comprehensive coverage for individuals, families, and enterprises — all in one platform.',
    stat: '50,000+',
    statLabel: 'People Protected',
  },
  {
    key: '2',
    image: require('../assets/slide2.png'),
    overlayColors: ['rgba(5,46,22,0.30)', 'rgba(5,46,22,0.55)', 'rgba(5,46,22,0.92)'],
    accentColor: '#4ade80',
    tagIcon: 'medkit',
    tag: 'Health & Life',
    icon: 'heart',
    title: 'Coverage That\nCares For You',
    subtitle: 'From routine checkups to critical care — plans designed to protect what matters most.',
    stat: '1,200+',
    statLabel: 'Health Claims Settled',
  },
  {
    key: '3',
    image: require('../assets/slide3.png'),
    overlayColors: ['rgba(67,20,7,0.30)', 'rgba(67,20,7,0.55)', 'rgba(67,20,7,0.92)'],
    accentColor: '#fb923c',
    tagIcon: 'document-text',
    tag: 'Fast Processing',
    icon: 'flash',
    title: 'Claims in\nMinutes, Not Months',
    subtitle: 'Submit a claim from your phone, track it live, and get settled — no paperwork, no hassle.',
    stat: '< 48 hrs',
    statLabel: 'Average Claim Time',
  },
  {
    key: '4',
    image: require('../assets/slide4.png'),
    overlayColors: ['rgba(30,27,75,0.30)', 'rgba(30,27,75,0.55)', 'rgba(30,27,75,0.92)'],
    accentColor: '#a78bfa',
    tagIcon: 'business',
    tag: 'For Everyone',
    icon: 'people',
    title: 'Individual, Team\nor Enterprise',
    subtitle: 'Whether you self-enroll, are invited by HR, or registered by a broker — we have you covered.',
    stat: '30+',
    statLabel: 'Partner Institutions',
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
    // @ts-ignore — welcome route added after typed-routes generation
    router.replace('/(auth)/welcome');
  };

  const isLast = currentIndex === SLIDES.length - 1;
  const accent = SLIDES[currentIndex].accentColor;

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
        renderItem={({ item }) => (
          <SlideItem item={item} insets={insets} />
        )}
      />

      {/* Controls — float above the slide */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange, outputRange: [8, 32, 8], extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: accent }]}
              />
            );
          })}
        </View>

        <View style={styles.btnRow}>
          {!isLast && (
            <TouchableOpacity
              onPress={finish}
              style={styles.skipBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={goNext}
            style={[styles.nextBtn, { backgroundColor: '#16a34a' }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextText, { color: '#fff' }]}>
              {isLast ? 'Get Started' : 'Continue'}
            </Text>
            <Ionicons
              name={isLast ? 'arrow-forward-circle' : 'arrow-forward'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SlideItem({ item, insets }: { item: Slide; insets: { top: number } }) {
  const iconTop = height * ICON_CENTER - 80; // center of ring = ICON_CENTER, ring height = 160

  return (
    <ImageBackground
      source={item.image}
      style={{ width, height }}
      resizeMode="cover"
    >
      {/* Dark gradient overlay — light at top, heavy at bottom */}
      <LinearGradient
        colors={item.overlayColors}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Tag pill — top */}
      <View style={[styles.tagWrap, { top: insets.top + height * TAG_TOP }]}>
        <View style={[styles.tagPill, {
          borderColor: `${item.accentColor}90`,
          backgroundColor: 'rgba(0,0,0,0.52)',
        }]}>
          <Ionicons name={item.tagIcon} size={13} color={item.accentColor} />
          <Text style={[styles.tagText, { color: item.accentColor }]}>{item.tag}</Text>
        </View>
      </View>

      {/* Icon — absolute center, stays clear of text */}
      <View style={[styles.iconWrap, { top: iconTop }]}>
        {/* Ambient glow */}
        <View style={[styles.iconGlow, { backgroundColor: `${item.accentColor}18` }]} />
        {/* Outer ring */}
        <View style={[styles.iconRing, { borderColor: `${item.accentColor}35` }]}>
          {/* Inner fill */}
          <View style={[styles.iconInner, { backgroundColor: `${item.accentColor}25` }]}>
            <Ionicons name={item.icon} size={68} color={item.accentColor} />
          </View>
        </View>
        {/* Floating stat chip */}
        <View style={[styles.statChip, { borderColor: `${item.accentColor}30` }]}>
          <Text style={[styles.statValue, { color: item.accentColor }]}>{item.stat}</Text>
          <Text style={styles.statLabel}>{item.statLabel}</Text>
        </View>
      </View>

      {/* Text — pinned above controls, never overlaps icon */}
      <View style={[styles.textWrap, { bottom: TEXT_BOTTOM }]}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Tag
  tagWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  tagText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  // Icon zone
  iconWrap: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
  },
  iconRing: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  iconInner: {
    width: 130, height: 130, borderRadius: 65,
    alignItems: 'center', justifyContent: 'center',
  },
  statChip: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },

  // Text
  textWrap: {
    position: 'absolute', left: 28, right: 28,
  },
  title: {
    fontSize: 34, fontWeight: '800', color: '#fff',
    lineHeight: 42, marginBottom: 10, letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },

  // Controls
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 28, paddingTop: 16,
  },
  dots: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skipBtn: { paddingVertical: 16, paddingHorizontal: 4 },
  skipText: { color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1, borderRadius: 16, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
