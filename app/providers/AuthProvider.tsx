import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'
import { prefetchInsightsAfterOnboarding } from '../lib/ai-personalized-insight-client'
import { useOnboardingDraftStore } from '../stores/onboarding-draft-store'

function formatAuthError(error: AuthError): string {
  const m = error.message.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
    return 'Invalid email or password.'
  if (m.includes('token') && (m.includes('expired') || m.includes('invalid')))
    return 'That code is incorrect or expired. Request a new code and try again.'
  if (m.includes('otp')) return 'That verification code could not be used. Try again or request a new code.'
  if (m.includes('email not confirmed')) return 'Please confirm your email, then sign in.'
  if (m.includes('user already registered')) return 'An account with this email already exists. Try signing in.'
  if (m.includes('password')) return error.message
  return error.message || 'Something went wrong. Try again.'
}

function formatDbError(message: string): string {
  if (message.includes('duplicate key')) return 'Your settings are already saved. Try again.'
  return message || 'Could not save your profile. Try again.'
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  initializing: boolean
  profileLoading: boolean
  postAuthProfileLock: boolean
  onboardingCompleted: boolean
  sendEmailOtp: (email: string) => Promise<string | null>
  verifyEmailOtp: (email: string, token: string) => Promise<string | null>
  signInWithEmailPassword: (email: string, password: string) => Promise<string | null>
  signUpWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; session: Session | null }>
  runWithPostAuthProfileLock: (fn: () => Promise<string | null>) => Promise<string | null>
  completeOnboarding: () => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [postAuthProfileLock, setPostAuthProfileLock] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s)
        setInitializing(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user.id) {
      setProfileLoading(false)
      setOnboardingCompleted(false)
      return
    }

    let cancelled = false
    setProfileLoading(true)

    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.warn('[auth] profile fetch failed', error.message)
        setOnboardingCompleted(false)
        setProfileLoading(false)
        return
      }

      setOnboardingCompleted(!!data?.onboarding_completed)
      setProfileLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [session?.user.id])

  const sendEmailOtp = useCallback(async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) return 'Enter a valid email address.'

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
      },
    })
    if (error) return formatAuthError(error)
    return null
  }, [])

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const trimmedEmail = email.trim()
    const trimmedToken = token.trim()
    if (!trimmedEmail || trimmedToken.length !== 6) return 'Enter the full 6-digit code.'

    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'email',
    })
    if (error) return formatAuthError(error)
    return null
  }, [])

  const signInWithEmailPassword = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim()
    if (!trimmed) return 'Enter a valid email address.'
    if (!password) return 'Enter your password.'

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })
    if (error) return formatAuthError(error)
    useOnboardingDraftStore.getState().reset()
    return null
  }, [])

  const signUpWithEmailPassword = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim()
    if (!trimmed) return { error: 'Enter a valid email address.', session: null }
    if (password.length < 6) return { error: 'Password must be at least 6 characters.', session: null }

    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
    })
    if (error) return { error: formatAuthError(error), session: null }
    return { error: null, session: data.session ?? null }
  }, [])

  const runWithPostAuthProfileLock = useCallback(async (fn: () => Promise<string | null>) => {
    setPostAuthProfileLock(true)
    try {
      return await fn()
    } finally {
      setPostAuthProfileLock(false)
    }
  }, [])

  const completeOnboarding = useCallback(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession()
    const user = s?.user
    if (!user?.id) return 'You need to be signed in to finish setup. Sign in and try again.'

    const draft = useOnboardingDraftStore.getState()
    if (!draft.journeyMode) return 'Missing journey selection. Go back and choose how you use Bloom.'
    if (draft.periodLength == null || draft.cycleLength == null) {
      return 'Missing cycle details. Go back and enter period and cycle length.'
    }

    const cycleLen = Math.min(45, Math.max(18, Math.round(draft.cycleLength)))
    const periodLen = Math.min(10, Math.max(1, Math.round(draft.periodLength)))

    const journey =
      draft.journeyMode === 'pregnant' ? 'pregnancy' : draft.journeyMode === 'ttc' ? 'ttc' : 'cycle'

    const priorities = draft.healthGoalIds.slice(0, 3)
    const rawLocal = user.email?.split('@')[0]?.trim() ?? ''
    const displayName =
      rawLocal.length > 0 ? rawLocal.charAt(0).toUpperCase() + rawLocal.slice(1) : null

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name: displayName,
        journey,
        health_priorities: priorities,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

    if (profileError) return formatDbError(profileError.message)

    const { error: settingsError } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        cycle_length: cycleLen,
        period_length: periodLen,
        units: 'metric',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    if (settingsError) return formatDbError(settingsError.message)

    const onboardingFacts = `journey:${journey};cycle_length_days:${cycleLen};period_length_days:${periodLen};health_priorities:${priorities.join(',')}`

    useOnboardingDraftStore.getState().reset()
    setOnboardingCompleted(true)
    void prefetchInsightsAfterOnboarding(onboardingFacts)
    return null
  }, [])

  const signOut = useCallback(async () => {
    useOnboardingDraftStore.getState().reset()
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      profileLoading,
      postAuthProfileLock,
      onboardingCompleted,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      runWithPostAuthProfileLock,
      completeOnboarding,
      signOut,
    }),
    [
      session,
      initializing,
      profileLoading,
      postAuthProfileLock,
      onboardingCompleted,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      runWithPostAuthProfileLock,
      completeOnboarding,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
