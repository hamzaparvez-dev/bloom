import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { format, parseISO } from 'date-fns'
import { CheckCircle } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'

const BAR_WIDTH = 28
const BAR_GAP = 14
const CHART_HEIGHT = 130
const CHART_PADDING_TOP = 28
const CHART_MAX_BARS = 7

interface WeightRow {
  id: string
  date: string
  weight: number
  unit: string
}

function barHeight(value: number, minW: number, maxW: number): number {
  const span = Math.max(0.001, maxW - minW)
  const ratio = (value - minW) / span
  return Math.max(8, ratio * (CHART_HEIGHT - CHART_PADDING_TOP))
}

export function WeightTrackerScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [weightInput, setWeightInput] = useState('')
  const [rows, setRows] = useState<WeightRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('weight_entries')
      .select('id, date, weight, unit')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(30)

    if (error) {
      console.warn('[WeightTracker]', error.message)
      setRows([])
      setLoading(false)
      return
    }

    const mapped: WeightRow[] = (data ?? [])
      .map((r) => ({
        id: r.id,
        date: String(r.date),
        weight: Number(r.weight),
        unit: (r.unit as string) || 'kg',
      }))
      .filter((r) => Number.isFinite(r.weight))
    setRows(mapped)
    setLoading(false)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const chartSlice = useMemo(() => {
    const asc = [...rows].sort((a, b) => a.date.localeCompare(b.date))
    return asc.slice(-CHART_MAX_BARS)
  }, [rows])

  const latest = rows.length > 0 ? rows[0] : null
  const previous = rows.length > 1 ? rows[1] : null

  const { minW, maxW } = useMemo(() => {
    if (chartSlice.length === 0) return { minW: 50, maxW: 100 }
    const vals = chartSlice.map((r) => r.weight)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const pad = Math.max(1, (hi - lo) * 0.15)
    return { minW: lo - pad, maxW: hi + pad }
  }, [chartSlice])

  const chartWidth = Math.max(chartSlice.length, 1) * (BAR_WIDTH + BAR_GAP) - BAR_GAP + 40
  const svgHeight = CHART_HEIGHT + 32

  const deltaLabel = (() => {
    if (!latest || !previous) return null
    const d = latest.weight - previous.weight
    if (Math.abs(d) < 0.05) return 'Same as last entry'
    const sign = d > 0 ? '+' : ''
    return `${sign}${d.toFixed(1)} kg since ${format(parseISO(previous.date), 'MMM d')}`
  })()

  const save = () => {
    const uid = user?.id
    if (!uid) {
      Alert.alert('Sign in required', 'Sign in to log weight.')
      return
    }
    const w = parseFloat(weightInput.replace(',', '.').trim())
    if (!Number.isFinite(w) || w < 30 || w > 200) {
      Alert.alert('Invalid weight', 'Enter a weight between 30 and 200 kg.')
      return
    }

    const today = format(new Date(), 'yyyy-MM-dd')
    setSaving(true)
    void (async () => {
      const { data: existing } = await supabase
        .from('weight_entries')
        .select('id')
        .eq('user_id', uid)
        .eq('date', today)
        .maybeSingle()

      const { data: preg } = await supabase
        .from('pregnancies')
        .select('id')
        .eq('user_id', uid)
        .eq('is_active', true)
        .maybeSingle()

      const weightVal = Math.round(w * 10) / 10
      const pregnancyId = preg?.id ?? null

      const err = existing?.id
        ? (
            await supabase
              .from('weight_entries')
              .update({
                weight: weightVal,
                unit: 'kg',
                pregnancy_id: pregnancyId,
              })
              .eq('id', existing.id)
          ).error
        : (
            await supabase.from('weight_entries').insert({
              user_id: uid,
              pregnancy_id: pregnancyId,
              date: today,
              weight: weightVal,
              unit: 'kg',
            })
          ).error

      setSaving(false)
      if (err) {
        Alert.alert('Could not save', err.message)
        return
      }
      setWeightInput('')
      await load()
      Alert.alert('Saved', 'Weight logged for today.')
    })()
  }

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Latest entry</Text>
        <View style={styles.heroValueRow}>
          {loading ? (
            <ActivityIndicator color={ThemeColors.primary} />
          ) : (
            <>
              <Text style={styles.heroValue}>{latest ? latest.weight.toFixed(1) : '—'}</Text>
              <Text style={styles.heroUnit}>{latest?.unit ?? 'kg'}</Text>
            </>
          )}
        </View>
        {deltaLabel ? <Text style={styles.heroDelta}>{deltaLabel}</Text> : (
          <Text style={styles.heroDeltaMuted}>Log weight regularly to see trends</Text>
        )}
        <View style={styles.badge}>
          <CheckCircle size={14} color="#2D9A63" />
          <Text style={styles.badgeText}>Track with your care team</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress</Text>
        <View style={styles.chartContainer}>
          {loading ? (
            <ActivityIndicator style={{ paddingVertical: 40 }} color={ThemeColors.primary} />
          ) : chartSlice.length === 0 ? (
            <Text style={styles.helperText}>No weight data yet. Add your first entry below.</Text>
          ) : (
            <Svg width={chartWidth} height={svgHeight}>
              {chartSlice.map((bar, i) => {
                const x = 20 + i * (BAR_WIDTH + BAR_GAP)
                const h = barHeight(bar.weight, minW, maxW)
                const y = CHART_HEIGHT - h
                const isLast = i === chartSlice.length - 1
                const label = format(parseISO(bar.date), 'MMM d')
                return (
                  <React.Fragment key={bar.id}>
                    <Rect
                      x={x}
                      y={y}
                      width={BAR_WIDTH}
                      height={h}
                      rx={6}
                      fill={isLast ? ThemeColors.primary : ThemeColors.pinkSurface}
                    />
                    {isLast && (
                      <SvgText
                        x={x + BAR_WIDTH / 2}
                        y={y - 8}
                        fontSize={12}
                        fontWeight="700"
                        fill={ThemeColors.textDark}
                        textAnchor="middle"
                      >
                        {bar.weight.toFixed(1)}
                      </SvgText>
                    )}
                    <SvgText
                      x={x + BAR_WIDTH / 2}
                      y={CHART_HEIGHT + 18}
                      fontSize={10}
                      fill={ThemeColors.textMid}
                      textAnchor="middle"
                    >
                      {label}
                    </SvgText>
                  </React.Fragment>
                )
              })}
            </Svg>
          )}
        </View>
        <Text style={styles.helperText}>Recommended range depends on your provider — discuss goals in appointments.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log weight</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter today's weight (kg)..."
          placeholderTextColor={ThemeColors.textLight}
          keyboardType="decimal-pad"
          value={weightInput}
          onChangeText={setWeightInput}
        />
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.85 },
            saving && { opacity: 0.65 },
          ]}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        {rows.length === 0 && !loading ? (
          <Text style={styles.helperText}>No history yet.</Text>
        ) : (
          rows.map((entry, i) => (
            <View
              key={entry.id}
              style={[styles.historyRow, i % 2 === 0 && styles.historyRowAlt]}
            >
              <Text style={styles.historyWeek}>{format(parseISO(entry.date), 'EEE')}</Text>
              <Text style={styles.historyDate}>{format(parseISO(entry.date), 'MMM d, yyyy')}</Text>
              <Text style={styles.historyWeight}>
                {entry.weight.toFixed(1)} {entry.unit}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ThemeColors.bgCream,
  },

  hero: {
    backgroundColor: ThemeColors.pinkSurface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: ThemeRadius.card,
    padding: 24,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: ThemeColors.textMid,
    marginBottom: 4,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minHeight: 56,
    justifyContent: 'center',
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  heroUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: ThemeColors.textMid,
    marginLeft: 6,
  },
  heroDelta: {
    fontSize: 14,
    fontWeight: '500',
    color: ThemeColors.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  heroDeltaMuted: {
    fontSize: 14,
    fontWeight: '400',
    color: ThemeColors.textMid,
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.mint + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ThemeRadius.pill,
    marginTop: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D9A63',
  },

  section: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ThemeColors.textDark,
    marginBottom: 14,
  },

  chartContainer: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    alignItems: 'center',
  },
  helperText: {
    fontSize: 13,
    fontWeight: '400',
    color: ThemeColors.textMid,
    textAlign: 'center',
    marginTop: 10,
  },

  input: {
    backgroundColor: ThemeColors.surface,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    borderRadius: ThemeRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: ThemeColors.textDark,
  },
  saveButton: {
    backgroundColor: ThemeColors.primary,
    borderRadius: ThemeRadius.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: ThemeColors.white,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: ThemeRadius.md,
  },
  historyRowAlt: {
    backgroundColor: ThemeColors.pinkSurface,
  },
  historyWeek: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  historyDate: {
    flex: 1.4,
    fontSize: 14,
    fontWeight: '400',
    color: ThemeColors.textMid,
    textAlign: 'center',
  },
  historyWeight: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
    textAlign: 'right',
  },
})
