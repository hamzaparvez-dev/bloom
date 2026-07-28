import { Platform } from 'react-native'
import Constants from 'expo-constants'

/**
 * Android Expo Go (SDK 53+) removed expo-notifications support; calling it logs an error.
 * Development / preview builds should still schedule local notifications.
 */
export function shouldSkipExpoNotifications(): boolean {
  return Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient'
}
