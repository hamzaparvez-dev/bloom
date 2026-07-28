import React from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Download } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

export function DataExportScreen() {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.body}>
        We&apos;ll prepare a file with your cycles, symptoms, and journal entries. You&apos;ll get a notification when
        it&apos;s ready to download.
      </Text>
      <Pressable
        onPress={() => Alert.alert('Request received', 'Your export will be ready within 24 hours.')}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
      >
        <Download size={20} color={ThemeColors.white} strokeWidth={2} />
        <Text style={styles.btnText}>Request data export</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  body: { fontSize: 16, fontWeight: '400', color: ThemeColors.textDark, lineHeight: 24, marginBottom: 24 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ThemeColors.primary,
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
  },
  btnText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
})
