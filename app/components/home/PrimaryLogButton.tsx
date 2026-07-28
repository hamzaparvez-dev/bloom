import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

interface PrimaryLogButtonProps {
  title: string
  /** Omit or pass empty string to hide subtitle row */
  subtitle?: string
  onPress?: () => void
  variant?: 'filled' | 'outline'
}

export function PrimaryLogButton({
  title,
  subtitle = 'Period · Mood · Symptoms',
  onPress,
  variant = 'filled',
}: PrimaryLogButtonProps) {
  const isFilled = variant === 'filled'
  const showSub = subtitle.trim().length > 0
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        isFilled ? styles.filled : styles.outline,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, !isFilled && styles.titleOutline]}>{title}</Text>
        {showSub ? (
          <Text style={[styles.sub, !isFilled && styles.subOutline]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={isFilled ? ThemeColors.primary : ThemeColors.textMid} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: ThemeRadius.card,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 52,
  },
  filled: {
    backgroundColor: ThemeColors.surface,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  outline: {
    backgroundColor: ThemeColors.pinkSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.primary,
  },
  textCol: { flex: 1, paddingRight: 8 },
  title: { fontSize: 17, fontWeight: '700', color: ThemeColors.textDark },
  titleOutline: { color: ThemeColors.textDark },
  sub: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, marginTop: 2 },
  subOutline: { color: ThemeColors.textMid },
})
