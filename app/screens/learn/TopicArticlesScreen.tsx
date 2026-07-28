import React, { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronRight, Clock } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { filterArticlesByCategory, type LearnCategoryKey } from '../../data/learn-content'
import type { MainStackParamList } from '../../navigation/MainNavigator'

const TOPIC_TO_CATEGORY: Record<string, LearnCategoryKey> = {
  cycle: 'cycle',
  nutrition: 'nutrition',
  mental: 'mental',
  fertility: 'fertility',
  pregnancy: 'pregnancy',
  supplements: 'nutrition',
}

export function TopicArticlesScreen() {
  const insets = useSafeAreaInsets()
  const route = useRoute<RouteProp<MainStackParamList, 'TopicArticles'>>()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const key = TOPIC_TO_CATEGORY[route.params.topicId] ?? 'all'
  const articles = useMemo(() => filterArticlesByCategory(key), [key])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Articles</Text>
      <Text style={styles.sub}>
        {articles.length === 0 ? 'No guides in this topic yet.' : `${articles.length} guides in this topic`}
      </Text>
      <View style={styles.list}>
        {articles.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => nav.navigate('ArticleDetail', { articleId: a.id })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.body}>
              <Text style={styles.cat}>{a.category}</Text>
              <Text style={styles.rowTitle}>{a.title}</Text>
              <View style={styles.meta}>
                <Clock size={12} color={ThemeColors.textLight} strokeWidth={2} />
                <Text style={styles.metaText}>{a.readMinutes} min</Text>
              </View>
            </View>
            <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  title: { fontSize: 24, fontWeight: '800', color: ThemeColors.textDark },
  sub: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginTop: 4, marginBottom: 16 },
  list: {
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: ThemeColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ThemeColors.border,
    gap: 12,
  },
  body: { flex: 1, gap: 3 },
  cat: {
    fontSize: 11,
    fontWeight: '600',
    color: ThemeColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: ThemeColors.textDark },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, fontWeight: '400', color: ThemeColors.textLight },
})
