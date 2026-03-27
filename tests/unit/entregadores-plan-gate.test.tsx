import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useHasFeatureMock = vi.fn()
const useUserMock = vi.fn()
const useDeliveryDriversMock = vi.fn()
const useCreateDeliveryDriverMock = vi.fn()
const useUpdateDeliveryDriverMock = vi.fn()
const useDeleteDeliveryDriverMock = vi.fn()

vi.mock('@/features/plans/hooks/usePlan', async () => {
  const actual = await vi.importActual<typeof import('@/features/plans/hooks/usePlan')>(
    '@/features/plans/hooks/usePlan'
  )

  return {
    ...actual,
    useHasFeature: (...args: Parameters<typeof useHasFeatureMock>) => useHasFeatureMock(...args),
  }
})

vi.mock('@/features/auth/hooks/useUser', () => ({
  useUser: () => useUserMock(),
}))

vi.mock('@/features/delivery/hooks/useDeliveryDrivers', () => ({
  useDeliveryDrivers: () => useDeliveryDriversMock(),
  useCreateDeliveryDriver: () => useCreateDeliveryDriverMock(),
  useUpdateDeliveryDriver: () => useUpdateDeliveryDriverMock(),
  useDeleteDeliveryDriver: () => useDeleteDeliveryDriverMock(),
}))

vi.mock('@/features/delivery/DeliveryDriversPageContent', () => ({
  DeliveryDriversPageContent: () =>
    React.createElement('div', null, 'Delivery Drivers Page Content Mock'),
}))

describe('Entregadores page plan gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUserMock.mockReturnValue({ user: { profile: { role: 'owner' } } })
    useDeliveryDriversMock.mockReturnValue({ data: [], isLoading: false })
    useCreateDeliveryDriverMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useUpdateDeliveryDriverMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useDeleteDeliveryDriverMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
  })

  it('mostra bloqueio quando a feature de pedidos não está disponível', async () => {
    useHasFeatureMock.mockReturnValue(false)

    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')
    const markup = renderToStaticMarkup(React.createElement(EntregadoresPage))

    expect(markup).toContain('Recurso não disponível')
    expect(markup).toContain('Ver planos disponíveis')
    expect(markup).not.toContain('Delivery Drivers Page Content Mock')
  })
})
