import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

interface PeriInsightCardProps {
  title: string
  description: string
  loading?: boolean
}

export function PeriInsightCard({ title, description, loading }: PeriInsightCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc} numberOfLines={4}>
        {description}
      </Text>
      {loading ? <ActivityIndicator style={styles.spinner} color={ThemeColors.lavender} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  title: { fontSize: 13, fontWeight: '700', color: ThemeColors.lavender, marginBottom: 6, letterSpacing: 0.3 },
  desc: { fontSize: 16, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 22 },
  spinner: { marginTop: 10, alignSelf: 'flex-start' },
})
