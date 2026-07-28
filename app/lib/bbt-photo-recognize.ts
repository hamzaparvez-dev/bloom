import TextRecognition from '@react-native-ml-kit/text-recognition'
import { extractBasalCelsiusFromOcrText, flattenOcrText } from './bbt-temperature-ocr'

export type BbtOcrFailReason = 'recognition_error' | 'no_temperature_in_text'

export interface BbtOcrOk {
  ok: true
  valueCelsius: number
  rawText: string
}

export interface BbtOcrFail {
  ok: false
  reason: BbtOcrFailReason
  detail?: string
}

export async function recognizeBasalTemperatureFromImageUri(imageUri: string): Promise<BbtOcrOk | BbtOcrFail> {
  try {
    const result = await TextRecognition.recognize(imageUri)
    const rawText = flattenOcrText(result)
    const valueCelsius = extractBasalCelsiusFromOcrText(rawText)
    if (valueCelsius == null) return { ok: false, reason: 'no_temperature_in_text' }
    return { ok: true, valueCelsius, rawText }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: 'recognition_error', detail }
  }
}
