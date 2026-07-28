/**
 * Compatibility shim — older bundles imported community state from here.
 * Prefer `useCommunityFeed` from `../hooks/use-community-feed` and types from `../types/community`.
 */
export { useCommunityFeed as useCommunityFeedStore } from '../hooks/use-community-feed'
export type { CommunityPost, CommunityMediaType } from '../types/community'
