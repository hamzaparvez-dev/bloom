import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { CalendarDays, Flower2, RefreshCw } from 'lucide-react-native';
import { Colors } from '../../constants';
import { BloomLogoIcon } from '../../components/ui/BloomLogoIcon';
import { SummaryRow } from '../../components/ui/SummaryRow';
import { Button } from '../../components/ui/Button';

interface WelcomeSummaryScreenProps {
  onStart: () => void;
  ctaDisabled?: boolean;
}

export function WelcomeSummaryScreen({ onStart, ctaDisabled }: WelcomeSummaryScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgFill} pointerEvents="none" />

      {/* Decorative circles — plain View holds position, Animated.View only handles opacity */}
      <View style={styles.decorCircle1} pointerEvents="none">
        <Animated.View entering={FadeIn.delay(200)} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.decorCircle2} pointerEvents="none">
        <Animated.View entering={FadeIn.delay(300)} style={StyleSheet.absoluteFill} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(200)} style={styles.logoArea}>
          <BloomLogoIcon size={100} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>{'Here\'s a quick summary of\nyour profile:'}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.summaryRows}>
          <SummaryRow icon={Flower2} label="Mode" value="Period Tracker" />
          <SummaryRow icon={CalendarDays} label="Last Period" value="March 1, 2026" />
          <SummaryRow icon={RefreshCw} label="Cycle Length" value="28 days" />
          <SummaryRow icon={CalendarDays} label="Next Period" value="March 29, 2026" />
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(600)} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Save & continue" onPress={onStart} disabled={ctaDisabled} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bgDeep,
  },
  decorCircle1: {
    position: 'absolute',
    top: 80,
    left: 30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FCDDEA',
    opacity: 0.6,
  },
  decorCircle2: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.purple,
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 16,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  summaryRows: {
    gap: 8,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
});
