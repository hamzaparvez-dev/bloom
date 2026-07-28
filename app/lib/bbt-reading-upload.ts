import { supabase } from '../../supabaseClient'

interface RnFormDataFile {
  uri: string
  name: string
  type: string
}

function guessMime(uri: string): string {
  const lower = uri.split('?')[0]?.toLowerCase() ?? ''
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.heic')) return 'image/heic'
  return 'image/jpeg'
}

/** Uploads a local thermometer image; returns public object URL for `bbt-readings` bucket. */
export async function uploadBbtReadingPhoto(
  userId: string,
  localUri: string,
): Promise<{ publicUrl: string | null; error: string | null }> {
  const ext = localUri.toLowerCase().includes('.png')
    ? 'png'
    : localUri.toLowerCase().includes('.webp')
      ? 'webp'
      : localUri.toLowerCase().includes('.heic')
        ? 'heic'
        : 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  const contentType = guessMime(localUri)
  const filePart: RnFormDataFile = {
    uri: localUri,
    name: `bbt-${path.split('/').pop() ?? 'reading.jpg'}`,
    type: contentType,
  }

  const formData = new FormData()
  formData.append('cacheControl', '3600')
  formData.append('', filePart as unknown as Blob)

  const { error } = await supabase.storage.from('bbt-readings').upload(path, formData, {
    upsert: false,
  })
  if (error) return { publicUrl: null, error: error.message }
  const { data } = supabase.storage.from('bbt-readings').getPublicUrl(path)
  return { publicUrl: data.publicUrl, error: null }
}
