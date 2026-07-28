import Constants from 'expo-constants'

export interface BloomOpenAiExtra {
  openAiApiKey?: string
  openAiModel?: string
}

function getExtra(): BloomOpenAiExtra {
  const extra = Constants.expoConfig?.extra as BloomOpenAiExtra | undefined
  return extra ?? {}
}

export function getOpenAiApiKey(): string | undefined {
  const key = getExtra().openAiApiKey?.trim()
  if (!key) return undefined
  return key
}

export function getOpenAiModel(): string {
  const m = getExtra().openAiModel?.trim()
  return m || 'gpt-4o-mini'
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getOpenAiApiKey())
}
