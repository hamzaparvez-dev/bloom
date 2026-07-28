import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants';

interface GoalChipProps {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function GoalChip({ icon, label, selected, onPress }: GoalChipProps) {
  const Icon = icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Icon size={20} color={Colors.dark} strokeWidth={2} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selected: {
    backgroundColor: Colors.pinkLight,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
  },
});
