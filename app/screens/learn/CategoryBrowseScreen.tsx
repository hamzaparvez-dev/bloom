import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Apple, Baby, Brain, Droplets, Pill, Sprout } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { BROWSE_TOPICS, type BrowseTopic } from '../../data/learn-content'
import type { MainStackParamList } from '../../navigation/MainNavigator'

const ICONS: Record<BrowseTopic['icon'], LucideIcon> = {
  droplets: Droplets,
  apple: Apple,
  brain: Brain,
  sprout: Sprout,
  baby: Baby,
  pill: Pill,
}

type Nav = NativeStackNavigationProp<MainStackParamList>

export function CategoryBrowseScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Browse topics</Text>
      <Text style={styles.sub}>Pick a topic to see related guides</Text>
      <View style={styles.grid}>
        {BROWSE_TOPICS.map((t) => {
          const Icon = ICONS[t.icon]
          return (
            <Pressable
              key={t.id}
              onPress={() => nav.navigate('TopicArticles', { topicId: t.id })}
              style={({ pressed }) => [styles.card, { backgroundColor: t.bg }, pressed && { opacity: 0.92 }]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${t.fg}18` }]}>
                <Icon size={26} color={t.fg} strokeWidth={2} />
              </View>
              <Text style={[styles.cardTitle, { color: t.fg }]}>{t.title}</Text>
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  title: { fontSize: 26, fontWeight: '800', color: ThemeColors.textDark },
  sub: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%' as const,
    borderRadius: ThemeRadius.card,
    padding: 18,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
})
