import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { deleteCommunityPost, fetchCommunityPosts, toggleCommunityPostLike } from '../lib/community'
import { useAuth } from '../providers/AuthProvider'
import type { CommunityPost } from '../types/community'

export function useCommunityFeed() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setPosts([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    const { posts: next, error: err } = await fetchCommunityPosts(uid)
    setPosts(next)
    setError(err)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void refresh()
    })
    return unsub
  }, [navigation, refresh])

  const deletePostFromFeed = useCallback(async (post: CommunityPost) => {
    const { error } = await deleteCommunityPost({
      postId: post.id,
      mediaPublicUrl: post.mediaUri,
    })
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== post.id))
    return { error }
  }, [])

  const toggleLike = useCallback(
    async (postId: string) => {
      const uid = user?.id
      if (!uid) return
      let was = false
      let found = false
      setPosts((prev) => {
        const cur = prev.find((p) => p.id === postId)
        if (!cur) return prev
        found = true
        was = !!cur.userLiked
        return prev.map((p) =>
          p.id === postId
            ? { ...p, userLiked: !was, likes: Math.max(0, p.likes + (was ? -1 : 1)) }
            : p,
        )
      })
      if (!found) return
      const { error: e } = await toggleCommunityPostLike(postId, uid, was)
      if (e) void refresh()
    },
    [user?.id, refresh],
  )

  return { posts, loading, error, refresh, toggleLike, deletePostFromFeed }
}
