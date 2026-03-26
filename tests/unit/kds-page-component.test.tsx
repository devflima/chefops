import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useKDSOrdersMock = vi.fn()
const useUpdateOrderStatusMock = vi.fn()
const invalidateQueriesMock = vi.fn()
const refetchMock = vi.fn()
const createChannelMock = vi.fn()
const channelOnMock = vi.fn()
const channelSubscribeMock = vi.fn()
const removeChannelMock = vi.fn()

let realtimeCallback: (() => void) | null = null
let capturedContentProps: Record<string, unknown> | null = null
let capturedCleanup: (() => void) | undefined

vi.mock('react', async () => {
  const actualReact = await vi.importActual<typeof import('react')>('react')

  return {
    ...actualReact,
    default: actualReact,
    useEffect: (callback: () => void | (() => void)) => {
      const cleanupCandidate = callback()
      if (typeof cleanupCandidate === 'function') capturedCleanup = cleanupCandidate
    },
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}))

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useKDSOrders: () => useKDSOrdersMock(),
  useUpdateOrderStatus: () => useUpdateOrderStatusMock(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: createChannelMock,
    removeChannel: removeChannelMock,
  }),
}))

vi.mock('@/features/plans/components/FeatureGate', () => ({
  default: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

vi.mock('@/features/orders/KDSPageContent', () => ({
  KDSPageContent: (props: Record<string, unknown>) => {
    capturedContentProps = props
    return React.createElement('div', null, 'KDS Page Content Mock')
  },
}))

describe('KDSPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedContentProps = null
    realtimeCallback = null
    capturedCleanup = undefined

    useKDSOrdersMock.mockReturnValue({
      data: [
        {
          id: 'order-1',
          order_number: 42,
          status: 'confirmed',
          created_at: '2026-03-21T00:00:00.000Z',
        },
      ],
      refetch: refetchMock,
    })
    useUpdateOrderStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })

    channelSubscribeMock.mockReturnValue({ unsubscribe: vi.fn() })
    channelOnMock.mockImplementation((...args: unknown[]) => {
      realtimeCallback = args[2] as () => void
      return {
        subscribe: channelSubscribeMock,
      }
    })
    createChannelMock.mockReturnValue({
      on: channelOnMock,
    })
  })

  afterEach(() => {
    capturedCleanup = undefined
  })

  it('encaminha o avanço do pedido e invalida a query da cozinha', async () => {
    const { default: KDSPage } = await import('@/app/(dashboard)/kds/page')

    expect(renderToStaticMarkup(React.createElement(KDSPage))).toContain('KDS Page Content Mock')
    expect(capturedContentProps).toBeTruthy()

    const props = capturedContentProps as {
      orders: Array<{ id: string; status: string }>
      updatePending: boolean
      onAdvance: (order: { id: string; status: string }) => Promise<void>
    }

    expect(props.orders).toHaveLength(1)
    expect(props.updatePending).toBe(false)

    const mutateAsync = useUpdateOrderStatusMock.mock.results[0]?.value.mutateAsync as ReturnType<typeof vi.fn>

    await props.onAdvance({ id: 'order-1', status: 'confirmed' })
    await props.onAdvance({ id: 'order-1', status: 'delivered' })

    expect(mutateAsync).toHaveBeenCalledWith({ id: 'order-1', status: 'preparing' })
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['kds-orders'] })
    expect(createChannelMock).toHaveBeenCalledWith('kds-realtime')
    expect(channelOnMock).toHaveBeenCalled()
    expect(channelSubscribeMock).toHaveBeenCalledTimes(1)

    realtimeCallback?.()
    expect(refetchMock).toHaveBeenCalledTimes(1)
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['kds-orders'] })
  })

  it('cobre fallback de pedidos vazios e cleanup do canal realtime', async () => {
    useKDSOrdersMock.mockReturnValue({
      data: null,
      refetch: refetchMock,
    })

    const { default: KDSPage } = await import('@/app/(dashboard)/kds/page')

    expect(renderToStaticMarkup(React.createElement(KDSPage))).toContain('KDS Page Content Mock')

    const props = capturedContentProps as {
      orders: Array<unknown>
      updatePending: boolean
    }

    expect(props.orders).toEqual([])
    expect(props.updatePending).toBe(false)

    capturedCleanup?.()
    expect(removeChannelMock).toHaveBeenCalledTimes(1)
    expect(removeChannelMock).toHaveBeenCalledWith(expect.objectContaining({ unsubscribe: expect.any(Function) }))
  })
})
