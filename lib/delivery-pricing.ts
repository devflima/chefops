export type DeliveryPricingMode = 'flat' | 'distance'

export type DeliveryPricingAddress = {
  zip_code?: string | null
  street?: string | null
  number?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
}

export type DeliveryPricingSettings = {
  delivery_enabled: boolean
  flat_fee: number
  pricing_mode?: DeliveryPricingMode | null
  max_radius_km?: number | null
  fee_per_km?: number | null
  origin_zip_code?: string | null
  origin_street?: string | null
  origin_number?: string | null
  origin_neighborhood?: string | null
  origin_city?: string | null
  origin_state?: string | null
}

export type DeliveryQuoteResult =
  | { ok: true; deliveryFee: number; distanceKm: number | null; pricingMode: DeliveryPricingMode }
  | { ok: false; error: string }

type Coordinates = { lat: number; lon: number }

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180
}

export function calculateHaversineDistanceKm(origin: Coordinates, destination: Coordinates) {
  const earthRadiusKm = 6371
  const deltaLat = degreesToRadians(destination.lat - origin.lat)
  const deltaLon = degreesToRadians(destination.lon - origin.lon)
  const originLat = degreesToRadians(origin.lat)
  const destinationLat = degreesToRadians(destination.lat)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return roundCurrency(earthRadiusKm * c)
}

export function isDistancePricingEnabled(settings: DeliveryPricingSettings) {
  return settings.pricing_mode === 'distance'
}

export function calculateDistanceDeliveryFee(distanceKm: number, settings: DeliveryPricingSettings) {
  const baseFee = Number(settings.flat_fee ?? 0)
  const feePerKm = Number(settings.fee_per_km ?? 0)
  return roundCurrency(baseFee + distanceKm * feePerKm)
}

export function hasValidDistancePricingConfiguration(settings: DeliveryPricingSettings) {
  return Boolean(
    isDistancePricingEnabled(settings) &&
      settings.origin_zip_code &&
      settings.origin_street &&
      settings.origin_number &&
      settings.origin_city &&
      settings.origin_state &&
      Number(settings.max_radius_km ?? 0) > 0
  )
}

function buildAddressQuery(address: DeliveryPricingAddress) {
  return new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    country: 'Brasil',
    postalcode: String(address.zip_code ?? ''),
    street: `${address.street ?? ''}, ${address.number ?? ''}`.trim(),
    city: String(address.city ?? ''),
    state: String(address.state ?? ''),
  })
}

export async function geocodeAddress(
  address: DeliveryPricingAddress,
  fetchImpl: typeof fetch = fetch,
): Promise<Coordinates | null> {
  const query = buildAddressQuery(address)
  const response = await fetchImpl(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
    headers: {
      'Accept-Language': 'pt-BR',
      'User-Agent': 'ChefOps Delivery Quote/1.0',
    },
    cache: 'no-store',
  })

  if (!response.ok) return null

  const data = (await response.json()) as Array<{ lat?: string; lon?: string }>
  const first = data[0]
  if (!first?.lat || !first?.lon) return null

  const lat = Number(first.lat)
  const lon = Number(first.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  return { lat, lon }
}

export async function resolveDeliveryQuote(
  settings: DeliveryPricingSettings,
  destination: DeliveryPricingAddress,
  fetchImpl: typeof fetch = fetch,
): Promise<DeliveryQuoteResult> {
  if (!settings.delivery_enabled) {
    return { ok: false, error: 'Entrega indisponível para este estabelecimento.' }
  }

  if (!isDistancePricingEnabled(settings)) {
    return {
      ok: true,
      deliveryFee: roundCurrency(Number(settings.flat_fee ?? 0)),
      distanceKm: null,
      pricingMode: 'flat',
    }
  }

  if (!hasValidDistancePricingConfiguration(settings)) {
    return { ok: false, error: 'A configuração de entrega por distância está incompleta.' }
  }

  const origin = await geocodeAddress(
    {
      zip_code: settings.origin_zip_code,
      street: settings.origin_street,
      number: settings.origin_number,
      neighborhood: settings.origin_neighborhood,
      city: settings.origin_city,
      state: settings.origin_state,
    },
    fetchImpl,
  )
  const target = await geocodeAddress(destination, fetchImpl)

  if (!origin || !target) {
    return { ok: false, error: 'Não foi possível calcular a distância para este endereço.' }
  }

  const distanceKm = calculateHaversineDistanceKm(origin, target)
  const maxRadiusKm = Number(settings.max_radius_km ?? 0)

  if (distanceKm > maxRadiusKm) {
    return { ok: false, error: `Endereço fora do raio de entrega de ${maxRadiusKm} km.` }
  }

  return {
    ok: true,
    deliveryFee: calculateDistanceDeliveryFee(distanceKm, settings),
    distanceKm,
    pricingMode: 'distance',
  }
}
