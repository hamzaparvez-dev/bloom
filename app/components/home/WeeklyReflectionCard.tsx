import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

interface WeeklyReflectionCardProps {
  title: string
  summary: string
}

export function WeeklyReflectionCard({ title, summary }: WeeklyReflectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.summary}>{summary}</Text>
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
  title: { fontSize: 15, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 6 },
  summary: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, lineHeight: 20 },
})
