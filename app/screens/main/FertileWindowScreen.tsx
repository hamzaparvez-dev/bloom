import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  Droplets,
  Egg,
  Heart,
  Sparkles,
  Thermometer,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ThemeColors, ThemeRadius } from '../../constants/theme';

// ── Info card data ────────────────────────────────────────────────────────────

interface InfoCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
}

const INFO_CARDS: InfoCardProps[] = [
  { icon: Egg, iconColor: ThemeColors.lavender, iconBg: '#F0EAFF', label: 'Ovulation Day', value: 'Day 13 (April 8)' },
  { icon: Heart, iconColor: ThemeColors.mint, iconBg: ThemeColors.greenBg, label: 'Conception Chance', value: 'High — 85%' },
  { icon: Thermometer, iconColor: ThemeColors.peach, iconBg: '#FFF2EC', label: 'Basal Temp', value: '36.6°C — Normal' },
  { icon: Droplets, iconColor: ThemeColors.sky, iconBg: '#E8F4FC', label: 'Cervical Mucus', value: 'Egg-white consistency' },
];

function InfoCard({ icon: Icon, iconColor, iconBg, label, value }: InfoCardProps) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

interface Props {
  onBack?: () => void;
}

export function FertileWindowScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroGlow}>
          <View style={styles.heroCircle}>
            <Sparkles size={44} color={ThemeColors.lavender} strokeWidth={1.6} />
          </View>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>You're in your{'\n'}Fertile Window!</Text>
      <View style={styles.daysBadge}>
        <CalendarDays size={14} color={ThemeColors.lavender} strokeWidth={2} />
        <Text style={styles.daysText}>Days 11–15 of your cycle</Text>
      </View>

      {/* Info cards */}
      <View style={styles.cardList}>
        {INFO_CARDS.map((card) => (
          <InfoCard key={card.label} {...card} />
        ))}
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Sparkles size={14} color={ThemeColors.primary} strokeWidth={2} />
        <Text style={styles.tipText}>
          This is the best time to conceive. Track your symptoms daily for the most accurate predictions.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  heroGlow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#EFEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ThemeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Title
  title: { fontSize: 30, fontWeight: '800', color: ThemeColors.textDark, lineHeight: 38, marginTop: 16, marginBottom: 8 },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0EAFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ThemeRadius.pill,
    marginBottom: 24,
  },
  daysText: { fontSize: 13, fontWeight: '600', color: ThemeColors.lavender },

  // Cards
  cardList: { gap: 10 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 18,
    gap: 14,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoBody: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid },
  infoValue: { fontSize: 17, fontWeight: '700', color: ThemeColors.textDark },

  // Tip
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: ThemeColors.pinkSurface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 14, fontWeight: '400', color: ThemeColors.textDark, lineHeight: 20 },
});
