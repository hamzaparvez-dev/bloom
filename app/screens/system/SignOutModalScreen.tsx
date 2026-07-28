import React, { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { useAuth } from '../../providers/AuthProvider'

export function SignOutModalScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  const confirm = () => {
    setBusy(true)
    void signOut().catch(() => {
      setBusy(false)
      Alert.alert('Sign out failed', 'Try again.')
    })
  }

  return (
    <View style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => nav.goBack()} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Sign out?</Text>
        <Text style={styles.body}>Are you sure you want to sign out of your account?</Text>
        <Pressable onPress={confirm} style={styles.destructive} disabled={busy}>
          <Text style={styles.destructiveText}>{busy ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>
        <Pressable onPress={() => nav.goBack()} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.8 }]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26, 15, 46, 0.45)',
  },
  sheet: {
    backgroundColor: ThemeColors.surface,
    borderTopLeftRadius: ThemeRadius.lg,
    borderTopRightRadius: ThemeRadius.lg,
    paddingHorizontal: ThemeSpacing.pagePad,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: ThemeColors.border,
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 8 },
  body: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22, marginBottom: 24 },
  destructive: { paddingVertical: 16, alignItems: 'center' },
  destructiveText: { fontSize: 17, fontWeight: '700', color: ThemeColors.primary },
  cancel: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ThemeColors.border,
    marginHorizontal: -ThemeSpacing.pagePad,
    paddingHorizontal: ThemeSpacing.pagePad,
  },
  cancelText: { fontSize: 17, fontWeight: '600', color: ThemeColors.textDark },
})
