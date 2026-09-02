import { createClient } from '@supabase/supabase-js'

export function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase public environment variables are not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service-role environment variable is not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
