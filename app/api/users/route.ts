import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  canAssignRole,
  EstablishmentRole,
  getAvailableRolesForPlan,
  getRoleCounts,
  PLAN_MAX_USERS,
  PLAN_ROLE_LIMITS,
} from '@/lib/rbac'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createUserSchema = z.object({
  full_name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
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

  const tenant = Array.isArray(profile.tenants)
    ? profile.tenants[0]
    : profile.tenants

  return {
    id: user.id,
    tenant_id: profile.tenant_id,
    role: profile.role as EstablishmentRole,
    plan: tenant?.plan as 'free' | 'basic' | 'pro',
  }
}

export async function GET() {
  try {
    const currentProfile = await getCurrentProfile()

    if (!currentProfile) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, full_name, role, tenant_id, created_at')
      .eq('tenant_id', currentProfile.tenant_id)
      .order('created_at', { ascending: true })

    if (profilesError) throw profilesError

    const {
      data: { users },
      error: usersError,
    } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (usersError) throw usersError

    const usersById = new Map(users.map((user) => [user.id, user]))
    const counts = getRoleCounts(profiles ?? [])

    return NextResponse.json({
      data: {
        users: (profiles ?? []).map((profile) => ({
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          email: usersById.get(profile.id)?.email ?? '',
          created_at: profile.created_at,
        })),
        current_user_id: currentProfile.id,
        plan: currentProfile.plan,
        limits: {
          max_users: PLAN_MAX_USERS[currentProfile.plan],
          role_limits: PLAN_ROLE_LIMITS[currentProfile.plan],
          available_roles: getAvailableRolesForPlan(currentProfile.plan),
        },
        counts,
      },
    })
  } catch (error) {
    console.error('[users:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar equipe.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

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
    const { data: existingProfiles, error: existingProfilesError } = await admin
      .from('profiles')
      .select('role')
      .eq('tenant_id', currentProfile.tenant_id)

    if (existingProfilesError) throw existingProfilesError

    const counts = getRoleCounts(existingProfiles ?? [])

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

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.full_name,
        tenant_id: currentProfile.tenant_id,
        role: parsed.data.role,
      },
    })

    if (createUserError) {
      if (createUserError.message.toLowerCase().includes('already')) {
        return NextResponse.json(
          { error: 'Já existe um usuário com este e-mail.' },
          { status: 409 }
        )
      }
      throw createUserError
    }

    const createdUserId = createdUser.user?.id

    if (!createdUserId) {
      throw new Error('Usuário criado sem identificador válido.')
    }

    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: createdUserId,
          tenant_id: currentProfile.tenant_id,
          full_name: parsed.data.full_name,
          role: parsed.data.role,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      await admin.auth.admin.deleteUser(createdUserId)
      throw profileError
    }

    return NextResponse.json({
      data: {
        id: createdUserId,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        role: parsed.data.role,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[users:post]', error)
    return NextResponse.json(
      { error: 'Erro ao criar usuário.' },
      { status: 500 }
    )
  }
}
