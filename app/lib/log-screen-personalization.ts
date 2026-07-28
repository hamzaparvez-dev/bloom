import type { CycleUiState } from './cycle-home-retention'
import { moodTrackerRhythmPhase, type MoodTrackerRhythmPhase } from './personalization'

export type LogSectionId = 'flow' | 'symptoms' | 'mood' | 'energy' | 'notes'

export interface LogRhythmContext {
  rhythm: MoodTrackerRhythmPhase
  cycleState: CycleUiState
  cycleDay: number | null
  ovulationDaysAway: number | null
}

export function buildLogRhythmContext(input: {
  cycleState: CycleUiState
  cycleDay: number | null
  ovulationDaysAway: number | null
}): LogRhythmContext {
  const rhythm = moodTrackerRhythmPhase(input.cycleState, input.cycleDay)
  return {
    rhythm,
    cycleState: input.cycleState,
    cycleDay: input.cycleDay,
    ovulationDaysAway: input.ovulationDaysAway,
  }
}

/** Short headline under the main title — cycle-aware guidance. */
export function todayContextHeader(ctx: LogRhythmContext): string {
  if (ctx.cycleState === 'no_data' || ctx.rhythm === 'none') {
    return 'Start with one honest tap — your patterns sharpen quickly.'
  }
  if (ctx.ovulationDaysAway === 0) return 'Possible ovulation today'
  if (ctx.ovulationDaysAway === 1) return 'Ovulation window is near — notice energy and signs.'
  if (ctx.rhythm === 'period' && ctx.cycleDay != null && ctx.cycleDay <= 3) {
    return 'Early cycle — focus on flow tracking'
  }
  if (ctx.rhythm === 'period') return 'Period phase — prioritize flow and comfort.'
  if (ctx.rhythm === 'fertile') return 'Fertile window — symptoms and subtle shifts matter.'
  if (ctx.rhythm === 'luteal') return 'Luteal phase — moods and physical symptoms often peak.'
  return 'Mid-cycle — steady logs keep forecasts personal to you.'
}

export type SectionEmphasis = 'high' | 'mid' | 'low'

export function logSectionEmphasis(rhythm: MoodTrackerRhythmPhase): Record<LogSectionId, SectionEmphasis> {
  const mid = (): Record<LogSectionId, SectionEmphasis> => ({
    flow: 'low',
    symptoms: 'mid',
    mood: 'mid',
    energy: 'mid',
    notes: 'low',
  })
  if (rhythm === 'period') {
    return { flow: 'high', symptoms: 'high', mood: 'mid', energy: 'low', notes: 'mid' }
  }
  if (rhythm === 'fertile') {
    return { flow: 'low', symptoms: 'high', mood: 'mid', energy: 'mid', notes: 'mid' }
  }
  if (rhythm === 'luteal') {
    return { flow: 'low', symptoms: 'high', mood: 'high', energy: 'mid', notes: 'mid' }
  }
  if (rhythm === 'none') {
    return { flow: 'low', symptoms: 'mid', mood: 'high', energy: 'high', notes: 'mid' }
  }
  return { ...mid(), mood: 'high', energy: 'high', symptoms: 'low' }
}

/** Sections visible in Quick log mode (minimal taps). */
export function quickModeSections(rhythm: MoodTrackerRhythmPhase): Set<LogSectionId> {
  if (rhythm === 'period') return new Set(['flow', 'symptoms'])
  if (rhythm === 'fertile') return new Set(['symptoms'])
  if (rhythm === 'luteal') return new Set(['symptoms', 'mood'])
  if (rhythm === 'none') return new Set(['mood', 'energy'])
  return new Set(['mood', 'energy'])
}

export interface DailyLogPrefillRow {
  period_flow: string | null
  symptoms: unknown
  mood: string | null
  energy: string | null
}

function symptomStringsFromRow(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string').map((s) => s.toLowerCase())
}

function modeMostCommon<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: T | null = null
  let max = 0
  for (const [k, c] of counts) {
    if (c > max) {
      max = c
      best = k
    }
  }
  return best
}

/**
 * Derive likely picks from the last few days (newest-first rows).
 * Caller maps DB enums to UI labels.
 */
export function deriveSmartPrefillFromRecent(
  rows: DailyLogPrefillRow[],
  maps: {
    flowDbToLabel: (db: string) => string | null
    moodDbToLabel: (db: string) => string | null
    energyDbToLabel: (db: string) => string | null
    dbToSymptomLabel: (db: string) => string | null
  },
): {
  flowLabel: string | null
  moodLabel: string | null
  energyLabel: string | null
  symptomLabels: string[]
} {
  const flowDbs = rows
    .map((r) => (r.period_flow != null ? String(r.period_flow).toLowerCase() : null))
    .filter((x): x is string => !!x && x !== 'none')
  const moodDbs = rows.map((r) => (r.mood != null ? String(r.mood).toLowerCase() : null)).filter((x): x is string => !!x)
  const energyDbs = rows
    .map((r) => (r.energy != null ? String(r.energy).toLowerCase() : null))
    .filter((x): x is string => !!x)

  const flowDb = modeMostCommon(flowDbs)
  const moodDb = modeMostCommon(moodDbs)
  const energyDb = modeMostCommon(energyDbs)

  const symCounts = new Map<string, number>()
  for (const r of rows) {
    for (const s of symptomStringsFromRow(r.symptoms)) {
      symCounts.set(s, (symCounts.get(s) ?? 0) + 1)
    }
  }
  const rankedSyms = [...symCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const threshold = Math.max(1, Math.ceil(rows.length * 0.35))
  const symptomLabels = rankedSyms
    .filter((db) => (symCounts.get(db) ?? 0) >= threshold)
    .slice(0, 3)
    .map((db) => maps.dbToSymptomLabel(db))
    .filter((x): x is string => !!x)

  return {
    flowLabel: flowDb ? maps.flowDbToLabel(flowDb) : null,
    moodLabel: moodDb ? maps.moodDbToLabel(moodDb) : null,
    energyLabel: energyDb ? maps.energyDbToLabel(energyDb) : null,
    symptomLabels,
  }
}

export function chipMicroInsight(input: {
  section: 'flow' | 'symptom' | 'mood' | 'energy'
  label: string
  rhythm: MoodTrackerRhythmPhase
}): string {
  const { section, label, rhythm } = input
  if (section === 'symptom') {
    if (label === 'Headache') return 'Headache may be hormone-related — logging helps link timing.'
    if (label === 'Cramps') return 'Cramps often cluster around flow — patterns show what is typical for you.'
    if (label === 'Bloating') return 'Bloating is common in luteal days for many cycles.'
    if (label === 'Tender') return 'Breast tenderness frequently shifts with cycle hormones.'
    if (label === 'Nausea') return 'Nausea can track with hormones or digestion — note what else you ate or drank.'
    if (label === 'Backache') return 'Lower back discomfort often shows up with period or PMS.'
  }
  if (section === 'flow') {
    if (label === 'Heavy') return 'Heavy flow days deserve rest — your log makes trends visible.'
    if (label === 'Light' || label === 'Spotting') return 'Light days still count toward a clear period picture.'
    if (label === 'None') return 'No flow today — great data for where you are in the cycle.'
  }
  if (section === 'mood') {
    if (label === 'Anxious' || label === 'Irritable') return 'Mood shifts often track with cycle phase — keep tapping on tough days.'
    if (label === 'Low') return 'Low days are worth logging — they make support and patterns clearer.'
    if (label === 'Happy' || label === 'Calm') return 'Bright or calm days anchor your personal baseline.'
  }
  if (section === 'energy') {
    if (rhythm === 'fertile' && label === 'High') return 'Energy often lifts near ovulation for some people.'
    if (rhythm === 'luteal' && label === 'Low') return 'A mid-luteal dip is common — hydration and sleep still help.'
  }
  return 'Noted — a few more days like this make your forecast smarter.'
}

export function logNotesPlaceholder(ctx: LogRhythmContext, hasFlow: boolean): string {
  if (ctx.rhythm === 'period' || hasFlow) return 'Anything about flow, pain, or sleep worth remembering?'
  if (ctx.rhythm === 'fertile') return 'Optional: cervical signs, intimacy timing, or how energy felt.'
  if (ctx.rhythm === 'luteal') return 'Cravings, tension, or sleep — one line is enough.'
  if (ctx.rhythm === 'none') return 'What stood out today — stress, movement, or rest?'
  return 'One line about today is plenty.'
}

export interface PostSaveFeedback {
  cycleLine: string
  patternLine: string
  reinforcement: string
}

export function buildPostSaveFeedback(input: {
  ctx: LogRhythmContext
  streakDays: number
  hadSymptoms: boolean
  hadFlow: boolean
}): PostSaveFeedback {
  const { ctx, streakDays, hadSymptoms, hadFlow } = input
  let cycleLine = ''
  if (ctx.cycleDay != null && ctx.cycleState !== 'no_data') {
    cycleLine = `You are on cycle day ${ctx.cycleDay}. Insights update as each day is logged.`
  } else {
    cycleLine = 'Log your next period start when it arrives to unlock sharper day-by-day guidance.'
  }

  let patternLine = ''
  if (hadSymptoms && hadFlow) {
    patternLine = 'Symptoms plus flow together make phase detection more reliable for you.'
  } else if (hadSymptoms) {
    patternLine = 'Symptom streaks reveal what tends to repeat before your period or mid-cycle.'
  } else if (hadFlow) {
    patternLine = 'Flow logs build a clearer picture of period length and intensity over time.'
  } else {
    patternLine = 'Even light check-ins stack up — Bloom learns your rhythm faster.'
  }

  let reinforcement = ''
  if (streakDays >= 7) reinforcement = `${streakDays} day streak — that consistency is rare and powerful.`
  else if (streakDays >= 3) reinforcement = `${streakDays} days in a row. Small logs compound.`
  else reinforcement = 'Tomorrow is another chance to add one more data point.'

  return { cycleLine, patternLine, reinforcement }
}

export function streakBadgeLine(streakDays: number, daysWeek: number): string {
  if (streakDays >= 2) return `${streakDays} day streak`
  return `${daysWeek} of 7 days logged this week`
}
