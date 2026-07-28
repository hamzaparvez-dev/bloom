import type { CycleUiState, QuickActionItem } from './cycle-home-retention'
import { heroSubtextForState } from './cycle-home-retention'

export interface CycleHistoryRow {
  start_date?: string
  length?: number
  period_length?: number
}

export function normalizeHealthPriorities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 3)
}

/** Reorder quick actions by onboarding goals (same cards, new order). */
export function personalizeQuickActionsOrder(actions: QuickActionItem[], goalIds: string[]): QuickActionItem[] {
  if (goalIds.length === 0) return actions

  const score = (item: QuickActionItem): number => {
    let s = 0
    if (item.recommended) s += 50
    if (item.nav === 'mood') {
      if (goalIds.includes('stress') && !goalIds.includes('sleep')) s += 90
      else if (goalIds.includes('sleep')) s += 40
    }
    if ((goalIds.includes('sleep') || goalIds.includes('stress')) && item.nav === 'log') s += 35
    if (goalIds.includes('periods')) {
      if (item.nav === 'log') s += 40
      if (item.nav === 'calendar') s += 30
      if (item.nav === 'ovulation') s += 25
    }
    if (goalIds.includes('nutrition') || goalIds.includes('active')) {
      if (item.nav === 'log') s += 30
    }
    if (goalIds.includes('meds')) {
      if (item.nav === 'log') s += 25
    }
    return s
  }

  return [...actions].sort((a, b) => score(b) - score(a))
}

/** Clearer than "Normal" for non-period, non-fertile days. */
export function cyclePhaseDisplayLabel(state: CycleUiState): string {
  if (state === 'period') return 'Period'
  if (state === 'fertile') return 'Fertile window'
  if (state === 'normal') return 'Mid-cycle'
  return ''
}

export function personalizedHeroSubtext(state: CycleUiState, goalIds: string[]): string {
  const base = heroSubtextForState(state)
  if (state === 'no_data') return base

  if (goalIds.includes('sleep') && state === 'period') {
    return 'Rest counts—keep sleep steady if you can.'
  }
  if (goalIds.includes('stress') && (state === 'fertile' || state === 'normal')) {
    return 'A one-line mood log helps stress patterns show up sooner.'
  }
  if (goalIds.includes('active') && state === 'normal') {
    return 'Gentle movement still counts—listen to energy dips.'
  }
  if (goalIds.includes('nutrition') && state === 'fertile') {
    return 'Hydration and steady meals support how you feel this week.'
  }
  return base
}

export function streakSubtitleForGoals(goalIds: string[]): string {
  if (goalIds.includes('sleep')) return 'Short daily logs make sleep trends easier to spot.'
  if (goalIds.includes('stress')) return 'Mood taps add up—patterns get clearer fast.'
  if (goalIds.includes('active')) return 'Energy notes turn into useful week-over-week signals.'
  return 'Keep it going—small logs add up.'
}

export function timeAwareGreeting(displayName: string): string {
  const h = new Date().getHours()
  const first = displayName.trim().split(/\s+/)[0] || 'there'
  if (h < 12) return `Good morning, ${first}`
  if (h < 17) return `Good afternoon, ${first}`
  return `Good evening, ${first}`
}

export interface KeyInsightBlock {
  title: string
  desc: string
}

export function buildDataDrivenKeyInsights(
  history: CycleHistoryRow[],
  avgLen: number,
  regularityPct: number | null,
  goalIds: string[],
): KeyInsightBlock[] {
  const lengths = history
    .map((r) => (r.length != null && Number.isFinite(Number(r.length)) ? Math.round(Number(r.length)) : 0))
    .filter((n) => n > 0)

  const blocks: KeyInsightBlock[] = []

  if (lengths.length < 2) {
    blocks.push({
      title: 'Patterns need one more cycle',
      desc: 'Log period starts and a few symptoms—Bloom will highlight length and timing shifts for you.',
    })
  } else {
    const oldest = lengths[0]
    const newest = lengths[lengths.length - 1]
    const delta = newest - oldest
    if (delta <= -2) {
      blocks.push({
        title: 'Cycles look shorter lately',
        desc: `Recent cycles center near ${newest} days vs about ${oldest} days earlier. Mention shifts to your clinician if they feel new.`,
      })
    } else if (delta >= 2) {
      blocks.push({
        title: 'Cycles look longer lately',
        desc: `Recent cycles center near ${newest} days vs about ${oldest} days earlier. Worth a quick note for your next visit if this is unexpected.`,
      })
    } else {
      blocks.push({
        title: 'Cycle length looks steady',
        desc: `Your completed cycles hover near ${avgLen} days. Keep logging—regularity scores sharpen with more months.`,
      })
    }

    if (regularityPct != null && regularityPct >= 70) {
      blocks.push({
        title: 'Timing is fairly predictable',
        desc: 'Predictable gaps between periods usually make forecasts more reliable. Add ovulation notes if you track them.',
      })
    } else if (regularityPct != null) {
      blocks.push({
        title: 'Some variation is normal',
        desc: 'Irregular stretches happen—stress, sleep, and travel can nudge dates. Consistent logging is the fastest way to see your personal pattern.',
      })
    } else {
      blocks.push({
        title: 'Keep filling the picture',
        desc: 'Symptom and mood logs make downstream insights (sleep, stress, phases) much more specific to you.',
      })
    }
  }

  if (goalIds.includes('sleep') && blocks.length >= 2) {
    blocks[1] = {
      title: 'Sleep is a focus for you',
      desc: 'Quick-log sleep chips a few nights in a row—the Sleep & energy view fills in faster.',
    }
  } else if (goalIds.includes('stress') && blocks.length >= 2) {
    blocks[1] = {
      title: 'Stress signals show up in patterns',
      desc: 'Mood and energy taps most days make the mood and symptom views much more specific.',
    }
  }

  return blocks.slice(0, 2)
}

export function insightsPeriodLimit(periodIdx: number): number {
  if (periodIdx <= 0) return 3
  if (periodIdx === 1) return 6
  if (periodIdx === 2) return 12
  return 24
}

export function insightsPeriodHint(periodIdx: number): string {
  if (periodIdx <= 0) return 'Last ~1 month'
  if (periodIdx === 1) return 'Last ~3 months'
  if (periodIdx === 2) return 'Last ~6 months'
  return 'Last ~12 months'
}

type InsightExploreRoute =
  | 'CycleAnalysis'
  | 'SymptomPatterns'
  | 'InsightMoodPatterns'
  | 'SleepEnergy'
  | 'Perimenopause'
  | 'PartnerMode'

export interface ExploreRowShape {
  title: string
  subtitle: string
  route: InsightExploreRoute
}

const ROUTE_GOAL_WEIGHT: Partial<Record<InsightExploreRoute, Partial<Record<string, number>>>> = {
  SleepEnergy: { sleep: 4, stress: 2, active: 2 },
  InsightMoodPatterns: { stress: 4, sleep: 2, active: 1 },
  SymptomPatterns: { periods: 3, stress: 2, nutrition: 1 },
  CycleAnalysis: { periods: 4, nutrition: 1 },
  Perimenopause: { stress: 2 },
  PartnerMode: { stress: 1 },
}

export function sortExploreRowsByGoals<T extends ExploreRowShape>(rows: T[], goalIds: string[]): T[] {
  if (goalIds.length === 0) return rows
  const weight = (row: T): number => {
    let w = 0
    const map = ROUTE_GOAL_WEIGHT[row.route]
    if (!map) return w
    for (const g of goalIds) {
      w += map[g] ?? 0
    }
    return w
  }
  return [...rows].sort((a, b) => weight(b) - weight(a))
}

/** Cycle slice for mood-tracker copy (period / ovulation window / luteal / early cycle). */
export type MoodTrackerRhythmPhase = 'none' | 'period' | 'fertile' | 'luteal' | 'follicular'

export function moodTrackerRhythmPhase(state: CycleUiState, cycleDay: number | null): MoodTrackerRhythmPhase {
  if (state === 'no_data') return 'none'
  if (state === 'period') return 'period'
  if (state === 'fertile') return 'fertile'
  if (state === 'normal' && cycleDay != null && cycleDay >= 17) return 'luteal'
  return 'follicular'
}

export function moodTrackerCardHead(state: CycleUiState, cycleDay: number | null): string {
  const rhythm = moodTrackerRhythmPhase(state, cycleDay)
  if (rhythm === 'none') return 'Your rhythm'
  if (rhythm === 'period' && cycleDay != null) return `Period · day ${cycleDay}`
  if (rhythm === 'fertile') return 'Fertile window'
  if (rhythm === 'luteal') return 'Luteal phase'
  return 'Mid-cycle'
}

export function moodTrackerCardLines(input: {
  rhythm: MoodTrackerRhythmPhase
  cycleDay: number | null
  /** Days until predicted ovulation when known; omit when not ovulation-focused. */
  ovulationDaysAway: number | null
  healthGoalIds: string[]
}): { insight: string; action?: string } {
  const { rhythm, cycleDay, ovulationDaysAway, healthGoalIds } = input
  let insight = ''
  if (rhythm === 'period' && cycleDay != null && cycleDay >= 1) {
    insight = `Day ${cycleDay} of period. Mood changes are common.`
  } else if (ovulationDaysAway != null && ovulationDaysAway >= 0 && rhythm !== 'period') {
    if (ovulationDaysAway === 0)
      insight = 'Ovulation is often today—mood may feel brighter for some.'
    else
      insight = `Ovulation in ${ovulationDaysAway} day${ovulationDaysAway === 1 ? '' : 's'}. Mood may feel more positive.`
  } else if (rhythm === 'luteal') {
    insight = 'Luteal phase—mood shifts before your next period are common.'
  } else if (rhythm === 'fertile') {
    insight = 'Fertile window—energy and mood often lift for some people.'
  } else if (rhythm === 'none') {
    insight = 'Quick taps help connect how you feel to your cycle over time.'
  } else {
    insight = 'Logging helps your week-by-week patterns show up sooner.'
  }

  let action: string | undefined
  if (healthGoalIds.includes('stress')) action = 'Logging helps track stress patterns over time.'
  else if (healthGoalIds.includes('sleep'))
    action = 'Add sleep in Log when you can—nights read clearer beside mood.'
  return { insight, action }
}

export function moodTrackerSelectionInsight(moodId: string, rhythm: MoodTrackerRhythmPhase): string {
  if (moodId === 'anxious') {
    if (rhythm === 'period' || rhythm === 'luteal') return 'Common before your period'
    return 'Stress can peak mid-cycle—logging helps you spot repeats.'
  }
  if (moodId === 'irritable') return 'Hormonal shifts may affect mood'
  if (moodId === 'happy') {
    if (rhythm === 'fertile') return 'Energy often improves near ovulation'
    return 'Glad you logged this—bright spots matter for patterns.'
  }
  if (moodId === 'sad') return 'Low days happen—you are not alone in this.'
  if (moodId === 'neutral') return 'Neutral counts—steady days are useful data.'
  if (moodId === 'calm') return 'Calm check-ins make trends easier to read.'
  return 'Noted—patterns grow with a few more taps.'
}

export function moodTrackerMicroSuggestion(moodId: string): string {
  const byMood: Record<string, string[]> = {
    anxious: ['Try a 2-minute breathing exercise', 'Name one thing you can hear right now'],
    irritable: ['Take a short walk', 'Pause for ten slow breaths'],
    sad: ['Step outside for one minute', 'Text someone you trust'],
    happy: ['Savor it—note what felt good today', 'Carry this into one small task'],
    neutral: ['Check in again tonight if you like', 'A sip of water and a stretch can help'],
    calm: ['Keep this pace—you are regulated today', 'Try a 2-minute breathing exercise'],
  }
  const list = byMood[moodId] ?? ['Try a 2-minute breathing exercise', 'Take a short walk']
  const i = (moodId.length + new Date().getDate()) % list.length
  return list[i] ?? list[0]
}

