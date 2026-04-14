export function buildTenantSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function normalizeState(value: string) {
  return value.trim().toUpperCase().slice(0, 2)
}
