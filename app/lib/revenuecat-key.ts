import { Platform } from 'react-native'
import Constants from 'expo-constants'

interface RevenueCatExtra {
  revenueCatApiKey?: string
  revenueCatApiKeyIos?: string
  revenueCatApiKeyAndroid?: string
  /** Must match the entitlement identifier in RevenueCat (e.g. Bloom Pro). */
  revenueCatEntitlementId?: string
}

function readExtra(): RevenueCatExtra {
  return (Constants.expoConfig?.extra ?? {}) as RevenueCatExtra
}

/**
 * Public SDK key for the current platform. Prefer ios/android-specific keys in production.
 */
export function getRevenueCatApiKey(): string {
  const e = readExtra()
  if (Platform.OS === 'ios') return (e.revenueCatApiKeyIos || e.revenueCatApiKey || '').trim()
  if (Platform.OS === 'android') return (e.revenueCatApiKeyAndroid || e.revenueCatApiKey || '').trim()
  return (e.revenueCatApiKey || '').trim()
}

/**
 * Entitlement id checked with CustomerInfo — must match RevenueCat → Product catalog → Entitlements.
 */
export function getRevenueCatProEntitlementId(): string {
  const id = readExtra().revenueCatEntitlementId?.trim()
  return id && id.length > 0 ? id : 'Bloom Pro'
}
