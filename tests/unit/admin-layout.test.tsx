import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const createClientMock = vi.fn()
const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`)
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    ChefHat: Icon,
    LayoutDashboard: Icon,
    Building2: Icon,
    LogOut: Icon,
  }
})

function profileQuery(profile: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(async () => ({ data: profile })),
  }
}

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('usa o fallback A quando o admin não tem nome', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'admin-1' } },
        })),
      },
      from: vi.fn(() =>
        profileQuery({
          full_name: null,
          is_admin: true,
        })
      ),
    })

    const { default: AdminLayout } = await import('@/app/admin/layout')
    const markup = renderToStaticMarkup(
      await AdminLayout({
        children: React.createElement('div', null, 'admin-child'),
      })
    )

    expect(markup).toContain('Painel Admin')
    expect(markup).toContain('Visão geral')
    expect(markup).toContain('Estabelecimentos')
    expect(markup).toContain('>A</div>')
    expect(markup).toContain('admin-child')
    expect(markup).toContain('action="/api/auth/logout"')
  })
})
