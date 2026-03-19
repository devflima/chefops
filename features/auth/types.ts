import type { EstablishmentRole } from '@/lib/rbac'

export type RegisterPayload = {
  full_name: string
  email: string
  password: string
  tenant_name: string
  tenant_slug: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  email: string
  profile: {
    full_name: string | null
    role: EstablishmentRole
    tenant_id: string
    tenant: {
      id: string
      name: string
      slug: string
      plan: string
    }
  }
}
