import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../constants';

interface SummaryRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

export function SummaryRow({ icon, label, value }: SummaryRowProps) {
  const Icon = icon;

  return (
    <View style={styles.container}>
      <Icon size={18} color={Colors.muted} strokeWidth={2} />
      <View style={styles.textGroup}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 52,
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
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
});
