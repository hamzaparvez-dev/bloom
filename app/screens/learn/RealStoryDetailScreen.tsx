import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { getStoryById } from '../../data/learn-content'
import type { MainStackParamList } from '../../navigation/MainNavigator'

export function RealStoryDetailScreen() {
  const insets = useSafeAreaInsets()
  const route = useRoute<RouteProp<MainStackParamList, 'RealStoryDetail'>>()
  const story = getStoryById(route.params.storyId)

  if (!story) {
    return (
      <View style={[styles.miss, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missText}>Story not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: story.cardBg }]}>
        <View style={[styles.tag, { backgroundColor: story.tagBg }]}>
          <Text style={[styles.tagText, { color: story.tagColor }]}>{story.tag}</Text>
        </View>
        <Text style={styles.name}>{story.name}'s journey</Text>
      </View>
      <Text style={styles.body}>{story.fullStory}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  miss: { flex: 1, backgroundColor: ThemeColors.bgCream, paddingHorizontal: ThemeSpacing.pagePad },
  missText: { fontSize: 16, color: ThemeColors.textMid },
  hero: { borderRadius: ThemeRadius.lg, padding: 20, marginBottom: 20 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ThemeRadius.pill,
    marginBottom: 12,
  },
  tagText: { fontSize: 12, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: ThemeColors.textDark },
  body: { fontSize: 16, fontWeight: '400', color: ThemeColors.textDark, lineHeight: 26 },
})
