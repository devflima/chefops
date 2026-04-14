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
  accepting_orders: boolean
  schedule_enabled: boolean
  opens_at: string | null
  closes_at: string | null
  pricing_mode?: 'flat' | 'distance'
  max_radius_km?: number | null
  fee_per_km?: number | null
  origin_zip_code?: string | null
  origin_street?: string | null
  origin_number?: string | null
  origin_neighborhood?: string | null
  origin_city?: string | null
  origin_state?: string | null
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

export function getDeliveryRadiusValue(input: string | null, maxRadiusKm?: number | null) {
  return input ?? String(maxRadiusKm ?? '')
}

export function getDeliveryFeePerKmValue(input: string | null, feePerKm?: number | null) {
  return input ?? String(feePerKm ?? '')
}

export function getDeliveryOriginValue(input: string | null, fallback?: string | null) {
  return input ?? fallback ?? ''
}

export function getDeliveryHourValue(input: string | null, value?: string | null) {
  return input ?? value ?? ''
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

export function buildDeliveryPricingModePayload(
  settings: DeliverySettingsShape,
  pricingMode: 'flat' | 'distance',
) {
  return {
    ...settings,
    pricing_mode: pricingMode,
  }
}

export function buildDeliveryDistancePayload(
  settings: DeliverySettingsShape,
  inputs: {
    max_radius_km: string
    fee_per_km: string
    origin_zip_code: string
    origin_street: string
    origin_number: string
    origin_neighborhood: string
    origin_city: string
    origin_state: string
  },
) {
  return {
    ...settings,
    max_radius_km: inputs.max_radius_km ? Number(inputs.max_radius_km) : null,
    fee_per_km: inputs.fee_per_km ? Number(inputs.fee_per_km) : null,
    origin_zip_code: inputs.origin_zip_code || null,
    origin_street: inputs.origin_street || null,
    origin_number: inputs.origin_number || null,
    origin_neighborhood: inputs.origin_neighborhood || null,
    origin_city: inputs.origin_city || null,
    origin_state: inputs.origin_state ? inputs.origin_state.toUpperCase() : null,
  }
}

export function buildDeliveryOperationPayload(
  settings: DeliverySettingsShape,
  acceptingOrders: boolean
) {
  return {
    ...settings,
    accepting_orders: acceptingOrders,
  }
}

export function buildDeliverySchedulePayload(
  settings: DeliverySettingsShape,
  enabled: boolean
) {
  return {
    ...settings,
    schedule_enabled: enabled,
  }
}

export function buildDeliveryHoursPayload(
  settings: DeliverySettingsShape,
  opensAt: string,
  closesAt: string
) {
  return {
    ...settings,
    opens_at: opensAt || null,
    closes_at: closesAt || null,
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
