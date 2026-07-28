import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  Brain,
  Check,
  Cloud,
  Flame,
  Frown,
  Heart,
  Smile,
  SmilePlus,
  Sparkles,
  Sun,
  ThermometerSun,
  Wind,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ThemeColors, ThemeRadius } from '../../constants/theme';
import { useAuth } from '../../providers/AuthProvider';
import { useCycleRefresh } from '../../context/cycle-refresh-context';
import { upsertDailyLog } from '../../lib/upsert-daily-log';

// ── Symptom data ──────────────────────────────────────────────────────────────

interface SymptomItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const PHYSICAL: SymptomItem[] = [
  { id: 'cramps', label: 'Cramps', icon: Zap },
  { id: 'headache', label: 'Headache', icon: Brain },
  { id: 'bloating', label: 'Bloating', icon: Wind },
  { id: 'backache', label: 'Backache', icon: Activity },
  { id: 'nausea', label: 'Nausea', icon: Cloud },
  { id: 'tender', label: 'Breast Tenderness', icon: Heart },
];

const MOOD: SymptomItem[] = [
  { id: 'happy', label: 'Happy', icon: Smile },
  { id: 'anxious', label: 'Anxious', icon: Flame },
  { id: 'irritable', label: 'Irritable', icon: Zap },
  { id: 'sad', label: 'Sad', icon: Frown },
  { id: 'calm', label: 'Calm', icon: SmilePlus },
  { id: 'energetic', label: 'Energetic', icon: Sun },
];

const OTHER: SymptomItem[] = [
  { id: 'spotting', label: 'Spotting', icon: Activity },
  { id: 'discharge', label: 'Discharge', icon: Cloud },
  { id: 'hotflash', label: 'Hot Flashes', icon: ThermometerSun },
  { id: 'insomnia', label: 'Insomnia', icon: Sparkles },
  { id: 'acne', label: 'Acne', icon: Flame },
  { id: 'cravings', label: 'Cravings', icon: Heart },
];

// ── SymptomChip ───────────────────────────────────────────────────────────────

function SymptomChip({
  item,
  selected,
  onToggle,
}: {
  item: SymptomItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Icon size={15} color={selected ? ThemeColors.white : ThemeColors.textMid} strokeWidth={2} />
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={2}>
        {item.label}
      </Text>
      {selected && (
        <View style={styles.chipCheck}>
          <Check size={10} color={ThemeColors.white} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: SymptomItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <SymptomChip
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

interface Props {
  onBack?: () => void;
  onSave?: (symptoms: string[]) => void;
}

export function SymptomPickerScreen({ onBack, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const { user } = useAuth();
  const { bumpCycleRefresh } = useCycleRefresh();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Symptoms</Text>
        <Text style={styles.subtitle}>
          Select everything you're experiencing today
        </Text>

        <Section title="Physical" items={PHYSICAL} selected={selected} onToggle={toggle} />
        <Section title="Mood" items={MOOD} selected={selected} onToggle={toggle} />
        <Section title="Other" items={OTHER} selected={selected} onToggle={toggle} />
      </ScrollView>

      {/* Save footer */}
      {selected.size > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 80 }]}>
          <Pressable
            onPress={() => {
              const list = Array.from(selected);
              if (onSave) {
                onSave(list);
                return;
              }
              if (!user?.id) {
                Alert.alert('Sign in required', 'Sign in to save symptoms.');
                return;
              }
              setSaving(true);
              void (async () => {
                const { error } = await upsertDailyLog({
                  userId: user.id,
                  symptoms: list,
                });
                setSaving(false);
                if (error) {
                  Alert.alert('Could not save', error.message);
                  return;
                }
                bumpCycleRefresh();
                Alert.alert('Saved', 'Your symptoms have been logged.', [
                  { text: 'OK', onPress: () => nav.goBack() },
                ]);
              })();
            }}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              saving && { opacity: 0.6 },
            ]}
          >
            <Check size={18} color={ThemeColors.white} strokeWidth={2.5} />
            <Text style={styles.saveText}>
              {saving ? 'Saving…' : `Save ${selected.size} symptom${selected.size !== 1 ? 's' : ''}`}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 4 },
  subtitle: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginBottom: 24 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: ThemeColors.textMid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chip: {
    width: '31%' as any,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: ThemeRadius.md,
    backgroundColor: ThemeColors.surface,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
    position: 'relative',
  },
  chipSelected: {
    backgroundColor: ThemeColors.primary,
    borderColor: ThemeColors.primary,
  },
  chipLabel: { fontSize: 12, fontWeight: '600', color: ThemeColors.textDark, flex: 1 },
  chipLabelSelected: { color: ThemeColors.white },
  chipCheck: { position: 'absolute', top: 4, right: 4 },

  footer: { paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: ThemeRadius.button,
    backgroundColor: ThemeColors.primary,
  },
  saveText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
});
