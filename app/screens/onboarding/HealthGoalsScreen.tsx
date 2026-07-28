import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Activity, Apple, Moon, Pill, Target, HeartPulse } from 'lucide-react-native';
import { Colors } from '../../constants';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { GoalChip } from '../../components/ui/GoalChip';
import { Button } from '../../components/ui/Button';

const GOALS = [
  { id: 'periods', icon: Target, label: 'Track periods' },
  { id: 'nutrition', icon: Apple, label: 'Better nutrition' },
  { id: 'sleep', icon: Moon, label: 'Improve sleep' },
  { id: 'active', icon: Activity, label: 'Stay active' },
  { id: 'stress', icon: HeartPulse, label: 'Reduce stress' },
  { id: 'meds', icon: Pill, label: 'Med reminders' },
];

interface HealthGoalsScreenProps {
  onContinue: (goals: string[]) => void;
}

export function HealthGoalsScreen({ onContinue }: HealthGoalsScreenProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.title}>Your health goals</Text>
          <Text style={styles.subtitle}>We will tune tips and home shortcuts to what you pick.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <ProgressBar step={2} totalSteps={3} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.grid}>
          {GOALS.map((goal) => (
            <GoalChip
              key={goal.id}
              icon={goal.icon}
              label={goal.label}
              selected={selected.has(goal.id)}
              onPress={() => toggle(goal.id)}
            />
          ))}
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(500)} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={selected.size === 0 ? 'Continue without goals' : 'Save goals & continue →'}
          onPress={() => onContinue([...selected])}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.muted,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    justifyContent: 'center',
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
});
