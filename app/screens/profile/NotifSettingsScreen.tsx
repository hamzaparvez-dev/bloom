import React, { useState } from 'react'
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

interface RowProps {
  title: string
  subtitle: string
  value: boolean
  onValueChange: (v: boolean) => void
  isLast?: boolean
}

function NotifRow({ title, subtitle, value, onValueChange, isLast }: RowProps) {
  return (
    <View style={[styles.row, !isLast && styles.border]}>
      <View style={styles.rowText}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: ThemeColors.border, true: ThemeColors.primary }}
        thumbColor={ThemeColors.white}
      />
    </View>
  )
}

export function NotifSettingsScreen() {
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState(true)
  const [fertile, setFertile] = useState(true)
  const [insights, setInsights] = useState(false)
  const [community, setCommunity] = useState(true)

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>Choose which reminders you want on this device.</Text>
      <View style={styles.card}>
        <NotifRow
          title="Period reminders"
          subtitle="Upcoming period and logging nudges"
          value={period}
          onValueChange={setPeriod}
        />
        <NotifRow
          title="Fertile window"
          subtitle="Peak days when trying to conceive"
          value={fertile}
          onValueChange={setFertile}
        />
        <NotifRow
          title="Insights digest"
          subtitle="Weekly summary of your trends"
          value={insights}
          onValueChange={setInsights}
        />
        <NotifRow
          title="Community"
          subtitle="Replies and mentions"
          value={community}
          onValueChange={setCommunity}
          isLast
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  intro: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22, marginBottom: 16 },
  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ThemeColors.border },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: ThemeColors.textDark },
  subtitle: { fontSize: 13, fontWeight: '400', color: ThemeColors.textLight, marginTop: 2 },
})
