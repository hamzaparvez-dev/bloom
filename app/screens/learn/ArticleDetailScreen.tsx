import React, { useCallback, useLayoutEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bookmark, Clock } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { ARTICLE_BODIES, getArticleById } from '../../data/learn-content'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { isArticleBookmarked, toggleArticleBookmark } from '../../lib/article-bookmarks'

export function ArticleDetailScreen() {
  const insets = useSafeAreaInsets()
  const route = useRoute<RouteProp<MainStackParamList, 'ArticleDetail'>>()
  const nav = useNavigation()
  const article = getArticleById(route.params.articleId)
  const body = article ? ARTICLE_BODIES[article.id] ?? article.excerpt : ''
  const [bookmarked, setBookmarked] = useState(false)

  const refreshBookmark = useCallback(() => {
    if (!article) return
    void isArticleBookmarked(article.id).then(setBookmarked)
  }, [article])

  useFocusEffect(
    useCallback(() => {
      refreshBookmark()
    }, [refreshBookmark]),
  )

  useLayoutEffect(() => {
    if (!article) return
    nav.setOptions({
      headerRight: () => (
        <Pressable
          hitSlop={12}
          onPress={() => {
            void (async () => {
              try {
                const next = await toggleArticleBookmark(article.id)
                setBookmarked(next)
              } catch {
                Alert.alert('Bookmarks', 'Could not update bookmark.')
              }
            })()
          }}
          style={{ marginRight: 8 }}
        >
          <Bookmark
            size={22}
            color={bookmarked ? ThemeColors.primary : ThemeColors.textDark}
            strokeWidth={2}
            fill={bookmarked ? ThemeColors.primary : 'transparent'}
          />
        </Pressable>
      ),
    })
  }, [nav, article, bookmarked])

  if (!article) {
    return (
      <View style={[styles.miss, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missText}>Article not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: article.accentBg }]}>
        <Text style={[styles.heroLabel, { color: article.accent }]}>{article.category}</Text>
        <Text style={styles.title}>{article.title}</Text>
        <View style={styles.meta}>
          <Clock size={14} color={ThemeColors.textMid} strokeWidth={2} />
          <Text style={styles.metaText}>{article.readMinutes} min read</Text>
        </View>
      </View>
      <View style={styles.bodyBlock}>
        {body.split('\n').map((line, i) => {
          if (line.trim() === '') return <View key={i} style={styles.lineSpacer} />
          const isBullet = line.trimStart().startsWith('•')
          const isHeading =
            line.endsWith(':') && !isBullet && line.length < 48 && !line.includes('. ')
          return (
            <Text
              key={i}
              style={[styles.line, isBullet && styles.bullet, isHeading && styles.headingLine]}
            >
              {line}
            </Text>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  miss: { flex: 1, backgroundColor: ThemeColors.bgCream, paddingHorizontal: ThemeSpacing.pagePad },
  missText: { fontSize: 16, color: ThemeColors.textMid },
  hero: {
    borderRadius: ThemeRadius.lg,
    padding: 20,
    marginBottom: 20,
  },
  heroLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: ThemeColors.textDark, lineHeight: 30 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  metaText: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid },
  bodyBlock: { marginTop: 4 },
  lineSpacer: { height: 10 },
  line: {
    fontSize: 16,
    fontWeight: '400',
    color: ThemeColors.textDark,
    lineHeight: 24,
    marginBottom: 4,
  },
  bullet: { paddingLeft: 8 },
  headingLine: { fontWeight: '700', fontSize: 17, marginTop: 8, marginBottom: 4 },
})
