import { createClient } from '@/lib/supabase/server'
import type { EstablishmentRole } from '@/lib/rbac'
import type { PlanFeature } from '@/features/plans/types'
import { hasPlanFeature } from '@/features/plans/types'
import { NextResponse } from 'next/server'

export async function getCurrentProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, role, full_name, tenants(plan, name, slug)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { supabase, user, profile: null }
  }

  const tenant = Array.isArray(profile.tenants)
    ? profile.tenants[0]
    : profile.tenants

  return {
    supabase,
    user,
    profile: {
      id: profile.id,
      tenant_id: profile.tenant_id,
      role: profile.role as EstablishmentRole,
      full_name: profile.full_name,
      tenant: tenant
        ? {
            plan: tenant.plan as 'free' | 'basic' | 'pro',
            name: tenant.name,
            slug: tenant.slug,
          }
        : null,
    },
  }
}

export async function requireTenantRoles(allowedRoles?: EstablishmentRole[]) {
  const context = await getCurrentProfile()

  if (!context.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }),
    }
  }

  if (!context.profile) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 }),
    }
  }

  if (allowedRoles && !allowedRoles.includes(context.profile.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Sem permissão para esta ação.' }, { status: 403 }),
    }
  }

  return {
    ok: true as const,
    ...context,
  }
}

export async function requireTenantFeature(
  feature: PlanFeature,
  allowedRoles?: EstablishmentRole[]
) {
  const context = await requireTenantRoles(allowedRoles)

  if (!context.ok) {
    return context
  }

  const plan = context.profile.tenant?.plan ?? 'free'

  if (!hasPlanFeature(plan, feature)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Este recurso não está disponível no plano atual.' },
        { status: 403 }
      ),
    }
  }

  return context
}
