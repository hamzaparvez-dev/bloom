import { format, subDays } from 'date-fns'
import { supabase } from '../../supabaseClient'

export interface DailyLogChartRow {
  date: string
  mood: string | null
  energy: string | null
  sleepHours: number | null
}

const MOOD_SCORE: Record<string, number> = {
  happy: 9,
  neutral: 6,
  low: 3.5,
  anxious: 4.5,
  irritable: 4.5,
}

const ENERGY_SCORE: Record<string, number> = {
  low: 3.5,
  normal: 6,
  high: 9,
}

/** Map logged sleep hours to 0–10 chart scale (caps at 10 h). */
export function sleepHoursToChartScale(hours: number | null): number {
  if (hours == null || !Number.isFinite(hours)) return 0
  return Math.min(10, Math.max(0, hours))
}

export function moodToScore(mood: string | null): number {
  if (!mood) return 0
  return MOOD_SCORE[mood] ?? 0
}

export function energyToScore(energy: string | null): number {
  if (!energy) return 0
  return ENERGY_SCORE[energy] ?? 0
}

/** Last `numDays` calendar days (oldest → newest), including gaps. */
export async function fetchDailyLogsSeries(userId: string, numDays: number): Promise<DailyLogChartRow[]> {
  const end = new Date()
  const start = subDays(end, numDays - 1)
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, mood, energy, sleep_hours')
    .eq('user_id', userId)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: true })

  if (error) {
    console.warn('[charts-from-logs]', error.message)
  }

  const byDate = new Map<string, DailyLogChartRow>()
  for (const row of data ?? []) {
    if (row.date == null) continue
    const d = String(row.date)
    byDate.set(d, {
      date: d,
      mood: row.mood != null ? String(row.mood) : null,
      energy: row.energy != null ? String(row.energy) : null,
      sleepHours: row.sleep_hours != null ? Number(row.sleep_hours) : null,
    })
  }

  const out: DailyLogChartRow[] = []
  for (let i = 0; i < numDays; i++) {
    const d = format(subDays(end, numDays - 1 - i), 'yyyy-MM-dd')
    out.push(byDate.get(d) ?? { date: d, mood: null, energy: null, sleepHours: null })
  }
  return out
}
