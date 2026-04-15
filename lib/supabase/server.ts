import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FALLBACK_SUPABASE_URL = 'https://example.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'example-anon-key'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? FALLBACK_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies só podem ser setados em middleware
          }
        },
      },
    }
  )
}
