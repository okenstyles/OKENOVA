import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import colors from '@/constants/colors';

export const C = colors.dark;

export function AppScreen({ children, contentStyle }: PropsWithChildren<{ contentStyle?: object }>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screenContent, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <Image
        source={require('../assets/images/okenova-mark.png')}
        style={{ width: compact ? 34 : 46, height: compact ? 34 : 46 }}
        contentFit="contain"
        accessibilityLabel="OKENOVΛ emblem"
      />
      <View>
        <Text style={styles.wordmark}>OKENOV<Text style={styles.lambda}>Λ</Text></Text>
        {!compact && <Text style={styles.tagline}>CONNECT • GROW • SUCCEED</Text>}
      </View>
    </View>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.heading}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={styles.pageTitle}>{title}</Text>
      {description ? <Text style={styles.pageDescription}>{description}</Text> : null}
    </View>
  );
}

export function Panel({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function GradientPanel({ children, style }: PropsWithChildren<{ style?: object }>) {
  return (
    <LinearGradient
      colors={['#142743', '#11172A', '#17152C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientPanel, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  compact = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'quiet' | 'outline';
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        compact && styles.buttonCompact,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? C.primaryForeground : C.primary} /> : (
        <Text style={[styles.buttonText, variant === 'primary' ? styles.buttonTextPrimary : styles.buttonTextQuiet]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  multiline = false,
  style,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={C.mutedForeground}
        selectionColor={C.primary}
        style={[styles.field, multiline && styles.fieldMultiline, style]}
      />
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll('_', ' ');
  const tone = status === 'completed' ? C.success : status === 'in_progress' ? C.primary : C.warning;
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${tone}1A`, borderColor: `${tone}44` }]}>
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
      <Text style={[styles.statusText, { color: tone }]}>{label}</Text>
    </View>
  );
}

export function LoadingPanel({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator size="small" color={C.primary} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.stateBox, styles.errorBox]}>
      <Text style={styles.errorTitle}>Couldn’t load this section</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? <AppButton label="Try again" onPress={onRetry} variant="quiet" compact /> : null}
    </View>
  );
}

export function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateText}>{detail}</Text>
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function getErrorMessage(error: unknown, fallback = 'Please try again.') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const detail = error.error;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  screenContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 30, gap: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 18, letterSpacing: 1.2 },
  lambda: { color: C.primary },
  tagline: { color: '#75BFE8', fontFamily: 'DMSansBold', fontSize: 8, letterSpacing: 1.2, marginTop: 2 },
  heading: { gap: 6, paddingTop: 2 },
  eyebrow: { color: C.primary, fontFamily: 'DMSansBold', fontSize: 10, letterSpacing: 1.6 },
  pageTitle: { color: C.foreground, fontFamily: 'SpaceGroteskBold', fontSize: 28, lineHeight: 34 },
  pageDescription: { color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 13, lineHeight: 19, maxWidth: 420 },
  panel: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  gradientPanel: { borderRadius: 20, borderWidth: 1, borderColor: '#3E67A34A', padding: 18, gap: 12 },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_primary: { backgroundColor: C.primary },
  button_quiet: { backgroundColor: '#1A2538', borderWidth: 1, borderColor: C.border },
  button_outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3A5C88' },
  buttonCompact: { minHeight: 40, paddingHorizontal: 13 },
  buttonDisabled: { opacity: 0.48 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonText: { fontFamily: 'DMSansBold', fontSize: 13 },
  buttonTextPrimary: { color: C.primaryForeground },
  buttonTextQuiet: { color: C.foreground },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: '#AAB7CD', fontFamily: 'DMSansMedium', fontSize: 12 },
  field: {
    minHeight: 48,
    color: C.foreground,
    backgroundColor: '#0C1322',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans',
    fontSize: 14,
  },
  fieldMultiline: { minHeight: 98, textAlignVertical: 'top' },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'DMSansBold', fontSize: 10, textTransform: 'capitalize' },
  stateBox: { alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 100, padding: 18 },
  stateText: { color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  errorBox: { borderRadius: 16, borderWidth: 1, borderColor: '#81424A', backgroundColor: '#24151C' },
  errorTitle: { color: '#FFC2C6', fontFamily: 'DMSansBold', fontSize: 13, textAlign: 'center' },
  emptyBox: { alignItems: 'center', gap: 6, borderRadius: 15, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', padding: 18 },
  emptyTitle: { color: C.foreground, fontFamily: 'DMSansBold', fontSize: 13, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 },
  sectionAction: { color: C.primary, fontFamily: 'DMSansBold', fontSize: 11 },
});
