import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('lucide-react', () => ({
  Users: (props: Record<string, unknown>) => React.createElement('svg', props),
}))

describe('ClientesPageContent component', () => {
  it('renderiza loading e estado vazio', async () => {
    const { CustomersPageContent } = await import('@/features/customers/CustomersPageContent')

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(CustomersPageContent, {
        customers: [],
        isLoading: true,
        search: '',
        filter: 'all',
        totalCustomers: 0,
        onSearchChange: vi.fn(),
        onFilterChange: vi.fn(),
        onClearFilters: vi.fn(),
      }),
    )
    expect(loadingMarkup).toContain('Carregando clientes...')

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(CustomersPageContent, {
        customers: [],
        isLoading: false,
        search: '',
        filter: 'all',
        totalCustomers: 0,
        onSearchChange: vi.fn(),
        onFilterChange: vi.fn(),
        onClearFilters: vi.fn(),
      }),
    )
    expect(emptyMarkup).toContain('Nenhum cliente cadastrado.')

    const filteredEmptyMarkup = renderToStaticMarkup(
      React.createElement(CustomersPageContent, {
        customers: [],
        isLoading: false,
        search: 'maria',
        filter: 'with_cpf',
        totalCustomers: 2,
        onSearchChange: vi.fn(),
        onFilterChange: vi.fn(),
        onClearFilters: vi.fn(),
      }),
    )
    expect(filteredEmptyMarkup).toContain('Nenhum cliente encontrado para o filtro atual.')
    expect(filteredEmptyMarkup).toContain('0 de 2 clientes')
    expect(filteredEmptyMarkup).toContain('Cadastros completos')
    expect(filteredEmptyMarkup).toContain('Cadastros incompletos')
    expect(filteredEmptyMarkup).toContain('Limpar filtros')
  })


  it('permite aplicar o filtro de incompletos a partir do card-resumo', async () => {
    const onFilterChange = vi.fn()
    const { CustomersPageContent } = await import('@/features/customers/CustomersPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(CustomersPageContent, {
        customers: [],
        isLoading: false,
        search: '',
        filter: 'all',
        totalCustomers: 2,
        onSearchChange: vi.fn(),
        onFilterChange,
        onClearFilters: vi.fn(),
      }),
    )

    expect(markup).toContain('Cadastros completos')
    expect(markup).toContain('Ver completos')
    expect(markup).toContain('Cadastros incompletos')
    expect(markup).toContain('Ver incompletos')
  })

  it('mostra limpar filtros no cabecalho quando ha filtro ativo com resultados', async () => {
    const { CustomersPageContent } = await import('@/features/customers/CustomersPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(CustomersPageContent, {
        customers: [
          {
            id: 'customer-1',
            name: 'Maria Silva',
            phone: '11999999999',
            cpf: '12345678909',
            created_at: '2026-04-01T00:00:00.000Z',
            addresses: [{ id: 'addr-1', label: 'Casa', street: 'Rua A', number: '10', city: 'São Paulo' }],
          },
        ],
        isLoading: false,
        search: '',
        filter: 'with_cpf',
        totalCustomers: 2,
        onSearchChange: vi.fn(),
        onFilterChange: vi.fn(),
        onClearFilters: vi.fn(),
      }),
    )

    expect(markup).toContain('1 de 2 clientes')
    expect(markup).toContain('Filtro: Com CPF')
    expect(markup).toContain('Limpar filtros')
  })

  it('renderiza resumo e tabela de clientes', async () => {
    const { CustomersPageContent } = await import('@/features/customers/CustomersPageContent')

    const markup = renderToStaticMarkup(
      React.createElement(CustomersPageContent, {
        customers: [
          {
            id: 'customer-1',
            name: 'Maria Silva',
            phone: '11999999999',
            cpf: '12345678909',
            created_at: '2026-04-01T00:00:00.000Z',
            addresses: [{ id: 'addr-1', label: 'Casa', street: 'Rua A', number: '10', city: 'São Paulo' }],
          },
          {
            id: 'customer-2',
            name: 'João Souza',
            phone: '11888887777',
            cpf: null,
            created_at: '2026-04-02T00:00:00.000Z',
            addresses: [],
          },
        ],
        isLoading: false,
        search: '',
        filter: 'all',
        totalCustomers: 2,
        onSearchChange: vi.fn(),
        onFilterChange: vi.fn(),
        onClearFilters: vi.fn(),
      }),
    )

    expect(markup).toContain('Clientes do estabelecimento')
    expect(markup).toContain('2 de 2 clientes')
    expect(markup).toContain('Total de clientes')
    expect(markup).toContain('Ver todos')
    expect(markup).toContain('Com CPF')
    expect(markup).toContain('Ver com CPF')
    expect(markup).toContain('Sem CPF')
    expect(markup).toContain('Ver sem CPF')
    expect(markup).toContain('Com endereço')
    expect(markup).toContain('Ver com endereço')
    expect(markup).toContain('Sem endereço')
    expect(markup).toContain('Ver sem endereço')
    expect(markup).toContain('Cadastros completos')
    expect(markup).toContain('Cadastros incompletos')
    expect(markup).toContain('2')
    expect(markup).toContain('1')
    expect(markup).toContain('Maria Silva')
    expect(markup).toContain('Completo')
    expect(markup).toContain('(11) 99999-9999')
    expect(markup).toContain('123.456.789-09')
    expect(markup).toContain('Casa · Rua A, 10, São Paulo')
    expect(markup).toContain('João Souza')
    expect(markup).toContain('Incompleto')
    expect(markup).toContain('(11) 88888-7777')
    expect(markup).toContain('—')
  })
})


describe('customers-page helpers', () => {
  it('resume clientes com e sem cpf/endereco', async () => {
    const { getCustomersSummary } = await import('@/features/customers/customers-page')

    const summary = getCustomersSummary([
      {
        id: 'customer-1',
        name: 'Maria Silva',
        phone: '11999999999',
        cpf: '12345678909',
        created_at: '2026-04-01T00:00:00.000Z',
        addresses: [{ id: 'addr-1', label: 'Casa', street: 'Rua A', number: '10', city: 'São Paulo' }],
      },
      {
        id: 'customer-2',
        name: 'João Souza',
        phone: '11888887777',
        cpf: null,
        created_at: '2026-04-02T00:00:00.000Z',
        addresses: [],
      },
    ])

    expect(summary).toMatchObject({
      total: 2,
      withCpf: 1,
      withoutCpf: 1,
      withAddress: 1,
      withoutAddress: 1,
      complete: 1,
      incomplete: 1,
    })
  })

  it('filtra clientes por termo, cpf e endereco', async () => {
    const { filterCustomers } = await import('@/features/customers/customers-page')

    const customers = [
      {
        id: 'customer-1',
        name: 'Maria Silva',
        phone: '11999999999',
        cpf: '12345678909',
        created_at: '2026-04-01T00:00:00.000Z',
        addresses: [{ id: 'addr-1', label: 'Casa', street: 'Rua A', number: '10', city: 'São Paulo' }],
      },
      {
        id: 'customer-2',
        name: 'João Souza',
        phone: '11888887777',
        cpf: null,
        created_at: '2026-04-02T00:00:00.000Z',
        addresses: [],
      },
    ]

    expect(filterCustomers(customers, '', 'all').map((customer) => customer.id)).toEqual([
      'customer-2',
      'customer-1',
    ])
    expect(filterCustomers(customers, 'maria', 'all')).toHaveLength(1)
    expect(filterCustomers(customers, '99999', 'all')).toHaveLength(1)
    expect(filterCustomers(customers, '12345678909', 'all')).toEqual([customers[0]])
    expect(filterCustomers(customers, 'rua a', 'all')).toEqual([customers[0]])
    expect(filterCustomers(customers, 'são paulo', 'all')).toEqual([customers[0]])
    expect(filterCustomers(customers, 'sao paulo', 'all')).toEqual([customers[0]])
    expect(filterCustomers(customers, '', 'with_cpf')).toEqual([customers[0]])
    expect(filterCustomers(customers, '', 'without_cpf')).toEqual([customers[1]])
    expect(filterCustomers(customers, '', 'with_address')).toEqual([customers[0]])
    expect(filterCustomers(customers, '', 'without_address')).toEqual([customers[1]])
    expect(filterCustomers(customers, '', 'complete')).toEqual([customers[0]])
    expect(filterCustomers(customers, '', 'incomplete')).toEqual([customers[1]])
    expect(filterCustomers(customers, 'joao', 'with_cpf')).toHaveLength(0)
  })
})
