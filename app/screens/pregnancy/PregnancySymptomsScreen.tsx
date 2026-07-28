import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Activity,
  CloudRain,
  Frown,
  Heart,
  Moon,
  Smile,
} from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

const PURPLE = '#8B5CF6'

interface SymptomItem {
  id: string
  name: string
  icon: React.ElementType
}

interface SymptomSection {
  title: string
  items: SymptomItem[]
}

const SECTIONS: SymptomSection[] = [
  {
    title: 'Common this week',
    items: [
      { id: 'nausea', name: 'Nausea', icon: CloudRain },
      { id: 'fatigue', name: 'Fatigue', icon: Moon },
      { id: 'back_pain', name: 'Back pain', icon: Activity },
    ],
  },
  {
    title: 'Emotional',
    items: [
      { id: 'content', name: 'Content', icon: Smile },
      { id: 'anxious', name: 'Anxious', icon: Frown },
    ],
  },
]

const DEFAULT_CHECKED = new Set(['nausea', 'fatigue', 'content'])

const DEFAULT_INTENSITY: Record<string, number> = {
  nausea: 1,
  fatigue: 2,
  back_pain: 0,
  content: 1,
  anxious: 0,
}

export function PregnancySymptomsScreen() {
  const insets = useSafeAreaInsets()
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(DEFAULT_CHECKED),
  )
  const [intensity, setIntensity] = useState<Record<string, number>>(
    () => ({ ...DEFAULT_INTENSITY }),
  )

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function cycleIntensity(id: string) {
    setIntensity(prev => ({
      ...prev,
      [id]: ((prev[id] ?? 0) + 1) % 3,
    }))
  }

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Symptoms</Text>
        <Text style={styles.subtitle}>Week 24 · Today</Text>
      </View>

      {/* ── Symptom Sections ── */}
      {SECTIONS.map(section => (
        <View key={section.title} style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, i) => {
              const isChecked = checked.has(item.id)
              const level = intensity[item.id] ?? 0
              const Icon = item.icon

              return (
                <View key={item.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <Pressable
                    style={styles.row}
                    onPress={() => toggleCheck(item.id)}
                  >
                    {/* Checkbox */}
                    <View
                      style={[
                        styles.checkbox,
                        isChecked && styles.checkboxChecked,
                      ]}
                    >
                      {isChecked && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>

                    {/* Icon + Name */}
                    <Icon
                      size={20}
                      color={isChecked ? PURPLE : ThemeColors.textLight}
                    />
                    <Text
                      style={[
                        styles.itemName,
                        isChecked && styles.itemNameActive,
                      ]}
                    >
                      {item.name}
                    </Text>

                    {/* Intensity Dots */}
                    <Pressable
                      style={styles.dotsRow}
                      onPress={e => {
                        e.stopPropagation()
                        cycleIntensity(item.id)
                      }}
                    >
                      {[0, 1, 2].map(dotIdx => (
                        <View
                          key={dotIdx}
                          style={[
                            styles.dot,
                            dotIdx <= level - 1
                              ? styles.dotFilled
                              : styles.dotEmpty,
                          ]}
                        />
                      ))}
                    </Pressable>
                  </Pressable>
                </View>
              )
            })}
          </View>
        </View>
      ))}

      {/* ── Kick Counter Strip ── */}
      <View style={styles.kickStrip}>
        <Heart size={22} color={ThemeColors.primary} />
        <View style={styles.kickTextBlock}>
          <Text style={styles.kickTitle}>Kick counter</Text>
          <Text style={styles.kickSubtitle}>7 kicks logged today</Text>
        </View>
        <Pressable hitSlop={8}>
          <Text style={styles.kickLink}>Log →</Text>
        </Pressable>
      </View>

      {/* ── Save Button ── */}
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.saveButtonText}>Save symptoms</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ThemeColors.bgCream,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textMid,
    marginTop: 4,
  },

  // ── Sections ──
  sectionBlock: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: ThemeColors.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: ThemeColors.border,
    marginHorizontal: 16,
  },

  // ── Symptom Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: ThemeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.white,
    marginTop: -1,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: ThemeColors.textMid,
  },
  itemNameActive: {
    color: ThemeColors.textDark,
    fontWeight: '600',
  },

  // ── Intensity Dots ──
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: PURPLE,
  },
  dotEmpty: {
    backgroundColor: ThemeColors.border,
  },

  // ── Kick Counter ──
  kickStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.pinkSurface,
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: ThemeRadius.card,
    padding: 16,
    gap: 12,
  },
  kickTextBlock: {
    flex: 1,
  },
  kickTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  kickSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: ThemeColors.textMid,
    marginTop: 2,
  },
  kickLink: {
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.primary,
  },

  // ── Save ──
  saveButton: {
    backgroundColor: ThemeColors.primary,
    borderRadius: ThemeRadius.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: ThemeColors.white,
  },
})
