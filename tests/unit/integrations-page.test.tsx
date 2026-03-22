import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  buildDeliveryFeePayload,
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
    })

    expect(
      buildDeliveryFeePayload(
        {
          tenant_id: 'tenant-1',
          delivery_enabled: true,
          flat_fee: 9,
        },
        '15.75'
      )
    ).toEqual({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 15.75,
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
    const onDeliveryFeeInputChange = vi.fn()
    const onDeliveryFeeSave = vi.fn()
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
        onDeliveryToggle,
        onDeliveryFeeInputChange,
        onDeliveryFeeSave,
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
        onDeliveryToggle,
        onDeliveryFeeInputChange,
        onDeliveryFeeSave,
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

    expect(toggleButtons).toHaveLength(8)
    toggleButtons[0].props.onClick()
    toggleButtons[1].props.onClick()

    expect(onDisconnect).toHaveBeenCalledTimes(1)
    expect(onDeliveryFeeInputChange).toHaveBeenCalledWith('17.90')
    expect(onDeliveryToggle).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      delivery_enabled: false,
      flat_fee: 8,
    })
    expect(onDeliveryFeeSave).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      delivery_enabled: true,
      flat_fee: 12.5,
    })
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
        onDeliveryToggle: vi.fn(),
        onDeliveryFeeInputChange: vi.fn(),
        onDeliveryFeeSave: vi.fn(),
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
})
