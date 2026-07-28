import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { format } from 'date-fns'
import { supabase } from '../../../supabaseClient'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { loadQuickLogPrefill, quickLogPatch, saveQuickLogPrefill } from '../../lib/quick-log'
import { showHabitToast } from '../../lib/habit-toast'
import { syncHabitNudges } from '../../lib/habit-notifications'

const MOOD_OPTIONS = ['Happy', 'Neutral', 'Low', 'Anxious', 'Irritable', 'Calm'] as const
const ENERGY_OPTIONS = ['Low', 'Normal', 'High'] as const

type MoodLabel = (typeof MOOD_OPTIONS)[number]
type EnergyLabel = (typeof ENERGY_OPTIONS)[number]

const MOOD_LABEL_TO_DB: Record<MoodLabel, string> = {
  Happy: 'happy',
  Neutral: 'neutral',
  Low: 'low',
  Anxious: 'anxious',
  Irritable: 'irritable',
  Calm: 'neutral',
}

const MOOD_DB_TO_LABEL: Record<string, MoodLabel> = {
  happy: 'Happy',
  neutral: 'Neutral',
  low: 'Low',
  anxious: 'Anxious',
  irritable: 'Irritable',
}

const ENERGY_LABEL_TO_DB: Record<EnergyLabel, string> = {
  Low: 'low',
  Normal: 'normal',
  High: 'high',
}

const ENERGY_DB_TO_LABEL: Record<string, EnergyLabel> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

const SLEEP_CHIPS: { label: string; hours: number }[] = [
  { label: '<7h', hours: 6.5 },
  { label: '7–8h', hours: 7.5 },
  { label: '8+h', hours: 8.5 },
]

interface QuickLogRowProps {
  userId: string
  notificationsEnabled: boolean
  onLogged: () => void
}

export function QuickLogRow({ userId, notificationsEnabled, onLogged }: QuickLogRowProps) {
  const [moodLabel, setMoodLabel] = useState<MoodLabel | null>(null)
  const [energyLabel, setEnergyLabel] = useState<EnergyLabel | null>(null)
  const [sleepH, setSleepH] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const hydrate = useCallback(async () => {
    setLoading(true)
    const today = format(new Date(), 'yyyy-MM-dd')
    const [{ data, error }, prefill] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('mood, energy, sleep_hours')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle(),
      loadQuickLogPrefill(),
    ])

    if (error) console.warn('[QuickLogRow]', error.message)

    const moodDb = data?.mood != null ? String(data.mood) : null
    const energyDb = data?.energy != null ? String(data.energy) : null
    const sleepDb = data?.sleep_hours != null && Number.isFinite(Number(data.sleep_hours)) ? Number(data.sleep_hours) : null

    if (moodDb && MOOD_DB_TO_LABEL[moodDb]) setMoodLabel(MOOD_DB_TO_LABEL[moodDb])
    else if (prefill?.mood && MOOD_DB_TO_LABEL[prefill.mood]) setMoodLabel(MOOD_DB_TO_LABEL[prefill.mood])
    else setMoodLabel(null)

    if (energyDb && ENERGY_DB_TO_LABEL[energyDb]) setEnergyLabel(ENERGY_DB_TO_LABEL[energyDb])
    else if (prefill?.energy && ENERGY_DB_TO_LABEL[prefill.energy]) setEnergyLabel(ENERGY_DB_TO_LABEL[prefill.energy])
    else setEnergyLabel(null)

    if (sleepDb != null) setSleepH(sleepDb)
    else if (prefill?.sleep_hours != null) setSleepH(prefill.sleep_hours)
    else setSleepH(null)

    setLoading(false)
  }, [userId])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const persist = useCallback(
    async (patch: { mood?: string | null; energy?: string | null; sleep_hours?: number | null }) => {
      setSaving(true)
      const { error } = await quickLogPatch(userId, patch)
      setSaving(false)
      if (error) {
        showHabitToast('Could not save—try again.')
        return
      }
      void saveQuickLogPrefill({
        mood: patch.mood ?? (moodLabel ? MOOD_LABEL_TO_DB[moodLabel] : null),
        energy: patch.energy ?? (energyLabel ? ENERGY_LABEL_TO_DB[energyLabel] : null),
        sleep_hours: patch.sleep_hours !== undefined ? patch.sleep_hours : sleepH,
      })
      showHabitToast('Saved for today.')
      onLogged()
      void syncHabitNudges({ loggedToday: true, notificationsEnabled })
      void hydrate()
    },
    [userId, moodLabel, energyLabel, sleepH, notificationsEnabled, onLogged, hydrate],
  )

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={ThemeColors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Quick log</Text>
      <Text style={styles.hint}>Each tap saves to today—no extra save button</Text>

      <Text style={styles.label}>Mood</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {MOOD_OPTIONS.map((label) => (
          <Pressable
            key={label}
            disabled={saving}
            onPress={() => {
              setMoodLabel(label)
              void persist({ mood: MOOD_LABEL_TO_DB[label] })
            }}
            style={({ pressed }) => [
              styles.chip,
              moodLabel === label && styles.chipOn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.chipText, moodLabel === label && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Energy</Text>
      <View style={styles.chipRow}>
        {ENERGY_OPTIONS.map((label) => (
          <Pressable
            key={label}
            disabled={saving}
            onPress={() => {
              setEnergyLabel(label)
              void persist({ energy: ENERGY_LABEL_TO_DB[label] })
            }}
            style={({ pressed }) => [
              styles.chip,
              energyLabel === label && styles.chipOn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.chipText, energyLabel === label && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Sleep</Text>
      <View style={styles.chipRow}>
        {SLEEP_CHIPS.map((c) => (
          <Pressable
            key={c.label}
            disabled={saving}
            onPress={() => {
              setSleepH(c.hours)
              void persist({ sleep_hours: c.hours })
            }}
            style={({ pressed }) => [
              styles.chip,
              sleepH === c.hours && styles.chipOn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.chipText, sleepH === c.hours && styles.chipTextOn]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  loading: { paddingVertical: 20, alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '800', color: ThemeColors.textDark },
  hint: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, marginTop: 4, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: ThemeColors.textLight, marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: ThemeRadius.pill,
    backgroundColor: ThemeColors.bgCream,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
  },
  chipOn: {
    backgroundColor: ThemeColors.primary,
    borderColor: ThemeColors.primary,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark },
  chipTextOn: { color: ThemeColors.white },
})
