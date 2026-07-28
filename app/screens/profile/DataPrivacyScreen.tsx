import React from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Database, FileText, Shield } from 'lucide-react-native'
import { GroupedRow, GroupedSection } from '../../components/profile/GroupedList'
import { ThemeColors, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

export function DataPrivacyScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        Control how Bloom uses your health data. You can export a copy or review our privacy practices.
      </Text>
      <GroupedSection title="Privacy">
        <GroupedRow
          icon={Shield}
          iconColor={ThemeColors.lavender}
          iconBg="#F0EAFF"
          label="Privacy policy"
          showChevron
          isLast={false}
          onPress={() => nav.navigate('PrivacyPolicy')}
        />
        <GroupedRow
          icon={FileText}
          iconColor={ThemeColors.textMid}
          iconBg={ThemeColors.border}
          label="Terms of use"
          showChevron
          isLast
          onPress={() => nav.navigate('TermsOfUse')}
        />
      </GroupedSection>
      <GroupedSection title="Your data">
        <GroupedRow
          icon={Database}
          iconColor={ThemeColors.sky}
          iconBg="#E8F4FC"
          label="Export my data"
          showChevron
          isLast
          onPress={() => nav.navigate('DataExport')}
        />
      </GroupedSection>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  intro: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22, marginBottom: 20 },
})
