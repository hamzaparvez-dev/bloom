import type { ImageSourcePropType } from 'react-native'

/** Keys match repo `scripts/generateAssets.ts` slugs and filenames `{key}_v{N}.png`. */
export type AppImageKey = 'community' | 'pregnancy' | 'onboarding' | 'empty'

/**
 * Active bundled art revision. After running `npm run generate:assets -- --version 2`,
 * add matching `require()` entries below (and new files under `assets/images/`) before bumping.
 */
export const APP_IMAGE_VERSION = 1 as 1 | 2 | 3

const V1: Record<AppImageKey, ImageSourcePropType> = {
  community: require('../../assets/images/community_v1.png'),
  pregnancy: require('../../assets/images/pregnancy_v1.png'),
  onboarding: require('../../assets/images/onboarding_v1.png'),
  empty: require('../../assets/images/empty_v1.png'),
}

/** Optional v2 bundles — uncomment requires when `*_v2.png` exists. */
const V2: Partial<Record<AppImageKey, ImageSourcePropType>> = {
  // community: require('../../assets/images/community_v2.png'),
  // pregnancy: require('../../assets/images/pregnancy_v2.png'),
  // onboarding: require('../../assets/images/onboarding_v2.png'),
  // empty: require('../../assets/images/empty_v2.png'),
}

/** Optional v3 bundles — uncomment requires when `*_v3.png` exists. */
const V3: Partial<Record<AppImageKey, ImageSourcePropType>> = {
  // community: require('../../assets/images/community_v3.png'),
  // pregnancy: require('../../assets/images/pregnancy_v3.png'),
  // onboarding: require('../../assets/images/onboarding_v3.png'),
  // empty: require('../../assets/images/empty_v3.png'),
}

/**
 * Resolve a bundled marketing / empty-state illustration.
 * Version selects which shipped PNG set to use (v2/v3 require matching files + requires above).
 */
export function getImage(name: AppImageKey, version: 1 | 2 | 3 = APP_IMAGE_VERSION): ImageSourcePropType {
  if (version === 2) {
    const s = V2[name]
    if (s) return s
  }
  if (version === 3) {
    const s = V3[name]
    if (s) return s
  }
  return V1[name]
}
