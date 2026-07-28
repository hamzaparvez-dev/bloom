import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { Spacing } from '../../constants'

/** Figma node 141:1582 — Bloom / Peria sign-in */
const AuthColors = {
  gradientTop: '#FFE5E9',
  gradientMid: '#F7E3ED',
  gradientBottom: '#EDE8F5',
  title: '#000000',
  subtitle: '#808080',
  backBg: '#F9F9F9',
  backBorder: '#F1F1F1',
  card: '#FFFFFF',
  chevron: '#000000',
} as const

interface BloomAuthLayoutProps {
  title: string
  subtitle: string
  onBack?: () => void
  children: React.ReactNode
  /** Optional sticky footer (e.g. primary CTA). Omit when actions live inside scroll. */
  footer?: React.ReactNode
}

export function BloomAuthLayout({ title, subtitle, onBack, children, footer }: BloomAuthLayoutProps) {
  const insets = useSafeAreaInsets()

  return (
    <LinearGradient
      colors={[AuthColors.gradientTop, AuthColors.gradientMid, AuthColors.gradientBottom]}
      locations={[0, 0.45, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backFab, pressed && styles.backFabPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={AuthColors.chevron} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      <View style={[styles.card, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.cardColumn}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    width: '100%',
  },
  topBar: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  backFab: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: AuthColors.backBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AuthColors.backBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backFabPressed: {
    opacity: 0.88,
  },
  backPlaceholder: {
    height: 44,
  },
  card: {
    flex: 1,
    backgroundColor: AuthColors.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    marginHorizontal: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  cardColumn: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
  },
  cardHeader: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: AuthColors.title,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: AuthColors.subtitle,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingTop: Spacing.base,
  },
})
