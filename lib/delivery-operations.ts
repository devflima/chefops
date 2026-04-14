type DeliveryOperationSettings = {
  accepting_orders: boolean
  schedule_enabled: boolean
  opens_at: string | null
  closes_at: string | null
}

type DeliveryScheduleSettings = Pick<DeliveryOperationSettings, 'schedule_enabled' | 'opens_at' | 'closes_at'>

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function getBrazilMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  }).formatToParts(now)

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')

  return hour * 60 + minute
}

export function isWithinOperatingHours(settings: DeliveryScheduleSettings, now = new Date()) {
  if (!settings.schedule_enabled) return true
  if (!settings.opens_at || !settings.closes_at) return true

  const openMinutes = parseTimeToMinutes(settings.opens_at)
  const closeMinutes = parseTimeToMinutes(settings.closes_at)
  if (openMinutes === null || closeMinutes === null) return true

  const currentMinutes = getBrazilMinutes(now)

  if (openMinutes === closeMinutes) return true
  if (openMinutes < closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes
  }

  return currentMinutes >= openMinutes || currentMinutes < closeMinutes
}

export function isTenantAcceptingOrders(settings: DeliveryOperationSettings, now = new Date()) {
  if (!settings.accepting_orders) return false
  return isWithinOperatingHours(settings, now)
}
