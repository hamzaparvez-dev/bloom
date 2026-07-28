import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Baby, Flower, Sprout } from 'lucide-react-native';
import { Colors } from '../../constants';
import { OptionRow } from '../../components/ui/OptionRow';
import { Button } from '../../components/ui/Button';

type Mode = 'cycle' | 'pregnant' | 'ttc';

const OPTIONS = [
  { id: 'cycle' as Mode, icon: Flower, iconBg: Colors.pinkLight, title: 'Track my cycle', subtitle: 'Period & ovulation tracking' },
  { id: 'pregnant' as Mode, icon: Baby, iconBg: Colors.purpleBg, title: "I'm pregnant!", subtitle: 'Pregnancy week by week' },
  { id: 'ttc' as Mode, icon: Sprout, iconBg: Colors.greenBg, title: 'Trying to conceive', subtitle: 'Fertility & conception tips' },
];

interface ModeSelectionScreenProps {
  onContinue: (mode: Mode) => void;
}

export function ModeSelectionScreen({ onContinue }: ModeSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Mode | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBg} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.title}>{'What describes\nyou right now?'}</Text>
          <Text style={styles.subtitle}>We'll personalize your experience</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.options}>
          {OPTIONS.map((opt) => (
            <OptionRow
              key={opt.id}
              icon={opt.icon}
              iconBg={opt.iconBg}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={selected === opt.id}
              onPress={() => setSelected(opt.id)}
            />
          ))}
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(400)} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Continue →" onPress={() => selected && onContinue(selected)} disabled={!selected} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: Colors.pinkSurface,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.muted,
    marginBottom: 24,
  },
  options: {
    gap: 12,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
});
