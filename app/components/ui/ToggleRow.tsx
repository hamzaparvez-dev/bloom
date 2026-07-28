import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants';

interface ToggleRowProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
}

export function ToggleRow({ icon, title, subtitle, enabled, onToggle }: ToggleRowProps) {
  const Icon = icon;

  return (
    <View style={styles.container}>
      <Icon size={20} color={Colors.dark} strokeWidth={2} />
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Pressable
        onPress={onToggle}
        style={[styles.toggle, enabled && styles.toggleActive]}
      >
        <View style={[styles.thumb, enabled && styles.thumbActive]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 76,
    borderRadius: 20,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    alignSelf: 'center',
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
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.pink,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
  },
  thumbActive: {
    alignSelf: 'flex-end',
  },
});
