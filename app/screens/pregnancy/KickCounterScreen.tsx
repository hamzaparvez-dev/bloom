import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format } from 'date-fns'
import Svg, { Circle } from 'react-native-svg'
import { Clock, RotateCcw, Check } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { getActivePregnancyId } from '../../lib/active-pregnancy'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'

const PURPLE = '#8B5CF6'
const RING_SIZE = 220
const RING_STROKE = 10
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_R
const KICK_GOAL = 10
const SESSION_TOTAL = 5

interface KickCounterScreenProps {
  onBack?: () => void
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function KickCounterScreen({ onBack }: KickCounterScreenProps) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [kicks, setKicks] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [sessionNumber, setSessionNumber] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef(Date.now())

  const startTimer = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    sessionStartRef.current = Date.now()
    startTimer()
    return stopTimer
  }, [startTimer, stopTimer])

  const handleTap = useCallback(() => {
    setKicks((prev) => prev + 1)
  }, [])

  const handleReset = useCallback(() => {
    setKicks(0)
    setElapsed(0)
    sessionStartRef.current = Date.now()
    stopTimer()
    startTimer()
  }, [stopTimer, startTimer])

  const handleDone = useCallback(() => {
    stopTimer()
    const uid = user?.id
    const kicksNow = kicks
    const elapsedNow = elapsed
    const startIso = new Date(sessionStartRef.current).toISOString()
    const endIso = new Date().toISOString()
    const dateStr = format(new Date(), 'yyyy-MM-dd')

    void (async () => {
      if (uid && kicksNow > 0) {
        const pregnancyId = await getActivePregnancyId(uid)
        if (!pregnancyId) {
          Alert.alert(
            'Pregnancy profile',
            'Add an active pregnancy in your journey settings to save kick sessions.',
          )
        } else {
          const { error } = await supabase.from('kick_sessions').insert({
            user_id: uid,
            pregnancy_id: pregnancyId,
            date: dateStr,
            start_time: startIso,
            end_time: endIso,
            count: kicksNow,
            duration_minutes: Math.max(1, Math.round(elapsedNow / 60)),
          })
          if (error) Alert.alert('Could not save', error.message)
        }
      }

      if (sessionNumber < SESSION_TOTAL) {
        setSessionNumber((prev) => prev + 1)
        setKicks(0)
        setElapsed(0)
        sessionStartRef.current = Date.now()
        startTimer()
      } else {
        onBack?.()
      }
    })()
  }, [stopTimer, startTimer, sessionNumber, onBack, user?.id, kicks, elapsed])

  const progress = Math.min(kicks / KICK_GOAL, 1)
  const progressBarWidth = `${progress * 100}%` as const

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitleLeft}>Kick counter</Text>
        <Text style={styles.subtitleRight}>Goal: {KICK_GOAL} kicks in 2 hours</Text>
      </View>

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
                stroke={PURPLE}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_CIRC}`}
                strokeDashoffset={RING_CIRC * (1 - progress)}
              />
            </Svg>
          </View>
          <View style={styles.ringCenter}>
            <Text style={styles.kickCount}>{kicks}</Text>
            <Text style={styles.kickLabel}>of {KICK_GOAL} kicks</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressBarWidth }]} />
      </View>

      <View style={styles.timerPill}>
        <Clock size={16} color={ThemeColors.textMid} strokeWidth={2} />
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
      </View>

      <View style={styles.tapSection}>
        <Pressable onPress={handleTap} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <View style={styles.tapOuter}>
            <View style={styles.tapMid}>
              <View style={styles.tapInner}>
                <Text style={styles.tapLabel}>TAP</Text>
              </View>
            </View>
          </View>
        </Pressable>
        <Text style={styles.helperText}>Tap each time baby moves</Text>
      </View>

      <View style={styles.bottomRow}>
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <RotateCcw size={16} color={ThemeColors.textMid} strokeWidth={2} />
          <Text style={styles.resetLabel}>Reset</Text>
        </Pressable>

        <Text style={styles.sessionLabel}>
          Session {sessionNumber} of {SESSION_TOTAL} today
        </Text>

        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [styles.doneBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Check size={16} color={ThemeColors.white} strokeWidth={2.5} />
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
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

  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitleLeft: {
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  subtitleRight: {
    fontSize: 13,
    fontWeight: '400',
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
  kickCount: {
    fontSize: 56,
    fontWeight: '800',
    color: PURPLE,
  },
  kickLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: ThemeColors.textMid,
    marginTop: -4,
  },

  progressTrack: {
    height: 6,
    backgroundColor: ThemeColors.border,
    borderRadius: ThemeRadius.pill,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: ThemeColors.primary,
    borderRadius: ThemeRadius.pill,
  },

  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: ThemeColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: ThemeRadius.pill,
    gap: 8,
    marginBottom: 32,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: ThemeColors.textDark,
    fontVariant: ['tabular-nums'],
  },

  tapSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  tapOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: ThemeColors.pinkSurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapMid: {
    width: 134,
    height: 134,
    borderRadius: 67,
    backgroundColor: '#FDE4EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: ThemeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: ThemeColors.white,
    letterSpacing: 2,
  },
  helperText: {
    fontSize: 13,
    fontWeight: '400',
    color: ThemeColors.textLight,
    marginTop: 16,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    borderRadius: ThemeRadius.button,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: ThemeColors.surface,
  },
  resetLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textMid,
  },
  sessionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: ThemeColors.textLight,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ThemeColors.primary,
    borderRadius: ThemeRadius.button,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.white,
  },
})
