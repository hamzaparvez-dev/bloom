import React, { useState } from 'react'
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const FAQ = [
  {
    q: 'How accurate are cycle predictions?',
    a: 'Predictions improve as you log more cycles. They are estimates only — not a substitute for medical guidance.',
  },
  {
    q: 'Can I use Bloom while pregnant?',
    a: 'Yes. Switch your journey to Pregnancy in Profile to see week-by-week tools and hide period predictions.',
  },
  {
    q: 'Is my data private?',
    a: 'Health data you log stays associated with your account. Review Data & Privacy in Profile for export and deletion options.',
  },
]

export function HelpCenterScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const [open, setOpen] = useState<number | null>(0)

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen((c) => (c === i ? null : i))
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>Common questions about Bloom.</Text>
      {FAQ.map((item, i) => {
        const expanded = open === i
        return (
          <View key={item.q} style={styles.card}>
            <Pressable onPress={() => toggle(i)} style={({ pressed }) => [styles.qRow, pressed && { opacity: 0.75 }]}>
              <Text style={styles.q}>{item.q}</Text>
              <ChevronDown
                size={20}
                color={ThemeColors.textLight}
                strokeWidth={2}
                style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
              />
            </Pressable>
            {expanded ? <Text style={styles.a}>{item.a}</Text> : null}
          </View>
        )
      })}
      <Text style={styles.sectionFoot}>Account</Text>
      <Pressable
        onPress={() =>
          Alert.alert(
            'Signing in to Bloom',
            'Bloom uses a 6-digit email code (and optional Google). There is no password to reset. Sign out from Profile, then use “Already using Bloom? Sign in” on the welcome screen to request a new code.',
          )
        }
        style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.75 }]}
      >
        <Text style={styles.linkLabel}>How do I sign in again?</Text>
        <ChevronRight size={18} color={ThemeColors.textLight} strokeWidth={2} />
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  intro: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, marginBottom: 16, lineHeight: 22 },
  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  q: { flex: 1, fontSize: 16, fontWeight: '600', color: ThemeColors.textDark },
  a: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22, paddingBottom: 14 },
  sectionFoot: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textLight,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  linkLabel: { fontSize: 16, fontWeight: '600', color: ThemeColors.primary },
})
