import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import { supabase } from '../../supabaseClient'
import type { CommunityMediaType, CommunityPost, CommunityReply } from '../types/community'

const CARD_BGS = ['#FFF0F5', '#F3E5F5', '#E8F5E9', '#E8F4FC', '#FCEACC'] as const

function cardBgFromId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 997
  return CARD_BGS[h % CARD_BGS.length] ?? '#FFF0F5'
}

function authorInitial(displayName: string | null | undefined, fallbackId: string): string {
  const t = displayName?.trim()
  if (t && t.length > 0) return t[0]?.toUpperCase() ?? '?'
  return fallbackId.slice(0, 1).toUpperCase()
}

export function formatCommunityTime(iso: string): string {
  try {
    const d = parseISO(iso)
    return formatDistanceToNowStrict(d, { addSuffix: true })
  } catch {
    return ''
  }
}

interface PostRow {
  id: string
  body: string
  media_url: string | null
  media_type: 'image' | 'video' | null
  created_at: string
  user_id: string
  author_display_name: string | null
  author_is_premium: boolean | null
}

function mapPostRow(
  row: PostRow,
  likeCount: number,
  replyCount: number,
  userLiked: boolean,
  replies: CommunityReply[],
): CommunityPost {
  const name = row.author_display_name?.trim() || 'Member'
  return {
    id: row.id,
    authorUserId: row.user_id,
    authorName: name,
    authorInitial: authorInitial(row.author_display_name, row.user_id),
    timeLabel: formatCommunityTime(row.created_at),
    body: row.body,
    likes: likeCount,
    commentsCount: replyCount,
    cardBg: cardBgFromId(row.id),
    verified: !!row.author_is_premium,
    mediaUri: row.media_url,
    mediaType: row.media_type,
    replies,
    userLiked,
  }
}

function countByPostId(rows: { post_id: string }[] | null): Record<string, number> {
  const acc: Record<string, number> = {}
  for (const r of rows ?? []) acc[r.post_id] = (acc[r.post_id] ?? 0) + 1
  return acc
}

async function fetchAggregates(postIds: string[], userId: string) {
  if (postIds.length === 0) {
    return {
      likeCounts: {} as Record<string, number>,
      replyCounts: {} as Record<string, number>,
      likedSet: new Set<string>(),
    }
  }
  const [likesAll, repliesAll, myLikes] = await Promise.all([
    supabase.from('community_post_likes').select('post_id').in('post_id', postIds),
    supabase.from('community_replies').select('post_id').in('post_id', postIds),
    supabase.from('community_post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
  ])
  return {
    likeCounts: countByPostId(likesAll.data),
    replyCounts: countByPostId(repliesAll.data),
    likedSet: new Set((myLikes.data ?? []).map((r) => r.post_id)),
  }
}

export async function fetchCommunityPosts(userId: string): Promise<{
  posts: CommunityPost[]
  error: string | null
}> {
  const { data: rows, error } = await supabase
    .from('community_posts')
    .select(
      'id, body, media_url, media_type, created_at, user_id, author_display_name, author_is_premium',
    )
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) return { posts: [], error: error.message }

  const list = (rows ?? []) as PostRow[]
  const ids = list.map((r) => r.id)
  const { likeCounts, replyCounts, likedSet } = await fetchAggregates(ids, userId)

  const posts = list.map((row) =>
    mapPostRow(
      row,
      likeCounts[row.id] ?? 0,
      replyCounts[row.id] ?? 0,
      likedSet.has(row.id),
      [],
    ),
  )
  return { posts, error: null }
}

interface ReplyRow {
  id: string
  body: string
  created_at: string
  user_id: string
  author_display_name: string | null
}

function mapReplyRow(row: ReplyRow): CommunityReply {
  const name = row.author_display_name?.trim() || 'Member'
  return {
    id: row.id,
    authorName: name,
    body: row.body,
    timeLabel: formatCommunityTime(row.created_at),
    likes: 0,
  }
}

export async function fetchCommunityPostDetail(
  postId: string,
  userId: string,
): Promise<{ post: CommunityPost | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from('community_posts')
    .select(
      'id, body, media_url, media_type, created_at, user_id, author_display_name, author_is_premium',
    )
    .eq('id', postId)
    .maybeSingle()

  if (error) return { post: null, error: error.message }
  if (!row) return { post: null, error: null }

  const { data: replyRows } = await supabase
    .from('community_replies')
    .select('id, body, created_at, user_id, author_display_name')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  const replies = ((replyRows ?? []) as ReplyRow[]).map(mapReplyRow)
  const { likeCounts, replyCounts, likedSet } = await fetchAggregates([postId], userId)

  return {
    post: mapPostRow(
      row as PostRow,
      likeCounts[postId] ?? 0,
      replyCounts[postId] ?? 0,
      likedSet.has(postId),
      replies,
    ),
    error: null,
  }
}

export async function toggleCommunityPostLike(
  postId: string,
  userId: string,
  currentlyLiked: boolean,
): Promise<{ error: string | null }> {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('community_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
    return { error: error?.message ?? null }
  }
  const { error } = await supabase.from('community_post_likes').insert({
    post_id: postId,
    user_id: userId,
  })
  return { error: error?.message ?? null }
}

/** React Native file shape for multipart upload (Metro/fetch understands this; Blob/ArrayBuffer paths often fail). */
interface RnFormDataFile {
  uri: string
  name: string
  type: string
}

function guessMime(uri: string, mediaType: CommunityMediaType): string {
  const lower = uri.split('?')[0]?.toLowerCase() ?? ''
  if (mediaType === 'video') {
    if (lower.endsWith('.mov')) return 'video/quicktime'
    return 'video/mp4'
  }
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.heic')) return 'image/heic'
  return 'image/jpeg'
}

export async function uploadCommunityMedia(
  userId: string,
  localUri: string,
  mediaType: CommunityMediaType,
): Promise<{ publicUrl: string | null; error: string | null }> {
  const ext =
    mediaType === 'video'
      ? localUri.toLowerCase().includes('.mov')
        ? 'mov'
        : 'mp4'
      : localUri.toLowerCase().includes('.png')
        ? 'png'
        : localUri.toLowerCase().includes('.webp')
          ? 'webp'
          : 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
  const contentType = guessMime(localUri, mediaType)
  const filePart: RnFormDataFile = {
    uri: localUri,
    name: `bloom-${path.split('/').pop() ?? 'upload'}.${ext}`,
    type: contentType,
  }

  // Match @supabase/storage-js Blob branch: multipart FormData with empty field name for the file.
  // Using { uri, name, type } avoids Blob/ArrayBuffer in RN (common "Network request failed" on Android).
  const formData = new FormData()
  formData.append('cacheControl', '3600')
  formData.append('', filePart as unknown as Blob)

  const { error } = await supabase.storage.from('community-media').upload(path, formData, {
    upsert: false,
  })
  if (error) return { publicUrl: null, error: error.message }
  const { data } = supabase.storage.from('community-media').getPublicUrl(path)
  return { publicUrl: data.publicUrl, error: null }
}

function normalizePostError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('network request failed') || m.includes('failed to fetch'))
    return 'Network issue—check your connection, then try again.'
  if (m.includes('jwt') || m.includes('session')) return 'Session expired—sign in again, then post.'
  if (m.includes('violates foreign key')) return 'Account setup is incomplete—open Profile, then try again.'
  if (m.includes('arraybufferview') || m.includes('arraybuffer'))
    return 'Could not prepare this attachment—try a different photo or post without media.'
  return message
}

export async function createCommunityPost(input: {
  userId: string
  body: string
  mediaUri?: string | null
  mediaType?: CommunityMediaType | null
}): Promise<{ id: string | null; error: string | null }> {
  try {
    let mediaUrl: string | null = null
    let mediaType: 'image' | 'video' | null = null
    if (input.mediaUri && input.mediaType) {
      const up = await uploadCommunityMedia(input.userId, input.mediaUri, input.mediaType)
      if (up.error) return { id: null, error: up.error }
      mediaUrl = up.publicUrl
      mediaType = input.mediaType
    }

    let bodyText = (input.body.trim() || (mediaUrl ? '(Shared media)' : '')).slice(0, 5000)
    if (!bodyText.trim() && !mediaUrl) return { id: null, error: 'Add a message or media.' }

    const { data: prof } = await supabase
      .from('profiles')
      .select('display_name, is_premium')
      .eq('id', input.userId)
      .maybeSingle()

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: input.userId,
        body: bodyText,
        media_url: mediaUrl,
        media_type: mediaType,
        author_display_name: prof?.display_name?.trim() || 'Member',
        author_is_premium: !!prof?.is_premium,
      })
      .select('id')
      .single()

    if (error) return { id: null, error: normalizePostError(error.message) }
    return { id: data?.id ?? null, error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { id: null, error: normalizePostError(msg) }
  }
}

/** Path inside bucket `community-media` from a public object URL, or null. */
export function communityMediaPathFromPublicUrl(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/community-media\/(.+)$/)
  if (!m?.[1]) return null
  return decodeURIComponent(m[1].split('?')[0] ?? '')
}

export async function deleteCommunityPost(input: {
  postId: string
  mediaPublicUrl?: string | null
}): Promise<{ error: string | null }> {
  try {
    const path = input.mediaPublicUrl ? communityMediaPathFromPublicUrl(input.mediaPublicUrl) : null
    const { data: ok, error: rpcError } = await supabase.rpc('delete_own_community_post', {
      p_post_id: input.postId,
    })
    if (rpcError) return { error: normalizePostError(rpcError.message) }
    if (ok !== true) return { error: 'You can only delete your own posts.' }

    if (path) {
      const { error: storageError } = await supabase.storage.from('community-media').remove([path])
      if (storageError) console.warn('[community] storage remove after delete:', storageError.message)
    }
    return { error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { error: normalizePostError(msg) }
  }
}

export async function addCommunityReply(
  postId: string,
  userId: string,
  body: string,
): Promise<{ error: string | null }> {
  const t = body.trim().slice(0, 2000)
  if (!t) return { error: 'Reply cannot be empty.' }
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
    const { error } = await supabase.from('community_replies').insert({
      post_id: postId,
      user_id: userId,
      body: t,
      author_display_name: prof?.display_name?.trim() || 'Member',
    })
    return { error: error ? normalizePostError(error.message) : null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { error: normalizePostError(msg) }
  }
}
