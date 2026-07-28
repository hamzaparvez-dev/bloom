import { supabase } from '../../supabaseClient'

export async function getActivePregnancyId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('pregnancies')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.warn('[active-pregnancy]', error.message)
    return null
  }
  return data?.id ?? null
}
