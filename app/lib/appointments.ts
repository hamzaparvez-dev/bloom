import { format, parseISO, isBefore, startOfDay, addDays } from 'date-fns'
import { supabase } from '../../supabaseClient'
import { ThemeColors } from '../constants/theme'

export type AppointmentKind = 'checkup' | 'ultrasound' | 'test' | 'other'

export interface AppointmentListItem {
  id: string
  title: string
  dateLine: string
  tag: string
  tagColor: string
  sortKey: number
  rawDate: string
}

const TAG_BY_TYPE: Record<AppointmentKind, { label: string; color: string }> = {
  checkup: { label: 'Routine', color: ThemeColors.lavender },
  ultrasound: { label: 'Ultrasound', color: '#8B5CF6' },
  test: { label: 'Lab Test', color: ThemeColors.mint },
  other: { label: 'Other', color: ThemeColors.textMid },
}

function formatAppointmentLine(dateStr: string, timeStr: string | null): string {
  try {
    const d = parseISO(`${dateStr}T12:00:00`)
    const datePart = format(d, 'MMM d, yyyy')
    if (!timeStr) return datePart
    const t = timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr
    return `${datePart} · ${t}`
  } catch {
    return dateStr
  }
}

export async function fetchAppointments(userId: string): Promise<{
  rows: AppointmentListItem[]
  error: string | null
}> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, title, date, time, type')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) return { rows: [], error: error.message }

  const rows: AppointmentListItem[] = (data ?? []).map((r) => {
    const kind = (r.type as AppointmentKind) || 'other'
    const meta = TAG_BY_TYPE[kind] ?? TAG_BY_TYPE.other
    const d = parseISO(String(r.date))
    const sortKey = d.getTime()
    return {
      id: r.id,
      title: r.title,
      dateLine: formatAppointmentLine(String(r.date), r.time as string | null),
      tag: meta.label,
      tagColor: meta.color,
      sortKey,
      rawDate: String(r.date),
    }
  })

  rows.sort((a, b) => a.sortKey - b.sortKey)
  return { rows, error: null }
}

export function filterAppointments(
  rows: AppointmentListItem[],
  filterIndex: number,
): AppointmentListItem[] {
  const today = startOfDay(new Date())
  const soon = addDays(today, 7)

  if (filterIndex === 0) {
    return rows.filter((r) => {
      const d = startOfDay(parseISO(`${r.rawDate}T12:00:00`))
      return !isBefore(d, today)
    })
  }
  if (filterIndex === 1) {
    return rows.filter((r) => {
      const d = startOfDay(parseISO(`${r.rawDate}T12:00:00`))
      return isBefore(d, today)
    })
  }
  return rows.filter((r) => {
    const d = startOfDay(parseISO(`${r.rawDate}T12:00:00`))
    return !isBefore(d, today) && !isBefore(soon, d)
  })
}

export async function insertAppointment(input: {
  userId: string
  pregnancyId: string | null
  title: string
  date: Date
  type: AppointmentKind
  notes?: string | null
}): Promise<{ error: string | null }> {
  const dateStr = format(input.date, 'yyyy-MM-dd')
  const timeStr = format(input.date, 'HH:mm:ss')

  const { error } = await supabase.from('appointments').insert({
    user_id: input.userId,
    pregnancy_id: input.pregnancyId,
    title: input.title.trim(),
    date: dateStr,
    time: timeStr,
    type: input.type,
    notes: input.notes?.trim() || null,
  })
  return { error: error?.message ?? null }
}
