import React from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeColors, ThemeSpacing } from '../../constants/theme'

const COPY = `Bloom Terms of Use (summary)

Bloom provides general wellness and educational information. It is not a substitute for professional medical advice, diagnosis, or treatment.

By using Bloom you agree to use the app responsibly and to consult a qualified clinician for medical decisions.

Subscription terms and billing are handled through your app store account. You can manage or cancel your subscription in device settings.

Last updated: April 2026.`

export function TermsOfUseScreen() {
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
