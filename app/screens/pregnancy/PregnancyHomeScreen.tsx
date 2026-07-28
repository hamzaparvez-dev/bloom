import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Circle } from 'react-native-svg'
import { differenceInCalendarDays, format, parseISO, startOfDay, subDays } from 'date-fns'
import {
  Baby,
  Calendar,
  ChevronRight,
  Heart,
  Scale,
  Timer,
} from 'lucide-react-native'
import { Image } from 'expo-image'
import { Angry, Frown, Laugh, Meh, SmilePlus } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { AIInsight } from '../../components/ui/AIInsight'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'
import { useCycleRefresh } from '../../context/cycle-refresh-context'
import type { WeekLogMini } from '../../lib/daily-habit'
import { computeStreak, daysTrackedThisWeek, fetchLogDatesWithActivity, fetchWeekLogs } from '../../lib/daily-habit'
import { upsertDailyLog } from '../../lib/upsert-daily-log'
import { normalizeHealthPriorities } from '../../lib/personalization'
import { getImage } from '../../lib/app-images'
import {
  TOTAL_PREGNANCY_WEEKS,
  buildNextWeekInsightLine,
  buildPregnancyAiFactsLine,
  buildPregnancyForYouCopy,
  buildPregnancyHeaderSubtitle,
  buildPregnancyPatternInsight,
  buildPregnancyQuickActions,
  buildRingProgressLine,
  buildThisWeekSupportLine,
  daysUntilDueApprox,
  getBabyWeekSnapshot,
  milestoneHintForWeek,
  pregnancyEngagementTier,
  pregnancyWeekFromDueOrLmp,
  trimesterFromWeek,
  trimesterLabel,
  type PregnancyLogSignals,
  type PregnancyQuickActionId,
  type QuickActionScore,
} from '../../lib/pregnancy-home-personalization'

const PURPLE = '#8B5CF6'
const PURPLE_LIGHT = '#EDE9FE'

const RING_SIZE = 220
const RING_STROKE = 8
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_R

type Nav = NativeStackNavigationProp<MainStackParamList>

/** Same ids / DB mapping as MoodTrackerScreen — quick check-in only. */
interface MoodQuickOption {
  id: string
  label: string
  icon: LucideIcon
  color: string
  bg: string
}

const MOOD_QUICK_OPTIONS: MoodQuickOption[] = [
  { id: 'happy', label: 'Happy', icon: Laugh, color: '#F5A623', bg: '#FFF8E8' },
  { id: 'neutral', label: 'Neutral', icon: Meh, color: ThemeColors.textMid, bg: '#F3F0F8' },
  { id: 'sad', label: 'Sad', icon: Frown, color: ThemeColors.sky, bg: '#E8F4FC' },
  { id: 'anxious', label: 'Anxious', icon: Angry, color: ThemeColors.peach, bg: '#FFF2EC' },
  { id: 'irritable', label: 'Irritable', icon: Angry, color: '#E05A5A', bg: '#FDEDED' },
  { id: 'calm', label: 'Calm', icon: SmilePlus, color: ThemeColors.mint, bg: ThemeColors.greenBg },
]

const MOOD_ID_TO_DB: Record<string, string> = {
  happy: 'happy',
  neutral: 'neutral',
  sad: 'low',
  anxious: 'anxious',
  irritable: 'irritable',
  calm: 'neutral',
}

function latestDateInSet(active: Set<string>): string | null {
  if (active.size === 0) return null
  return [...active].sort().slice(-1)[0] ?? null
}

function countSymptomDaysLast14(rows: { date: string; symptoms: unknown }[]): number {
  const cutoff = format(subDays(new Date(), 13), 'yyyy-MM-dd')
  let n = 0
  const seen = new Set<string>()
  for (const r of rows) {
    const d = String(r.date).slice(0, 10)
    if (d < cutoff) continue
    if (seen.has(d)) continue
    if (!rowHasSymptoms(r.symptoms)) continue
    seen.add(d)
    n++
  }
  return n
}

function rowHasSymptoms(symptoms: unknown): boolean {
  if (Array.isArray(symptoms) && symptoms.length > 0) return true
  if (typeof symptoms === 'string') {
    try {
      const j = JSON.parse(symptoms) as unknown
      return Array.isArray(j) && j.length > 0
    } catch {
      return false
    }
  }
  return false
}

async function safeCount(userId: string, table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (error) return 0
  return count ?? 0
}

export function PregnancyHomeScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()
  const { user } = useAuth()
  const { bumpCycleRefresh, refreshKey } = useCycleRefresh()
  const requestId = useRef(0)

  const [loading, setLoading] = useState(true)
  const [week, setWeek] = useState(16)
  const [healthGoalIds, setHealthGoalIds] = useState<string[]>([])
  const [signals, setSignals] = useState<PregnancyLogSignals>({
    daysLoggedThisWeek: 0,
    streakDays: 0,
    lastLoggedDaysAgo: null,
    activeLogDaysLookback: 0,
    symptomLogDays: 0,
  })
  const [usage, setUsage] = useState<Record<PregnancyQuickActionId, number>>({
    kicks: 0,
    contractions: 0,
    weight: 0,
    appointments: 0,
  })
  const [moodSaving, setMoodSaving] = useState(false)
  const [moodSavedFlash, setMoodSavedFlash] = useState(false)
  const [weekLogsState, setWeekLogsState] = useState<WeekLogMini[]>([])

  const loadHome = useCallback(async () => {
    const uid = user?.id
    const id = ++requestId.current
    if (!uid) {
      setHealthGoalIds([])
      setSignals({
        daysLoggedThisWeek: 0,
        streakDays: 0,
        lastLoggedDaysAgo: null,
        activeLogDaysLookback: 0,
        symptomLogDays: 0,
      })
      setUsage({ kicks: 0, contractions: 0, weight: 0, appointments: 0 })
      setWeek(16)
      setLoading(false)
      return
    }

    setLoading(true)

    const [
      profileRes,
      pregRes,
      habitDates,
      weekLogsFetched,
      symptomRes,
      kicksC,
      contrC,
      weightC,
      apptC,
    ] = await Promise.all([
      supabase.from('profiles').select('health_priorities').eq('id', uid).maybeSingle(),
      supabase.from('pregnancies').select('*').eq('user_id', uid).eq('is_active', true).maybeSingle(),
      fetchLogDatesWithActivity(uid, 120),
      fetchWeekLogs(uid),
      supabase
        .from('daily_logs')
        .select('date, symptoms')
        .eq('user_id', uid)
        .gte('date', format(subDays(new Date(), 13), 'yyyy-MM-dd'))
        .order('date', { ascending: false }),
      safeCount(uid, 'kick_sessions'),
      safeCount(uid, 'contraction_entries'),
      safeCount(uid, 'weight_entries'),
      safeCount(uid, 'appointments'),
    ])

    if (id !== requestId.current) return

    const preg = pregRes.data as Record<string, string | null | undefined> | null
    const dueRaw =
      (preg?.due_date as string | undefined) ??
      (preg?.estimated_due_date as string | undefined) ??
      (preg?.edd as string | undefined) ??
      null
    const lmpRaw = (preg?.lmp_date as string | undefined) ?? (preg?.last_menstrual_period as string | undefined) ?? null
    const w = pregnancyWeekFromDueOrLmp({ dueDateIso: dueRaw, lmpIso: lmpRaw })
    setWeek(w)

    setHealthGoalIds(normalizeHealthPriorities(profileRes.data?.health_priorities))

    const streakDays = computeStreak(habitDates)
    const daysW = daysTrackedThisWeek(habitDates)
    const lastIso = latestDateInSet(habitDates)
    let lastLoggedDaysAgo: number | null = null
    if (lastIso) {
      try {
        lastLoggedDaysAgo = Math.max(
          0,
          differenceInCalendarDays(startOfDay(new Date()), startOfDay(parseISO(lastIso))),
        )
      } catch {
        lastLoggedDaysAgo = null
      }
    }
    const symptomLogDays = countSymptomDaysLast14((symptomRes.data ?? []) as { date: string; symptoms: unknown }[])

    setSignals({
      daysLoggedThisWeek: daysW,
      streakDays,
      lastLoggedDaysAgo,
      activeLogDaysLookback: habitDates.size,
      symptomLogDays,
    })

    setUsage({
      kicks: kicksC,
      contractions: contrC,
      weight: weightC,
      appointments: apptC,
    })

    setWeekLogsState(weekLogsFetched)

    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void loadHome()
  }, [loadHome, refreshKey])

  useFocusEffect(
    useCallback(() => {
      void loadHome()
    }, [loadHome]),
  )

  const trimester = useMemo(() => trimesterFromWeek(week), [week])
  const baby = useMemo(() => getBabyWeekSnapshot(week), [week])
  const daysLeft = useMemo(() => daysUntilDueApprox(week), [week])
  const percentComplete = useMemo(
    () => Math.round((week / TOTAL_PREGNANCY_WEEKS) * 100),
    [week],
  )
  const progress = week / TOTAL_PREGNANCY_WEEKS

  const tier = useMemo(() => pregnancyEngagementTier(signals), [signals])

  const forYou = useMemo(
    () => buildPregnancyForYouCopy({ week, trimester, healthGoalIds, signals, tier }),
    [week, trimester, healthGoalIds, signals, tier],
  )

  const headerSubtitle = useMemo(() => buildPregnancyHeaderSubtitle(week, daysLeft), [week, daysLeft])

  const pregFacts = useMemo(
    () =>
      buildPregnancyAiFactsLine({
        week,
        trimester,
        healthGoalIds,
        tier,
        signals,
      }),
    [week, trimester, healthGoalIds, tier, signals],
  )

  const thisWeekSupport = useMemo(
    () => buildThisWeekSupportLine({ tier, healthGoalIds, signals }),
    [tier, healthGoalIds, signals],
  )

  const nextWeekLine = useMemo(() => buildNextWeekInsightLine(week), [week])
  const patternBlock = useMemo(() => buildPregnancyPatternInsight(weekLogsState), [weekLogsState])

  const quickActions = useMemo(
    () => buildPregnancyQuickActions({ week, trimester, healthGoalIds, usage }),
    [week, trimester, healthGoalIds, usage],
  )

  const ringMilestone = useMemo(() => milestoneHintForWeek(week), [week])
  const ringProgressLine = useMemo(() => buildRingProgressLine(percentComplete), [percentComplete])

  const handleKickCounter = useCallback(() => {
    nav.navigate('KickCounter')
  }, [nav])

  const handleContractionTimer = useCallback(() => {
    nav.navigate('ContractionTimer')
  }, [nav])

  const handleWeightTracker = useCallback(() => {
    nav.navigate('WeightTracker')
  }, [nav])

  const handleAppointments = useCallback(() => {
    nav.navigate('Appointments')
  }, [nav])

  const onQuickAction = useCallback(
    (id: PregnancyQuickActionId) => {
      if (id === 'kicks') handleKickCounter()
      else if (id === 'contractions') handleContractionTimer()
      else if (id === 'weight') handleWeightTracker()
      else handleAppointments()
    },
    [handleKickCounter, handleContractionTimer, handleWeightTracker, handleAppointments],
  )

  const handleMoodQuick = useCallback(
    async (moodId: string) => {
      const uid = user?.id
      const dbMood = MOOD_ID_TO_DB[moodId]
      if (!uid || !dbMood) {
        Alert.alert('Sign in to save', 'Create an account or sign in to store your mood.')
        return
      }
      setMoodSaving(true)
      const { error } = await upsertDailyLog({ userId: uid, mood: dbMood, notes: null })
      setMoodSaving(false)
      if (error) {
        Alert.alert('Could not save', error.message)
        return
      }
      bumpCycleRefresh()
      setMoodSavedFlash(true)
      setTimeout(() => setMoodSavedFlash(false), 2000)
      void loadHome()
    },
    [user?.id, bumpCycleRefresh, loadHome],
  )

  const handleOpenFullMood = useCallback(() => {
    nav.navigate('MoodTracker')
  }, [nav])

  const handleOpenLog = useCallback(() => {
    nav.navigate('SymptomPicker')
  }, [nav])

  const actionIconFor = useCallback((id: PregnancyQuickActionId) => {
    if (id === 'kicks')
      return <Heart size={20} color={ThemeColors.primary} strokeWidth={1.8} />
    if (id === 'contractions') return <Timer size={20} color={PURPLE} strokeWidth={1.8} />
    if (id === 'weight') return <Scale size={20} color={ThemeColors.mint} strokeWidth={1.8} />
    return <Calendar size={20} color={ThemeColors.sky} strokeWidth={1.8} />
  }, [])

  const actionIconBgFor = useCallback((id: PregnancyQuickActionId) => {
    if (id === 'kicks') return ThemeColors.pinkSurface
    if (id === 'contractions') return PURPLE_LIGHT
    if (id === 'weight') return '#EAFFE2'
    return '#E8F4FC'
  }, [])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Your Pregnancy</Text>
          {loading ?
            <ActivityIndicator size="small" color={PURPLE} style={styles.headerSpinner} />
          : null}
        </View>
        <Text style={styles.subtitle}>{headerSubtitle}</Text>
      </View>

      <AIInsight
        insightType="fertility"
        screenKey="pregnancy-home"
        fallbackText={forYou.insight}
        fallbackAction={forYou.action}
        factsLine={pregFacts}
        fetchEnabled={false}
        style={{ marginBottom: ThemeSpacing['5'] }}
      />

      <Image
        source={getImage('pregnancy')}
        style={styles.pregnancyHero}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
      />

      <View style={styles.ringSection}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svgAbs}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={PURPLE_LIGHT}
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
                stroke={PURPLE}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_CIRC}`}
                strokeDashoffset={RING_CIRC * (1 - progress)}
              />
            </Svg>
          </View>
          <View style={styles.ringCenter}>
            <Baby size={28} color={PURPLE} strokeWidth={1.8} />
            <Text style={styles.weekNum}>Week {week}</Text>
            <Text style={styles.ringMeta}>{ringProgressLine}</Text>
            <Text style={styles.ringMetaMuted}>{baby.compareName}</Text>
          </View>
        </View>
        <View style={styles.trimesterBadge}>
          <Text style={styles.trimesterText}>{trimesterLabel(trimester)}</Text>
        </View>
        <Text style={styles.milestoneCaption} numberOfLines={3}>
          {ringMilestone}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{daysLeft}</Text>
          <Text style={styles.statLabel}>Days left</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{percentComplete}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{baby.weightLine}</Text>
          <Text style={styles.statLabel}>{baby.compareName}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>THIS WEEK</Text>
      <View style={styles.weekCard}>
        <View style={styles.weekCardIcon}>
          <Baby size={24} color={PURPLE} strokeWidth={1.6} />
        </View>
        <View style={styles.weekCardBody}>
          <Text style={styles.weekCardTitle}>{baby.compareName}</Text>
          <Text style={styles.weekCardSub}>
            {baby.lengthLine} · {baby.weightLine}
          </Text>
          <Text style={styles.weekCardDesc}>{baby.developmentLine}</Text>
          <Text style={styles.weekCardSupport}>{thisWeekSupport}</Text>
          <Text style={styles.weekCardPredict}>{nextWeekLine}</Text>
          <Text style={styles.weekCardPredictMuted}>{baby.comingSoonLine}</Text>
          <View style={styles.weekProgressTrack}>
            <View style={[styles.weekProgressFill, { width: `${percentComplete}%` }]} />
          </View>
        </View>
      </View>

      {patternBlock ?
        <>
          <Text style={styles.sectionHeader}>{patternBlock.title.toUpperCase()}</Text>
          <View style={styles.patternCard}>
            <Text style={styles.patternBody}>{patternBlock.body}</Text>
          </View>
        </>
      : null}

      <Text style={styles.sectionHeader}>DAILY CHECK-IN</Text>
      <View style={styles.checkInCard}>
        <Text style={styles.checkInTitle}>How are you right now?</Text>
        <Text style={styles.checkInSub}>{"One tap saves to today's log"}</Text>
        <View style={styles.moodRow}>
          {MOOD_QUICK_OPTIONS.map((m) => {
            const Icon = m.icon
            return (
              <Pressable
                key={m.id}
                onPress={() => void handleMoodQuick(m.id)}
                disabled={moodSaving}
                style={({ pressed }) => [
                  styles.moodChip,
                  { borderColor: ThemeColors.border, backgroundColor: ThemeColors.surface },
                  pressed && { opacity: 0.72 },
                ]}
                accessibilityLabel={m.label}
              >
                <View style={[styles.moodChipIcon, { backgroundColor: m.bg }]}>
                  <Icon size={22} color={m.color} strokeWidth={1.8} />
                </View>
                <Text style={styles.moodChipLabel} numberOfLines={1}>
                  {m.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <View style={styles.checkInFooter}>
          {moodSavedFlash || moodSaving ?
            <Text style={styles.checkInSaved}>{moodSaving ? 'Saving…' : 'Saved for today'}</Text>
          : null}
          <Pressable onPress={handleOpenFullMood} style={({ pressed }) => [pressed && { opacity: 0.65 }]}>
            <Text style={styles.checkInLink}>Full mood log →</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
      <View style={styles.actionsCard}>
        {quickActions.map((row, idx) => (
          <React.Fragment key={row.id}>
            {idx > 0 ? <View style={styles.actionDivider} /> : null}
            <ActionRow
              icon={actionIconFor(row.id)}
              iconBg={actionIconBgFor(row.id)}
              title={row.title}
              subtitle={row.subtitle}
              hint={row.hint}
              dotColor={row.id === 'kicks' ? ThemeColors.primary : undefined}
              onPress={() => onQuickAction(row.id)}
            />
          </React.Fragment>
        ))}
      </View>

      <Pressable
        onPress={handleOpenLog}
        style={({ pressed }) => [styles.logNudge, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.logNudgeText}>Log sleep, energy, or symptoms</Text>
        <ChevronRight size={18} color={ThemeColors.lavender} strokeWidth={2} />
      </Pressable>
    </ScrollView>
  )
}

interface ActionRowProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  hint?: string
  dotColor?: string
  onPress: () => void
}

const ActionRow = React.memo(function ActionRow({
  icon,
  iconBg,
  title,
  subtitle,
  hint,
  dotColor,
  onPress,
}: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.actionBody}>
        <View style={styles.actionTitleRow}>
          <Text style={styles.actionTitle}>{title}</Text>
          {dotColor ? <View style={[styles.actionDot, { backgroundColor: dotColor }]} /> : null}
        </View>
        <Text style={styles.actionSub}>{subtitle}</Text>
        {hint ? <Text style={styles.actionHint}>{hint}</Text> : null}
      </View>
      <ChevronRight size={18} color={ThemeColors.textLight} strokeWidth={2} />
    </Pressable>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  header: { marginBottom: 24 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpinner: { marginRight: 4 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, flex: 1 },
  subtitle: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, marginTop: 4 },

  pregnancyHero: {
    width: '100%',
    height: 152,
    borderRadius: ThemeRadius.card,
    marginBottom: ThemeSpacing['4'],
    backgroundColor: PURPLE_LIGHT,
  },
  ringSection: { alignItems: 'center', paddingVertical: 16, marginBottom: 24 },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgAbs: { position: 'absolute' },
  ringCenter: { alignItems: 'center', gap: 4 },
  weekNum: { fontSize: 22, fontWeight: '800', color: ThemeColors.textDark },
  ringMeta: { fontSize: 13, fontWeight: '600', color: PURPLE },
  ringMetaMuted: { fontSize: 12, fontWeight: '500', color: ThemeColors.textMid, marginTop: 2 },
  milestoneCaption: {
    fontSize: 12,
    fontWeight: '500',
    color: ThemeColors.textMid,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    lineHeight: 17,
  },
  trimesterBadge: {
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: ThemeRadius.pill,
    marginTop: 16,
  },
  trimesterText: { fontSize: 13, fontWeight: '600', color: PURPLE },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    paddingVertical: 16,
    marginBottom: 32,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: ThemeColors.textDark },
  statLabel: { fontSize: 12, fontWeight: '500', color: ThemeColors.textMid },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: ThemeColors.border,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: ThemeColors.textLight,
    letterSpacing: 1,
    marginBottom: 12,
  },

  weekCard: {
    flexDirection: 'row',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  weekCardIcon: {
    width: 48,
    height: 48,
    borderRadius: ThemeRadius.md,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCardBody: { flex: 1, gap: 4 },
  weekCardTitle: { fontSize: 17, fontWeight: '700', color: ThemeColors.textDark },
  weekCardSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid },
  weekCardDesc: { fontSize: 14, fontWeight: '400', color: PURPLE, marginTop: 4 },
  weekCardSupport: { fontSize: 13, fontWeight: '500', color: ThemeColors.textDark, marginTop: 4, lineHeight: 19 },
  weekCardPredict: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid, marginTop: 4, lineHeight: 18 },
  weekCardPredictMuted: { fontSize: 12, fontWeight: '400', color: ThemeColors.textLight, lineHeight: 17 },
  weekProgressTrack: {
    height: 4,
    borderRadius: ThemeRadius.xs,
    backgroundColor: PURPLE_LIGHT,
    marginTop: 8,
    overflow: 'hidden',
  },
  weekProgressFill: {
    height: '100%',
    borderRadius: ThemeRadius.xs,
    backgroundColor: PURPLE,
  },

  patternCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: ThemeColors.lavender,
  },
  patternBody: { fontSize: 14, fontWeight: '500', color: ThemeColors.textDark, lineHeight: 21 },

  checkInCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginBottom: 32,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  checkInTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  checkInSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  moodChip: {
    width: '31%' as const,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: ThemeRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  moodChipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodChipLabel: { fontSize: 11, fontWeight: '600', color: ThemeColors.textDark },
  checkInFooter: { marginTop: 8, gap: 4 },
  checkInSaved: { fontSize: 12, fontWeight: '600', color: ThemeColors.mint },
  checkInLink: { fontSize: 14, fontWeight: '600', color: ThemeColors.lavender },

  actionsCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: ThemeRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: { flex: 1 },
  actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: ThemeColors.textDark },
  actionDot: { width: 6, height: 6, borderRadius: 3 },
  actionSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid, marginTop: 2 },
  actionHint: { fontSize: 11, fontWeight: '600', color: ThemeColors.lavender, marginTop: 4 },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ThemeColors.border,
    marginLeft: 68,
  },

  logNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    marginBottom: 8,
  },
  logNudgeText: { fontSize: 14, fontWeight: '600', color: ThemeColors.lavender },
})