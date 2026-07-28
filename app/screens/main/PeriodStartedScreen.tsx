import React, { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format, parseISO } from 'date-fns'
import { CalendarCheck, CircleDot, Clock, Target } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'
import { useCycleRefresh } from '../../context/cycle-refresh-context'
import { upsertDailyLog } from '../../lib/upsert-daily-log'

interface Props {
  onConfirm?: () => void
  onRemindLater?: () => void
  onBack?: () => void
}

export function PeriodStartedScreen({ onConfirm, onRemindLater, onBack }: Props) {
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const { user } = useAuth()
  const { bumpCycleRefresh } = useCycleRefresh()
  const [nextPeriodLabel, setNextPeriodLabel] = useState<string | null>(null)
  const [cycleHint, setCycleHint] = useState('Based on your logged cycles')
  const [busy, setBusy] = useState(false)

  React.useEffect(() => {
    const uid = user?.id
    if (!uid) return
    void (async () => {
      const { data, error } = await supabase.rpc('get_cycle_predictions', { p_user_id: uid })
      if (error || data == null) return
      const raw = data as { next_period?: string | null; average_length?: number }
      if (raw.next_period) {
        try {
          setNextPeriodLabel(format(parseISO(String(raw.next_period)), 'MMMM d, yyyy'))
        } catch {
          setNextPeriodLabel(String(raw.next_period))
        }
      }
      if (raw.average_length != null) {
        setCycleHint(`Based on your ~${Math.round(Number(raw.average_length))}-day cycle`)
      }
    })()
  }, [user?.id])

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
      return
    }
    const uid = user?.id
    if (!uid) {
      Alert.alert('Sign in required', 'Sign in to log your period start.')
      return
    }
    setBusy(true)
    void (async () => {
      const today = format(new Date(), 'yyyy-MM-dd')

      await supabase.from('cycles').update({ is_active: false }).eq('user_id', uid).eq('is_active', true)

      const { error: cycleErr } = await supabase.from('cycles').insert({
        user_id: uid,
        start_date: today,
        is_active: true,
        phase: 'menstrual',
      })

      if (cycleErr) {
        setBusy(false)
        Alert.alert('Could not save', cycleErr.message)
        return
      }

      const { error: logErr } = await upsertDailyLog({
        userId: uid,
        period_flow: 'medium',
      })

      if (logErr) {
        setBusy(false)
        Alert.alert('Cycle saved', 'Period start was saved, but the daily log could not be updated.', [
          { text: 'OK', onPress: () => nav.goBack() },
        ])
        bumpCycleRefresh()
        return
      }

      bumpCycleRefresh()
      setBusy(false)
      Alert.alert('Logged', 'Your period start has been saved.', [{ text: 'OK', onPress: () => nav.goBack() }])
    })()
  }

  const handleRemindLater = () => {
    if (onRemindLater) {
      onRemindLater()
      return
    }
    nav.goBack()
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}>
      <View style={styles.heroSection}>
        <View style={styles.heroCircleOuter}>
          <View style={styles.heroCircleInner}>
            <CircleDot size={48} color={ThemeColors.primary} strokeWidth={1.5} />
          </View>
        </View>
      </View>

      <Text style={styles.title}>Period Started!</Text>
      <Text style={styles.subtitle}>
        Log the start of your period to keep your cycle predictions accurate.
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={handleConfirm}
          disabled={busy}
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && styles.btnPressed,
            busy && { opacity: 0.65 },
          ]}
        >
          <CalendarCheck size={18} color={ThemeColors.white} strokeWidth={2} />
          <Text style={styles.confirmText}>{busy ? 'Saving…' : 'Yes, My Period Started'}</Text>
        </Pressable>

        <Pressable
          onPress={handleRemindLater}
          disabled={busy}
          style={({ pressed }) => [styles.remindBtn, pressed && styles.btnPressed]}
        >
          <Clock size={16} color={ThemeColors.textMid} strokeWidth={2} />
          <Text style={styles.remindText}>Not yet, remind me later</Text>
        </Pressable>
      </View>

      <View style={styles.predictionCard}>
        <View style={styles.predictionHeader}>
          <Target size={15} color={ThemeColors.lavender} strokeWidth={2} />
          <Text style={styles.predictionLabel}>Next period (estimate)</Text>
        </View>
        <Text style={styles.predictionDate}>{nextPeriodLabel ?? '—'}</Text>
        <Text style={styles.predictionSub}>{cycleHint}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream, paddingHorizontal: 24 },

  heroSection: { alignItems: 'center', paddingVertical: 32 },
  heroCircleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: ThemeColors.pinkSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircleInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: ThemeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  title: { fontSize: 30, fontWeight: '800', color: ThemeColors.textDark, textAlign: 'center', marginBottom: 10 },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: ThemeColors.textMid,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 12,
  },

  actions: { gap: 12, marginBottom: 32 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ThemeColors.primary,
    height: 56,
    borderRadius: ThemeRadius.button,
  },
  confirmText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
  remindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ThemeColors.surface,
    height: 56,
    borderRadius: ThemeRadius.button,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
  },
  remindText: { fontSize: 16, fontWeight: '600', color: ThemeColors.textMid },
  btnPressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },

  predictionCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 20,
    gap: 4,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  predictionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  predictionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.lavender,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  predictionDate: { fontSize: 22, fontWeight: '800', color: ThemeColors.textDark },
  predictionSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid, marginTop: 2 },
})
