import { supabase } from '../../supabaseClient'

export type PersonalizedInsightType = 'fertility' | 'sleep' | 'mood' | 'perimenopause'

export interface PersonalizedInsightResult {
  insight: string
  action: string
}

export async function fetchPersonalizedInsight(params: {
  insightType: PersonalizedInsightType
  factsLine: string
  force?: boolean
}): Promise<PersonalizedInsightResult | null> {
  const { data, error } = await supabase.functions.invoke('ai-personalized-insight', {
    body: {
      type: params.insightType,
      facts: params.factsLine.slice(0, 2000),
      force: params.force === true,
    },
  })

  if (error) {
    console.warn('[fetchPersonalizedInsight]', error.message)
    return null
  }

  const row = data as { insight?: string; action?: string } | null
  if (!row || typeof row.insight !== 'string') return null

  return {
    insight: row.insight.trim(),
    action: typeof row.action === 'string' ? row.action.trim() : '',
  }
}

/** One OpenAI call fills fertility, sleep, and mood caches (counts toward daily cap). */
export async function prefetchInsightsAfterOnboarding(factsLine: string): Promise<void> {
  const { error } = await supabase.functions.invoke('ai-personalized-insight', {
    body: { batch: true, facts: factsLine.slice(0, 2000) },
  })
  if (error) console.warn('[prefetchInsightsAfterOnboarding]', error.message)
}
