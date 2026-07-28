import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronRight } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { REAL_STORIES } from '../../data/learn-content'
import type { MainStackParamList } from '../../navigation/MainNavigator'

type Nav = NativeStackNavigationProp<MainStackParamList>

export function RealStoriesScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Real stories</Text>
      <Text style={styles.sub}>Pregnancy &amp; fertility journeys</Text>
      {REAL_STORIES.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => nav.navigate('RealStoryDetail', { storyId: s.id })}
          style={({ pressed }) => [styles.card, { backgroundColor: s.cardBg }, pressed && { opacity: 0.95 }]}
        >
          <View style={[styles.tag, { backgroundColor: s.tagBg }]}>
            <Text style={[styles.tagText, { color: s.tagColor }]}>{s.tag}</Text>
          </View>
          <Text style={styles.name}>{s.name}</Text>
          <Text style={styles.summary}>{s.summary}</Text>
          <View style={styles.row}>
            <Text style={styles.link}>Read full story</Text>
            <ChevronRight size={16} color={ThemeColors.primary} strokeWidth={2} />
          </View>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  title: { fontSize: 26, fontWeight: '800', color: ThemeColors.textDark },
  sub: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginTop: 4, marginBottom: 20 },
  card: {
    borderRadius: ThemeRadius.lg,
    padding: 18,
    marginBottom: 14,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ThemeRadius.pill,
    marginBottom: 10,
  },
  tagText: { fontSize: 12, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 6 },
  summary: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 4 },
  link: { fontSize: 15, fontWeight: '700', color: ThemeColors.primary },
})
