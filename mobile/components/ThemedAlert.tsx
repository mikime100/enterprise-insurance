// ─── Design-system alert dialogs ──────────────────────────────────────────────
// Drop-in replacement for React Native's Alert.alert. The native dialog looks
// foreign next to the Stitch design system, so `themedAlert(...)` renders a
// branded card instead: Archivo Narrow title, Work Sans body, green primary
// action, and an icon inferred from the content (success / error / warning /
// question). Call signature matches Alert.alert, so call sites swap 1:1.
//
// <ThemedAlertHost /> must be mounted once at the root (see app/_layout.tsx).
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, F } from '../lib/theme';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};
type AlertSpec = { title: string; message?: string; buttons: AlertButton[] };

// Module-level bridge so themedAlert stays imperative like Alert.alert.
let enqueueAlert: (spec: AlertSpec) => void = () => {};

export function themedAlert(title: string, message?: string, buttons?: AlertButton[]) {
  enqueueAlert({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] });
}

// Pick the icon/tint from the content so success reads green, failures red,
// and confirmations pose as questions — without changing any call site.
function variantOf(spec: AlertSpec) {
  const t = spec.title.toLowerCase();
  if (spec.buttons.some(b => b.style === 'destructive'))
    return { icon: 'warning' as const,              color: '#dc2626', bg: '#fee2e2' };
  if (/✓|success|submitted|accepted|activated|sent|saved|updated|added/.test(t))
    return { icon: 'checkmark-circle' as const,     color: C.greenDark, bg: '#dcfce7' };
  if (/error|fail|invalid|denied|rejected|expired|unavailable|could ?n/.test(t))
    return { icon: 'close-circle' as const,         color: '#dc2626', bg: '#fee2e2' };
  if (/missing|required|incomplete|attention/.test(t))
    return { icon: 'alert-circle' as const,         color: '#d97706', bg: '#fef3c7' };
  if (spec.buttons.length > 1)
    return { icon: 'help-circle' as const,          color: C.navy, bg: '#e3ecf7' };
  return   { icon: 'information-circle' as const,   color: C.navy, bg: '#e3ecf7' };
}

export function ThemedAlertHost() {
  const [queue, setQueue] = useState<AlertSpec[]>([]);

  useEffect(() => {
    enqueueAlert = spec => setQueue(q => [...q, spec]);
    return () => { enqueueAlert = () => {}; };
  }, []);

  const spec = queue[0];
  if (!spec) return null;

  const v = variantOf(spec);
  const stacked = spec.buttons.length > 2;

  const press = (b: AlertButton) => {
    setQueue(q => q.slice(1));
    // Let the dialog dismiss before onPress runs — it may navigate or open
    // another modal, which races the closing animation on Android otherwise.
    if (b.onPress) setTimeout(b.onPress, 120);
  };

  // Backdrop / hardware-back behave like the native dialog: trigger the cancel
  // button if there is one, or dismiss a plain single-button notice.
  const dismiss = () => {
    const cancel = spec.buttons.find(b => b.style === 'cancel');
    if (cancel) press(cancel);
    else if (spec.buttons.length === 1) press(spec.buttons[0]);
  };

  const btnStyle = (b: AlertButton, i: number) => {
    const primary = i === spec.buttons.length - 1 && b.style !== 'cancel';
    if (b.style === 'destructive') return [s.btn, { backgroundColor: '#dc2626' }];
    if (primary)                   return [s.btn, { backgroundColor: C.greenDark }];
    return [s.btn, s.btnOutline];
  };
  const btnTextStyle = (b: AlertButton, i: number) => {
    const primary = i === spec.buttons.length - 1 && b.style !== 'cancel';
    if (b.style === 'destructive' || primary) return [s.btnText, { color: '#fff' }];
    return [s.btnText, { color: C.slate }];
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <Pressable style={s.backdrop} onPress={dismiss}>
        <Pressable style={s.card} onPress={() => {}}>
          <View style={[s.iconWrap, { backgroundColor: v.bg }]}>
            <Ionicons name={v.icon} size={30} color={v.color} />
          </View>
          <Text style={s.title}>{spec.title}</Text>
          {!!spec.message && <Text style={s.message}>{spec.message}</Text>}
          <View style={[s.btnRow, stacked && { flexDirection: 'column' }]}>
            {spec.buttons.map((b, i) => (
              <TouchableOpacity key={`${b.text}-${i}`} style={[...btnStyle(b, i), stacked ? { width: '100%' } : { flex: 1 }]}
                onPress={() => press(b)} activeOpacity={0.85}>
                <Text style={btnTextStyle(b, i)} numberOfLines={1}>{b.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(10,22,40,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: R.xl,
    paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18, alignItems: 'center',
    shadowColor: '#0a1628', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  iconWrap: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title:   { fontSize: 19, fontFamily: F.head, color: C.ink, textAlign: 'center' },
  message: { fontSize: 14, fontFamily: F.body, color: C.slate, textAlign: 'center', lineHeight: 21, marginTop: 8 },
  btnRow:  { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  btn: {
    borderRadius: R.md, paddingVertical: 13, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line },
  btnText: { fontSize: 14.5, fontFamily: F.bodyBold },
});
