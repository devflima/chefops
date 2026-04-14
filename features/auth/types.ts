import type { EstablishmentRole } from '@/lib/rbac'

export type RegisterPayload = {
  full_name: string
  email: string
  password: string
  tenant_name: string
  tenant_slug: string
  cnpj: string
  zip_code: string
  street: string
  number: string
  neighborhood?: string
  city: string
  state: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  password: string
  confirm_password: string
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
