import { useEffect, useRef, useState } from 'react'
import {
  fetchPersonalizedInsight,
  type PersonalizedInsightType,
} from '../lib/ai-personalized-insight-client'
import { useAuth } from '../providers/AuthProvider'

interface UseScreenInsightArgs {
  insightType: PersonalizedInsightType
  fallbackText: string
  fallbackAction?: string
  factsLine: string
  /** When true, backend may bypass 24h cache if daily OpenAI cap allows. */
  force?: boolean
  /** When false, skips network fetch and shows fallback copy only (for rule-based UI). */
  enabled?: boolean
}

const DEBOUNCE_MS = 650

export function useScreenInsight({
  insightType,
  fallbackText,
  fallbackAction = 'Open Log and save mood, flow, or symptoms for today.',
  factsLine,
  force,
  enabled = true,
}: UseScreenInsightArgs): {
  insight: string
  action: string
  loading: boolean
} {
  const { user } = useAuth()
  const [insight, setInsight] = useState(fallbackText)
  const [action, setAction] = useState(fallbackAction)
  const [loading, setLoading] = useState(false)
  const reqId = useRef(0)

  useEffect(() => {
    setInsight(fallbackText)
    setAction(fallbackAction)
  }, [fallbackText, fallbackAction])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setInsight(fallbackText)
      setAction(fallbackAction)
      return
    }

    if (!user?.id) {
      setLoading(false)
      setInsight(fallbackText)
      setAction(fallbackAction)
      return
    }

    const id = ++reqId.current
    const t = setTimeout(() => {
      void (async () => {
        if (id !== reqId.current) return
        setLoading(true)
        try {
          const res = await fetchPersonalizedInsight({
            insightType,
            factsLine,
            force,
          })
          if (id !== reqId.current) return
          if (res) {
            setInsight(res.insight || fallbackText)
            setAction(res.action || fallbackAction)
          } else {
            setInsight(fallbackText)
            setAction(fallbackAction)
          }
        } finally {
          if (id === reqId.current) setLoading(false)
        }
      })()
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(t)
      if (id === reqId.current) setLoading(false)
    }
  }, [enabled, user?.id, insightType, factsLine, force, fallbackText, fallbackAction])

  return { insight, action, loading }
}
