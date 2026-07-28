import React from 'react'
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import type { PeriStatModel } from '../../lib/perimenopause-from-logs'
import { periTrendColors } from '../../lib/perimenopause-from-logs'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface PeriStatCardProps {
  model: PeriStatModel
  expanded: boolean
  onToggleExpand: () => void
}

export function PeriStatCard({ model, expanded, onToggleExpand }: PeriStatCardProps) {
  const accent = periTrendColors[model.trend.sentiment]

  return (
    <Pressable
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        onToggleExpand()
      }}
      style={({ pressed }) => [styles.card, { borderLeftColor: accent }, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.topRow}>
        <View style={styles.topText}>
          <Text style={styles.title}>{model.title}</Text>
          <Text style={styles.value}>{model.value}</Text>
          <Text style={[styles.trend, { color: accent }]}>
            {model.trend.arrow} {model.trend.label}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={ThemeColors.textMid} strokeWidth={2} />
        ) : (
          <ChevronDown size={20} color={ThemeColors.textMid} strokeWidth={2} />
        )}
      </View>
      <Text style={styles.insight} numberOfLines={3}>
        {model.insight}
      </Text>
      <Text style={styles.action} numberOfLines={2}>
        {model.action}
      </Text>
      {expanded ? (
        <View style={styles.expand}>
          <Text style={styles.expandTitle}>Last 7 days</Text>
          {model.last7Lines.map((line, i) => (
            <Text key={`${model.key}-${i}`} style={styles.expandLine} numberOfLines={2}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </Pressable>
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
    borderLeftWidth: 4,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  topText: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid, marginBottom: 4 },
  value: { fontSize: 17, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 4 },
  trend: { fontSize: 14, fontWeight: '700' },
  insight: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginTop: 10, lineHeight: 20 },
  action: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark, marginTop: 6 },
  expand: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ThemeColors.border,
  },
  expandTitle: { fontSize: 12, fontWeight: '700', color: ThemeColors.textLight, marginBottom: 6 },
  expandLine: { fontSize: 12, fontWeight: '500', color: ThemeColors.textMid, marginBottom: 4, lineHeight: 17 },
})
