import AsyncStorage from '@react-native-async-storage/async-storage'
import { format } from 'date-fns'
import { supabase } from '../../supabaseClient'
import { upsertDailyLog } from './upsert-daily-log'

const PREFILL_KEY = '@bloom/quick_log_prefill_v1'

export interface QuickLogPrefill {
  mood: string | null
  energy: string | null
  sleep_hours: number | null
}

export async function loadQuickLogPrefill(): Promise<QuickLogPrefill | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFILL_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as Partial<QuickLogPrefill>
    return {
      mood: typeof j.mood === 'string' ? j.mood : null,
      energy: typeof j.energy === 'string' ? j.energy : null,
      sleep_hours: typeof j.sleep_hours === 'number' && Number.isFinite(j.sleep_hours) ? j.sleep_hours : null,
    }
  } catch {
    return null
  }
}

export async function saveQuickLogPrefill(p: QuickLogPrefill): Promise<void> {
  await AsyncStorage.setItem(PREFILL_KEY, JSON.stringify(p))
}

export async function quickLogPatch(
  userId: string,
  patch: { mood?: string | null; energy?: string | null; sleep_hours?: number | null },
): Promise<{ error: string | null }> {
  const date = format(new Date(), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('daily_logs')
    .select('period_flow, symptoms, mood, energy, sleep_hours, notes')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (error) return { error: error.message }

  const symptoms =
    data?.symptoms == null
      ? null
      : Array.isArray(data.symptoms)
        ? (data.symptoms as string[])
        : null

  const merged = {
    period_flow: (data?.period_flow as string | null) ?? 'none',
    symptoms,
    mood: patch.mood !== undefined ? patch.mood : (data?.mood as string | null) ?? null,
    energy: patch.energy !== undefined ? patch.energy : (data?.energy as string | null) ?? null,
    sleep_hours:
      patch.sleep_hours !== undefined
        ? patch.sleep_hours
        : data?.sleep_hours != null
          ? Number(data.sleep_hours)
          : null,
    notes: (data?.notes as string | null) ?? null,
  }

  const { error: rpcError } = await upsertDailyLog({
    userId,
    date,
    period_flow: merged.period_flow,
    symptoms: merged.symptoms,
    mood: merged.mood,
    energy: merged.energy,
    sleep_hours: merged.sleep_hours,
    notes: merged.notes,
  })
  return { error: rpcError?.message ?? null }
}
