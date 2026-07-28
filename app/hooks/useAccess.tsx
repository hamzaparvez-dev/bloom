import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { PLAN_NAME } from '../constants/subscription'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../providers/AuthProvider'
import { useRevenueCat } from '../providers/RevenueCatProvider'
import {
  type AccessLevel,
  deriveAccessLevel,
  formatTrialDaysRemainingLabel,
  isTrialActiveAt,
  type UserSubscriptionRow,
} from '../core/subscription'

export interface AccessContextValue {
  loading: boolean
  accessLevel: AccessLevel
  isPremium: boolean
  trialExpiresAtIso: string | null
  isTrialActive: boolean
  shouldShowTrialEndSoftModal: boolean
  trialCountdownLabel: string | null
  trialInsightReminderLabel: string | null
  trialPremiumBannerLabel: string | null
  refresh: () => Promise<void>
  acknowledgeTrialEndedSoftModal: () => Promise<void>
  setPremiumFromClient: () => Promise<{ error: string | null }>
}

const AccessContext = createContext<AccessContextValue | null>(null)

function mapRow(
  row: UserSubscriptionRow | null,
  hasRevenueCatEntitlement: boolean,
): Pick<
  AccessContextValue,
  | 'isPremium'
  | 'trialExpiresAtIso'
  | 'isTrialActive'
  | 'accessLevel'
  | 'shouldShowTrialEndSoftModal'
  | 'trialCountdownLabel'
  | 'trialInsightReminderLabel'
  | 'trialPremiumBannerLabel'
> {
  const isPremium = hasRevenueCatEntitlement || !!row?.is_premium
  const trialExpiresAtIso = row?.trial_expires_at ?? null
  const now = new Date()
  const trialActive = isTrialActiveAt(trialExpiresAtIso, now)
  const accessLevel = deriveAccessLevel({ isPremium, trialExpiresAtIso, now })
  const modalSeen = !!row?.trial_ended_soft_modal_seen_at
  const shouldShowTrialEndSoftModal =
    !!row &&
    !isPremium &&
    !trialActive &&
    !modalSeen &&
    trialExpiresAtIso != null

  return {
    isPremium,
    trialExpiresAtIso,
    isTrialActive: trialActive,
    accessLevel,
    shouldShowTrialEndSoftModal,
    trialCountdownLabel: formatTrialDaysRemainingLabel(trialExpiresAtIso, now),
    trialInsightReminderLabel: trialActive && !isPremium ? `${PLAN_NAME} insights unlocked` : null,
    trialPremiumBannerLabel:
      trialActive && !isPremium ? `${PLAN_NAME} unlocked during your trial` : null,
  }
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { hasBloomProEntitlement } = useRevenueCat()
  const [row, setRow] = useState<UserSubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setRow(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'is_premium, trial_started_at, trial_expires_at, trial_ended_soft_modal_seen_at',
      )
      .eq('id', uid)
      .maybeSingle()

    if (error) console.warn('[AccessProvider]', error.message)
    setRow((data as UserSubscriptionRow | null) ?? null)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const acknowledgeTrialEndedSoftModal = useCallback(async () => {
    const uid = user?.id
    if (!uid) return
    const ts = new Date().toISOString()
    const { error } = await supabase
      .from('profiles')
      .update({ trial_ended_soft_modal_seen_at: ts })
      .eq('id', uid)
    if (error) {
      console.warn('[AccessProvider] acknowledge modal', error.message)
      return
    }
    setRow((prev) =>
      prev
        ? { ...prev, trial_ended_soft_modal_seen_at: ts }
        : {
            is_premium: false,
            trial_started_at: null,
            trial_expires_at: null,
            trial_ended_soft_modal_seen_at: ts,
          },
    )
  }, [user?.id])

  const setPremiumFromClient = useCallback(async () => {
    const uid = user?.id
    if (!uid) return { error: 'Not signed in.' }
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', uid)
    if (error) return { error: error.message }
    await refresh()
    return { error: null }
  }, [user?.id, refresh])

  const derived = useMemo(() => mapRow(row, hasBloomProEntitlement), [row, hasBloomProEntitlement])

  const value = useMemo<AccessContextValue>(
    () => ({
      loading,
      refresh,
      acknowledgeTrialEndedSoftModal,
      setPremiumFromClient,
      ...derived,
    }),
    [loading, refresh, acknowledgeTrialEndedSoftModal, setPremiumFromClient, derived],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used within AccessProvider')
  return ctx
}
