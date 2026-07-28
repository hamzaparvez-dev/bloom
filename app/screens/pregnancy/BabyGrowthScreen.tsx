import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Line } from 'react-native-svg'
import {
  Baby,
  ChevronLeft,
  ChevronRight,
  CircleDot,
} from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

const PURPLE = '#8B5CF6'
const PURPLE_LIGHT = '#EDE9FE'

const RULER_HEIGHT = 120
const RULER_TICK_COUNT = 12

interface BabyGrowthScreenProps {
  onBack?: () => void
}

export function BabyGrowthScreen({ onBack }: BabyGrowthScreenProps) {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header area */}
      <View style={styles.heroArea}>
        <View style={styles.babyCircle}>
          <Baby size={48} color={PURPLE} strokeWidth={1.4} />
        </View>

        {/* Ruler visualization */}
        <View style={styles.rulerWrap}>
          <Svg width={24} height={RULER_HEIGHT}>
            <Line
              x1={12}
              y1={0}
              x2={12}
              y2={RULER_HEIGHT}
              stroke={PURPLE}
              strokeWidth={1.5}
            />
            {Array.from({ length: RULER_TICK_COUNT + 1 }).map((_, i) => {
              const y = (i / RULER_TICK_COUNT) * RULER_HEIGHT
              const isMajor = i % 3 === 0
              return (
                <Line
                  key={i}
                  x1={isMajor ? 4 : 8}
                  y1={y}
                  x2={20}
                  y2={y}
                  stroke={PURPLE}
                  strokeWidth={isMajor ? 1.5 : 0.8}
                  strokeOpacity={isMajor ? 1 : 0.5}
                />
              )
            })}
          </Svg>
          <Text style={styles.rulerLabel}>30 cm</Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.mainTitle}>Size of a Corn on the Cob</Text>
        <Text style={styles.mainSubtitle}>Length · Weight · Development</Text>
      </View>

      {/* Measurement cards */}
      <View style={styles.measureRow}>
        <MeasurementCard value="30 cm" label="Crown to heel" />
        <MeasurementCard value="~600g" label="Weight" />
        <MeasurementCard value="Wk 24" label="Gestation" />
      </View>

      {/* Development highlights */}
      <Text style={styles.sectionHeader}>Development highlights</Text>
      <View style={styles.highlightsCard}>
        <BulletItem text="Lungs rapidly developing alveoli" />
        <BulletItem text="Brain growth accelerating significantly" />
        <BulletItem text="Taste buds forming on tongue" />
        <BulletItem text="Can recognize familiar voices" />
      </View>

      {/* Week navigation */}
      <View style={styles.weekNav}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.weekBtn, pressed && { opacity: 0.6 }]}
        >
          <ChevronLeft size={18} color={PURPLE} strokeWidth={2} />
          <Text style={styles.weekBtnText}>Week 23</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.weekBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.weekBtnText}>Week 25</Text>
          <ChevronRight size={18} color={PURPLE} strokeWidth={2} />
        </Pressable>
      </View>
    </ScrollView>
  )
}

interface MeasurementCardProps {
  value: string
  label: string
}

const MeasurementCard = React.memo(function MeasurementCard({
  value,
  label,
}: MeasurementCardProps) {
  return (
    <View style={styles.measureCard}>
      <Text style={styles.measureValue}>{value}</Text>
      <Text style={styles.measureLabel}>{label}</Text>
    </View>
  )
})

interface BulletItemProps {
  text: string
}

const BulletItem = React.memo(function BulletItem({ text }: BulletItemProps) {
  return (
    <View style={styles.bulletRow}>
      <CircleDot size={14} color={PURPLE} strokeWidth={2} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  heroArea: {
    alignItems: 'center',
    backgroundColor: ThemeColors.pinkSurface,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  babyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: PURPLE,
  },
  rulerWrap: {
    alignItems: 'center',
    gap: 8,
  },
  rulerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: PURPLE,
  },

  titleBlock: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ThemeColors.textDark,
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: ThemeColors.textMid,
    marginTop: 4,
  },

  measureRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  measureCard: {
    flex: 1,
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: PURPLE_LIGHT,
  },
  measureValue: {
    fontSize: 18,
    fontWeight: '800',
    color: PURPLE,
  },
  measureLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: ThemeColors.textMid,
  },

  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: ThemeColors.textDark,
    marginBottom: 12,
  },
  highlightsCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    gap: 16,
    marginBottom: 32,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulletText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textDark,
    lineHeight: 22,
  },

  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  weekBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: PURPLE,
  },
})
