import { createBrowserClient } from '@supabase/ssr'

const FALLBACK_SUPABASE_URL = 'https://example.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'example-anon-key'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? FALLBACK_SUPABASE_ANON_KEY
  )
}
