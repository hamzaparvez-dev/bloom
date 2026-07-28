/**
 * Pregnancy home personalization — rule-based copy, ordering, and facts.
 * All branching for “For you”, week copy, engagement, quick actions, and
 * pattern hints lives here so the screen stays presentational.
 */
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import type { WeekLogMini } from './daily-habit'
import { buildWeeklyReflection } from './daily-habit'

export const TOTAL_PREGNANCY_WEEKS = 40

export type PregnancyEngagementTier = 'new' | 'active' | 'inactive'

export type PregnancyQuickActionId = 'kicks' | 'contractions' | 'weight' | 'appointments'

export interface PregnancyLogSignals {
  /** Days in the last 7 calendar days with any log activity */
  daysLoggedThisWeek: number
  /** Consecutive streak from daily_habit helpers */
  streakDays: number
  /** Days since last log, null if never */
  lastLoggedDaysAgo: number | null
  /** Approximate active log days in lookback window */
  activeLogDaysLookback: number
  /** Distinct days in last 14 with symptom entries */
  symptomLogDays: number
}

export interface BabyWeekSnapshot {
  compareName: string
  lengthLine: string
  weightLine: string
  developmentLine: string
  comingSoonLine: string
}

interface Anchor {
  w: number
  compareName: string
  lengthCm: number
  weightG: number
  developmentLine: string
}

/** Stair-step reference points (not clinical measurements). */
const BABY_ANCHORS: Anchor[] = [
  { w: 8, compareName: 'Raspberry-sized', lengthCm: 1.6, weightG: 1, developmentLine: 'Major organs are forming.' },
  { w: 12, compareName: 'Lime-sized', lengthCm: 5.4, weightG: 14, developmentLine: 'Reflexes are beginning to emerge.' },
  { w: 16, compareName: 'Avocado-sized', lengthCm: 16, weightG: 100, developmentLine: 'Baby can make small movements you may start to notice.' },
  { w: 20, compareName: 'Banana-sized', lengthCm: 25, weightG: 300, developmentLine: 'Hearing is developing—your voice becomes familiar.' },
  { w: 24, compareName: 'Corn-sized', lengthCm: 30, weightG: 600, developmentLine: 'Baby can respond to familiar sounds and touch.' },
  { w: 28, compareName: 'Eggplant-sized', lengthCm: 37, weightG: 1000, developmentLine: 'Rapid brain growth supports sleep-wake cycles.' },
  { w: 32, compareName: 'Squash-sized', lengthCm: 42, weightG: 1700, developmentLine: 'Baby practices breathing-like movements.' },
  { w: 36, compareName: 'Honeydew-sized', lengthCm: 47, weightG: 2600, developmentLine: 'Baby is gaining weight for life outside.' },
  { w: 40, compareName: 'Watermelon-sized', lengthCm: 50, weightG: 3400, developmentLine: 'Full term—baby is ready to meet you soon.' },
]

function anchorAtOrBefore(week: number): Anchor {
  const w = Math.max(1, Math.min(TOTAL_PREGNANCY_WEEKS, week))
  let best = BABY_ANCHORS[0]
  for (const a of BABY_ANCHORS) {
    if (a.w <= w) best = a
  }
  return best
}

function anchorAfter(week: number): Anchor | null {
  const nextW = week + 1
  if (nextW > TOTAL_PREGNANCY_WEEKS) return null
  for (const a of BABY_ANCHORS) {
    if (a.w >= nextW) return a
  }
  return null
}

export function getBabyWeekSnapshot(week: number): BabyWeekSnapshot {
  const cur = anchorAtOrBefore(week)
  const next = anchorAfter(week)
  const len = `~${cur.lengthCm} cm`
  const wt =
    cur.weightG >= 1000 ? `~${(cur.weightG / 1000).toFixed(1)} kg` : `~${cur.weightG} g`
  const coming =
    next != null && next.w > cur.w
      ? `Coming soon: closer to ${next.compareName.toLowerCase().replace('-sized', '')} size with more lung maturation.`
      : 'Coming soon: practice feeds, rest, and final growth spurts.'
  return {
    compareName: cur.compareName,
    lengthLine: len,
    weightLine: wt,
    developmentLine: cur.developmentLine,
    comingSoonLine: coming,
  }
}

export function trimesterFromWeek(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 27) return 2
  return 3
}

export function trimesterLabel(t: 1 | 2 | 3): string {
  if (t === 1) return '1st Trimester'
  if (t === 2) return '2nd Trimester'
  return '3rd Trimester'
}

export function pregnancyWeekFromDueOrLmp(input: {
  dueDateIso: string | null
  lmpIso: string | null
}): number {
  const today = startOfDay(new Date())
  try {
    if (input.lmpIso) {
      const lmp = startOfDay(parseISO(input.lmpIso.slice(0, 10)))
      const days = differenceInCalendarDays(today, lmp)
      const w = Math.floor(days / 7)
      return Math.max(1, Math.min(TOTAL_PREGNANCY_WEEKS, w))
    }
    if (input.dueDateIso) {
      const due = startOfDay(parseISO(input.dueDateIso.slice(0, 10)))
      const daysUntilDue = differenceInCalendarDays(due, today)
      const daysPregnant = 280 - daysUntilDue
      const w = Math.floor(daysPregnant / 7)
      return Math.max(1, Math.min(TOTAL_PREGNANCY_WEEKS, w))
    }
  } catch {
    return 16
  }
  return 16
}

/** Engagement from logs only (no server “score”). */
export function pregnancyEngagementTier(s: PregnancyLogSignals): PregnancyEngagementTier {
  if (s.activeLogDaysLookback < 3 && (s.lastLoggedDaysAgo == null || s.lastLoggedDaysAgo >= 2)) return 'new'
  if (s.lastLoggedDaysAgo != null && s.lastLoggedDaysAgo >= 5) return 'inactive'
  if (s.lastLoggedDaysAgo != null && s.lastLoggedDaysAgo >= 3 && s.streakDays < 2 && s.daysLoggedThisWeek < 2)
    return 'inactive'
  if (s.streakDays >= 2 || s.daysLoggedThisWeek >= 4) return 'active'
  return 'active'
}

function hasGoal(goals: string[], id: string): boolean {
  return goals.includes(id)
}

/**
 * “For you” card — primary insight + secondary action line when AI fetch is disabled
 * or as the fallback passed into AIInsight.
 */
export function buildPregnancyForYouCopy(input: {
  week: number
  trimester: 1 | 2 | 3
  healthGoalIds: string[]
  signals: PregnancyLogSignals
  tier: PregnancyEngagementTier
}): { insight: string; action: string } {
  const { week, trimester, healthGoalIds: g, signals: s, tier } = input

  if (s.daysLoggedThisWeek === 0 && (s.lastLoggedDaysAgo == null || s.lastLoggedDaysAgo >= 1)) {
    const sleep = hasGoal(g, 'sleep')
    const stress = hasGoal(g, 'stress')
    if (sleep)
      return {
        insight: 'Sleep is easier to protect when you log nights—even rough hours help.',
        action: 'Add mood or sleep in Log today so tips can match your week.',
      }
    if (stress)
      return {
        insight: 'A single mood tap makes stress patterns visible faster.',
        action: 'Open Log and save how you feel—Bloom does the pattern work.',
      }
    return {
      insight: 'Small logs this week make the rest of pregnancy tracking feel lighter.',
      action: 'Tap Log once today—mood, sleep, or symptoms all count.',
    }
  }

  if (hasGoal(g, 'sleep') && trimester >= 2) {
    return {
      insight: 'Side sleeping and steady hydration often pair with better third-trimester rest.',
      action: 'Note sleep length when you can—nights read clearer next to mood.',
    }
  }
  if (hasGoal(g, 'stress')) {
    return {
      insight: 'Slow breathing for two minutes can lower cortisol enough to feel a shift.',
      action: 'Pair a calm mood tap with one symptom note when tension shows up.',
    }
  }
  if (hasGoal(g, 'active')) {
    return {
      insight: 'Short walks still count—match intensity to how your body feels today.',
      action: 'Log energy in Log when it changes; it tracks nicely with your week count.',
    }
  }
  if (hasGoal(g, 'nutrition')) {
    return {
      insight: 'Protein-forward snacks help steady energy between bigger meals.',
      action: 'When you log symptoms, add hunger or nausea—it sharpens weekly tips.',
    }
  }

  if (tier === 'inactive') {
    return {
      insight: 'We miss you—one log brings your week back into focus.',
      action: 'Open Log and save anything today; Bloom picks up where you left off.',
    }
  }

  if (trimester === 1) {
    return {
      insight: 'Early weeks reward gentle routines—small habits compound for you and baby.',
      action: 'Keep logging—your goals steer what Bloom highlights next.',
    }
  }
  if (trimester === 2) {
    return {
      insight: `Week ${week} is often an energy sweet spot—use it for what matters to you.`,
      action: 'Log a little often so “This week” stays tuned to your real days.',
    }
  }
  return {
    insight: 'Rhythm checks, rest, and honest logs are the premium trio in late pregnancy.',
    action: 'Kick counts and mood taps together tell a clearer story for you.',
  }
}

/** Subtitle under “Your Pregnancy”. */
export function buildPregnancyHeaderSubtitle(week: number, daysLeftApprox: number): string {
  return `Week ${week} of ${TOTAL_PREGNANCY_WEEKS} · ~${daysLeftApprox} days to go`
}

export function daysUntilDueApprox(week: number): number {
  return Math.max(0, (TOTAL_PREGNANCY_WEEKS - week) * 7)
}

/** Ring area: percent + milestone (trimester badge stays separate). */
export function buildRingProgressLine(percentComplete: number): string {
  return `${percentComplete}% complete`
}

export function milestoneHintForWeek(week: number): string {
  if (week <= 13) return 'Next milestone: many teams schedule genetic screening around 10–13 weeks.'
  if (week <= 20) return 'Next milestone: anatomy scan is often booked around 18–22 weeks.'
  if (week <= 27) return 'Next milestone: glucose screening is common in the late second trimester.'
  if (week <= 33) return 'Next milestone: third trimester growth and kick patterns get more attention.'
  if (week <= 36) return 'Next milestone: discuss signs of labor and when to call your clinician.'
  return 'Next milestone: full term—finalize your birth preferences and support plan.'
}

/** Adaptive “This week” supportive line (tone by engagement + goals). */
export function buildThisWeekSupportLine(input: {
  tier: PregnancyEngagementTier
  healthGoalIds: string[]
  signals: PregnancyLogSignals
}): string {
  const { tier, healthGoalIds: g, signals: s } = input
  if (hasGoal(g, 'stress'))
    return 'When things feel loud, name one sensation (warm, tight, heavy)—it often softens the edge.'
  if (tier === 'inactive')
    return 'No pressure—when you are ready, a short log reconnects this card to your real week.'
  if (tier === 'new')
    return 'New here: pick one habit (mood or sleep) and try three days in a row.'
  if (s.streakDays >= 3) return 'Your consistency shows—small logs are doing real work for you.'
  return 'You are showing up—keep pairing quick logs with what your body needs today.'
}

/** “Next week” preview line (rule-based, not medical advice). */
export function buildNextWeekInsightLine(week: number): string {
  const nw = Math.min(TOTAL_PREGNANCY_WEEKS, week + 1)
  const snap = getBabyWeekSnapshot(nw)
  return `Next week: trending ${snap.compareName.toLowerCase()} with more ${nw >= 28 ? 'brain and lung' : 'movement and sensory'} refinement.`
}

export interface QuickActionScore {
  id: PregnancyQuickActionId
  title: string
  subtitle: string
  hint?: string
}

/**
 * Reorder quick actions by pregnancy stage, goals, and light usage counts.
 */
export function buildPregnancyQuickActions(input: {
  week: number
  trimester: 1 | 2 | 3
  healthGoalIds: string[]
  usage: Record<PregnancyQuickActionId, number>
}): QuickActionScore[] {
  const { week, trimester, healthGoalIds: g, usage } = input

  const base: QuickActionScore[] = [
    {
      id: 'kicks',
      title: 'Kick Counter',
      subtitle: 'Track baby movements',
    },
    {
      id: 'contractions',
      title: 'Contraction Timer',
      subtitle: 'Time and log contractions',
    },
    {
      id: 'weight',
      title: 'Weight Tracker',
      subtitle: 'Monitor weight gain',
    },
    {
      id: 'appointments',
      title: 'Appointments',
      subtitle: 'Upcoming visits & reminders',
    },
  ]

  const score = (row: QuickActionScore): number => {
    let s = 0
    const u = usage[row.id] ?? 0
    s += Math.min(24, u * 4)

    if (row.id === 'kicks') {
      if (trimester === 3 || week >= 26) s += 38
      if (hasGoal(g, 'active')) s += 6
    }
    if (row.id === 'contractions') {
      if (trimester === 3 || week >= 32) s += 36
    }
    if (row.id === 'weight') {
      if (trimester <= 2) s += 18
      if (hasGoal(g, 'nutrition') || hasGoal(g, 'sleep')) s += 10
    }
    if (row.id === 'appointments') {
      if (trimester === 1) s += 22
      if (week === 12 || week === 20 || week === 28) s += 14
      if (hasGoal(g, 'stress')) s += 6
    }
    return s
  }

  const sorted = [...base].sort((a, b) => score(b) - score(a))

  const recommendedId: PregnancyQuickActionId =
    trimester === 3 ? 'kicks' : week <= 14 ? 'appointments' : 'weight'

  return sorted.map((row) => {
    const often = (usage[row.id] ?? 0) >= 3
    const rec = row.id === recommendedId
    let hint: string | undefined
    if (rec && often) hint = 'Recommended · Used often'
    else if (rec) hint = 'Recommended this week'
    else if (often) hint = 'Used often'
    return { ...row, hint }
  })
}

/**
 * Pattern insight block after enough logs (reuses weekly reflection engine).
 */
export function buildPregnancyPatternInsight(weekLogs: WeekLogMini[]): { title: string; body: string } | null {
  if (weekLogs.length < 5) return null
  const ref = buildWeeklyReflection(weekLogs)
  if (!ref) return null
  let body = ref.summary
  if (body.includes('Energy dipped a little.'))
    body = body.replace('Energy dipped a little.', "You've been more tired this week.")
  if (body.includes('Mood steadier this week.'))
    body = body.replace('Mood steadier this week.', 'Mood improving over time.')
  if (body.includes('Mood a little bumpier this week.'))
    body = body.replace('Mood a little bumpier this week.', 'Mood has been a little more variable lately.')
  return { title: 'Your pattern', body }
}

/** Facts string for optional AI enrichment. */
export function buildPregnancyAiFactsLine(input: {
  week: number
  trimester: 1 | 2 | 3
  healthGoalIds: string[]
  tier: PregnancyEngagementTier
  signals: PregnancyLogSignals
}): string {
  const goalsCsv = input.healthGoalIds.join(',')
  return `journey:pregnancy;week:${input.week};trimester:${input.trimester};goals:${goalsCsv};tier:${input.tier};logs7:${input.signals.daysLoggedThisWeek};streak:${input.signals.streakDays};symptomDays:${input.signals.symptomLogDays}`
}
