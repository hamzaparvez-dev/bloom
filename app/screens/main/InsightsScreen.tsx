import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Activity,
  Brain,
  ChevronRight,
  ClipboardList,
  HeartHandshake,
  Moon,
  Sparkles,
  Stethoscope,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { SimpleBarChart, type BarDatum } from '../../components/insights/InsightCharts';
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme';
import { AIInsight } from '../../components/ui/AIInsight';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../providers/AuthProvider';
import { useCycleRefresh } from '../../context/cycle-refresh-context';
import type { PersonalizedInsightType } from '../../lib/ai-personalized-insight-client';
import {
  buildDataDrivenKeyInsights,
  insightsPeriodHint,
  insightsPeriodLimit,
  normalizeHealthPriorities,
  sortExploreRowsByGoals,
} from '../../lib/personalization';

const PURPLE = '#8B5CF6';

const PERIODS = ['1M', '3M', '6M', '1Y'] as const;

/** S-36 — matches Figma trend bars (Sep–Apr) */
const CYCLE_BAR_DATA: BarDatum[] = [
  { id: 'demo-sep', label: 'Sep', value: 26 },
  { id: 'demo-oct', label: 'Oct', value: 27 },
  { id: 'demo-nov', label: 'Nov', value: 28 },
  { id: 'demo-dec', label: 'Dec', value: 25 },
  { id: 'demo-jan', label: 'Jan', value: 28 },
  { id: 'demo-feb', label: 'Feb', value: 29 },
  { id: 'demo-mar', label: 'Mar', value: 28 },
  { id: 'demo-apr', label: 'Apr', value: 27, topLabel: '28' },
];

const PHASE_LEGEND = [
  { label: 'Menstrual', color: ThemeColors.primary },
  { label: 'Follicular', color: '#10B981' },
  { label: 'Ovulation', color: PURPLE },
  { label: 'Luteal', color: ThemeColors.peach },
];

type Nav = NativeStackNavigationProp<MainStackParamList>;

type InsightSubRoute =
  | 'CycleAnalysis'
  | 'SymptomPatterns'
  | 'InsightMoodPatterns'
  | 'SleepEnergy'
  | 'Perimenopause'
  | 'PartnerMode';

interface ExploreRow {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  route: InsightSubRoute;
}

const EXPLORE: ExploreRow[] = [
  {
    title: 'Cycle analysis',
    subtitle: 'Length, regularity, last 6 cycles',
    icon: Activity,
    iconBg: ThemeColors.pinkSurface,
    iconColor: ThemeColors.primary,
    route: 'CycleAnalysis',
  },
  {
    title: 'Symptom patterns',
    subtitle: 'Heatmap & frequency',
    icon: ClipboardList,
    iconBg: '#F0EAFF',
    iconColor: PURPLE,
    route: 'SymptomPatterns',
  },
  {
    title: 'Mood patterns',
    subtitle: 'By day and cycle phase',
    icon: Sparkles,
    iconBg: ThemeColors.orangeBg,
    iconColor: ThemeColors.peach,
    route: 'InsightMoodPatterns',
  },
  {
    title: 'Sleep & energy',
    subtitle: 'Rest vs energy trends',
    icon: Moon,
    iconBg: '#E8F4FC',
    iconColor: ThemeColors.sky,
    route: 'SleepEnergy',
  },
  {
    title: 'Perimenopause',
    subtitle: 'Tracking for 45+',
    icon: Brain,
    iconBg: ThemeColors.border,
    iconColor: ThemeColors.textMid,
    route: 'Perimenopause',
  },
  {
    title: 'Partner view',
    subtitle: 'Support tips for today',
    icon: HeartHandshake,
    iconBg: ThemeColors.pinkSurface,
    iconColor: ThemeColors.primary,
    route: 'PartnerMode',
  },
];

interface AnalyticsHistoryRow {
  start_date?: string;
  length?: number;
  period_length?: number;
}

interface AnalyticsPayload {
  average_length?: number;
  variation?: number;
  regularity?: number;
  cycle_count?: number;
  history?: AnalyticsHistoryRow[];
}

export function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { refreshKey } = useCycleRefresh();
  const [periodIdx, setPeriodIdx] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avgLen, setAvgLen] = useState(28);
  const [chartData, setChartData] = useState<BarDatum[]>(CYCLE_BAR_DATA);
  const [trendLabel, setTrendLabel] = useState('↑ Regular');
  const [historyRows, setHistoryRows] = useState<AnalyticsHistoryRow[]>([]);
  const [regularityPct, setRegularityPct] = useState<number | null>(null);
  const [healthGoalIds, setHealthGoalIds] = useState<string[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const cycleLimit = insightsPeriodLimit(periodIdx);
      const [{ data, error: rpcError }, profileRes] = await Promise.all([
        supabase.rpc('get_cycle_analytics', {
          p_user_id: userId,
          p_limit: cycleLimit,
        }),
        supabase.from('profiles').select('health_priorities').eq('id', userId).maybeSingle(),
      ]);
      if (cancelled || id !== requestId.current) return;
      if (profileRes.data?.health_priorities != null) {
        setHealthGoalIds(normalizeHealthPriorities(profileRes.data.health_priorities));
      }
      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }
      const payload = data as AnalyticsPayload | null;
      if (payload?.average_length != null) setAvgLen(Math.round(Number(payload.average_length)));

      const hist = Array.isArray(payload?.history) ? payload!.history! : [];
      setHistoryRows(hist);
      const regVal = payload?.regularity;
      setRegularityPct(regVal != null && Number.isFinite(Number(regVal)) ? Number(regVal) : null);
      if (regVal != null) {
        if (regVal >= 70) setTrendLabel('↑ Regular');
        else if (regVal >= 40) setTrendLabel('~ Variable');
        else setTrendLabel('↓ Irregular');
      }
      if (hist.length > 0) {
        const bars: BarDatum[] = hist.map((row, i) => {
          const len = row.length ?? 0;
          let label = String(i + 1);
          if (row.start_date) {
            try {
              label = format(parseISO(row.start_date), 'MMM');
            } catch {
              label = String(i + 1);
            }
          }
          const id = row.start_date ? `c-${row.start_date}` : `c-${i}`;
          return {
            id,
            label,
            value: len,
            topLabel: i === hist.length - 1 ? String(len) : undefined,
          };
        });
        setChartData(bars);
      } else {
        setChartData(CYCLE_BAR_DATA);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshKey, periodIdx]);

  const chartDisplay = useMemo(
    () => (chartData.length > 6 ? chartData.slice(-6) : chartData),
    [chartData],
  );

  const chartMax = Math.max(32, ...chartDisplay.map((d) => d.value));

  const insightsFacts = useMemo(
    () =>
      `avgCycleDays:${avgLen}; trend:${trendLabel}; recentLengths:${chartDisplay.map((d) => d.value).join(',')};health_priorities:${healthGoalIds.join(',')}`,
    [avgLen, trendLabel, chartDisplay, healthGoalIds],
  );

  const insightVariant = useMemo((): PersonalizedInsightType => {
    if (healthGoalIds.includes('sleep')) return 'sleep';
    if (healthGoalIds.includes('stress')) return 'mood';
    return 'fertility';
  }, [healthGoalIds]);

  const aiFallback = useMemo(() => {
    if (healthGoalIds.includes('sleep'))
      return 'Rest and cycle length often move together—keep sleep hours in your quick log.';
    if (healthGoalIds.includes('stress'))
      return 'Mood chips plus cycle timing help Bloom describe stress dips with more context.';
    return 'Your recent cycle lengths look steady—keep logging to tighten predictions.';
  }, [healthGoalIds]);

  const aiFallbackAction = useMemo(() => {
    if (healthGoalIds.includes('sleep')) return 'Open quick log and tap a sleep range tonight.';
    return 'Add one log from the Today tab.';
  }, [healthGoalIds]);

  const exploreRows = useMemo(() => sortExploreRowsByGoals(EXPLORE, healthGoalIds), [healthGoalIds]);

  const keyInsightBlocks = useMemo(
    () => buildDataDrivenKeyInsights(historyRows, avgLen, regularityPct, healthGoalIds),
    [historyRows, avgLen, regularityPct, healthGoalIds],
  );

  const goReport = useCallback(() => {
    nav.navigate('HealthReport', { detailLevel: 'full' });
  }, [nav]);

  const goExplore = useCallback(
    (route: ExploreRow['route']) => {
      nav.navigate(route);
    },
    [nav],
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Cycle &amp; health analytics</Text>
        </View>
      </View>

      <AIInsight
        insightType={insightVariant}
        screenKey="insights-home"
        fallbackText={aiFallback}
        fallbackAction={aiFallbackAction}
        factsLine={insightsFacts}
        style={{ marginBottom: ThemeSpacing['5'] }}
      />

      <View style={styles.segmentWrap}>
        <Text style={styles.periodHint}>{insightsPeriodHint(periodIdx)}</Text>
        <View style={styles.segment}>
          {PERIODS.map((p, i) => (
            <Pressable
              key={p}
              onPress={() => setPeriodIdx(i)}
              style={[styles.segChip, i === periodIdx && styles.segChipOn]}
            >
              <Text style={[styles.segText, i === periodIdx && styles.segTextOn]}>{p}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 16 }} color={ThemeColors.primary} />
      ) : (
        <>
          <View style={styles.heroRow}>
            <Text style={styles.heroNum}>{avgLen}</Text>
            <Text style={styles.heroUnit}>days avg</Text>
          </View>
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>{trendLabel}</Text>
          </View>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.chartBlock}>
        <SimpleBarChart
          title="Cycle length (days per cycle)"
          subtitle="Each bar is one completed cycle · scroll to see them all"
          contextLine="Newest cycles are on the right."
          data={chartDisplay}
          maxValue={chartMax}
          barColor={ThemeColors.primary}
          height={108}
          autoFooter
        />
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Key insights</Text>

      {keyInsightBlocks.map((block, bi) => (
        <View key={`${block.title}-${bi}`} style={styles.insightBlock}>
          <View style={styles.insightAccent} />
          <View style={styles.insightBody}>
            <Text style={styles.insightTitle}>{block.title}</Text>
            <Text style={styles.insightDesc}>{block.desc}</Text>
          </View>
        </View>
      ))}

      <Pressable onPress={goReport} style={({ pressed }) => [styles.reportLink, pressed && { opacity: 0.7 }]}>
        <Stethoscope size={18} color={ThemeColors.primary} strokeWidth={2} />
        <View style={styles.reportLinkText}>
          <Text style={styles.reportLinkTitle}>Full report</Text>
          <Text style={styles.reportLinkSub}>Export PDF for your doctor</Text>
        </View>
        <ChevronRight size={18} color={ThemeColors.textLight} strokeWidth={2} />
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Symptom phases</Text>
      <View style={styles.legendRow}>
        {PHASE_LEGEND.map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendLabel}>{l.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Explore</Text>
      <View style={styles.exploreCard}>
        {exploreRows.map((row, idx) => {
          const Icon = row.icon;
          const isLast = idx === EXPLORE.length - 1;
          return (
            <Pressable
              key={row.route}
              onPress={() => goExplore(row.route)}
              style={({ pressed }) => [
                styles.exploreRow,
                !isLast && styles.exploreRowBorder,
                pressed && { opacity: 0.72 },
              ]}
            >
              <View style={[styles.exIcon, { backgroundColor: row.iconBg }]}>
                <Icon size={18} color={row.iconColor} strokeWidth={2} />
              </View>
              <View style={styles.exBody}>
                <Text style={styles.exTitle}>{row.title}</Text>
                <Text style={styles.exSub}>{row.subtitle}</Text>
              </View>
              <ChevronRight size={18} color={ThemeColors.textLight} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  topRow: { marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  subtitle: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginTop: 6 },

  segmentWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  periodHint: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid },
  segment: { flexDirection: 'row', gap: 6 },
  segChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ThemeRadius.sm,
    backgroundColor: ThemeColors.surface,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  segChipOn: { backgroundColor: PURPLE, borderColor: PURPLE },
  segText: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid },
  segTextOn: { color: ThemeColors.white },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: ThemeColors.border, marginVertical: 20 },

  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroNum: { fontSize: 56, fontWeight: '800', color: ThemeColors.textDark },
  heroUnit: { fontSize: 16, fontWeight: '500', color: ThemeColors.textMid },
  trendBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: ThemeRadius.pill,
    backgroundColor: ThemeColors.greenBg,
  },
  trendText: { fontSize: 12, fontWeight: '700', color: ThemeColors.mint },

  chartBlock: { marginTop: 24 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: ThemeColors.textLight, letterSpacing: 0.6, marginBottom: 12 },

  insightBlock: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  insightAccent: { width: 4, borderRadius: 2, backgroundColor: PURPLE },
  insightBody: { flex: 1 },
  insightTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 6 },
  insightDesc: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 21 },

  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    marginBottom: 8,
  },
  reportLinkText: { flex: 1 },
  reportLinkTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.primary },
  reportLinkSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid, marginTop: 2 },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12, marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontWeight: '500', color: ThemeColors.textMid },

  exploreCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    marginBottom: 8,
  },
  exploreRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  exploreRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ThemeColors.border },
  exIcon: { width: 40, height: 40, borderRadius: ThemeRadius.md, alignItems: 'center', justifyContent: 'center' },
  exBody: { flex: 1 },
  exTitle: { fontSize: 16, fontWeight: '600', color: ThemeColors.textDark },
  exSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid, marginTop: 2 },

  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C62828',
    marginBottom: 8,
  },
});
