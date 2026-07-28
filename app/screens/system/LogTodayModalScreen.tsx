import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ClipboardList, Droplets, Smile } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

export function LogTodayModalScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <View style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => nav.goBack()} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.icons}>
          <View style={styles.iconBubble}>
            <Smile size={26} color={ThemeColors.peach} strokeWidth={2} />
          </View>
          <View style={styles.iconBubble}>
            <ClipboardList size={26} color={ThemeColors.lavender} strokeWidth={2} />
          </View>
          <View style={styles.iconBubble}>
            <Droplets size={26} color={ThemeColors.primary} strokeWidth={2} />
          </View>
        </View>
        <Text style={styles.title}>Log today&apos;s data</Text>
        <Text style={styles.body}>
          You haven&apos;t logged anything for today yet. It only takes a minute to stay on track.
        </Text>
        <Pressable
          onPress={() => {
            nav.goBack()
            nav.navigate('MoodTracker')
          }}
          style={({ pressed }) => [styles.primary, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.primaryText}>Open log</Text>
        </Pressable>
        <Pressable onPress={() => nav.goBack()} style={styles.secondary}>
          <Text style={styles.secondaryText}>Not now</Text>
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
    paddingTop: 24,
    alignItems: 'center',
  },
  icons: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: ThemeColors.bgCream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 10 },
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
  secondary: { paddingVertical: 12 },
  secondaryText: { fontSize: 16, fontWeight: '600', color: ThemeColors.textMid },
})
