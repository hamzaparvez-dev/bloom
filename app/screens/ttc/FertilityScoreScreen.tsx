import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Lightbulb, Pill, Thermometer } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { AIInsight } from '../../components/ui/AIInsight'
import { useAuth } from '../../providers/AuthProvider'
import { TTC_GREEN, TTC_GREEN_BG, TTC_GREEN_DARK } from './constants'
import {
  buildImprovePills,
  buildScoreMetrics,
  buildTtcFactsLine,
  computeOverallFertilityScore,
  buildTtcFactors,
  deriveEngagementTier,
  createDefaultTtcSignals,
  deriveTtcCycleContext,
  fetchTtcPersonalizationSignals,
  type TtcPersonalizationSignals,
} from '../../lib/ttc-personalization'

const PILL_ICONS: LucideIcon[] = [Pill, Thermometer, Lightbulb]

export function FertilityScoreScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [signals, setSignals] = useState<TtcPersonalizationSignals | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) {
      setSignals(createDefaultTtcSignals())
      return
    }
    const next = await fetchTtcPersonalizationSignals(user.id)
    setSignals(next)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const s = signals ?? createDefaultTtcSignals()
  const ctx = useMemo(() => deriveTtcCycleContext(s), [s])
  const factors = useMemo(() => buildTtcFactors(s, ctx), [s, ctx])
  const overall = useMemo(() => computeOverallFertilityScore(factors), [factors])
  const metrics = useMemo(() => buildScoreMetrics(s, ctx), [s, ctx])
  const improve = useMemo(() => buildImprovePills(s, ctx), [s, ctx])
  const scoreFacts = useMemo(() => buildTtcFactsLine(s, ctx, overall), [s, ctx, overall])
  const engagement = useMemo(() => deriveEngagementTier(s), [s])

  const aiFallback = useMemo(() => {
    if (engagement === 'new') return 'Your score grows fastest when BBT and OPK land on peak days—start small.'
    if (engagement === 'inactive') return 'Jump back in—two logs this week usually lift the timing bars.'
    return 'Your score is strongest when regularity, OPK, and mucus agree—keep the streak.'
  }, [engagement])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Fertility score</Text>
      <Text style={styles.overall}>
        Overall: <Text style={styles.overallNum}>{overall}/100</Text>
      </Text>

      <AIInsight
        insightType="fertility"
        screenKey="fertility-score"
        fallbackText={aiFallback}
        factsLine={scoreFacts}
        style={{ marginBottom: ThemeSpacing['5'] }}
      />

      <View style={styles.metricsCard}>
        {metrics.map((m) => (
          <View key={m.label} style={styles.metricRow}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <View style={styles.barRow}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${m.pct}%`, backgroundColor: m.color }]} />
              </View>
              <Text style={styles.metricPct}>{m.pct}%</Text>
            </View>
            <Text style={styles.metricExplain}>{m.explanation}</Text>
            <Text style={styles.metricNext}>{m.whatNext}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Improve your score</Text>
      {improve.map((item, idx) => {
        const Icon = PILL_ICONS[idx % PILL_ICONS.length]
        const bg = idx % 3 === 0 ? TTC_GREEN_BG : idx % 3 === 1 ? ThemeColors.orangeBg : '#F0EAFF'
        const color = idx % 3 === 0 ? TTC_GREEN_DARK : idx % 3 === 1 ? ThemeColors.peach : ThemeColors.lavender
        return (
          <Pressable key={item.text} style={({ pressed }) => [styles.tipPill, { backgroundColor: bg }, pressed && { opacity: 0.92 }]}>
            <Icon size={18} color={color} strokeWidth={2} />
            <View style={styles.tipTextCol}>
              <Text style={[styles.tipTitle, { color }]}>{item.text}</Text>
              <Text style={styles.tipDetail}>{item.detail}</Text>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  overall: { fontSize: 16, fontWeight: '500', color: ThemeColors.textMid, marginTop: 6, marginBottom: 20 },
  overallNum: { fontWeight: '800', color: TTC_GREEN_DARK },

  metricsCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.lg,
    padding: 20,
    marginBottom: 28,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  metricRow: { marginBottom: 18 },
  metricLabel: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark, marginBottom: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: ThemeColors.border, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6 },
  metricPct: { fontSize: 14, fontWeight: '700', color: ThemeColors.textMid, width: 40, textAlign: 'right' },
  metricExplain: { fontSize: 12, fontWeight: '400', color: ThemeColors.textMid, marginTop: 8, lineHeight: 17 },
  metricNext: { fontSize: 13, fontWeight: '600', color: ThemeColors.textDark, marginTop: 4, lineHeight: 18 },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 12 },
  tipPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: ThemeRadius.card,
    marginBottom: 10,
  },
  tipTextCol: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '700' },
  tipDetail: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid, marginTop: 4, lineHeight: 18 },
})
