export type DeliverySettingsRecord = {
  tenant_id?: string
  delivery_enabled?: boolean | null
  flat_fee?: number | null
  accepting_orders?: boolean | null
  schedule_enabled?: boolean | null
  opens_at?: string | null
  closes_at?: string | null
  pricing_mode?: 'flat' | 'distance' | null
  max_radius_km?: number | null
  fee_per_km?: number | null
  origin_zip_code?: string | null
  origin_street?: string | null
  origin_number?: string | null
  origin_neighborhood?: string | null
  origin_city?: string | null
  origin_state?: string | null
}

export type NormalizedDeliverySettings = {
  tenant_id?: string
  delivery_enabled: boolean
  flat_fee: number
  accepting_orders: boolean
  schedule_enabled: boolean
  opens_at: string | null
  closes_at: string | null
  pricing_mode: 'flat' | 'distance'
  max_radius_km: number | null
  fee_per_km: number | null
  origin_zip_code: string | null
  origin_street: string | null
  origin_number: string | null
  origin_neighborhood: string | null
  origin_city: string | null
  origin_state: string | null
}

export const defaultDeliverySettings: NormalizedDeliverySettings = {
  delivery_enabled: false,
  flat_fee: 0,
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
}

export function normalizeDeliverySettings(
  value: DeliverySettingsRecord | DeliverySettingsRecord[] | null | undefined,
): NormalizedDeliverySettings | null {
  if (!value) return null

  const base = Array.isArray(value) ? (value[0] ?? null) : value
  if (!base) return null

  return {
    tenant_id: base.tenant_id ?? undefined,
    delivery_enabled: base.delivery_enabled ?? defaultDeliverySettings.delivery_enabled,
    flat_fee: Number(base.flat_fee ?? defaultDeliverySettings.flat_fee),
    accepting_orders: base.accepting_orders ?? defaultDeliverySettings.accepting_orders,
    schedule_enabled: base.schedule_enabled ?? defaultDeliverySettings.schedule_enabled,
    opens_at: base.opens_at ?? defaultDeliverySettings.opens_at,
    closes_at: base.closes_at ?? defaultDeliverySettings.closes_at,
    pricing_mode: base.pricing_mode ?? defaultDeliverySettings.pricing_mode,
    max_radius_km: base.max_radius_km ?? defaultDeliverySettings.max_radius_km,
    fee_per_km: base.fee_per_km ?? defaultDeliverySettings.fee_per_km,
    origin_zip_code: base.origin_zip_code ?? defaultDeliverySettings.origin_zip_code,
    origin_street: base.origin_street ?? defaultDeliverySettings.origin_street,
    origin_number: base.origin_number ?? defaultDeliverySettings.origin_number,
    origin_neighborhood: base.origin_neighborhood ?? defaultDeliverySettings.origin_neighborhood,
    origin_city: base.origin_city ?? defaultDeliverySettings.origin_city,
    origin_state: base.origin_state ?? defaultDeliverySettings.origin_state,
  }
}
