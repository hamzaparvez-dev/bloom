import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import { Play, Square } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { getActivePregnancyId } from '../../lib/active-pregnancy'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'

const RED = '#EF4444'
const RED_LIGHT = '#FEE2E2'
const RING_SIZE = 220
const RING_STROKE = 10
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_R
const MAX_DURATION_SECS = 180

interface Contraction {
  id: string
  duration: number
  timestamp: number
}

interface ContractionTimerScreenProps {
  onBack?: () => void
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const mins = Math.max(1, Math.round(diffMs / 60000))
  return `${mins} min ago`
}

function avgInterval(contractions: Contraction[]): string {
  if (contractions.length < 2) return '--'
  let totalGap = 0
  for (let i = 1; i < contractions.length; i++) {
    totalGap += contractions[i - 1].timestamp - contractions[i].timestamp
  }
  const avgMs = totalGap / (contractions.length - 1)
  const mins = Math.round(avgMs / 60000)
  return `${mins} min`
}

function avgDuration(contractions: Contraction[]): string {
  if (contractions.length === 0) return '--'
  const total = contractions.reduce((sum, c) => sum + c.duration, 0)
  const avg = Math.round(total / contractions.length)
  return `${avg} sec`
}

export function ContractionTimerScreen({ onBack }: ContractionTimerScreenProps) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [contractions, setContractions] = useState<Contraction[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentStartRef = useRef<Date | null>(null)
  const previousStartRef = useRef<Date | null>(null)
  const [pregnancyId, setPregnancyId] = useState<string | null>(null)

  useEffect(() => {
    const uid = user?.id
    if (!uid) {
      setPregnancyId(null)
      return
    }
    void getActivePregnancyId(uid).then(setPregnancyId)
  }, [user?.id])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  const handleStart = useCallback(() => {
    setSeconds(0)
    setIsRunning(true)
    currentStartRef.current = new Date()
  }, [])

  const handleStop = useCallback(() => {
    setIsRunning(false)
    const uid = user?.id
    const dur = seconds
    const start = currentStartRef.current
    currentStartRef.current = null
    if (dur <= 0 || !start) {
      setSeconds(0)
      return
    }

    const end = new Date()
    let intervalSec: number | null = null
    if (previousStartRef.current) {
      intervalSec = Math.round(
        (start.getTime() - previousStartRef.current.getTime()) / 1000,
      )
    }
    previousStartRef.current = start

    setSeconds(0)

    void (async () => {
      if (!uid || !pregnancyId) {
        Alert.alert(
          'Pregnancy profile',
          'Add an active pregnancy to save contraction timing.',
        )
        setContractions((prev) => [
          { id: `local-${Date.now()}`, duration: dur, timestamp: end.getTime() },
          ...prev,
        ])
        return
      }

      const { data, error } = await supabase
        .from('contraction_entries')
        .insert({
          user_id: uid,
          pregnancy_id: pregnancyId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          duration_seconds: dur,
          interval_seconds: intervalSec,
        })
        .select('id')
        .single()

      if (error) {
        Alert.alert('Could not save', error.message)
        return
      }

      setContractions((prev) => [
        {
          id: data?.id ?? `local-${Date.now()}`,
          duration: dur,
          timestamp: end.getTime(),
        },
        ...prev,
      ])
    })()
  }, [seconds, user?.id, pregnancyId])

  const progress = Math.min(seconds / MAX_DURATION_SECS, 1)
  const frequencyLabel = contractions.length >= 2
    ? `Every ${avgInterval(contractions).replace(' min', '')} minutes`
    : 'Waiting for data'

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Frequency card */}
      <View style={styles.freqCard}>
        <View style={styles.freqLeft}>
          <Text style={styles.freqLabel}>Frequency</Text>
          <Text style={styles.freqValue}>{frequencyLabel}</Text>
        </View>
        <Text style={styles.freqCount}>{contractions.length} contractions</Text>
      </View>

      {/* SVG Ring */}
      <View style={styles.ringSection}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svgAbs}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={ThemeColors.border}
              strokeWidth={RING_STROKE}
              fill="none"
            />
          </Svg>
          <View style={[styles.svgAbs, { transform: [{ rotate: '-90deg' }] }]}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke={isRunning ? RED : ThemeColors.border}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_CIRC}`}
                strokeDashoffset={RING_CIRC * (1 - progress)}
              />
            </Svg>
          </View>
          <View style={styles.ringCenter}>
            <Text style={[styles.timerDisplay, isRunning && { color: RED }]}>
              {formatDuration(seconds)}
            </Text>
            <Text style={styles.durationLabel}>Duration</Text>
            {isRunning && (
              <View style={styles.statusBadge}>
                <View style={styles.redDot} />
                <Text style={styles.statusText}>Contracting</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Button row */}
      <View style={styles.buttonRow}>
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [styles.startBtn, { opacity: pressed ? 0.7 : 1 }]}
          disabled={isRunning}
        >
          <Play size={18} color={isRunning ? ThemeColors.textLight : ThemeColors.primary} strokeWidth={2} />
          <Text style={[styles.startLabel, isRunning && { color: ThemeColors.textLight }]}>Start</Text>
        </Pressable>

        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [styles.stopBtn, { opacity: pressed ? 0.85 : 1 }]}
          disabled={!isRunning}
        >
          <Square size={16} color={ThemeColors.white} strokeWidth={2.5} fill={ThemeColors.white} />
          <Text style={styles.stopLabel}>Stop</Text>
        </Pressable>
      </View>

      {/* This Session stats */}
      <Text style={styles.sectionTitle}>THIS SESSION</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avgDuration(contractions)}</Text>
          <Text style={styles.statLabel}>Avg duration</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={styles.statValue}>{avgInterval(contractions)}</Text>
          <Text style={styles.statLabel}>Avg interval</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{contractions.length}</Text>
          <Text style={styles.statLabel}>Total count</Text>
        </View>
      </View>

      {/* Recent contractions list */}
      {contractions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>RECENT</Text>
          {contractions.map((c, idx) => (
            <View key={c.id} style={[styles.recentRow, idx === contractions.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.recentLeft}>
                <View style={styles.pinkDot} />
                <View>
                  <Text style={styles.recentTitle}>Contraction {contractions.length - idx}</Text>
                  <Text style={styles.recentSub}>{timeAgo(c.timestamp)}</Text>
                </View>
              </View>
              <Text style={styles.recentDuration}>{c.duration} sec</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ThemeColors.bgCream,
  },
  content: {
    paddingHorizontal: 20,
  },

  freqCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginBottom: 24,
  },
  freqLeft: {
    gap: 2,
  },
  freqLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: ThemeColors.textLight,
  },
  freqValue: {
    fontSize: 17,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  freqCount: {
    fontSize: 13,
    fontWeight: '500',
    color: ThemeColors.textMid,
  },

  ringSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgAbs: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: '700',
    color: ThemeColors.textDark,
    fontVariant: ['tabular-nums'],
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: ThemeColors.textMid,
    marginTop: -4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: RED_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: ThemeRadius.pill,
    marginTop: 8,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RED,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: RED,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: ThemeColors.primary,
    borderRadius: ThemeRadius.button,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: ThemeColors.surface,
  },
  startLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: ThemeColors.primary,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RED,
    borderRadius: ThemeRadius.button,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  stopLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: ThemeColors.white,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: ThemeColors.textLight,
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: ThemeColors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: ThemeColors.textMid,
  },

  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ThemeColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ThemeColors.primary,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  recentSub: {
    fontSize: 12,
    fontWeight: '400',
    color: ThemeColors.textLight,
    marginTop: 2,
  },
  recentDuration: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
})
