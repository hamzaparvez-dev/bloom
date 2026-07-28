import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants';

interface InputRowProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  placeholder?: string;
  onPress?: () => void;
}

export function InputRow({ icon, label, value, placeholder = 'Enter value', onPress }: InputRowProps) {
  const Icon = icon;
  const isEmpty = !value;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Icon size={18} color={Colors.muted} strokeWidth={2} />
      <View style={styles.textGroup}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, isEmpty && styles.placeholder]}>{isEmpty ? placeholder : value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 68,
    borderRadius: 16,
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
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  placeholder: {
    color: Colors.muted,
    fontWeight: '400',
  },
});
