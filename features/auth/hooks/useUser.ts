'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { AuthUser } from '../types'

export function useUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, tenant_id, tenants(id, name, slug, plan)')
        .eq('id', authUser.id)
        .single()

      if (!profile) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser({
        id: authUser.id,
        email: authUser.email!,
        profile: {
          full_name: profile.full_name,
          role: profile.role as AuthUser['profile']['role'],
          tenant_id: profile.tenant_id,
          tenant: profile.tenants as AuthUser['profile']['tenant'],
        },
      })
      setLoading(false)
    }

    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, loading }
}