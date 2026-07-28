import React, { useCallback } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format, parseISO } from 'date-fns'
import { CloudRain, Flower2, Plus, Smile, Sparkles } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { TTC_GREEN, TTC_GREEN_BG, TTC_GREEN_DARK } from './constants'
import { useAuth } from '../../providers/AuthProvider'
import { useTtcJournalEntries, type TtcJournalEntryRow } from '../../hooks/use-ttc-journal-entries'

type Nav = NativeStackNavigationProp<MainStackParamList, 'TTCJournal'>

function pickEntryVisuals(mood: string | null): { Icon: LucideIcon; iconColor: string; iconBg: string } {
  const m = (mood ?? '').toLowerCase()
  if (m.includes('hopeful') || m.includes('happy')) {
    return { Icon: Smile, iconColor: TTC_GREEN_DARK, iconBg: TTC_GREEN_BG }
  }
  if (m.includes('anxious') || m.includes('low')) {
    return { Icon: CloudRain, iconColor: ThemeColors.lavender, iconBg: ThemeColors.purpleBg }
  }
  if (m.includes('calm') || m.includes('neutral')) {
    return { Icon: Flower2, iconColor: ThemeColors.primary, iconBg: ThemeColors.pinkSurface }
  }
  return { Icon: Sparkles, iconColor: ThemeColors.lavender, iconBg: '#F0EAFF' }
}

function formatEntryBody(row: TtcJournalEntryRow): string {
  const parts: string[] = []
  if (row.note.trim()) parts.push(row.note.trim())
  if (row.symptoms.length > 0) {
    const joined = row.symptoms.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
    parts.push(`Symptoms: ${joined}`)
  }
  return parts.join('\n\n') || '—'
}

export function TTCJournalScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()
  const { user } = useAuth()
  const { entries, loading, error, reload } = useTtcJournalEntries()

  const goNew = useCallback(() => {
    if (!user?.id) return
    nav.navigate('TTCJournalNew')
  }, [nav, user?.id])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + ThemeSpacing.inlineGap, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>TTC journal</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TTC_GREEN} />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
          <Pressable onPress={() => void reload()} style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!user?.id ? (
        <Text style={styles.empty}>Sign in to save journal entries to your account and sync them across sessions.</Text>
      ) : null}

      {user?.id && !loading && !error && entries.length === 0 ? (
        <Text style={styles.empty}>No journal entries yet. Start logging to see patterns.</Text>
      ) : null}

      {entries.map((e) => {
        const { Icon, iconColor, iconBg } = pickEntryVisuals(e.mood_label)
        let dateLabel = '—'
        try {
          dateLabel = format(parseISO(e.created_at), 'MMM d, yyyy')
        } catch {
          dateLabel = e.created_at.slice(0, 10)
        }
        return (
          <View key={e.id} style={styles.card}>
            <View style={[styles.moodIcon, { backgroundColor: iconBg }]}>
              <Icon size={20} color={iconColor} strokeWidth={2} />
            </View>
            <View style={styles.cardMain}>
              <View style={styles.datePill}>
                <Text style={styles.dateText}>{dateLabel}</Text>
              </View>
              <Text style={styles.entryTitle}>{e.title}</Text>
              <Text style={styles.entryBody}>{formatEntryBody(e)}</Text>
            </View>
          </View>
        )
      })}

      <Pressable
        onPress={goNew}
        disabled={!user?.id}
        style={({ pressed }) => [styles.cta, (!user?.id || pressed) && { opacity: user?.id ? 0.88 : 0.45 }]}
      >
        <Plus size={18} color={ThemeColors.white} strokeWidth={2.5} />
        <Text style={styles.ctaText}>Write new entry</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: ThemeSpacing.itemGap },
  centered: { paddingVertical: ThemeSpacing.sectionGap, alignItems: 'center' },
  banner: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: ThemeSpacing.cardPad,
    marginBottom: ThemeSpacing.itemGap,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  bannerText: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, marginBottom: ThemeSpacing.itemGap },
  retry: { alignSelf: 'flex-start' },
  retryText: { fontSize: 15, fontWeight: '700', color: ThemeColors.primary },
  empty: {
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textMid,
    lineHeight: 22,
    marginBottom: ThemeSpacing.itemGap,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 14,
    gap: ThemeSpacing.inlineGap,
    marginBottom: 14,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  moodIcon: {
    width: 44,
    height: 44,
    borderRadius: ThemeRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: { flex: 1 },
  datePill: {
    alignSelf: 'flex-start',
    backgroundColor: ThemeColors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ThemeRadius.pill,
    marginBottom: ThemeSpacing.inlineGap,
  },
  dateText: { fontSize: 12, fontWeight: '600', color: ThemeColors.textMid },
  entryTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 6 },
  entryBody: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 20 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ThemeSpacing.inlineGap,
    backgroundColor: TTC_GREEN,
    borderRadius: ThemeRadius.button,
    paddingVertical: ThemeSpacing.cardPad,
    marginTop: ThemeSpacing.inlineGap,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
})
