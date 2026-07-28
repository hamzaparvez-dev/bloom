import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

interface PeriActionCardProps {
  title: string
  items: string[]
}

export function PeriActionCard({ title, items }: PeriActionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.map((line) => (
        <View key={line} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.line} numberOfLines={2}>
            {line}
          </Text>
        </View>
      ))}
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
  title: { fontSize: 16, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bullet: { fontSize: 16, fontWeight: '700', color: ThemeColors.primary, lineHeight: 22 },
  line: { flex: 1, fontSize: 15, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 22 },
})
