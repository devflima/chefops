import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { getKdsAdvancePayload, kdsStatusConfig } from '@/features/orders/kds-page'

vi.mock('@/features/plans/components/FeatureGate', () => ({
  default: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

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

  return [node, ...flattenElements(node.props.children)]
}

function getTextContent(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => getTextContent(child)).join('')
  if (!React.isValidElement(node)) return ''
  return getTextContent(node.props.children)
}

describe('kds helpers', () => {
  it('resolve o próximo avanço de status da cozinha', () => {
    expect(kdsStatusConfig.confirmed.nextLabel).toBe('Iniciar preparo')
    expect(getKdsAdvancePayload({ id: 'order-1', status: 'confirmed' })).toEqual({
      id: 'order-1',
      status: 'preparing',
    })
    expect(getKdsAdvancePayload({ id: 'order-2', status: 'delivered' })).toBeNull()
  })
})

describe('KDSPageContent', () => {
  it('renderiza pedido de cozinha e aciona avanço', async () => {
    vi.resetModules()
    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      return {
        ...actualReact,
        useEffect: vi.fn(),
        useState: (initialValue: unknown) => [initialValue, vi.fn()],
      }
    })

    const { KDSPageContent } = await import('@/features/orders/KDSPageContent')
    const onAdvance = vi.fn()

    const order = {
      id: 'order-1',
      order_number: 42,
      status: 'confirmed',
      created_at: '2026-03-21T00:00:00.000Z',
      table_number: 7,
      notes: 'Sem cebola',
      items: [
        {
          id: 'item-1',
          name: 'Pizza',
          quantity: 2,
          notes: 'Bem assada',
          extras: [{ id: 'extra-1', name: 'Borda' }],
        },
      ],
    }

    const markup = renderToStaticMarkup(
      React.createElement(KDSPageContent, {
        orders: [order],
        updatePending: false,
        onAdvance,
      })
    )

    expect(markup).toContain('Cozinha')
    expect(markup).toContain('Mesa 7')
    expect(markup).toContain('Sem cebola')
    expect(markup).toContain('Iniciar preparo')

    const elements = flattenElements(
      KDSPageContent({
        orders: [order],
        updatePending: false,
        onAdvance,
      })
    )

    const advanceButton = elements.find(
      (element) =>
        element.type === 'button' &&
        getTextContent(element.props.children).includes('Iniciar preparo')
    )

    expect(advanceButton).toBeTruthy()
    advanceButton?.props.onClick()
    expect(onAdvance).toHaveBeenCalledWith(order)
  })

  it('renderiza o estado vazio da cozinha', async () => {
    vi.resetModules()
    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      return {
        ...actualReact,
        useEffect: vi.fn(),
        useState: (initialValue: unknown) => [initialValue, vi.fn()],
      }
    })

    const { KDSPageContent } = await import('@/features/orders/KDSPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(KDSPageContent, {
        orders: [],
        updatePending: false,
        onAdvance: vi.fn(),
      })
    )

    expect(markup).toContain('Nenhum pedido no momento')
  })

  it('executa o relógio do elapsed time, limpa o intervalo e desabilita avanço pendente', async () => {
    vi.resetModules()

    const RealDate = Date
    const setIntervalMock = vi.fn(() => 123)
    const clearIntervalMock = vi.fn()
    const effectCleanups: Array<() => void> = []
    const setElapsedMock = vi.fn()
    const setUrgentMock = vi.fn()

    vi.stubGlobal('Date', class extends Date {
      constructor(value?: string | number | Date) {
        super(value ?? '2026-03-21T00:12:05.000Z')
      }

      static now() {
        return new RealDate('2026-03-21T00:12:05.000Z').getTime()
      }
    } as DateConstructor)
    vi.stubGlobal('setInterval', setIntervalMock)
    vi.stubGlobal('clearInterval', clearIntervalMock)

    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      let stateCall = 0

      return {
        ...actualReact,
        useEffect: (effect: () => void | (() => void)) => {
          const cleanup = effect()
          if (typeof cleanup === 'function') effectCleanups.push(cleanup)
        },
        useState: (initialValue: unknown) => {
          stateCall += 1
          if (stateCall === 1) return [initialValue, setElapsedMock]
          if (stateCall === 2) return [initialValue, setUrgentMock]
          return [initialValue, vi.fn()]
        },
      }
    })

    const { KDSPageContent } = await import('@/features/orders/KDSPageContent')

    const order = {
      id: 'order-ready',
      order_number: 88,
      status: 'preparing',
      created_at: '2026-03-21T00:00:00.000Z',
      table_number: null,
      notes: null,
      items: [
        {
          id: 'item-1',
          name: 'Hamburguer',
          quantity: 1,
          notes: null,
          extras: [],
        },
      ],
    }

    const tree = KDSPageContent({
      orders: [order],
      updatePending: true,
      onAdvance: vi.fn(),
    })
    const elements = flattenElements(tree)
    const advanceButton = elements.find(
      (element) =>
        element.type === 'button' &&
        getTextContent(element.props.children).includes('Marcar pronto')
    )
    const elapsedTime = elements.find(
      (element) => typeof element.type === 'function' && element.type.name === 'ElapsedTime'
    )

    expect(advanceButton).toBeTruthy()
    expect(getTextContent(advanceButton?.props.children)).toContain('Marcar pronto')
    expect(advanceButton?.props.disabled).toBe(true)
    expect(elapsedTime).toBeTruthy()

    const elapsedNode = elapsedTime?.type(elapsedTime.props)

    expect(renderToStaticMarkup(React.createElement(React.Fragment, null, elapsedNode))).toContain('span')
    expect(setElapsedMock).toHaveBeenCalledWith('12:05')
    expect(setUrgentMock).toHaveBeenCalledWith(true)
    expect(setIntervalMock).toHaveBeenCalled()

    effectCleanups.forEach((cleanup) => cleanup())

    expect(clearIntervalMock).toHaveBeenCalledWith(123)
  })

  it('mantém elapsed time sem classe urgente antes de 10 minutos', async () => {
    vi.resetModules()

    const RealDate = Date
    const setElapsedMock = vi.fn()
    const setUrgentMock = vi.fn()

    vi.stubGlobal('Date', class extends Date {
      constructor(value?: string | number | Date) {
        super(value ?? '2026-03-21T00:09:05.000Z')
      }

      static now() {
        return new RealDate('2026-03-21T00:09:05.000Z').getTime()
      }
    } as DateConstructor)
    vi.stubGlobal('setInterval', vi.fn(() => 456))
    vi.stubGlobal('clearInterval', vi.fn())

    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      let stateCall = 0

      return {
        ...actualReact,
        useEffect: (effect: () => void | (() => void)) => {
          effect()
        },
        useState: (initialValue: unknown) => {
          stateCall += 1
          if (stateCall === 1) return [initialValue, setElapsedMock]
          if (stateCall === 2) return [initialValue, setUrgentMock]
          return [initialValue, vi.fn()]
        },
      }
    })

    const { KDSPageContent } = await import('@/features/orders/KDSPageContent')

    const elements = flattenElements(
      KDSPageContent({
        orders: [{
          id: 'order-soft-clock',
          order_number: 13,
          status: 'confirmed',
          created_at: '2026-03-21T00:00:00.000Z',
          table_number: null,
          notes: null,
          items: [{ id: 'item-1', name: 'Suco', quantity: 1, notes: null, extras: [] }],
        }],
        updatePending: false,
        onAdvance: vi.fn(),
      })
    )

    const elapsedTime = elements.find(
      (element) => typeof element.type === 'function' && element.type.name === 'ElapsedTime'
    )
    const elapsedNode = elapsedTime?.type(elapsedTime.props)
    const markup = renderToStaticMarkup(React.createElement(React.Fragment, null, elapsedNode))

    expect(markup).toContain('<span class="">')
    expect(setElapsedMock).toHaveBeenCalledWith('9:05')
    expect(setUrgentMock).toHaveBeenCalledWith(false)
  })

  it('renderiza elapsed time com classe urgente quando o estado já está marcado', async () => {
    vi.resetModules()

    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      let stateCall = 0

      return {
        ...actualReact,
        useEffect: vi.fn(),
        useState: () => {
          stateCall += 1
          if (stateCall === 1) return ['12:05', vi.fn()]
          if (stateCall === 2) return [true, vi.fn()]
          return ['', vi.fn()]
        },
      }
    })

    const { KDSPageContent } = await import('@/features/orders/KDSPageContent')

    const elements = flattenElements(
      KDSPageContent({
        orders: [{
          id: 'order-urgent-clock',
          order_number: 77,
          status: 'confirmed',
          created_at: '2026-03-21T00:00:00.000Z',
          table_number: null,
          notes: null,
          items: [{ id: 'item-1', name: 'Lanche', quantity: 1, notes: null, extras: [] }],
        }],
        updatePending: false,
        onAdvance: vi.fn(),
      })
    )

    const elapsedTime = elements.find(
      (element) => typeof element.type === 'function' && element.type.name === 'ElapsedTime'
    )
    const elapsedNode = elapsedTime?.type(elapsedTime.props)
    const markup = renderToStaticMarkup(React.createElement(React.Fragment, null, elapsedNode))

    expect(markup).toContain('animate-pulse font-bold text-red-500')
    expect(markup).toContain('12:05')
  })

  it('ignora pedidos sem configuração de status no grid', async () => {
    vi.resetModules()
    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      return {
        ...actualReact,
        useEffect: vi.fn(),
        useState: (initialValue: unknown) => [initialValue, vi.fn()],
      }
    })

    const { KDSPageContent } = await import('@/features/orders/KDSPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(KDSPageContent, {
        orders: [{
          id: 'order-ignored',
          order_number: 99,
          status: 'delivered',
          created_at: '2026-03-21T00:00:00.000Z',
          table_number: null,
          notes: null,
          items: [],
        }],
        updatePending: false,
        onAdvance: vi.fn(),
      })
    )

    expect(markup).toContain('Cozinha')
    expect(markup).not.toContain('#99')
    expect(markup).not.toContain('Marcar pronto')
    expect(markup).not.toContain('Iniciar preparo')
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.doUnmock('react')
  vi.resetModules()
})
