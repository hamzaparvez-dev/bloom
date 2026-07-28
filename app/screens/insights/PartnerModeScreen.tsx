import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react-native'
import { formatISO } from 'date-fns'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'
import { useCycleRefresh } from '../../context/cycle-refresh-context'
import type { CyclePredictionsJson } from '../../lib/cycle-home-insight'
import {
  getPartnerSummary,
  getPartnerTips,
  partnerScreenCopy,
  summaryAccent,
  type PartnerTip,
} from '../../lib/partner-mode-retention'
import {
  loadPartnerScreenState,
  savePartnerScreenState,
  type PartnerScreenPersistedState,
  type TipInteractionRecord,
} from '../../lib/partner-screen-storage'
import { PrimaryLogButton } from '../../components/home/PrimaryLogButton'
import { PartnerTipCard, type PartnerTipCardVariant } from '../../components/partner/PartnerTipCard'

type Nav = NativeStackNavigationProp<MainStackParamList>

function parseCyclePredictionsRpc(raw: unknown): CyclePredictionsJson | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CyclePredictionsJson
    } catch {
      return null
    }
  }
  if (typeof raw === 'object') return raw as CyclePredictionsJson
  return null
}

function variantForTip(index: number, tip: PartnerTip): PartnerTipCardVariant {
  if (index === 0) return tip.priority === 'high' ? 'spotlight' : 'emphasis'
  if (tip.priority === 'medium') return 'emphasis'
  return 'subtle'
}

export function PartnerModeScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const { refreshKey } = useCycleRefresh()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pred, setPred] = useState<CyclePredictionsJson | null>(null)
  const [displayName, setDisplayName] = useState('your partner')
  const [persisted, setPersisted] = useState<PartnerScreenPersistedState | null>(null)
  const requestId = useRef(0)

  const persist = useCallback(async (next: PartnerScreenPersistedState) => {
    setPersisted(next)
    await savePartnerScreenState(next)
  }, [])

  const load = useCallback(async () => {
    const uid = user?.id
    const id = ++requestId.current
    if (!uid) {
      setPred(null)
      setDisplayName('your partner')
      setLoading(false)
      setError(null)
      const st = await loadPartnerScreenState()
      if (id === requestId.current) setPersisted(st)
      return
    }

    setLoading(true)
    setError(null)

    const [predRes, profileRes, local] = await Promise.all([
      supabase.rpc('get_cycle_predictions', { p_user_id: uid }),
      supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle(),
      loadPartnerScreenState(),
    ])

    if (id !== requestId.current) return

    if (predRes.error) {
      setError(predRes.error.message)
      setPred(null)
    } else {
      setPred(parseCyclePredictionsRpc(predRes.data))
    }

    const name = profileRes.data?.display_name?.trim()
    if (name) setDisplayName(name.split(' ')[0] ?? name)
    setPersisted(local)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const cycleLen = Math.max(1, Math.round(Number(pred?.average_length ?? 28)))
  const hasActiveCycle = pred != null && pred.current_cycle_day != null && pred.current_cycle_day >= 1
  const cycleDayRaw = pred?.current_cycle_day != null ? Math.round(Number(pred.current_cycle_day)) : null
  const cycleDayNum =
    hasActiveCycle && cycleDayRaw != null ? Math.min(cycleLen, Math.max(1, cycleDayRaw)) : null

  const summary = useMemo(() => getPartnerSummary({ cycleDay: cycleDayNum }), [cycleDayNum])
  const allTips = useMemo(() => getPartnerTips({ cycleDay: cycleDayNum }), [cycleDayNum])
  const accent = useMemo(() => summaryAccent(summary), [summary])

  const byTipId = persisted?.byTipId ?? {}

  const visibleTips = useMemo(() => {
    return allTips.filter((t) => {
      const r = byTipId[t.id]
      if (!r?.status) return true
      return false
    })
  }, [allTips, byTipId])

  const updateTip = useCallback(
    async (tipId: string, patch: Partial<TipInteractionRecord>) => {
      const base = await loadPartnerScreenState()
      const prev = base.byTipId[tipId] ?? {}
      const nextRecord: TipInteractionRecord = {
        ...prev,
        ...patch,
        at: formatISO(new Date()),
      }
      const next: PartnerScreenPersistedState = {
        ...base,
        byTipId: { ...base.byTipId, [tipId]: nextRecord },
      }
      await persist(next)
    },
    [persist],
  )

  const onTipDone = useCallback(
    (tipId: string) => void updateTip(tipId, { status: 'done' }),
    [updateTip],
  )

  const onTipDismiss = useCallback(
    (tipId: string) => void updateTip(tipId, { status: 'dismissed' }),
    [updateTip],
  )

  const toggleTipSaved = useCallback(
    async (tipId: string) => {
      const base = await loadPartnerScreenState()
      const cur = base.byTipId[tipId]?.saved === true
      const nextRecord: TipInteractionRecord = {
        ...base.byTipId[tipId],
        saved: !cur,
        at: formatISO(new Date()),
      }
      await persist({
        ...base,
        byTipId: { ...base.byTipId, [tipId]: nextRecord },
      })
    },
    [persist],
  )

  const onFeedback = useCallback(
    async (helpful: boolean) => {
      const base = await loadPartnerScreenState()
      await persist({ ...base, helpful })
    },
    [persist],
  )

  const supportLine = `${partnerScreenCopy.supportLinePrefix} ${displayName} today`

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{partnerScreenCopy.screenTitle}</Text>
      <Text style={styles.sub}>{supportLine}</Text>

      {loading && user?.id ? (
        <View style={styles.loader}>
          <ActivityIndicator color={ThemeColors.primary} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.phaseCard, { borderColor: accent.border }]}>
        <View style={[styles.phaseIcon, { backgroundColor: accent.iconBg }]}>
          <Sparkles size={26} color={accent.iconColor} strokeWidth={2} />
        </View>
        <View style={styles.phaseBody}>
          <Text style={styles.phaseTitle} numberOfLines={2}>
            {summary.title}
          </Text>
          <Text style={styles.phaseLine} numberOfLines={2}>
            {summary.subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.ctaCol}>
        <PrimaryLogButton
          title={partnerScreenCopy.primaryCta}
          subtitle=""
          onPress={() => navigation.navigate('CycleCalendar')}
        />
        <Pressable
          onPress={() => navigation.navigate('SymptomPicker')}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.88 }]}
        >
          <Text style={styles.secondaryBtnText}>{partnerScreenCopy.secondaryCta}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>{partnerScreenCopy.tipsSection}</Text>
      {visibleTips.length === 0 ? (
        <Text style={styles.emptyTips}>{partnerScreenCopy.tipsAllDone}</Text>
      ) : (
        visibleTips.map((tip, index) => (
          <PartnerTipCard
            key={tip.id}
            tip={tip}
            variant={variantForTip(index, tip)}
            saved={byTipId[tip.id]?.saved === true}
            onDone={() => onTipDone(tip.id)}
            onDismiss={() => onTipDismiss(tip.id)}
            onSave={() => void toggleTipSaved(tip.id)}
          />
        ))
      )}

      <View style={styles.feedbackBlock}>
        <Text style={styles.feedbackLabel}>{partnerScreenCopy.feedbackPrompt}</Text>
        <View style={styles.feedbackRow}>
          <Pressable
            onPress={() => void onFeedback(true)}
            style={({ pressed }) => [
              styles.thumbBtn,
              persisted?.helpful === true && styles.thumbOn,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityLabel="Yes, helpful"
          >
            <ThumbsUp size={22} color={persisted?.helpful === true ? ThemeColors.white : ThemeColors.textDark} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => void onFeedback(false)}
            style={({ pressed }) => [
              styles.thumbBtn,
              persisted?.helpful === false && styles.thumbOff,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityLabel="Not helpful"
          >
            <ThumbsDown size={22} color={persisted?.helpful === false ? ThemeColors.white : ThemeColors.textMid} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  sub: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginTop: 6, marginBottom: 16 },
  loader: { paddingVertical: 12, alignItems: 'center' },
  error: { color: '#C62828', fontSize: 14, marginBottom: 10 },

  phaseCard: {
    flexDirection: 'row',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    gap: 14,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  phaseIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseBody: { flex: 1 },
  phaseTitle: { fontSize: 17, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 4 },
  phaseLine: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid },

  ctaCol: { gap: 10, marginBottom: 20 },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: ThemeRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    backgroundColor: ThemeColors.surface,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },

  section: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 10 },
  emptyTips: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginBottom: 12 },

  feedbackBlock: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ThemeColors.border,
  },
  feedbackLabel: { fontSize: 15, fontWeight: '600', color: ThemeColors.textDark, marginBottom: 10 },
  feedbackRow: { flexDirection: 'row', gap: 12 },
  thumbBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ThemeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  thumbOn: { backgroundColor: ThemeColors.primary, borderColor: ThemeColors.primary },
  thumbOff: { backgroundColor: ThemeColors.textMid, borderColor: ThemeColors.textMid },
})
