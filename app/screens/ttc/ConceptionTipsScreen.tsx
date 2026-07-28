import React, { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Apple, Ban, Clock, Leaf, Moon, PersonStanding } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { TTC_GREEN, TTC_GREEN_BG } from './constants'
import { useAuth } from '../../providers/AuthProvider'
import {
  createDefaultTtcSignals,
  deriveEngagementTier,
  deriveTtcCycleContext,
  fetchTtcPersonalizationSignals,
  pickTopConceptionTips,
  type TtcPersonalizationSignals,
  type TtcTipModule,
} from '../../lib/ttc-personalization'

const ICONS: Record<string, LucideIcon> = {
  clock: Clock,
  apple: Apple,
  person: PersonStanding,
  moon: Moon,
  ban: Ban,
}

const TIP_BG: Record<string, string> = {
  clock: TTC_GREEN_BG,
  apple: '#FEF9C3',
  person: '#E8F4FC',
  moon: '#F0EAFF',
  ban: ThemeColors.pinkSurface,
}

const TIP_FG: Record<string, string> = {
  clock: TTC_GREEN,
  apple: '#CA8A04',
  person: ThemeColors.sky,
  moon: ThemeColors.lavender,
  ban: ThemeColors.primary,
}

function tipSubtitle(tier: string): string {
  if (tier === 'new') return 'Three starter moves matched to where you are today'
  if (tier === 'inactive') return 'Three high-impact picks to ease back in'
  return 'Top picks for your cycle and goals this week'
}

export function ConceptionTipsScreen() {
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
  const tips = useMemo(() => pickTopConceptionTips(s, ctx), [s, ctx])
  const tier = useMemo(() => deriveEngagementTier(s), [s])
  const sub = useMemo(() => tipSubtitle(tier), [tier])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Leaf size={22} color={TTC_GREEN} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Conception tips</Text>
        <Text style={styles.subtitle}>Evidence-based fertility advice</Text>
        <Text style={styles.personalLine}>{sub}</Text>
      </View>

      {tips.map((tip) => (
        <TipCard key={tip.title} tip={tip} />
      ))}
    </ScrollView>
  )
}

function TipCard({ tip }: { tip: TtcTipModule }) {
  const Icon = ICONS[tip.iconKey] ?? Leaf
  const bg = TIP_BG[tip.iconKey] ?? TTC_GREEN_BG
  const fg = TIP_FG[tip.iconKey] ?? TTC_GREEN
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={[styles.cardIcon, { backgroundColor: ThemeColors.surface }]}>
        <Icon size={20} color={fg} strokeWidth={2} />
      </View>
      <View style={styles.cardBody}>
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

  hero: { marginBottom: 20 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: ThemeRadius.md,
    backgroundColor: TTC_GREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  subtitle: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginTop: 6, lineHeight: 22 },
  personalLine: { fontSize: 13, fontWeight: '600', color: TTC_GREEN, marginTop: 8, lineHeight: 18 },

  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: ThemeRadius.card,
    gap: 14,
    marginBottom: 12,
  },
  cardIcon: {
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
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 8 },
  kicker: { fontSize: 11, fontWeight: '700', color: ThemeColors.textLight, letterSpacing: 0.6, marginTop: 4 },
  cardAction: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 20, marginTop: 2 },
  cardWhy: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 20, marginTop: 2 },
})
