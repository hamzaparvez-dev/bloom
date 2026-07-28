import React, { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Bookmark, Check, X } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { partnerScreenCopy, type PartnerTip } from '../../lib/partner-mode-retention'

export type PartnerTipCardVariant = 'spotlight' | 'emphasis' | 'subtle'

interface PartnerTipCardProps {
  tip: PartnerTip
  variant: PartnerTipCardVariant
  saved: boolean
  onDone: () => void
  onSave: () => void
  onDismiss: () => void
}

export function PartnerTipCard({ tip, variant, saved, onDone, onSave, onDismiss }: PartnerTipCardProps) {
  const badge =
    variant === 'spotlight' ? '🔥' : variant === 'emphasis' ? '⭐' : '💡'

  const wrapStyle =
    variant === 'spotlight'
      ? styles.wrapSpotlight
      : variant === 'emphasis'
        ? styles.wrapEmphasis
        : styles.wrapSubtle

  const handleDone = useCallback(() => onDone(), [onDone])
  const handleSave = useCallback(() => onSave(), [onSave])
  const handleDismiss = useCallback(() => onDismiss(), [onDismiss])

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <View style={styles.topRow}>
        <Text style={styles.badge} accessibilityLabel={`Priority ${tip.priority}`}>
          {badge}
        </Text>
        <Text style={styles.tipText} numberOfLines={2}>
          {tip.text}
        </Text>
      </View>
      {saved ? (
        <Text style={styles.savedTag} numberOfLines={1}>
          {partnerScreenCopy.savedForToday}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          onPress={handleDone}
          hitSlop={8}
          style={({ pressed }) => [styles.actionBtn, styles.actionDone, pressed && { opacity: 0.85 }]}
          accessibilityLabel="Mark tip as done"
        >
          <Check size={18} color={ThemeColors.white} strokeWidth={2.2} />
          <Text style={styles.actionLabel}>Done</Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          hitSlop={8}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionSave,
            saved && styles.actionSaveOn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityLabel={saved ? 'Unsave tip' : 'Save tip'}
        >
          <Bookmark size={18} color={saved ? ThemeColors.white : ThemeColors.primary} fill={saved ? ThemeColors.white : 'none'} strokeWidth={2} />
          <Text style={saved ? styles.actionLabel : styles.actionLabelPrimary}>Save</Text>
        </Pressable>
        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          style={({ pressed }) => [styles.actionBtn, styles.actionDismiss, pressed && { opacity: 0.85 }]}
          accessibilityLabel="Dismiss tip"
        >
          <X size={18} color={ThemeColors.textMid} strokeWidth={2} />
          <Text style={styles.actionLabelMuted}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: ThemeRadius.card,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  wrapSpotlight: {
    backgroundColor: ThemeColors.surface,
    borderColor: ThemeColors.primary,
    borderWidth: 1.5,
  },
  wrapEmphasis: {
    backgroundColor: ThemeColors.surface,
    borderColor: ThemeColors.border,
  },
  wrapSubtle: {
    backgroundColor: ThemeColors.bgCream,
    borderColor: ThemeColors.border,
    opacity: 0.95,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: { fontSize: 16, lineHeight: 22, marginTop: 1 },
  tipText: { flex: 1, fontSize: 15, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 21 },
  savedTag: {
    fontSize: 12,
    fontWeight: '600',
    color: ThemeColors.primary,
    marginTop: 8,
    marginLeft: 26,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginLeft: 26 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: ThemeRadius.pill,
  },
  actionDone: { backgroundColor: ThemeColors.primary },
  actionSave: {
    backgroundColor: ThemeColors.pinkSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.primary,
  },
  actionSaveOn: { backgroundColor: ThemeColors.primary, borderColor: ThemeColors.primary },
  actionDismiss: { backgroundColor: ThemeColors.surface },
  actionLabel: { fontSize: 13, fontWeight: '700', color: ThemeColors.white },
  actionLabelPrimary: { fontSize: 13, fontWeight: '700', color: ThemeColors.primary },
  actionLabelMuted: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid },
})
