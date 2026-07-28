import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

interface GroupedSectionProps {
  title?: string
  children: React.ReactNode
}

export function GroupedSection({ title, children }: GroupedSectionProps) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  )
}

export interface GroupedRowProps {
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  label: string
  value?: string
  showChevron?: boolean
  danger?: boolean
  isLast?: boolean
  onPress?: () => void
}

export function GroupedRow({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  showChevron,
  danger,
  isLast,
  onPress,
}: GroupedRowProps) {
  const content = (
    <>
      {Icon ? (
        <View style={[rowStyles.iconWrap, iconBg && { backgroundColor: iconBg }]}>
          <Icon size={17} color={iconColor ?? ThemeColors.textDark} strokeWidth={2} />
        </View>
      ) : null}
      <Text style={[rowStyles.label, danger && rowStyles.danger]}>{label}</Text>
      {value ? (
        <Text style={rowStyles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {showChevron ? <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} /> : null}
    </>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          rowStyles.row,
          pressed && rowStyles.pressed,
          Icon ? rowStyles.rowWithIcon : null,
          !isLast && rowStyles.border,
        ]}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View style={[rowStyles.row, Icon ? rowStyles.rowWithIcon : null, !isLast && rowStyles.border]}>
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 48,
  },
  rowWithIcon: { gap: 12 },
  pressed: { opacity: 0.72 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ThemeColors.border },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 16, fontWeight: '500', color: ThemeColors.textDark },
  value: { fontSize: 15, fontWeight: '500', color: ThemeColors.textLight, marginRight: 4 },
  danger: { color: '#E05A5A' },
})
