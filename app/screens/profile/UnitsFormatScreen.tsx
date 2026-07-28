import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

interface OptionProps {
  label: string
  selected: boolean
  onSelect: () => void
  isLast?: boolean
}

function OptionRow({ label, selected, onSelect, isLast }: OptionProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [styles.opt, !isLast && styles.border, pressed && { opacity: 0.75 }]}
    >
      <Text style={styles.optLabel}>{label}</Text>
      {selected ? <Check size={20} color={ThemeColors.primary} strokeWidth={2.5} /> : null}
    </Pressable>
  )
}

export function UnitsFormatScreen() {
  const insets = useSafeAreaInsets()
  const [temp, setTemp] = useState<'c' | 'f'>('c')
  const [weight, setWeight] = useState<'kg' | 'lb'>('kg')
  const [dateFmt, setDateFmt] = useState<'mdy' | 'dmy'>('mdy')

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionLabel}>Temperature</Text>
      <View style={styles.card}>
        <OptionRow label="Celsius (°C)" selected={temp === 'c'} onSelect={() => setTemp('c')} />
        <OptionRow label="Fahrenheit (°F)" selected={temp === 'f'} onSelect={() => setTemp('f')} isLast />
      </View>

      <Text style={styles.sectionLabel}>Weight</Text>
      <View style={styles.card}>
        <OptionRow label="Kilograms (kg)" selected={weight === 'kg'} onSelect={() => setWeight('kg')} />
        <OptionRow label="Pounds (lb)" selected={weight === 'lb'} onSelect={() => setWeight('lb')} isLast />
      </View>

      <Text style={styles.sectionLabel}>Date format</Text>
      <View style={styles.card}>
        <OptionRow label="MM / DD / YYYY" selected={dateFmt === 'mdy'} onSelect={() => setDateFmt('mdy')} />
        <OptionRow label="DD / MM / YYYY" selected={dateFmt === 'dmy'} onSelect={() => setDateFmt('dmy')} isLast />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textLight,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
  },
  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
    marginBottom: 4,
  },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ThemeColors.border },
  optLabel: { fontSize: 16, fontWeight: '500', color: ThemeColors.textDark },
})
