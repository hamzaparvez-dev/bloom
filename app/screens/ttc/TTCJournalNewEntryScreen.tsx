import React, { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { useTtcJournalEntries } from '../../hooks/use-ttc-journal-entries'

const MOOD_OPTIONS = ['Hopeful', 'Calm', 'Neutral', 'Low', 'Anxious'] as const

const SYMPTOM_CHIPS = ['Cramps', 'Bloating', 'Headache', 'Fatigue', 'Nausea', 'Tender'] as const

export function TTCJournalNewEntryScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const { insertEntry } = useTtcJournalEntries()

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggleSymptom = useCallback((s: string) => {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }, [])

  const save = useCallback(() => {
    const t = title.trim()
    if (!t) {
      Alert.alert('Title required', 'Add a short title for this entry.')
      return
    }
    setSaving(true)
    void (async () => {
      const { error } = await insertEntry({
        title: t,
        note: note.trim(),
        moodLabel: mood,
        symptoms: symptoms.map((x) => x.toLowerCase()),
      })
      setSaving(false)
      if (error) {
        Alert.alert('Could not save', error)
        return
      }
      nav.goBack()
    })()
  }, [title, note, mood, symptoms, insertEntry, nav])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + ThemeSpacing.inlineGap, paddingBottom: insets.bottom + ThemeSpacing.sectionGap }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="How are you feeling today?"
        placeholderTextColor={ThemeColors.textLight}
        editable={!saving}
      />

      <Text style={[styles.label, styles.labelSpaced]}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        style={[styles.input, styles.inputMultiline]}
        placeholder="Anything you want to remember about this cycle day?"
        placeholderTextColor={ThemeColors.textLight}
        multiline
        textAlignVertical="top"
        editable={!saving}
      />

      <Text style={[styles.label, styles.labelSpaced]}>Mood (optional)</Text>
      <View style={styles.chipRow}>
        {MOOD_OPTIONS.map((m) => {
          const selected = mood === m
          return (
            <Pressable
              key={m}
              onPress={() => setMood(selected ? null : m)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{m}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={[styles.label, styles.labelSpaced]}>Symptoms (optional)</Text>
      <View style={styles.chipRow}>
        {SYMPTOM_CHIPS.map((s) => {
          const selected = symptoms.includes(s)
          return (
            <Pressable
              key={s}
              onPress={() => toggleSymptom(s)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s}</Text>
            </Pressable>
          )
        })}
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [styles.primaryCta, pressed && !saving && { opacity: 0.88 }, saving && { opacity: 0.6 }]}
      >
        <Text style={styles.primaryCtaText}>{saving ? 'Saving…' : 'Save entry'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  label: { fontSize: 14, fontWeight: '600', color: ThemeColors.textMid, marginBottom: ThemeSpacing.inlineGap },
  labelSpaced: { marginTop: ThemeSpacing.itemGap },
  input: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.md,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    paddingHorizontal: ThemeSpacing.cardPad,
    paddingVertical: ThemeSpacing.itemGap,
    fontSize: 16,
    color: ThemeColors.textDark,
  },
  inputMultiline: { minHeight: 120, paddingTop: ThemeSpacing.itemGap },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: ThemeSpacing.inlineGap },
  chip: {
    paddingHorizontal: ThemeSpacing.cardPad,
    paddingVertical: ThemeSpacing.inlineGap,
    borderRadius: ThemeRadius.pill,
    backgroundColor: ThemeColors.surface,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  chipSelected: { backgroundColor: ThemeColors.pinkSurface, borderColor: ThemeColors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textMid },
  chipTextSelected: { color: ThemeColors.primaryDark },
  primaryCta: {
    marginTop: ThemeSpacing.sectionGap,
    backgroundColor: ThemeColors.primary,
    borderRadius: ThemeRadius.button,
    paddingVertical: ThemeSpacing.cardPad,
    alignItems: 'center',
  },
  primaryCtaText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
})
