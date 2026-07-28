import { format } from 'date-fns'
import { supabase } from '../../supabaseClient'
import type { CervicalPositionStored } from './cervical-position'
import { cervicalPositionToJson } from './cervical-position'

export type BbtSourceDb = 'manual' | 'scanned'

export interface UpsertDailyLogInput {
  userId: string
  date?: string
  period_flow?: string | null
  /** Pass `[]` to clear symptoms; `null` to leave unchanged on update. */
  symptoms?: string[] | null
  mood?: string | null
  energy?: string | null
  bbt?: number | null
  cervical_mucus?: string | null
  sleep_hours?: number | null
  notes?: string | null
  /** Set when column exists in `daily_logs` (patched after RPC if provided). */
  bbtSource?: BbtSourceDb | null
  /** Public thermometer image URL from `bbt-readings` storage. */
  bbtImageUrl?: string | null
  /** Structured cervix logging; null clears when `clearCervicalPosition` is true. */
  cervicalPosition?: CervicalPositionStored | null
  /** When true, persists `cervical_position` = null (clear structured row). */
  clearCervicalPosition?: boolean
}

export async function upsertDailyLog(input: UpsertDailyLogInput) {
  const date = input.date ?? format(new Date(), 'yyyy-MM-dd')
  const rpc = await supabase.rpc('upsert_daily_log', {
    p_user_id: input.userId,
    p_date: date,
    p_period_flow: input.period_flow ?? null,
    p_symptoms: input.symptoms ?? null,
    p_mood: input.mood ?? null,
    p_energy: input.energy ?? null,
    p_bbt: input.bbt ?? null,
    p_cervical_mucus: input.cervical_mucus ?? null,
    p_sleep_hours: input.sleep_hours ?? null,
    p_notes: input.notes ?? null,
  })

  if (rpc.error) return rpc

  const patch: Record<string, string | object | null> = {}
  if (input.bbtSource !== undefined) patch.bbt_source = input.bbtSource
  if (input.bbtImageUrl !== undefined) patch.bbt_image_url = input.bbtImageUrl

  if (input.clearCervicalPosition) patch.cervical_position = null
  else if (input.cervicalPosition !== undefined && input.cervicalPosition != null) {
    const encoded = cervicalPositionToJson(input.cervicalPosition)
    patch.cervical_position = encoded
  }

  if (Object.keys(patch).length === 0) return rpc

  const { error: patchError } = await supabase
    .from('daily_logs')
    .update(patch)
    .eq('user_id', input.userId)
    .eq('date', date)

  if (patchError) return { data: null, error: patchError }
  return rpc
}
