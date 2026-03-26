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

vi.mock('@/features/auth/components/Sidebar', () => ({
  default: ({ profile }: { profile: { full_name: string | null; role: string; tenants: { name: string; slug: string } | null } | null }) =>
    React.createElement(
      'aside',
      { 'data-slot': 'sidebar' },
      JSON.stringify(profile)
    ),
}))

vi.mock('@/features/auth/components/DashboardAccessGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('section', { 'data-slot': 'guard' }, children),
}))

vi.mock('@/features/pwa/components/InstallBanner', () => ({
  default: () => React.createElement('div', { 'data-slot': 'install-banner' }, 'Install Banner'),
}))

function profileQuery(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(async () => ({ data })),
  }
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza com profile nulo quando a query nao retorna dados', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
        })),
      },
      from: vi.fn(() => profileQuery(null)),
    })

    const { default: DashboardLayout } = await import('@/app/(dashboard)/layout')
    const markup = renderToStaticMarkup(
      await DashboardLayout({
        children: React.createElement('div', null, 'dashboard-child'),
      })
    )

    expect(markup).toContain('dashboard-child')
    expect(markup).toContain('Install Banner')
    expect(markup).toContain('null')
  })

  it('normaliza tenants em array vazio para null no profile', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-2' } },
        })),
      },
      from: vi.fn(() =>
        profileQuery({
          full_name: 'Marina',
          role: 'manager',
          tenants: [],
        })
      ),
    })

    const { default: DashboardLayout } = await import('@/app/(dashboard)/layout')
    const markup = renderToStaticMarkup(
      await DashboardLayout({
        children: React.createElement('div', null, 'array-child'),
      })
    )

    expect(markup).toContain('array-child')
    expect(markup).toContain('&quot;full_name&quot;:&quot;Marina&quot;')
    expect(markup).toContain('&quot;role&quot;:&quot;manager&quot;')
    expect(markup).toContain('&quot;tenants&quot;:null')
  })

  it('normaliza tenants indefinido para null no profile', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-3' } },
        })),
      },
      from: vi.fn(() =>
        profileQuery({
          full_name: 'Patricia',
          role: 'owner',
          tenants: undefined,
        })
      ),
    })

    const { default: DashboardLayout } = await import('@/app/(dashboard)/layout')
    const markup = renderToStaticMarkup(
      await DashboardLayout({
        children: React.createElement('div', null, 'undefined-tenant-child'),
      })
    )

    expect(markup).toContain('undefined-tenant-child')
    expect(markup).toContain('&quot;full_name&quot;:&quot;Patricia&quot;')
    expect(markup).toContain('&quot;role&quot;:&quot;owner&quot;')
    expect(markup).toContain('&quot;tenants&quot;:null')
  })
})
