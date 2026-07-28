/** Shape returned by `public.get_cycle_predictions` (jsonb). */
export interface CyclePredictionsJson {
  average_length?: number
  average_period?: number
  next_period?: string | null
  next_ovulation?: string | null
  fertile_window_start?: string | null
  fertile_window_end?: string | null
  current_cycle_day?: number | null
  current_phase?: string | null
}

export function insightFromPredictions(
  pred: CyclePredictionsJson | null,
  hasActiveCycle: boolean,
): string {
  const avgLen = pred?.average_length != null ? Math.round(Number(pred.average_length)) : null
  const avgPer = pred?.average_period != null ? Math.round(Number(pred.average_period)) : null

  if (hasActiveCycle && pred?.current_cycle_day != null && avgLen != null) {
    const day = Math.round(Number(pred.current_cycle_day))
    return `You're on cycle day ${day}. Your recent cycles average about ${avgLen} days.`
  }
  if (avgLen != null && avgPer != null) {
    return `Based on your settings, a typical cycle is about ${avgLen} days with a ${avgPer}-day period. Log when your period starts to unlock day-by-day tracking.`
  }
  if (avgLen != null) {
    return `Your typical cycle length is about ${avgLen} days. Add your period start date to see predictions for this cycle.`
  }
  return 'Log your period start to see cycle day, phase, and upcoming dates here.'
}
