import { getOpenAiApiKey, getOpenAiModel } from './openai-env'

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

export type BloomJourneyHint = 'cycle' | 'ttc' | 'pregnancy' | 'postpartum' | 'unknown'

export interface BloomAssistantContext {
  userFirstName?: string
  journeyHint?: BloomJourneyHint
}

export interface BloomAssistantReply {
  text: string
}

interface OpenAiChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function buildSystemPrompt(ctx: BloomAssistantContext): string {
  const journey =
    ctx.journeyHint && ctx.journeyHint !== 'unknown'
      ? `The user’s selected journey in Bloom is: ${ctx.journeyHint}. Tailor examples and vocabulary to that journey when relevant.`
      : 'The user may be tracking cycle health, trying to conceive, or pregnant—stay general unless they specify.'

  const name =
    ctx.userFirstName?.trim() ?
      `Address the user as “${ctx.userFirstName.trim()}” when it feels natural (not every sentence).`
    : 'Use warm, supportive second person (“you”).'

  return [
    'You are Bloom’s in-app health companion for women’s health: menstrual cycle tracking, trying to conceive (TTC), pregnancy, and postpartum wellness.',
    'Bloom is a calm, privacy-minded app—keep tone reassuring, clear, and non-alarmist. Prefer short paragraphs and bullet lists when it helps readability.',
    journey,
    name,
    'You are not a substitute for a clinician. Never diagnose, prescribe medication dosages, or interpret imaging/labs as definitive. For urgent symptoms (severe pain, heavy bleeding, fever in pregnancy, decreased fetal movement, thoughts of self-harm), tell the user to seek emergency care or call local emergency services immediately.',
    'If the question is outside women’s health or general wellness related to Bloom’s scope, politely decline and suggest speaking with a qualified professional.',
    'Do not claim real-time access to the user’s medical records. If they share personal details, acknowledge briefly and give general education—not personalized medical decisions.',
  ].join('\n')
}

function mapStatusToMessage(status: number, body: string): string {
  if (status === 401) return 'OpenAI rejected the API key. Check OPENAI_API_KEY in .env and restart Expo.'
  if (status === 429) return 'The assistant is busy right now. Please wait a moment and try again.'
  if (status >= 500) return 'OpenAI is temporarily unavailable. Try again shortly.'
  const trimmed = body?.trim()
  if (trimmed) return `Could not reach the assistant (${status}).`
  return `Could not reach the assistant (${status}).`
}

function truncateInsightLine(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (s.length <= 220) return s
  return `${s.slice(0, 217).trim()}…`
}

async function openAiChatCompletion(
  messages: OpenAiChatMessage[],
  options: { maxTokens: number; temperature: number; signal?: AbortSignal },
): Promise<string> {
  const apiKey = getOpenAiApiKey()
  if (!apiKey) {
    throw new Error(
      'OpenAI is not configured. Add OPENAI_API_KEY to bloom/.env (see .env.example), then restart the dev server.',
    )
  }

  const model = getOpenAiModel()
  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      messages,
    }),
  })

  const rawText = await res.text()
  if (!res.ok) throw new Error(mapStatusToMessage(res.status, rawText))

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText) as unknown
  } catch {
    throw new Error('Received an unexpected response from the assistant.')
  }

  const content = extractAssistantText(parsed)
  if (!content) throw new Error('The assistant returned an empty answer. Try rephrasing your question.')

  return content.trim()
}

/** One- or two-sentence UI insight for a screen (not medical advice). */
export async function requestBloomShortInsight(
  factsLine: string,
  screenKey: string,
  signal?: AbortSignal,
  context?: BloomAssistantContext,
): Promise<string> {
  const ctx = context ?? {}
  const system = [
    buildSystemPrompt(ctx),
    'You write a single micro-insight shown inside the Bloom app.',
    'Rules: at most 2 short sentences; total under 220 characters; plain everyday words; warm and calm.',
    'Do not diagnose or prescribe. No numbers unless they already appear in the data line.',
    'If data is thin, encourage gentle habits or logging—still under 220 characters.',
  ].join('\n')

  const userMsg = `Screen: ${screenKey}\nBloom data (may be partial):\n${factsLine.slice(0, 600)}\n\nWrite the insight only—no title, no quotes.`

  const raw = await openAiChatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: userMsg },
    ],
    { maxTokens: 100, temperature: 0.42, signal },
  )
  return truncateInsightLine(raw)
}

export async function requestBloomAssistantAnswer(
  question: string,
  context: BloomAssistantContext,
  options?: { signal?: AbortSignal },
): Promise<BloomAssistantReply> {
  const messages: OpenAiChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    {
      role: 'user',
      content: question.trim(),
    },
  ]

  const text = await openAiChatCompletion(messages, {
    maxTokens: 900,
    temperature: 0.5,
    signal: options?.signal,
  })

  return { text }
}

function extractAssistantText(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== 'object') return undefined
  const choices = (parsed as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length < 1) return undefined
  const first = choices[0]
  if (!first || typeof first !== 'object') return undefined
  const message = (first as { message?: unknown }).message
  if (!message || typeof message !== 'object') return undefined
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== 'object') return ''
        const t = (part as { text?: unknown }).text
        return typeof t === 'string' ? t : ''
      })
      .join('')
      .trim()
  }
  return undefined
}
