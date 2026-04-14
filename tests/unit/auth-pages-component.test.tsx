import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { buildTenantSlug } from '@/features/auth/register-page'

const pushMock = vi.fn()
const refreshMock = vi.fn()
const setValueMock = vi.fn()
const resetPasswordForEmailMock = vi.fn()
const updateUserMock = vi.fn()

let currentUseFormValue: Record<string, unknown>
let capturedLoginContentProps: Record<string, unknown> | null = null
let capturedRegisterContentProps: Record<string, unknown> | null = null
let capturedForgotPasswordContentProps: Record<string, unknown> | null = null
let capturedResetPasswordContentProps: Record<string, unknown> | null = null

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

vi.mock('react-hook-form', () => ({
  useForm: () => currentUseFormValue,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: resetPasswordForEmailMock,
      updateUser: updateUserMock,
    },
  }),
}))

vi.mock('@/features/auth/components/LoginPageContent', () => ({
  LoginPageContent: (props: Record<string, unknown>) => {
    capturedLoginContentProps = props
    return React.createElement('div', null, 'Login Page Content Mock')
  },
}))

vi.mock('@/features/auth/components/RegisterPageContent', () => ({
  RegisterPageContent: (props: Record<string, unknown>) => {
    capturedRegisterContentProps = props
    return React.createElement('div', null, 'Register Page Content Mock')
  },
}))

vi.mock('@/features/auth/components/ForgotPasswordPageContent', () => ({
  ForgotPasswordPageContent: (props: Record<string, unknown>) => {
    capturedForgotPasswordContentProps = props
    return React.createElement('div', null, 'Forgot Password Page Content Mock')
  },
}))

vi.mock('@/features/auth/components/ResetPasswordPageContent', () => ({
  ResetPasswordPageContent: (props: Record<string, unknown>) => {
    capturedResetPasswordContentProps = props
    return React.createElement('div', null, 'Reset Password Page Content Mock')
  },
}))

describe('auth pages components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedLoginContentProps = null
    capturedRegisterContentProps = null
    capturedForgotPasswordContentProps = null
    capturedResetPasswordContentProps = null
    currentUseFormValue = {
      control: {},
      setValue: setValueMock,
      handleSubmit: vi.fn((callback: (values: unknown) => unknown) => callback),
      formState: {
        isSubmitting: false,
      },
    }
    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.test'
    resetPasswordForEmailMock.mockResolvedValue({ error: null })
    updateUserMock.mockResolvedValue({ error: null })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submete login com sucesso e redireciona para o dashboard', async () => {
    const { default: LoginPage } = await import('@/app/(auth)/login/page')

    expect(renderToStaticMarkup(React.createElement(LoginPage))).toContain('Login Page Content Mock')
    expect(capturedLoginContentProps).toBeTruthy()

    const props = capturedLoginContentProps as {
      error: string | null
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    expect(props.error).toBeNull()

    await props.onSubmit({
      email: 'chef@ops.test',
      password: '123456',
    })

    expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'chef@ops.test',
        password: '123456',
      }),
    })
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('não redireciona no login quando a API retorna erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Credenciais inválidas' }),
      })
    )

    const { default: LoginPage } = await import('@/app/(auth)/login/page')
    renderToStaticMarkup(React.createElement(LoginPage))

    const props = capturedLoginContentProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    await props.onSubmit({
      email: 'chef@ops.test',
      password: '123456',
    })

    expect(pushMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('gera slug automaticamente e submete o cadastro forte com sucesso', async () => {
    const { default: RegisterPage } = await import('@/app/(auth)/register/page')

    expect(renderToStaticMarkup(React.createElement(RegisterPage))).toContain('Register Page Content Mock')
    expect(capturedRegisterContentProps).toBeTruthy()

    const props = capturedRegisterContentProps as {
      error: string | null
      onSubmit: (values: Record<string, unknown>) => Promise<void>
      onTenantNameChange: (value: string) => void
    }

    expect(props.error).toBeNull()
    props.onTenantNameChange('Pizzaria do João')

    expect(setValueMock).toHaveBeenCalledWith('tenant_slug', 'pizzaria-do-joao', {
      shouldValidate: true,
    })

    await props.onSubmit({
      tenant_name: 'Pizzaria do João',
      tenant_slug: 'pizzaria-do-joao',
      cnpj: '12.345.678/0001-90',
      zip_code: '01001-000',
      street: 'Rua A',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'sp',
      full_name: 'João Silva',
      email: 'joao@chefops.test',
      password: '123456',
    })

    expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_name: 'Pizzaria do João',
        tenant_slug: 'pizzaria-do-joao',
        cnpj: '12.345.678/0001-90',
        zip_code: '01001-000',
        street: 'Rua A',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'sp',
        full_name: 'João Silva',
        email: 'joao@chefops.test',
        password: '123456',
      }),
    })
    expect(pushMock).toHaveBeenCalledWith('/login?registered=true')
  })

  it('não redireciona no cadastro quando a API retorna erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Slug já está em uso' }),
      })
    )

    const { default: RegisterPage } = await import('@/app/(auth)/register/page')
    renderToStaticMarkup(React.createElement(RegisterPage))

    const props = capturedRegisterContentProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    await props.onSubmit({
      tenant_name: 'Pizzaria do João',
      tenant_slug: 'pizzaria-do-joao',
      cnpj: '12.345.678/0001-90',
      zip_code: '01001-000',
      street: 'Rua A',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      full_name: 'João Silva',
      email: 'joao@chefops.test',
      password: '123456',
    })

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('envia link de recuperação de senha', async () => {
    const { default: ForgotPasswordPage } = await import('@/app/(auth)/forgot-password/page')

    expect(renderToStaticMarkup(React.createElement(ForgotPasswordPage))).toContain('Forgot Password Page Content Mock')
    expect(capturedForgotPasswordContentProps).toBeTruthy()

    const props = capturedForgotPasswordContentProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    await props.onSubmit({ email: 'chef@ops.test' })

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('chef@ops.test', {
      redirectTo: 'https://chefops.test/reset-password',
    })
  })

  it('atualiza a senha e redireciona para o login', async () => {
    const { default: ResetPasswordPage } = await import('@/app/(auth)/reset-password/page')

    expect(renderToStaticMarkup(React.createElement(ResetPasswordPage))).toContain('Reset Password Page Content Mock')
    expect(capturedResetPasswordContentProps).toBeTruthy()

    const props = capturedResetPasswordContentProps as {
      onSubmit: (values: Record<string, unknown>) => Promise<void>
    }

    await props.onSubmit({
      password: 'nova-senha-123',
      confirm_password: 'nova-senha-123',
    })

    expect(updateUserMock).toHaveBeenCalledWith({ password: 'nova-senha-123' })
    expect(pushMock).toHaveBeenCalledWith('/login?reset=true')
  })

  it('normaliza o slug do estabelecimento', () => {
    expect(buildTenantSlug('Pizzaria do João')).toBe('pizzaria-do-joao')
    expect(buildTenantSlug('  Açai & Burger  ')).toBe('acai-burger')
  })
})
