import { differenceInCalendarDays, parseISO, startOfDay, subDays } from 'date-fns'

export type CycleUiState = 'no_data' | 'period' | 'fertile' | 'normal'

export interface CycleStateResult {
  state: CycleUiState
  cycleDay?: number
  cycleLength: number
}

const clampCycleLength = (n: number) => Math.min(45, Math.max(21, Math.round(n) || 28))

/**
 * Rule-based cycle phase from last period start and typical length.
 * `lastPeriodDate` should be an ISO calendar date (YYYY-MM-DD) for cycle day 1.
 */
export function getCycleState(input: {
  lastPeriodDate: string | null | undefined
  cycleLength?: number | null
}): CycleStateResult {
  const cycleLength = clampCycleLength(input.cycleLength ?? 28)
  const raw = input.lastPeriodDate?.trim()
  if (!raw) return { state: 'no_data', cycleLength }

  let last: Date
  try {
    last = startOfDay(parseISO(raw.length > 10 ? raw.slice(0, 10) : raw))
  } catch {
    return { state: 'no_data', cycleLength }
  }

  const today = startOfDay(new Date())
  const diffDays = differenceInCalendarDays(today, last)
  if (diffDays < 0) return { state: 'no_data', cycleLength }

  const cycleDay = (diffDays % cycleLength) + 1

  if (cycleDay <= 5) return { state: 'period', cycleDay, cycleLength }
  if (cycleDay >= 11 && cycleDay <= 16) return { state: 'fertile', cycleDay, cycleLength }
  return { state: 'normal', cycleDay, cycleLength }
}

/** Infer cycle day 1 date from "today" and 1-based cycle day (e.g. from server predictions). */
export function inferLastPeriodStartIso(cycleDay: number, referenceDate = new Date()): string {
  const d0 = startOfDay(referenceDate)
  const start = subDays(d0, Math.max(0, Math.round(cycleDay) - 1))
  return start.toISOString().slice(0, 10)
}

export interface NextEventRuleResult {
  label: 'Ovulation' | 'Next period'
  days: number
}

/**
 * Lightweight next-event estimate from cycle position (no API).
 * Uses fixed ovulation on day 14 of a standard template; pair with real dates when available.
 */
export function getNextEvent(input: { cycleDay: number; cycleLength?: number | null }): NextEventRuleResult | null {
  const cycleLength = clampCycleLength(input.cycleLength ?? 28)
  const cycleDay = Math.round(input.cycleDay)
  if (!Number.isFinite(cycleDay) || cycleDay < 1) return null

  const nextPeriodIn = Math.max(0, cycleLength - cycleDay)
  const ovulationDay = 14
  const ovulationIn = ovulationDay - cycleDay

  if (ovulationIn >= 0 && ovulationIn < nextPeriodIn) return { label: 'Ovulation', days: ovulationIn }
  return { label: 'Next period', days: nextPeriodIn }
}

export function formatNextEventCountdown(label: string, days: number): string {
  if (days === 0) return `${label} today`
  if (days === 1) return `${label} in 1 day`
  return `${label} in ${days} days`
}

export function formatNextEventHeadline(result: NextEventRuleResult): string {
  return formatNextEventCountdown(result.label, result.days)
}

export interface NextEventFromDatesInput {
  nextOvulationIso?: string | null
  nextPeriodIso?: string | null
  referenceDate?: Date
}

/**
 * Prefer prediction ISO dates from `get_cycle_predictions` when present; otherwise null.
 */
export function getNextEventFromDates(input: NextEventFromDatesInput): {
  label: string
  days: number
  headline: string
} | null {
  const today = startOfDay(input.referenceDate ?? new Date())
  type Cand = { label: string; days: number; t: number }
  const candidates: Cand[] = []

  const push = (label: string, iso: string | null | undefined) => {
    if (!iso) return
    try {
      const d = startOfDay(parseISO(iso.slice(0, 10)))
      const days = differenceInCalendarDays(d, today)
      if (days >= 0) candidates.push({ label, days, t: d.getTime() })
    } catch {
      /* skip */
    }
  }

  push('Ovulation', input.nextOvulationIso)
  push('Next period', input.nextPeriodIso)

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.days - b.days || a.t - b.t)
  const best = candidates[0]
  return {
    label: best.label,
    days: best.days,
    headline: formatNextEventCountdown(best.label, best.days),
  }
}

export function getInsight(input: { cycleDay: number | null | undefined }): string {
  if (input.cycleDay == null || !Number.isFinite(input.cycleDay)) {
    return 'Log your cycle to get short, useful tips here.'
  }
  const d = Math.round(Number(input.cycleDay))
  if (d >= 11 && d <= 16) return 'You are in your fertile window—log how you feel to spot patterns.'
  if (d <= 5) return 'You are on your period—light logging helps next month’s predictions.'
  return 'Your cycle is progressing—keep one quick log today to stay on track.'
}

export interface QuickActionItem {
  key: string
  label: string
  recommended?: boolean
  /** Navigation target id */
  nav: 'log' | 'mood' | 'ovulation' | 'bb' | 'calendar'
}

/**
 * `lastLoggedDaysAgo`: calendar days since last `daily_logs` row (any data); null if never logged.
 */
export function getQuickActions(input: { lastLoggedDaysAgo: number | null }): QuickActionItem[] {
  const actions: QuickActionItem[] = []
  if (input.lastLoggedDaysAgo == null || input.lastLoggedDaysAgo > 1) {
    actions.push({ key: 'log', label: 'Full log for today', recommended: true, nav: 'log' })
  }
  actions.push({ key: 'mood', label: 'Mood check-in', nav: 'mood' })
  actions.push({ key: 'ovulation', label: 'Ovulation signs', nav: 'ovulation' })
  actions.push({ key: 'bb', label: 'BBT reading', nav: 'bb' })
  actions.push({ key: 'calendar', label: 'Cycle calendar', nav: 'calendar' })
  return actions
}

export function heroSubtextForState(state: CycleUiState): string {
  if (state === 'no_data') return ''
  if (state === 'period') return 'Prioritize rest and steady fluids.'
  if (state === 'fertile') return 'You are in your fertile window.'
  return 'Outside your fertile window—keep logging.'
}
