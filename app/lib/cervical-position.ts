export type CervicalHeight = 'low' | 'medium' | 'high'
export type CervicalTexture = 'firm' | 'soft'
export type CervicalOpening = 'closed' | 'slightly_open' | 'open'

export interface CervicalPositionStored {
  position: CervicalHeight | null
  texture: CervicalTexture | null
  opening: CervicalOpening | null
}

const HEIGHT_LABEL: Record<CervicalHeight, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const TEXTURE_LABEL: Record<CervicalTexture, string> = {
  firm: 'Firm',
  soft: 'Soft',
}

const OPENING_LABEL: Record<CervicalOpening, string> = {
  closed: 'Closed',
  slightly_open: 'Slightly open',
  open: 'Open',
}

export function isCervicalPositionEmpty(c: CervicalPositionStored | null | undefined): boolean {
  if (!c) return true
  return c.position == null && c.texture == null && c.opening == null
}

export function formatCervicalPositionSummary(c: CervicalPositionStored | null | undefined): string {
  if (!c || isCervicalPositionEmpty(c)) return ''
  const parts: string[] = []
  if (c.position) parts.push(HEIGHT_LABEL[c.position])
  if (c.texture) parts.push(TEXTURE_LABEL[c.texture])
  if (c.opening) parts.push(OPENING_LABEL[c.opening])
  return parts.join(' · ')
}

export function cervicalPositionToJson(c: CervicalPositionStored): Record<string, unknown> | null {
  if (isCervicalPositionEmpty(c)) return null
  return {
    position: c.position,
    texture: c.texture,
    opening: c.opening,
    v: 1,
  }
}

export function parseCervicalPositionJson(raw: unknown): CervicalPositionStored | null {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const position = o.position
  const texture = o.texture
  const opening = o.opening
  const out: CervicalPositionStored = {
    position:
      position === 'low' || position === 'medium' || position === 'high' ? position : null,
    texture: texture === 'firm' || texture === 'soft' ? texture : null,
    opening:
      opening === 'closed' || opening === 'slightly_open' || opening === 'open' ? opening : null,
  }
  return isCervicalPositionEmpty(out) ? null : out
}
