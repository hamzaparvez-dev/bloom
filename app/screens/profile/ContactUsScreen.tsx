import React, { useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Mail } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

const SUPPORT_EMAIL = 'support@bloom.app'

export function ContactUsScreen() {
  const insets = useSafeAreaInsets()
  const [message, setMessage] = useState('')

  const openMail = () => {
    const q = encodeURIComponent(message.trim() || 'Hello Bloom support,')
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Bloom support')}&body=${q}`
    Linking.openURL(url).catch(() => Alert.alert('Email', `Write us at ${SUPPORT_EMAIL}`))
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>We usually reply within one business day.</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="How can we help?"
        placeholderTextColor={ThemeColors.textLight}
        style={styles.input}
        multiline
        textAlignVertical="top"
      />
      <Pressable onPress={openMail} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
        <Mail size={20} color={ThemeColors.white} strokeWidth={2} />
        <Text style={styles.btnText}>Open email</Text>
      </Pressable>
      <Text style={styles.emailLine}>{SUPPORT_EMAIL}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  intro: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginBottom: 16, lineHeight: 22 },
  input: {
    minHeight: 140,
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    padding: 16,
    fontSize: 16,
    color: ThemeColors.textDark,
    marginBottom: 16,
  },
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
  emailLine: { textAlign: 'center', marginTop: 16, fontSize: 14, fontWeight: '500', color: ThemeColors.textLight },
})
