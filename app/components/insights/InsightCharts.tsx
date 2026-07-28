import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

const CARD_PAD_TOP = 20
const CARD_PAD_H = 16
const CARD_PAD_BOTTOM = 16
const BAR_SLOT = 44
const BAR_GAP = 8
const BAR_WIDTH = 28
const BAR_RADIUS = 8
const MAX_DEFAULT_VISIBLE = 7

export interface BarDatum {
  /** Stable key for list + press */
  id: string
  label: string
  value: number
  topLabel?: string
}

interface SimpleBarChartProps {
  data: BarDatum[]
  /** When omitted, derived from data (min 1). */
  maxValue?: number
  barColor: string
  trackColor?: string
  height?: number
  title: string
  subtitle?: string
  /** Extra line under title (context). */
  contextLine?: string
  /** When set, shown under chart. Otherwise `autoFooter` builds one line. */
  footerSummary?: string
  autoFooter?: boolean
}

function barKey(d: BarDatum, i: number): string {
  return d.id || `${d.label}-${i}`
}

function statsForBars(data: BarDatum[]) {
  const latestI = data.length > 0 ? data.length - 1 : -1
  const withIdx = data
    .map((d, i) => ({ i, v: d.value, label: d.label }))
    .filter((x) => x.v > 0)
  if (withIdx.length === 0) {
    return { avg: 0, peakI: -1, lowI: -1, latestI }
  }
  const sum = withIdx.reduce((a, x) => a + x.v, 0)
  const avg = sum / withIdx.length
  let peakI = withIdx[0].i
  let lowI = withIdx[0].i
  for (const x of withIdx) {
    if (x.v > data[peakI].value) peakI = x.i
    if (x.v < data[lowI].value) lowI = x.i
  }
  return { avg, peakI, lowI, latestI }
}

/** Bar row — scrolls horizontally when many points; highlights peak / low / latest. */
export function SimpleBarChart({
  data,
  maxValue: maxValueProp,
  barColor,
  trackColor = ThemeColors.border,
  height = 112,
  title,
  subtitle,
  contextLine,
  footerSummary,
  autoFooter,
}: SimpleBarChartProps) {
  const { width: screenW } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)
  const [picked, setPicked] = useState<{ label: string; value: number } | null>(null)

  const maxValue = useMemo(() => {
    if (maxValueProp != null && maxValueProp > 0) return maxValueProp
    const m = Math.max(1, ...data.map((d) => d.value))
    return m
  }, [data, maxValueProp])

  const { peakI, lowI, latestI, avg } = useMemo(() => statsForBars(data), [data])

  const plotWidth = useMemo(() => {
    const inner = data.length * (BAR_SLOT + BAR_GAP) - BAR_GAP
    return Math.max(inner, 1)
  }, [data.length])

  const footer = useMemo(() => {
    if (footerSummary) return footerSummary
    if (!autoFooter || data.length === 0) return null
    const has = data.some((d) => d.value > 0)
    if (!has) return 'Log a few days in a row to see your average and range.'
    const parts: string[] = [`Avg ${avg.toFixed(1)}`]
    if (peakI >= 0) parts.push(`Peak ${data[peakI].label}`)
    if (lowI >= 0 && lowI !== peakI) parts.push(`Low ${data[lowI].label}`)
    if (latestI >= 0 && latestI !== peakI && latestI !== lowI) parts.push(`Latest ${data[latestI].label}`)
    return parts.join(' · ')
  }, [autoFooter, avg, data, footerSummary, lowI, peakI, latestI])

  const onScroll = useCallback((_e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPicked(null)
  }, [])

  const onLayoutScroll = useCallback(
    (_e: LayoutChangeEvent) => {
      if (data.length > MAX_DEFAULT_VISIBLE) {
        scrollRef.current?.scrollToEnd({ animated: false })
      }
    },
    [data.length],
  )

  const chartInnerMin = Math.max(screenW - CARD_PAD_H * 2 - 8, plotWidth)

  return (
    <View style={chartStyles.card}>
      <Text style={chartStyles.chartTitle}>{title}</Text>
      {subtitle ? <Text style={chartStyles.subtitle}>{subtitle}</Text> : null}
      {contextLine ? <Text style={chartStyles.context}>{contextLine}</Text> : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={onLayoutScroll}
        contentContainerStyle={[chartStyles.scrollContent, { minWidth: chartInnerMin }]}
      >
        <View style={[chartStyles.barsRow, { width: plotWidth, height }]}>
          {data.map((d, index) => {
            const h = maxValue > 0 ? Math.max(6, (d.value / maxValue) * height) : 6
            const isPeak = index === peakI && d.value > 0
            const isLow = index === lowI && d.value > 0 && lowI !== peakI
            const isLatest = index === latestI && latestI !== peakI
            const dim = d.value <= 0 && !isPeak
            const fillOpacity = dim ? 0.28 : isLow ? 0.45 : 1
            const borderCol = isPeak ? barColor : isLatest ? ThemeColors.lavender : 'transparent'
            return (
              <Pressable
                key={barKey(d, index)}
                onPress={() => setPicked({ label: d.label, value: d.value })}
                style={[chartStyles.slot, { width: BAR_SLOT }]}
              >
                {d.topLabel ?
                  <Text style={[chartStyles.topLab, isPeak && { color: barColor }]} numberOfLines={1}>
                    {d.topLabel}
                  </Text>
                : null}
                <View style={[chartStyles.barTrack, { height, backgroundColor: trackColor }]}>
                  <View
                    style={[
                      chartStyles.barFill,
                      {
                        height: h,
                        backgroundColor: barColor,
                        opacity: fillOpacity,
                        borderWidth: isPeak || isLatest ? 2 : 0,
                        borderColor: borderCol,
                      },
                    ]}
                  />
                </View>
                <Text style={chartStyles.barLabel} numberOfLines={1}>
                  {d.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {picked ?
        <Text style={chartStyles.tooltip}>
          {picked.label}: {picked.value > 0 ? picked.value.toFixed(1) : '—'}
        </Text>
      : null}

      {footer ?
        <Text style={chartStyles.footer}>{footer}</Text>
      : null}
      <View style={chartStyles.baseline} />
    </View>
  )
}

interface DualBarChartProps {
  sleepHeights: number[]
  energyHeights: number[]
  maxH: number
  title: string
  subtitle?: string
  /** Short label per column (e.g. "M", "T" or "1"…"7"). */
  dayLabels?: string[]
}

const DUAL_SLOT = 44
const DUAL_GAP = 12
const DUAL_INNER_GAP = 10
const DUAL_BAR_W = 12

/** Sleep (blue) + energy (amber), horizontal scroll when many days. */
export function DualBarChart({ sleepHeights, energyHeights, maxH, title, subtitle, dayLabels }: DualBarChartProps) {
  const { width: screenW } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)
  const n = Math.min(sleepHeights.length, energyHeights.length)
  const sh = sleepHeights.slice(0, n)
  const eh = energyHeights.slice(0, n)
  const hChart = 104

  const peakI = useMemo(() => {
    if (n < 1) return -1
    let best = 0
    for (let i = 0; i < n; i++) {
      if (sh[i] > sh[best]) best = i
    }
    return best
  }, [n, sh])

  const peakEnergyI = useMemo(() => {
    if (n < 1) return -1
    let best = 0
    for (let i = 0; i < n; i++) {
      if (eh[i] > eh[best]) best = i
    }
    return best
  }, [eh, n])

  const avgSleep = useMemo(() => {
    const vals = sh.filter((v) => v > 0)
    if (vals.length === 0) return 0
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }, [sh])

  const peakDayLabel = dayLabels?.[peakI] ?? String(peakI + 1)

  const plotW = Math.max(1, n * (DUAL_SLOT + DUAL_GAP) - DUAL_GAP)
  const innerMin = Math.max(screenW - CARD_PAD_H * 2 - 8, plotW)

  const onLayoutDual = useCallback(() => {
    if (n > MAX_DEFAULT_VISIBLE) scrollRef.current?.scrollToEnd({ animated: false })
  }, [n])

  if (n < 1) {
    return (
      <View style={chartStyles.card}>
        <Text style={chartStyles.chartTitle}>{title}</Text>
        {subtitle ? <Text style={chartStyles.subtitle}>{subtitle}</Text> : null}
        <Text style={chartStyles.footer}>No data in this window yet. Log sleep and energy on Log today.</Text>
        <View style={chartStyles.baseline} />
      </View>
    )
  }

  return (
    <View style={chartStyles.card}>
      <Text style={chartStyles.chartTitle}>{title}</Text>
      {subtitle ? <Text style={chartStyles.subtitle}>{subtitle}</Text> : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={onLayoutDual}
        contentContainerStyle={[chartStyles.scrollContent, { minWidth: innerMin }]}
      >
        <View style={[chartStyles.dualRow, { width: plotW, height: hChart }]}>
          {Array.from({ length: n }, (_, i) => {
            const sVal = maxH > 0 ? (sh[i] / maxH) * hChart : 0
            const eVal = maxH > 0 ? (eh[i] / maxH) * hChart : 0
            const isPeakSleep = i === peakI && n > 1 && sh[i] > 0
            const isPeakEnergy = i === peakEnergyI && n > 1 && eh[i] > 0
            const lab = dayLabels?.[i] ?? String(i + 1)
            return (
              <View key={i} style={[chartStyles.dualSlot, { width: DUAL_SLOT }]}>
                <View style={chartStyles.dualPair}>
                  <View style={[chartStyles.miniTrack, { height: hChart }]}>
                    <View
                      style={[
                        chartStyles.miniFill,
                        {
                          height: Math.max(3, sVal),
                          backgroundColor: ThemeColors.sky,
                          opacity: isPeakSleep ? 1 : 0.82,
                          borderWidth: isPeakSleep ? 1.5 : 0,
                          borderColor: isPeakSleep ? '#4A9ECF' : 'transparent',
                        },
                      ]}
                    />
                  </View>
                  <View style={[chartStyles.miniTrack, { height: hChart }]}>
                    <View
                      style={[
                        chartStyles.miniFill,
                        {
                          height: Math.max(3, eVal),
                          backgroundColor: ThemeColors.peach,
                          opacity: isPeakEnergy ? 1 : 0.88,
                          borderWidth: isPeakEnergy ? 1.5 : 0,
                          borderColor: isPeakEnergy ? '#D97706' : 'transparent',
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={chartStyles.dualDay} numberOfLines={1}>
                  {lab}
                </Text>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <View style={chartStyles.dualFooterRow}>
        <View style={chartStyles.legendRowInline}>
          <View style={chartStyles.legendItem}>
            <View style={[chartStyles.legendDot, { backgroundColor: ThemeColors.sky }]} />
            <Text style={chartStyles.legendText}>Sleep</Text>
          </View>
          <View style={chartStyles.legendItem}>
            <View style={[chartStyles.legendDot, { backgroundColor: ThemeColors.peach }]} />
            <Text style={chartStyles.legendText}>Energy</Text>
          </View>
        </View>
        <Text style={chartStyles.footerInline}>
          {avgSleep > 0 ?
            `Avg sleep ${avgSleep.toFixed(1)} (0–10) · Best night ${peakDayLabel}`
          : 'Log sleep hours on Log today to fill this chart.'}
        </Text>
      </View>
      <View style={chartStyles.baseline} />
    </View>
  )
}

const chartStyles = StyleSheet.create({
  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    paddingHorizontal: CARD_PAD_H,
    paddingTop: CARD_PAD_TOP,
    paddingBottom: CARD_PAD_BOTTOM,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 4 },
  subtitle: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, marginBottom: 4 },
  context: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight, marginBottom: 12 },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'center',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
  },
  slot: { alignItems: 'center', gap: 6 },
  topLab: { fontSize: 11, fontWeight: '700', color: ThemeColors.primary, maxWidth: BAR_SLOT },
  barTrack: {
    width: BAR_WIDTH,
    borderRadius: BAR_RADIUS,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: BAR_RADIUS,
  },
  barLabel: { fontSize: 11, fontWeight: '600', color: ThemeColors.textMid, maxWidth: BAR_SLOT, textAlign: 'center' },
  tooltip: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textDark,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    fontWeight: '500',
    color: ThemeColors.textMid,
    marginTop: 10,
    lineHeight: 18,
  },
  dualFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    justifyContent: 'space-between',
  },
  legendRowInline: { flexDirection: 'row', gap: 16 },
  footerInline: {
    flex: 1,
    minWidth: 140,
    fontSize: 12,
    fontWeight: '500',
    color: ThemeColors.textMid,
    lineHeight: 18,
    textAlign: 'right',
  },
  baseline: { height: StyleSheet.hairlineWidth, backgroundColor: ThemeColors.border, marginTop: 12 },
  dualRow: { flexDirection: 'row', alignItems: 'flex-end', gap: DUAL_GAP },
  dualSlot: { alignItems: 'center', gap: 6 },
  dualPair: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: DUAL_INNER_GAP },
  miniTrack: {
    width: DUAL_BAR_W,
    borderRadius: 5,
    backgroundColor: ThemeColors.border,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  miniFill: { width: '100%', borderRadius: 5 },
  dualDay: { fontSize: 11, fontWeight: '600', color: ThemeColors.textLight, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 6, borderRadius: 2 },
  legendText: { fontSize: 12, fontWeight: '600', color: ThemeColors.textMid },
})
