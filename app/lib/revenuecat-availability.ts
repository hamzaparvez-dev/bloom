import { Platform } from 'react-native'
import Constants from 'expo-constants'

/**
 * RevenueCat native modules are not available in Expo Go or on web.
 * Use a dev client / EAS build for purchases and paywalls.
 */
export function isRevenueCatRuntimeSupported(): boolean {
  if (Platform.OS === 'web') return false
  if (Constants.executionEnvironment === 'storeClient') return false
  return true
}
