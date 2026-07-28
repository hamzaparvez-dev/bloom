#!/usr/bin/env node
/**
 * Prints shareable Expo tunnel URLs from a running Metro (no secrets).
 * Run from `bloom/` after `npm run share:expo-go` (tunnel ready).
 *
 *   cd bloom && npm run share:expo-go:url
 */

import http from 'node:http'

const port = Number(process.env.RCT_METRO_PORT || process.env.EXPO_METRO_PORT || 8081, 10)

function main() {
  const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
    let body = ''
    res.on('data', (c) => {
      body += c
    })
    res.on('end', () => {
      try {
        const j = JSON.parse(body)
        const bundle = j.launchAsset?.url
        if (!bundle || typeof bundle !== 'string') {
          console.error('Metro responded but no launchAsset.url (is this Expo?)')
          process.exit(1)
        }
        const u = new URL(bundle)
        const host = u.host
        const origin = `${u.protocol}//${host}`
        console.log('')
        console.log('--- Share with a friend (Expo Go) ---')
        console.log('1) Install Expo Go (App Store / Play Store).')
        console.log('2) In Expo Go: scan the QR from your terminal, or use “Enter URL manually”.')
        console.log('')
        console.log('Tunnel (HTTPS manifest / bundle host):')
        console.log(`  ${origin}`)
        console.log('')
        console.log('Expo Go link (deep link form):')
        console.log(`  exp://${host}`)
        console.log('')
        console.log('Note: URL changes each time you restart Metro. If tunnel drops, restart `npm run share:expo-go`.')
        console.log('')
      } catch {
        console.error(`Could not parse Metro JSON on port ${port}.`)
        process.exit(1)
      }
    })
  })
  req.on('error', () => {
    console.error(`Cannot reach Metro at http://127.0.0.1:${port}/`)
    console.error('Start the server first: npm run share:expo-go')
    console.error('Or: npx expo start --tunnel --go')
    process.exit(1)
  })
}

main()
