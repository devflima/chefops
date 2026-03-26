import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  CardContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  CardHeader: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  CardTitle: ({ children }: React.PropsWithChildren) => React.createElement('h1', null, children),
  CardDescription: ({ children }: React.PropsWithChildren) => React.createElement('p', null, children),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormControl: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormField: ({
    name,
    render,
  }: {
    name: string
    render: (params: { field: { value: string; onChange: ReturnType<typeof vi.fn> } }) => React.ReactNode
  }) =>
    React.createElement(
      React.Fragment,
      null,
      render({ field: { value: '', onChange: vi.fn(), name } })
    ),
  FormItem: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  FormLabel: ({ children }: React.PropsWithChildren) => React.createElement('label', null, children),
  FormMessage: () => null,
  FormDescription: ({ children }: React.PropsWithChildren) => React.createElement('p', null, children),
}))

describe('auth page contents', () => {
  function flattenElements(node: React.ReactNode): React.ReactElement[] {
    if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') {
      return []
    }

    if (Array.isArray(node)) {
      return node.flatMap((child) => flattenElements(child))
    }

    if (!React.isValidElement(node)) {
      return []
    }

    if (typeof node.type === 'function') {
      return flattenElements(node.type(node.props))
    }

    return [node, ...flattenElements(node.props.children)]
  }

  it('renderiza o conteúdo de login', async () => {
    const { LoginPageContent } = await import('@/features/auth/components/LoginPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(LoginPageContent, {
        form: {
          control: {},
          handleSubmit: () => vi.fn(),
          formState: { isSubmitting: false },
        },
        error: 'Falha no login',
        onSubmit: vi.fn(),
      })
    )

    expect(markup).toContain('Entrar')
    expect(markup).toContain('Falha no login')
    expect(markup).toContain('Cadastre seu estabelecimento')
  })

  it('renderiza login em loading sem erro', async () => {
    const { LoginPageContent } = await import('@/features/auth/components/LoginPageContent')
    const onSubmit = vi.fn()

    const element = React.createElement(LoginPageContent, {
      form: {
        control: {},
        handleSubmit: () => onSubmit,
        formState: { isSubmitting: true },
      },
      error: null,
      onSubmit,
    })

    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Entrando...')
    expect(markup).not.toContain('Falha no login')

    const elements = flattenElements(element)
    const form = elements.find((node) => node.type === 'form')
    const submitButton = elements.find(
      (node) => node.type === 'button' && String(node.props.type) === 'submit'
    )

    expect(submitButton?.props.disabled).toBe(true)

    form?.props.onSubmit?.()

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('renderiza o conteúdo de cadastro', async () => {
    const { RegisterPageContent } = await import('@/features/auth/components/RegisterPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(RegisterPageContent, {
        form: {
          control: {},
          handleSubmit: () => vi.fn(),
          formState: { isSubmitting: true },
        },
        error: null,
        onSubmit: vi.fn(),
        onTenantNameChange: vi.fn(),
      })
    )

    expect(markup).toContain('Criar conta')
    expect(markup).toContain('Criando conta...')
    expect(markup).toContain('Usado na URL do seu cardápio digital')
    expect(markup).toContain('Já tem conta?')
  })

  it('aciona o espelhamento do nome do estabelecimento no conteúdo de cadastro', async () => {
    const { RegisterPageContent } = await import('@/features/auth/components/RegisterPageContent')
    const onTenantNameChange = vi.fn()

    const element = React.createElement(RegisterPageContent, {
      form: {
        control: {},
        handleSubmit: () => vi.fn(),
        formState: { isSubmitting: false },
      },
      error: 'Erro de cadastro',
      onSubmit: vi.fn(),
      onTenantNameChange,
    })

    const inputs = flattenElements(element).filter((node) => node.type === 'input')
    inputs[0]?.props.onChange({
      target: { value: 'Pizzaria ChefOps' },
    })

    expect(onTenantNameChange).toHaveBeenCalledWith('Pizzaria ChefOps')
  })
})
