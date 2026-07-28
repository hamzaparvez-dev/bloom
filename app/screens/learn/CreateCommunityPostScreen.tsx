import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Video, ResizeMode } from 'expo-av'
import { ImageIcon, Trash2, VideoIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { createCommunityPost } from '../../lib/community'
import { shareCommunityPost } from '../../lib/share-community'
import { useAuth } from '../../providers/AuthProvider'
import type { CommunityMediaType } from '../../types/community'

export function CreateCommunityPostScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation()
  const { user } = useAuth()

  const [body, setBody] = useState('')
  const [mediaUri, setMediaUri] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<CommunityMediaType | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const pickMedia = useCallback(async (prefer: 'image' | 'video' | 'any') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Photos', 'Please allow photo library access to attach media.')
      return
    }
    const mediaTypes: ImagePicker.MediaType[] =
      prefer === 'image' ? ['images'] : prefer === 'video' ? ['videos'] : ['images', 'videos']
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.85,
      videoMaxDuration: 120,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    const isVideo = asset.type === 'video'
    setMediaUri(asset.uri)
    setMediaType(isVideo ? 'video' : 'image')
  }, [])

  const clearMedia = useCallback(() => {
    setMediaUri(null)
    setMediaType(null)
  }, [])

  const submit = useCallback(() => {
    const uid = user?.id
    if (!uid) {
      Alert.alert('Sign in required', 'Sign in to post to the community.')
      return
    }
    const t = body.trim()
    if (!t && !mediaUri) {
      Alert.alert('Add something', 'Write a message or attach a photo or video.')
      return
    }
    setSubmitting(true)
    void (async () => {
      const { error } = await createCommunityPost({
        userId: uid,
        body: t || '(Shared media)',
        mediaUri,
        mediaType: mediaType ?? undefined,
      })
      setSubmitting(false)
      if (error) {
        Alert.alert('Could not post', error)
        return
      }
      nav.goBack()
    })()
  }, [body, mediaUri, mediaType, user?.id, nav])

  const shareOut = useCallback(async () => {
    const t = body.trim()
    if (!t && !mediaUri) {
      Alert.alert('Add something', 'Write a message or attach media before sharing.')
      return
    }
    await shareCommunityPost({
      body: t || 'My Bloom story',
      authorName: 'You',
      mediaUri,
      mediaType,
    })
  }, [body, mediaUri, mediaType])

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 48}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>New post</Text>
        <Text style={styles.sub}>
          Share a success story or ask the community. You can attach one photo or video.
        </Text>

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What’s on your mind?"
          placeholderTextColor={ThemeColors.textLight}
          style={styles.input}
          multiline
          textAlignVertical="top"
          editable={!submitting}
        />

        <View style={styles.mediaRow}>
          <Pressable
            onPress={() => pickMedia('image')}
            style={({ pressed }) => [styles.mediaBtn, pressed && { opacity: 0.8 }]}
            disabled={submitting}
          >
            <ImageIcon size={20} color={ThemeColors.primary} strokeWidth={2} />
            <Text style={styles.mediaBtnText}>Photo</Text>
          </Pressable>
          <Pressable
            onPress={() => pickMedia('video')}
            style={({ pressed }) => [styles.mediaBtn, pressed && { opacity: 0.8 }]}
            disabled={submitting}
          >
            <VideoIcon size={20} color={ThemeColors.lavender} strokeWidth={2} />
            <Text style={styles.mediaBtnText}>Video</Text>
          </Pressable>
          <Pressable
            onPress={() => pickMedia('any')}
            style={({ pressed }) => [styles.mediaBtnOutline, pressed && { opacity: 0.8 }]}
            disabled={submitting}
          >
            <Text style={styles.mediaBtnOutlineText}>Library</Text>
          </Pressable>
        </View>

        {mediaUri && mediaType === 'image' ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: mediaUri }} style={styles.preview} resizeMode="cover" />
            <Pressable onPress={clearMedia} style={styles.trashFab} disabled={submitting}>
              <Trash2 size={18} color={ThemeColors.white} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}
        {mediaUri && mediaType === 'video' ? (
          <View style={styles.previewWrap}>
            <Video
              source={{ uri: mediaUri }}
              style={styles.preview}
              resizeMode={ResizeMode.COVER}
              useNativeControls
              shouldPlay={false}
            />
            <Pressable onPress={clearMedia} style={styles.trashFab} disabled={submitting}>
              <Trash2 size={18} color={ThemeColors.white} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={submitting}
          style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}
        >
          {submitting ? (
            <ActivityIndicator color={ThemeColors.white} />
          ) : (
            <Text style={styles.primaryText}>Post to community</Text>
          )}
        </Pressable>
        <Pressable
          onPress={shareOut}
          disabled={submitting}
          style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.secondaryText}>Share to social…</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: ThemeColors.bgCream },
  root: { flex: 1 },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  title: { fontSize: 24, fontWeight: '800', color: ThemeColors.textDark },
  sub: {
    fontSize: 14,
    fontWeight: '400',
    color: ThemeColors.textMid,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    minHeight: 140,
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    fontSize: 16,
    fontWeight: '400',
    color: ThemeColors.textDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    marginBottom: 14,
  },
  mediaRow: { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ThemeColors.pinkSurface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: ThemeRadius.pill,
  },
  mediaBtnText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textDark },
  mediaBtnOutline: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: ThemeRadius.pill,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    backgroundColor: ThemeColors.surface,
  },
  mediaBtnOutlineText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textMid },
  previewWrap: { marginBottom: 16, borderRadius: ThemeRadius.card, overflow: 'hidden' },
  preview: { width: '100%', height: 220, backgroundColor: ThemeColors.border },
  trashFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: ThemeColors.primary,
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '600', color: ThemeColors.lavender },
})
