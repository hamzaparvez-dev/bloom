import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format, parseISO } from 'date-fns'
import { Lightbulb, Moon, TrendingDown, Zap } from 'lucide-react-native'
import { DualBarChart } from '../../components/insights/InsightCharts'
import { InsightStatRow } from '../../components/insights/InsightRows'
import { AIInsight } from '../../components/ui/AIInsight'
import { ThemeColors, ThemeSpacing } from '../../constants/theme'
import { energyToScore, fetchDailyLogsSeries, sleepHoursToChartScale } from '../../lib/charts-from-logs'
import { useAuth } from '../../providers/AuthProvider'

const FETCH_DAYS = 21
const CHART_MAX = 10

export function SleepEnergyScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [sleep, setSleep] = useState<number[]>([])
  const [energy, setEnergy] = useState<number[]>([])
  const [dayLabels, setDayLabels] = useState<string[]>([])

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      const pad = Array(7).fill(0)
      setSleep(pad)
      setEnergy(pad)
      setDayLabels(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
      setLoading(false)
      return
    }
    setLoading(true)
    const rows = await fetchDailyLogsSeries(uid, FETCH_DAYS)
    const sh: number[] = []
    const eh: number[] = []
    const labs: string[] = []
    for (const r of rows) {
      sh.push(sleepHoursToChartScale(r.sleepHours))
      eh.push(energyToScore(r.energy))
      try {
        labs.push(format(parseISO(`${r.date}T12:00:00`), 'EEE d'))
      } catch {
        labs.push('·')
      }
    }
    setSleep(sh)
    setEnergy(eh)
    setDayLabels(labs)
    setLoading(false)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const facts = useMemo(() => `sleep0to10:${sleep.join(',')}; energy0to10:${energy.join(',')}`, [sleep, energy])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Sleep &amp; energy</Text>

      <AIInsight
        insightType="sleep"
        screenKey="sleep-energy"
        fallbackText="Your rest and energy move together—steady sleep often lifts how you feel during the day."
        factsLine={facts}
        style={{ marginBottom: ThemeSpacing['5'] }}
      />

      {loading ?
        <View style={styles.loader}>
          <ActivityIndicator color={ThemeColors.sky} />
        </View>
      : (
        <DualBarChart
          title="Sleep and energy from your logs"
          subtitle="About three weeks from your logs · scroll sideways for earlier days"
          sleepHeights={sleep}
          energyHeights={energy}
          maxH={CHART_MAX}
          dayLabels={dayLabels}
        />
      )}

      <View style={styles.spacer} />

      <InsightStatRow
        icon={Moon}
        iconColor={ThemeColors.sky}
        iconBg="#E8F4FC"
        label="Avg sleep"
        value="See chart (hours in Log today)"
      />
      <InsightStatRow
        icon={Zap}
        iconColor={ThemeColors.peach}
        iconBg={ThemeColors.orangeBg}
        label="Peak energy"
        value="Higher amber bars = more energy logged"
      />
      <InsightStatRow
        icon={TrendingDown}
        iconColor={ThemeColors.lavender}
        iconBg="#F0EAFF"
        label="Energy dip"
        value="Often mid-luteal — keep logging"
      />
      <InsightStatRow
        icon={Lightbulb}
        iconColor={ThemeColors.primary}
        iconBg={ThemeColors.pinkSurface}
        label="Smart tip"
        value="Log sleep hours and energy on the same day for the clearest picture."
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 8 },
  loader: { paddingVertical: 32, alignItems: 'center' },
  spacer: { height: 20 },
})
