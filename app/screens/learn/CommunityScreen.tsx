import React, { useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Flower2, Plus } from 'lucide-react-native'
import { CommunityPostCard } from '../../components/learn/CommunityPostCard'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { useCommunityFeed } from '../../hooks/use-community-feed'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { useAuth } from '../../providers/AuthProvider'
import type { CommunityPost } from '../../types/community'

type Nav = NativeStackNavigationProp<MainStackParamList>

export function CommunityScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()
  const { user } = useAuth()
  const { posts, loading, error, refresh, toggleLike, deletePostFromFeed } = useCommunityFeed()

  const confirmDeletePost = useCallback(
    (item: CommunityPost) => {
      Alert.alert('Delete this post?', 'Replies will be removed. This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              const { error: delErr } = await deletePostFromFeed(item)
              if (delErr) Alert.alert('Could not delete', delErr)
            })(),
        },
      ])
    },
    [deletePostFromFeed],
  )

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <CommunityPostCard
        post={item}
        onPress={() => nav.navigate('PostDetail', { postId: item.id })}
        onOpenComments={() => nav.navigate('PostDetail', { postId: item.id })}
        onToggleLike={() => void toggleLike(item.id)}
        isOwnPost={user?.id === item.authorUserId}
        onDeletePress={() => confirmDeletePost(item)}
      />
    ),
    [nav, toggleLike, user?.id, confirmDeletePost],
  )

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Flower2 size={22} color={ThemeColors.primary} strokeWidth={2} />
          <View>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>Anonymous · Supportive · Real stories</Text>
          </View>
        </View>
        <Pressable
          onPress={() => nav.navigate('CreateCommunityPost')}
          style={({ pressed }) => [styles.postBtn, pressed && { opacity: 0.88 }]}
        >
          <Plus size={18} color={ThemeColors.white} strokeWidth={2.5} />
          <Text style={styles.postBtnText}>Post</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={styles.banner}>{error}</Text>
      ) : null}

      {loading && posts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={ThemeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={loading && posts.length > 0} onRefresh={() => void refresh()} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No posts yet. Share your story or ask a question.</Text>
          }
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: ThemeSpacing.pagePad,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, paddingRight: 8 },
  title: { fontSize: 22, fontWeight: '800', color: ThemeColors.textDark },
  subtitle: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight, marginTop: 2 },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ThemeColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: ThemeRadius.pill,
  },
  postBtnText: { fontSize: 14, fontWeight: '700', color: ThemeColors.white },
  list: { paddingHorizontal: ThemeSpacing.pagePad },
  center: { paddingTop: 48, alignItems: 'center' },
  empty: {
    textAlign: 'center',
    color: ThemeColors.textMid,
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  banner: {
    marginHorizontal: ThemeSpacing.pagePad,
    marginBottom: 8,
    color: ThemeColors.peach,
    fontSize: 14,
    fontWeight: '500',
  },
})
