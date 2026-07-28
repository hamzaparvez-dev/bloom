import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeShadows, ThemeSpacing } from '../../constants/theme'
import type { PersonalizedInsightType } from '../../lib/ai-personalized-insight-client'
import { useScreenInsight } from '../../hooks/use-screen-insight'

interface AIInsightProps {
  insightType: PersonalizedInsightType
  screenKey: string
  fallbackText: string
  fallbackAction?: string
  factsLine: string
  force?: boolean
  /** Replaces the default “For you” card header (e.g. cycle-based label). */
  headLabel?: string
  /** When false, card title uses sentence case (default is small caps style). */
  headLabelUppercase?: boolean
  /** When false, shows fallback copy only—no personalized fetch. */
  fetchEnabled?: boolean
  /** `card` = padded surface; `bare` = text + spinner only (parent supplies chrome). */
  mode?: 'card' | 'bare'
  textStyle?: TextStyle
  style?: ViewStyle
}

export function AIInsight({
  insightType,
  screenKey,
  fallbackText,
  fallbackAction,
  factsLine,
  force,
  headLabel = 'For you',
  headLabelUppercase = true,
  fetchEnabled = true,
  mode = 'card',
  textStyle,
  style,
}: AIInsightProps) {
  void screenKey
  const { insight, action, loading } = useScreenInsight({
    insightType,
    fallbackText,
    fallbackAction,
    factsLine,
    force,
    enabled: fetchEnabled,
  })

  if (mode === 'bare') {
    return (
      <View style={[bareStyles.row, style]}>
        <View style={bareStyles.col}>
          <Text style={[bareStyles.text, textStyle]} numberOfLines={2}>
            {insight}
          </Text>
          {action ?
            <Text style={bareStyles.action} numberOfLines={2}>
              {action}
            </Text>
          : null}
        </View>
        {loading ?
          <ActivityIndicator size="small" color={ThemeColors.lavender} style={bareStyles.spinner} />
        : null}
      </View>
    )
  }

  return (
    <View style={[cardStyles.wrap, ThemeShadows.card, style]}>
      <View style={cardStyles.head}>
        <Sparkles size={16} color={ThemeColors.lavender} strokeWidth={2} />
        <Text
          style={[
            cardStyles.headLabel,
            !headLabelUppercase && { textTransform: 'none', letterSpacing: 0.2 },
          ]}
        >
          {headLabel}
        </Text>
        {loading ?
          <ActivityIndicator size="small" color={ThemeColors.primary} style={cardStyles.spinner} />
        : null}
      </View>
      <Text style={[cardStyles.body, textStyle]} numberOfLines={3}>
        {insight}
      </Text>
      {action ?
        <Text style={cardStyles.action} numberOfLines={2}>
          {action}
        </Text>
      : null}
    </View>
  )
}

const bareStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  col: { flex: 1, gap: 4 },
  text: { fontSize: 15, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 22 },
  action: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, lineHeight: 18 },
  spinner: { marginTop: 2 },
})

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.lg,
    paddingVertical: ThemeSpacing['4'],
    paddingHorizontal: ThemeSpacing['5'],
    marginBottom: ThemeSpacing['5'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.lavender,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  spinner: {},
  body: {
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
    lineHeight: 22,
  },
  action: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: ThemeColors.textMid,
    lineHeight: 19,
  },
})
