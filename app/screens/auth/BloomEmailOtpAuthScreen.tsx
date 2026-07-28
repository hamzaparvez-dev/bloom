import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native'
import { Spacing } from '../../constants'
import { BloomAuthLayout } from '../../components/auth/BloomAuthLayout'
import { useAuth } from '../../providers/AuthProvider'
import { signInWithGoogleOAuth } from '../../lib/supabase-google-oauth'
import { useOnboardingDraftStore } from '../../stores/onboarding-draft-store'

export interface BloomEmailOtpAuthScreenProps {
  mode: 'postOnboarding' | 'returning'
  onRequestBack: () => void
  /** From ReturningAuth: start full onboarding for new users. */
  onRequestSignUp?: () => void
}

/** Figma 141:1582 — Pink/900 variant on primary CTA */
const CTA_PINK = '#E8618C'
const TEXT_MUTED = '#808080'
const BORDER_FIELD = '#F1F1F1'
const BLACK = '#000000'

export function BloomEmailOtpAuthScreen({ mode, onRequestBack, onRequestSignUp }: BloomEmailOtpAuthScreenProps) {
  const {
    signInWithEmailPassword,
    signUpWithEmailPassword,
    completeOnboarding,
    runWithPostAuthProfileLock,
  } = useAuth()

  const [isSignUpPanel, setIsSignUpPanel] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)

  const isReturning = mode === 'returning'
  const isSignUp = isReturning && isSignUpPanel

  const title = (() => {
    if (mode === 'postOnboarding') return 'Save your Bloom profile'
    if (isSignUp) return 'Create account'
    return 'Hello Again'
  })()

  const subtitle = (() => {
    if (mode === 'postOnboarding') {
      return 'Enter your email and password to secure your onboarding answers.'
    }
    if (isSignUp) return 'Start tracking with Bloom in a few taps.'
    return 'Sign in and keep your cycle in check.'
  })()

  const primaryLabel = (() => {
    if (mode === 'postOnboarding') return 'Create account'
    if (isSignUp) return 'Sign up'
    return 'Sign in'
  })()

  const onPrimaryPress = useCallback(async () => {
    setBannerError(null)
    if (!email.trim()) {
      setBannerError('Enter your email address.')
      return
    }
    if (!password) {
      setBannerError('Enter your password.')
      return
    }
    if (isSignUp && password !== confirmPassword) {
      setBannerError('Passwords do not match.')
      return
    }
    if (!agreed) {
      setBannerError('Please agree to the Bloom Terms & Conditions to continue.')
      return
    }

    if (mode === 'postOnboarding') {
      setBusy(true)
      const err = await runWithPostAuthProfileLock(async () => {
        const { error, session } = await signUpWithEmailPassword(email, password)
        if (error) return error
        if (!session) {
          return 'Check your email to confirm your account, then sign in. If confirmation is disabled, try again.'
        }
        return completeOnboarding()
      })
      setBusy(false)
      if (err) setBannerError(err)
      return
    }

    if (isSignUp) {
      setBusy(true)
      const { error, session } = await signUpWithEmailPassword(email, password)
      setBusy(false)
      if (error) {
        setBannerError(error)
        return
      }
      if (!session) {
        setBannerError(
          'Check your email to confirm your account, then return here to sign in.',
        )
        return
      }
      useOnboardingDraftStore.getState().reset()
      return
    }

    setBusy(true)
    const err = await signInWithEmailPassword(email, password)
    setBusy(false)
    if (err) setBannerError(err)
  }, [
    agreed,
    completeOnboarding,
    confirmPassword,
    email,
    isSignUp,
    mode,
    password,
    runWithPostAuthProfileLock,
    signInWithEmailPassword,
    signUpWithEmailPassword,
  ])

  const onGoogle = useCallback(async () => {
    setBannerError(null)
    if (!agreed) {
      setBannerError('Please agree to the Bloom Terms & Conditions to continue.')
      return
    }

    if (mode === 'postOnboarding') {
      setBusy(true)
      const err = await runWithPostAuthProfileLock(async () => {
        const oAuthErr = await signInWithGoogleOAuth()
        if (oAuthErr) return oAuthErr
        return completeOnboarding()
      })
      setBusy(false)
      if (err) setBannerError(err)
      return
    }

    setBusy(true)
    const oAuthErr = await signInWithGoogleOAuth()
    setBusy(false)
    if (oAuthErr) {
      setBannerError(oAuthErr)
      return
    }
    useOnboardingDraftStore.getState().reset()
  }, [agreed, completeOnboarding, mode, runWithPostAuthProfileLock])

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <BloomAuthLayout title={title} subtitle={subtitle} onBack={onRequestBack}>
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {bannerError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{bannerError}</Text>
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputShell}>
              <Mail size={20} color={TEXT_MUTED} strokeWidth={2} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={TEXT_MUTED}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputShell}>
              <Lock size={20} color={TEXT_MUTED} strokeWidth={2} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={TEXT_MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!busy}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={20} color={TEXT_MUTED} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={TEXT_MUTED} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>

          {(mode === 'postOnboarding' || isSignUp) ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Confirm password</Text>
              <View style={styles.inputShell}>
                <Lock size={20} color={TEXT_MUTED} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor={TEXT_MUTED}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!busy}
                />
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={() => setAgreed(!agreed)}
            style={styles.termsRow}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.termsText}>I agree to Bloom Terms & Conditions.</Text>
          </Pressable>

          <View style={styles.primaryWrap}>
            <Pressable
              onPress={() => void onPrimaryPress()}
              disabled={busy}
              style={({ pressed }) => [styles.primaryBtn, pressed && !busy && { opacity: 0.92 }, busy && { opacity: 0.65 }]}
            >
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            </Pressable>
          </View>

          <Text style={styles.dividerCenter}>Or continue with</Text>

          <View style={styles.googleRow}>
            <Pressable
              onPress={() => void onGoogle()}
              disabled={busy}
              style={({ pressed }) => [
                styles.googleTile,
                busy && styles.googleDisabled,
                pressed && !busy && styles.googlePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Text style={styles.googleG}>G</Text>
            </Pressable>
          </View>

          <Text style={styles.googleHint}>
            Google uses your Supabase OAuth configuration. Add redirect URLs under Supabase → Authentication → URL
            configuration if sign-in fails.
          </Text>

          {isReturning ? (
            <View style={styles.switchAccountRow}>
              <Text style={styles.switchAccountText}>
                {isSignUp ? 'Already have an account? ' : 'Don’t have an account? '}
              </Text>
              <Pressable
                onPress={() => {
                  setBannerError(null)
                  if (isSignUp) {
                    setIsSignUpPanel(false)
                    setConfirmPassword('')
                    return
                  }
                  if (onRequestSignUp) {
                    onRequestSignUp()
                    return
                  }
                  setIsSignUpPanel(true)
                  setConfirmPassword('')
                }}
                hitSlop={8}
              >
                <Text style={styles.switchAccountLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </BloomAuthLayout>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  errorBanner: {
    backgroundColor: '#FFF0F3',
    borderRadius: 16,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: BORDER_FIELD,
  },
  errorBannerText: {
    color: BLACK,
    fontSize: 14,
    fontWeight: '500',
  },
  fieldBlock: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: BLACK,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: BORDER_FIELD,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    minHeight: 50,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: BLACK,
    paddingVertical: Spacing.sm,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.3,
    borderColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: {
    backgroundColor: '#FFF5F7',
    borderColor: CTA_PINK,
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '700',
    color: CTA_PINK,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_MUTED,
    lineHeight: 16,
  },
  primaryWrap: {
    marginTop: Spacing.sm,
  },
  primaryBtn: {
    backgroundColor: CTA_PINK,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dividerCenter: {
    fontSize: 14,
    fontWeight: '400',
    color: BLACK,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  googleRow: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  googleTile: {
    width: 52,
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER_FIELD,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googlePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  googleDisabled: {
    opacity: 0.45,
  },
  googleG: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleHint: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  switchAccountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  switchAccountText: {
    fontSize: 12,
    fontWeight: '400',
    color: TEXT_MUTED,
  },
  switchAccountLink: {
    fontSize: 12,
    fontWeight: '600',
    color: BLACK,
  },
})
