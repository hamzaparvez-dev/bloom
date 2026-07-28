import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Flame } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

interface StreakCardProps {
  streakDays: number
  /** Optional line under the title — defaults to a generic encouragement. */
  subtitle?: string
}

export function StreakCard({ streakDays, subtitle }: StreakCardProps) {
  if (streakDays < 2) return null
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Flame size={22} color={ThemeColors.peach} strokeWidth={2.2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{"You're on a "}{streakDays}-day streak</Text>
        <Text style={styles.sub}>{subtitle ?? 'Keep it going—small logs add up.'}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: ThemeColors.orangeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', color: ThemeColors.textDark },
  sub: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, marginTop: 2 },
})
