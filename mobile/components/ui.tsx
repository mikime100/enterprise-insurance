// ─── Shared animated UI primitives ────────────────────────────────────────────
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Pressable, Text, View, StyleSheet,
  ActivityIndicator, ViewStyle, StyleProp, Modal, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, F, statusCfg, CLAIM_STAGES } from '../lib/theme';

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

// Style props that size or position an element within its parent. These must be
// applied to the Pressable, because that is the node the parent lays out — the
// animated view inside it is not. Leaving `flex` or a percentage `width` on the
// inner view silently does nothing: the row collapses to content width, and a
// percentage resolves against an auto-sized parent instead of the real grid.
const LAYOUT_PROPS = new Set([
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf',
  'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex',
]);

// Pressable that springs down to 97% while pressed
export function Press({ children, onPress, style, disabled }: {
  children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  // Split the caller's style: layout goes to the Pressable, everything visual
  // (background, padding, border, shadow) stays on the animated view so the
  // press-scale still transforms the card the user sees.
  const flat = StyleSheet.flatten(style) as Record<string, any> | undefined;
  const layout: Record<string, any> = {};
  const visual: Record<string, any> = {};
  if (flat) {
    for (const key of Object.keys(flat)) {
      (LAYOUT_PROPS.has(key) ? layout : visual)[key] = flat[key];
    }
  }

  return (
    <Pressable onPress={onPress} disabled={disabled} style={layout}
      onPressIn={() => to(0.97)} onPressOut={() => to(1)}>
      {/* flexGrow fills the Pressable when siblings in a row stretch it taller,
          so tiles in the same row end up visually equal height. */}
      <Animated.View style={[visual, { flexGrow: 1, transform: [{ scale }] }]}>{children}</Animated.View>
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
// Default CTA color is green — per the design system, green drives all
// primary actions; navy is reserved for headers, heroes, and navigation.
export function Button({ label, onPress, loading, disabled, icon, color = C.greenDark, variant = 'solid', style }: {
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

// ─── Date picker field ────────────────────────────────────────────────────────
// A tap-to-open Day / Month / Year picker. Emits a zero-padded `YYYY-MM-DD`
// string, so callers never have to parse free-form text or worry about the user
// typing `2000-2-6`. Defaults to past dates (birth dates, incident dates).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');

// A single scrollable column of options. Defined at module scope so it keeps a
// stable identity across re-renders — otherwise the ScrollView would remount on
// every tap and jump back to the top.
function PickerColumn({ items, sel, render, onSelect }: {
  items: number[]; sel: number; render: (n: number) => string; onSelect: (n: number) => void;
}) {
  return (
    <ScrollView style={dp.col} contentContainerStyle={{ paddingVertical: 6 }} showsVerticalScrollIndicator={false}>
      {items.map(n => {
        const active = n === sel;
        return (
          <TouchableOpacity key={n} style={[dp.opt, active && dp.optSel]} onPress={() => onSelect(n)} activeOpacity={0.7}>
            <Text style={[dp.optText, active && dp.optTextSel]}>{render(n)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function DateField({ value, onChange, placeholder = 'Select date', minYear, maxDate }: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minYear?: number;
  maxDate?: Date;
}) {
  const today = new Date();
  const maxD = maxDate ?? today;
  const maxY = maxD.getFullYear();
  const minY = minYear ?? maxY - 100;

  const parse = (v?: string): [number, number, number] | null =>
    v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? (v.split('-').map(Number) as [number, number, number]) : null;

  const [open, setOpen] = useState(false);
  const parsed = parse(value);
  const [y, setY] = useState(parsed ? parsed[0] : 2000);
  const [m, setM] = useState(parsed ? parsed[1] : 1); // 1-12
  const [d, setD] = useState(parsed ? parsed[2] : 1);

  const daysInMonth = new Date(y, m, 0).getDate();
  const dd = Math.min(d, daysInMonth); // keep the day valid as month/year change

  const years = [];
  for (let yy = maxY; yy >= minY; yy--) years.push(yy);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const openPicker = () => {
    const p = parse(value);
    if (p) { setY(p[0]); setM(p[1]); setD(p[2]); }
    setOpen(true);
  };

  const confirm = () => {
    // Clamp to maxDate so a future birth/incident date can't be chosen.
    let picked = new Date(y, m - 1, dd);
    if (picked > maxD) picked = maxD;
    onChange(`${picked.getFullYear()}-${pad2(picked.getMonth() + 1)}-${pad2(picked.getDate())}`);
    setOpen(false);
  };

  const label = parsed ? `${parsed[2]} ${MONTHS[parsed[1] - 1]} ${parsed[0]}` : placeholder;

  return (
    <>
      <TouchableOpacity style={dp.field} onPress={openPicker} activeOpacity={0.7}>
        <Text style={[dp.fieldText, !parsed && dp.fieldPlaceholder]}>{label}</Text>
        <Ionicons name="calendar-outline" size={18} color={C.gray} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={dp.backdrop}>
          <View style={dp.sheet}>
            <View style={dp.handle} />
            <Text style={dp.title}>Select date</Text>
            <View style={dp.cols}>
              <PickerColumn items={days}   sel={dd} render={n => String(n)}          onSelect={setD} />
              <PickerColumn items={[1,2,3,4,5,6,7,8,9,10,11,12]} sel={m} render={n => MONTHS[n - 1]} onSelect={setM} />
              <PickerColumn items={years}  sel={y}  render={n => String(n)}          onSelect={setY} />
            </View>
            <View style={dp.actions}>
              <Button label="Cancel" variant="outline" color={C.gray} onPress={() => setOpen(false)} style={{ flex: 1 }} />
              <Button label="Confirm" icon="checkmark" onPress={confirm} style={{ flex: 1.6 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const dp = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: R.md, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  fieldText: { fontSize: 15, color: C.ink, fontFamily: F.body },
  fieldPlaceholder: { color: C.grayLight },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontFamily: F.head, color: C.ink, textAlign: 'center', marginBottom: 12 },
  cols: { flexDirection: 'row', gap: 8, height: 220 },
  col: { flex: 1, backgroundColor: '#fff', borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  opt: { paddingVertical: 11, alignItems: 'center', marginHorizontal: 6, borderRadius: R.sm },
  optSel: { backgroundColor: '#f0fdf4' },
  optText: { fontSize: 15, color: C.slate, fontFamily: F.body },
  optTextSel: { color: C.greenDark, fontFamily: F.bodyBold },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});

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
  btnText: { fontSize: 15, fontFamily: F.bodyBold, letterSpacing: 0.2 },

  secRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, marginTop: 4 },
  secTitle: { fontSize: 19, fontFamily: F.head, color: C.ink, letterSpacing: -0.2 },
  secSub: { fontSize: 12, fontFamily: F.body, color: C.grayLight, marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 44, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#edf1f7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.slate },
  emptySub: { fontSize: 13, color: C.grayLight, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 },
});
