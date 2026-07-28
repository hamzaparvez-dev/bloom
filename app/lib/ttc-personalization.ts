/**
 * TTC rule-based personalization — single source for Trying-to-Conceive copy and ordering.
 *
 * Decision rule map (each block below is tagged `// RULE:` in code):
 * 1. `deriveEngagementTier` — new vs active vs inactive from logs + fertility recency
 * 2. `deriveProgressMessage` — week-over-week habit / BBT improvement
 * 3. `deriveHomeSubtitle` — engagement tone on the home header line
 * 4. `deriveTtcCycleContext` — cycle day, phase, fertile window (RPC dates override heuristics)
 * 5. `buildTtcFactors` — four contributing bars + explanation + “what’s next”
 * 6. `computeOverallFertilityScore` — weighted blend of those bars
 * 7. `buildFertilityScoreInsight` — ring badge + interpretation + two actions
 * 8. `buildTodayStats` / `buildTodayBlock` — TODAY strip + decision copy
 * 9. `buildResourceRows` — resource list sort + “For you” highlight
 * 10. `buildScoreMetrics` / `buildImprovePills` — detail screen metrics + top fixes
 * 11. `pickTopConceptionTips` / `pickTopPartnerTips` — top-3 modules by signals
 */
import { differenceInCalendarDays, format, parseISO, startOfDay, subDays } from 'date-fns'
import { supabase } from '../../supabaseClient'
import { ThemeColors } from '../constants/theme'
import type { CyclePredictionsJson } from './cycle-home-insight'
import { getCycleState, inferLastPeriodStartIso } from './cycle-home-retention'
import { normalizeHealthPriorities } from './personalization'
import { fetchLogDatesWithActivity } from './daily-habit'

/** Raw inputs gathered once per screen — all optional-safe for guests. */
export interface TtcPersonalizationSignals {
  pred: CyclePredictionsJson | null
  cycleLengthSetting: number
  healthGoalIds: string[]
  todayOpk: string | null
  todayMucus: string | null
  todayBbt: number | null
  /** Days in the last 14 with a BBT value logged. */
  bbtDaysLast14: number
  /** Distinct calendar days in the last 7 with any OPK result. */
  opkDistinctDaysLast7: number
  /** Days in the last 7 with vitamins marked complete in `ttc_actions`. */
  vitaminDaysLast7: number
  /** Days in the last 7 with movement logged in `ttc_actions`. */
  exerciseDaysLast7: number
  /** Daily log activity days in the trailing 7 days. */
  habitDaysLast7: number
  /** Daily log activity days in the 7 days before that (for progress compare). */
  habitDaysPrev7: number
  /** Calendar days since any `fertility_data` row (null if never). */
  daysSinceAnyFertilityLog: number | null
}

/** Guest / pre-fetch baseline — all screens share this shape. */
export function createDefaultTtcSignals(): TtcPersonalizationSignals {
  return {
    pred: null,
    cycleLengthSetting: 28,
    healthGoalIds: [],
    todayOpk: null,
    todayMucus: null,
    todayBbt: null,
    bbtDaysLast14: 0,
    opkDistinctDaysLast7: 0,
    vitaminDaysLast7: 0,
    exerciseDaysLast7: 0,
    habitDaysLast7: 0,
    habitDaysPrev7: 0,
    daysSinceAnyFertilityLog: null,
  }
}

export type TtcEngagementTier = 'new' | 'active' | 'inactive'

export interface TtcFertilityScoreInsight {
  interpretation: string
  actions: [string, string?]
  badgeLabel: string
}

export interface TtcFactorView {
  id: string
  label: string
  pct: number
  fill: string
  explanation: string
  whatNext: string
}

export interface TtcTodayBlock {
  title: string
  body: string
  primaryCtaLabel: string
}

export interface TtcResourceRowModel {
  key: 'tips' | 'partner' | 'journal' | 'report' | 'score'
  title: string
  subtitle: string
  highlight: boolean
}

export interface TtcTipModule {
  title: string
  action: string
  whyItMatters: string
  iconKey: string
}

const TTC_GREEN = '#10B981'

/** ─── Data fetch (no business rules) ───────────────────────────────────── */

export async function fetchTtcPersonalizationSignals(userId: string | undefined): Promise<TtcPersonalizationSignals> {
  if (!userId) return createDefaultTtcSignals()

  const today = format(new Date(), 'yyyy-MM-dd')
  const d14 = format(subDays(new Date(), 13), 'yyyy-MM-dd')
  const d7 = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  const [predRes, settingsRes, profileRes, fdTodayRes, fdRangeRes, fdLastRes, actRes, habitSet] = await Promise.all([
    supabase.rpc('get_cycle_predictions', { p_user_id: userId }),
    supabase.from('user_settings').select('cycle_length').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('health_priorities').eq('id', userId).maybeSingle(),
    supabase.from('fertility_data').select('opk_result, cervical_mucus, current_bbt').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('fertility_data').select('date, current_bbt, opk_result').eq('user_id', userId).gte('date', d14),
    supabase.from('fertility_data').select('date').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('ttc_actions').select('date, type, completed, value').eq('user_id', userId).gte('date', d7),
    fetchLogDatesWithActivity(userId, 14),
  ])

  const pred = parsePred(predRes.data)
  const cl = settingsRes.data?.cycle_length
  const cycleLengthSetting = typeof cl === 'number' && Number.isFinite(cl) ? Math.min(45, Math.max(18, Math.round(cl))) : 28

  const fdToday = fdTodayRes.data
  const rangeRows = fdRangeRes.data ?? []

  let bbtDaysLast14 = 0
  const bbtSeen = new Set<string>()
  const opkLast7 = new Set<string>()
  for (const row of rangeRows) {
    const d = String(row.date ?? '').slice(0, 10)
    if (!d) continue
    if (row.current_bbt != null && Number.isFinite(Number(row.current_bbt))) bbtSeen.add(d)
    if (d >= d7 && row.opk_result) opkLast7.add(d)
  }
  bbtDaysLast14 = bbtSeen.size

  const actions = actRes.data ?? []
  const vitDays = new Set<string>()
  const exDays = new Set<string>()
  for (const a of actions) {
    const d = String(a.date ?? '').slice(0, 10)
    if (!d || d < d7) continue
    if (a.type === 'vitamins' && a.completed) vitDays.add(d)
    if (a.type === 'log' && a.completed && String(a.value ?? '').trim().length > 0) exDays.add(d)
  }

  let habitDaysLast7 = 0
  let habitDaysPrev7 = 0
  for (let i = 0; i < 14; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (!habitSet.has(d)) continue
    if (i < 7) habitDaysLast7++
    else habitDaysPrev7++
  }

  let daysSinceAnyFertilityLog: number | null = null
  const lastFd = fdLastRes.data?.date
  if (typeof lastFd === 'string') {
    try {
      daysSinceAnyFertilityLog = Math.max(0, differenceInCalendarDays(startOfDay(new Date()), startOfDay(parseISO(`${lastFd}T12:00:00`))))
    } catch {
      daysSinceAnyFertilityLog = null
    }
  }

  return {
    pred,
    cycleLengthSetting,
    healthGoalIds: normalizeHealthPriorities(profileRes.data?.health_priorities),
    todayOpk: fdToday?.opk_result != null ? String(fdToday.opk_result) : null,
    todayMucus: fdToday?.cervical_mucus != null ? String(fdToday.cervical_mucus) : null,
    todayBbt: fdToday?.current_bbt != null && Number.isFinite(Number(fdToday.current_bbt)) ? Number(fdToday.current_bbt) : null,
    bbtDaysLast14,
    opkDistinctDaysLast7: opkLast7.size,
    vitaminDaysLast7: vitDays.size,
    exerciseDaysLast7: exDays.size,
    habitDaysLast7,
    habitDaysPrev7,
    daysSinceAnyFertilityLog,
  }
}

function parsePred(raw: unknown): CyclePredictionsJson | null {
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

/** ─── Derived cycle / window (rules) ───────────────────────────────────── */

export function deriveTtcCycleContext(s: TtcPersonalizationSignals) {
  const cycleLen = Math.max(18, Math.round(s.cycleLengthSetting))
  const hasActiveCycle = s.pred != null && s.pred.current_cycle_day != null && Number(s.pred.current_cycle_day) >= 1
  const rawDay = s.pred?.current_cycle_day != null ? Math.round(Number(s.pred.current_cycle_day)) : null
  const cycleDay = hasActiveCycle && rawDay != null ? Math.min(cycleLen, Math.max(1, rawDay)) : null

  const lastPeriodIso = cycleDay != null ? inferLastPeriodStartIso(cycleDay) : null
  const ui = getCycleState({ lastPeriodDate: lastPeriodIso, cycleLength: cycleLen })

  // RULE: fertile window from predictions ISO when present; else classic mid-cycle band mapped to this cycle length.
  let inFertileWindow = ui.state === 'fertile'
  if (s.pred?.fertile_window_start && s.pred?.fertile_window_end) {
    try {
      const start = startOfDay(parseISO(String(s.pred.fertile_window_start).slice(0, 10)))
      const end = startOfDay(parseISO(String(s.pred.fertile_window_end).slice(0, 10)))
      const now = startOfDay(new Date())
      inFertileWindow = (now >= start && now <= end) || inFertileWindow
    } catch {
      /* keep ui.state */
    }
  }

  const approxOvulationDay = Math.round(cycleLen / 2)
  return { cycleLen, hasActiveCycle, cycleDay, ui, inFertileWindow, approxOvulationDay }
}

/** RULE: engagement — new users need guidance; inactive get nudges; active gets reinforcement. */
export function deriveEngagementTier(s: TtcPersonalizationSignals): TtcEngagementTier {
  const totalHabit = s.habitDaysLast7 + s.habitDaysPrev7
  if (totalHabit < 3 && s.bbtDaysLast14 < 4) return 'new'
  if (s.daysSinceAnyFertilityLog != null && s.daysSinceAnyFertilityLog > 5 && s.habitDaysLast7 < 2) return 'inactive'
  if (s.habitDaysLast7 === 0 && s.bbtDaysLast14 < 3) return 'inactive'
  return 'active'
}

/** RULE: progress copy when this week’s logging beats last week’s. */
export function deriveProgressMessage(s: TtcPersonalizationSignals): string | null {
  if (s.habitDaysLast7 >= s.habitDaysPrev7 + 2 && s.habitDaysLast7 >= 4)
    return 'Your daily logging is stronger this week—forecasts can tighten faster.'
  if (s.bbtDaysLast14 >= 10) return 'Your cycle tracking is more consistent this week.'
  if (s.bbtDaysLast14 >= 6 && s.bbtDaysLast14 < 10 && s.opkDistinctDaysLast7 >= 2)
    return 'BBT and OPK logs are stacking nicely—keep the rhythm through ovulation.'
  return null
}

/** RULE: headline under header — cycle day + engagement tone. */
export function deriveHomeSubtitle(s: TtcPersonalizationSignals, ctx: ReturnType<typeof deriveTtcCycleContext>): string {
  const tier = deriveEngagementTier(s)
  const dayPart =
    ctx.cycleDay != null ? `Cycle day ${ctx.cycleDay} of ${ctx.cycleLen}` : 'Log your period start to unlock cycle day'

  if (tier === 'new') return `${dayPart} · Start with one quick log today`
  if (tier === 'inactive') return `${dayPart} · Pick up where you left off—today still counts`
  return dayPart
}

/** RULE: numeric factors from signals (transparent heuristics, not medical scores). */
export function buildTtcFactors(s: TtcPersonalizationSignals, ctx: ReturnType<typeof deriveTtcCycleContext>): TtcFactorView[] {
  const avgLen = s.pred?.average_length != null ? Math.round(Number(s.pred.average_length)) : null

  // RULE: regularity — tighter typical length band scores higher when we have history.
  let regPct = 72
  let regExplain = 'Bloom is still learning your typical cycle length.'
  let regNext = 'Log each period start so length patterns stabilize.'
  if (ctx.hasActiveCycle && avgLen != null) {
    const drift = Math.abs(avgLen - ctx.cycleLen)
    regPct = Math.round(Math.min(98, 78 + Math.max(0, 20 - drift * 3)))
    regExplain =
      drift <= 1
        ? 'Your recent cycles cluster near the length you expect.'
        : 'Your logged cycles vary a bit from your current settings.'
    regNext = drift <= 1 ? 'Keep noting period starts each cycle.' : 'Confirm cycle length in settings matches your last 3 cycles.'
  } else if (ctx.hasActiveCycle) {
    regPct = 84
    regExplain = 'You have an active cycle anchor—length estimates are warming up.'
    regNext = 'Two more period starts make regularity much clearer.'
  }

  // RULE: ovulation timing — OPK + fertile window + predictions.
  let otPct = 70
  let otExplain = 'Ovulation estimates sharpen when LH and mucus are logged near mid-cycle.'
  let otNext = 'Add OPK results on peak days to anchor timing.'
  if (s.todayOpk === 'positive') {
    otPct = 96
    otExplain = 'LH surge logged—ovulation is likely within the next day or so.'
    otNext = 'Keep intimacy timing aligned for the next 24–36 hours.'
  } else if (s.opkDistinctDaysLast7 >= 2) {
    otPct = 88
    otExplain = 'You are testing OPK across the week—great for catching the surge.'
    otNext = s.todayOpk ? 'Hold steady—retest if lines are rising.' : 'Log today’s OPK if you are testing.'
  } else if (ctx.inFertileWindow) {
    otPct = 82
    otExplain = 'You are inside the fertile window—timing matters most right now.'
    otNext = 'Log OPK daily until you see peak or high tests.'
  } else if (s.pred?.next_ovulation) {
    otPct = 80
    otExplain = 'Bloom has a projected ovulation date from your history.'
    otNext = 'Add mucus and OPK as that date approaches.'
  }

  // RULE: BBT — streak of morning temps.
  const bbtPct = Math.min(96, Math.round(52 + s.bbtDaysLast14 * 3))
  const bbtExplain =
    s.bbtDaysLast14 >= 10
      ? 'Morning temps are landing most days—shift detection is reliable.'
      : s.bbtDaysLast14 >= 5
        ? 'BBT coverage is decent but a few gaps remain.'
        : 'Tracking is inconsistent or just getting started.'
  const bbtNext =
    s.bbtDaysLast14 >= 10 ? 'Keep one thermometer spot so the habit sticks.' : 'Log temperature daily before you get up.'

  // RULE: lifestyle — vitamins + movement + goals.
  const lifestyleBase = Math.round(Math.min(95, 45 + s.vitaminDaysLast7 * 6 + s.exerciseDaysLast7 * 5))
  const goalBoost = (s.healthGoalIds.includes('nutrition') ? 4 : 0) + (s.healthGoalIds.includes('active') ? 4 : 0)
  const lsPct = Math.min(98, lifestyleBase + goalBoost)
  const lsExplain =
    s.vitaminDaysLast7 >= 5
      ? 'Supplement logging looks steady—small habits compound.'
      : 'Lifestyle signals (movement + vitamins) still have room to grow.'
  const lsNext =
    s.vitaminDaysLast7 >= 5
      ? 'Keep noting movement—it helps energy and stress balance.'
      : 'Check off vitamins in your TTC checklist most days this week.'

  return [
    { id: 'cr', label: 'Cycle regularity', pct: regPct, fill: TTC_GREEN, explanation: regExplain, whatNext: regNext },
    { id: 'ot', label: 'Ovulation timing', pct: otPct, fill: TTC_GREEN, explanation: otExplain, whatNext: otNext },
    { id: 'bb', label: 'BBT pattern', pct: bbtPct, fill: ThemeColors.peach, explanation: bbtExplain, whatNext: bbtNext },
    { id: 'ls', label: 'Lifestyle score', pct: lsPct, fill: ThemeColors.lavender, explanation: lsExplain, whatNext: lsNext },
  ]
}

/** RULE: overall score = weighted blend of factor % (transparent, user-facing). */
export function computeOverallFertilityScore(factors: TtcFactorView[]): number {
  const w = [0.28, 0.32, 0.22, 0.18]
  let sum = 0
  factors.forEach((f, i) => {
    sum += f.pct * (w[i] ?? 0.2)
  })
  return Math.round(Math.min(99, Math.max(55, sum)))
}

/** RULE: score interpretation + two actions from cycle state + logs. */
export function buildFertilityScoreInsight(
  s: TtcPersonalizationSignals,
  ctx: ReturnType<typeof deriveTtcCycleContext>,
  overall: number,
): TtcFertilityScoreInsight {
  let interpretation = 'Solid foundation—keep logging to refine timing.'
  const actions: [string, string?] = ['Review today’s fertile-window checklist', undefined]

  if (s.todayOpk === 'positive') {
    interpretation = 'High chance window — LH surge supports ovulation soon.'
    actions[0] = 'Have intercourse within the next 24 hours if you are trying this cycle.'
    actions[1] = 'Log BBT tomorrow morning to confirm a sustained rise.'
  } else if (ctx.inFertileWindow) {
    interpretation = overall >= 82 ? 'Strong timing window open.' : 'Fertile window open — push logging to lift odds.'
    actions[0] = 'Aim for intercourse every 1–2 days through the fertile window.'
    actions[1] = 'Log OPK daily until you see peak or positive.'
  } else if (ctx.cycleDay != null && ctx.cycleDay < ctx.approxOvulationDay - 3) {
    interpretation = 'Pre-fertile phase — prime habits before the surge.'
    actions[0] = 'Start OPK testing a few days before your usual surge if you know it.'
    actions[1] = 'Keep BBT at the same wake time each morning.'
  } else if (ctx.cycleDay != null && ctx.cycleDay > ctx.approxOvulationDay + 2) {
    interpretation = 'Likely post-ovulation — recovery and consistency matter now.'
    actions[0] = 'Continue BBT to confirm the pattern you expect.'
    actions[1] = 'Light movement and sleep steady hormones for the next cycle.'
  }

  if (s.todayOpk === 'negative' && ctx.inFertileWindow) {
    actions[1] = actions[1] ?? 'Retest OPK later today if lines are trending darker.'
  }

  let badgeLabel = 'Tracking focus'
  if (s.todayOpk === 'positive' || (ctx.inFertileWindow && overall >= 85)) badgeLabel = 'Peak timing'
  else if (ctx.inFertileWindow) badgeLabel = 'Fertile window'
  else if (ctx.ui.state === 'period') badgeLabel = 'Recovery phase'

  return { interpretation, actions, badgeLabel }
}

/** RULE: stats row — chance level + ovulation label + BBT delta copy. */
export function buildTodayStats(
  s: TtcPersonalizationSignals,
  ctx: ReturnType<typeof deriveTtcCycleContext>,
): { chanceLabel: string; ovulationLabel: string; bbtLabel: string } {
  let chanceLabel = 'Moderate'
  if (s.todayOpk === 'positive' || (ctx.inFertileWindow && (s.todayMucus === 'egg_white' || s.todayMucus === 'watery')))
    chanceLabel = 'High'
  if (!ctx.inFertileWindow && ctx.ui.state === 'period') chanceLabel = 'Low'

  let ovulationLabel = '—'
  if (ctx.cycleDay != null) ovulationLabel = `Day ${ctx.approxOvulationDay}`
  if (s.pred?.next_ovulation) {
    try {
      const d = differenceInCalendarDays(startOfDay(parseISO(String(s.pred.next_ovulation).slice(0, 10))), startOfDay(new Date()))
      if (d === 0) ovulationLabel = 'Today'
      else if (d > 0 && d <= 4) ovulationLabel = `~${d}d`
      else if (d < 0) ovulationLabel = 'Passed'
    } catch {
      /* keep */
    }
  }

  let bbtLabel = '—'
  if (s.todayBbt != null) bbtLabel = `${s.todayBbt.toFixed(2)}°C`
  else if (s.bbtDaysLast14 >= 8) bbtLabel = 'Logged'
  else bbtLabel = 'Log AM'

  return { chanceLabel, ovulationLabel, bbtLabel }
}

/** RULE: Today narrative — decision-first copy + primary CTA label. */
export function buildTodayBlock(s: TtcPersonalizationSignals, ctx: ReturnType<typeof deriveTtcCycleContext>): TtcTodayBlock {
  if (s.todayOpk === 'positive') {
    return {
      title: 'Surge day — act tonight',
      body: 'LH is positive. Sperm meets egg best when intercourse happens in the next 24 hours; confirm ovulation with tomorrow’s BBT.',
      primaryCtaLabel: 'Log fertile-window data',
    }
  }
  if (ctx.inFertileWindow) {
    return {
      title: 'Prime window for timing',
      body: 'You are in the fertile window. Prioritize intercourse every 1–2 days and log OPK so Bloom can validate the surge.',
      primaryCtaLabel: 'Log today’s data',
    }
  }
  if (ctx.ui.state === 'period') {
    return {
      title: 'Reset and recover',
      body: 'Focus on rest and steady supplements—strong habits now set up the next ovulation.',
      primaryCtaLabel: 'Log today’s data',
    }
  }
  return {
    title: 'Build signal before the surge',
    body: 'Outside the fertile peak—perfect time to tighten BBT routine and prep OPK strips for mid-cycle.',
    primaryCtaLabel: 'Log today’s data',
  }
}

/** RULE: resources — reorder by needs; first row is highlighted. */
export function buildResourceRows(s: TtcPersonalizationSignals, ctx: ReturnType<typeof deriveTtcCycleContext>): TtcResourceRowModel[] {
  const lifestyleFactorApprox = Math.min(95, 45 + s.vitaminDaysLast7 * 6 + s.exerciseDaysLast7 * 5)
  const lowLifestyle = lifestyleFactorApprox < 72
  const partnerBoost = ctx.inFertileWindow && s.todayOpk !== 'positive' && s.opkDistinctDaysLast7 < 2

  const base: TtcResourceRowModel[] = [
    { key: 'tips', title: 'Conception tips', subtitle: 'Evidence-based guidance', highlight: false },
    { key: 'partner', title: 'Partner health', subtitle: 'Support your journey together', highlight: false },
    { key: 'journal', title: 'TTC journal', subtitle: 'Thoughts & milestones', highlight: false },
    { key: 'report', title: 'Health report', subtitle: 'Share with your doctor', highlight: false },
    { key: 'score', title: 'Fertility score detail', subtitle: 'Breakdown & suggestions', highlight: false },
  ]

  const scored = base.map((r) => {
    let score = 50
    if (r.key === 'tips' && lowLifestyle) score += 40
    if (r.key === 'tips' && s.healthGoalIds.includes('nutrition')) score += 25
    if (r.key === 'partner' && partnerBoost) score += 45
    if (r.key === 'partner' && s.healthGoalIds.includes('stress')) score += 15
    if (r.key === 'score' && s.bbtDaysLast14 < 6) score += 20
    if (r.key === 'journal' && deriveEngagementTier(s) === 'inactive') score += 15
    return { ...r, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const sorted = scored.map(({ score: _s, ...rest }) => rest)
  if (sorted[0]) sorted[0].highlight = true
  sorted.forEach((r) => {
    if (r.highlight) r.subtitle = `${r.subtitle} · For you`
  })
  return sorted
}

/** Detailed metrics for Fertility score screen (same signals). */
export function buildScoreMetrics(s: TtcPersonalizationSignals, ctx: ReturnType<typeof deriveTtcCycleContext>) {
  const factors = buildTtcFactors(s, ctx)
  const map = Object.fromEntries(factors.map((f) => [f.id, f]))
  const mucusPct =
    s.todayMucus === 'egg_white' || s.todayMucus === 'watery'
      ? 92
      : s.todayMucus === 'creamy'
        ? 78
        : s.todayMucus
          ? 68
          : ctx.inFertileWindow
            ? 72
            : 64
  const opkPct =
    s.todayOpk === 'positive' ? 98 : s.opkDistinctDaysLast7 >= 3 ? 90 : s.opkDistinctDaysLast7 >= 1 ? 78 : ctx.inFertileWindow ? 74 : 62

  return [
    { label: 'Cycle regularity', pct: map.cr?.pct ?? 72, color: TTC_GREEN, explanation: map.cr?.explanation ?? '', whatNext: map.cr?.whatNext ?? '' },
    { label: 'Ovulation timing', pct: map.ot?.pct ?? 72, color: TTC_GREEN, explanation: map.ot?.explanation ?? '', whatNext: map.ot?.whatNext ?? '' },
    { label: 'BBT pattern', pct: map.bb?.pct ?? 70, color: ThemeColors.peach, explanation: map.bb?.explanation ?? '', whatNext: map.bb?.whatNext ?? '' },
    { label: 'Cervical mucus', pct: mucusPct, color: ThemeColors.sky, explanation: 'Mucus mirrors estrogen—egg-white/watery days line up with sperm survival.', whatNext: 'Log mucus nightly during the fertile window.' },
    { label: 'OPK results', pct: opkPct, color: ThemeColors.primary, explanation: 'LH strips catch the surge that precedes ovulation by ~12–36 hours.', whatNext: 'Test mid-afternoon if mornings look low but fertile signs rise.' },
  ]
}

export function buildImprovePills(s: TtcPersonalizationSignals, ctx: ReturnType<typeof deriveTtcCycleContext>): { text: string; detail: string }[] {
  const pills: { text: string; detail: string }[] = []
  // RULE: top improvements = lowest signals first.
  if (s.bbtDaysLast14 < 7) pills.push({ text: 'Stabilize BBT logging', detail: 'Same wake time + before screens improves shift detection.' })
  if (s.opkDistinctDaysLast7 < 2 && ctx.inFertileWindow) pills.push({ text: 'Log OPK through the surge', detail: 'Daily tests reduce the chance of missing a fast LH spike.' })
  if (s.vitaminDaysLast7 < 4) pills.push({ text: 'Check off vitamins', detail: 'Folic acid consistency matters before and during early pregnancy.' })
  if (s.exerciseDaysLast7 < 3 && s.healthGoalIds.includes('active')) pills.push({ text: 'Light movement most days', detail: 'Moderate activity supports hormone balance without overtraining.' })
  if (pills.length < 3) pills.push({ text: 'Keep fertile-window intimacy steady', detail: 'Every 1–2 days covers the viable sperm window without burnout.' })
  return pills.slice(0, 3)
}

/** Full tip pool — selection happens in `pickTopConceptionTips` / partner. */
const CONCEPTION_POOL: TtcTipModule[] = [
  {
    title: 'Best timing',
    action: 'Plan intercourse every 1–2 days through the fertile window.',
    whyItMatters: 'Sperm live days while the egg’s viable window is short—spacing covers both.',
    iconKey: 'clock',
  },
  {
    title: 'Nutrition',
    action: 'Add one folate-rich meal (leafy greens, beans, citrus) daily.',
    whyItMatters: 'Folate supports early neural tube development before a positive test.',
    iconKey: 'apple',
  },
  {
    title: 'Stay active',
    action: 'Move gently for 20–30 minutes most days.',
    whyItMatters: 'Moderate activity supports insulin sensitivity and stress hormones.',
    iconKey: 'person',
  },
  {
    title: 'Sleep well',
    action: 'Aim for a consistent bedtime ±30 minutes.',
    whyItMatters: 'Sleep regularity helps LH/FSH signaling stay steadier cycle to cycle.',
    iconKey: 'moon',
  },
  {
    title: 'Avoid',
    action: 'Cap caffeine near 200mg and skip alcohol on peak fertile days if you can.',
    whyItMatters: 'Reduces variables that muddy energy, sleep, and cycle signals.',
    iconKey: 'ban',
  },
]

const PARTNER_POOL: TtcTipModule[] = [
  {
    title: 'Zinc-rich foods',
    action: 'Add pumpkin seeds or lean meat twice this week.',
    whyItMatters: 'Zinc supports sperm production and repair.',
    iconKey: 'salad',
  },
  {
    title: 'Exercise',
    action: 'Share a 25-minute walk after dinner.',
    whyItMatters: 'Shared movement lowers stress for both partners during TTC.',
    iconKey: 'dumbbell',
  },
  {
    title: 'Stay cool',
    action: 'Skip hot tubs and long laptop-on-lap sessions this fertile week.',
    whyItMatters: 'Heat temporarily lowers sperm count and motility.',
    iconKey: 'snow',
  },
  {
    title: 'No smoking',
    action: 'Swap smoke breaks for a short walk together.',
    whyItMatters: 'Smoking damages sperm DNA and reduces fertility.',
    iconKey: 'cigarette',
  },
  {
    title: 'Supplements',
    action: 'Discuss CoQ10 or antioxidants with your clinician.',
    whyItMatters: 'Some evidence supports motility when diet alone is thin.',
    iconKey: 'pill',
  },
]

/** RULE: pick 3 conception modules by cycle phase + goals + gaps. */
export function pickTopConceptionTips(s: TtcPersonalizationSignals, ctx: ReturnType<typeof deriveTtcCycleContext>): TtcTipModule[] {
  const scored = CONCEPTION_POOL.map((t, idx) => {
    let sc = 50 - idx
    if (t.iconKey === 'clock' && (ctx.inFertileWindow || s.todayOpk === 'positive')) sc += 40
    if (t.iconKey === 'apple' && (s.healthGoalIds.includes('nutrition') || s.vitaminDaysLast7 < 4)) sc += 35
    if (t.iconKey === 'person' && s.healthGoalIds.includes('active')) sc += 30
    if (t.iconKey === 'moon' && s.healthGoalIds.includes('sleep')) sc += 30
    if (t.iconKey === 'ban' && (s.healthGoalIds.includes('nutrition') || deriveEngagementTier(s) === 'new')) sc += 20
    return { t, sc }
  })
  scored.sort((a, b) => b.sc - a.sc)
  return scored.slice(0, 3).map((x) => x.t)
}

/** RULE: partner tips — prioritize when coordination or sperm health signals matter. */
export function pickTopPartnerTips(s: TtcPersonalizationSignals, ctx: ReturnType<typeof deriveTtcCycleContext>): TtcTipModule[] {
  const scored = PARTNER_POOL.map((t, idx) => {
    let sc = 50 - idx
    if (t.iconKey === 'snow' && ctx.inFertileWindow) sc += 35
    if (t.iconKey === 'dumbbell' && s.healthGoalIds.includes('active')) sc += 28
    if (t.iconKey === 'cigarette' && s.healthGoalIds.includes('stress')) sc += 22
    if (t.iconKey === 'salad' && s.healthGoalIds.includes('nutrition')) sc += 30
    if (t.iconKey === 'pill' && s.vitaminDaysLast7 < 3) sc += 25
    return { t, sc }
  })
  scored.sort((a, b) => b.sc - a.sc)
  return scored.slice(0, 3).map((x) => x.t)
}

export function buildTtcFactsLine(
  s: TtcPersonalizationSignals,
  ctx: ReturnType<typeof deriveTtcCycleContext>,
  overall: number,
): string {
  return [
    `fertilityScore:${overall}`,
    `cycleDay:${ctx.cycleDay ?? 'na'} of ${ctx.cycleLen}`,
    `fertile:${ctx.inFertileWindow ? 'yes' : 'no'}`,
    `opk:${s.todayOpk ?? 'na'}`,
    `bbt14:${s.bbtDaysLast14}`,
    `goals:${s.healthGoalIds.join(',')}`,
    `engagement:${deriveEngagementTier(s)}`,
  ].join('; ')
}
