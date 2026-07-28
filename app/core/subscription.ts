import { differenceInCalendarDays, differenceInHours, isAfter, parseISO } from 'date-fns'
import { PLAN_NAME } from '../constants/subscription'

/** High-level access derived from profile + clock */
export type AccessLevel = 'trial_active' | 'trial_expired_free' | 'premium'

/** Features that require Premium outside an active trial */
export type PremiumFeature =
  | 'fertility_predictions'
  | 'advanced_insights'
  | 'health_reports'
  | 'deep_analytics'
  | 'ai_insights'
  | 'partner_tools'

const PREMIUM_ONLY = new Set<PremiumFeature>([
  'fertility_predictions',
  'advanced_insights',
  'health_reports',
  'deep_analytics',
  'ai_insights',
  'partner_tools',
])

export interface UserSubscriptionRow {
  is_premium: boolean | null
  trial_started_at: string | null
  trial_expires_at: string | null
  trial_ended_soft_modal_seen_at: string | null
}

export interface UserAccessInput {
  isPremium: boolean
  trialExpiresAtIso: string | null
  now?: Date
}

export function isTrialActiveAt(trialExpiresAtIso: string | null, now: Date = new Date()): boolean {
  if (!trialExpiresAtIso) return false
  try {
    const end = parseISO(trialExpiresAtIso)
    return isAfter(end, now)
  } catch {
    return false
  }
}

export function deriveAccessLevel(input: UserAccessInput): AccessLevel {
  const now = input.now ?? new Date()
  if (input.isPremium) return 'premium'
  if (isTrialActiveAt(input.trialExpiresAtIso, now)) return 'trial_active'
  return 'trial_expired_free'
}

export function canAccess(feature: PremiumFeature, input: UserAccessInput): boolean {
  if (!PREMIUM_ONLY.has(feature)) return true
  if (input.isPremium) return true
  if (isTrialActiveAt(input.trialExpiresAtIso, input.now ?? new Date())) return true
  return false
}

/** Whole-day messaging for trial banner */
export function formatTrialDaysRemainingLabel(trialExpiresAtIso: string | null, now: Date = new Date()): string | null {
  if (!trialExpiresAtIso || !isTrialActiveAt(trialExpiresAtIso, now)) return null
  try {
    const end = parseISO(trialExpiresAtIso)
    const days = Math.max(0, differenceInCalendarDays(end, now))
    if (days >= 1) return `${days} day${days === 1 ? '' : 's'} left in your trial`
    const hours = Math.max(1, differenceInHours(end, now))
    return hours > 24 ? '1 day left in your trial' : 'Less than a day left in your trial'
  } catch {
    return `${PLAN_NAME} unlocked during your trial`
  }
}

export function paywallHeadlineForFeature(feature: PremiumFeature): string {
  const map: Record<PremiumFeature, string> = {
    fertility_predictions: 'Unlock fertility predictions to see your optimal days',
    advanced_insights: 'Unlock advanced insights to understand your patterns',
    health_reports: 'Unlock health reports to share with your care team',
    deep_analytics: 'Unlock deeper analytics for your cycle',
    ai_insights: 'Unlock personalized AI insights tailored to you',
    partner_tools: 'Unlock partner tools to share support moments',
  }
  return map[feature]
}
