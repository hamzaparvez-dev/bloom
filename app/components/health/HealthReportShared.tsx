import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Brain, Check, Download, Leaf, RefreshCw, Share2 } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'

export interface HealthReportSectionData {
  title: string
  icon: LucideIcon
  iconColor: string
  bullets: string[]
}

export const DEFAULT_HEALTH_REPORT_SECTIONS: HealthReportSectionData[] = [
  {
    title: 'Cycle health',
    icon: RefreshCw,
    iconColor: ThemeColors.primary,
    bullets: [
      'Avg length 27.7 days',
      'Regularity 95% — excellent',
      'Ovulation confirmed monthly',
    ],
  },
  {
    title: 'Symptoms',
    icon: Brain,
    iconColor: ThemeColors.lavender,
    bullets: [
      'Top: Fatigue — 87% of cycles',
      'Cramps: moderate day 1–2',
      'No alarming patterns noted',
    ],
  },
  {
    title: 'Fertility',
    icon: Leaf,
    iconColor: '#10B981',
    bullets: [
      'OPK positives: 4/6 cycles',
      'Cervical mucus: regular',
      'BBT temperature shift confirmed',
    ],
  },
]

interface HealthReportCardProps {
  patientLine: string
  periodLine: string
  sections?: HealthReportSectionData[]
  extraBody?: string
}

export function HealthReportCard({
  patientLine,
  periodLine,
  sections = DEFAULT_HEALTH_REPORT_SECTIONS,
  extraBody,
}: HealthReportCardProps) {
  return (
    <View style={cardStyles.wrap}>
      <Text style={cardStyles.patient}>{patientLine}</Text>
      <Text style={cardStyles.period}>{periodLine}</Text>
      <View style={cardStyles.hr} />

      {sections.map((sec, idx) => {
        const Icon = sec.icon
        return (
          <React.Fragment key={sec.title}>
            {idx > 0 ? <View style={cardStyles.hr} /> : null}
            <View style={cardStyles.sectionHead}>
              <Icon size={16} color={sec.iconColor} strokeWidth={2} />
              <Text style={cardStyles.sectionTitle}>{sec.title}</Text>
            </View>
            {sec.bullets.map((b, bi) => (
              <View key={`${sec.title}-${bi}`} style={cardStyles.bulletRow}>
                <Check size={14} color={ThemeColors.mint} strokeWidth={2.5} />
                <Text style={cardStyles.bulletText}>{b}</Text>
              </View>
            ))}
          </React.Fragment>
        )
      })}

      {extraBody ? (
        <>
          <View style={cardStyles.hr} />
          <Text style={cardStyles.extra}>{extraBody}</Text>
        </>
      ) : null}
    </View>
  )
}

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.lg,
    padding: 20,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  patient: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  period: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, marginTop: 4 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: ThemeColors.border, marginVertical: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: ThemeColors.textDark },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, paddingLeft: 2 },
  bulletText: { flex: 1, fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 20 },
  extra: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22 },
})

type Accent = 'lavender' | 'primary'

interface HealthReportActionsProps {
  accent?: Accent
  onShare?: () => void
  onDownload?: () => void
}

export function HealthReportActions({ accent = 'lavender', onShare, onDownload }: HealthReportActionsProps) {
  const primaryBg = accent === 'lavender' ? ThemeColors.lavender : ThemeColors.primary
  const secondaryColor = accent === 'lavender' ? ThemeColors.lavender : ThemeColors.primary

  return (
    <>
      <Pressable
        onPress={onShare}
        style={({ pressed }) => [actionStyles.primary, { backgroundColor: primaryBg }, pressed && { opacity: 0.88 }]}
      >
        <Share2 size={18} color={ThemeColors.white} strokeWidth={2} />
        <Text style={actionStyles.primaryText}>Share PDF with doctor</Text>
      </Pressable>
      <Pressable
        onPress={onDownload}
        style={({ pressed }) => [actionStyles.secondary, pressed && { opacity: 0.75 }]}
      >
        <Download size={18} color={secondaryColor} strokeWidth={2} />
        <Text style={[actionStyles.secondaryText, { color: secondaryColor }]}>Download PDF</Text>
      </Pressable>
    </>
  )
}

const actionStyles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: ThemeRadius.button,
    paddingVertical: 16,
    marginBottom: 12,
  },
  primaryText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: ThemeRadius.button,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
    backgroundColor: ThemeColors.surface,
  },
  secondaryText: { fontSize: 16, fontWeight: '600' },
})
