import { format, subDays } from 'date-fns'
import { supabase } from '../../supabaseClient'
import { energyToScore, moodToScore } from './charts-from-logs'

export interface PeriDayAgg {
  date: string
  mood: string | null
  energy: string | null
  sleepHours: number | null
  symptomCount: number
  stressMood: boolean
}

export type PeriTrendSentiment = 'good' | 'bad' | 'neutral' | 'moderate'

export interface PeriTrend {
  arrow: string
  label: string
  sentiment: PeriTrendSentiment
}

export interface PeriStatModel {
  key: string
  title: string
  value: string
  trend: PeriTrend
  insight: string
  action: string
  /** One short line per day (newest last) for expand panel */
  last7Lines: string[]
}

const EPS = 0.12
const MOD = 0.35

function parseSymptoms(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x).toLowerCase()).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown
      return Array.isArray(j) ? j.map((x) => String(x).toLowerCase()) : []
    } catch {
      return []
    }
  }
  return []
}

function stressFromMood(mood: string | null): boolean {
  if (!mood) return false
  const m = mood.toLowerCase()
  return m === 'low' || m === 'anxious' || m === 'irritable'
}

export async function fetchPerimenopauseSeries(userId: string, numDays: number): Promise<PeriDayAgg[]> {
  const end = new Date()
  const start = subDays(end, numDays - 1)
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, mood, energy, sleep_hours, symptoms')
    .eq('user_id', userId)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: true })

  if (error) console.warn('[perimenopause-from-logs]', error.message)

  const byDate = new Map<string, PeriDayAgg>()
  for (const row of data ?? []) {
    if (row.date == null) continue
    const d = String(row.date).slice(0, 10)
    const mood = row.mood != null ? String(row.mood) : null
    const energy = row.energy != null ? String(row.energy) : null
    const sh = row.sleep_hours != null ? Number(row.sleep_hours) : null
    const syms = parseSymptoms(row.symptoms)
    byDate.set(d, {
      date: d,
      mood,
      energy,
      sleepHours: Number.isFinite(sh) ? sh : null,
      symptomCount: syms.length,
      stressMood: stressFromMood(mood),
    })
  }

  const out: PeriDayAgg[] = []
  for (let i = 0; i < numDays; i++) {
    const d = format(subDays(end, numDays - 1 - i), 'yyyy-MM-dd')
    out.push(
      byDate.get(d) ?? {
        date: d,
        mood: null,
        energy: null,
        sleepHours: null,
        symptomCount: 0,
        stressMood: false,
      },
    )
  }
  return out
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function trendFromDelta(delta: number, higherIsBetter: boolean): PeriTrend {
  const ad = Math.abs(delta)
  if (ad < EPS) return { arrow: '→', label: 'No major change', sentiment: 'neutral' }
  if (ad < MOD) {
    const ok = higherIsBetter ? delta > 0 : delta < 0
    return {
      arrow: ok ? '↑' : '↓',
      label: 'Small shift',
      sentiment: 'moderate',
    }
  }
  const good = higherIsBetter ? delta > 0 : delta < 0
  if (good) return { arrow: higherIsBetter ? '↑' : '↓', label: 'Slight easing', sentiment: 'good' }
  return { arrow: higherIsBetter ? '↓' : '↑', label: 'Slight increase', sentiment: 'bad' }
}

function formatDayLine(d: PeriDayAgg): string {
  const m = d.mood ? d.mood : '—'
  const e = d.energy ? d.energy : '—'
  const s = d.sleepHours != null ? `${d.sleepHours}h sleep` : 'sleep —'
  const sym = d.symptomCount > 0 ? `${d.symptomCount} symptom${d.symptomCount === 1 ? '' : 's'}` : 'no symptoms'
  return `${d.date.slice(5)} · mood ${m} · ${s} · ${sym}`
}

export function buildPerimenopauseFactsLine(series: PeriDayAgg[]): string {
  const last7 = series.slice(-7)
  const prev7 = series.slice(-14, -7)
  const moodA = mean(last7.map((d) => moodToScore(d.mood)).filter((x) => x > 0))
  const moodB = mean(prev7.map((d) => moodToScore(d.mood)).filter((x) => x > 0))
  const enA = mean(last7.map((d) => energyToScore(d.energy)).filter((x) => x > 0))
  const enB = mean(prev7.map((d) => energyToScore(d.energy)).filter((x) => x > 0))
  const slA = mean(last7.map((d) => (d.sleepHours != null ? d.sleepHours : NaN)).filter((x) => Number.isFinite(x)))
  const slB = mean(prev7.map((d) => (d.sleepHours != null ? d.sleepHours : NaN)).filter((x) => Number.isFinite(x)))
  const syA = mean(last7.map((d) => d.symptomCount))
  const syB = mean(prev7.map((d) => d.symptomCount))
  const stA = mean(last7.map((d) => (d.stressMood ? 1 : 0)))
  const stB = mean(prev7.map((d) => (d.stressMood ? 1 : 0)))
  const daysWithLog = last7.filter((d) => d.mood || d.energy || d.sleepHours != null || d.symptomCount > 0).length

  return [
    'context:perimenopause_screen',
    `days_logged_last7:${daysWithLog}`,
    `mood_avg_last7:${moodA?.toFixed(2) ?? 'na'}`,
    `mood_avg_prev7:${moodB?.toFixed(2) ?? 'na'}`,
    `energy_avg_last7:${enA?.toFixed(2) ?? 'na'}`,
    `energy_avg_prev7:${enB?.toFixed(2) ?? 'na'}`,
    `sleep_avg_last7_h:${slA?.toFixed(2) ?? 'na'}`,
    `sleep_avg_prev7_h:${slB?.toFixed(2) ?? 'na'}`,
    `symptoms_avg_last7:${syA?.toFixed(2) ?? 'na'}`,
    `symptoms_avg_prev7:${syB?.toFixed(2) ?? 'na'}`,
    `stress_days_ratio_last7:${stA?.toFixed(2) ?? 'na'}`,
    `stress_days_ratio_prev7:${stB?.toFixed(2) ?? 'na'}`,
  ].join(';')
}

export function buildRuleBasedSummary(series: PeriDayAgg[]): { title: string; description: string } {
  const last7 = series.slice(-7)
  const logs = last7.filter((d) => d.mood || d.energy || d.sleepHours != null || d.symptomCount > 0).length
  if (logs === 0) {
    return {
      title: "Today's summary",
      description: 'Log a few days on Today to unlock this view.',
    }
  }

  const moodA = mean(last7.map((d) => moodToScore(d.mood)).filter((x) => x > 0))
  const prev7 = series.slice(-14, -7)
  const moodB = mean(prev7.map((d) => moodToScore(d.mood)).filter((x) => x > 0))
  const syA = mean(last7.map((d) => d.symptomCount))
  const syB = mean(prev7.map((d) => d.symptomCount))

  let line = "You're doing well today overall."
  if (moodA != null && moodB != null && moodA + 0.4 < moodB) line = 'Mood has dipped a little lately—extra kindness helps.'
  else if (syA != null && syB != null && syA > syB + 0.35) line = 'Body symptoms are up a bit—pace yourself.'
  else if (moodA != null && moodA >= 7) line = 'Mood looks steady and bright this week.'

  return { title: "Today's summary", description: line }
}

export function buildPeriStatModels(series: PeriDayAgg[]): PeriStatModel[] {
  const last7 = series.slice(-7)
  const prev7 = series.slice(-14, -7)
  const lines = last7.map(formatDayLine)

  const moodScores7 = last7.map((d) => moodToScore(d.mood)).filter((x) => x > 0)
  const moodScoresP = prev7.map((d) => moodToScore(d.mood)).filter((x) => x > 0)
  const mA = mean(moodScores7)
  const mB = mean(moodScoresP)
  const moodDelta = mA != null && mB != null ? mA - mB : 0
  const moodTrend = trendFromDelta(moodDelta, true)
  const moodValue =
    mA == null || moodScores7.length === 0
      ? 'No mood logs yet'
      : mA >= 7.5
        ? "You're doing well today"
        : mA >= 5.5
          ? 'Mixed but okay'
          : 'Rough patch'

  const enA = mean(last7.map((d) => energyToScore(d.energy)).filter((x) => x > 0))
  const enB = mean(prev7.map((d) => energyToScore(d.energy)).filter((x) => x > 0))
  const enDelta = enA != null && enB != null ? enA - enB : 0
  const enTrend = trendFromDelta(enDelta, true)
  const enValue =
    enA == null ? 'No energy logs yet' : enA >= 7 ? 'Higher energy' : enA >= 5 ? 'Steady energy' : 'Lower energy'

  const slRaw7 = last7.map((d) => d.sleepHours).filter((x): x is number => x != null && Number.isFinite(x))
  const slRawP = prev7.map((d) => d.sleepHours).filter((x): x is number => x != null && Number.isFinite(x))
  const slA = mean(slRaw7)
  const slB = mean(slRawP)
  const slDelta = slA != null && slB != null ? slA - slB : 0
  const slTrend = trendFromDelta(slDelta, true)
  const slValue = slA == null ? 'No sleep logs yet' : `${slA.toFixed(1)} h avg (7d)`

  const syA = mean(last7.map((d) => d.symptomCount))
  const syB = mean(prev7.map((d) => d.symptomCount))
  const syDelta = syA != null && syB != null ? syA - syB : 0
  const syTrend = trendFromDelta(syDelta, false)
  const syValue =
    syA == null || (syA === 0 && last7.every((d) => d.symptomCount === 0))
      ? 'No symptoms logged'
      : `${syA.toFixed(1)} per day avg`

  const stA = mean(last7.map((d) => (d.stressMood ? 1 : 0)))
  const stB = mean(prev7.map((d) => (d.stressMood ? 1 : 0)))
  const stDelta = stA != null && stB != null ? stA - stB : 0
  const stTrend = trendFromDelta(stDelta, false)
  const stValue =
    stA == null ? 'No mood data yet' : `${Math.round(stA * 7)} tense days / 7`

  return [
    {
      key: 'mood',
      title: 'Mood shifts',
      value: moodValue,
      trend: moodTrend,
      insight:
        moodTrend.sentiment === 'bad'
          ? 'Mood dipped vs last week—common with poor sleep.'
          : moodTrend.sentiment === 'good'
            ? 'Mood is lifting compared with last week.'
            : 'Mood is holding steady.',
      action: 'Check in with a short voice note or text.',
      last7Lines: lines,
    },
    {
      key: 'energy',
      title: 'Energy',
      value: enValue,
      trend: enTrend,
      insight:
        enTrend.sentiment === 'bad'
          ? 'Energy is softer than last week.'
          : enTrend.sentiment === 'good'
            ? 'Energy picked up compared with last week.'
            : 'Energy looks similar to last week.',
      action: 'Try a 10-minute walk before noon.',
      last7Lines: lines,
    },
    {
      key: 'sleep',
      title: 'Sleep',
      value: slValue,
      trend: slTrend,
      insight:
        slTrend.sentiment === 'good'
          ? 'Sleep duration improved vs last week.'
          : slTrend.sentiment === 'bad'
            ? 'Sleep is shorter than last week.'
            : 'Sleep is about the same.',
      action: 'Dim screens 30 minutes before bed.',
      last7Lines: lines,
    },
    {
      key: 'symptoms',
      title: 'Logged symptoms',
      value: syValue,
      trend: syTrend,
      insight:
        syTrend.sentiment === 'bad'
          ? 'More symptom days than last week.'
          : syTrend.sentiment === 'good'
            ? 'Fewer symptom check-ins than last week.'
            : 'Symptom logging is steady.',
      action: 'Note triggers when symptoms spike.',
      last7Lines: lines,
    },
    {
      key: 'stress',
      title: 'Tense mood days',
      value: stValue,
      trend: stTrend,
      insight:
        stTrend.sentiment === 'bad'
          ? 'More low or tense mood days than last week.'
          : stTrend.sentiment === 'good'
            ? 'Fewer tense mood days than last week.'
            : 'Tense mood days are flat week to week.',
      action: 'Keep plans flexible and low pressure.',
      last7Lines: lines,
    },
  ]
}

export function buildTodayActionItems(series: PeriDayAgg[]): string[] {
  const models = buildPeriStatModels(series)
  const watch = models.filter((m) => m.trend.sentiment === 'bad' || m.trend.sentiment === 'moderate')
  const items: string[] = []
  const push = (s: string) => {
    if (!items.includes(s)) items.push(s)
  }
  if (watch.some((x) => x.key === 'symptoms' || x.key === 'stress')) push('Drink more water')
  if (watch.some((x) => x.key === 'sleep' || x.key === 'stress')) push('Sleep a bit earlier')
  if (watch.some((x) => x.key === 'energy' || x.key === 'mood')) push('Light walk recommended')
  if (items.length === 0) {
    push('Drink more water')
    push('Sleep a bit earlier')
    push('Light walk recommended')
  }
  if (items.length === 1) push('Keep plans light today')
  if (items.length === 2) push('Log tonight on Today tab')
  return items.slice(0, 3)
}

export const periTrendColors: Record<PeriTrendSentiment, string> = {
  good: '#4CAF50',
  bad: '#FF6B6B',
  neutral: '#B0B0B0',
  moderate: '#F5A623',
}
