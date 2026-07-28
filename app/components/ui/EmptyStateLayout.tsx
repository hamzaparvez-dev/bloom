import React from 'react'
import type { ImageSourcePropType } from 'react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

const RING_OUTER = 200
const RING_INNER = 168

interface EmptyStateLayoutProps {
  /** Icon centered inside the gradient circle (used when `illustration` is omitted). */
  icon?: React.ReactNode
  /** Optional generated art; when set, replaces `icon` inside the hero ring. */
  illustration?: ImageSourcePropType
  title: string
  description: string
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  /** Extra content between description and primary (e.g. checklist) */
  children?: React.ReactNode
}

export function EmptyStateLayout({
  icon,
  illustration,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
}: EmptyStateLayoutProps) {
  const hero = illustration ? (
    <Image
      source={illustration}
      style={styles.heroImage}
      contentFit="contain"
      transition={160}
      accessibilityIgnoresInvertColors
    />
  ) : (
    icon ?? null
  )

  return (
    <View style={styles.wrap}>
      <View style={styles.ringOuter}>
        <View style={styles.dashed} />
        <LinearGradient
          colors={[ThemeColors.pinkSurface, '#FFFFFF']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.ringInner}
        >
          {hero}
        </LinearGradient>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children}
      <Pressable onPress={onPrimary} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.92 }]}>
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </Pressable>
      {secondaryLabel && onSecondary ? (
        <Pressable onPress={onSecondary} style={styles.secondary}>
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ThemeSpacing.pagePad,
    paddingVertical: 24,
  },
  ringOuter: {
    width: RING_OUTER,
    height: RING_OUTER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  dashed: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RING_OUTER / 2,
    borderWidth: 2,
    borderColor: ThemeColors.primary,
    opacity: 0.35,
    borderStyle: 'dashed',
  },
  ringInner: {
    width: RING_INNER,
    height: RING_INNER,
    borderRadius: RING_INNER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  heroImage: {
    width: RING_INNER - 24,
    height: RING_INNER - 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: ThemeColors.textDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 320,
  },
  primary: {
    alignSelf: 'stretch',
    maxWidth: 340,
    backgroundColor: ThemeColors.primary,
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
  secondary: { paddingVertical: 16 },
  secondaryText: { fontSize: 16, fontWeight: '600', color: ThemeColors.lavender },
})
