import { addDays, format, parseISO, startOfDay, subDays } from 'date-fns'
import { supabase } from '../../supabaseClient'
import { energyToScore, moodToScore } from './charts-from-logs'

export interface DailyLogActivityRow {
  date: string
  mood: string | null
  energy: string | null
  sleep_hours: number | null
  symptoms: unknown
  period_flow: string | null
}

function rowHasActivity(r: DailyLogActivityRow): boolean {
  if (r.mood || r.energy) return true
  if (r.sleep_hours != null && Number.isFinite(Number(r.sleep_hours))) return true
  const pf = r.period_flow?.toLowerCase()
  if (pf && pf !== 'none') return true
  if (Array.isArray(r.symptoms) && r.symptoms.length > 0) return true
  if (typeof r.symptoms === 'string') {
    try {
      const j = JSON.parse(r.symptoms) as unknown
      return Array.isArray(j) && j.length > 0
    } catch {
      return false
    }
  }
  return false
}

/** Dates (yyyy-MM-dd) with any meaningful log in the window. */
export async function fetchLogDatesWithActivity(userId: string, lookbackDays: number): Promise<Set<string>> {
  const end = startOfDay(new Date())
  const start = subDays(end, lookbackDays - 1)
  const from = format(start, 'yyyy-MM-dd')
  const to = format(end, 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, mood, energy, sleep_hours, symptoms, period_flow')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)

  if (error) {
    console.warn('[daily-habit]', error.message)
    return new Set()
  }

  const set = new Set<string>()
  for (const raw of data ?? []) {
    const row = raw as DailyLogActivityRow
    if (row.date == null) continue
    const d = String(row.date).slice(0, 10)
    if (rowHasActivity(row)) set.add(d)
  }
  return set
}

/** Consecutive days ending today if logged today, else ending yesterday. */
export function computeStreak(activeDates: Set<string>): number {
  const today = format(new Date(), 'yyyy-MM-dd')
  const y = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  let cursor = activeDates.has(today) ? today : y
  if (!activeDates.has(cursor)) return 0
  let n = 0
  let d = parseISO(cursor)
  while (activeDates.has(format(d, 'yyyy-MM-dd'))) {
    n++
    d = subDays(d, 1)
  }
  return n
}

export function loggedToday(activeDates: Set<string>): boolean {
  return activeDates.has(format(new Date(), 'yyyy-MM-dd'))
}

/** One–two line digest from rules only (no OpenAI). */
export function buildDailyDigestLine(input: {
  streak: number
  loggedToday: boolean
  cycleDay: number | null
  /** Onboarding health goal ids (e.g. sleep, stress) — optional copy tuning. */
  healthGoalIds?: string[]
}): string {
  const goals = input.healthGoalIds ?? []
  if (input.loggedToday) {
    if (input.streak >= 3) return "You're building your pattern—nice consistency."
    if (input.cycleDay != null && input.cycleDay >= 11 && input.cycleDay <= 16)
      return 'Energy often shifts here—keep your routine gentle.'
    if (goals.includes('sleep')) return 'Saved for today—sleep chips make nights easier to read.'
    if (goals.includes('stress')) return 'Saved for today—mood taps add context when things feel loud.'
    return 'Saved for today—each day makes forecasts steadier.'
  }
  if (goals.includes('sleep') && !input.loggedToday) {
    return 'One quick log adds sleep and mood—helps nights make sense.'
  }
  if (goals.includes('stress') && !input.loggedToday) {
    return 'Tap mood once—patterns get clearer after a few days.'
  }
  if (input.streak >= 2) return 'Two-day streak—one more log keeps the thread going.'
  return 'A 20-second log today keeps predictions honest.'
}

/** This calendar week Mon–Sun: days with activity. */
export function daysTrackedThisWeek(activeDates: Set<string>): number {
  const now = new Date()
  const day = now.getDay()
  const monOffset = day === 0 ? -6 : 1 - day
  const mon = addDays(startOfDay(now), monOffset)
  let n = 0
  for (let i = 0; i < 7; i++) {
    const d = format(addDays(mon, i), 'yyyy-MM-dd')
    if (activeDates.has(d)) n++
  }
  return n
}

export interface WeekLogMini {
  date: string
  mood: string | null
  energy: string | null
  sleep_hours: number | null
}

function energyScores(xs: WeekLogMini[]) {
  return xs.map((r) => energyToScore(r.energy)).filter((x) => x > 0)
}

export async function fetchWeekLogs(userId: string): Promise<WeekLogMini[]> {
  const end = new Date()
  const start = subDays(end, 13)
  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, mood, energy, sleep_hours')
    .eq('user_id', userId)
    .gte('date', format(start, 'yyyy-MM-dd'))
    .lte('date', format(end, 'yyyy-MM-dd'))
    .order('date', { ascending: true })

  if (error) {
    console.warn('[daily-habit] week', error.message)
    return []
  }
  return (data ?? []).map((r) => ({
    date: String(r.date).slice(0, 10),
    mood: r.mood != null ? String(r.mood) : null,
    energy: r.energy != null ? String(r.energy) : null,
    sleep_hours: r.sleep_hours != null ? Number(r.sleep_hours) : null,
  }))
}

export function buildWeeklyReflection(rows: WeekLogMini[]): { title: string; summary: string } | null {
  if (rows.length === 0) return null
  const last7 = rows.slice(-7)
  const prev7 = rows.slice(-14, -7)
  const m = (xs: WeekLogMini[]) =>
    xs.map((r) => moodToScore(r.mood)).filter((x) => x > 0)
  const ma = mean(m(last7))
  const mb = mean(m(prev7))
  const ea = mean(energyScores(last7))
  const eb = mean(energyScores(prev7))
  const sa = mean(last7.map((r) => (r.sleep_hours != null && Number.isFinite(r.sleep_hours) ? r.sleep_hours : NaN)).filter((x) => Number.isFinite(x)))
  const sb = mean(prev7.map((r) => (r.sleep_hours != null && Number.isFinite(r.sleep_hours) ? r.sleep_hours : NaN)).filter((x) => Number.isFinite(x)))

  const parts: string[] = []
  if (ma != null && mb != null) {
    if (ma > mb + 0.3) parts.push('Mood steadier this week.')
    else if (ma + 0.3 < mb) parts.push('Mood a little bumpier this week.')
  }
  if (ea != null && eb != null) {
    if (ea > eb + 0.35) parts.push('Energy improved.')
    else if (ea + 0.35 < eb) parts.push('Energy dipped a little.')
  }
  if (sa != null && sb != null) {
    if (sa > sb + 0.25) parts.push('Sleep improved a touch.')
    else if (sa + 0.25 < sb) parts.push('Sleep slightly down.')
  }
  if (parts.length === 0) return { title: 'Your week', summary: 'Keep logging—patterns show up with a few days.' }
  return { title: 'Your week', summary: parts.slice(0, 2).join(' ') }
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}
