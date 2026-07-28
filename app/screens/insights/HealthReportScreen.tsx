import React, { useCallback, useMemo } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { Brain, Leaf, RefreshCw } from 'lucide-react-native'
import { HealthReportActions, HealthReportCard, type HealthReportSectionData } from '../../components/health/HealthReportShared'
import { ThemeColors, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { useAuth } from '../../providers/AuthProvider'
import { useHealthReport } from '../../hooks/use-health-report'
import type { HealthReportBullets } from '../../lib/health-report-engine'

const FULL_EXTRA =
  'Recommendations\n• Keep logging symptoms and cycle data each month.\n• Bring this report to your annual visit or if cycles change suddenly.\n• Discuss persistent fatigue or pain with your care provider.'

function bulletsToSections(b: HealthReportBullets): HealthReportSectionData[] {
  return [
    {
      title: 'Cycle health',
      icon: RefreshCw,
      iconColor: ThemeColors.primary,
      bullets: b.cycle,
    },
    {
      title: 'Symptoms',
      icon: Brain,
      iconColor: ThemeColors.lavender,
      bullets: b.symptoms,
    },
    {
      title: 'Fertility',
      icon: Leaf,
      iconColor: '#10B981',
      bullets: b.fertility,
    },
  ]
}

function shareMessage(patientLine: string, periodLine: string, b: HealthReportBullets): string {
  const body = [...b.cycle, '', ...b.symptoms, '', ...b.fertility].join('\n')
  return `${patientLine}\n${periodLine}\n\n${body}`
}

export function HealthReportScreen() {
  const insets = useSafeAreaInsets()
  const route = useRoute<RouteProp<MainStackParamList, 'HealthReport'>>()
  const detailLevel = route.params?.detailLevel ?? 'full'
  const isFull = detailLevel === 'full'
  const { user } = useAuth()
  const { loading, error, patientLine, periodLine, bullets, reload } = useHealthReport()

  const sections = useMemo(() => (bullets ? bulletsToSections(bullets) : undefined), [bullets])

  const onShare = useCallback(async () => {
    if (!bullets) {
      Alert.alert('Nothing to share', 'Open this screen again once your report has finished loading.')
      return
    }
    try {
      await Share.share({ message: shareMessage(patientLine, periodLine, bullets) })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not open the share sheet.'
      Alert.alert('Share failed', msg)
    }
  }, [bullets, patientLine, periodLine])

  const onDownload = useCallback(() => {
    Alert.alert('Download PDF', 'PDF export will be available in a future update. Use Share to send a text summary for now.')
  }, [])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + ThemeSpacing.inlineGap, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{isFull ? 'Full health report' : 'Health report'}</Text>
      <Text style={styles.subtitle}>
        {isFull ? 'Share-ready PDF for your doctor' : 'Export-ready summary for your doctor'}
      </Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ThemeColors.primary} />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
          <Pressable onPress={() => void reload()} style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!user?.id && !loading ? (
        <Text style={styles.hint}>Sign in to build a health report from your real cycle, symptom, and fertility logs.</Text>
      ) : null}

      {user?.id && !loading && !error && bullets ? (
        <View style={styles.cardWrap}>
          <HealthReportCard
            patientLine={patientLine}
            periodLine={periodLine}
            sections={sections}
            extraBody={isFull ? FULL_EXTRA : undefined}
          />
        </View>
      ) : null}

      {user?.id && !loading && !error && bullets ? (
        <HealthReportActions accent="primary" onShare={onShare} onDownload={onDownload} />
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  subtitle: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginTop: 6, marginBottom: ThemeSpacing.cardPad },
  cardWrap: { marginBottom: ThemeSpacing.cardPad },
  centered: { paddingVertical: ThemeSpacing.sectionGap, alignItems: 'center' },
  banner: {
    backgroundColor: ThemeColors.surface,
    borderRadius: 16,
    padding: ThemeSpacing.cardPad,
    marginBottom: ThemeSpacing.itemGap,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  bannerText: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, marginBottom: ThemeSpacing.itemGap },
  retry: { alignSelf: 'flex-start' },
  retryText: { fontSize: 15, fontWeight: '700', color: ThemeColors.primary },
  hint: {
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textMid,
    lineHeight: 22,
    marginBottom: ThemeSpacing.itemGap,
  },
})
