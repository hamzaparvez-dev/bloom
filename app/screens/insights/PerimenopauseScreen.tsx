import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeColors } from '../../constants/theme'
import { useAuth } from '../../providers/AuthProvider'
import { useCycleRefresh } from '../../context/cycle-refresh-context'
import { useScreenInsight } from '../../hooks/use-screen-insight'
import {
  buildPeriStatModels,
  buildPerimenopauseFactsLine,
  buildRuleBasedSummary,
  buildTodayActionItems,
  fetchPerimenopauseSeries,
  type PeriDayAgg,
} from '../../lib/perimenopause-from-logs'
import { PeriActionCard } from '../../components/insights/PeriActionCard'
import { PeriInsightCard } from '../../components/insights/PeriInsightCard'
import { PeriStatCard } from '../../components/insights/PeriStatCard'

const COPY = {
  screenTitle: 'Perimenopause',
  screenSub: 'Specialized tracking for ages 45+',
  actionTitle: 'What you can do today',
} as const

export function PerimenopauseScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { refreshKey } = useCycleRefresh()
  const [series, setSeries] = useState<PeriDayAgg[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const req = useRef(0)

  const load = useCallback(async () => {
    const uid = user?.id
    const id = ++req.current
    if (!uid) {
      setSeries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const rows = await fetchPerimenopauseSeries(uid, 14)
    if (id !== req.current) return
    setSeries(rows)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const ruleSummary = useMemo(() => buildRuleBasedSummary(series), [series])
  const factsLine = useMemo(() => buildPerimenopauseFactsLine(series), [series])
  const statModels = useMemo(() => buildPeriStatModels(series), [series])
  const actionItems = useMemo(() => {
    const base = buildTodayActionItems(series)
    return base
  }, [series])

  const { insight, action, loading: insightLoading } = useScreenInsight({
    insightType: 'perimenopause',
    fallbackText: ruleSummary.description,
    fallbackAction: '',
    factsLine,
  })

  const mergedActions = useMemo(() => {
    const a = action?.trim()
    const out = [...actionItems]
    if (a && a.length > 0 && !out.includes(a)) out.unshift(a)
    return out.slice(0, 3)
  }, [action, actionItems])

  const toggle = useCallback((key: string) => {
    setExpandedKey((c) => (c === key ? null : key))
  }, [])

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 6, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{COPY.screenTitle}</Text>
      <Text style={styles.sub}>{COPY.screenSub}</Text>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={ThemeColors.primary} />
        </View>
      ) : null}

      <PeriInsightCard title={ruleSummary.title} description={insight} loading={insightLoading} />

      {statModels.map((m) => (
        <PeriStatCard
          key={m.key}
          model={m}
          expanded={expandedKey === m.key}
          onToggleExpand={() => toggle(m.key)}
        />
      ))}

      <PeriActionCard title={COPY.actionTitle} items={mergedActions} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  sub: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginTop: 4, marginBottom: 12 },
  loader: { paddingVertical: 8, marginBottom: 4 },
})
