import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format, parseISO } from 'date-fns'
import { SimpleBarChart, type BarDatum } from '../../components/insights/InsightCharts'
import { AIInsight } from '../../components/ui/AIInsight'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { fetchDailyLogsSeries, moodToScore } from '../../lib/charts-from-logs'
import { useAuth } from '../../providers/AuthProvider'

const PURPLE = '#8B5CF6'
const FETCH_DAYS = 21

const PHASES: { name: string; score: string; pct: number; color: string }[] = [
  { name: 'Menstrual', score: '5.2/10', pct: 52, color: ThemeColors.primary },
  { name: 'Follicular', score: '7.8/10', pct: 78, color: '#10B981' },
  { name: 'Ovulation', score: '9.1/10', pct: 91, color: PURPLE },
  { name: 'Luteal', score: '6.4/10', pct: 64, color: ThemeColors.peach },
]

function rowsToMoodBars(rows: Awaited<ReturnType<typeof fetchDailyLogsSeries>>): BarDatum[] {
  return rows.map((r, i) => {
    const score = moodToScore(r.mood)
    let label = ''
    try {
      label = format(parseISO(`${r.date}T12:00:00`), 'EEE')
    } catch {
      label = String(i + 1)
    }
    return {
      id: r.date,
      label,
      value: score,
      topLabel: score > 0 ? score.toFixed(1) : undefined,
    }
  })
}

export function InsightMoodPatternsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bars, setBars] = useState<BarDatum[]>([])

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setBars([])
      setLoading(false)
      return
    }
    setLoading(true)
    const rows = await fetchDailyLogsSeries(uid, FETCH_DAYS)
    setBars(rowsToMoodBars(rows))
    setLoading(false)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const facts = useMemo(() => `mood0to10:${bars.map((b) => b.value).join(',')}`, [bars])

  const contextLine = useMemo(() => {
    const scored = bars.filter((b) => b.value > 0)
    if (scored.length < 2) return 'Scores are gentle estimates from your daily mood check-ins (0–10).'
    const last = scored[scored.length - 1]?.value ?? 0
    const prev = scored[scored.length - 2]?.value ?? last
    if (last > prev + 0.5) return 'Your most recent days look a little brighter than the few before.'
    if (last + 0.5 < prev) return 'Recent days look a bit heavier—small steps still count.'
    return 'Your mood line is fairly steady across these days.'
  }, [bars])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Mood patterns</Text>

      <AIInsight
        insightType="mood"
        screenKey="mood-patterns"
        fallbackText="Many people feel a lift around ovulation and a gentler dip before their period—your chart helps you spot your own rhythm."
        factsLine={facts}
        style={{ marginBottom: ThemeSpacing['5'] }}
      />

      {loading ?
        <View style={styles.loader}>
          <ActivityIndicator color={PURPLE} />
        </View>
      : (
        <SimpleBarChart
          title="Mood trend from your logs"
          subtitle="Up to three weeks of check-ins · scroll for earlier days · tap a bar for its score"
          contextLine={contextLine}
          data={bars.length > 0 ? bars : [{ id: 'empty', label: '—', value: 0 }]}
          maxValue={10}
          barColor={PURPLE}
          height={118}
          autoFooter
        />
      )}

      <Text style={styles.section}>Mood by cycle phase</Text>
      {PHASES.map((p) => (
        <View key={p.name} style={styles.phaseCard}>
          <View style={styles.phaseTop}>
            <Text style={styles.phaseName}>{p.name}</Text>
            <Text style={styles.phaseScore}>{p.score}</Text>
          </View>
          <View style={styles.phaseTrack}>
            <View style={[styles.phaseFill, { width: `${p.pct}%`, backgroundColor: p.color }]} />
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 8 },
  loader: { paddingVertical: 32, alignItems: 'center' },
  section: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginTop: 28, marginBottom: 16 },
  phaseCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  phaseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  phaseName: { fontSize: 15, fontWeight: '700', color: ThemeColors.textDark },
  phaseScore: { fontSize: 14, fontWeight: '700', color: ThemeColors.textMid },
  phaseTrack: { height: 8, borderRadius: 4, backgroundColor: ThemeColors.border, overflow: 'hidden' },
  phaseFill: { height: 8, borderRadius: 4 },
})
