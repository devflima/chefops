import { createClient } from '@/lib/supabase/server'
import { PLAN_INCLUDED_FEATURES, PLAN_RESOURCE_LIMITS, type Plan } from '@/features/plans/types'
import { ensureTenantBillingAccessState } from '@/lib/saas-billing'
import {
  getAvailableRolesForPlan,
  PLAN_MAX_USERS,
  PLAN_ROLE_LIMITS,
} from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    await ensureTenantBillingAccessState(profile.tenant_id)

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('plan, max_users, max_tables, max_products, features, trial_ends_at, plan_ends_at')
      .eq('id', profile.tenant_id)
      .single()

    if (error || !tenant) throw error

    const plan = tenant.plan as Plan

    return NextResponse.json({
      data: {
        ...tenant,
        plan,
        max_users: PLAN_MAX_USERS[plan],
        features: PLAN_INCLUDED_FEATURES[plan],
        resource_limits: PLAN_RESOURCE_LIMITS[plan],
        role_limits: PLAN_ROLE_LIMITS[plan],
        available_roles: getAvailableRolesForPlan(plan),
      },
    })
  } catch (error) {
    console.error('[plan:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar plano.' },
      { status: 500 }
    )
  }
}
