import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureTenantBillingAccessState } from '@/lib/saas-billing'
import {
  canAssignRole,
  EstablishmentRole,
  getAvailableRolesForPlan,
  getRoleCounts,
} from '@/lib/rbac'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateUserSchema = z.object({
  role: z.enum(['owner', 'manager', 'cashier', 'kitchen']),
})

async function getCurrentProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, role, tenants(plan)')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const billingState = profile.tenant_id
    ? await ensureTenantBillingAccessState(profile.tenant_id)
    : null

  const tenant = Array.isArray(profile.tenants)
    ? profile.tenants[0]
    : profile.tenants

  return {
    id: user.id,
    tenant_id: profile.tenant_id,
    role: profile.role as EstablishmentRole,
    plan: ((billingState?.downgraded ? 'free' : tenant?.plan) ?? 'free') as 'free' | 'basic' | 'pro',
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentProfile = await getCurrentProfile()

    if (!currentProfile) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    if (currentProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Apenas owners podem gerenciar usuários.' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (id === currentProfile.id) {
      return NextResponse.json(
        { error: 'Você não pode alterar o seu próprio perfil por aqui.' },
        { status: 422 }
      )
    }

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    if (!getAvailableRolesForPlan(currentProfile.plan).includes(parsed.data.role)) {
      return NextResponse.json(
        { error: 'Este perfil não está disponível no plano atual.' },
        { status: 422 }
      )
    }

    const admin = createAdminClient()
    const { data: targetUser, error: targetUserError } = await admin
      .from('profiles')
      .select('id, tenant_id, role')
      .eq('id', id)
      .eq('tenant_id', currentProfile.tenant_id)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado.' },
        { status: 404 }
      )
    }

    if (targetUser.role === parsed.data.role) {
      return NextResponse.json({ data: targetUser })
    }

    const { data: existingProfiles, error: existingProfilesError } = await admin
      .from('profiles')
      .select('id, role')
      .eq('tenant_id', currentProfile.tenant_id)

    if (existingProfilesError) throw existingProfilesError

    const counts = getRoleCounts((existingProfiles ?? []).filter((profile) => profile.id !== id))

    if (
      !canAssignRole({
        plan: currentProfile.plan,
        counts,
        nextRole: parsed.data.role,
      })
    ) {
      return NextResponse.json(
        { error: 'Limite de usuários deste perfil atingido para o plano atual.' },
        { status: 422 }
      )
    }

    const { data, error } = await admin
      .from('profiles')
      .update({ role: parsed.data.role })
      .eq('id', id)
      .eq('tenant_id', currentProfile.tenant_id)
      .select('id, full_name, role')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Não foi possível atualizar o usuário.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[users:patch]', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentProfile = await getCurrentProfile()

    if (!currentProfile) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    if (currentProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Apenas owners podem gerenciar usuários.' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (id === currentProfile.id) {
      return NextResponse.json(
        { error: 'Você não pode remover o seu próprio usuário.' },
        { status: 422 }
      )
    }

    const admin = createAdminClient()
    const { data: targetUser, error: targetUserError } = await admin
      .from('profiles')
      .select('id, tenant_id, role')
      .eq('id', id)
      .eq('tenant_id', currentProfile.tenant_id)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado.' },
        { status: 404 }
      )
    }

    if (targetUser.role === 'owner') {
      const { count, error: ownersCountError } = await admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentProfile.tenant_id)
        .eq('role', 'owner')

      if (ownersCountError) throw ownersCountError

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'O estabelecimento precisa manter pelo menos um owner.' },
          { status: 422 }
        )
      }
    }

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id)

    if (deleteAuthError) throw deleteAuthError

    await admin.from('profiles').delete().eq('id', id)

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    console.error('[users:delete]', error)
    return NextResponse.json(
      { error: 'Erro ao remover usuário.' },
      { status: 500 }
    )
  }
}
