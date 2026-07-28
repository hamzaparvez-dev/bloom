import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AIInsight } from '../../components/ui/AIInsight'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

/** Intensity 0–3 per cell */
const GRID: { name: string; cells: number[] }[] = [
  { name: 'Cramps', cells: [3, 2, 1, 0, 0, 1, 2] },
  { name: 'Headache', cells: [1, 0, 0, 2, 0, 0, 1] },
  { name: 'Bloating', cells: [2, 3, 1, 0, 0, 0, 1] },
  { name: 'Fatigue', cells: [1, 1, 2, 3, 2, 1, 2] },
  { name: 'Mood', cells: [0, 0, 1, 2, 1, 2, 3] },
]

const FREQ: { name: string; pct: number }[] = [
  { name: 'Fatigue', pct: 87 },
  { name: 'Cramps', pct: 72 },
  { name: 'Bloating', pct: 65 },
  { name: 'Headache', pct: 48 },
]

function cellColor(level: number): string {
  if (level <= 0) return ThemeColors.border
  if (level === 1) return ThemeColors.pinkSurface
  if (level === 2) return ThemeColors.primary + '99'
  return ThemeColors.primary
}

export function SymptomPatternsScreen() {
  const insets = useSafeAreaInsets()

  const facts = useMemo(
    () => `topSymptoms:${FREQ.map((f) => `${f.name}:${f.pct}%`).join('; ')}`,
    [],
  )

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Symptom patterns</Text>

      <AIInsight
        insightType="fertility"
        screenKey="symptom-patterns"
        fallbackText="Fatigue shows up most often in your sample week—gentle pacing may help on heavier days."
        factsLine={facts}
        style={{ marginBottom: ThemeSpacing['5'] }}
      />

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.symLabelSpacer} />
          {DAYS.map((d, i) => (
            <Text key={`${d}-${i}`} style={styles.dayH}>
              {d}
            </Text>
          ))}
        </View>
        {GRID.map((row) => (
          <View key={row.name} style={styles.gridRow}>
            <Text style={styles.symName} numberOfLines={1}>
              {row.name}
            </Text>
            {row.cells.map((c, i) => (
              <View key={i} style={[styles.cell, { backgroundColor: cellColor(c) }]}>
                {c > 0 ? <Text style={styles.cellNum}>{c}</Text> : null}
              </View>
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.section}>Most frequent</Text>
      {FREQ.map((f) => (
        <View key={f.name} style={styles.freqRow}>
          <View style={styles.freqTop}>
            <Text style={styles.freqName}>{f.name}</Text>
            <Text style={styles.freqPct}>{f.pct}%</Text>
          </View>
          <View style={styles.freqTrack}>
            <View style={[styles.freqFill, { width: `${f.pct}%` }]} />
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const CELL = 34

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 8 },

  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    marginBottom: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingLeft: 72 },
  symLabelSpacer: { width: 0 },
  dayH: { width: CELL, textAlign: 'center', fontSize: 12, fontWeight: '600', color: ThemeColors.textMid },
  gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  symName: { width: 68, fontSize: 14, fontWeight: '600', color: ThemeColors.textDark, marginRight: 4 },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 8,
    marginHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNum: { fontSize: 12, fontWeight: '700', color: ThemeColors.textDark },

  section: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 16 },
  freqRow: { marginBottom: 16 },
  freqTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  freqName: { fontSize: 15, fontWeight: '600', color: ThemeColors.textDark },
  freqPct: { fontSize: 15, fontWeight: '700', color: ThemeColors.textMid },
  freqTrack: { height: 8, borderRadius: 4, backgroundColor: ThemeColors.border, overflow: 'hidden' },
  freqFill: { height: 8, borderRadius: 4, backgroundColor: ThemeColors.primary },
})
