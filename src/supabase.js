import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('URL =', JSON.stringify(supabaseUrl))
console.log('KEY =', supabaseKey ? 'OK' : 'MISSING')

export const supabase = createClient(
  supabaseUrl.trim(),
  supabaseKey.trim()
)