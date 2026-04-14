'use client'

import { useState } from 'react'
import { CustomersPageContent } from '@/features/customers/CustomersPageContent'
import { filterCustomers, type CustomersFilter } from '@/features/customers/customers-page'
import { useCustomers } from '@/features/customers/hooks/useCustomers'

export default function ClientesPage() {
  const { data = [], isLoading } = useCustomers()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CustomersFilter>('all')

  const filteredCustomers = filterCustomers(data, search, filter)

  return (
    <CustomersPageContent
      customers={filteredCustomers}
      isLoading={isLoading}
      search={search}
      onSearchChange={setSearch}
      filter={filter}
      totalCustomers={data.length}
      onFilterChange={setFilter}
      onClearFilters={() => {
        setSearch('')
        setFilter('all')
      }}
    />
  )
}
