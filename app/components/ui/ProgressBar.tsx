import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants';

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export function ProgressBar({ step, totalSteps }: ProgressBarProps) {
  const progress = step / totalSteps;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.label}>Step {step} of {totalSteps}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
    gap: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.pink,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
  },
});
