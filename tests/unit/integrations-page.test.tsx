import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  buildDeliveryFeePayload,
  buildDeliveryHoursPayload,
  buildDeliveryOperationPayload,
  buildDeliveryPricingModePayload,
  buildDeliverySchedulePayload,
  buildDeliveryTogglePayload,
  buildNotificationTogglePayload,
  getDeliveryFeeValue,
  getMercadoPagoAlertMessage,
  whatsappOptionDefinitions,
} from '@/features/payments/integrations-page'

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    Landmark: Icon,
    Link2: Icon,
    ShieldCheck: Icon,
    Unplug: Icon,
  }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', props, children),
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

  if (typeof node.type === 'function') {
    return flattenElements(node.type(node.props))
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

describe('integrations page helpers', () => {
  it('resolve mensagens do retorno do Mercado Pago', () => {
    expect(getMercadoPagoAlertMessage('connected')).toBe('Conta Mercado Pago conectada com sucesso.')
    expect(getMercadoPagoAlertMessage('error')).toBe(
      'Não foi possível concluir a conexão com o Mercado Pago.'
    )
    expect(getMercadoPagoAlertMessage('invalid_state')).toBe(
      'A validação do retorno OAuth falhou. Tente conectar novamente.'
    )
    expect(getMercadoPagoAlertMessage(null)).toBeNull()
  })

  it('monta payloads e valores auxiliares', () => {
    expect(getDeliveryFeeValue(null, 8)).toBe('8')
    expect(getDeliveryFeeValue('12.5', 8)).toBe('12.5')


    expect(
      buildDeliveryTogglePayload({
        tenant_id: 'tenant-1',
        delivery_enabled: true,
        flat_fee: 9,
      })
    ).toEqual({
      tenant_id: 'tenant-1',
      delivery_enabled: false,
      flat_fee: 9,
      accepting_orders: true,
      schedule_enabled: false,
      opens_at: null,
      closes_at: null,
      pricing_mode: 'flat',
      max_radius_km: null,
      fee_per_km: null,
      origin_zip_code: null,
      origin_street: null,
      origin_number: null,
      origin_neighborhood: null,
      origin_city: null,
      origin_state: null,
    })

    expect(
      buildDeliveryPricingModePayload({
        tenant_id: 'tenant-1',
        delivery_enabled: true,
        flat_fee: 9,
      }, 'distance')
    ).toEqual({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 9,
      accepting_orders: true,
      schedule_enabled: false,
      opens_at: null,
      closes_at: null,
      pricing_mode: 'distance',
      max_radius_km: null,
      fee_per_km: null,
      origin_zip_code: null,
      origin_street: null,
      origin_number: null,
      origin_neighborhood: null,
      origin_city: null,
      origin_state: null,
    })


    expect(
      buildDeliveryFeePayload(
        {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 9,
          accepting_orders: true,
          schedule_enabled: true,
          opens_at: '09:00',
          closes_at: '18:00',
        },
        '15.75'
      )
    ).toMatchObject({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 15.75,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })

    expect(
      buildDeliveryFeePayload(
        {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 9,
          accepting_orders: true,
          schedule_enabled: true,
          opens_at: '09:00',
          closes_at: '18:00',
        },
        ''
      )
    ).toMatchObject({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 0,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })

    expect(
      buildDeliveryOperationPayload(
        {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 9,
          accepting_orders: true,
          schedule_enabled: true,
          opens_at: '09:00',
          closes_at: '18:00',
        },
        false
      )
    ).toMatchObject({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 9,
      accepting_orders: false,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    })

    expect(
      buildDeliverySchedulePayload(
        {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 9,
          accepting_orders: true,
          schedule_enabled: false,
          opens_at: null,
          closes_at: null,
        },
        true
      )
    ).toMatchObject({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 9,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: null,
      closes_at: null,
    })

    expect(
      buildDeliveryHoursPayload(
        {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 9,
          accepting_orders: true,
          schedule_enabled: true,
          opens_at: '09:00',
          closes_at: '18:00',
        },
        '10:00',
        '22:00'
      )
    ).toMatchObject({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 9,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '10:00',
      closes_at: '22:00',
    })

    expect(
      buildNotificationTogglePayload(
        {
          whatsapp_order_received: true,
          whatsapp_order_confirmed: false,
          whatsapp_order_preparing: false,
          whatsapp_order_ready: false,
          whatsapp_order_out_for_delivery: false,
          whatsapp_order_delivered: false,
          whatsapp_order_cancelled: false,
        },
        'whatsapp_order_received'
      )
    ).toMatchObject({
      whatsapp_order_received: false,
    })
  })
})

describe('IntegrationsPageContent', () => {
  it('renderiza conta conectada e aciona handlers principais', async () => {
    const { IntegrationsPageContent } = await import('@/features/payments/IntegrationsPageContent')

    const onDisconnect = vi.fn()
    const onDeliveryToggle = vi.fn()
    const onDeliveryOperationChange = vi.fn()
    const onDeliveryScheduleChange = vi.fn()
    const onDeliveryHoursChange = vi.fn()
    const onDeliveryFeeInputChange = vi.fn()
    const onDeliveryFeeSave = vi.fn()
    const onDeliveryHoursSave = vi.fn()
    const onToggleWhatsappOption = vi.fn()

    const accountData = {
      mercado_pago_user_id: 'seller-1',
      live_mode: true,
      token_expires_at: '2026-03-21T00:00:00.000Z',
    }

    const deliverySettingsData = {
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 8,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    }

    const notificationSettingsData = {
      whatsapp_order_received: true,
      whatsapp_order_confirmed: false,
      whatsapp_order_preparing: false,
      whatsapp_order_ready: true,
      whatsapp_order_out_for_delivery: false,
      whatsapp_order_delivered: false,
      whatsapp_order_cancelled: false,
    }

    const markup = renderToStaticMarkup(
      React.createElement(IntegrationsPageContent, {
        connected: true,
        accountLoading: false,
        accountData,
        disconnectPending: false,
        onDisconnect,
        deliverySettingsLoading: false,
        deliverySettingsData,
        deliverySettingsPending: false,
        deliveryFeeValue: '12.5',
        openingHourValue: '09:00',
        closingHourValue: '18:00',
        onDeliveryToggle,
        onDeliveryOperationChange,
        onDeliveryScheduleChange,
        onDeliveryHoursChange,
        onDeliveryFeeInputChange,
        onDeliveryFeeSave,
        onDeliveryHoursSave,
        hasWhatsappNotifications: true,
        notificationSettingsLoading: false,
        notificationSettingsData,
        notificationSettingsPending: false,
        whatsappOptions: whatsappOptionDefinitions,
        onToggleWhatsappOption,
      })
    )

    expect(markup).toContain('Mercado Pago')
    expect(markup).toContain('Conectado')
    expect(markup).toContain('seller-1')
    expect(markup).toContain('Produção')
    expect(markup).toContain('Notificações WhatsApp')
    expect(markup).toContain('Estabelecimento aberto')
    expect(markup).toContain('Horário de funcionamento')

    const elements = flattenElements(
      React.createElement(IntegrationsPageContent, {
        connected: true,
        accountLoading: false,
        accountData,
        disconnectPending: false,
        onDisconnect,
        deliverySettingsLoading: false,
        deliverySettingsData,
        deliverySettingsPending: false,
        deliveryFeeValue: '12.5',
        openingHourValue: '09:00',
        closingHourValue: '18:00',
        onDeliveryToggle,
        onDeliveryOperationChange,
        onDeliveryScheduleChange,
        onDeliveryHoursChange,
        onDeliveryFeeInputChange,
        onDeliveryFeeSave,
        onDeliveryHoursSave,
        hasWhatsappNotifications: true,
        notificationSettingsLoading: false,
        notificationSettingsData,
        notificationSettingsPending: false,
        whatsappOptions: whatsappOptionDefinitions,
        onToggleWhatsappOption,
      })
    )

    const actionButtons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )
    const deliveryInput = elements.find(
      (element) => element.type === 'input' && element.props.type === 'number'
    )

    expect(deliveryInput).toBeTruthy()
    deliveryInput?.props.onChange({ target: { value: '17.90' } })

    actionButtons.find((element) => getTextContent(element.props.children).includes('Desconectar'))?.props.onClick()
    actionButtons.find((element) => getTextContent(element.props.children).includes('Salvar taxa'))?.props.onClick()

    const toggleButtons = elements.filter(
      (element) =>
        element.type === 'button' &&
        typeof element.props.onClick === 'function' &&
        getTextContent(element.props.children).trim() === ''
    )

    expect(toggleButtons).toHaveLength(10)
    toggleButtons[0].props.onClick()
    toggleButtons[1].props.onClick()
    toggleButtons[2].props.onClick()
    toggleButtons[3].props.onClick()

    expect(onDisconnect).toHaveBeenCalledTimes(1)
    expect(onDeliveryFeeInputChange).toHaveBeenCalledWith('17.90')
    expect(onDeliveryToggle).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-1',
      delivery_enabled: false,
      flat_fee: 8,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    }))
    expect(onDeliveryOperationChange).toHaveBeenCalledWith(false)
    expect(onDeliveryScheduleChange).toHaveBeenCalledWith(false)
    expect(onDeliveryFeeSave).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 12.5,
      accepting_orders: true,
      schedule_enabled: true,
      opens_at: '09:00',
      closes_at: '18:00',
    }))
    expect(onToggleWhatsappOption).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsapp_order_received: false,
      })
    )
  })

  it('renderiza estados alternativos da tela de integrações', async () => {
    const { IntegrationsPageContent } = await import('@/features/payments/IntegrationsPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(IntegrationsPageContent, {
        connected: false,
        accountLoading: true,
        accountData: null,
        disconnectPending: false,
        onDisconnect: vi.fn(),
        deliverySettingsLoading: false,
        deliverySettingsData: null,
        deliverySettingsPending: false,
        deliveryFeeValue: '0',
        deliveryOriginLookupPending: true,
        openingHourValue: '',
        closingHourValue: '',
        onDeliveryToggle: vi.fn(),
        onDeliveryOperationChange: vi.fn(),
        onDeliveryScheduleChange: vi.fn(),
        onDeliveryHoursChange: vi.fn(),
        onDeliveryFeeInputChange: vi.fn(),
        onDeliveryFeeSave: vi.fn(),
        onDeliveryHoursSave: vi.fn(),
        hasWhatsappNotifications: false,
        notificationSettingsLoading: false,
        notificationSettingsData: null,
        notificationSettingsPending: false,
        whatsappOptions: whatsappOptionDefinitions,
        onToggleWhatsappOption: vi.fn(),
      })
    )

    expect(markup).toContain('Carregando integração...')
    expect(markup).toContain('Não foi possível carregar as configurações de entrega.')
    expect(markup).toContain('Recurso disponível apenas nos planos Standard e Premium.')
  })

  it('renderiza indicador de busca de CEP no cálculo por distância', async () => {
    const { IntegrationsPageContent } = await import('@/features/payments/IntegrationsPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(IntegrationsPageContent, {
        connected: true,
        accountLoading: false,
        accountData: {
          mercado_pago_user_id: 'seller-1',
          live_mode: true,
          token_expires_at: '2026-01-01T00:00:00.000Z',
        },
        disconnectPending: false,
        onDisconnect: vi.fn(),
        deliverySettingsLoading: false,
        deliverySettingsData: {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 8,
          accepting_orders: true,
          schedule_enabled: false,
          opens_at: null,
          closes_at: null,
          pricing_mode: 'distance',
          max_radius_km: 5,
          fee_per_km: 2,
          origin_zip_code: '01001000',
          origin_street: 'Praça da Sé',
          origin_number: '100',
          origin_neighborhood: 'Sé',
          origin_city: 'São Paulo',
          origin_state: 'SP',
        },
        deliverySettingsPending: false,
        deliveryFeeValue: '8',
        deliveryRadiusValue: '5',
        deliveryFeePerKmValue: '2',
        deliveryOriginZipValue: '01001000',
        deliveryOriginStreetValue: 'Praça da Sé',
        deliveryOriginNumberValue: '100',
        deliveryOriginNeighborhoodValue: 'Sé',
        deliveryOriginCityValue: 'São Paulo',
        deliveryOriginStateValue: 'SP',
        deliveryOriginLookupPending: true,
        openingHourValue: '',
        closingHourValue: '',
        onDeliveryToggle: vi.fn(),
        onDeliveryOperationChange: vi.fn(),
        onDeliveryScheduleChange: vi.fn(),
        onDeliveryHoursChange: vi.fn(),
        onDeliveryFeeInputChange: vi.fn(),
        onDeliveryFeeSave: vi.fn(),
        onDeliveryPricingModeChange: vi.fn(),
        onDeliveryDistanceInputChange: vi.fn(),
        onDeliveryOriginCepLookup: vi.fn(),
        onDeliveryDistanceSave: vi.fn(),
        onDeliveryHoursSave: vi.fn(),
        hasWhatsappNotifications: false,
        notificationSettingsLoading: false,
        notificationSettingsData: null,
        notificationSettingsPending: false,
        whatsappOptions: whatsappOptionDefinitions,
        onToggleWhatsappOption: vi.fn(),
      })
    )

    expect(markup).toContain('Buscando CEP...')
  })

  it('renderiza fallback de conta desconectada e estados de loading pendente', async () => {
    const { IntegrationsPageContent } = await import('@/features/payments/IntegrationsPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(IntegrationsPageContent, {
        connected: false,
        accountLoading: false,
        accountData: null,
        disconnectPending: false,
        onDisconnect: vi.fn(),
        deliverySettingsLoading: true,
        deliverySettingsData: null,
        deliverySettingsPending: false,
        deliveryFeeValue: '0',
        openingHourValue: '',
        closingHourValue: '',
        onDeliveryToggle: vi.fn(),
        onDeliveryOperationChange: vi.fn(),
        onDeliveryScheduleChange: vi.fn(),
        onDeliveryHoursChange: vi.fn(),
        onDeliveryFeeInputChange: vi.fn(),
        onDeliveryFeeSave: vi.fn(),
        onDeliveryHoursSave: vi.fn(),
        hasWhatsappNotifications: true,
        notificationSettingsLoading: true,
        notificationSettingsData: null,
        notificationSettingsPending: false,
        whatsappOptions: whatsappOptionDefinitions,
        onToggleWhatsappOption: vi.fn(),
      })
    )

    expect(markup).toContain('Desconectado')
    expect(markup).toContain('Conectar Mercado Pago')
    expect(markup).toContain('Carregando configuração de entrega...')
    expect(markup).toContain('Carregando configurações de notificação...')
  })

  it('renderiza modo teste, expiração ausente e ações pendentes', async () => {
    const { IntegrationsPageContent } = await import('@/features/payments/IntegrationsPageContent')

    const accountData = {
      mercado_pago_user_id: 'seller-test',
      live_mode: false,
      token_expires_at: null,
    }

    const deliverySettingsData = {
      tenant_id: 'tenant-1',
      delivery_enabled: false,
      flat_fee: 0,
      accepting_orders: false,
      schedule_enabled: false,
      opens_at: null,
      closes_at: null,
    }

    const notificationSettingsData = {
      whatsapp_order_received: false,
      whatsapp_order_confirmed: false,
      whatsapp_order_preparing: false,
      whatsapp_order_ready: false,
      whatsapp_order_out_for_delivery: false,
      whatsapp_order_delivered: false,
      whatsapp_order_cancelled: false,
    }

    const markup = renderToStaticMarkup(
      React.createElement(IntegrationsPageContent, {
        connected: true,
        accountLoading: false,
        accountData,
        disconnectPending: true,
        onDisconnect: vi.fn(),
        deliverySettingsLoading: false,
        deliverySettingsData,
        deliverySettingsPending: true,
        deliveryFeeValue: '0',
        openingHourValue: '',
        closingHourValue: '',
        onDeliveryToggle: vi.fn(),
        onDeliveryOperationChange: vi.fn(),
        onDeliveryScheduleChange: vi.fn(),
        onDeliveryHoursChange: vi.fn(),
        onDeliveryFeeInputChange: vi.fn(),
        onDeliveryFeeSave: vi.fn(),
        onDeliveryHoursSave: vi.fn(),
        hasWhatsappNotifications: true,
        notificationSettingsLoading: false,
        notificationSettingsData,
        notificationSettingsPending: true,
        whatsappOptions: whatsappOptionDefinitions,
        onToggleWhatsappOption: vi.fn(),
      })
    )

    expect(markup).toContain('Teste')
    expect(markup).toContain('não informado')
    expect(markup).toContain('Desconectando...')
    expect(markup).toContain('Salvando...')
    expect(markup).toContain('Estabelecimento fechado')
    expect(markup).toContain('Horário de funcionamento')
    expect(markup).not.toContain('Salvar horário')
  })

  it('renderiza bloco de notificações mesmo sem opções disponíveis', async () => {
    const { IntegrationsPageContent } = await import('@/features/payments/IntegrationsPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(IntegrationsPageContent, {
        connected: true,
        accountLoading: false,
        accountData: {
          mercado_pago_user_id: 'seller-empty-options',
          live_mode: true,
          token_expires_at: '2026-03-21T00:00:00.000Z',
        },
        disconnectPending: false,
        onDisconnect: vi.fn(),
        deliverySettingsLoading: false,
        deliverySettingsData: {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 10,
          accepting_orders: true,
          schedule_enabled: true,
          opens_at: '09:00',
          closes_at: '18:00',
        },
        deliverySettingsPending: false,
        deliveryFeeValue: '10',
        onDeliveryToggle: vi.fn(),
        onDeliveryOperationChange: vi.fn(),
        onDeliveryFeeInputChange: vi.fn(),
        onDeliveryFeeSave: vi.fn(),
        hasWhatsappNotifications: true,
        notificationSettingsLoading: false,
        notificationSettingsData: {
          whatsapp_order_received: false,
          whatsapp_order_confirmed: false,
          whatsapp_order_preparing: false,
          whatsapp_order_ready: false,
          whatsapp_order_out_for_delivery: false,
          whatsapp_order_delivered: false,
          whatsapp_order_cancelled: false,
        },
        notificationSettingsPending: false,
        whatsappOptions: [],
        onToggleWhatsappOption: vi.fn(),
      })
    )

    expect(markup).toContain('Notificações WhatsApp')
    expect(markup).toContain('Estabelecimento aberto')
    expect(markup).toContain('Horário de funcionamento')
    expect(markup).not.toContain('Carregando configurações de notificação...')
    expect(markup).not.toContain('Recurso disponível apenas nos planos Standard e Premium.')
  })

  it('renderiza fallback quando as configurações de WhatsApp não carregam', async () => {
    const { IntegrationsPageContent } = await import('@/features/payments/IntegrationsPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(IntegrationsPageContent, {
        connected: true,
        accountLoading: false,
        accountData: {
          mercado_pago_user_id: 'seller-whatsapp-fallback',
          live_mode: true,
          token_expires_at: '2026-03-21T00:00:00.000Z',
        },
        disconnectPending: false,
        onDisconnect: vi.fn(),
        deliverySettingsLoading: false,
        deliverySettingsData: {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 10,
          accepting_orders: true,
          schedule_enabled: true,
          opens_at: '09:00',
          closes_at: '18:00',
        },
        deliverySettingsPending: false,
        deliveryFeeValue: '10',
        onDeliveryToggle: vi.fn(),
        onDeliveryOperationChange: vi.fn(),
        onDeliveryFeeInputChange: vi.fn(),
        onDeliveryFeeSave: vi.fn(),
        hasWhatsappNotifications: true,
        notificationSettingsLoading: false,
        notificationSettingsData: null,
        notificationSettingsPending: false,
        whatsappOptions: whatsappOptionDefinitions,
        onToggleWhatsappOption: vi.fn(),
      })
    )

    expect(markup).toContain('Não foi possível carregar as notificações.')
  })
})
