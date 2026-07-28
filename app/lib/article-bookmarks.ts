import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@bloom/article_bookmarks_v1'

export async function getBookmarkedArticleIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function isArticleBookmarked(articleId: string): Promise<boolean> {
  const ids = await getBookmarkedArticleIds()
  return ids.includes(articleId)
}

/** Returns new bookmarked state (true = now bookmarked). */
export async function toggleArticleBookmark(articleId: string): Promise<boolean> {
  const ids = await getBookmarkedArticleIds()
  const has = ids.includes(articleId)
  const next = has ? ids.filter((id) => id !== articleId) : [...ids, articleId]
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return !has
}
