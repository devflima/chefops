import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useMercadoPagoAccountMock = vi.fn()
const useDisconnectMercadoPagoAccountMock = vi.fn()
const useNotificationSettingsMock = vi.fn()
const useUpdateNotificationSettingsMock = vi.fn()
const useDeliverySettingsMock = vi.fn()
const useUpdateDeliverySettingsMock = vi.fn()
const useHasFeatureMock = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}))

vi.mock('@/features/payments/hooks/useMercadoPagoAccount', () => ({
  useMercadoPagoAccount: () => useMercadoPagoAccountMock(),
  useDisconnectMercadoPagoAccount: () => useDisconnectMercadoPagoAccountMock(),
}))

vi.mock('@/features/notifications/hooks/useNotificationSettings', () => ({
  useNotificationSettings: () => useNotificationSettingsMock(),
  useUpdateNotificationSettings: () => useUpdateNotificationSettingsMock(),
}))

vi.mock('@/features/delivery/hooks/useDeliverySettings', () => ({
  useDeliverySettings: () => useDeliverySettingsMock(),
  useUpdateDeliverySettings: () => useUpdateDeliverySettingsMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', async () => {
  const actual = await vi.importActual<typeof import('@/features/plans/hooks/usePlan')>(
    '@/features/plans/hooks/usePlan'
  )

  return {
    ...actual,
    useHasFeature: (...args: Parameters<typeof useHasFeatureMock>) => useHasFeatureMock(...args),
  }
})

vi.mock('@/features/payments/IntegrationsPageContent', () => ({
  IntegrationsPageContent: () => React.createElement('div', null, 'Integrations Page Content Mock'),
}))

describe('Integracoes page plan gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMercadoPagoAccountMock.mockReturnValue({ data: null, isLoading: false })
    useDisconnectMercadoPagoAccountMock.mockReturnValue({ isPending: false, mutate: vi.fn() })
    useNotificationSettingsMock.mockReturnValue({ data: null, isLoading: false })
    useUpdateNotificationSettingsMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useDeliverySettingsMock.mockReturnValue({ data: null, isLoading: false })
    useUpdateDeliverySettingsMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
  })

  it('mostra bloqueio quando o plano não inclui pagamentos', async () => {
    useHasFeatureMock.mockReturnValue(false)

    const { default: IntegracoesPage } = await import('@/app/(dashboard)/integracoes/page')
    const markup = renderToStaticMarkup(React.createElement(IntegracoesPage))

    expect(markup).toContain('Recurso não disponível')
    expect(markup).toContain('Ver planos disponíveis')
    expect(markup).not.toContain('Integrations Page Content Mock')
  })
})
