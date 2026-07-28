import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants';

interface OptionRowProps {
  icon: LucideIcon;
  iconBg: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionRow({
  icon,
  iconBg,
  title,
  subtitle,
  selected,
  onPress,
}: OptionRowProps) {
  const Icon = icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected && styles.selectedContainer,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Icon size={20} color={Colors.dark} strokeWidth={2} />
      </View>
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {selected && (
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    alignSelf: 'center',
  },
  selectedContainer: {
    backgroundColor: Colors.pinkLight,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.muted,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
});
