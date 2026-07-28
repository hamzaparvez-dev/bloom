import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Plus } from 'lucide-react-native';
import { ThemeColors, ThemeRadius } from '../../constants/theme';

const PURPLE = '#8B5CF6';

interface CheckItem { id: string; label: string }

const FOR_YOU: CheckItem[] = [
  { id: 'id_insurance', label: 'ID & Insurance cards' },
  { id: 'birth_plan', label: 'Birth plan printout' },
  { id: 'robe', label: 'Comfortable robe' },
  { id: 'toiletries', label: 'Toiletries kit' },
  { id: 'snacks', label: 'Snacks & drinks' },
];

const FOR_BABY: CheckItem[] = [
  { id: 'outfit', label: 'Going-home outfit' },
  { id: 'carseat', label: 'Car seat (installed)' },
  { id: 'swaddle', label: 'Swaddle blankets x3' },
  { id: 'diapers', label: 'Newborn diapers' },
];

const INITIAL_CHECKED = new Set(['id_insurance', 'birth_plan', 'robe', 'outfit', 'carseat', 'swaddle']);

interface Props { onBack?: () => void }

export function HospitalBagScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState<Set<string>>(INITIAL_CHECKED);

  const total = FOR_YOU.length + FOR_BABY.length;
  const packed = checked.size;
  const pct = Math.round((packed / total) * 100);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Hospital Bag</Text>

      {/* Progress */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.progressText}>{packed} of {total} packed · {pct}%</Text>

      <View style={styles.divider} />

      {/* For you */}
      <SectionGroup title="For you" items={FOR_YOU} checked={checked} onToggle={toggle} />

      {/* For baby */}
      <SectionGroup title="For baby" items={FOR_BABY} checked={checked} onToggle={toggle} />

      {/* Add item */}
      <Pressable style={({ pressed }) => [styles.addCta, pressed && { opacity: 0.7 }]}>
        <Plus size={16} color={PURPLE} strokeWidth={2.5} />
        <Text style={styles.addText}>Add item</Text>
      </Pressable>
    </ScrollView>
  );
}

function SectionGroup({ title, items, checked, onToggle }: { title: string; items: CheckItem[]; checked: Set<string>; onToggle: (id: string) => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {items.map((item) => {
        const done = checked.has(item.id);
        return (
          <Pressable key={item.id} onPress={() => onToggle(item.id)} style={styles.itemRow}>
            <View style={[styles.checkbox, done && styles.checkboxDone]}>
              {done && <Check size={12} color={ThemeColors.white} strokeWidth={3} />}
            </View>
            <Text style={[styles.itemLabel, done && styles.itemLabelDone]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 16, textAlign: 'center' },

  progressTrack: { height: 8, borderRadius: 4, backgroundColor: ThemeColors.border, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: PURPLE },
  progressText: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, marginTop: 8, marginBottom: 8 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: ThemeColors.border, marginVertical: 8 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, backgroundColor: ThemeColors.pinkSurface, marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 4, marginTop: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid, textTransform: 'uppercase', letterSpacing: 0.3 },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ThemeColors.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: ThemeColors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: PURPLE, borderColor: PURPLE },
  itemLabel: { fontSize: 16, fontWeight: '500', color: ThemeColors.textDark },
  itemLabelDone: { textDecorationLine: 'line-through', color: ThemeColors.textLight },

  addCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: ThemeRadius.card, borderWidth: 1.5, borderColor: ThemeColors.border, borderStyle: 'dashed', marginTop: 16 },
  addText: { fontSize: 15, fontWeight: '600', color: PURPLE },
});
