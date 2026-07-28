const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const appJson = require('./app.json')

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      openAiApiKey: process.env.OPENAI_API_KEY || '',
      openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      /**
       * RevenueCat public SDK keys (test store / sandbox safe for dev).
       * Production: set EXPO_PUBLIC_REVENUECAT_IOS_KEY + EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (or shared REVENUECAT_API_KEY).
       */
      revenueCatApiKey:
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
        process.env.REVENUECAT_API_KEY ||
        'test_yptNBJvVLXvVVMdVQpdVxAitScj',
      revenueCatApiKeyIos:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
        process.env.REVENUECAT_API_KEY ||
        'test_yptNBJvVLXvVVMdVQpdVxAitScj',
      revenueCatApiKeyAndroid:
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
        process.env.REVENUECAT_API_KEY ||
        'test_yptNBJvVLXvVVMdVQpdVxAitScj',
      /** Must match Entitlements identifier in RevenueCat (create "Bloom Pro" entitlement there). */
      revenueCatEntitlementId:
        process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ||
        process.env.REVENUECAT_ENTITLEMENT_ID ||
        'Bloom Pro',
    },
  },
}
