import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

interface InsightStatRowProps {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  label: string
  value: string
  badge?: string
  badgeTone?: 'mint' | 'peach' | 'lavender'
}

export function InsightStatRow({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  badge,
  badgeTone = 'lavender',
}: InsightStatRowProps) {
  const badgeBg =
    badgeTone === 'mint' ? ThemeColors.greenBg : badgeTone === 'peach' ? ThemeColors.orangeBg : '#F0EAFF'
  const badgeColor =
    badgeTone === 'mint' ? ThemeColors.mint : badgeTone === 'peach' ? ThemeColors.peach : ThemeColors.lavender

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 14,
    gap: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  iconWrap: { width: 44, height: 44, borderRadius: ThemeRadius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  label: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, marginBottom: 2 },
  value: { fontSize: 17, fontWeight: '700', color: ThemeColors.textDark },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: ThemeRadius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
})
