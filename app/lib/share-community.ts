import { Share, Alert } from 'react-native'
import * as Sharing from 'expo-sharing'

interface ShareCommunityPostParams {
  body: string
  authorName: string
  mediaUri?: string | null
  mediaType?: 'image' | 'video' | null
}

/**
 * Prefer native file share when media exists and expo-sharing is available;
 * otherwise fall back to React Native Share (Messages, Mail, copy, etc.).
 */
export async function shareCommunityPost({
  body,
  authorName,
  mediaUri,
  mediaType,
}: ShareCommunityPostParams): Promise<void> {
  const caption = `“${body}” — ${authorName} on Bloom`

  if (mediaUri) {
    try {
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(mediaUri, {
          mimeType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          dialogTitle: 'Share your story',
          UTI: mediaType === 'video' ? 'public.mpeg-4' : 'public.jpeg',
        })
        return
      }
    } catch {
      // fall through to text share
    }
  }

  try {
    await Share.share({ message: caption })
  } catch {
    Alert.alert('Could not share', 'Try again in a moment.')
  }
}
