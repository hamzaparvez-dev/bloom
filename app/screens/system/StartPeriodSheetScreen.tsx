import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

export function StartPeriodSheetScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <View style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => nav.goBack()} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Start period?</Text>
        <Text style={styles.body}>
          Did your period start today? Log it to keep your cycle tracking accurate.
        </Text>
        <Pressable
          onPress={() => {
            nav.goBack()
            nav.navigate('PeriodStarted')
          }}
          style={({ pressed }) => [styles.primary, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.primaryText}>Yes, started today</Text>
        </Pressable>
        <Pressable onPress={() => nav.goBack()} style={styles.secondary}>
          <Text style={styles.secondaryText}>Maybe later</Text>
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
  title: { fontSize: 20, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 10 },
  body: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22, marginBottom: 24 },
  primary: {
    backgroundColor: ThemeColors.primary,
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '600', color: ThemeColors.textMid },
})
