import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format, parseISO } from 'date-fns'
import { ArrowDown, ArrowUp, CheckCircle2, Ruler } from 'lucide-react-native'
import { SimpleBarChart, type BarDatum } from '../../components/insights/InsightCharts'
import { InsightStatRow } from '../../components/insights/InsightRows'
import { AIInsight } from '../../components/ui/AIInsight'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'
import { useCycleRefresh } from '../../context/cycle-refresh-context'

const PURPLE = '#8B5CF6'

interface AnalyticsHistoryRow {
  start_date?: string
  length?: number
  period_length?: number
}

interface AnalyticsPayload {
  average_length?: number
  variation?: number
  regularity?: number
  cycle_count?: number
  history?: AnalyticsHistoryRow[]
}

export function CycleAnalysisScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const { user } = useAuth()
  const { refreshKey } = useCycleRefresh()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bars, setBars] = useState<BarDatum[]>([])
  const [avgLen, setAvgLen] = useState(28)
  const [shortest, setShortest] = useState(26)
  const [longest, setLongest] = useState(29)
  const [regularityPct, setRegularityPct] = useState(95)
  const [regLabel, setRegLabel] = useState('Very regular')
  const requestId = useRef(0)

  useFocusEffect(
    useCallback(() => {
      const uid = user?.id
      if (!uid) {
        setBars([])
        setLoadError(null)
        setLoading(false)
        return
      }
      const id = ++requestId.current
      let cancelled = false

      void (async () => {
        setLoading(true)
        setLoadError(null)
        const { data, error } = await supabase.rpc('get_cycle_analytics', {
          p_user_id: uid,
          p_limit: 6,
        })
        if (cancelled || id !== requestId.current) return
        if (error) {
          setBars([])
          setLoadError(error.message)
          setLoading(false)
          return
        }
        const payload = data as AnalyticsPayload | null
        if (payload?.average_length != null) setAvgLen(Math.round(Number(payload.average_length)))

        const hist = Array.isArray(payload?.history) ? payload!.history! : []
        const al = payload?.average_length != null ? Math.round(Number(payload.average_length)) : 28

        if (hist.length > 0) {
          const barsRaw: BarDatum[] = hist.map((row, i) => {
            const len = Math.round(Number(row.length ?? 0))
            let label = String(i + 1)
            if (row.start_date) {
              try {
                label = format(parseISO(row.start_date), 'MMM')
              } catch {
                label = String(i + 1)
              }
            }
            const rid = row.start_date ? `ca-${row.start_date}` : `ca-${i}`
            return {
              id: rid,
              label,
              value: len,
              topLabel: i === hist.length - 1 && len > 0 ? String(len) : undefined,
            }
          })
          const barsNext = barsRaw.filter((b) => b.value > 0)
          const lengths = barsNext.map((b) => b.value)
          if (lengths.length > 0) {
            setShortest(Math.min(...lengths))
            setLongest(Math.max(...lengths))
          } else {
            setShortest(al)
            setLongest(al)
          }
          setBars(barsNext)
        } else {
          setBars([])
          setShortest(al)
          setLongest(al)
        }

        const reg = payload?.regularity
        if (reg != null) {
          const p = Math.round(Number(reg))
          setRegularityPct(p)
          if (p >= 70) setRegLabel('Very regular')
          else if (p >= 40) setRegLabel('Somewhat variable')
          else setRegLabel('Irregular pattern')
        }

        setLoading(false)
      })()

      return () => {
        cancelled = true
      }
    }, [user?.id, refreshKey]),
  )

  const chartMax = Math.max(32, ...bars.map((d) => d.value), 1)

  const facts = useMemo(
    () =>
      `lengths:${bars.map((b) => b.value).join(',')}; avg:${avgLen}; short:${shortest}; long:${longest}; reg:${regularityPct}`,
    [avgLen, bars, longest, regularityPct, shortest],
  )

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Cycle analysis</Text>

      <AIInsight
        insightType="fertility"
        screenKey="cycle-analysis"
        fallbackText="Your lengths cluster in a healthy range—small shifts month to month are common."
        factsLine={facts}
        style={{ marginBottom: ThemeSpacing['5'] }}
      />

      {loading ?
        <View style={styles.loader}>
          <ActivityIndicator color={ThemeColors.primary} />
        </View>
      : bars.length > 0 ?
        <SimpleBarChart
          title="Your last cycles (days each)"
          subtitle="Scroll sideways if Bloom has several on file"
          contextLine="Tallest bar is your longest cycle in this window."
          data={bars}
          maxValue={chartMax}
          barColor={ThemeColors.primary}
          height={110}
          autoFooter
        />
      : (
        <View style={styles.emptyCard}>
          {loadError ?
            <Text style={styles.errorText}>Could not load analytics ({loadError}).</Text>
          : null}
          <Text style={styles.emptyTitle}>No cycle bars yet</Text>
          <Text style={styles.emptyBody}>
            Mood, sleep, and symptoms from Log today update other insight charts. This chart needs completed
            cycles in Bloom—usually after you log period flow on heavier days or mark a new cycle on the
            calendar. With only a day or two of logging, bars often appear after your next period start.
          </Text>
          <Pressable
            onPress={() => nav.navigate('CycleCalendar')}
            style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.emptyCtaText}>Open calendar</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.spacer} />

      <InsightStatRow
        icon={Ruler}
        iconColor={PURPLE}
        iconBg="#F0EAFF"
        label="Average length"
        value={`${avgLen} days`}
      />
      <InsightStatRow
        icon={ArrowDown}
        iconColor={ThemeColors.sky}
        iconBg="#E8F4FC"
        label="Shortest cycle"
        value={`${shortest} days`}
      />
      <InsightStatRow
        icon={ArrowUp}
        iconColor={ThemeColors.peach}
        iconBg={ThemeColors.orangeBg}
        label="Longest cycle"
        value={`${longest} days`}
      />
      <InsightStatRow
        icon={CheckCircle2}
        iconColor={ThemeColors.mint}
        iconBg={ThemeColors.greenBg}
        label="Regularity"
        value={`${regLabel} (${regularityPct}%)`}
        badge={regularityPct >= 70 ? 'Strong' : regularityPct >= 40 ? 'OK' : 'Watch'}
        badgeTone={regularityPct >= 70 ? 'mint' : regularityPct >= 40 ? 'lavender' : 'peach'}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 8 },
  loader: { paddingVertical: 28, alignItems: 'center' },
  emptyCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: ThemeSpacing['4'],
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B42318',
    marginBottom: 10,
    lineHeight: 18,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 8 },
  emptyBody: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 21, marginBottom: 14 },
  emptyCta: {
    alignSelf: 'flex-start',
    backgroundColor: ThemeColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: ThemeRadius.button,
  },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: ThemeColors.white },
  spacer: { height: 20 },
})
