import React, { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { supabase } from '../../../supabaseClient'
import { getSessionFromUrl, isLikelySupabaseOAuthRedirect } from '../../lib/supabase-oauth-redirect'

/**
 * Handles cold start + runtime deep links for Supabase OAuth (e.g. bloom://auth/callback#...).
 * Required when the OS opens the app without passing the URL back to WebBrowser.openAuthSessionAsync.
 */
export function SupabaseOAuthLinkHandler() {
  useEffect(() => {
    async function handleIncoming(url: string | null) {
      if (!url || !isLikelySupabaseOAuthRedirect(url)) return

      if (__DEV__) console.log('[oauth] Linking received URL:', url)

      const { error } = await getSessionFromUrl({ url })
      if (error) {
        if (__DEV__) console.warn('[oauth] Linking handler error:', error)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (__DEV__) console.log('[oauth] Linking handler session user:', data.session?.user?.id)
    }

    void Linking.getInitialURL().then((url) => void handleIncoming(url))

    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleIncoming(url)
    })

    return () => sub.remove()
  }, [])

  return null
}
