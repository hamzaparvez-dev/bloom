import React from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WifiOff } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

const CIRCLE = 180

export function OfflineScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.center}>
        <LinearGradient
          colors={['#FCEACC', ThemeColors.pinkSurface]}
          style={styles.circle}
        >
          <WifiOff size={56} color={ThemeColors.peach} strokeWidth={1.8} />
        </LinearGradient>
        <Text style={styles.title}>You're offline</Text>
        <Text style={styles.desc}>Please check your internet connection and try again.</Text>
        <Pressable
          onPress={() =>
            Alert.alert('Still offline', 'Check Wi‑Fi or cellular data, then try again.')
          }
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
        <Text style={styles.status}>Last synced 2 hours ago</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ThemeSpacing.pagePad,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: { fontSize: 22, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 10 },
  desc: {
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
  },
  btn: {
    alignSelf: 'stretch',
    maxWidth: 320,
    backgroundColor: '#E05A5A',
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
  status: { fontSize: 13, fontWeight: '400', color: '#9CA3AF', marginTop: 20 },
})
