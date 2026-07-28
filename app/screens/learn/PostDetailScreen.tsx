import React, { useCallback, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { Send } from 'lucide-react-native'
import { CommunityPostCard } from '../../components/learn/CommunityPostCard'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { useCommunityPostDetail } from '../../hooks/use-community-post-detail'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { useAuth } from '../../providers/AuthProvider'

export function PostDetailScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const route = useRoute<RouteProp<MainStackParamList, 'PostDetail'>>()
  const postId = route.params.postId
  const { user } = useAuth()
  const { post, loading, error: loadError, sendReply, toggleLike, deletePost } = useCommunityPostDetail(postId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const runDelete = useCallback(async () => {
    const { error: delErr } = await deletePost()
    if (delErr) Alert.alert('Could not delete', delErr)
  }, [deletePost])

  useLayoutEffect(() => {
    const isOwner = !!(post && user?.id && user.id === post.authorUserId)
    if (!isOwner) {
      navigation.setOptions({ headerRight: undefined })
      return
    }
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() =>
            Alert.alert('Delete this post?', 'Replies will be removed. This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => void runDelete() },
            ])
          }
          hitSlop={12}
          style={styles.headerDelete}
        >
          <Text style={styles.headerDeleteText}>Delete</Text>
        </Pressable>
      ),
    })
  }, [navigation, post, user?.id, runDelete])

  const send = useCallback(() => {
    const t = draft.trim()
    if (!t || !post || sending) return
    setSending(true)
    void (async () => {
      const { error } = await sendReply(t)
      setSending(false)
      if (error) {
        Alert.alert('Could not send', error)
        return
      }
      setDraft('')
    })()
  }, [draft, post, sendReply, sending])

  if (loading && !post) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={ThemeColors.primary} />
      </View>
    )
  }

  if (!post) {
    return (
      <View style={[styles.miss, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.missText}>
          {loadError ? `Could not load this post. ${loadError}` : 'This post is no longer available.'}
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 56}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CommunityPostCard post={post} onToggleLike={() => void toggleLike()} />
        <Text style={styles.repliesLabel}>Replies</Text>
        {post.replies.map((r) => (
          <View key={r.id} style={styles.replyCard}>
            <View style={styles.replyHead}>
              <Text style={styles.replyName}>{r.authorName}</Text>
              <Text style={styles.replyTime}>{r.timeLabel}</Text>
            </View>
            <Text style={styles.replyBody}>{r.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a supportive reply…"
          placeholderTextColor={ThemeColors.textLight}
          style={styles.input}
          multiline
          editable={!sending}
        />
        <Pressable
          onPress={send}
          disabled={sending}
          style={({ pressed }) => [styles.send, pressed && { opacity: 0.85 }]}
        >
          <Send size={20} color={ThemeColors.white} strokeWidth={2} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  headerDelete: { paddingRight: 6, paddingVertical: 8 },
  headerDeleteText: { fontSize: 17, fontWeight: '600', color: '#C62828' },
  flex: { flex: 1, backgroundColor: ThemeColors.bgCream },
  root: { flex: 1 },
  scroll: { paddingHorizontal: ThemeSpacing.pagePad, paddingTop: 8 },
  center: { flex: 1, backgroundColor: ThemeColors.bgCream, alignItems: 'center' },
  miss: { flex: 1, backgroundColor: ThemeColors.bgCream, paddingHorizontal: ThemeSpacing.pagePad },
  missText: { fontSize: 16, fontWeight: '500', color: ThemeColors.textMid },
  repliesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textLight,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  replyCard: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  replyHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  replyName: { fontSize: 14, fontWeight: '700', color: ThemeColors.textDark },
  replyTime: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight },
  replyBody: { fontSize: 15, fontWeight: '400', color: ThemeColors.textDark, lineHeight: 22 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: ThemeSpacing.pagePad,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ThemeColors.border,
    backgroundColor: ThemeColors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: ThemeColors.bgCream,
    borderRadius: ThemeRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '400',
    color: ThemeColors.textDark,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ThemeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
