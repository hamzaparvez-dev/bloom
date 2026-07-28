import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../providers/AuthProvider'

export interface TtcJournalEntryRow {
  id: string
  title: string
  note: string
  mood_label: string | null
  symptoms: string[]
  created_at: string
}

export interface UseTtcJournalEntriesResult {
  entries: TtcJournalEntryRow[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  insertEntry: (input: {
    title: string
    note: string
    moodLabel: string | null
    symptoms: string[]
  }) => Promise<{ error: string | null }>
}

export function useTtcJournalEntries(): UseTtcJournalEntriesResult {
  const { user } = useAuth()
  const [entries, setEntries] = useState<TtcJournalEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setEntries([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('ttc_journal_entries')
      .select('id, title, note, mood_label, symptoms, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (qErr) {
      setError(qErr.message)
      setEntries([])
    } else {
      setEntries(
        (data ?? []).map((r) => ({
          id: String(r.id),
          title: String(r.title ?? ''),
          note: String(r.note ?? ''),
          mood_label: r.mood_label != null ? String(r.mood_label) : null,
          symptoms: Array.isArray(r.symptoms) ? r.symptoms.map(String) : [],
          created_at: String(r.created_at),
        })),
      )
    }
    setLoading(false)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const insertEntry = useCallback(
    async (input: { title: string; note: string; moodLabel: string | null; symptoms: string[] }) => {
      const uid = user?.id
      if (!uid) return { error: 'Sign in to save journal entries.' }
      const { error: insErr } = await supabase.from('ttc_journal_entries').insert({
        user_id: uid,
        title: input.title.trim(),
        note: input.note.trim(),
        mood_label: input.moodLabel?.trim() || null,
        symptoms: input.symptoms,
        updated_at: new Date().toISOString(),
      })
      if (insErr) return { error: insErr.message }
      await load()
      return { error: null }
    },
    [user?.id, load],
  )

  return { entries, loading, error, reload: load, insertEntry }
}
