import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { format, parseISO, subDays } from 'date-fns';
import { AlertCircle, Check, Thermometer } from 'lucide-react-native';
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme';
import { AIInsight } from '../../components/ui/AIInsight';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../providers/AuthProvider';
import { useCycleRefresh } from '../../context/cycle-refresh-context';
import { upsertDailyLog } from '../../lib/upsert-daily-log';

const CHART_H = 168;
const CHART_PAD_L = 42;
const CHART_PAD_T = 14;
const CHART_PAD_B = 28;
const BAR_W = 14;
const BAR_GAP = 10;
const DAYS = 14;

const Y_MIN = 35.5;
const Y_MAX = 38.5;
const Y_RANGE = Y_MAX - Y_MIN;

interface BBTChartProps {
  values: (number | null)[];
  dayLabels: string[];
}

function BBTChart({ values, dayLabels }: BBTChartProps) {
  const { width: screenW } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const drawW = CHART_PAD_L + DAYS * (BAR_W + BAR_GAP) - BAR_GAP + 12;
  const drawH = CHART_H - CHART_PAD_B - CHART_PAD_T;
  const gridLines = useMemo(() => [Y_MIN, (Y_MIN + Y_MAX) / 2, Y_MAX], []);

  const stats = useMemo(() => {
    const pairs = values
      .map((v, i) => ({ v, i }))
      .filter((x): x is { v: number; i: number } => x.v != null && Number.isFinite(x.v));
    if (pairs.length === 0)
      return { peakI: -1, lowI: -1, hasAny: false, avg: 0, highV: 0, lowV: 0 };
    let peak = pairs[0];
    let low = pairs[0];
    let sum = 0;
    for (const p of pairs) {
      sum += p.v;
      if (p.v > peak.v) peak = p;
      if (p.v < low.v) low = p;
    }
    return {
      peakI: peak.i,
      lowI: low.i,
      hasAny: true,
      avg: sum / pairs.length,
      highV: peak.v,
      lowV: low.v,
    };
  }, [values]);

  function yPos(val: number) {
    return CHART_PAD_T + drawH - ((val - Y_MIN) / Y_RANGE) * drawH;
  }

  const onLayoutScroll = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, []);

  const innerMin = Math.max(screenW - 40, drawW);
  const summary = !stats.hasAny
    ? 'Log a few mornings in a row to see your average and range.'
    : `Avg ${stats.avg.toFixed(2)} °C · High ${stats.highV.toFixed(2)} · Low ${stats.lowV.toFixed(2)}`;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.bbtChartTitle}>BBT from your daily logs</Text>
      <Text style={styles.bbtChartSub}>
        Scroll for older days · warmest morning is outlined · coolest is softer
      </Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={onLayoutScroll}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 4 }}
      >
        <Svg width={Math.max(drawW, innerMin)} height={CHART_H}>
          {gridLines.map((v) => (
            <React.Fragment key={v}>
              <Line
                x1={CHART_PAD_L}
                y1={yPos(v)}
                x2={Math.max(drawW, innerMin) - 6}
                y2={yPos(v)}
                stroke={ThemeColors.border}
                strokeWidth={StyleSheet.hairlineWidth}
              />
              <SvgText x={4} y={yPos(v) + 4} fontSize={11} fill={ThemeColors.textMid}>
                {v.toFixed(1)}°
              </SvgText>
            </React.Fragment>
          ))}
          {values.map((val, idx) => {
            const x = CHART_PAD_L + idx * (BAR_W + BAR_GAP);
            const lab = dayLabels[idx] ?? String(idx + 1);
            if (val == null || !Number.isFinite(val)) {
              return (
                <SvgText
                  key={idx}
                  x={x + BAR_W / 2}
                  y={CHART_PAD_T + drawH / 2}
                  fontSize={10}
                  fill={ThemeColors.textLight}
                  textAnchor="middle"
                >
                  —
                </SvgText>
              );
            }
            const clamped = Math.min(Y_MAX, Math.max(Y_MIN, val));
            const barH = ((clamped - Y_MIN) / Y_RANGE) * drawH;
            const y = CHART_PAD_T + drawH - barH;
            const isLast = idx === values.length - 1;
            const isPeak = idx === stats.peakI && stats.hasAny && values.filter((v) => v != null).length > 1;
            const isLow = idx === stats.lowI && stats.lowI !== stats.peakI && stats.hasAny;
            const opacity = isPeak ? 1 : isLow ? 0.38 : isLast ? 0.9 : 0.62;
            return (
              <React.Fragment key={idx}>
                <Rect
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={Math.max(barH, 5)}
                  rx={6}
                  fill={ThemeColors.mint}
                  opacity={opacity}
                  stroke={isPeak ? '#15856D' : 'none'}
                  strokeWidth={isPeak ? 1.5 : 0}
                />
                <SvgText
                  x={x + BAR_W / 2}
                  y={CHART_PAD_T + drawH + 16}
                  fontSize={10}
                  fill={ThemeColors.textMid}
                  textAnchor="middle"
                >
                  {lab}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>
      <Text style={styles.bbtChartFoot}>{summary}</Text>
    </View>
  );
}

interface Props {
  onBack?: () => void;
}

export function BBTLogScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bumpCycleRefresh } = useCycleRefresh();
  const [tempValue, setTempValue] = useState('');
  const [editing, setEditing] = useState(false);
  const [chartValues, setChartValues] = useState<(number | null)[]>(() => Array(DAYS).fill(null));
  const [chartDayLabels, setChartDayLabels] = useState<string[]>(() =>
    Array.from({ length: DAYS }, (_, i) => String(i + 1)),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadChart = useCallback(async () => {
    const uid = user?.id;
    if (!uid) {
      setChartValues(Array(DAYS).fill(null));
      setChartDayLabels(Array.from({ length: DAYS }, (_, i) => String(i + 1)));
      setLoading(false);
      return;
    }
    setLoading(true);
    const end = new Date();
    const start = subDays(end, DAYS - 1);
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('daily_logs')
      .select('date, bbt')
      .eq('user_id', uid)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });

    if (error) {
      console.warn('[BBTLog]', error.message);
      setChartValues(Array(DAYS).fill(null));
      setChartDayLabels(Array.from({ length: DAYS }, (_, i) => String(i + 1)));
      setLoading(false);
      return;
    }

    const byDate = new Map<string, number>();
    for (const row of data ?? []) {
      if (row.date != null && row.bbt != null) {
        const n = Number(row.bbt);
        if (Number.isFinite(n)) byDate.set(String(row.date), n);
      }
    }

    const next: (number | null)[] = [];
    const labs: string[] = [];
    for (let i = 0; i < DAYS; i++) {
      const d = format(subDays(end, DAYS - 1 - i), 'yyyy-MM-dd');
      next.push(byDate.get(d) ?? null);
      try {
        labs.push(format(parseISO(`${d}T12:00:00`), 'EEE d'));
      } catch {
        labs.push(String(i + 1));
      }
    }
    setChartValues(next);
    setChartDayLabels(labs);

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayBbt = byDate.get(today);
    if (todayBbt != null) setTempValue(String(todayBbt));
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadChart();
    }, [loadChart]),
  );

  const saveReading = () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to log BBT.');
      return;
    }
    const raw = tempValue.replace(/°\s*c/gi, '').replace(',', '.').trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 33 || n > 40) {
      Alert.alert('Invalid temperature', 'Enter a basal temperature between 33 and 40 °C.');
      return;
    }
    setSaving(true);
    void (async () => {
      const { error } = await upsertDailyLog({
        userId: user.id,
        bbt: Math.round(n * 100) / 100,
        bbtSource: 'manual',
      });
      setSaving(false);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
      bumpCycleRefresh();
      setEditing(false);
      await loadChart();
      Alert.alert('Saved', 'BBT logged for today.');
    })();
  };

  const shiftHint = useMemo(() => {
    const lastNonNull = [...chartValues].reverse().find((v) => v != null);
    return (
      chartValues.filter((v) => v != null).length >= 3 &&
      lastNonNull != null &&
      chartValues[chartValues.length - 2] != null &&
      lastNonNull > (chartValues[chartValues.length - 2] as number) + 0.2
    );
  }, [chartValues]);

  const bbtFacts = useMemo(() => {
    const temps = chartValues.map((v) => (v == null ? '-' : String(v))).join(',');
    return `last${DAYS}DaysC:${temps}; riseHint:${shiftHint ? 'yes' : 'no'}`;
  }, [chartValues, shiftHint]);

  const bbtInsightFallback = useMemo(
    () =>
      shiftHint
        ? 'Your last few days show a gentle rise—keep the same wake time for cleaner readings.'
        : 'A steady morning routine makes BBT easier to read across your cycle.',
    [shiftHint],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Basal Body Temperature</Text>
        <Text style={styles.subtitle}>Track your BBT to predict ovulation</Text>

        <AIInsight
          insightType="fertility"
          screenKey="bbt-log"
          fallbackText={bbtInsightFallback}
          factsLine={bbtFacts}
          style={{ marginBottom: ThemeSpacing['5'] }}
        />

        {loading ? (
          <View style={styles.loadingChart}>
            <ActivityIndicator color={ThemeColors.mint} />
          </View>
        ) : (
          <BBTChart values={chartValues} dayLabels={chartDayLabels} />
        )}

        <Text style={styles.readingLabel}>Today's reading (°C)</Text>
        <Pressable
          onPress={() => setEditing(true)}
          style={[styles.readingCard, editing && styles.readingCardActive]}
        >
          <View style={styles.readingLeft}>
            <Thermometer size={20} color={ThemeColors.mint} strokeWidth={2} />
          </View>
          {editing ? (
            <TextInput
              style={styles.readingInput}
              value={tempValue}
              onChangeText={setTempValue}
              keyboardType="decimal-pad"
              autoFocus
              onBlur={() => setEditing(false)}
              selectTextOnFocus
              placeholder="36.65"
              placeholderTextColor={ThemeColors.textLight}
            />
          ) : (
            <View style={styles.readingBody}>
              <Text style={styles.readingValue}>{tempValue ? `${tempValue} °C` : 'Tap to enter'}</Text>
              <Text style={styles.readingHint}>Tap to edit</Text>
            </View>
          )}
        </Pressable>

        {shiftHint ? (
          <View style={styles.alertCard}>
            <AlertCircle size={16} color={ThemeColors.mint} strokeWidth={2} />
            <Text style={styles.alertText}>
              Recent readings show a rise — this can happen after ovulation. Keep logging daily for clearer
              patterns.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 80 }]}>
        <Pressable
          onPress={saveReading}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            saving && { opacity: 0.65 },
          ]}
        >
          <Check size={18} color={ThemeColors.white} strokeWidth={2.5} />
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Log Temperature'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 4 },
  subtitle: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginBottom: 20 },

  bbtChartTitle: { fontSize: 15, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 4 },
  bbtChartSub: { fontSize: 12, fontWeight: '500', color: ThemeColors.textMid, marginBottom: 8, lineHeight: 17 },
  bbtChartFoot: { fontSize: 12, fontWeight: '500', color: ThemeColors.textMid, marginTop: 12, lineHeight: 18 },

  loadingChart: {
    height: CHART_H + 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    marginBottom: 24,
  },

  chartCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },

  readingLabel: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 10 },
  readingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 20,
    gap: 14,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
  },
  readingCardActive: { borderColor: ThemeColors.mint },
  readingLeft: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ThemeColors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingBody: { flex: 1, gap: 2 },
  readingValue: { fontSize: 30, fontWeight: '800', color: ThemeColors.textDark, letterSpacing: -0.5 },
  readingHint: { fontSize: 13, fontWeight: '400', color: ThemeColors.textLight },
  readingInput: { flex: 1, fontSize: 30, fontWeight: '800', color: ThemeColors.textDark, padding: 0 },

  alertCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: ThemeColors.greenBg,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  alertText: { flex: 1, fontSize: 14, fontWeight: '500', color: ThemeColors.textDark, lineHeight: 20 },

  footer: { paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: ThemeRadius.button,
    backgroundColor: ThemeColors.mint,
  },
  saveText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
});
