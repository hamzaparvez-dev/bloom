import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stethoscope } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { EXPERT_QA } from '../../data/learn-content'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../providers/AuthProvider'
import { supabase } from '../../../supabaseClient'
import type { OnboardingJourneyMode } from '../../stores/onboarding-draft-store'
import { useOnboardingDraftStore } from '../../stores/onboarding-draft-store'
import type { BloomJourneyHint } from '../../lib/bloom-openai-chat'
import { requestBloomAssistantAnswer } from '../../lib/bloom-openai-chat'
import { isOpenAiConfigured } from '../../lib/openai-env'

const EXPERT_EMAIL = 'clinical@bloom.app'

function mapJourneyMode(mode: OnboardingJourneyMode | null): BloomJourneyHint {
  if (mode === 'pregnant') return 'pregnancy'
  if (mode === 'ttc') return 'ttc'
  if (mode === 'cycle') return 'cycle'
  return 'unknown'
}

export function AskExpertScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const journeyMode = useOnboardingDraftStore((s) => s.journeyMode)
  const [question, setQuestion] = useState('')
  const [expanded, setExpanded] = useState<string | null>(EXPERT_QA[0]?.id ?? null)
  const [reply, setReply] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState<string | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  const openAiReady = useMemo(() => isOpenAiConfigured(), [])

  useEffect(() => {
    const uid = user?.id
    if (!uid) {
      setFirstName(undefined)
      return
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', uid).maybeSingle()
      if (cancelled) return
      const raw = data?.display_name?.trim()
      if (!raw) {
        setFirstName(undefined)
        return
      }
      setFirstName(raw.split(/\s+/)[0] ?? raw)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const toggle = useCallback((id: string) => {
    setExpanded((c) => (c === id ? null : id))
  }, [])

  const askAssistant = useCallback(async () => {
    const q = question.trim()
    if (!q) {
      Alert.alert('Question required', 'Type your question before asking Bloom’s assistant.')
      return
    }
    if (!openAiReady) {
      Alert.alert(
        'Assistant not configured',
        'Add OPENAI_API_KEY to bloom/.env (see .env.example), then restart Expo with a clean cache if needed.',
      )
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    setError(null)
    setReply(null)

    try {
      const { text } = await requestBloomAssistantAnswer(
        q,
        {
          userFirstName: firstName,
          journeyHint: mapJourneyMode(journeyMode),
        },
        { signal: ac.signal },
      )
      setReply(text)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      const message = e instanceof Error ? e.message : 'Something went wrong. Try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [firstName, journeyMode, openAiReady, question])

  const emailExpert = useCallback(() => {
    const q = question.trim()
    const body = encodeURIComponent(q || 'Hello, I have a question about Bloom.')
    const url = `mailto:${EXPERT_EMAIL}?subject=${encodeURIComponent('Bloom — Ask the expert')}&body=${body}`
    void Linking.openURL(url).catch(() =>
      Alert.alert('Email', `Send your question to ${EXPERT_EMAIL}`),
    )
  }, [question])

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 56}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Stethoscope size={28} color={ThemeColors.textDark} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Ask Bloom</Text>
          <Text style={styles.sub}>
            {openAiReady ?
              'Personalized guidance for cycle, TTC, and pregnancy—grounded in Bloom’s companion approach.'
            : 'Add your OpenAI key in bloom/.env to enable the assistant, or email our team below.'}
          </Text>
        </View>

        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="What would you like to know?"
          placeholderTextColor={ThemeColors.textLight}
          style={styles.input}
          multiline
          editable={!loading}
        />

        {loading ?
          <View style={styles.loadingRow}>
            <ActivityIndicator color={ThemeColors.primary} />
            <Text style={styles.loadingText}>Bloom is drafting an answer…</Text>
          </View>
        : null}

        {error ?
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        : null}

        {reply ?
          <View style={styles.replyCard}>
            <Text style={styles.replyLabel}>Assistant</Text>
            <Text style={styles.replyBody}>{reply}</Text>
          </View>
        : null}

        <Button title={loading ? 'Thinking…' : 'Get answer'} onPress={askAssistant} disabled={loading} />

        <Pressable
          onPress={emailExpert}
          style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.linkText}>Prefer a human specialist? Email us</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Bloom’s assistant uses AI and may be inaccurate. It is not medical advice. For emergencies or concerns
          about your pregnancy or health, contact your clinician or local emergency services.
        </Text>

        <Text style={styles.sectionLabel}>Common questions</Text>

        {EXPERT_QA.map((qa) => {
          const open = expanded === qa.id
          return (
            <Pressable
              key={qa.id}
              onPress={() => toggle(qa.id)}
              style={({ pressed }) => [styles.qaCard, pressed && { opacity: 0.95 }]}
            >
              <View style={styles.tag}>
                <Text style={styles.tagText}>{qa.tag}</Text>
              </View>
              <Text style={styles.q}>{qa.question}</Text>
              <Text style={styles.aPreview}>{open ? qa.answerFull : qa.answerPreview}</Text>
              <Text style={styles.readMore}>{open ? 'Show less' : 'Read more'}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: ThemeColors.bgCream },
  root: { flex: 1 },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  hero: {
    backgroundColor: ThemeColors.orangeBg,
    borderRadius: ThemeRadius.lg,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: ThemeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: ThemeColors.textDark },
  sub: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginTop: 8, textAlign: 'center' },
  input: {
    minHeight: 100,
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    fontSize: 16,
    color: ThemeColors.textDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  loadingText: { flex: 1, fontSize: 14, fontWeight: '600', color: ThemeColors.textMid },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: ThemeRadius.card,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 14, fontWeight: '600', color: '#B91C1C' },
  replyCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.textLight,
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  replyBody: { fontSize: 15, fontWeight: '400', color: ThemeColors.textDark, lineHeight: 22 },
  linkBtn: { alignItems: 'center', paddingVertical: 16 },
  linkText: { fontSize: 15, fontWeight: '600', color: ThemeColors.lavender },
  disclaimer: {
    fontSize: 12,
    fontWeight: '500',
    color: ThemeColors.textLight,
    lineHeight: 18,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textLight,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  qaCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: ThemeColors.pinkSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ThemeRadius.pill,
    marginBottom: 10,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: ThemeColors.primary },
  q: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 8 },
  aPreview: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22 },
  readMore: { fontSize: 14, fontWeight: '600', color: ThemeColors.lavender, marginTop: 10 },
})
