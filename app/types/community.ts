export type CommunityMediaType = 'image' | 'video'

export interface CommunityReply {
  id: string
  authorName: string
  body: string
  timeLabel: string
  likes: number
}

export interface CommunityPost {
  id: string
  /** Post author — use to show delete only to creator */
  authorUserId: string
  authorName: string
  authorInitial: string
  timeLabel: string
  body: string
  likes: number
  commentsCount: number
  cardBg: string
  verified?: boolean
  mediaUri?: string | null
  mediaType?: CommunityMediaType | null
  replies: CommunityReply[]
  userLiked?: boolean
}
