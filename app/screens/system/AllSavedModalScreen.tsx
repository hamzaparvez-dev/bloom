import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

const ICON = 64

export function AllSavedModalScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <View style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => nav.goBack()} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.iconCircle}>
          <Check size={34} color={ThemeColors.white} strokeWidth={3} />
        </View>
        <Text style={styles.title}>All saved!</Text>
        <Text style={styles.body}>
          Your data has been successfully saved. You can view it in your insights anytime.
        </Text>
        <Pressable onPress={() => nav.goBack()} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.92 }]}>
          <Text style={styles.primaryText}>Done</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            nav.goBack()
            nav.navigate('Tabs')
          }}
          style={styles.link}
        >
          <Text style={styles.linkText}>View insights</Text>
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
    paddingTop: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    backgroundColor: ThemeColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 10 },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: ThemeColors.primary,
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
  link: { paddingVertical: 12 },
  linkText: { fontSize: 16, fontWeight: '600', color: ThemeColors.lavender },
})
