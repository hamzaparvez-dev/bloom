import AsyncStorage from '@react-native-async-storage/async-storage'
import { format } from 'date-fns'

const STORAGE_KEY = '@bloom/partner_screen_state_v1'

export interface TipInteractionRecord {
  status?: 'done' | 'dismissed'
  saved?: boolean
  /** ISO timestamp */
  at?: string
}

export interface PartnerScreenPersistedState {
  /** Local calendar day when `byTipId` / `helpful` apply */
  dayKey: string
  byTipId: Record<string, TipInteractionRecord>
  helpful: boolean | null
}

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export async function loadPartnerScreenState(): Promise<PartnerScreenPersistedState> {
  const key = todayKey()
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return { dayKey: key, byTipId: {}, helpful: null }
    const parsed = JSON.parse(raw) as Partial<PartnerScreenPersistedState>
    if (parsed.dayKey !== key) return { dayKey: key, byTipId: {}, helpful: null }
    return {
      dayKey: key,
      byTipId: typeof parsed.byTipId === 'object' && parsed.byTipId != null ? parsed.byTipId : {},
      helpful: typeof parsed.helpful === 'boolean' ? parsed.helpful : null,
    }
  } catch {
    return { dayKey: key, byTipId: {}, helpful: null }
  }
}

export async function savePartnerScreenState(next: PartnerScreenPersistedState): Promise<void> {
  const payload: PartnerScreenPersistedState = {
    dayKey: todayKey(),
    byTipId: next.byTipId,
    helpful: next.helpful,
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
