import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { SimpleBarChart } from '../../components/insights/InsightCharts'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

const FADED_DATA = [
  { id: 'd0', label: 'M', value: 8 },
  { id: 'd1', label: 'T', value: 12 },
  { id: 'd2', label: 'W', value: 6 },
  { id: 'd3', label: 'T', value: 14 },
  { id: 'd4', label: 'F', value: 10 },
  { id: 'd5', label: 'S', value: 7 },
  { id: 'd6', label: 'S', value: 9 },
]

export function EmptyInsightsScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>Insights</Text>
      <View style={styles.chartWrap}>
        <View style={styles.chartFade} pointerEvents="none">
          <SimpleBarChart
            title="Cycle length preview"
            subtitle="Example only — your real bars appear after you log"
            data={FADED_DATA}
            maxValue={20}
            barColor={ThemeColors.border}
            trackColor={ThemeColors.bgCream}
            height={120}
            autoFooter
          />
        </View>
        <View style={styles.overlay}>
          <Text style={styles.title}>Charts unlock after a few logs</Text>
          <Text style={styles.desc}>Log period flow or symptoms a handful of times—length bars and phase hints appear automatically.</Text>
        </View>
      </View>
      <Pressable
        onPress={() => nav.navigate('SymptomPicker')}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.92 }]}
      >
        <Text style={styles.btnText}>Open log for today</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  scroll: { flexGrow: 1, paddingHorizontal: ThemeSpacing.pagePad },
  header: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 20 },
  chartWrap: { position: 'relative', marginBottom: 28 },
  chartFade: { opacity: 0.35 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 8 },
  desc: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, textAlign: 'center', lineHeight: 22 },
  btn: {
    marginTop: 32,
    backgroundColor: ThemeColors.primary,
    paddingVertical: 18,
    minHeight: 52,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
})
