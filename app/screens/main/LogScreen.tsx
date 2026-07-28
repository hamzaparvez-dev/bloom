import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, subDays } from 'date-fns';
import { Check } from 'lucide-react-native';
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../providers/AuthProvider';
import { useCycleRefresh } from '../../context/cycle-refresh-context';
import { loadQuickLogPrefill, saveQuickLogPrefill } from '../../lib/quick-log';
import { syncHabitNudges } from '../../lib/habit-notifications';
import type { CyclePredictionsJson } from '../../lib/cycle-home-insight';
import {
  getCycleState,
  getNextEventFromDates,
  inferLastPeriodStartIso,
} from '../../lib/cycle-home-retention';
import {
  buildLogRhythmContext,
  buildPostSaveFeedback,
  chipMicroInsight,
  deriveSmartPrefillFromRecent,
  logNotesPlaceholder,
  logSectionEmphasis,
  quickModeSections,
  streakBadgeLine,
  todayContextHeader,
  type DailyLogPrefillRow,
  type LogRhythmContext,
  type LogSectionId,
  type PostSaveFeedback,
  type SectionEmphasis,
} from '../../lib/log-screen-personalization';
import { computeStreak, daysTrackedThisWeek, fetchLogDatesWithActivity } from '../../lib/daily-habit';

// ── Chip data ─────────────────────────────────────────────────────────────────

const FLOW_OPTIONS = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'] as const;
const SYMPTOM_OPTIONS = ['Cramps', 'Bloating', 'Headache', 'Backache', 'Nausea', 'Tender'] as const;
const MOOD_OPTIONS = ['Happy', 'Neutral', 'Low', 'Anxious', 'Irritable', 'Calm'] as const;
const ENERGY_OPTIONS = ['Low', 'Normal', 'High'] as const;

/** Matches `public.period_flow` enum (Postgres). */
type PeriodFlowDb = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

/** Matches `public.mood_type` enum — no `calm`; UI "Calm" maps to `neutral`. */
type MoodTypeDb = 'happy' | 'neutral' | 'low' | 'anxious' | 'irritable';

/** Matches `public.energy_level` enum. */
type EnergyLevelDb = 'low' | 'normal' | 'high';

const FLOW_LABEL_TO_DB: Record<(typeof FLOW_OPTIONS)[number], PeriodFlowDb> = {
  None: 'none',
  Spotting: 'spotting',
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
};

const FLOW_DB_TO_LABEL: Record<PeriodFlowDb, (typeof FLOW_OPTIONS)[number]> = {
  none: 'None',
  spotting: 'Spotting',
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

const MOOD_LABEL_TO_DB: Record<(typeof MOOD_OPTIONS)[number], MoodTypeDb> = {
  Happy: 'happy',
  Neutral: 'neutral',
  Low: 'low',
  Anxious: 'anxious',
  Irritable: 'irritable',
  Calm: 'neutral',
};

const MOOD_DB_TO_LABEL: Record<MoodTypeDb, (typeof MOOD_OPTIONS)[number]> = {
  happy: 'Happy',
  neutral: 'Neutral',
  low: 'Low',
  anxious: 'Anxious',
  irritable: 'Irritable',
};

const ENERGY_LABEL_TO_DB: Record<(typeof ENERGY_OPTIONS)[number], EnergyLevelDb> = {
  Low: 'low',
  Normal: 'normal',
  High: 'high',
};

const ENERGY_DB_TO_LABEL: Record<EnergyLevelDb, (typeof ENERGY_OPTIONS)[number]> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

const SYMPTOM_TO_DB: Record<(typeof SYMPTOM_OPTIONS)[number], string> = {
  Cramps: 'cramps',
  Bloating: 'bloating',
  Headache: 'headache',
  Backache: 'backache',
  Nausea: 'nausea',
  Tender: 'tender',
};

const DB_TO_SYMPTOM: Record<string, (typeof SYMPTOM_OPTIONS)[number]> = {
  cramps: 'Cramps',
  bloating: 'Bloating',
  headache: 'Headache',
  backache: 'Backache',
  nausea: 'Nausea',
  tender: 'Tender',
};

/**
 * `MainTabScreen` renders an absolute `TabBar` + elevated center FAB on top of `LogScreen`.
 * Padding must be **in addition to** `insets.bottom` so scroll + sheets clear the tab stack (not just the home indicator).
 */
const LOG_TAB_BAR_STACK_HEIGHT = 104;

function parseCyclePredictionsRpc(raw: unknown): CyclePredictionsJson | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CyclePredictionsJson;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as CyclePredictionsJson;
  return null;
}

function mapFlowToRpc(label: string | null): PeriodFlowDb | null {
  if (!label) return null;
  return FLOW_LABEL_TO_DB[label as (typeof FLOW_OPTIONS)[number]] ?? null;
}

function mapMoodToRpc(label: string | null): MoodTypeDb | null {
  if (!label) return null;
  return MOOD_LABEL_TO_DB[label as (typeof MOOD_OPTIONS)[number]] ?? null;
}

function mapEnergyToRpc(label: string | null): EnergyLevelDb | null {
  if (!label) return null;
  return ENERGY_LABEL_TO_DB[label as (typeof ENERGY_OPTIONS)[number]] ?? null;
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  dimmed,
  onPress,
}: {
  label: string;
  selected: boolean;
  dimmed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        dimmed && !selected && styles.chipDimmed,
        selected && styles.chipSelected,
        pressed && { opacity: 0.88 },
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SectionGroup({
  groupTitle,
  emphasis,
  children,
}: {
  groupTitle: string;
  emphasis: SectionEmphasis;
  children: React.ReactNode;
}) {
  const soft = emphasis === 'low';
  return (
    <View style={[styles.groupWrap, soft && styles.groupSoft]}>
      <Text style={styles.groupTitle}>{groupTitle}</Text>
      {children}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

interface LogScreenProps {
  onClose?: () => void;
  onSaved?: () => void;
}

export function LogScreen({ onClose, onSaved }: LogScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bumpCycleRefresh } = useCycleRefresh();
  const [flow, setFlow] = useState<(typeof FLOW_OPTIONS)[number] | null>(null);
  const [symptoms, setSymptoms] = useState<Set<(typeof SYMPTOM_OPTIONS)[number]>>(new Set());
  const [mood, setMood] = useState<(typeof MOOD_OPTIONS)[number] | null>(null);
  const [energy, setEnergy] = useState<(typeof ENERGY_OPTIONS)[number] | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);
  const [quickMode, setQuickMode] = useState(true);
  const [microInsight, setMicroInsight] = useState('');
  const [inlineSaveMsg, setInlineSaveMsg] = useState('');
  const [postSave, setPostSave] = useState<PostSaveFeedback | null>(null);

  const [pred, setPred] = useState<CyclePredictionsJson | null>(null);
  const [profileCycleLen, setProfileCycleLen] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [daysWeek, setDaysWeek] = useState(0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const logCtx: LogRhythmContext = useMemo(() => {
    const cycleLenSetting = Math.max(1, Math.round(Number(profileCycleLen ?? pred?.average_length ?? 28)));
    const hasActiveCycle = pred != null && pred.current_cycle_day != null && pred.current_cycle_day >= 1;
    const cycleDayRaw = pred?.current_cycle_day != null ? Math.round(Number(pred.current_cycle_day)) : null;
    const cycleDayNum =
      hasActiveCycle && cycleDayRaw != null ? Math.min(cycleLenSetting, Math.max(1, cycleDayRaw)) : null;
    const lastPeriodIsoForState = cycleDayNum != null ? inferLastPeriodStartIso(cycleDayNum) : null;
    const cycleStateRes = getCycleState({ lastPeriodDate: lastPeriodIsoForState, cycleLength: cycleLenSetting });
    const block = getNextEventFromDates({
      nextOvulationIso: pred?.next_ovulation,
      nextPeriodIso: pred?.next_period,
    });
    const ovulationDaysAway = block?.label === 'Ovulation' ? block.days : null;
    return buildLogRhythmContext({
      cycleState: cycleStateRes.state,
      cycleDay: cycleDayNum,
      ovulationDaysAway,
    });
  }, [pred, profileCycleLen]);

  const emphasis = useMemo(() => logSectionEmphasis(logCtx.rhythm), [logCtx.rhythm]);
  const contextHeadline = useMemo(() => todayContextHeader(logCtx), [logCtx]);
  const notesPlaceholder = useMemo(
    () => logNotesPlaceholder(logCtx, flow != null && flow !== 'None'),
    [logCtx, flow],
  );
  const quickSet = useMemo(() => quickModeSections(logCtx.rhythm), [logCtx.rhythm]);
  const streakLine = useMemo(() => streakBadgeLine(streakDays, daysWeek), [streakDays, daysWeek]);

  const sectionVisible = useCallback(
    (id: LogSectionId) => {
      if (!quickMode) return true;
      return quickSet.has(id);
    },
    [quickMode, quickSet],
  );

  const chipDim = useCallback(
    (id: LogSectionId) => {
      if (quickMode) return false;
      return emphasis[id] === 'low';
    },
    [quickMode, emphasis],
  );

  useFocusEffect(
    useCallback(() => {
      const uid = user?.id;
      if (!uid) {
        setFlow(null);
        setSymptoms(new Set());
        setMood(null);
        setEnergy(null);
        setNotes('');
        setPred(null);
        setProfileCycleLen(null);
        setStreakDays(0);
        setDaysWeek(0);
        setMicroInsight('');
        setPostSave(null);
        return;
      }

      let cancelled = false;
      setLoadingLog(true);
      setPostSave(null);
      setMicroInsight('');

      void (async () => {
        const fromRecent = format(subDays(new Date(), 5), 'yyyy-MM-dd');
        const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

        const [
          predRes,
          settingsRes,
          habitDates,
          { data, error },
          recentRes,
        ] = await Promise.all([
          supabase.rpc('get_cycle_predictions', { p_user_id: uid }),
          supabase.from('user_settings').select('cycle_length').eq('user_id', uid).maybeSingle(),
          fetchLogDatesWithActivity(uid, 120),
          supabase
            .from('daily_logs')
            .select('period_flow, symptoms, mood, energy, notes')
            .eq('user_id', uid)
            .eq('date', todayStr)
            .maybeSingle(),
          supabase
            .from('daily_logs')
            .select('period_flow, symptoms, mood, energy')
            .eq('user_id', uid)
            .gte('date', fromRecent)
            .lte('date', yesterdayStr)
            .order('date', { ascending: false }),
        ]);

        if (cancelled) return;

        setPred(predRes.error ? null : parseCyclePredictionsRpc(predRes.data));
        const cl = settingsRes.data?.cycle_length;
        setProfileCycleLen(typeof cl === 'number' && Number.isFinite(cl) ? cl : null);
        setStreakDays(computeStreak(habitDates));
        setDaysWeek(daysTrackedThisWeek(habitDates));

        setLoadingLog(false);

        if (error) {
          console.warn('[LogScreen] load daily_log', error.message);
          return;
        }

        if (!data) {
          setFlow(null);
          setSymptoms(new Set());
          setMood(null);
          setEnergy(null);
          setNotes('');
          setQuickMode(true);

          const recentRows = (recentRes.data ?? []) as DailyLogPrefillRow[];
          const smart = deriveSmartPrefillFromRecent(recentRows, {
            flowDbToLabel: (db) => (db in FLOW_DB_TO_LABEL ? FLOW_DB_TO_LABEL[db as PeriodFlowDb] : null),
            moodDbToLabel: (db) => (db in MOOD_DB_TO_LABEL ? MOOD_DB_TO_LABEL[db as MoodTypeDb] : null),
            energyDbToLabel: (db) => (db in ENERGY_DB_TO_LABEL ? ENERGY_DB_TO_LABEL[db as EnergyLevelDb] : null),
            dbToSymptomLabel: (db) => DB_TO_SYMPTOM[db] ?? null,
          });

          const yStr = yesterdayStr;
          const [{ data: yest }, prefill] = await Promise.all([
            supabase.from('daily_logs').select('mood, energy').eq('user_id', uid).eq('date', yStr).maybeSingle(),
            loadQuickLogPrefill(),
          ]);
          if (cancelled) return;

          if (smart.flowLabel) setFlow(smart.flowLabel as (typeof FLOW_OPTIONS)[number]);
          if (smart.moodLabel) setMood(smart.moodLabel as (typeof MOOD_OPTIONS)[number]);
          if (smart.energyLabel) setEnergy(smart.energyLabel as (typeof ENERGY_OPTIONS)[number]);
          if (smart.symptomLabels.length) {
            const next = new Set<(typeof SYMPTOM_OPTIONS)[number]>();
            for (const s of smart.symptomLabels) {
              const sym = s as (typeof SYMPTOM_OPTIONS)[number];
              if ((SYMPTOM_OPTIONS as readonly string[]).includes(sym)) next.add(sym);
            }
            if (next.size) setSymptoms(next);
          }

          let usedYesterdayOrLocal = false;
          const moodDb = yest?.mood != null ? String(yest.mood) : prefill?.mood ?? null;
          const energyDb = yest?.energy != null ? String(yest.energy) : prefill?.energy ?? null;
          if (moodDb && moodDb in MOOD_DB_TO_LABEL && !smart.moodLabel) {
            setMood(MOOD_DB_TO_LABEL[moodDb as MoodTypeDb]);
            usedYesterdayOrLocal = true;
          }
          if (energyDb && energyDb in ENERGY_DB_TO_LABEL && !smart.energyLabel) {
            setEnergy(ENERGY_DB_TO_LABEL[energyDb as EnergyLevelDb]);
            usedYesterdayOrLocal = true;
          }

          const usedSmart =
            !!smart.flowLabel ||
            !!smart.moodLabel ||
            !!smart.energyLabel ||
            smart.symptomLabels.length > 0;
          if (usedSmart || usedYesterdayOrLocal) {
            setMicroInsight('We prefilled likely picks — tap to confirm or adjust.');
          }
          return;
        }

        setQuickMode(false);

        const pf = data.period_flow as PeriodFlowDb | null;
        setFlow(pf && pf in FLOW_DB_TO_LABEL ? FLOW_DB_TO_LABEL[pf] : null);

        const nextSym = new Set<(typeof SYMPTOM_OPTIONS)[number]>();
        const rawSym = Array.isArray(data.symptoms) ? data.symptoms : [];
        for (const s of rawSym) {
          if (typeof s !== 'string') continue;
          const label = DB_TO_SYMPTOM[s.toLowerCase()];
          if (label) nextSym.add(label);
        }
        setSymptoms(nextSym);

        const m = data.mood as MoodTypeDb | null;
        setMood(m && m in MOOD_DB_TO_LABEL ? MOOD_DB_TO_LABEL[m] : null);

        const e = data.energy as EnergyLevelDb | null;
        setEnergy(e && e in ENERGY_DB_TO_LABEL ? ENERGY_DB_TO_LABEL[e] : null);

        setNotes(typeof data.notes === 'string' ? data.notes : '');
      })();

      return () => {
        cancelled = true;
      };
    }, [user?.id, todayStr]),
  );

  const toggleSymptom = useCallback((s: (typeof SYMPTOM_OPTIONS)[number]) => {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
    setMicroInsight(chipMicroInsight({ section: 'symptom', label: s, rhythm: logCtx.rhythm }));
  }, [logCtx.rhythm]);

  const handleDismissPostSave = useCallback(() => {
    setPostSave(null);
    onSaved?.();
    onClose?.();
  }, [onSaved, onClose]);

  const onSave = useCallback(() => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Sign in to save your log.');
      return;
    }
    setSaving(true);
    setInlineSaveMsg('Saving — updating your insights…');
    const date = format(new Date(), 'yyyy-MM-dd');
    const symptomList = Array.from(symptoms).map((x) => SYMPTOM_TO_DB[x]);
    void supabase
      .rpc('upsert_daily_log', {
        p_user_id: user.id,
        p_date: date,
        p_period_flow: mapFlowToRpc(flow),
        p_symptoms: symptomList,
        p_mood: mapMoodToRpc(mood),
        p_energy: mapEnergyToRpc(energy),
        p_bbt: null,
        p_cervical_mucus: null,
        p_sleep_hours: null,
        p_notes: notes.trim() || null,
      })
      .then(async ({ error: rpcError }) => {
        setSaving(false);
        if (rpcError) {
          setInlineSaveMsg('');
          Alert.alert('Could not save', rpcError.message);
          return;
        }
        bumpCycleRefresh();
        const moodDb = mapMoodToRpc(mood);
        const energyDb = mapEnergyToRpc(energy);
        void saveQuickLogPrefill({
          mood: moodDb,
          energy: energyDb,
          sleep_hours: null,
        });

        const [{ data: settings }, habitDates] = await Promise.all([
          supabase.from('user_settings').select('notifications_enabled').eq('user_id', user.id).maybeSingle(),
          fetchLogDatesWithActivity(user.id, 120),
        ]);
        void syncHabitNudges({
          loggedToday: true,
          notificationsEnabled: !!settings?.notifications_enabled,
        });

        const nextStreak = computeStreak(habitDates);
        const feedback = buildPostSaveFeedback({
          ctx: logCtx,
          streakDays: nextStreak,
          hadSymptoms: symptomList.length > 0,
          hadFlow: flow != null && flow !== 'None',
        });
        setInlineSaveMsg('Saved — your insights are fresher.');
        setPostSave(feedback);
        setTimeout(() => setInlineSaveMsg(''), 3200);
      });
  }, [
    user?.id,
    flow,
    symptoms,
    mood,
    energy,
    notes,
    bumpCycleRefresh,
    logCtx,
  ]);

  const bodyEmphasis: SectionEmphasis =
    emphasis.flow === 'high' || emphasis.symptoms === 'high'
      ? 'high'
      : emphasis.flow === 'low' && emphasis.symptoms === 'low'
        ? 'low'
        : 'mid';
  const mindEmphasis: SectionEmphasis =
    emphasis.mood === 'high' || emphasis.energy === 'high'
      ? 'high'
      : emphasis.mood === 'low' && emphasis.energy === 'low'
        ? 'low'
        : 'mid';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + ThemeSpacing['2'],
            paddingBottom: insets.bottom + LOG_TAB_BAR_STACK_HEIGHT,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Log today</Text>
        <Text style={styles.subtitle}>
          {format(new Date(), 'MMMM d, yyyy')} · {streakLine}
        </Text>

        <View style={styles.contextPill}>
          <Text style={styles.contextText}>{contextHeadline}</Text>
        </View>

        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>Log mode</Text>
          <View style={styles.modeToggle}>
            <Pressable
              onPress={() => setQuickMode(true)}
              style={({ pressed }) => [
                styles.modePill,
                quickMode && styles.modePillOn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.modePillText, quickMode && styles.modePillTextOn]}>Quick</Text>
            </Pressable>
            <Pressable
              onPress={() => setQuickMode(false)}
              style={({ pressed }) => [
                styles.modePill,
                !quickMode && styles.modePillOn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.modePillText, !quickMode && styles.modePillTextOn]}>Detailed</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.modeHint}>
          {quickMode ? 'Fewer sections — confirm what already fits you.' : 'Full log — every section available.'}
        </Text>

        {microInsight ? (
          <View style={styles.microBanner}>
            <Text style={styles.microBannerText}>{microInsight}</Text>
          </View>
        ) : null}

        <SectionGroup groupTitle="Body" emphasis={bodyEmphasis}>
          {sectionVisible('flow') ? (
            <>
              <Text style={[styles.sectionLabel, emphasis.flow === 'high' && styles.sectionLabelFocus]}>
                Period flow
              </Text>
              <View style={styles.chipRow}>
                {FLOW_OPTIONS.map((o) => (
                  <Chip
                    key={o}
                    label={o}
                    selected={flow === o}
                    dimmed={chipDim('flow')}
                    onPress={() => {
                      setFlow(o);
                      setMicroInsight(chipMicroInsight({ section: 'flow', label: o, rhythm: logCtx.rhythm }));
                    }}
                  />
                ))}
              </View>
            </>
          ) : null}

          {sectionVisible('symptoms') ? (
            <>
              <Text
                style={[
                  styles.sectionLabel,
                  styles.sectionLabelSpaced,
                  emphasis.symptoms === 'high' && styles.sectionLabelFocus,
                ]}
              >
                Symptoms
              </Text>
              <View style={styles.chipRow}>
                {SYMPTOM_OPTIONS.map((o) => (
                  <Chip
                    key={o}
                    label={o}
                    selected={symptoms.has(o)}
                    dimmed={chipDim('symptoms')}
                    onPress={() => toggleSymptom(o)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </SectionGroup>

        <SectionGroup groupTitle="Mind & energy" emphasis={mindEmphasis}>
          {sectionVisible('mood') ? (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, emphasis.mood === 'high' && styles.sectionLabelFocus]}>
                Mood
              </Text>
              <View style={styles.chipRow}>
                {MOOD_OPTIONS.map((o) => (
                  <Chip
                    key={o}
                    label={o}
                    selected={mood === o}
                    dimmed={chipDim('mood')}
                    onPress={() => {
                      setMood(o);
                      setMicroInsight(chipMicroInsight({ section: 'mood', label: o, rhythm: logCtx.rhythm }));
                    }}
                  />
                ))}
              </View>
            </>
          ) : null}

          {sectionVisible('energy') ? (
            <>
              <Text
                style={[
                  styles.sectionLabel,
                  styles.sectionLabelSpaced,
                  emphasis.energy === 'high' && styles.sectionLabelFocus,
                ]}
              >
                Energy
              </Text>
              <View style={styles.chipRow}>
                {ENERGY_OPTIONS.map((o) => (
                  <Chip
                    key={o}
                    label={o}
                    selected={energy === o}
                    dimmed={chipDim('energy')}
                    onPress={() => {
                      setEnergy(o);
                      setMicroInsight(chipMicroInsight({ section: 'energy', label: o, rhythm: logCtx.rhythm }));
                    }}
                  />
                ))}
              </View>
            </>
          ) : null}
        </SectionGroup>

        {sectionVisible('notes') ? (
          <>
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, emphasis.notes === 'high' && styles.sectionLabelFocus]}>
              Notes
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder={notesPlaceholder}
              placeholderTextColor={ThemeColors.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </>
        ) : null}
      </ScrollView>

      {!postSave ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + LOG_TAB_BAR_STACK_HEIGHT }]}>
          {inlineSaveMsg ? <Text style={styles.inlineSave}>{inlineSaveMsg}</Text> : null}
          <Button
            title={saving ? 'Saving…' : 'Save & update insights'}
            icon={<Check size={18} color={ThemeColors.white} strokeWidth={2.5} />}
            disabled={saving || loadingLog || !user?.id}
            onPress={onSave}
          />
        </View>
      ) : null}

      {postSave ? (
        <View style={[styles.postSaveOverlay, { paddingBottom: insets.bottom + LOG_TAB_BAR_STACK_HEIGHT }]}>
          <View style={styles.postSaveCard}>
            <Text style={styles.postSaveTitle}>Nice — here is what improved</Text>
            <Text style={styles.postSaveBody}>{postSave.cycleLine}</Text>
            <Text style={styles.postSaveBody}>{postSave.patternLine}</Text>
            <Text style={styles.postSaveAccent}>{postSave.reinforcement}</Text>
            <View style={styles.postSaveButtonWrap}>
              <Button title="Continue" onPress={handleDismissPostSave} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },

  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: ThemeSpacing['1'] },
  subtitle: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, marginBottom: ThemeSpacing['2'] },

  contextPill: {
    alignSelf: 'stretch',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    paddingVertical: ThemeSpacing['3'],
    paddingHorizontal: ThemeSpacing['4'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    marginBottom: ThemeSpacing['4'],
  },
  contextText: {
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
    lineHeight: 22,
  },

  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ThemeSpacing['2'],
  },
  modeLabel: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.pill,
    padding: ThemeSpacing['1'],
    gap: ThemeSpacing['1'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  modePill: {
    paddingVertical: ThemeSpacing['2'],
    paddingHorizontal: ThemeSpacing['4'],
    borderRadius: ThemeRadius.pill,
  },
  modePillOn: { backgroundColor: ThemeColors.primary },
  modePillText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textMid },
  modePillTextOn: { color: ThemeColors.white },
  modeHint: {
    fontSize: 13,
    fontWeight: '400',
    color: ThemeColors.textMid,
    marginBottom: ThemeSpacing['4'],
    lineHeight: 19,
  },

  microBanner: {
    backgroundColor: ThemeColors.pinkSurface,
    borderRadius: ThemeRadius.md,
    padding: ThemeSpacing['3'],
    marginBottom: ThemeSpacing['4'],
  },
  microBannerText: { fontSize: 13, fontWeight: '500', color: ThemeColors.textDark, lineHeight: 19 },

  groupWrap: {
    marginBottom: ThemeSpacing['6'],
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: ThemeSpacing['4'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  groupSoft: { opacity: 0.92 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.textLight,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: ThemeSpacing['3'],
  },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: ThemeSpacing['2'] },
  sectionLabelSpaced: { marginTop: ThemeSpacing['4'] },
  sectionLabelFocus: { color: ThemeColors.lavender },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: ThemeSpacing['2'] },

  chip: {
    paddingHorizontal: ThemeSpacing['4'],
    paddingVertical: ThemeSpacing['3'],
    borderRadius: ThemeRadius.pill,
    backgroundColor: ThemeColors.bgCream,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
  },
  chipDimmed: { opacity: 0.55 },
  chipSelected: {
    backgroundColor: ThemeColors.primary,
    borderColor: ThemeColors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: ThemeColors.textDark,
  },
  chipTextSelected: {
    color: ThemeColors.white,
  },

  notesInput: {
    backgroundColor: ThemeColors.bgCream,
    borderRadius: ThemeRadius.card,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    paddingHorizontal: ThemeSpacing['4'],
    paddingTop: ThemeSpacing['3'] + 2,
    paddingBottom: ThemeSpacing['3'] + 2,
    minHeight: 100,
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textDark,
    lineHeight: 22,
  },

  footer: { paddingTop: ThemeSpacing['3'], paddingHorizontal: ThemeSpacing.pagePad },
  inlineSave: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.mint,
    marginBottom: ThemeSpacing['2'],
    textAlign: 'center',
  },

  postSaveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 15, 46, 0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: ThemeSpacing.pagePad,
  },
  postSaveCard: {
    backgroundColor: ThemeColors.surface,
    borderTopLeftRadius: ThemeRadius.lg,
    borderTopRightRadius: ThemeRadius.lg,
    padding: ThemeSpacing['5'],
    gap: ThemeSpacing['3'],
  },
  postSaveTitle: { fontSize: 18, fontWeight: '700', color: ThemeColors.textDark },
  postSaveBody: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22 },
  postSaveAccent: { fontSize: 14, fontWeight: '600', color: ThemeColors.lavender, lineHeight: 20 },
  postSaveButtonWrap: { marginTop: ThemeSpacing['2'], marginBottom: ThemeSpacing['2'] },
});
