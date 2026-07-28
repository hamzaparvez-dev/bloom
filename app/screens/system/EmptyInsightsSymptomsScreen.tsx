import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check } from 'lucide-react-native'
import { EmptyStateLayout } from '../../components/ui/EmptyStateLayout'
import { getImage } from '../../lib/app-images'
import { ThemeColors } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

const BULLETS = [
  'See your fertile window at a glance',
  'Spot symptom patterns over time',
  'Share-ready reports for your doctor',
]

export function EmptyInsightsSymptomsScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <EmptyStateLayout
        illustration={getImage('empty')}
        title="No data yet!"
        description="Log your symptoms to see your cycle trends and unlock personalized insights."
        primaryLabel="Log symptoms"
        onPrimary={() => nav.navigate('SymptomPicker')}
      >
        <View style={styles.list}>
          {BULLETS.map((line) => (
            <View key={line} style={styles.row}>
              <Check size={18} color={ThemeColors.mint} strokeWidth={2.5} />
              <Text style={styles.line}>{line}</Text>
            </View>
          ))}
        </View>
      </EmptyStateLayout>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  list: { alignSelf: 'stretch', maxWidth: 320, gap: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  line: { flex: 1, fontSize: 15, fontWeight: '500', color: ThemeColors.textDark, lineHeight: 22 },
})
