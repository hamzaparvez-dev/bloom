import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition'

function normalizeDecimalToken(s: string): number | null {
  const t = s.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

/** Pull plausible temperature tokens from OCR text (Latin digits; °C / °F aware). */
export function collectTemperatureCandidates(fullText: string): number[] {
  const text = fullText.replace(/\u00b0/g, '°').replace(/\s+/g, ' ')
  const out: number[] = []
  const re = /\b(\d{1,2}[\.,]\d{1,3}|\d{2,3}[\.,]\d{1,2})\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const raw = m[1] ?? ''
    const n = normalizeDecimalToken(raw)
    if (n == null) continue
    const start = Math.max(0, m.index - 3)
    const window = text.slice(start, m.index + raw.length + 6).toLowerCase()
    const explicitF = window.includes('°f')
    const explicitC = window.includes('°c')
    const looksLikeFahrenheitBand = n >= 90 && n <= 105
    const looksLikeCelsiusBand = n >= 32 && n <= 45
    let celsius = n
    if (explicitF || (looksLikeFahrenheitBand && !explicitC && !looksLikeCelsiusBand))
      celsius = ((n - 32) * 5) / 9
    if (celsius >= 32 && celsius <= 42) out.push(Math.round(celsius * 1000) / 1000)
  }
  return out
}

/** Pick one basal reading from OCR candidates (handles extra UI numbers on device photos). */
export function pickBasalCelsiusFromCandidates(candidates: number[]): number | null {
  if (candidates.length === 0) return null
  const band = candidates.filter((n) => n >= 35 && n <= 39.8)
  const pool = band.length > 0 ? band : candidates.filter((n) => n >= 33 && n <= 41)
  if (pool.length === 0) return null
  if (pool.length === 1) return Math.round(pool[0] * 100) / 100
  const midBand = pool.filter((n) => n >= 35.8 && n <= 37.4)
  if (midBand.length === 1) return Math.round(midBand[0] * 100) / 100
  const sorted = [...pool].sort((a, b) => a - b)
  const mid = sorted[Math.floor(sorted.length / 2)] ?? sorted[0]
  return mid != null ? Math.round(mid * 100) / 100 : null
}

export function extractBasalCelsiusFromOcrText(fullText: string): number | null {
  const c = collectTemperatureCandidates(fullText)
  return pickBasalCelsiusFromCandidates(c)
}

export function flattenOcrText(result: TextRecognitionResult): string {
  const lines: string[] = []
  if (result.text?.trim()) lines.push(result.text.trim())
  for (const block of result.blocks ?? []) {
    if (block.text?.trim()) lines.push(block.text.trim())
    for (const line of block.lines ?? []) {
      if (line.text?.trim()) lines.push(line.text.trim())
    }
  }
  return lines.join('\n')
}
