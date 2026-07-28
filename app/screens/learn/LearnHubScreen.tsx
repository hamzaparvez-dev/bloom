import React, { useCallback, useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  BookOpen,
  ChevronRight,
  Clock,
  MessageCircle,
  Search,
  Sparkles,
  Users,
} from 'lucide-react-native'
import { Image } from 'expo-image'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { getImage } from '../../lib/app-images'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import {
  LEARN_ARTICLES,
  LEARN_CATEGORY_CHIPS,
  filterArticlesByCategory,
  type LearnCategoryKey,
} from '../../data/learn-content'

type Nav = NativeStackNavigationProp<MainStackParamList>

export function LearnHubScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<LearnCategoryKey>('all')

  const filtered = useMemo(() => {
    const byCat = filterArticlesByCategory(category)
    const q = query.trim().toLowerCase()
    if (!q) return byCat
    return byCat.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    )
  }, [category, query])

  const featured = LEARN_ARTICLES.slice(0, 2)

  const goArticle = useCallback(
    (id: string) => {
      nav.navigate('ArticleDetail', { articleId: id })
    },
    [nav],
  )

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.subtitle}>Expert articles, guides &amp; community</Text>

      <View style={styles.searchWrap}>
        <Search size={18} color={ThemeColors.textLight} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search articles…"
          placeholderTextColor={ThemeColors.textLight}
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {LEARN_CATEGORY_CHIPS.map((c) => {
          const on = category === c.key
          return (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <Text style={styles.sectionLabel}>Featured</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredRow}
      >
        {featured.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => goArticle(a.id)}
            style={({ pressed }) => [styles.featuredCard, pressed && { opacity: 0.92 }]}
          >
            <View style={[styles.featuredThumb, { backgroundColor: a.accentBg }]}>
              <BookOpen size={28} color={a.accent} strokeWidth={2} />
            </View>
            <Text style={styles.featuredTitle} numberOfLines={3}>
              {a.title}
            </Text>
            <View style={styles.featuredMeta}>
              <Clock size={12} color={ThemeColors.textLight} strokeWidth={2} />
              <Text style={styles.featuredMetaText}>{a.readMinutes} min read</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>Community &amp; stories</Text>
      <View style={styles.dualRow}>
        <Pressable
          onPress={() => nav.navigate('Community')}
          style={({ pressed }) => [styles.dualCard, styles.dualPink, pressed && { opacity: 0.9 }]}
        >
          <Image
            source={getImage('community')}
            style={styles.communityThumb}
            contentFit="cover"
            transition={180}
            accessibilityIgnoresInvertColors
          />
          <Users size={22} color={ThemeColors.primary} strokeWidth={2} />
          <Text style={styles.dualTitle}>Community</Text>
          <Text style={styles.dualSub}>Anonymous · supportive · real</Text>
        </Pressable>
        <Pressable
          onPress={() => nav.navigate('RealStories')}
          style={({ pressed }) => [styles.dualCard, styles.dualLav, pressed && { opacity: 0.9 }]}
        >
          <Sparkles size={22} color={ThemeColors.lavender} strokeWidth={2} />
          <Text style={styles.dualTitle}>Real stories</Text>
          <Text style={styles.dualSub}>Journeys from members</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => nav.navigate('AskExpert')}
        style={({ pressed }) => [styles.expertBanner, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.expertIcon}>
          <MessageCircle size={20} color={ThemeColors.textDark} strokeWidth={2} />
        </View>
        <View style={styles.expertBody}>
          <Text style={styles.expertTitle}>Ask Bloom</Text>
          <Text style={styles.expertSub}>AI companion · email a specialist anytime</Text>
        </View>
        <ChevronRight size={20} color={ThemeColors.textLight} strokeWidth={2} />
      </Pressable>

      <Pressable
        onPress={() => nav.navigate('CategoryBrowse')}
        style={({ pressed }) => [styles.browseRow, pressed && { opacity: 0.75 }]}
      >
        <Text style={styles.browseTitle}>Browse topics</Text>
        <ChevronRight size={18} color={ThemeColors.primary} strokeWidth={2} />
      </Pressable>

      <Text style={styles.sectionLabel}>Latest articles</Text>
      <View style={styles.articleList}>
        {filtered.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => goArticle(a.id)}
            style={({ pressed }) => [styles.articleRow, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.articleBody}>
              <Text style={styles.articleCategory}>{a.category}</Text>
              <Text style={styles.articleTitle}>{a.title}</Text>
              <View style={styles.articleMeta}>
                <Clock size={12} color={ThemeColors.textLight} strokeWidth={2} />
                <Text style={styles.articleMetaText}>{a.readMinutes} min</Text>
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
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  subtitle: { fontSize: 14, fontWeight: '500', color: ThemeColors.textMid, marginTop: 4, marginBottom: 16 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '400', color: ThemeColors.textDark, padding: 0 },

  chipsRow: { gap: 8, paddingBottom: 16, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ThemeRadius.pill,
    backgroundColor: ThemeColors.surface,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  chipOn: { backgroundColor: ThemeColors.primary, borderColor: ThemeColors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid },
  chipTextOn: { color: ThemeColors.white },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textLight,
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  featuredRow: { gap: 12, paddingBottom: 20 },
  featuredCard: {
    width: 220,
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  featuredThumb: {
    width: '100%',
    height: 100,
    borderRadius: ThemeRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featuredTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, lineHeight: 21 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  featuredMetaText: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight },

  dualRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  dualCard: {
    flex: 1,
    borderRadius: ThemeRadius.card,
    padding: 14,
    minHeight: 110,
    gap: 6,
  },
  dualPink: { backgroundColor: ThemeColors.pinkSurface },
  dualLav: { backgroundColor: '#F0EAFF' },
  communityThumb: {
    width: '100%',
    height: 72,
    borderRadius: ThemeRadius.md,
    marginBottom: 4,
    backgroundColor: ThemeColors.surface,
  },
  dualTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  dualSub: { fontSize: 12, fontWeight: '500', color: ThemeColors.textMid, lineHeight: 16 },

  expertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ThemeColors.orangeBg,
    borderRadius: ThemeRadius.card,
    padding: 14,
    marginBottom: 12,
  },
  expertIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ThemeColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expertBody: { flex: 1 },
  expertTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  expertSub: { fontSize: 12, fontWeight: '500', color: ThemeColors.textMid, marginTop: 2 },

  browseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginBottom: 8,
  },
  browseTitle: { fontSize: 17, fontWeight: '700', color: ThemeColors.textDark },

  articleList: {
    borderRadius: ThemeRadius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    marginBottom: 8,
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: ThemeColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ThemeColors.border,
    gap: 12,
  },
  articleBody: { flex: 1, gap: 3 },
  articleCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: ThemeColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  articleTitle: { fontSize: 15, fontWeight: '600', color: ThemeColors.textDark },
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  articleMetaText: { fontSize: 12, fontWeight: '400', color: ThemeColors.textLight },
})
