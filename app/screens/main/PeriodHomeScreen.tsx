import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Circle } from 'react-native-svg'
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { Bell, Calendar, ClipboardList, Egg, Smile, Thermometer } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'
import { useCycleRefresh } from '../../context/cycle-refresh-context'
import type { CyclePredictionsJson } from '../../lib/cycle-home-insight'
import {
  getCycleState,
  getNextEvent,
  getNextEventFromDates,
  getQuickActions,
  inferLastPeriodStartIso,
  formatNextEventHeadline,
  type CycleUiState,
  type QuickActionItem,
} from '../../lib/cycle-home-retention'
import {
  cyclePhaseDisplayLabel,
  normalizeHealthPriorities,
  personalizeQuickActionsOrder,
  personalizedHeroSubtext,
  streakSubtitleForGoals,
  timeAwareGreeting,
} from '../../lib/personalization'
import { PrimaryLogButton } from '../../components/home/PrimaryLogButton'
import { StreakCard } from '../../components/home/StreakCard'
import { QuickLogRow } from '../../components/home/QuickLogRow'
import { WeeklyReflectionCard } from '../../components/home/WeeklyReflectionCard'
import {
  buildDailyDigestLine,
  buildWeeklyReflection,
  computeStreak,
  daysTrackedThisWeek,
  fetchLogDatesWithActivity,
  fetchWeekLogs,
  loggedToday as userLoggedToday,
} from '../../lib/daily-habit'
import { syncHabitNudges } from '../../lib/habit-notifications'

const RING_SIZE = 136
const RING_STROKE = 6
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_R

type Nav = NativeStackNavigationProp<MainStackParamList>

function parseCyclePredictionsRpc(raw: unknown): CyclePredictionsJson | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CyclePredictionsJson
    } catch {
      return null
    }
  }
  if (typeof raw === 'object') return raw as CyclePredictionsJson
  return null
}

function badgeColorsForState(state: CycleUiState): { fg: string; bg: string; border: string } {
  if (state === 'period') return { fg: '#C62828', bg: '#FDECEA', border: '#F5C4C0' }
  if (state === 'fertile') return { fg: '#1B5E20', bg: '#E8F5E9', border: '#C8E6C9' }
  if (state === 'normal') return { fg: ThemeColors.textMid, bg: ThemeColors.surface, border: ThemeColors.border }
  return { fg: ThemeColors.textMid, bg: ThemeColors.surface, border: ThemeColors.border }
}

export interface PeriodHomeScreenProps {
  onOpenLog?: () => void
}

export function PeriodHomeScreen({ onOpenLog }: PeriodHomeScreenProps) {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const { refreshKey, bumpCycleRefresh } = useCycleRefresh()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('there')
  const [healthGoalIds, setHealthGoalIds] = useState<string[]>([])
  const [pred, setPred] = useState<CyclePredictionsJson | null>(null)
  const [profileCycleLen, setProfileCycleLen] = useState<number | null>(null)
  const [lastLogDateIso, setLastLogDateIso] = useState<string | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [didLogToday, setDidLogToday] = useState(false)
  const [daysTrackedWeek, setDaysTrackedWeek] = useState(0)
  const [weeklyBlock, setWeeklyBlock] = useState<{ title: string; summary: string } | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const requestId = useRef(0)

  const loadHomeData = useCallback(async () => {
    const userId = user?.id
    if (!userId) {
      setLoading(false)
      setPred(null)
      setProfileCycleLen(null)
      setLastLogDateIso(null)
      setError(null)
      return
    }

    const id = ++requestId.current
    setLoading(true)
    setError(null)

    const [predRes, profileRes, settingsRes, lastLogRes, habitDates, weekLogs] = await Promise.all([
      supabase.rpc('get_cycle_predictions', { p_user_id: userId }),
      supabase.from('profiles').select('display_name, health_priorities').eq('id', userId).maybeSingle(),
      supabase
        .from('user_settings')
        .select('cycle_length, notifications_enabled')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('daily_logs').select('date').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
      fetchLogDatesWithActivity(userId, 120),
      fetchWeekLogs(userId),
    ])

    if (id !== requestId.current) return

    if (predRes.error) {
      setError(predRes.error.message)
      setPred(null)
    } else {
      setPred(parseCyclePredictionsRpc(predRes.data))
    }

    const name = profileRes.data?.display_name?.trim()
    if (name) setDisplayName(name.split(' ')[0] ?? name)
    setHealthGoalIds(normalizeHealthPriorities(profileRes.data?.health_priorities))

    const cl = settingsRes.data?.cycle_length
    setProfileCycleLen(typeof cl === 'number' && Number.isFinite(cl) ? cl : null)

    setNotificationsEnabled(!!settingsRes.data?.notifications_enabled)

    const ld = lastLogRes.data?.date
    setLastLogDateIso(typeof ld === 'string' ? ld.slice(0, 10) : null)

    setStreakDays(computeStreak(habitDates))
    setDidLogToday(userLoggedToday(habitDates))
    setDaysTrackedWeek(daysTrackedThisWeek(habitDates))
    setWeeklyBlock(buildWeeklyReflection(weekLogs))

    if (lastLogRes.error) console.warn('[PeriodHome] last log', lastLogRes.error.message)
    if (profileRes.error) console.warn('[PeriodHome] profile', profileRes.error.message)
    if (settingsRes.error) console.warn('[PeriodHome] user_settings', settingsRes.error.message)

    setLoading(false)

    void syncHabitNudges({
      loggedToday: userLoggedToday(habitDates),
      notificationsEnabled: !!settingsRes.data?.notifications_enabled,
    })
  }, [user?.id])

  useEffect(() => {
    void loadHomeData()
  }, [loadHomeData, refreshKey])

  const cycleLenSetting = Math.max(1, Math.round(Number(profileCycleLen ?? pred?.average_length ?? 28)))
  const hasActiveCycle = pred != null && pred.current_cycle_day != null && pred.current_cycle_day >= 1
  const cycleDayRaw = pred?.current_cycle_day != null ? Math.round(Number(pred.current_cycle_day)) : null
  const cycleDayNum =
    hasActiveCycle && cycleDayRaw != null ? Math.min(cycleLenSetting, Math.max(1, cycleDayRaw)) : null

  const lastPeriodIsoForState =
    cycleDayNum != null ? inferLastPeriodStartIso(cycleDayNum) : null

  const cycleState = useMemo(
    () => getCycleState({ lastPeriodDate: lastPeriodIsoForState, cycleLength: cycleLenSetting }),
    [lastPeriodIsoForState, cycleLenSetting],
  )

  const progress =
    cycleState.state !== 'no_data' && cycleState.cycleDay != null
      ? cycleState.cycleDay / cycleState.cycleLength
      : 0

  const nextEventBlock = useMemo(() => {
    if (cycleState.state === 'no_data') {
      return {
        title: 'Predictions',
        headline: 'Add a period start to see what is next',
        days: null as number | null,
        sub: 'Tap below—Bloom estimates ovulation and your next period from that anchor.',
      }
    }
    const fromDates = getNextEventFromDates({
      nextOvulationIso: pred?.next_ovulation,
      nextPeriodIso: pred?.next_period,
    })
    if (fromDates) {
      return {
        title: 'Next event',
        headline: fromDates.headline,
        days: fromDates.days,
        sub: 'Grounded in your last few cycles.',
      }
    }
    if (cycleState.cycleDay != null) {
      const rule = getNextEvent({ cycleDay: cycleState.cycleDay, cycleLength: cycleState.cycleLength })
      if (rule) {
        return {
          title: 'Next event',
          headline: formatNextEventHeadline(rule),
          days: rule.days,
          sub: 'Rough estimate from today’s cycle day.',
        }
      }
    }
    return {
      title: 'Next event',
      headline: 'Keep logging',
      days: null as number | null,
      sub: 'A few more logs tighten the forecast.',
    }
  }, [cycleState, pred?.next_ovulation, pred?.next_period])

  const digestLine = useMemo(
    () =>
      buildDailyDigestLine({
        streak: streakDays,
        loggedToday: didLogToday,
        cycleDay: cycleDayNum,
        healthGoalIds,
      }),
    [streakDays, didLogToday, cycleDayNum, healthGoalIds],
  )

  const lastLoggedDaysAgo = useMemo(() => {
    if (!lastLogDateIso) return null
    try {
      return Math.max(0, differenceInCalendarDays(startOfDay(new Date()), startOfDay(parseISO(lastLogDateIso))))
    } catch {
      return null
    }
  }, [lastLogDateIso])

  const quickActions = useMemo(() => {
    const base = getQuickActions({ lastLoggedDaysAgo })
    return personalizeQuickActionsOrder(base, healthGoalIds)
  }, [lastLoggedDaysAgo, healthGoalIds])

  const onQuick = useCallback(
    (item: QuickActionItem) => {
      if (item.nav === 'log') {
        if (onOpenLog) onOpenLog()
        else navigation.navigate('SymptomPicker')
        return
      }
      if (item.nav === 'mood') {
        navigation.navigate('MoodTracker')
        return
      }
      if (item.nav === 'ovulation') {
        navigation.navigate('OvulationLog')
        return
      }
      if (item.nav === 'bb') {
        navigation.navigate('BBTLog')
        return
      }
      if (item.nav === 'calendar') {
        navigation.navigate('CycleCalendar')
      }
    },
    [navigation, onOpenLog],
  )

  const badge = badgeColorsForState(cycleState.state)

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 5, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{timeAwareGreeting(displayName)}</Text>
        </View>
        <Pressable
          hitSlop={12}
          style={styles.bellBtn}
          onPress={() => navigation.navigate('NotificationsInbox')}
        >
          <Bell size={20} color={ThemeColors.textMid} strokeWidth={1.8} />
        </Pressable>
      </View>

      {loading && user?.id ? (
        <View style={styles.heroLoading}>
          <ActivityIndicator size="large" color={ThemeColors.primary} />
        </View>
      ) : cycleState.state === 'no_data' ? (
        <View style={styles.heroEmpty}>
          <Text style={styles.heroEmptyTitle}>Anchor your first cycle day</Text>
          <Text style={styles.heroEmptySub}>Tell us when this period started—you will see cycle day and smarter dates right away.</Text>
        </View>
      ) : (
        <Pressable onPress={() => navigation.navigate('FertileWindow')} style={styles.ringSection}>
          <View style={styles.ringBg} />
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svgAbs}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke={ThemeColors.pinkSurface}
                strokeWidth={RING_STROKE}
                fill="none"
              />
            </Svg>
            <View style={[styles.svgAbs, { transform: [{ rotate: '-90deg' }] }]}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_R}
                  stroke={ThemeColors.primary}
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${RING_CIRC}`}
                  strokeDashoffset={RING_CIRC * (1 - progress)}
                />
              </Svg>
            </View>
            <View style={styles.ringCenter}>
              <Text style={styles.dayNumber}>
                {cycleState.cycleDay != null ? String(cycleState.cycleDay) : '—'}
              </Text>
              <Text style={styles.dayLabel}>DAY</Text>
            </View>
          </View>
          <View
            style={[
              styles.phaseBadge,
              { backgroundColor: badge.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: badge.border },
            ]}
          >
            <Text style={[styles.phaseText, { color: badge.fg }]}>{cyclePhaseDisplayLabel(cycleState.state)}</Text>
          </View>
          <Text style={styles.heroSub}>{personalizedHeroSubtext(cycleState.state, healthGoalIds)}</Text>
        </Pressable>
      )}

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <View style={styles.primarySlot}>
        {loading && user?.id ? (
          <View style={styles.primaryLoading} accessibilityLabel="Loading cycle">
            <ActivityIndicator color={ThemeColors.primary} />
          </View>
        ) : cycleState.state === 'no_data' ? (
          <PrimaryLogButton
            title="Log period start"
            subtitle="Opens a short flow — about a minute"
            variant="outline"
            onPress={() => navigation.navigate('PeriodStarted')}
          />
        ) : (
          <PrimaryLogButton
            title="Log today"
            subtitle="Flow, mood, symptoms — saved to today"
            onPress={() => (onOpenLog ? onOpenLog() : navigation.navigate('SymptomPicker'))}
          />
        )}
      </View>

      {user?.id && !loading ? (
        <View style={styles.habitBlock}>
          <StreakCard streakDays={streakDays} subtitle={streakSubtitleForGoals(healthGoalIds)} />
          <Text style={styles.weekProgress}>
            {daysTrackedWeek} of 7 days logged this week
          </Text>
          <View style={styles.habitProgressTrack}>
            <View style={[styles.habitProgressFill, { width: `${Math.min(1, daysTrackedWeek / 7) * 100}%` }]} />
          </View>
          <QuickLogRow
            userId={user.id}
            notificationsEnabled={notificationsEnabled}
            onLogged={bumpCycleRefresh}
          />
          {weeklyBlock ? (
            <WeeklyReflectionCard title={weeklyBlock.title} summary={weeklyBlock.summary} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.divider} />

      <Pressable onPress={() => navigation.navigate('CycleCalendar')} style={styles.eventRow}>
        <View style={styles.eventLeft}>
          <Text style={styles.eventLabel}>{nextEventBlock.title}</Text>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {nextEventBlock.headline}
          </Text>
          <Text style={styles.eventSub} numberOfLines={2}>
            {nextEventBlock.sub}
          </Text>
        </View>
        <View style={styles.eventRight}>
          <Text style={styles.eventDayNum}>{nextEventBlock.days != null ? String(nextEventBlock.days) : '—'}</Text>
          <Text style={styles.eventDayUnit}>days</Text>
        </View>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.insightRow}>
        <View style={styles.insightBar} />
        <View style={styles.insightBody}>
          <Text style={styles.insightLabel}>Today</Text>
          <Text style={styles.insightText} numberOfLines={2}>
            {digestLine}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.quickSection}>
        <Text style={styles.quickTitle}>Quick actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {quickActions.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onQuick(item)}
              style={({ pressed }) => [
                styles.quickCard,
                item.recommended && styles.quickCardRecommended,
                pressed && { opacity: 0.85 },
              ]}
            >
              {item.recommended ? <Text style={styles.recTag}>Start here</Text> : null}
              <View style={[styles.quickIcon, { backgroundColor: iconBg(item.nav) }]}>
                {quickIcon(item.nav)}
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  )
}

function iconBg(nav: QuickActionItem['nav']): string {
  if (nav === 'log') return ThemeColors.pinkSurface
  if (nav === 'mood') return '#FFF8E8'
  if (nav === 'ovulation') return '#F0FAF4'
  if (nav === 'bb') return '#FFF2EC'
  if (nav === 'calendar') return '#E8F4FC'
  return ThemeColors.surface
}

function quickIcon(nav: QuickActionItem['nav']) {
  if (nav === 'log') return <ClipboardList size={20} color={ThemeColors.primary} strokeWidth={1.8} />
  if (nav === 'mood') return <Smile size={20} color="#F5A623" strokeWidth={1.8} />
  if (nav === 'ovulation') return <Egg size={20} color={ThemeColors.mint} strokeWidth={1.8} />
  if (nav === 'bb') return <Thermometer size={20} color={ThemeColors.peach} strokeWidth={1.8} />
  if (nav === 'calendar') return <Calendar size={20} color={ThemeColors.sky} strokeWidth={1.8} />
  return null
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  greeting: { fontSize: 17, fontWeight: '600', color: ThemeColors.textDark },
  errorBanner: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ThemeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroLoading: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },

  heroEmpty: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  heroEmptyTitle: { fontSize: 22, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 6 },
  heroEmptySub: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, lineHeight: 20 },

  ringSection: { alignItems: 'center', paddingVertical: 10, position: 'relative' },
  ringBg: {
    position: 'absolute',
    top: 0,
    left: -20,
    right: -20,
    height: 168,
    backgroundColor: ThemeColors.pinkSurface,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    opacity: 0.5,
  },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  svgAbs: { position: 'absolute' },
  ringCenter: { alignItems: 'center', gap: 2 },
  dayNumber: { fontSize: 40, fontWeight: '800', color: ThemeColors.textDark, letterSpacing: -1.5, lineHeight: 44 },
  dayLabel: { fontSize: 11, fontWeight: '700', color: ThemeColors.textMid, letterSpacing: 1.6 },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: ThemeRadius.pill,
    marginTop: 8,
    alignSelf: 'center',
  },
  phaseText: { fontSize: 13, fontWeight: '700' },
  heroSub: {
    fontSize: 13,
    fontWeight: '500',
    color: ThemeColors.textMid,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: ThemeColors.border, marginVertical: 10 },

  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  eventLeft: { flex: 1, gap: 2, paddingRight: 8 },
  eventLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: ThemeColors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: { fontSize: 18, fontWeight: '700', color: ThemeColors.textDark },
  eventSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid, marginTop: 2 },
  eventRight: { alignItems: 'center', paddingLeft: 8, minWidth: 52 },
  eventDayNum: { fontSize: 28, fontWeight: '800', color: ThemeColors.primary, letterSpacing: -0.5, lineHeight: 32 },
  eventDayUnit: { fontSize: 11, fontWeight: '500', color: ThemeColors.textMid },

  insightRow: { flexDirection: 'row', paddingVertical: 12, gap: 10 },
  insightBar: { width: 3, borderRadius: 2, backgroundColor: ThemeColors.lavender, alignSelf: 'stretch' },
  insightBody: { flex: 1, gap: 4 },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.lavender,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  insightText: { fontSize: 15, fontWeight: '400', color: ThemeColors.textDark, lineHeight: 21 },

  quickSection: { marginTop: 4, marginBottom: 8 },
  quickTitle: { fontSize: 15, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 10 },
  quickRow: { gap: 10, paddingBottom: 4 },
  quickCard: {
    alignItems: 'center',
    gap: 6,
    width: 92,
    paddingTop: 4,
  },
  quickCardRecommended: {},
  recTag: {
    fontSize: 10,
    fontWeight: '700',
    color: ThemeColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickLabel: { fontSize: 11, fontWeight: '600', color: ThemeColors.textMid, textAlign: 'center' },

  primarySlot: { marginTop: 6, marginBottom: 4 },

  habitBlock: { marginTop: 4, marginBottom: 4 },
  weekProgress: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textMid,
    marginBottom: 8,
  },
  habitProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: ThemeColors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  habitProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: ThemeColors.lavender,
  },

  primaryLoading: {
    minHeight: 52,
    borderRadius: ThemeRadius.card,
    backgroundColor: ThemeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
})
