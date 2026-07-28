import React, { useCallback } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import { Heart, MessageCircle, Share2, BadgeCheck, Trash2 } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import type { CommunityPost } from '../../types/community'
import { shareCommunityPost } from '../../lib/share-community'

interface CommunityPostCardProps {
  post: CommunityPost
  onPress?: () => void
  onOpenComments?: () => void
  onToggleLike?: () => void
  /** When set with `onDeletePress`, shows delete for the post author */
  isOwnPost?: boolean
  onDeletePress?: () => void
}

export function CommunityPostCard({
  post,
  onPress,
  onOpenComments,
  onToggleLike,
  isOwnPost,
  onDeletePress,
}: CommunityPostCardProps) {
  const userLiked = !!post.userLiked
  const showDelete = !!isOwnPost && !!onDeletePress

  const handleLike = useCallback(() => {
    void onToggleLike?.()
  }, [onToggleLike])

  const handleShare = useCallback(() => {
    void shareCommunityPost({
      body: post.body,
      authorName: post.authorName,
      mediaUri: post.mediaUri,
      mediaType: post.mediaType,
    })
  }, [post])

  const header = (
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{post.authorInitial}</Text>
      </View>
      <View style={styles.headerText}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{post.authorName}</Text>
          {post.verified ? <BadgeCheck size={16} color={ThemeColors.sky} strokeWidth={2} /> : null}
        </View>
        <Text style={styles.time}>{post.timeLabel}</Text>
      </View>
      {showDelete ? (
        <Pressable
          onPress={onDeletePress}
          hitSlop={12}
          accessibilityLabel="Delete post"
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.65 }]}
        >
          <Trash2 size={20} color="#C62828" strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  )

  const bodyBlock = (
    <>
      <Text style={styles.body}>{post.body}</Text>

      {post.mediaUri && post.mediaType === 'image' ? (
        <Image source={{ uri: post.mediaUri }} style={styles.media} resizeMode="cover" />
      ) : null}
      {post.mediaUri && post.mediaType === 'video' ? (
        <View style={styles.videoWrap}>
          <Video
            source={{ uri: post.mediaUri }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted
            useNativeControls={false}
          />
          <View style={styles.videoOverlay}>
            <Text style={styles.videoHint}>Video</Text>
          </View>
        </View>
      ) : null}
    </>
  )

  const actions = (
    <View style={styles.actions}>
      <Pressable
        onPress={handleLike}
        hitSlop={8}
        disabled={!onToggleLike}
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
      >
        <Heart
          size={18}
          color={userLiked ? ThemeColors.primary : ThemeColors.textMid}
          fill={userLiked ? ThemeColors.primary : 'transparent'}
          strokeWidth={2}
        />
        <Text style={styles.actionLabel}>{post.likes}</Text>
      </Pressable>
      <Pressable
        onPress={onOpenComments ?? onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
      >
        <MessageCircle size={18} color={ThemeColors.textMid} strokeWidth={2} />
        <Text style={styles.actionLabel}>{post.commentsCount}</Text>
      </Pressable>
      <Pressable
        onPress={handleShare}
        style={({ pressed }) => [styles.sharePill, pressed && { opacity: 0.85 }]}
      >
        <Share2 size={14} color={ThemeColors.white} strokeWidth={2} />
        <Text style={styles.shareText}>Share</Text>
      </Pressable>
    </View>
  )

  if (onPress) {
    return (
      <View style={[styles.card, { backgroundColor: post.cardBg }]}>
        {header}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [pressed && { opacity: 0.92 }]}
        >
          {bodyBlock}
          {actions}
        </Pressable>
      </View>
    )
  }

  return (
    <View style={[styles.card, { backgroundColor: post.cardBg }]}>
      {header}
      {bodyBlock}
      {actions}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: ThemeRadius.lg,
    padding: 16,
    marginBottom: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  deleteBtn: { padding: 4, marginLeft: 4 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ThemeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: ThemeColors.white },
  headerText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  time: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight, marginTop: 2 },
  body: { fontSize: 15, fontWeight: '400', color: ThemeColors.textDark, lineHeight: 22 },
  media: {
    width: '100%',
    height: 200,
    borderRadius: ThemeRadius.md,
    marginTop: 12,
    backgroundColor: ThemeColors.border,
  },
  videoWrap: { marginTop: 12, borderRadius: ThemeRadius.md, overflow: 'hidden' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 8,
    pointerEvents: 'none',
  },
  videoHint: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '600',
    color: ThemeColors.white,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ThemeRadius.sm,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,15,46,0.08)',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 20 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: ThemeColors.textMid },
  sharePill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ThemeColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ThemeRadius.pill,
  },
  shareText: { fontSize: 13, fontWeight: '700', color: ThemeColors.white },
})
