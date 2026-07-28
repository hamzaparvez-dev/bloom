import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import type { HealthReportContext } from './fetch-health-report-context'

export interface HealthReportBullets {
  cycle: string[]
  symptoms: string[]
  fertility: string[]
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const sq = values.map((v) => (v - m) ** 2)
  return Math.sqrt(sq.reduce((a, b) => a + b, 0) / (values.length - 1))
}

function cycleLengthsFromStarts(sortedStarts: string[]): number[] {
  const lengths: number[] = []
  for (let i = 0; i < sortedStarts.length - 1; i++) {
    try {
      const a = parseISO(`${sortedStarts[i]}T12:00:00`)
      const b = parseISO(`${sortedStarts[i + 1]}T12:00:00`)
      const d = differenceInCalendarDays(b, a)
      if (d > 0 && d < 90) lengths.push(d)
    } catch {
      /* skip */
    }
  }
  return lengths
}

function regularityLabel(std: number, avg: number): string {
  if (avg <= 0) return 'Keep logging period starts to measure regularity.'
  const cv = std / avg
  if (cv < 0.05) return 'Regularity: Excellent — cycles are very consistent.'
  if (cv < 0.1) return 'Regularity: Good — mild variation between cycles.'
  if (cv < 0.18) return 'Regularity: Moderate — some variation; keep tracking.'
  return 'Regularity: Variable — discuss big swings with your clinician if concerned.'
}

function symptomFrequencyLines(logs: { symptoms: string[] | null }[]): string[] {
  const counts = new Map<string, number>()
  let daysWithAny = 0
  for (const row of logs) {
    const sy = row.symptoms
    if (!sy || sy.length === 0) continue
    daysWithAny += 1
    const seen = new Set<string>()
    for (const raw of sy) {
      const s = raw.trim().toLowerCase()
      if (!s || seen.has(s)) continue
      seen.add(s)
      counts.set(s, (counts.get(s) ?? 0) + 1)
    }
  }
  if (daysWithAny === 0) {
    return [
      'No symptom tags in daily logs for this window.',
      'Log symptoms on the tracker to see frequency insights here.',
    ]
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted[0]
  const pct = Math.round((top[1] / daysWithAny) * 100)
  const lines = [`Top logged symptom: ${top[0]} — on ${pct}% of days you logged symptoms.`]
  if (sorted[1]) {
    const t2 = sorted[1]
    const p2 = Math.round((t2[1] / daysWithAny) * 100)
    lines.push(`Next: ${t2[0]} — ${p2}% of those days.`)
  }
  lines.push(`Based on ${daysWithAny} logged day${daysWithAny === 1 ? '' : 's'} in the last ~6 months.`)
  return lines
}

function opkCycleSummary(ctx: HealthReportContext): string[] {
  const { cycles, fertility } = ctx
  const positives = fertility.filter((r) => r.opk_result === 'positive').length
  const anyOpk = fertility.filter((r) => r.opk_result != null && r.opk_result !== '').length

  const starts = [...new Set(cycles.map((c) => c.start_date))].sort()
  const lengths = cycleLengthsFromStarts(starts)
  const cycleCount = Math.max(0, starts.length - 1)

  if (cycleCount === 0 && positives === 0 && anyOpk === 0) {
    return ['No OPK results in fertility logs yet.', 'Log LH tests around your fertile window to populate this section.']
  }

  const lines: string[] = []
  if (positives > 0) lines.push(`LH (OPK) positive logs: ${positives} day${positives === 1 ? '' : 's'} in range.`)
  if (anyOpk > 0) lines.push(`Total OPK entries logged: ${anyOpk}.`)

  if (cycleCount > 0) {
    let withPositive = 0
    for (let i = 0; i < starts.length - 1; i++) {
      const a = starts[i]
      const b = starts[i + 1]
      const hit = fertility.some((r) => r.opk_result === 'positive' && r.date >= a && r.date < b)
      if (hit) withPositive += 1
    }
    lines.push(`Cycles with at least one positive OPK: ${withPositive} of ${cycleCount} completed.`)
  }

  return lines.length > 0 ? lines : ['Log OPK results to see cycle-by-cycle fertility patterns.']
}

function bbtSummary(fertility: { date: string; current_bbt: number | string | null }[]): string[] {
  const temps: { date: string; v: number }[] = []
  for (const r of fertility) {
    if (r.current_bbt == null) continue
    const v = typeof r.current_bbt === 'number' ? r.current_bbt : parseFloat(String(r.current_bbt))
    if (!Number.isFinite(v)) continue
    temps.push({ date: r.date, v })
  }
  temps.sort((a, b) => a.date.localeCompare(b.date))
  if (temps.length < 5) {
    return ['BBT: Log at least 5 temperatures across your cycle to assess a shift.', `Logged BBT days in range: ${temps.length}.`]
  }

  let maxJump = 0
  let sumTwoDay = 0
  for (let i = 1; i < temps.length; i++) {
    const d = temps[i].v - temps[i - 1].v
    maxJump = Math.max(maxJump, d)
    if (i >= 2) {
      const two = temps[i].v - temps[i - 2].v
      sumTwoDay = Math.max(sumTwoDay, two)
    }
  }

  if (maxJump >= 0.2 || sumTwoDay >= 0.25) {
    return ['BBT pattern: A clear upward shift appears in your logged temperatures.', 'This often follows ovulation — keep logging for confirmation across cycles.']
  }

  return ['BBT pattern: No strong sustained shift detected in recent logs yet.', 'Continue daily readings before waking for clearer patterns.']
}

export function buildHealthReportPeriodLine(): string {
  const end = new Date()
  const start = subDays(end, 180)
  return `Report window: ${format(start, 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`
}

export function buildPatientLine(displayName: string | null): string {
  const name = displayName?.trim() || 'Your account'
  return `Patient: ${name}`
}

export function computeHealthReportBullets(ctx: HealthReportContext): HealthReportBullets {
  const starts = [...new Set(ctx.cycles.map((c) => c.start_date))].sort()
  const lengths = cycleLengthsFromStarts(starts)

  const cycleLines: string[] = []
  if (lengths.length >= 2) {
    const avg = mean(lengths)
    const std = sampleStdDev(lengths)
    cycleLines.push(`Avg cycle length: ${avg.toFixed(1)} days (from ${lengths.length} logged cycles).`)
    cycleLines.push(regularityLabel(std, avg))
    cycleLines.push(`Ovulation tracking: use OPK, mucus, and BBT alongside these dates for the full picture.`)
  } else if (lengths.length === 1) {
    cycleLines.push(`Latest cycle length: ${lengths[0]} days (log one more period start for an average).`)
    if (ctx.settingsCycleLength != null) {
      cycleLines.push(`Your settings baseline: ~${ctx.settingsCycleLength} days — averages will personalize as you log.`)
    } else {
      cycleLines.push('Log your next period start to unlock personalized averages.')
    }
  } else {
    if (ctx.settingsCycleLength != null) {
      cycleLines.push(`Typical cycle from onboarding/settings: ~${ctx.settingsCycleLength} days.`)
    }
    cycleLines.push('Log at least two period starts to calculate your real average cycle length.')
    cycleLines.push('Regularity scores improve after more consecutive cycles are tracked.')
  }

  const symptomLines = symptomFrequencyLines(ctx.dailyLogs)
  const fertLines = [...opkCycleSummary(ctx), ...bbtSummary(ctx.fertility)]

  return { cycle: cycleLines, symptoms: symptomLines, fertility: fertLines }
}
