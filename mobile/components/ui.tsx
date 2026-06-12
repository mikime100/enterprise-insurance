// ─── Shared animated UI primitives ────────────────────────────────────────────
import { ReactNode, useEffect, useRef } from 'react';
import {
  Animated, Easing, Pressable, Text, View, StyleSheet,
  ActivityIndicator, ViewStyle, StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, SHADOW, statusCfg, CLAIM_STAGES } from '../lib/theme';

// Fade + slide-up entrance. Stagger with `delay`.
export function FadeIn({ children, delay = 0, style, from = 18 }: {
  children: ReactNode; delay?: number; style?: StyleProp<ViewStyle>; from?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: translate }] }]}>
      {children}
    </Animated.View>
  );
}

// Pressable that springs down to 97% while pressed
export function Press({ children, onPress, style, disabled }: {
  children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled}
      onPressIn={() => to(0.97)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// Shimmering skeleton block
export function Skeleton({ height = 80, radius = R.md, style }: {
  height?: number; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[{ height, borderRadius: radius, backgroundColor: '#e3e9f1', opacity: pulse }, style]} />;
}

// Status pill — uses full claim status palette
export function StatusPill({ status, size = 'md' }: { status?: string; size?: 'sm' | 'md' }) {
  const cfg = statusCfg(status);
  const sm = size === 'sm';
  return (
    <View style={[ui.pill, { backgroundColor: cfg.bg, paddingHorizontal: sm ? 8 : 10, paddingVertical: sm ? 3 : 5 }]}>
      <Ionicons name={cfg.icon as any} size={sm ? 10 : 12} color={cfg.color} />
      <Text style={[ui.pillText, { color: cfg.color, fontSize: sm ? 10 : 11 }]}>{cfg.label}</Text>
    </View>
  );
}

// Horizontal progress tracker for a claim's lifecycle
export function ClaimProgress({ status }: { status?: string }) {
  const cfg = statusCfg(status);
  const step = cfg.step ?? 0;
  const isDead = status === 'denied' || status === 'closed';
  return (
    <View style={ui.progRow}>
      {CLAIM_STAGES.map((label, i) => {
        const done = i < step, current = i === step;
        const color = isDead && current ? C.red : done || current ? C.green : '#d3dbe6';
        return (
          <View key={label} style={ui.progItem}>
            <View style={ui.progTop}>
              {i > 0 && <View style={[ui.progLine, { backgroundColor: i <= step ? C.green : '#d3dbe6' }]} />}
              <View style={[ui.progDot, { backgroundColor: color, transform: [{ scale: current ? 1.25 : 1 }] }]}>
                {done && <Ionicons name="checkmark" size={9} color="#fff" />}
              </View>
              {i < CLAIM_STAGES.length - 1 && <View style={[ui.progLine, { backgroundColor: i < step ? C.green : '#d3dbe6' }]} />}
            </View>
            <Text style={[ui.progLabel, current && { color: isDead ? C.red : C.greenDark, fontWeight: '800' }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Primary CTA button
export function Button({ label, onPress, loading, disabled, icon, color = C.navy, variant = 'solid', style }: {
  label: string; onPress?: () => void; loading?: boolean; disabled?: boolean;
  icon?: string; color?: string; variant?: 'solid' | 'outline'; style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  const solid = variant === 'solid';
  return (
    <Press onPress={off ? undefined : onPress} disabled={off}
      style={[ui.btn, solid ? { backgroundColor: off ? '#a9b6c6' : color } : { backgroundColor: '#fff', borderWidth: 1.5, borderColor: off ? '#cbd5e1' : color }, style]}>
      {loading
        ? <ActivityIndicator color={solid ? '#fff' : color} />
        : <>
            {icon && <Ionicons name={icon as any} size={17} color={solid ? '#fff' : color} />}
            <Text style={[ui.btnText, { color: solid ? '#fff' : off ? '#94a3b8' : color }]}>{label}</Text>
          </>}
    </Press>
  );
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={ui.secRow}>
      <View style={{ flex: 1 }}>
        <Text style={ui.secTitle}>{title}</Text>
        {sub ? <Text style={ui.secSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <FadeIn style={ui.empty}>
      <View style={ui.emptyIcon}>
        <Ionicons name={icon as any} size={34} color={C.grayLight} />
      </View>
      <Text style={ui.emptyTitle}>{title}</Text>
      {sub ? <Text style={ui.emptySub}>{sub}</Text> : null}
    </FadeIn>
  );
}

const ui = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, alignSelf: 'flex-start' },
  pillText: { fontWeight: '700', textTransform: 'capitalize' },

  progRow: { flexDirection: 'row', marginTop: 4 },
  progItem: { flex: 1, alignItems: 'center' },
  progTop: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 18 },
  progLine: { flex: 1, height: 2.5 },
  progDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  progLabel: { fontSize: 8.5, color: C.grayLight, fontWeight: '600', marginTop: 4 },

  btn: {
    borderRadius: R.md, paddingVertical: 15, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  secRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, marginTop: 4 },
  secTitle: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  secSub: { fontSize: 12, color: C.grayLight, marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 44, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#edf1f7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.slate },
  emptySub: { fontSize: 13, color: C.grayLight, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 },
});
