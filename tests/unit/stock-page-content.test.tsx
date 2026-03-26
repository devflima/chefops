import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { StockPageContent, type StockMovementFormValues } from '@/features/stock/StockPageContent'

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', props, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/shared/PaginationControls', () => ({
  default: ({ page, totalPages }: { page: number; totalPages: number }) =>
    React.createElement('div', null, `pagination-${page}-${totalPages}`),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogHeader: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogTitle: ({ children }: React.PropsWithChildren) => React.createElement('h2', null, children),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormControl: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormField: ({
    name,
    render,
  }: {
    name: string
    render: (args: { field: Record<string, unknown> }) => React.ReactNode
  }) =>
    React.createElement(
      React.Fragment,
      null,
      render({
        field: {
          name,
          value: name === 'type' ? 'entry' : '',
          onChange: vi.fn(),
        },
      }),
    ),
  FormItem: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  FormLabel: ({ children }: React.PropsWithChildren) => React.createElement('label', null, children),
  FormMessage: () => React.createElement('span', null, 'form-message'),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectItem: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('option', props, children),
  SelectTrigger: ({ children }: React.PropsWithChildren) => React.createElement('button', null, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => React.createElement('span', null, placeholder ?? 'select'),
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

function createForm(errorMessage?: string, isSubmitting = false) {
  return {
    control: {},
    formState: {
      isSubmitting,
      errors: errorMessage ? { root: { message: errorMessage } } : {},
    },
    handleSubmit: (callback: (values: StockMovementFormValues) => unknown) => () =>
      callback({
        product_id: 'prod-1',
        type: 'entry',
        quantity: 1,
        reason: 'Compra',
      }),
  } as never
}

describe('StockPageContent', () => {
  it('renderiza saldo, alerta de estoque baixo e dialogo de lançamento', () => {
    const markup = renderToStaticMarkup(
      React.createElement(StockPageContent, {
        open: true,
        tab: 'balance',
        lowStock: [
          {
            product_id: 'prod-1',
            product_name: 'Molho',
            category_name: 'Insumos',
            current_stock: 2,
            min_stock: 5,
            unit: 'kg',
            is_low_stock: true,
          },
        ],
        categories: ['Insumos'],
        categoryFilter: 'all',
        balanceStatusFilter: 'all',
        movementTypeFilter: 'all',
        paginatedBalance: [
          {
            product_id: 'prod-1',
            product_name: 'Molho',
            category_name: 'Insumos',
            current_stock: 2,
            min_stock: 5,
            unit: 'kg',
            is_low_stock: true,
          },
        ],
        filteredBalanceCount: 1,
        balancePage: 1,
        paginatedMovements: [],
        filteredMovementsCount: 0,
        movementsPage: 1,
        pageSize: 10,
        isLoading: false,
        products: [{ id: 'prod-1', name: 'Molho', unit: 'kg' }],
        closeDayPending: false,
        form: createForm(),
        onOpenChange: vi.fn(),
        onTabChange: vi.fn(),
        onCategoryFilterChange: vi.fn(),
        onBalanceStatusFilterChange: vi.fn(),
        onMovementTypeFilterChange: vi.fn(),
        onBalancePageChange: vi.fn(),
        onMovementsPageChange: vi.fn(),
        onCloseDay: vi.fn().mockResolvedValue(undefined),
        onSubmit: vi.fn().mockResolvedValue(undefined),
      }),
    )

    expect(markup).toContain('Estoque')
    expect(markup).toContain('Itens com estoque baixo')
    expect(markup).toContain('Molho')
    expect(markup).toContain('Baixo')
    expect(markup).toContain('pagination-1-1')
    expect(markup).toContain('Lançar movimentação')
    expect(markup).toContain('Selecionar produto')
  })

  it('renderiza plural de estoque baixo e fallback de categoria vazia no saldo', () => {
    const markup = renderToStaticMarkup(
      React.createElement(StockPageContent, {
        open: true,
        tab: 'balance',
        lowStock: [
          {
            product_id: 'prod-1',
            product_name: 'Molho',
            category_name: 'Insumos',
            current_stock: 2,
            min_stock: 5,
            unit: 'kg',
            is_low_stock: true,
          },
          {
            product_id: 'prod-2',
            product_name: 'Queijo',
            category_name: null,
            current_stock: 1,
            min_stock: 3,
            unit: 'kg',
            is_low_stock: true,
          },
        ],
        categories: ['Insumos'],
        categoryFilter: 'all',
        balanceStatusFilter: 'all',
        movementTypeFilter: 'all',
        paginatedBalance: [
          {
            product_id: 'prod-2',
            product_name: 'Queijo',
            category_name: null,
            current_stock: 1,
            min_stock: 3,
            unit: 'kg',
            is_low_stock: true,
          },
        ],
        filteredBalanceCount: 1,
        balancePage: 1,
        paginatedMovements: [],
        filteredMovementsCount: 0,
        movementsPage: 1,
        pageSize: 10,
        isLoading: false,
        products: [{ id: 'prod-2', name: 'Queijo', unit: 'kg' }],
        closeDayPending: false,
        form: createForm(),
        onOpenChange: vi.fn(),
        onTabChange: vi.fn(),
        onCategoryFilterChange: vi.fn(),
        onBalanceStatusFilterChange: vi.fn(),
        onMovementTypeFilterChange: vi.fn(),
        onBalancePageChange: vi.fn(),
        onMovementsPageChange: vi.fn(),
        onCloseDay: vi.fn().mockResolvedValue(undefined),
        onSubmit: vi.fn().mockResolvedValue(undefined),
      }),
    )

    expect(markup).toContain('2 itens abaixo do mínimo')
    expect(markup).toContain('Queijo')
    expect(markup).toContain('—')
  })

  it('renderiza loading no saldo atual', () => {
    const markup = renderToStaticMarkup(
      React.createElement(StockPageContent, {
        open: true,
        tab: 'balance',
        lowStock: [],
        categories: [],
        categoryFilter: 'all',
        balanceStatusFilter: 'all',
        movementTypeFilter: 'all',
        paginatedBalance: [],
        filteredBalanceCount: 0,
        balancePage: 1,
        paginatedMovements: [],
        filteredMovementsCount: 0,
        movementsPage: 1,
        pageSize: 10,
        isLoading: true,
        products: [],
        closeDayPending: false,
        form: createForm(),
        onOpenChange: vi.fn(),
        onTabChange: vi.fn(),
        onCategoryFilterChange: vi.fn(),
        onBalanceStatusFilterChange: vi.fn(),
        onMovementTypeFilterChange: vi.fn(),
        onBalancePageChange: vi.fn(),
        onMovementsPageChange: vi.fn(),
        onCloseDay: vi.fn().mockResolvedValue(undefined),
        onSubmit: vi.fn().mockResolvedValue(undefined),
      }),
    )

    expect(markup).toContain('Carregando...')
    expect(markup).not.toContain('<thead')
  })

  it('renderiza movimentações, estado pendente e erro do formulário', () => {
    const markup = renderToStaticMarkup(
      React.createElement(StockPageContent, {
        open: true,
        tab: 'movements',
        lowStock: [],
        categories: [],
        categoryFilter: 'all',
        balanceStatusFilter: 'all',
        movementTypeFilter: 'loss',
        paginatedBalance: [],
        filteredBalanceCount: 0,
        balancePage: 1,
        paginatedMovements: [
          {
            id: 'mov-1',
            created_at: '2026-03-22T12:00:00.000Z',
            product: { name: 'Molho', unit: 'kg' },
            type: 'loss',
            quantity: 2,
            reason: null,
          },
        ],
        filteredMovementsCount: 1,
        movementsPage: 2,
        pageSize: 10,
        isLoading: false,
        products: [{ id: 'prod-1', name: 'Molho', unit: 'kg' }],
        closeDayPending: true,
        form: createForm('Erro ao registrar movimentação.', true),
        onOpenChange: vi.fn(),
        onTabChange: vi.fn(),
        onCategoryFilterChange: vi.fn(),
        onBalanceStatusFilterChange: vi.fn(),
        onMovementTypeFilterChange: vi.fn(),
        onBalancePageChange: vi.fn(),
        onMovementsPageChange: vi.fn(),
        onCloseDay: vi.fn().mockResolvedValue(undefined),
        onSubmit: vi.fn().mockResolvedValue(undefined),
      }),
    )

    expect(markup).toContain('Movimentações')
    expect(markup).toContain('Perda')
    expect(markup).toContain('—')
    expect(markup).toContain('Fechando...')
    expect(markup).toContain('Erro ao registrar movimentação.')
    expect(markup).toContain('Salvando...')
    expect(markup).toContain('pagination-2-1')
  })

  it('aciona filtros, abas, paginação, dialogo e submit do formulário', () => {
    const onOpenChange = vi.fn()
    const onTabChange = vi.fn()
    const onCategoryFilterChange = vi.fn()
    const onBalanceStatusFilterChange = vi.fn()
    const onMovementTypeFilterChange = vi.fn()
    const onBalancePageChange = vi.fn()
    const onMovementsPageChange = vi.fn()
    const onCloseDay = vi.fn().mockResolvedValue(undefined)
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    const element = React.createElement(StockPageContent, {
      open: true,
      tab: 'balance',
      lowStock: [],
      categories: ['Insumos'],
      categoryFilter: 'all',
      balanceStatusFilter: 'all',
      movementTypeFilter: 'all',
      paginatedBalance: [
        {
          product_id: 'prod-1',
          product_name: 'Molho',
          category_name: 'Insumos',
          current_stock: 10,
          min_stock: 5,
          unit: 'kg',
          is_low_stock: false,
        },
      ],
      filteredBalanceCount: 15,
      balancePage: 2,
      paginatedMovements: [
        {
          id: 'mov-1',
          created_at: '2026-03-22T12:00:00.000Z',
          product: { name: 'Molho', unit: 'kg' },
          type: 'adjustment',
          quantity: 1.5,
          reason: 'Ajuste',
        },
      ],
      filteredMovementsCount: 15,
      movementsPage: 3,
      pageSize: 10,
      isLoading: false,
      products: [{ id: 'prod-1', name: 'Molho', unit: 'kg' }],
      closeDayPending: false,
      form: createForm(),
      onOpenChange,
      onTabChange,
      onCategoryFilterChange,
      onBalanceStatusFilterChange,
      onMovementTypeFilterChange,
      onBalancePageChange,
      onMovementsPageChange,
      onCloseDay,
      onSubmit,
    })

    const elements = flattenElements(element)
    const buttons = elements.filter((entry) => entry.type === 'button')
    const selects = elements.filter((entry) => entry.type === 'select')
    const form = elements.find((entry) => entry.type === 'form')
    const tabButtons = buttons.filter(
      (entry) =>
        typeof entry.props.onClick === 'function' &&
        ['Saldo atual', 'Movimentações'].includes(String(entry.props.children))
    )

    buttons[0]?.props.onClick()
    buttons[1]?.props.onClick()
    tabButtons[1]?.props.onClick()
    selects[0]?.props.onChange({ target: { value: 'Insumos' } })
    selects[1]?.props.onChange({ target: { value: 'low' } })
    form?.props.onSubmit()

    expect(onCloseDay).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(onTabChange).toHaveBeenCalledWith('movements')
    expect(onCategoryFilterChange).toHaveBeenCalledWith('Insumos')
    expect(onBalanceStatusFilterChange).toHaveBeenCalledWith('low')
    expect(onSubmit).toHaveBeenCalledWith({
      product_id: 'prod-1',
      type: 'entry',
      quantity: 1,
      reason: 'Compra',
    })

    const movementsElement = React.createElement(StockPageContent, {
      open: false,
      tab: 'movements',
      lowStock: [],
      categories: [],
      categoryFilter: 'all',
      balanceStatusFilter: 'all',
      movementTypeFilter: 'all',
      paginatedBalance: [],
      filteredBalanceCount: 0,
      balancePage: 1,
      paginatedMovements: [
        {
          id: 'mov-2',
          created_at: '2026-03-22T12:00:00.000Z',
          product: { name: 'Molho', unit: 'kg' },
          type: 'adjustment',
          quantity: 1.5,
          reason: 'Ajuste',
        },
      ],
      filteredMovementsCount: 15,
      movementsPage: 3,
      pageSize: 10,
      isLoading: false,
      products: [{ id: 'prod-1', name: 'Molho', unit: 'kg' }],
      closeDayPending: false,
      form: createForm(),
      onOpenChange,
      onTabChange,
      onCategoryFilterChange,
      onBalanceStatusFilterChange,
      onMovementTypeFilterChange,
      onBalancePageChange,
      onMovementsPageChange,
      onCloseDay,
      onSubmit,
    })

    const movementSelect = flattenElements(movementsElement).find(
      (entry) => entry.type === 'select',
    )
    movementSelect?.props.onChange({ target: { value: 'adjustment' } })
    expect(onMovementTypeFilterChange).toHaveBeenCalledWith('adjustment')

    const cancelButton = flattenElements(movementsElement).find(
      (entry) => entry.type === 'button' && String(entry.props.children) === 'Cancelar',
    )
    cancelButton?.props.onClick()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
