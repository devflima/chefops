import type { Customer, CustomerAddress } from '@/features/customers/hooks/useCustomers'

function normalizeCustomerSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function formatCustomerPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function formatCustomerCpf(value: string | null) {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length != 11) return value
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function getCustomerLastAddressLabel(addresses: CustomerAddress[]) {
  const lastAddress = addresses[0]
  if (!lastAddress) return '—'

  const addressLabel = [lastAddress.street, lastAddress.number, lastAddress.city]
    .filter(Boolean)
    .join(', ')

  if (!addressLabel) return '—'
  if (!lastAddress.label) return addressLabel
  return `${lastAddress.label} · ${addressLabel}`
}

export function getCustomersSummary(customers: Customer[]) {
  const total = customers.length
  const withCpf = customers.filter((customer) => Boolean(customer.cpf)).length
  const withAddress = customers.filter((customer) => customer.addresses.length > 0).length

  const incomplete = customers.filter((customer) => !isCustomerProfileComplete(customer)).length

  return {
    total,
    withCpf,
    withoutCpf: total - withCpf,
    withAddress,
    withoutAddress: total - withAddress,
    complete: total - incomplete,
    incomplete,
  }
}

export type CustomersFilter = 'all' | 'with_cpf' | 'without_cpf' | 'with_address' | 'without_address' | 'complete' | 'incomplete'

export function filterCustomers(customers: Customer[], search: string, filter: CustomersFilter) {
  const normalizedSearch = normalizeCustomerSearch(search.trim())
  const normalizedDigits = search.replace(/\D/g, '')

  return [...customers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((customer) => {
    if (filter === 'with_cpf' && !customer.cpf) return false
    if (filter === 'without_cpf' && customer.cpf) return false
    if (filter === 'with_address' && customer.addresses.length === 0) return false
    if (filter === 'without_address' && customer.addresses.length > 0) return false
    if (filter === 'complete' && (!customer.cpf || customer.addresses.length === 0)) return false
    if (filter === 'incomplete' && customer.cpf && customer.addresses.length > 0) return false

    if (!normalizedSearch) return true

    const matchesText = normalizeCustomerSearch(customer.name).includes(normalizedSearch) ||
      customer.addresses.some((address) =>
        [address.label, address.street, address.number, address.city]
          .filter(Boolean)
          .some((value) => normalizeCustomerSearch(String(value)).includes(normalizedSearch))
      )

    const matchesDigits = normalizedDigits.length > 0 && (
      customer.phone.includes(normalizedDigits) ||
      (customer.cpf?.replace(/\D/g, '').includes(normalizedDigits) ?? false)
    )

      return matchesText || matchesDigits
    })
}

export function isCustomerProfileComplete(customer: Customer) {
  return Boolean(customer.cpf) && customer.addresses.length > 0
}
