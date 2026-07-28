import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format, parseISO } from 'date-fns'
import { Check, Droplets, Dumbbell, FlaskConical, Pill, Thermometer } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { AIInsight } from '../../components/ui/AIInsight'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'
import { TTC_GREEN, TTC_GREEN_BG, TTC_GREEN_DARK } from './constants'

interface LogRow {
  title: string
  value: string
  hint: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  done: boolean
}

const MUCUS_LABEL: Record<string, string> = {
  dry: 'Dry',
  sticky: 'Sticky',
  creamy: 'Creamy',
  watery: 'Watery',
  egg_white: 'Egg-white',
}

const OPK_LABEL: Record<string, string> = {
  negative: 'Negative',
  positive: 'Positive',
  unclear: 'Unclear',
}

export function FertilityLogScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [rows, setRows] = useState<LogRow[]>([])
  const [subtitle, setSubtitle] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const uid = user?.id
    const today = format(new Date(), 'yyyy-MM-dd')
    if (!uid) {
      setRows([])
      setSubtitle(`${format(new Date(), 'MMMM d, yyyy')}`)
      setLoading(false)
      return
    }
    setLoading(true)

    const [fdRes, actRes, predRes] = await Promise.all([
      supabase
        .from('fertility_data')
        .select('current_bbt, cervical_mucus, opk_result, score, level')
        .eq('user_id', uid)
        .eq('date', today)
        .maybeSingle(),
      supabase.from('ttc_actions').select('type, completed, value').eq('user_id', uid).eq('date', today),
      supabase.rpc('get_cycle_predictions', { p_user_id: uid }),
    ])

    let cycleDayLabel = ''
    const raw = predRes.data
    if (raw != null) {
      let obj: { current_cycle_day?: number } | null = null
      if (typeof raw === 'string') {
        try {
          obj = JSON.parse(raw) as { current_cycle_day?: number }
        } catch {
          obj = null
        }
      } else if (typeof raw === 'object') obj = raw as { current_cycle_day?: number }
      if (obj?.current_cycle_day != null) {
        cycleDayLabel = ` · Day ${Math.round(Number(obj.current_cycle_day))}`
      }
    }
    setSubtitle(`${format(parseISO(`${today}T12:00:00`), 'MMMM d, yyyy')}${cycleDayLabel}`)

    const fd = fdRes.data
    const actions = actRes.data ?? []

    const next: LogRow[] = []

    const bbtVal = fd?.current_bbt != null ? `${Number(fd.current_bbt).toFixed(2)}°C` : '—'
    const bbtDone = fd?.current_bbt != null
    next.push({
      title: 'Basal body temp',
      value: bbtVal,
      hint: bbtDone ? 'Logged today' : 'Log BBT on the BBT screen',
      icon: Thermometer,
      iconColor: TTC_GREEN_DARK,
      iconBg: TTC_GREEN_BG,
      done: bbtDone,
    })

    const mucusKey = fd?.cervical_mucus as string | undefined
    const mucusDone = !!mucusKey
    next.push({
      title: 'Cervical mucus',
      value: mucusKey ? MUCUS_LABEL[mucusKey] ?? mucusKey : '—',
      hint: mucusDone ? 'From today’s log' : 'Log mucus on the ovulation screen',
      icon: Droplets,
      iconColor: ThemeColors.sky,
      iconBg: '#E8F4FC',
      done: mucusDone,
    })

    const opkKey = fd?.opk_result as string | undefined
    const opkDone = !!opkKey
    next.push({
      title: 'OPK (LH test)',
      value: opkKey ? OPK_LABEL[opkKey] ?? opkKey : '—',
      hint: opkDone ? 'From today’s log' : 'Log OPK on the ovulation screen',
      icon: FlaskConical,
      iconColor: ThemeColors.peach,
      iconBg: ThemeColors.orangeBg,
      done: opkDone,
    })

    const vit = actions.find((a) => a.type === 'vitamins')
    const vitDone = !!vit?.completed
    next.push({
      title: 'Supplements',
      value: vit?.value?.trim() || (vitDone ? 'Logged' : '—'),
      hint: vitDone ? 'Marked in TTC checklist' : 'Complete vitamins in your TTC flow',
      icon: Pill,
      iconColor: ThemeColors.lavender,
      iconBg: '#F0EAFF',
      done: vitDone,
    })

    const ex = actions.find((a) => a.type === 'log')
    const exDone = !!ex?.completed && !!ex?.value?.trim()
    next.push({
      title: 'Exercise / movement',
      value: ex?.value?.trim() || '—',
      hint: exDone ? 'From TTC actions' : 'Optional — add in TTC checklist',
      icon: Dumbbell,
      iconColor: TTC_GREEN_DARK,
      iconBg: TTC_GREEN_BG,
      done: exDone,
    })

    if (fd?.score != null) {
      const lvl = fd.level ? String(fd.level) : ''
      next.unshift({
        title: 'Fertility snapshot',
        value: `${fd.score}/100${lvl ? ` · ${lvl}` : ''}`,
        hint: 'From your fertility data row',
        icon: FlaskConical,
        iconColor: ThemeColors.primary,
        iconBg: ThemeColors.pinkSurface,
        done: true,
      })
    }

    setRows(next)
    setLoading(false)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const logInsightFacts = useMemo(
    () => rows.map((r) => `${r.title}:${r.done ? 'done' : 'open'}`).join('; ').slice(0, 400),
    [rows],
  )

  const logInsightFallback = useMemo(() => {
    if (rows.length === 0) return 'Log a few signals today so Bloom can sharpen your fertile window.'
    const done = rows.filter((r) => r.done).length
    if (done >= Math.ceil(rows.length * 0.6)) return 'Nice work—most of today’s fertility signals are filled in.'
    return 'Finish today’s quick logs when you can—each detail helps timing feel less guessy.'
  }, [rows])

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator color={ThemeColors.primary} />
        </View>
      )
    }
    return rows.map((row) => {
      const Icon = row.icon
      return (
        <View key={row.title} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: row.iconBg }]}>
            <Icon size={20} color={row.iconColor} strokeWidth={2} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{row.title}</Text>
            <Text style={styles.cardValue}>{row.value}</Text>
            <View style={styles.hintRow}>
              <Text style={styles.cardHint}>{row.hint}</Text>
              {row.done ? <Check size={14} color={TTC_GREEN} strokeWidth={2.5} /> : null}
            </View>
          </View>
        </View>
      )
    })
  }, [loading, rows])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Today&apos;s fertility log</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {!loading && rows.length > 0 ?
        <AIInsight
          insightType="fertility"
          screenKey="fertility-log"
          fallbackText={logInsightFallback}
          factsLine={logInsightFacts}
          style={{ marginBottom: ThemeSpacing['5'] }}
        />
      : null}

      {content}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  loader: { paddingVertical: 40, alignItems: 'center' },

  title: { fontSize: 26, fontWeight: '800', color: ThemeColors.textDark },
  subtitle: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginTop: 6, marginBottom: 20 },

  card: {
    flexDirection: 'row',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.lg,
    padding: 18,
    gap: 16,
    marginBottom: 16,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: ThemeRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid, marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 6 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardHint: { fontSize: 13, fontWeight: '400', color: ThemeColors.textLight, flex: 1 },
})
