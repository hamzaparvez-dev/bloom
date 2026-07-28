import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Circle } from 'react-native-svg'
import {
  BookOpen,
  ChevronRight,
  HeartHandshake,
  Leaf,
  PenLine,
  Settings,
  Stethoscope,
} from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { AIInsight } from '../../components/ui/AIInsight'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { useAuth } from '../../providers/AuthProvider'
import { TTC_GREEN, TTC_GREEN_BG, TTC_GREEN_DARK, TTC_GREEN_LIGHT } from './constants'
import {
  buildFertilityScoreInsight,
  buildResourceRows,
  buildTodayBlock,
  buildTodayStats,
  buildTtcFactsLine,
  buildTtcFactors,
  computeOverallFertilityScore,
  deriveEngagementTier,
  deriveProgressMessage,
  deriveHomeSubtitle,
  deriveTtcCycleContext,
  createDefaultTtcSignals,
  fetchTtcPersonalizationSignals,
  type TtcPersonalizationSignals,
  type TtcResourceRowModel,
} from '../../lib/ttc-personalization'

const RING_SIZE = 240
const RING_STROKE = 10
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_R

type Nav = NativeStackNavigationProp<MainStackParamList>

export function TTCHomeScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()
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
  const factors = useMemo(() => buildTtcFactors(s, ctx), [s, ctx])
  const overall = useMemo(() => computeOverallFertilityScore(factors), [factors])
  const insight = useMemo(() => buildFertilityScoreInsight(s, ctx, overall), [s, ctx, overall])
  const stats = useMemo(() => buildTodayStats(s, ctx), [s, ctx])
  const today = useMemo(() => buildTodayBlock(s, ctx), [s, ctx])
  const resourceRows = useMemo(() => buildResourceRows(s, ctx), [s, ctx])
  const progressMsg = useMemo(() => deriveProgressMessage(s), [s])
  const subtitle = useMemo(() => deriveHomeSubtitle(s, ctx), [s, ctx])
  const ttcFacts = useMemo(() => buildTtcFactsLine(s, ctx, overall), [s, ctx, overall])
  const engagement = useMemo(() => deriveEngagementTier(s), [s])

  const progress = overall / 100

  const goScore = useCallback(() => nav.navigate('FertilityScore'), [nav])
  const goLog = useCallback(() => nav.navigate('FertilityLog'), [nav])
  const goTips = useCallback(() => nav.navigate('ConceptionTips'), [nav])
  const goPartner = useCallback(() => nav.navigate('PartnerHealth'), [nav])
  const goJournal = useCallback(() => nav.navigate('TTCJournal'), [nav])
  const goReport = useCallback(() => nav.navigate('DoctorReport'), [nav])
  const goOvulation = useCallback(() => nav.navigate('OvulationLog'), [nav])
  const goNotif = useCallback(() => nav.navigate('NotifSettings'), [nav])

  const navForResource = useCallback(
    (key: TtcResourceRowModel['key']) => {
      if (key === 'tips') goTips()
      else if (key === 'partner') goPartner()
      else if (key === 'journal') goJournal()
      else if (key === 'report') goReport()
      else goScore()
    },
    [goJournal, goPartner, goReport, goScore, goTips],
  )

  const iconFor = useCallback((key: TtcResourceRowModel['key']) => {
    if (key === 'tips') return Leaf
    if (key === 'partner') return HeartHandshake
    if (key === 'journal') return PenLine
    if (key === 'report') return Stethoscope
    return BookOpen
  }, [])

  const iconStyleFor = useCallback((key: TtcResourceRowModel['key']) => {
    if (key === 'report') return { iconBg: '#F0EAFF' as const, iconColor: ThemeColors.lavender }
    if (key === 'score') return { iconBg: '#E8F4FC' as const, iconColor: ThemeColors.sky }
    return { iconBg: TTC_GREEN_BG, iconColor: TTC_GREEN }
  }, [])

  const aiFallback = useMemo(() => {
    if (engagement === 'new') return 'Welcome—one log today starts smarter timing suggestions.'
    if (engagement === 'inactive') return 'We saved your place—catch up on logs when you have two minutes.'
    return 'Your timing window looks stronger when OPK and mucus land on peak days—keep going.'
  }, [engagement])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Trying to Conceive</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable onPress={goScore} hitSlop={12} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.65 }]}>
          <Settings size={22} color={ThemeColors.textMid} strokeWidth={2} />
        </Pressable>
      </View>

      <AIInsight
        insightType="fertility"
        screenKey="ttc-home"
        fallbackText={aiFallback}
        factsLine={ttcFacts}
        style={{ marginBottom: ThemeSpacing['5'] }}
      />

      {progressMsg ?
        <View style={styles.progressBanner}>
          <Text style={styles.progressText}>{progressMsg}</Text>
        </View>
      : null}

      <Pressable onPress={goScore} style={({ pressed }) => [styles.ringSection, pressed && { opacity: 0.92 }]}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svgAbs}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={TTC_GREEN_LIGHT}
              strokeWidth={RING_STROKE}
              fill="none"
            />
          </Svg>
          <View style={[styles.svgAbs, { transform: [{ rotate: '-90deg' }] }]}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke={TTC_GREEN}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_CIRC}`}
                strokeDashoffset={RING_CIRC * (1 - progress)}
              />
            </Svg>
          </View>
          <View style={styles.ringCenter}>
            <Text style={styles.scoreNum}>{overall}</Text>
            <Text style={styles.scoreLabel}>FERTILITY SCORE</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{insight.badgeLabel}</Text>
        </View>
        <Text style={styles.scoreInterpret}>{insight.interpretation}</Text>
        <Text style={styles.actionLine}>{insight.actions[0]}</Text>
        {insight.actions[1] ? <Text style={styles.actionLine}>{insight.actions[1]}</Text> : null}
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{stats.chanceLabel}</Text>
          <Text style={styles.statLabel}>Today&apos;s chance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{stats.ovulationLabel}</Text>
          <Text style={styles.statLabel}>Ovulation est.</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{stats.bbtLabel}</Text>
          <Text style={styles.statLabel}>BBT</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>CONTRIBUTING FACTORS</Text>
      <View style={styles.factorsCard}>
        {factors.map((f) => (
          <View key={f.id} style={styles.factorBlock}>
            <View style={styles.factorTop}>
              <Text style={styles.factorLabel}>{f.label}</Text>
              <Text style={styles.factorPct}>{f.pct}%</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${f.pct}%`, backgroundColor: f.fill }]} />
            </View>
            <Text style={styles.factorExplain}>{f.explanation}</Text>
            <Text style={styles.factorNext}>{f.whatNext}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>TODAY</Text>
      <Text style={styles.todayTitle}>{today.title}</Text>
      <Text style={styles.todayBody}>{today.body}</Text>
      <View style={styles.todayLinkRow}>
        <Pressable onPress={goOvulation} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Text style={styles.linkCta}>Log intercourse timing</Text>
        </Pressable>
        <Text style={styles.linkSep}> · </Text>
        <Pressable onPress={goNotif} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Text style={styles.linkCta}>Set reminder</Text>
        </Pressable>
      </View>

      <Pressable onPress={goLog} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}>
        <Text style={styles.primaryBtnText}>{today.primaryCtaLabel}</Text>
      </Pressable>

      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>RESOURCES</Text>
      <View style={styles.resources}>
        {resourceRows.map((row, idx) => {
          const Icon = iconFor(row.key)
          const ic = iconStyleFor(row.key)
          return (
            <React.Fragment key={row.key}>
              {idx > 0 ? <View style={styles.resDivider} /> : null}
              <ResourceRow
                icon={Icon}
                iconBg={ic.iconBg}
                iconColor={ic.iconColor}
                title={row.title}
                subtitle={row.subtitle}
                onPress={() => navForResource(row.key)}
              />
            </React.Fragment>
          )
        })}
      </View>
    </ScrollView>
  )
}

function ResourceRow({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: typeof Leaf
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.resRow, pressed && { opacity: 0.72 }]}>
      <View style={[styles.resIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.resBody}>
        <Text style={styles.resTitle}>{title}</Text>
        <Text style={styles.resSub}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={ThemeColors.textLight} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  subtitle: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, marginTop: 4 },
  iconBtn: { padding: 8, marginTop: -4 },

  progressBanner: {
    backgroundColor: TTC_GREEN_BG,
    borderRadius: ThemeRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  progressText: { fontSize: 14, fontWeight: '500', color: TTC_GREEN_DARK, lineHeight: 20 },

  ringSection: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  svgAbs: { position: 'absolute' },
  ringCenter: { alignItems: 'center', gap: 6 },
  scoreNum: { fontSize: 56, fontWeight: '800', color: ThemeColors.textDark },
  scoreLabel: { fontSize: 11, fontWeight: '700', color: ThemeColors.textMid, letterSpacing: 1.2 },
  badge: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: ThemeRadius.pill,
    backgroundColor: TTC_GREEN_BG,
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: TTC_GREEN_DARK },
  scoreInterpret: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: ThemeColors.textDark,
    textAlign: 'center',
    paddingHorizontal: 8,
    lineHeight: 22,
  },
  actionLine: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '400',
    color: ThemeColors.textMid,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.lg,
    paddingVertical: 18,
    marginBottom: 28,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 17, fontWeight: '800', color: ThemeColors.textDark },
  statLabel: { fontSize: 11, fontWeight: '500', color: ThemeColors.textMid, textAlign: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: ThemeColors.border },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ThemeColors.textLight,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  factorsCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.lg,
    padding: 18,
    gap: 20,
    marginBottom: 28,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  factorBlock: { gap: 8 },
  factorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factorLabel: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark },
  factorPct: { fontSize: 14, fontWeight: '700', color: ThemeColors.textMid },
  barBg: { height: 6, borderRadius: 3, backgroundColor: ThemeColors.border, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  factorExplain: { fontSize: 12, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 18 },
  factorNext: { fontSize: 13, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 18 },

  todayTitle: { fontSize: 20, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 6 },
  todayBody: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22, marginBottom: 8 },
  todayLinkRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 },
  linkCta: { fontSize: 14, fontWeight: '600', color: ThemeColors.primary },
  linkSep: { fontSize: 14, color: ThemeColors.textLight },

  primaryBtn: {
    backgroundColor: ThemeColors.primary,
    borderRadius: ThemeRadius.button,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },

  resources: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  resRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  resIcon: { width: 40, height: 40, borderRadius: ThemeRadius.md, alignItems: 'center', justifyContent: 'center' },
  resBody: { flex: 1 },
  resTitle: { fontSize: 16, fontWeight: '600', color: ThemeColors.textDark },
  resSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid, marginTop: 2 },
  resDivider: { height: StyleSheet.hairlineWidth, backgroundColor: ThemeColors.border, marginLeft: 68 },
})
