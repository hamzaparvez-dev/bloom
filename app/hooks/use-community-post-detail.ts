import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import {
  addCommunityReply,
  deleteCommunityPost,
  fetchCommunityPostDetail,
  toggleCommunityPostLike,
} from '../lib/community'
import { useAuth } from '../providers/AuthProvider'
import type { CommunityPost } from '../types/community'

export function useCommunityPostDetail(postId: string) {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const uid = user?.id
    if (!uid || !postId) {
      setPost(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { post: p, error: err } = await fetchCommunityPostDetail(postId, uid)
    setPost(p)
    setError(err)
    setLoading(false)
  }, [user?.id, postId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const sendReply = useCallback(
    async (body: string) => {
      const uid = user?.id
      if (!uid) return { error: 'Sign in required' }
      const { error: e } = await addCommunityReply(postId, uid, body)
      if (!e) await refresh()
      return { error: e }
    },
    [postId, user?.id, refresh],
  )

  const toggleLike = useCallback(async () => {
    if (!post || !user?.id) return
    const was = !!post.userLiked
    setPost((p) =>
      p
        ? {
            ...p,
            userLiked: !was,
            likes: Math.max(0, p.likes + (was ? -1 : 1)),
          }
        : p,
    )
    const { error: e } = await toggleCommunityPostLike(post.id, user.id, was)
    if (e) void refresh()
  }, [post, user?.id, refresh])

  const deletePost = useCallback(async () => {
    if (!post) return { error: 'Nothing to delete.' }
    const { error } = await deleteCommunityPost({
      postId: post.id,
      mediaPublicUrl: post.mediaUri,
    })
    if (!error) navigation.goBack()
    return { error }
  }, [post, navigation])

  return { post, loading, error, refresh, sendReply, toggleLike, deletePost }
}
