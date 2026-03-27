import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useStateMock = vi.fn()
const useSalesMetricsMock = vi.fn()

let stateValues: unknown[] = []
let stateSetters: ReturnType<typeof vi.fn>[] = []

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    default: actual,
    useState: (initial: unknown) => {
      const setter = vi.fn()
      const index = stateSetters.length
      stateSetters.push(setter)
      useStateMock(initial)
      return [index in stateValues ? stateValues[index] : initial, setter]
    },
  }
})

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useSalesMetrics: (...args: Parameters<typeof useSalesMetricsMock>) => useSalesMetricsMock(...args),
}))

vi.mock('@/features/plans/components/FeatureGate', () => ({
  default: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    BarChart2: Icon,
    TrendingUp: Icon,
    ShoppingBag: Icon,
    XCircle: Icon,
    Clock: Icon,
  }
})

function flattenElements(node: React.ReactNode): React.ReactElement[] {
  if (!node || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return []
  }

  if (Array.isArray(node)) {
    return node.flatMap(flattenElements)
  }

  if (!React.isValidElement(node)) {
    return []
  }

  return [node, ...flattenElements(node.props.children)]
}

describe('VendasPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateValues = []
    stateSetters = []

    useSalesMetricsMock.mockReturnValue({
      data: {
        revenue: 1234.5,
        paid_orders: 12,
        delivered: 12,
        average_ticket: 102.87,
        cancelled: 2,
        pending: 3,
        cancellation_rate: 14.3,
      },
      isLoading: false,
    })
  })

  it('renderiza loading quando as métricas ainda estão carregando', async () => {
    useSalesMetricsMock.mockReturnValue({
      data: null,
      isLoading: true,
    })

    const { default: VendasPage } = await import('@/app/(dashboard)/vendas/page')

    const markup = renderToStaticMarkup(React.createElement(VendasPage))

    expect(markup).toContain('Vendas')
    expect(markup).toContain('Carregando métricas...')
    expect(useSalesMetricsMock).toHaveBeenCalledWith('today')
  })

  it('renderiza cards e troca o período para mês', async () => {
    const { default: VendasPage } = await import('@/app/(dashboard)/vendas/page')

    const tree = VendasPage()
    const buttons = flattenElements(tree).filter((element) => element.type === 'button')
    const monthButton = buttons.find((button) => button.props.children === 'Este mês')

    const markup = renderToStaticMarkup(tree)

    expect(markup).toContain('Faturamento')
    expect(markup).toContain('R$ 1234.50')
    expect(markup).toContain('Vendas concluídas')
    expect(markup).toContain('12')
    expect(markup).toContain('Ticket médio')
    expect(markup).toContain('R$ 102.87')
    expect(markup).toContain('Taxa de cancelamento')
    expect(markup).toContain('14.3%')
    expect(useSalesMetricsMock).toHaveBeenCalledWith('today')

    ;(monthButton?.props.onClick as (() => void) | undefined)?.()

    expect(stateSetters[0]).toHaveBeenCalledWith('month')
  })
})
