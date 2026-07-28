import React from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeColors, ThemeSpacing } from '../../constants/theme'

const COPY = `Bloom Health Privacy Policy (summary)

We collect the health information you choose to log — such as cycle dates, symptoms, and notes — to provide predictions, insights, and reminders inside the app.

Your data is used to operate Bloom, improve features, and — if you opt in — share anonymized statistics. We do not sell your personal health data.

You can export or delete your data from Settings. For questions, contact support through the app.

Last updated: April 2026.`

export function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.text}>{COPY}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  text: { fontSize: 16, fontWeight: '400', color: ThemeColors.textDark, lineHeight: 26 },
})
