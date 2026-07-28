import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'

const LENGTHS = ['26', '27', '28', '29', '30', '31', '32']

export function CycleSettingsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [cycleLen, setCycleLen] = useState('28')
  const [periodLen, setPeriodLen] = useState('5')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('cycle_length, period_length')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled || error) return
      if (data?.cycle_length != null) setCycleLen(String(data.cycle_length))
      if (data?.period_length != null) setPeriodLen(String(data.period_length))
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const persist = useCallback(
    async (cycle: string, period: string) => {
      if (!user?.id) return
      const { error } = await supabase
        .from('user_settings')
        .update({
          cycle_length: parseInt(cycle, 10),
          period_length: parseInt(period, 10),
        })
        .eq('user_id', user.id)
      if (error) Alert.alert('Could not save', error.message)
    },
    [user?.id],
  )

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionLabel}>Typical cycle length</Text>
      <View style={styles.chips}>
        {LENGTHS.map((d) => {
          const on = cycleLen === d
          return (
            <Pressable
              key={d}
              onPress={() => {
                setCycleLen(d)
                if (loaded) void persist(d, periodLen)
              }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{d} days</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={styles.sectionLabel}>Typical period length</Text>
      <View style={styles.chips}>
        {['4', '5', '6', '7'].map((d) => {
          const on = periodLen === d
          return (
            <Pressable
              key={d}
              onPress={() => {
                setPeriodLen(d)
                if (loaded) void persist(cycleLen, d)
              }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{d} days</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={styles.foot}>
        Bloom uses these defaults when predicting your next period. You can override any cycle by logging actual start
        dates.
      </Text>
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
    marginBottom: 10,
    marginTop: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: ThemeRadius.pill,
    backgroundColor: ThemeColors.surface,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  chipOn: { backgroundColor: ThemeColors.primary, borderColor: ThemeColors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textMid },
  chipTextOn: { color: ThemeColors.white },
  foot: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 21, marginTop: 8 },
})
