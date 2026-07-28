/**
 * RevenueCat / store configuration.
 * Runtime keys: use `getRevenueCatApiKey` and `getRevenueCatProEntitlementId` from `./revenuecat-key`
 * (values come from `app.config.js` → `expo.extra`, overridable per build with env vars).
 */
export { getRevenueCatApiKey, getRevenueCatProEntitlementId } from './revenuecat-key'

/**
 * RevenueCat product identifiers (Product catalog → Identifier).
 * Attach these products to your entitlement and offering packages.
 */
export const STORE_PRODUCT_IDS = {
  monthly: 'bloom_pro_monthly',
  yearly: 'bloom_pro_yearly',
} as const

/**
 * RevenueCat REST API v2 product ids (path segment …/products/{id}).
 * For server-side REST calls, exports, or support — the native Purchases SDK uses offerings / Store products, not these ids.
 * @see https://www.revenuecat.com/docs/projects/authentication
 */
export const REVENUECAT_REST_PRODUCT_IDS = {
  monthly: 'prod964ce43d36',
  yearly: 'prodcd8fe3e1a0',
} as const
