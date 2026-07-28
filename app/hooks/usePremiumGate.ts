import { useCallback } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { canAccess, paywallHeadlineForFeature, type PremiumFeature } from '../core/subscription'
import type { MainStackParamList } from '../navigation/MainNavigator'
import { useAccess } from './useAccess'

/**
 * Opens the paywall when the user does not have access to a premium feature.
 */
export function usePremiumGate() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const access = useAccess()

  return useCallback(
    (feature: PremiumFeature) => {
      const ok = canAccess(feature, {
        isPremium: access.isPremium,
        trialExpiresAtIso: access.trialExpiresAtIso,
      })
      if (ok) return true
      navigation.navigate('Paywall', { contextHeadline: paywallHeadlineForFeature(feature) })
      return false
    },
    [access.isPremium, access.trialExpiresAtIso, navigation],
  )
}
