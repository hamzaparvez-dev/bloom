import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Purchases, { type CustomerInfo, type PurchasesError } from 'react-native-purchases'
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui'
import { getRevenueCatApiKey, getRevenueCatProEntitlementId } from '../lib/revenuecat-key'
import { isRevenueCatRuntimeSupported } from '../lib/revenuecat-availability'
import { useAuth } from './AuthProvider'

export interface RevenueCatContextValue {
  /** Native Purchases SDK is usable in this build (not Expo Go / web). */
  isRuntimeSupported: boolean
  /** `Purchases.configure` ran with a non-empty API key. */
  isConfigured: boolean
  /** Last configure / network error message for support. */
  lastError: string | null
  /** First `getCustomerInfo` (or listener) finished; safe to merge entitlement into access. */
  customerInfoLoaded: boolean
  customerInfo: CustomerInfo | null
  /** Active RevenueCat entitlement for Bloom Pro (dashboard id from getRevenueCatProEntitlementId()). */
  hasBloomProEntitlement: boolean
  refreshCustomerInfo: () => Promise<void>
  /** Presents the RevenueCat paywall for the current offering (publish one in the dashboard). */
  presentPaywall: () => Promise<PAYWALL_RESULT | null>
  presentCustomerCenter: () => Promise<void>
  restorePurchases: () => Promise<CustomerInfo>
}

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null)

function readHasPro(info: CustomerInfo | null): boolean {
  if (!info) return false
  return info.entitlements.active[getRevenueCatProEntitlementId()] != null
}

function purchasesErrorMessage(err: unknown): string {
  const pe = err as PurchasesError
  if (pe?.userInfo?.readableErrorCode) return String(pe.userInfo.readableErrorCode)
  if (pe?.message) return pe.message
  if (err instanceof Error) return err.message
  return 'Something went wrong with purchases.'
}

/** Dev-client / store builds only — logs offerings after configure. */
async function logRevenueCatOfferingsDebug(): Promise<void> {
  if (!__DEV__) return
  try {
    const offerings = await Purchases.getOfferings()
    const current = offerings.current
    console.log('[RevenueCat] offerings.current?.identifier:', current?.identifier ?? null)
    console.log('[RevenueCat] offerings.all keys:', Object.keys(offerings.all ?? {}))
    const packages = current?.availablePackages ?? []
    console.log(
      '[RevenueCat] current packages:',
      packages.map((p) => ({ id: p.identifier, product: p.product.identifier })),
    )
    if (!current) {
      console.warn(
        '[RevenueCat] No current offering. In RevenueCat: Product catalog → Offerings → set a default/current offering.',
      )
    }
  } catch (err) {
    console.warn('[RevenueCat] getOfferings failed:', err)
  }
}

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isRuntimeSupported = isRevenueCatRuntimeSupported()
  const configuredRef = useRef(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [customerInfoLoaded, setCustomerInfoLoaded] = useState(!isRuntimeSupported)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)

  const onCustomerInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info)
    setCustomerInfoLoaded(true)
  }, [])

  useEffect(() => {
    if (!isRuntimeSupported) return

    const listener = (info: CustomerInfo) => {
      onCustomerInfo(info)
    }
    Purchases.addCustomerInfoUpdateListener(listener)
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener)
    }
  }, [isRuntimeSupported, onCustomerInfo])

  useEffect(() => {
    if (!isRuntimeSupported) return
    if (configuredRef.current) return

    const apiKey = getRevenueCatApiKey()
    if (!apiKey) {
      setLastError('Missing RevenueCat API key. Set extra.revenueCatApiKey in app.config.js or EXPO_PUBLIC_REVENUECAT_API_KEY.')
      setCustomerInfoLoaded(true)
      return
    }

    try {
      if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG)
      Purchases.configure({ apiKey })
      configuredRef.current = true
      setIsConfigured(true)
      setLastError(null)
      void logRevenueCatOfferingsDebug()
    } catch (e) {
      setLastError(purchasesErrorMessage(e))
      setCustomerInfoLoaded(true)
    }
  }, [isRuntimeSupported])

  const refreshCustomerInfo = useCallback(async () => {
    if (!isRuntimeSupported || !configuredRef.current) {
      if (!isRuntimeSupported) setCustomerInfoLoaded(true)
      return
    }
    try {
      const info = await Purchases.getCustomerInfo()
      onCustomerInfo(info)
    } catch (e) {
      setLastError(purchasesErrorMessage(e))
      setCustomerInfoLoaded(true)
    }
  }, [isRuntimeSupported, onCustomerInfo])

  useEffect(() => {
    if (!isRuntimeSupported || !isConfigured) return

    let cancelled = false

    async function syncAppUserId() {
      try {
        if (user?.id) {
          await Purchases.logIn(user.id)
        } else {
          await Purchases.logOut()
        }
        if (cancelled) return
        await refreshCustomerInfo()
      } catch (e) {
        if (!cancelled) setLastError(purchasesErrorMessage(e))
        if (!cancelled) setCustomerInfoLoaded(true)
      }
    }

    void syncAppUserId()
    return () => {
      cancelled = true
    }
  }, [isRuntimeSupported, isConfigured, user?.id, refreshCustomerInfo])

  const hasBloomProEntitlement = useMemo(() => readHasPro(customerInfo), [customerInfo])

  const presentPaywall = useCallback(async (): Promise<PAYWALL_RESULT | null> => {
    if (!isRuntimeSupported || !configuredRef.current) return null
    try {
      return await RevenueCatUI.presentPaywall({
        displayCloseButton: true,
      })
    } catch (e) {
      setLastError(purchasesErrorMessage(e))
      return null
    }
  }, [isRuntimeSupported])

  const presentCustomerCenter = useCallback(async () => {
    if (!isRuntimeSupported || !configuredRef.current) return
    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: ({ customerInfo: next }) => {
            onCustomerInfo(next)
          },
        },
      })
    } catch (e) {
      setLastError(purchasesErrorMessage(e))
    }
  }, [isRuntimeSupported, onCustomerInfo])

  const restorePurchases = useCallback(async () => {
    if (!isRuntimeSupported || !configuredRef.current) {
      throw new Error('Purchases are not available in this build.')
    }
    const info = await Purchases.restorePurchases()
    onCustomerInfo(info)
    return info
  }, [isRuntimeSupported, onCustomerInfo])

  const value = useMemo<RevenueCatContextValue>(
    () => ({
      isRuntimeSupported,
      isConfigured,
      lastError,
      customerInfoLoaded,
      customerInfo,
      hasBloomProEntitlement,
      refreshCustomerInfo,
      presentPaywall,
      presentCustomerCenter,
      restorePurchases,
    }),
    [
      isRuntimeSupported,
      isConfigured,
      lastError,
      customerInfoLoaded,
      customerInfo,
      hasBloomProEntitlement,
      refreshCustomerInfo,
      presentPaywall,
      presentCustomerCenter,
      restorePurchases,
    ],
  )

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>
}

export function useRevenueCat(): RevenueCatContextValue {
  const ctx = useContext(RevenueCatContext)
  if (!ctx) throw new Error('useRevenueCat must be used within RevenueCatProvider')
  return ctx
}
