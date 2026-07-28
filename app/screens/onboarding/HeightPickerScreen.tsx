import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../constants';
import { Button } from '../../components/ui/Button';

// ─── Ruler config ─────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');

const MIN_CM = 100;
const MAX_CM = 230;
const DEFAULT_CM = 167;
const TICK_W = 12; // px per cm — wide enough for comfortable scrolling

// Left/right padding so first and last tick can be centered
const RULER_SIDE_PAD = SCREEN_W / 2 - TICK_W / 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cmToFt(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}' ${inches === 0 ? '00' : String(inches).padStart(2, '0')}"`;
}

function offsetToCm(offsetX: number): number {
  return Math.max(MIN_CM, Math.min(MAX_CM, Math.round(offsetX / TICK_W) + MIN_CM));
}

function cmToOffset(cm: number): number {
  return (cm - MIN_CM) * TICK_W;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface HeightPickerScreenProps {
  onNext: (heightCm: number) => void;
}

export function HeightPickerScreen({ onNext }: HeightPickerScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [heightCm, setHeightCm] = useState(DEFAULT_CM);
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const didLayout = useRef(false);

  // Scroll to default position after layout (more reliable than contentOffset prop)
  const onLayout = useCallback(() => {
    if (!didLayout.current) {
      didLayout.current = true;
      scrollRef.current?.scrollTo({ x: cmToOffset(DEFAULT_CM), animated: false });
    }
  }, []);

  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const cm = offsetToCm(e.nativeEvent.contentOffset.x);
    setHeightCm(cm);
  }, []);

  const displayValue = unit === 'cm' ? `${heightCm}` : cmToFt(heightCm);
  const displayUnit = unit === 'cm' ? 'cm' : 'ft/in';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <Animated.View entering={FadeInDown.delay(80)} style={styles.header}>
        <View style={styles.unitToggle}>
          <Pressable
            onPress={() => setUnit('cm')}
            style={[styles.unitBtn, unit === 'cm' && styles.unitBtnActive]}
          >
            <Text style={[styles.unitTxt, unit === 'cm' && styles.unitTxtActive]}>CM</Text>
          </Pressable>
          <Pressable
            onPress={() => setUnit('ft')}
            style={[styles.unitBtn, unit === 'ft' && styles.unitBtnActive]}
          >
            <Text style={[styles.unitTxt, unit === 'ft' && styles.unitTxtActive]}>FT</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Title ── */}
      <Animated.View entering={FadeInDown.delay(140)} style={styles.titleWrap}>
        <Text style={styles.title}>Tell Us Your Height</Text>
        <Text style={styles.subtitle}>Scroll the ruler to set your height</Text>
      </Animated.View>

      {/* ── Value display ── */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.valueWrap}>
        <Text style={styles.valueNumber}>{displayValue}</Text>
        <Text style={styles.valueUnit}>{displayUnit}</Text>
      </Animated.View>

      {/* ── Ruler ── */}
      <View style={styles.rulerWrap} onLayout={onLayout}>

        {/* Fixed center indicator — sits above the ScrollView */}
        <View style={styles.indicatorLine} pointerEvents="none" />
        <View style={styles.indicatorDot} pointerEvents="none" />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_W}
          decelerationRate="fast"
          disableIntervalMomentum
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: RULER_SIDE_PAD }}
          onScroll={onScroll}
          onScrollEndDrag={onScroll}
          onMomentumScrollEnd={onScroll}
        >
          {Array.from({ length: MAX_CM - MIN_CM + 1 }, (_, i) => {
            const cm = MIN_CM + i;
            const isMajor = cm % 10 === 0;
            const isMed = cm % 5 === 0 && !isMajor;
            const isSelected = cm === heightCm;

            return (
              <View key={cm} style={[styles.tickWrap, { width: TICK_W }]}>
                <View
                  style={[
                    styles.tick,
                    isMajor ? styles.tickMajor : isMed ? styles.tickMed : styles.tickMinor,
                    isSelected && styles.tickSelected,
                  ]}
                />
                {isMajor && (
                  <Text style={[styles.tickLabel, isSelected && styles.tickLabelSelected]}>
                    {cm}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CTA ── */}
      <Animated.View
        entering={FadeInDown.delay(360)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <Button title="Continue" onPress={() => onNext(heightCm)} />
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const RULER_H = 100;
const INDICATOR_H = 64;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.pinkSurface,
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  unitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 17,
  },
  unitBtnActive: {
    backgroundColor: Colors.pink,
  },
  unitTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  unitTxtActive: {
    color: Colors.white,
  },

  // Title
  titleWrap: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.muted,
  },

  // Value
  valueWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  valueNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -2,
    lineHeight: 80,
  },
  valueUnit: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Ruler container
  rulerWrap: {
    height: RULER_H,
    position: 'relative',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },

  // Center indicator — fixed pink line + dot
  indicatorLine: {
    position: 'absolute',
    left: SCREEN_W / 2 - 1.5,
    top: 0,
    width: 3,
    height: INDICATOR_H,
    backgroundColor: Colors.pink,
    borderRadius: 2,
    zIndex: 10,
  },
  indicatorDot: {
    position: 'absolute',
    left: SCREEN_W / 2 - 7,
    top: INDICATOR_H - 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.pink,
    zIndex: 10,
  },

  // Tick marks
  tickWrap: {
    height: RULER_H,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  tick: {
    width: 2,
    borderRadius: 1,
    backgroundColor: Colors.border,
    marginTop: 8,
  },
  tickMinor: {
    height: 16,
  },
  tickMed: {
    height: 28,
    backgroundColor: '#C8BFDA',
  },
  tickMajor: {
    height: 44,
    width: 2.5,
    backgroundColor: Colors.muted,
  },
  tickSelected: {
    backgroundColor: Colors.pink,
    width: 3,
  },
  tickLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  tickLabelSelected: {
    color: Colors.pink,
  },

  // Footer
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
});
