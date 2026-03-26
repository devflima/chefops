import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const usePathnameMock = vi.fn()
const usePlanMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    LayoutDashboard: Icon,
    Package: Icon,
    ArrowLeftRight: Icon,
    UtensilsCrossed: Icon,
    ClipboardList: Icon,
    BarChart2: Icon,
    LayoutGrid: Icon,
    MonitorCheck: Icon,
    Tag: Icon,
    LogOut: Icon,
    ChefHat: Icon,
    CreditCard: Icon,
    Settings: Icon,
    ReceiptText: Icon,
    PlugZap: Icon,
    Users: Icon,
    Bike: Icon,
  }
})

vi.mock('@/features/plans/hooks/usePlan', () => ({
  usePlan: () => usePlanMock(),
}))

function flattenElements(node: React.ReactNode): React.ReactElement[] {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') {
    return []
  }

  if (Array.isArray(node)) return node.flatMap((child) => flattenElements(child))
  if (!React.isValidElement(node)) return []
  if (typeof node.type === 'function') return flattenElements(node.type(node.props))

  return [node, ...flattenElements(node.props.children)]
}

function getTextContent(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => getTextContent(child)).join('')
  if (!React.isValidElement(node)) return ''
  return getTextContent(node.props.children)
}

describe('Sidebar component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePathnameMock.mockReturnValue('/dashboard')
    usePlanMock.mockReturnValue({ data: { plan: 'basic' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renderiza navegação por perfil e executa logout', async () => {
    const { default: Sidebar } = await import('@/features/auth/components/Sidebar')
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: { redirectTo: '/login' } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { location: { href: '/dashboard' } })

    const tree = React.createElement(Sidebar, {
      profile: {
        full_name: 'Maria Silva',
        role: 'owner',
        tenants: { name: 'ChefOps House', slug: 'chefops-house' },
      },
    })

    const markup = renderToStaticMarkup(tree)
    expect(markup).toContain('ChefOps House')
    expect(markup).toContain('Standard')
    expect(markup).toContain('Integrações')
    expect(markup).toContain('Usuários')

    const buttons = flattenElements(tree).filter((element) => element.type === 'button')
    const logoutButton = buttons.find((button) => getTextContent(button).includes('Sair'))
    await logoutButton?.props.onClick()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
    expect(globalThis.window.location.href).toBe('/login')
  })

  it('oculta itens sem permissão e usa fallback quando logout não retorna redirect', async () => {
    const { default: Sidebar } = await import('@/features/auth/components/Sidebar')
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(null),
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { location: { href: '/dashboard' } })
    usePlanMock.mockReturnValue({ data: null })
    usePathnameMock.mockReturnValue('/pedidos')

    const tree = React.createElement(Sidebar, {
      profile: {
        full_name: null,
        role: 'cashier',
        tenants: null,
      },
    })

    const markup = renderToStaticMarkup(tree)
    expect(markup).toContain('Pedidos')
    expect(markup).toContain('Comandas')
    expect(markup).not.toContain('Integrações')
    expect(markup).not.toContain('Usuários')
    expect(markup).not.toContain('Planos')

    const buttons = flattenElements(tree).filter((element) => element.type === 'button')
    const logoutButton = buttons.find((button) => getTextContent(button).includes('Sair'))
    await logoutButton?.props.onClick()

    expect(globalThis.window.location.href).toBe('/login')
  })

  it('oculta itens indisponíveis para o plano mesmo quando a role permite acesso', async () => {
    const { default: Sidebar } = await import('@/features/auth/components/Sidebar')

    usePlanMock.mockReturnValue({
      data: {
        plan: 'free',
        features: ['orders', 'menu', 'payments', 'team'],
      },
    })

    const tree = React.createElement(Sidebar, {
      profile: {
        full_name: 'Ana Owner',
        role: 'owner',
        tenants: { name: 'Casa da Ana', slug: 'casa-da-ana' },
      },
    })

    const markup = renderToStaticMarkup(tree)
    expect(markup).toContain('Pedidos')
    expect(markup).toContain('Cardápio')
    expect(markup).not.toContain('Mesas')
    expect(markup).not.toContain('Comandas')
    expect(markup).not.toContain('Estoque')
    expect(markup).not.toContain('Cozinha')
    expect(markup).not.toContain('Vendas')
  })

  it('renderiza sem links quando o profile é nulo e usa fallback se o json do logout falhar', async () => {
    const { default: Sidebar } = await import('@/features/auth/components/Sidebar')
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { location: { href: '/dashboard' } })
    usePlanMock.mockReturnValue({ data: { plan: 'pro' } })
    usePathnameMock.mockReturnValue('/produtos')

    const tree = React.createElement(Sidebar, {
      profile: null,
    })

    const markup = renderToStaticMarkup(tree)
    expect(markup).toContain('Premium')
    expect(markup).toContain('text-xs font-medium text-slate-600">?</div>')
    expect(markup).not.toContain('href="/dashboard"')
    expect(markup).not.toContain('href="/produtos"')

    const buttons = flattenElements(tree).filter((element) => element.type === 'button')
    const logoutButton = buttons.find((button) => getTextContent(button).includes('Sair'))
    await logoutButton?.props.onClick()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
    expect(globalThis.window.location.href).toBe('/login')
  })
})
