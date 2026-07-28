import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Angry, Check, ChevronRight, Frown, Laugh, Meh, SmilePlus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme';
import { AIInsight } from '../../components/ui/AIInsight';
import { useAuth } from '../../providers/AuthProvider';
import { useCycleRefresh } from '../../context/cycle-refresh-context';
import { upsertDailyLog } from '../../lib/upsert-daily-log';
import { supabase } from '../../../supabaseClient';
import type { CyclePredictionsJson } from '../../lib/cycle-home-insight';
import {
  getCycleState,
  getNextEventFromDates,
  inferLastPeriodStartIso,
} from '../../lib/cycle-home-retention';
import {
  computeStreak,
  daysTrackedThisWeek,
  fetchLogDatesWithActivity,
} from '../../lib/daily-habit';
import {
  moodTrackerCardHead,
  moodTrackerCardLines,
  moodTrackerMicroSuggestion,
  moodTrackerRhythmPhase,
  moodTrackerSelectionInsight,
  normalizeHealthPriorities,
} from '../../lib/personalization';
import type { MainStackParamList } from '../../navigation/MainNavigator';

// ── Mood data ─────────────────────────────────────────────────────────────────

interface MoodOption {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const MOODS: MoodOption[] = [
  { id: 'happy', label: 'Happy', icon: Laugh, color: '#F5A623', bg: '#FFF8E8' },
  { id: 'neutral', label: 'Neutral', icon: Meh, color: ThemeColors.textMid, bg: '#F3F0F8' },
  { id: 'sad', label: 'Sad', icon: Frown, color: ThemeColors.sky, bg: '#E8F4FC' },
  { id: 'anxious', label: 'Anxious', icon: Angry, color: ThemeColors.peach, bg: '#FFF2EC' },
  { id: 'irritable', label: 'Irritable', icon: Angry, color: '#E05A5A', bg: '#FDEDED' },
  { id: 'calm', label: 'Calm', icon: SmilePlus, color: ThemeColors.mint, bg: ThemeColors.greenBg },
];

const INTENSITY_STEPS = ['Mild', 'Moderate', 'Strong', 'Intense'];

/** Maps UI mood ids to `public.mood_type` enum values. */
const MOOD_ID_TO_DB: Record<string, string> = {
  happy: 'happy',
  neutral: 'neutral',
  sad: 'low',
  anxious: 'anxious',
  irritable: 'irritable',
  calm: 'neutral',
};

const DB_MOOD_TO_UI: Record<string, string> = {
  happy: 'happy',
  neutral: 'neutral',
  low: 'sad',
  anxious: 'anxious',
  irritable: 'irritable',
};

const MAX_MOOD_PICKS = 2;
const AUTOSAVE_MS = 520;

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

function moodLabelById(id: string): string {
  return MOODS.find((m) => m.id === id)?.label ?? id;
}

function composeNotesForSave(userNote: string, selectedOrder: string[]): string | null {
  const parts: string[] = [];
  if (selectedOrder.length === 2) {
    const firstId = selectedOrder[0];
    const secondId = selectedOrder[1];
    const a = moodLabelById(firstId);
    const b = moodLabelById(secondId);
    parts.push(`Also noted: ${a} & ${b}.`);
  }
  const trimmed = userNote.trim();
  if (trimmed) parts.push(trimmed);
  const joined = parts.join(' ').trim();
  return joined.length > 0 ? joined : null;
}

// ── Screen ────────────────────────────────────────────────────────────────────

interface Props {
  onBack?: () => void;
  onSave?: (mood: string, intensity: number) => void;
}

type StackNav = NativeStackNavigationProp<MainStackParamList>;

export function MoodTrackerScreen({ onBack: _onBack, onSave }: Props) {
  void _onBack;
  const insets = useSafeAreaInsets();
  const nav = useNavigation<StackNav>();
  const { user } = useAuth();
  const { bumpCycleRefresh } = useCycleRefresh();

  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(1);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [pred, setPred] = useState<CyclePredictionsJson | null>(null);
  const [profileCycleLen, setProfileCycleLen] = useState<number | null>(null);
  const [healthGoalIds, setHealthGoalIds] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [daysWeek, setDaysWeek] = useState(0);

  const primaryMoodId = selectedOrder.length ? selectedOrder[selectedOrder.length - 1] : null;
  const rhythm = useMemo(() => {
    const cycleLenSetting = Math.max(1, Math.round(Number(profileCycleLen ?? pred?.average_length ?? 28)));
    const hasActiveCycle = pred != null && pred.current_cycle_day != null && pred.current_cycle_day >= 1;
    const cycleDayRaw = pred?.current_cycle_day != null ? Math.round(Number(pred.current_cycle_day)) : null;
    const cycleDayNum =
      hasActiveCycle && cycleDayRaw != null ? Math.min(cycleLenSetting, Math.max(1, cycleDayRaw)) : null;
    const lastPeriodIsoForState =
      cycleDayNum != null ? inferLastPeriodStartIso(cycleDayNum) : null;
    const cycleState = getCycleState({ lastPeriodDate: lastPeriodIsoForState, cycleLength: cycleLenSetting });
    return {
      cycleState,
      cycleDayNum,
      rhythmPhase: moodTrackerRhythmPhase(cycleState.state, cycleDayNum),
    };
  }, [pred, profileCycleLen]);

  const ovulationDaysAway = useMemo(() => {
    const block = getNextEventFromDates({
      nextOvulationIso: pred?.next_ovulation,
      nextPeriodIso: pred?.next_period,
    });
    if (block?.label !== 'Ovulation') return null;
    return block.days;
  }, [pred?.next_ovulation, pred?.next_period]);

  const cardHead = useMemo(
    () => moodTrackerCardHead(rhythm.cycleState.state, rhythm.cycleDayNum),
    [rhythm.cycleState.state, rhythm.cycleDayNum],
  );

  const { insight: cardInsight, action: cardAction } = useMemo(
    () =>
      moodTrackerCardLines({
        rhythm: rhythm.rhythmPhase,
        cycleDay: rhythm.cycleDayNum,
        ovulationDaysAway,
        healthGoalIds,
      }),
    [rhythm.rhythmPhase, rhythm.cycleDayNum, ovulationDaysAway, healthGoalIds],
  );

  const habitLine = useMemo(() => {
    if (streakDays >= 2) return `${streakDays} day streak`;
    return `${daysWeek} of 7 days logged this week`;
  }, [streakDays, daysWeek]);

  const selectionInsight = useMemo(() => {
    if (!primaryMoodId) return '';
    return moodTrackerSelectionInsight(primaryMoodId, rhythm.rhythmPhase);
  }, [primaryMoodId, rhythm.rhythmPhase]);

  const microSuggestion = useMemo(() => {
    if (!primaryMoodId) return '';
    return moodTrackerMicroSuggestion(primaryMoodId);
  }, [primaryMoodId]);

  const loadContext = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setPred(null);
      setProfileCycleLen(null);
      setHealthGoalIds([]);
      setStreakDays(0);
      setDaysWeek(0);
      return;
    }
    const [predRes, profileRes, settingsRes, habitDates] = await Promise.all([
      supabase.rpc('get_cycle_predictions', { p_user_id: userId }),
      supabase.from('profiles').select('health_priorities').eq('id', userId).maybeSingle(),
      supabase.from('user_settings').select('cycle_length').eq('user_id', userId).maybeSingle(),
      fetchLogDatesWithActivity(userId, 120),
    ]);
    if (predRes.error) setPred(null);
    else setPred(parseCyclePredictionsRpc(predRes.data));
    setHealthGoalIds(normalizeHealthPriorities(profileRes.data?.health_priorities));
    const cl = settingsRes.data?.cycle_length;
    setProfileCycleLen(typeof cl === 'number' && Number.isFinite(cl) ? cl : null);
    setStreakDays(computeStreak(habitDates));
    setDaysWeek(daysTrackedThisWeek(habitDates));
  }, [user?.id]);

  const loadTodayLog = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setHydrated(true);
      return;
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('daily_logs')
      .select('mood, notes')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    const moodDb = data?.mood != null ? String(data.mood) : null;
    const uiId = moodDb && DB_MOOD_TO_UI[moodDb] ? DB_MOOD_TO_UI[moodDb] : null;
    if (uiId) setSelectedOrder([uiId]);
    else setSelectedOrder([]);
    setNoteText(typeof data?.notes === 'string' ? data.notes : '');
    setDirty(false);
    setHydrated(true);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadContext();
      void loadTodayLog();
    }, [loadContext, loadTodayLog]),
  );

  const persistMood = useCallback(
    async (order: string[], intensityStep: number, notes: string) => {
      const primary = order.length ? order[order.length - 1] : null;
      if (!primary) return;
      const dbMood = MOOD_ID_TO_DB[primary];
      if (!dbMood) return;

      if (onSave) {
        onSave(primary, intensityStep);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
        return;
      }
      if (!user?.id) {
        return;
      }

      setSaving(true);
      const mergedNotes = composeNotesForSave(notes, order);
      const { error } = await upsertDailyLog({
        userId: user.id,
        mood: dbMood,
        notes: mergedNotes,
      });
      setSaving(false);
      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }
      bumpCycleRefresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    },
    [onSave, user?.id, bumpCycleRefresh],
  );

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated || !dirty) return;
    const primary = selectedOrder.length ? selectedOrder[selectedOrder.length - 1] : null;
    if (!primary) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistMood(selectedOrder, intensity, noteText);
    }, AUTOSAVE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [selectedOrder, intensity, hydrated, dirty, persistMood, noteText]);

  const toggleMood = useCallback((id: string) => {
    setDirty(true);
    setSelectedOrder((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_MOOD_PICKS) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const handleLogEnergy = useCallback(() => {
    nav.navigate('Tabs', { openLog: true });
  }, [nav]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How's your mood?</Text>
        <Text style={styles.subtitle}>Select your mood in 1 tap</Text>

        <Text style={styles.habitHint}>{habitLine}</Text>

        <AIInsight
          insightType="mood"
          screenKey="mood-tracker"
          fallbackText={cardInsight}
          fallbackAction={cardAction}
          factsLine="local-mood-card"
          fetchEnabled={false}
          headLabel={cardHead}
          headLabelUppercase={false}
          style={{ marginTop: ThemeSpacing['4'], marginBottom: ThemeSpacing['5'] }}
        />

        <View style={styles.moodGrid}>
          {MOODS.map((m) => {
            const isSelected = selectedOrder.includes(m.id);
            const Icon = m.icon;
            return (
              <Pressable
                key={m.id}
                onPress={() => toggleMood(m.id)}
                style={({ pressed }) => [
                  styles.moodCard,
                  isSelected && { borderColor: m.color, borderWidth: 2, backgroundColor: m.bg },
                  { transform: [{ scale: pressed && isSelected ? 1.02 : isSelected ? 1.04 : 1 }] },
                ]}
              >
                <View style={[styles.moodIconWrap, { backgroundColor: isSelected ? m.bg : ThemeColors.bgCream }]}>
                  <Icon size={28} color={m.color} strokeWidth={1.8} />
                </View>
                <Text style={[styles.moodLabel, isSelected && { color: m.color, fontWeight: '700' }]}>
                  {m.label}
                </Text>
                {isSelected ? (
                  <View style={[styles.moodBadge, { backgroundColor: m.color }]}>
                    <Check size={10} color={ThemeColors.white} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {primaryMoodId ? (
          <View style={styles.feedbackBlock}>
            <Text style={styles.feedbackInsight}>{selectionInsight}</Text>
            <Text style={styles.feedbackMicro}>{microSuggestion}</Text>
            {savedFlash || saving ? (
              <Text style={styles.savedLine}>{saving ? 'Saving…' : 'Saved for today'}</Text>
            ) : null}
            {!user?.id && !onSave ? (
              <Text style={styles.signInHint}>Sign in to save your mood to your account.</Text>
            ) : null}
          </View>
        ) : null}

        {primaryMoodId ? (
          <View style={styles.intensitySection}>
            <Text style={styles.intensityTitle}>Intensity</Text>
            <View style={styles.intensityTrack}>
              {INTENSITY_STEPS.map((step, idx) => {
                const isActive = idx <= intensity;
                return (
                  <Pressable
                    key={step}
                    onPress={() => {
                      setDirty(true);
                      setIntensity(idx);
                    }}
                    style={styles.intensityStep}
                  >
                    <View style={[styles.intensityDot, isActive && styles.intensityDotActive]} />
                    <Text style={[styles.intensityLabel, isActive && styles.intensityLabelActive]}>
                      {step}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.intensityBar}>
              <View
                style={[
                  styles.intensityFill,
                  { width: `${((intensity + 1) / INTENSITY_STEPS.length) * 100}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        {primaryMoodId ? (
          <Pressable
            onPress={handleLogEnergy}
            style={({ pressed }) => [styles.followUpRow, pressed && { opacity: 0.65 }]}
          >
            <Text style={styles.followUpText}>Log energy next</Text>
            <ChevronRight size={18} color={ThemeColors.lavender} strokeWidth={2} />
          </Pressable>
        ) : null}

        <View style={styles.promptCard}>
          <Text style={styles.noteLabel}>Add a quick note (optional)</Text>
          <RNTextInput
            style={styles.noteInput}
            placeholder="e.g. felt low in morning, better later"
            placeholderTextColor={ThemeColors.textLight}
            value={noteText}
            onChangeText={(t) => {
              setDirty(true);
              setNoteText(t);
            }}
            multiline
            maxLength={280}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 4 },
  subtitle: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginBottom: 8 },
  habitHint: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.lavender,
    marginBottom: 8,
  },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  moodCard: {
    width: '31%' as any,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: ThemeRadius.card,
    backgroundColor: ThemeColors.surface,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
    gap: 8,
    position: 'relative',
  },
  moodIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  moodLabel: { fontSize: 13, fontWeight: '600', color: ThemeColors.textDark },
  moodBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedbackBlock: { marginBottom: 16, gap: 6 },
  feedbackInsight: { fontSize: 15, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 22 },
  feedbackMicro: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, lineHeight: 19 },
  savedLine: { fontSize: 12, fontWeight: '600', color: ThemeColors.mint },
  signInHint: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid },

  intensitySection: { marginBottom: 24 },
  intensityTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 14 },
  intensityTrack: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  intensityStep: { alignItems: 'center', gap: 6 },
  intensityDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: ThemeColors.border },
  intensityDotActive: { backgroundColor: ThemeColors.lavender },
  intensityLabel: { fontSize: 11, fontWeight: '500', color: ThemeColors.textLight },
  intensityLabelActive: { color: ThemeColors.lavender, fontWeight: '700' },
  intensityBar: { height: 6, borderRadius: 3, backgroundColor: ThemeColors.border, overflow: 'hidden' },
  intensityFill: { height: 6, borderRadius: 3, backgroundColor: ThemeColors.lavender },

  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  followUpText: { fontSize: 15, fontWeight: '600', color: ThemeColors.lavender },

  promptCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: ThemeColors.lavender,
    gap: 8,
  },
  noteLabel: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark },
  noteInput: {
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textDark,
    minHeight: 80,
    padding: 0,
    lineHeight: 22,
  },
});
