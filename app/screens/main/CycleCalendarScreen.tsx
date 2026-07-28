import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { endOfMonth, format, isSameDay, startOfMonth } from 'date-fns'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { supabase } from '../../../supabaseClient'
import { useCycleRefresh } from '../../context/cycle-refresh-context'
import { useAuth } from '../../providers/AuthProvider'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_OFFSET_MIN = -120
const MONTH_OFFSET_MAX = 36

type DayType = 'period' | 'fertile' | 'ovulation' | 'predicted' | null

const DAY_COLORS: Record<string, { bg: string; text: string; border?: string }> = {
  period: { bg: ThemeColors.primary, text: ThemeColors.white },
  fertile: { bg: ThemeColors.lavender, text: ThemeColors.white },
  ovulation: { bg: ThemeColors.sky, text: ThemeColors.white },
  predicted: { bg: ThemeColors.transparent, text: ThemeColors.primary, border: ThemeColors.primary },
}

const LEGEND: { type: string; color: string; label: string }[] = [
  { type: 'period', color: ThemeColors.primary, label: 'Period' },
  { type: 'fertile', color: ThemeColors.lavender, label: 'Fertile' },
  { type: 'ovulation', color: ThemeColors.sky, label: 'Ovulation' },
  { type: 'predicted', color: ThemeColors.primary, label: 'Predicted' },
]

interface PredParsed {
  next_period: string | null
  next_ovulation: string | null
  fertile_window_start: string | null
  fertile_window_end: string | null
}

function parsePred(raw: unknown): PredParsed | null {
  if (raw == null) return null
  let o: Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return null
    }
  } else if (typeof raw === 'object') o = raw as Record<string, unknown>
  else return null
  return {
    next_period: typeof o.next_period === 'string' ? o.next_period.slice(0, 10) : null,
    next_ovulation: typeof o.next_ovulation === 'string' ? o.next_ovulation.slice(0, 10) : null,
    fertile_window_start:
      typeof o.fertile_window_start === 'string' ? o.fertile_window_start.slice(0, 10) : null,
    fertile_window_end:
      typeof o.fertile_window_end === 'string' ? o.fertile_window_end.slice(0, 10) : null,
  }
}

function dateKey(year: number, monthIndex: number, day: number): string {
  return format(new Date(year, monthIndex, day), 'yyyy-MM-dd')
}

function dayTypeFor(key: string, periodKeys: Set<string>, pred: PredParsed | null): DayType {
  if (periodKeys.has(key)) return 'period'
  const ov = pred?.next_ovulation
  if (ov && key === ov) return 'ovulation'
  const fs = pred?.fertile_window_start
  const fe = pred?.fertile_window_end
  if (fs && fe && key >= fs && key <= fe) return 'fertile'
  const np = pred?.next_period
  if (np && key === np) return 'predicted'
  return null
}

function triggerNavHaptic() {
  if (Platform.OS !== 'ios') return
  void Haptics.selectionAsync()
}

interface Props {
  onBack?: () => void
}

export function CycleCalendarScreen(_props: Props) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { refreshKey } = useCycleRefresh()
  const fetchGen = useRef(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [periodKeys, setPeriodKeys] = useState<Set<string>>(new Set())
  const [pred, setPred] = useState<PredParsed | null>(null)
  const [loading, setLoading] = useState(false)
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { year, month, label, daysInMonth, startDay } = useMemo(() => {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
      startDay: d.getDay(),
    }
  }, [monthOffset])

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setPeriodKeys(new Set())
      setPred(null)
      setLoadError(null)
      setLoading(false)
      return
    }

    const gen = ++fetchGen.current
    setLoading(true)
    setLoadError(null)

    try {
      const monthStart = startOfMonth(new Date(year, month))
      const monthEnd = endOfMonth(new Date(year, month))
      const from = format(monthStart, 'yyyy-MM-dd')
      const to = format(monthEnd, 'yyyy-MM-dd')

      const [logsRes, predRes] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('date, period_flow')
          .eq('user_id', uid)
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: true }),
        supabase.rpc('get_cycle_predictions', { p_user_id: uid }),
      ])

      if (gen !== fetchGen.current) return

      const parts: string[] = []
      if (logsRes.error) {
        parts.push(logsRes.error.message)
        console.warn('[CycleCalendar] daily_logs', logsRes.error.message)
      }
      if (predRes.error) {
        parts.push(predRes.error.message)
        console.warn('[CycleCalendar] get_cycle_predictions', predRes.error.message)
      }

      if (parts.length > 0) {
        setLoadError(parts.join(' · '))
      } else {
        setLoadError(null)
      }

      if (!logsRes.error) {
        const keys = new Set<string>()
        for (const row of logsRes.data ?? []) {
          const flow = row.period_flow as string | null
          if (flow && flow !== 'none') keys.add(String(row.date).slice(0, 10))
        }
        setPeriodKeys(keys)
      } else {
        setPeriodKeys(new Set())
      }

      if (!predRes.error) {
        setPred(parsePred(predRes.data))
      } else {
        setPred(null)
      }
    } finally {
      if (gen === fetchGen.current) setLoading(false)
    }
  }, [user?.id, year, month])

  useFocusEffect(
    useCallback(() => {
      void load()
      return () => {
        fetchGen.current += 1
      }
    }, [load, refreshKey]),
  )

  const onPullRefresh = useCallback(() => {
    setPullRefreshing(true)
    void (async () => {
      try {
        await load()
      } finally {
        setPullRefreshing(false)
      }
    })()
  }, [load])

  const goPrevMonth = useCallback(() => {
    triggerNavHaptic()
    setMonthOffset((p) => Math.max(MONTH_OFFSET_MIN, p - 1))
  }, [])

  const goNextMonth = useCallback(() => {
    triggerNavHaptic()
    setMonthOffset((p) => Math.min(MONTH_OFFSET_MAX, p + 1))
  }, [])

  const goThisMonth = useCallback(() => {
    triggerNavHaptic()
    setMonthOffset(0)
  }, [])

  const getDayType = useCallback(
    (day: number): DayType => {
      if (!day) return null
      const key = dateKey(year, month, day)
      return dayTypeFor(key, periodKeys, pred)
    },
    [year, month, periodKeys, pred],
  )

  const isTodayCell = useCallback(
    (day: number) => {
      if (!day) return false
      return isSameDay(new Date(year, month, day), new Date())
    },
    [year, month],
  )

  const cells: (number | null)[] = useMemo(() => {
    const arr: (number | null)[] = Array(startDay).fill(null)
    for (let i = 1; i <= daysInMonth; i++) arr.push(i)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [startDay, daysInMonth])

  const weeks = useMemo(() => {
    const w: (number | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7))
    return w
  }, [cells])

  const monthHasPeriod = useMemo(() => periodKeys.size > 0, [periodKeys])

  const atMinMonth = monthOffset <= MONTH_OFFSET_MIN
  const atMaxMonth = monthOffset >= MONTH_OFFSET_MAX

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        user?.id ?
          <RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} tintColor={ThemeColors.primary} />
        : undefined
      }
    >
      <Text style={styles.title} accessibilityRole="header">
        Cycle calendar
      </Text>
      <Text style={styles.subtitle}>
        Period days reflect flow you log on Today. Predictions come from Bloom when enough cycle history exists.
      </Text>

      <View style={styles.monthNav}>
        <Pressable
          onPress={goPrevMonth}
          disabled={atMinMonth}
          hitSlop={12}
          style={({ pressed }) => [styles.navBtn, atMinMonth && styles.navBtnDisabled, pressed && !atMinMonth && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          accessibilityState={{ disabled: atMinMonth }}
        >
          <ChevronLeft size={20} color={atMinMonth ? ThemeColors.textLight : ThemeColors.textDark} strokeWidth={2} />
        </Pressable>
        <Text style={styles.monthLabel}>{label}</Text>
        <Pressable
          onPress={goNextMonth}
          disabled={atMaxMonth}
          hitSlop={12}
          style={({ pressed }) => [styles.navBtn, atMaxMonth && styles.navBtnDisabled, pressed && !atMaxMonth && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: atMaxMonth }}
        >
          <ChevronRight size={20} color={atMaxMonth ? ThemeColors.textLight : ThemeColors.textDark} strokeWidth={2} />
        </Pressable>
      </View>

      {monthOffset !== 0 ?
        <Pressable
          onPress={goThisMonth}
          style={({ pressed }) => [styles.todayChip, pressed && { opacity: 0.88 }]}
          accessibilityRole="button"
          accessibilityLabel="Jump to this month"
        >
          <Text style={styles.todayChipText}>Today</Text>
        </Pressable>
      : null}

      {loadError ?
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable
            onPress={() => void load()}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading calendar"
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      : null}

      <View style={styles.calendarWrap}>
        {loading ?
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator color={ThemeColors.primary} size="large" />
          </View>
        : null}

        <View style={[styles.calendarCard, loading && styles.calendarCardDimmed]}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={styles.dayCell}>
                <Text style={styles.weekdayText}>{d}</Text>
              </View>
            ))}
          </View>

          {weeks.map((week, wIdx) => (
            <View key={wIdx} style={styles.weekRow}>
              {week.map((day, dIdx) => {
                if (day === null) return <View key={dIdx} style={styles.dayCell} />
                const type = getDayType(day)
                const colors = type ? DAY_COLORS[type] : null
                const today = isTodayCell(day)
                const a11yType = type ?? 'no marking'
                const a11yLabel = `${MONTHS[month]} ${day}, ${year}. ${a11yType}.${today ? ' Today.' : ''}`

                return (
                  <View key={dIdx} style={styles.dayCell}>
                    <View
                      style={[
                        styles.dayCircleOuter,
                        today && !colors && styles.dayCircleTodayPlain,
                        today && colors && styles.dayCircleTodayMarked,
                      ]}
                      accessibilityLabel={a11yLabel}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          colors && { backgroundColor: colors.bg },
                          colors?.border && { borderWidth: 1.5, borderColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.dayText, colors && { color: colors.text }]}>{day}</Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.legend}>
        {LEGEND.map((l) => (
          <View key={l.type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>

      {!user?.id ?
        <Text style={styles.hint}>Sign in to see your logged cycle and predictions.</Text>
      : null}

      {user?.id && !loading && !loadError && !monthHasPeriod && pred == null ?
        <Text style={styles.hint}>
          No period or predictions for this month yet. Log period flow from the Today tab (plus button), or check
          another month.
        </Text>
      : null}

      {user?.id && !loading && !loadError && !monthHasPeriod && pred != null ?
        <Text style={styles.hint}>No period days logged this month—predictions may still show for upcoming events.</Text>
      : null}
    </ScrollView>
  )
}

const CELL_SIZE = 44

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },

  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: ThemeColors.textMid,
    lineHeight: 20,
    marginBottom: 16,
  },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 10,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ThemeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  navBtnDisabled: { opacity: 0.55 },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: ThemeColors.textDark,
    minWidth: 160,
    textAlign: 'center',
  },

  todayChip: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: ThemeRadius.pill,
    backgroundColor: ThemeColors.pinkSurface,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  todayChipText: { fontSize: 14, fontWeight: '700', color: ThemeColors.primary },

  errorBanner: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: ThemeSpacing['4'],
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  errorText: { fontSize: 13, fontWeight: '500', color: '#B42318', marginBottom: 10, lineHeight: 18 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: ThemeColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: ThemeRadius.button,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: ThemeColors.white },

  calendarWrap: { position: 'relative', marginBottom: 4 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingVertical: 48,
  },
  calendarCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.lg,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarCardDimmed: { opacity: 0.55 },

  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: CELL_SIZE },
  weekdayText: { fontSize: 13, fontWeight: '600', color: ThemeColors.textLight },

  dayCircleOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleTodayPlain: {
    borderWidth: 2,
    borderColor: ThemeColors.primary,
  },
  dayCircleTodayMarked: {
    borderWidth: 2,
    borderColor: ThemeColors.textDark,
  },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600', color: ThemeColors.textMid },
  hint: {
    marginTop: 16,
    textAlign: 'center',
    color: ThemeColors.textLight,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
})
