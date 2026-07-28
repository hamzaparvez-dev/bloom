import React, { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CigaretteOff, Dumbbell, Pill, Salad, Snowflake } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { TTC_GREEN, TTC_GREEN_BG } from './constants'
import { useAuth } from '../../providers/AuthProvider'
import {
  createDefaultTtcSignals,
  deriveEngagementTier,
  deriveTtcCycleContext,
  fetchTtcPersonalizationSignals,
  pickTopPartnerTips,
  type TtcPersonalizationSignals,
  type TtcTipModule,
} from '../../lib/ttc-personalization'

const ICONS: Record<string, LucideIcon> = {
  salad: Salad,
  dumbbell: Dumbbell,
  snow: Snowflake,
  cigarette: CigaretteOff,
  pill: Pill,
}

const TIP_BG: Record<string, string> = {
  salad: TTC_GREEN_BG,
  dumbbell: '#E8F4FC',
  snow: '#E0F2FE',
  cigarette: '#FEF2F2',
  pill: ThemeColors.orangeBg,
}

const TIP_FG: Record<string, string> = {
  salad: TTC_GREEN,
  dumbbell: ThemeColors.sky,
  snow: ThemeColors.sky,
  cigarette: '#DC2626',
  pill: ThemeColors.peach,
}

function partnerSubtitle(tier: string): string {
  if (tier === 'new') return 'Three ways your partner can help from day one'
  if (tier === 'inactive') return 'Three supportive moves worth revisiting together'
  return 'Most relevant for your fertile window and habits now'
}

export function PartnerHealthScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [signals, setSignals] = useState<TtcPersonalizationSignals | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) {
      setSignals(createDefaultTtcSignals())
      return
    }
    const next = await fetchTtcPersonalizationSignals(user.id)
    setSignals(next)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const s = signals ?? createDefaultTtcSignals()
  const ctx = useMemo(() => deriveTtcCycleContext(s), [s])
  const tips = useMemo(() => pickTopPartnerTips(s, ctx), [s, ctx])
  const tier = useMemo(() => deriveEngagementTier(s), [s])
  const sub = useMemo(() => partnerSubtitle(tier), [tier])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Partner health tips</Text>
      <Text style={styles.subtitle}>Share with your partner for better chances</Text>
      <Text style={styles.personalLine}>{sub}</Text>

      {tips.map((tip) => (
        <TipCard key={tip.title} tip={tip} />
      ))}
    </ScrollView>
  )
}

function TipCard({ tip }: { tip: TtcTipModule }) {
  const Icon = ICONS[tip.iconKey] ?? Salad
  const bg = TIP_BG[tip.iconKey] ?? TTC_GREEN_BG
  const fg = TIP_FG[tip.iconKey] ?? TTC_GREEN
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={[styles.iconWrap, { backgroundColor: ThemeColors.surface }]}>
        <Icon size={20} color={fg} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.cardTitle}>{tip.title}</Text>
        <Text style={styles.kicker}>Action</Text>
        <Text style={styles.cardAction}>{tip.action}</Text>
        <Text style={styles.kicker}>Why it matters</Text>
        <Text style={styles.cardWhy}>{tip.whyItMatters}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  subtitle: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginTop: 8, lineHeight: 22 },
  personalLine: { fontSize: 13, fontWeight: '600', color: TTC_GREEN, marginTop: 8, marginBottom: 16, lineHeight: 18 },

  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: ThemeRadius.card,
    gap: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: ThemeRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  body: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 8 },
  kicker: { fontSize: 11, fontWeight: '700', color: ThemeColors.textLight, letterSpacing: 0.6, marginTop: 4 },
  cardAction: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 20, marginTop: 2 },
  cardWhy: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 20, marginTop: 2 },
})
