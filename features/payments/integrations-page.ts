export const whatsappOptionDefinitions = [
  { key: 'whatsapp_order_received', label: 'Pedido recebido' },
  { key: 'whatsapp_order_confirmed', label: 'Pedido confirmado' },
  { key: 'whatsapp_order_preparing', label: 'Em preparo' },
  { key: 'whatsapp_order_ready', label: 'Pedido pronto' },
  { key: 'whatsapp_order_out_for_delivery', label: 'Saiu para entrega' },
  { key: 'whatsapp_order_delivered', label: 'Pedido entregue' },
  { key: 'whatsapp_order_cancelled', label: 'Pedido cancelado' },
] as const

export type WhatsappOptionKey = (typeof whatsappOptionDefinitions)[number]['key']

export type NotificationSettingsShape = Record<WhatsappOptionKey, boolean> & {
  tenant_id?: string
  updated_at?: string | null
}

export type DeliverySettingsShape = {
  tenant_id?: string
  delivery_enabled: boolean
  flat_fee: number
}

export function getMercadoPagoAlertMessage(status: string | null) {
  if (status === 'connected') {
    return 'Conta Mercado Pago conectada com sucesso.'
  }

  if (status === 'error') {
    return 'Não foi possível concluir a conexão com o Mercado Pago.'
  }

  if (status === 'invalid_state') {
    return 'A validação do retorno OAuth falhou. Tente conectar novamente.'
  }

  return null
}

export function getDeliveryFeeValue(input: string | null, flatFee?: number | null) {
  return input ?? String(flatFee ?? 0)
}

export function buildDeliveryTogglePayload(settings: DeliverySettingsShape) {
  return {
    ...settings,
    delivery_enabled: !settings.delivery_enabled,
  }
}

export function buildDeliveryFeePayload(settings: DeliverySettingsShape, feeValue: string) {
  return {
    ...settings,
    flat_fee: Number(feeValue || 0),
  }
}

export function buildNotificationTogglePayload(
  settings: NotificationSettingsShape,
  key: WhatsappOptionKey
) {
  return {
    ...settings,
    [key]: !settings[key],
  }
}
