#!/usr/bin/env node
/**
 * Expo CLI hardcodes a 10s ngrok connect timeout — too short on slow / VPN / hotel Wi‑Fi.
 * Bump to 90s so `npm run share:expo-go` succeeds more often.
 * Re-run automatically via package.json `postinstall`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'src',
  'start',
  'server',
  'AsyncNgrok.js',
)

if (!fs.existsSync(target)) {
  console.warn('[patch-expo-ngrok-timeout] AsyncNgrok.js not found (run npm install first). Skip.')
  process.exit(0)
}

let s = fs.readFileSync(target, 'utf8')
const before = 'const TUNNEL_TIMEOUT = 10 * 1000;'
const after = 'const TUNNEL_TIMEOUT = 90 * 1000;'

if (!s.includes(before)) {
  if (s.includes(after)) {
    console.log('[patch-expo-ngrok-timeout] Already patched.')
  } else {
    console.warn('[patch-expo-ngrok-timeout] Expected line missing; Expo may have changed. Skip.')
  }
  process.exit(0)
}

fs.writeFileSync(target, s.replace(before, after))
console.log('[patch-expo-ngrok-timeout] Set ngrok tunnel timeout to 90s in @expo/cli.')
