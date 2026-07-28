import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { Check, Sparkles, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { PAYWALL_RESULT } from 'react-native-purchases-ui'
import { PLAN_NAME } from '../../constants/subscription'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { getRevenueCatProEntitlementId } from '../../lib/revenuecat-key'
import { isRevenueCatRuntimeSupported } from '../../lib/revenuecat-availability'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { useRevenueCat } from '../../providers/RevenueCatProvider'
import { useAccess } from '../../hooks/useAccess'

const DARK = '#1A1A2E'
const DARK_CARD = '#252540'
const FEATURES = [
  'Advanced insights & predictions',
  'Unlimited health reports',
  'Partner mode & data sharing',
]

const DEFAULT_HEADLINE = 'Unlock full tracking with Bloom'

function hasEntitlement(
  info: { entitlements: { active: Record<string, unknown> } },
  entitlementId: string,
): boolean {
  return info.entitlements.active[entitlementId] != null
}

export function PaywallScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const route = useRoute<RouteProp<MainStackParamList, 'Paywall'>>()
  const [busy, setBusy] = useState(false)
  const rc = useRevenueCat()
  const { setPremiumFromClient } = useAccess()
  const entitlementId = getRevenueCatProEntitlementId()

  const headline = route.params?.contextHeadline ?? DEFAULT_HEADLINE

  const syncAfterPurchase = useCallback(async () => {
    const { error } = await setPremiumFromClient()
    if (error) Alert.alert('Could not update profile', error)
  }, [setPremiumFromClient])

  const openRevenueCatPaywall = useCallback(async () => {
    if (!isRevenueCatRuntimeSupported()) {
      Alert.alert(
        'Development build required',
        'RevenueCat paywalls need a dev client or store build (not Expo Go). Run: npx expo run:ios or EAS Build.',
      )
      return
    }
    if (!rc.isConfigured) {
      Alert.alert('Purchases not ready', rc.lastError ?? 'Add your RevenueCat API key in app.config.js / .env.')
      return
    }
    setBusy(true)
    try {
      const result = await rc.presentPaywall()
      if (result == null) return
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        await syncAfterPurchase()
        nav.goBack()
        return
      }
      if (result === PAYWALL_RESULT.ERROR) {
        Alert.alert(
          PLAN_NAME,
          'Something went wrong in the paywall. Try again or use Restore purchases.',
        )
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      Alert.alert(PLAN_NAME, msg)
    } finally {
      setBusy(false)
    }
  }, [nav, rc, syncAfterPurchase])

  const restore = useCallback(async () => {
    if (!isRevenueCatRuntimeSupported()) {
      Alert.alert(
        'Development build required',
        'Restore runs in a dev client or store build, not in Expo Go.',
      )
      return
    }
    if (!rc.isConfigured) {
      Alert.alert('Purchases not ready', rc.lastError ?? 'Add your RevenueCat API key.')
      return
    }
    setBusy(true)
    try {
      const info = await rc.restorePurchases()
      if (hasEntitlement(info, entitlementId)) {
        await syncAfterPurchase()
        Alert.alert('Restored', `${PLAN_NAME} is active.`)
        nav.goBack()
      } else {
        Alert.alert(
          'Nothing to restore',
          `No active ${PLAN_NAME} subscription was found for this store account.`,
        )
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Restore failed'
      Alert.alert('Restore', msg)
    } finally {
      setBusy(false)
    }
  }, [entitlementId, nav, rc, syncAfterPurchase])

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => nav.goBack()}
        hitSlop={16}
        style={[styles.close, { top: insets.top + 8 }]}
      >
        <X size={24} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 52, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#E8618C', '#9C8FC4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroIcon}
        >
          <Sparkles size={36} color="#FFFFFF" strokeWidth={2} />
        </LinearGradient>
        <Text style={styles.title}>{headline}</Text>
        <Text style={styles.sub}>
          Subscribe with {PLAN_NAME}. Pricing and packages (lifetime, yearly, monthly) come from your RevenueCat
          offering and the App Store when you publish a paywall in the dashboard.
        </Text>

        <View style={styles.featureBlock}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Check size={18} color="#6ECF9E" strokeWidth={2.5} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>How checkout works</Text>
          <Text style={styles.infoCardBody}>
            Tap below to open RevenueCat’s paywall. Create and publish a paywall in the RevenueCat dashboard and
            attach packages for <Text style={styles.mono}>bloom_pro_monthly</Text>,{' '}
            <Text style={styles.mono}>bloom_pro_yearly</Text>, and lifetime when configured.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && !busy && { opacity: 0.92 }, busy && { opacity: 0.65 }]}
          onPress={() => void openRevenueCatPaywall()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaText}>Open subscription options</Text>
          )}
        </Pressable>

        <Text style={styles.legal}>
          Test with your sandbox Apple ID in a development build. Switch to production API keys in app.config /
          EAS before release.
        </Text>

        <Pressable onPress={() => void restore()} style={styles.restore} disabled={busy}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>

        <Pressable onPress={() => nav.goBack()} style={styles.secondary} disabled={busy}>
          <Text style={styles.secondaryText}>Not now</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  close: { position: 'absolute', right: ThemeSpacing.pagePad, zIndex: 2, padding: 8 },
  content: { paddingHorizontal: ThemeSpacing.pagePad, paddingTop: 48 },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featureBlock: { marginBottom: 20, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.92)', flex: 1 },
  infoCard: {
    backgroundColor: DARK_CARD,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  infoCardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  infoCardBody: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }) },
  cta: {
    backgroundColor: ThemeColors.primary,
    paddingVertical: 17,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  legal: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  restore: { paddingVertical: 16, alignItems: 'center' },
  restoreText: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  secondary: { paddingVertical: 8, alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
})
