import { format, subDays } from 'date-fns'
import { supabase } from '../../supabaseClient'

export interface CycleStartRow {
  start_date: string
}

export interface DailyLogSymptomRow {
  date: string
  symptoms: string[] | null
}

export interface FertilityRow {
  date: string
  opk_result: string | null
  current_bbt: number | string | null
}

export interface HealthReportContext {
  displayName: string | null
  settingsCycleLength: number | null
  cycles: CycleStartRow[]
  dailyLogs: DailyLogSymptomRow[]
  fertility: FertilityRow[]
}

const REPORT_DAYS = 180

export async function fetchHealthReportContext(userId: string): Promise<{ data: HealthReportContext | null; error: string | null }> {
  const since = format(subDays(new Date(), REPORT_DAYS), 'yyyy-MM-dd')

  const [profileRes, settingsRes, cyclesRes, logsRes, fertRes] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
    supabase.from('user_settings').select('cycle_length').eq('user_id', userId).maybeSingle(),
    supabase.from('cycles').select('start_date').eq('user_id', userId).order('start_date', { ascending: true }),
    supabase
      .from('daily_logs')
      .select('date, symptoms')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true }),
    supabase
      .from('fertility_data')
      .select('date, opk_result, current_bbt')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true }),
  ])

  const parts: string[] = []
  if (profileRes.error) parts.push(profileRes.error.message)
  if (settingsRes.error) parts.push(settingsRes.error.message)
  if (cyclesRes.error) parts.push(cyclesRes.error.message)
  if (logsRes.error) parts.push(logsRes.error.message)
  if (fertRes.error) parts.push(fertRes.error.message)

  if (parts.length > 0) return { data: null, error: parts.join(' · ') }

  return {
    data: {
      displayName: profileRes.data?.display_name != null ? String(profileRes.data.display_name).trim() || null : null,
      settingsCycleLength:
        settingsRes.data?.cycle_length != null && Number.isFinite(Number(settingsRes.data.cycle_length))
          ? Math.round(Number(settingsRes.data.cycle_length))
          : null,
      cycles: (cyclesRes.data ?? []).map((r) => ({ start_date: String(r.start_date).slice(0, 10) })),
      dailyLogs: (logsRes.data ?? []).map((r) => ({
        date: String(r.date).slice(0, 10),
        symptoms: Array.isArray(r.symptoms) ? r.symptoms.map(String) : null,
      })),
      fertility: (fertRes.data ?? []).map((r) => ({
        date: String(r.date).slice(0, 10),
        opk_result: r.opk_result != null ? String(r.opk_result) : null,
        current_bbt: r.current_bbt as number | string | null,
      })),
    },
    error: null,
  }
}
