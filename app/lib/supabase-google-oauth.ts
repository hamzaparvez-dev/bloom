import * as WebBrowser from 'expo-web-browser'
import { WebBrowserResultType } from 'expo-web-browser'
import { supabase } from '../../supabaseClient'
import { getOAuthRedirectUrl, getSessionFromUrl } from './supabase-oauth-redirect'

WebBrowser.maybeCompleteAuthSession()

const OAUTH_BROWSER_TIMEOUT_MS = 120_000

async function openAuthSessionWithTimeout(
  authUrl: string,
  returnUrl: string,
): Promise<{ result: Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>; timedOut: boolean }> {
  let settled = false
  let timedOut = false

  const browser = WebBrowser.openAuthSessionAsync(authUrl, returnUrl).finally(() => {
    settled = true
  })

  const timeout = new Promise<Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>>((resolve) => {
    setTimeout(() => {
      if (settled) return
      timedOut = true
      try {
        WebBrowser.dismissAuthSession()
      } catch {
        // native module may not support dismiss on some platforms
      }
      resolve({ type: WebBrowserResultType.DISMISS })
    }, OAUTH_BROWSER_TIMEOUT_MS)
  })

  const result = await Promise.race([browser, timeout])
  return { result, timedOut }
}

/**
 * Google via Supabase OAuth only. Runs when the user taps the button (not on load).
 */
export async function signInWithGoogleOAuth(): Promise<string | null> {
  const redirectTo = getOAuthRedirectUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) return error.message || 'Could not start Google sign-in.'
  if (!data?.url) return 'Could not start Google sign-in.'

  if (__DEV__) console.log('[oauth] opening WebBrowser session, return URL:', redirectTo)

  const { result: browserResult, timedOut } = await openAuthSessionWithTimeout(data.url, redirectTo)

  if (__DEV__) console.log('[oauth] WebBrowser result type:', browserResult.type, 'timedOut:', timedOut)

  if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
    const { data: s } = await supabase.auth.getSession()
    if (s.session) return null

    if (timedOut) {
      return `Google sign-in timed out or the browser never returned to this app. In Supabase → Auth → URL Configuration, add this exact Redirect URL: ${redirectTo} and change Site URL away from https://dummy.com (use bloom://auth/callback or your Expo exp:// URL).`
    }
    return 'Sign in was cancelled.'
  }

  if (browserResult.type === 'success' && browserResult.url) {
    const { error: applyErr } = await getSessionFromUrl({ url: browserResult.url })
    if (applyErr) return applyErr

    const { data: sess } = await supabase.auth.getSession()
    if (__DEV__) console.log('[oauth] getSession() after browser success:', sess.session?.user?.id)
    return null
  }

  // On some devices the session is applied via Linking instead of this return value.
  const { data: sess } = await supabase.auth.getSession()
  if (sess.session) {
    if (__DEV__) console.log('[oauth] session already present (likely deep link):', sess.session.user?.id)
    return null
  }

  return 'Google sign-in did not return to the app with a session. Try again, or open the app from the browser redirect.'
}
