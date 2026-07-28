import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../constants';

// ─── Ring geometry ────────────────────────────────────────────────────────────

const RING_SIZE = 180;
const STROKE_W = 10;
const RADIUS = (RING_SIZE - STROKE_W) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Target: reach 100% in ~2.5 s  →  interval = 2500 / 100 = 25 ms per step
const STEP_MS = 25;

// ─── Screen ───────────────────────────────────────────────────────────────────

interface CalendarPreparingScreenProps {
  onReady: () => void;
}

export function CalendarPreparingScreen({ onReady }: CalendarPreparingScreenProps) {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0); // 0 → 100
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // ── Increment progress every STEP_MS ms ──────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(id);
          return 100;
        }
        return prev + 1;
      });
    }, STEP_MS);

    return () => clearInterval(id);
  }, []);

  // ── Navigate once progress reaches 100 ───────────────────────────────────
  useEffect(() => {
    if (progress < 100) return;
    const timer = setTimeout(() => onReadyRef.current(), 300);
    return () => clearTimeout(timer);
  }, [progress]);

  // ── Derived SVG value ─────────────────────────────────────────────────────
  // strokeDashoffset = CIRCUMFERENCE at 0%, 0 at 100%
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      {/* Decorative background blobs */}
      <View style={styles.decor1} pointerEvents="none" />
      <View style={styles.decor2} pointerEvents="none" />

      {/* Title */}
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{'Preparing your\npersonal calendar...'}</Text>
      </View>

      {/* Circular progress ring */}
      <View style={styles.ringWrap}>
        {/* Grey track */}
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          style={styles.svgAbsolute}
        >
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={Colors.pinkSurface}
            strokeWidth={STROKE_W}
            fill="none"
          />
        </Svg>

        {/*
         * Pink progress arc — rotated -90° so the arc starts at 12 o'clock.
         * strokeDashoffset is a plain JS number derived from state, so it
         * re-renders synchronously on every setProgress call. No native
         * driver needed (SVG props cannot run on the native thread).
         */}
        <View style={[styles.svgAbsolute, styles.rotated]}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={Colors.pink}
              strokeWidth={STROKE_W}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
            />
          </Svg>
        </View>

        {/* Percentage label centred inside the ring */}
        <View style={styles.ringLabel}>
          <Text style={styles.ringPercent}>{progress}%</Text>
          <Text style={styles.ringSubtitle}>complete</Text>
        </View>
      </View>

      {/* Brand mark */}
      <View style={styles.footer}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>Powered by bloom</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  decor1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.pinkSurface,
    opacity: 0.6,
  },
  decor2: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.pinkSurface,
    opacity: 0.4,
  },

  titleWrap: {
    paddingHorizontal: 32,
    marginBottom: 52,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 34,
    textAlign: 'center',
  },

  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgAbsolute: {
    position: 'absolute',
  },
  // Rotate the progress SVG wrapper so the arc starts at the top (12 o'clock)
  rotated: {
    transform: [{ rotate: '-90deg' }],
  },

  ringLabel: {
    alignItems: 'center',
    gap: 4,
  },
  ringPercent: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -1,
  },
  ringSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.pink,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    letterSpacing: 0.3,
  },
});
