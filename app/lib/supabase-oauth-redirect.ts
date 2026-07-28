import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../../supabaseClient'

/** Path segment after the app scheme (matches common Supabase entry `bloom://auth/callback`). */
export const OAUTH_CALLBACK_PATH = 'auth/callback'

/**
 * OAuth redirect must be listed exactly in Supabase → Auth → URL Configuration → Redirect URLs.
 *
 * - **Expo Go** always yields `exp://HOST:PORT/--/auth/callback` (changes with machine / Metro). If that
 *   URL is not allowed, Supabase falls back to **Site URL** (e.g. `https://dummy.com`) and the in-app
 *   browser never completes → looks “stuck” with no error.
 * - **Dev / production builds** use your app scheme from app.json (`bloom://auth/callback`).
 */
export function getOAuthRedirectUrl(): string {
  const expoGoStyle = Linking.createURL(OAUTH_CALLBACK_PATH)
  if (expoGoStyle.startsWith('exp://') || expoGoStyle.startsWith('exps://')) {
    if (__DEV__) {
      console.warn(
        '\n[oauth] ── Supabase (Expo Go) ─────────────────────────────────────\n' +
          'Add this EXACT string under Authentication → URL Configuration → Redirect URLs:\n\n' +
          `  ${expoGoStyle}\n\n` +
          'Also set Site URL to something valid (not https://dummy.com), e.g. bloom://auth/callback\n' +
          '────────────────────────────────────────────────────────────────\n',
      )
    }
    return expoGoStyle
  }

  const url = Linking.createURL(OAUTH_CALLBACK_PATH, { scheme: 'bloom' })
  if (__DEV__) console.log('[oauth] redirectTo (add to Supabase Redirect URLs if not already):', url)
  return url
}

function parseOAuthCallbackParams(href: string): Record<string, string> {
  const result: Record<string, string> = {}
  try {
    const parsed = new URL(href)
    if (parsed.hash?.startsWith('#')) {
      const hashParams = new URLSearchParams(parsed.hash.slice(1))
      hashParams.forEach((value, key) => {
        result[key] = value
      })
    }
    parsed.searchParams.forEach((value, key) => {
      result[key] = value
    })
  } catch {
    // ignore
  }
  return result
}

export function isLikelySupabaseOAuthRedirect(url: string): boolean {
  if (!url) return false
  return url.includes(OAUTH_CALLBACK_PATH)
}

/**
 * Applies tokens from an OAuth redirect URL to the Supabase client.
 * `@supabase/auth-js` v2.102 does not expose `getSessionFromUrl`; this mirrors that behavior.
 */
export async function getSessionFromUrl({ url }: { url: string }): Promise<{
  error: string | null
}> {
  if (__DEV__) console.log('[oauth] getSessionFromUrl input:', url)

  WebBrowser.maybeCompleteAuthSession()

  const params = parseOAuthCallbackParams(url)

  if (params.error) {
    const msg = params.error_description || params.error || 'OAuth error in redirect URL.'
    if (__DEV__) console.warn('[oauth] error params:', params.error, params.error_description)
    return { error: msg }
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code)
    if (error) {
      if (__DEV__) console.warn('[oauth] exchangeCodeForSession error:', error.message)
      return { error: error.message }
    }
    if (__DEV__) console.log('[oauth] session after code exchange user:', data.session?.user?.id)
    return { error: null }
  }

  const access_token = params.access_token
  const refresh_token = params.refresh_token
  if (!access_token || !refresh_token) {
    if (__DEV__) console.warn('[oauth] missing tokens in URL params keys:', Object.keys(params))
    return {
      error:
        'No tokens in this redirect. In Supabase → Auth → URL Configuration: allow your app redirect URL (see Metro log [oauth] redirectTo), and change Site URL if it is still https://dummy.com.',
    }
  }

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) {
    if (__DEV__) console.warn('[oauth] setSession error:', error.message)
    return { error: error.message }
  }
  if (__DEV__) console.log('[oauth] session after setSession user:', data.session?.user?.id)
  return { error: null }
}
