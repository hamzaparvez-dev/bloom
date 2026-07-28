import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Baby,
  Camera,
  ChevronRight,
  Gift,
  Heart,
  Plus,
  Star,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ThemeColors, ThemeRadius } from '../../constants/theme';

const PURPLE = '#8B5CF6';

interface Milestone {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  date: string;
  week: string;
  description: string;
}

const MILESTONES: Milestone[] = [
  { id: '1', icon: Heart, iconColor: ThemeColors.primary, iconBg: ThemeColors.pinkSurface, title: 'First heartbeat', date: 'Feb 10', week: '8 weeks', description: '168 bpm — I cried happy tears!' },
  { id: '2', icon: Star, iconColor: PURPLE, iconBg: '#F0EAFF', title: 'Anatomy scan', date: 'Mar 5', week: '12 weeks', description: 'Everything looks perfect. Baby waved!' },
  { id: '3', icon: Baby, iconColor: ThemeColors.peach, iconBg: '#FFF2EC', title: 'Felt first kick', date: 'Mar 28', week: '16 weeks', description: 'A tiny flutter — so magical.' },
  { id: '4', icon: Gift, iconColor: ThemeColors.primary, iconBg: ThemeColors.pinkSurface, title: 'Gender reveal!', date: 'Apr 1', week: '18 weeks', description: "It's a girl! We are overjoyed." },
  { id: '5', icon: Camera, iconColor: ThemeColors.lavender, iconBg: '#F0EAFF', title: 'Belly photo', date: 'Apr 6', week: '24 weeks', description: 'Growing so beautifully.' },
];

interface Props { onBack?: () => void }

export function MilestoneJournalScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Journey</Text>
        <Pressable style={styles.addBtn}>
          <Plus size={14} color={PURPLE} strokeWidth={2.5} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {/* Vertical line */}
        <View style={styles.timelineLine} />

        {MILESTONES.map((m, idx) => {
          const Icon = m.icon;
          return (
            <View key={m.id} style={styles.milestoneRow}>
              {/* Dot */}
              <View style={styles.dotWrap}>
                <View style={styles.dot} />
              </View>

              {/* Card */}
              <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: m.iconBg }]}>
                    <Icon size={18} color={m.iconColor} strokeWidth={2} />
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardTitle}>{m.title}</Text>
                    <Text style={styles.cardDate}>{m.date} · {m.week}</Text>
                  </View>
                  <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} />
                </View>
                <Text style={styles.cardDesc}>{m.description}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const DOT_SIZE = 16;
const DOT_LEFT = 28;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: ThemeRadius.pill, borderWidth: 1.5, borderColor: PURPLE },
  addText: { fontSize: 13, fontWeight: '700', color: PURPLE },

  timeline: { position: 'relative', paddingLeft: DOT_LEFT + DOT_SIZE + 12 },
  timelineLine: { position: 'absolute', left: DOT_LEFT + DOT_SIZE / 2 - 1, top: DOT_SIZE / 2, bottom: DOT_SIZE / 2, width: 2, backgroundColor: ThemeColors.border },

  milestoneRow: { marginBottom: 16, position: 'relative' },
  dotWrap: { position: 'absolute', left: -(DOT_SIZE + 12), top: 20 },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: PURPLE },

  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  cardDate: { fontSize: 12, fontWeight: '400', color: ThemeColors.textMid },
  cardDesc: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 20 },
});
