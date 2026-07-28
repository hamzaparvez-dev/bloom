import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Crown } from 'lucide-react-native'
import { PLAN_NAME } from '../../constants/subscription'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { getRevenueCatProEntitlementId } from '../../lib/revenuecat-key'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { useRevenueCat } from '../../providers/RevenueCatProvider'
import { useAccess } from '../../hooks/useAccess'

function hasProFromCustomerInfo(
  info: { entitlements: { active: Record<string, unknown> } },
  entitlementId: string,
): boolean {
  return info.entitlements.active[entitlementId] != null
}

export function ManageSubscriptionScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const [busy, setBusy] = useState(false)
  const { isPremium, setPremiumFromClient } = useAccess()
  const rc = useRevenueCat()
  const entitlementId = getRevenueCatProEntitlementId()

  const entitlement = rc.customerInfo?.entitlements.active[entitlementId]
  const productLabel = entitlement?.productIdentifier ?? null
  const willRenew = entitlement?.willRenew
  const exp = entitlement?.expirationDate

  const statusLine = !isPremium
    ? `No active ${PLAN_NAME} subscription`
    : willRenew === false
      ? productLabel
        ? `Active · ${productLabel} (non-renewing)`
        : 'Active · non-renewing access'
      : productLabel
        ? `Active · ${productLabel}${exp ? ` · renews ${exp}` : ''}`
        : `Active · ${PLAN_NAME}`

  const openCustomerCenter = useCallback(async () => {
    if (!rc.isRuntimeSupported) {
      Alert.alert(
        'Development build required',
        'Customer Center runs in a native dev client or store build, not in Expo Go.',
      )
      return
    }
    if (!rc.isConfigured) {
      Alert.alert('Purchases not configured', rc.lastError ?? 'Missing RevenueCat API key.')
      return
    }
    setBusy(true)
    try {
      await rc.presentCustomerCenter()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not open Customer Center'
      Alert.alert('Customer Center', msg)
    } finally {
      setBusy(false)
    }
  }, [rc])

  const restore = useCallback(async () => {
    if (!rc.isRuntimeSupported) {
      Alert.alert('Development build required', 'Use a dev client or store build to restore purchases.')
      return
    }
    if (!rc.isConfigured) {
      Alert.alert('Purchases not configured', rc.lastError ?? 'Missing RevenueCat API key.')
      return
    }
    setBusy(true)
    try {
      const info = await rc.restorePurchases()
      if (hasProFromCustomerInfo(info, entitlementId)) {
        const { error } = await setPremiumFromClient()
        if (error) console.warn('[ManageSubscription] profile sync', error)
        Alert.alert('Restored', `${PLAN_NAME} is active on this account.`)
      } else {
        Alert.alert(
          'Restore complete',
          `No active ${PLAN_NAME} subscription was found for this store account.`,
        )
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Restore failed'
      Alert.alert('Restore', msg)
    } finally {
      setBusy(false)
    }
  }, [rc, setPremiumFromClient, entitlementId])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Crown size={28} color={ThemeColors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.planName}>{PLAN_NAME}</Text>
        <Text style={[styles.status, !isPremium && styles.statusInactive]}>{statusLine}</Text>
      </View>
      <Text style={styles.body}>
        Manage billing, change plans, or cancel in your App Store subscriptions settings. Use RevenueCat Customer
        Center when configured in your dashboard.
      </Text>

      <Pressable
        onPress={() => nav.navigate('Paywall')}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }, busy && { opacity: 0.7 }]}
        disabled={busy}
      >
        <Text style={styles.btnText}>{isPremium ? 'Change plan' : 'Upgrade'}</Text>
      </Pressable>

      <Pressable
        onPress={openCustomerCenter}
        style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.9 }, busy && { opacity: 0.7 }]}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={ThemeColors.primary} />
        ) : (
          <Text style={styles.btnSecondaryText}>Subscription help (Customer Center)</Text>
        )}
      </Pressable>

      <Pressable onPress={restore} style={styles.linkBtn} disabled={busy}>
        <Text style={styles.linkText}>Restore purchases</Text>
      </Pressable>

      <Pressable
        onPress={() => Alert.alert('App Store', 'Open Settings → Apple ID → Subscriptions to cancel.')}
        style={styles.linkBtn}
      >
        <Text style={styles.linkText}>Cancel subscription (system settings)</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  hero: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ThemeColors.pinkSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  planName: { fontSize: 20, fontWeight: '800', color: ThemeColors.textDark },
  status: { fontSize: 14, fontWeight: '500', color: ThemeColors.mint, marginTop: 6, textAlign: 'center' },
  statusInactive: { color: ThemeColors.textMid },
  body: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22, marginBottom: 20 },
  btn: {
    backgroundColor: ThemeColors.primary,
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
  btnSecondary: {
    backgroundColor: ThemeColors.surface,
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    minHeight: 52,
    justifyContent: 'center',
  },
  btnSecondaryText: { fontSize: 16, fontWeight: '700', color: ThemeColors.primary },
  linkBtn: { paddingVertical: 14, alignItems: 'center' },
  linkText: { fontSize: 16, fontWeight: '600', color: ThemeColors.textLight },
})
