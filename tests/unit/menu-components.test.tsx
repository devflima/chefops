import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    X: Icon,
    Minus: Icon,
    Plus: Icon,
    Trash2: Icon,
    ChefHat: Icon,
    ShoppingCart: Icon,
    Pencil: Icon,
    RotateCcw: Icon,
    UtensilsCrossed: Icon,
    Clock3: Icon,
    ClipboardList: Icon,
    Users: Icon,
    Clock: Icon,
    QrCode: Icon,
  }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', props, children),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('section', props, children),
  DialogHeader: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('header', props, children),
  DialogTitle: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('h2', props, children),
}))

vi.mock('@/features/orders/components/ManualOrderDialog', () => ({
  default: ({ open }: { open: boolean }) =>
    React.createElement('div', null, open ? 'Novo pedido manual' : null),
}))

vi.mock('@/features/menu/MenuItemDialog', () => ({
  MenuItemDialog: ({ open, editing }: { open: boolean; editing?: { id?: string } | null }) =>
    React.createElement('div', null, open ? (editing ? 'Editar item' : 'Novo item do cardápio') : null),
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

function getTextContent(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => getTextContent(child)).join('')
  if (!React.isValidElement(node)) return ''
  return getTextContent(node.props.children)
}

describe('menu components', () => {
  it('renderiza card de status com tom de progresso para pedido confirmado', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-confirmed',
          order_number: 40,
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'online',
          delivery_status: 'waiting_dispatch',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido confirmado #40')
    expect(markup).toContain('O estabelecimento confirmou seu pedido.')
    expect(markup).toContain('Ver pedido')
    expect(markup).toContain('border-sky-200')
    expect(markup).toContain('bg-sky-50')
  })

  it('renderiza card de status do pedido com título contextual', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-1',
          order_number: 42,
          status: 'preparing',
          payment_status: 'paid',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido em preparo #42')
    expect(markup).toContain('Seu pedido está sendo preparado.')
    expect(markup).toContain('Ver pedido')
    expect(markup).toContain('border-sky-200')
    expect(markup).toContain('bg-sky-50')
    expect(markup).toContain('bg-sky-600')
    expect(markup).toContain('hover:bg-sky-700')
  })

  it('renderiza card de status com tom de alerta para pedido pendente', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-pending',
          order_number: 41,
          status: 'pending',
          payment_status: 'pending',
          payment_method: 'online',
          delivery_status: null,
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido recebido #41')
    expect(markup).toContain('Seu pedido entrou na fila do estabelecimento.')
    expect(markup).toContain('Ver pedido')
    expect(markup).toContain('border-amber-200')
    expect(markup).toContain('bg-amber-50')
    expect(markup).toContain('bg-amber-600')
    expect(markup).toContain('hover:bg-amber-700')
  })

  it('renderiza card de status com título contextual para retirada', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-counter',
          order_number: 77,
          status: 'ready',
          payment_status: 'pending',
          payment_method: 'counter',
          delivery_status: null,
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido pronto para retirada #77')
    expect(markup).toContain('Seu pedido está aguardando retirada.')
    expect(markup).toContain('Ver retirada')
    expect(markup).toContain('border-emerald-200')
    expect(markup).toContain('bg-emerald-50')
    expect(markup).toContain('bg-emerald-600')
    expect(markup).toContain('hover:bg-emerald-700')
  })

  it('renderiza card de status com ação contextual para entrega pronta para despacho', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-delivery-ready',
          order_number: 91,
          status: 'ready',
          payment_status: 'pending',
          payment_method: 'delivery',
          delivery_status: 'waiting_dispatch',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido pronto para entrega #91')
    expect(markup).toContain('Seu pedido está pronto para sair para entrega.')
    expect(markup).toContain('Ver entrega')
    expect(markup).toContain('border-violet-200')
    expect(markup).toContain('bg-violet-50')
  })

  it('renderiza card de status com ação contextual para entrega em rota', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-delivery-out',
          order_number: 92,
          status: 'ready',
          payment_status: 'pending',
          payment_method: 'delivery',
          delivery_status: 'out_for_delivery',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido saiu para entrega #92')
    expect(markup).toContain('Acompanhe o deslocamento da entrega.')
    expect(markup).toContain('Ver entrega')
    expect(markup).toContain('border-violet-200')
    expect(markup).toContain('bg-violet-50')
    expect(markup).toContain('bg-violet-600')
    expect(markup).toContain('hover:bg-violet-700')
  })

  it('renderiza card de status com ação contextual para entrega concluída', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-delivery-delivered',
          order_number: 90,
          status: 'delivered',
          payment_status: 'paid',
          payment_method: 'delivery',
          delivery_status: 'delivered',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido entregue #90')
    expect(markup).toContain('Seu pedido foi entregue.')
    expect(markup).toContain('Ver entrega')
    expect(markup).toContain('border-emerald-200')
    expect(markup).toContain('bg-emerald-50')
    expect(markup).toContain('bg-emerald-600')
    expect(markup).toContain('hover:bg-emerald-700')
  })

  it('renderiza card de status com ação contextual para retirada concluída', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-counter-delivered',
          order_number: 78,
          status: 'delivered',
          payment_status: 'pending',
          payment_method: 'counter',
          delivery_status: null,
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido retirado #78')
    expect(markup).toContain('Seu pedido foi retirado.')
    expect(markup).toContain('Ver retirada')
    expect(markup).toContain('border-emerald-200')
    expect(markup).toContain('bg-emerald-50')
    expect(markup).toContain('bg-emerald-600')
    expect(markup).toContain('hover:bg-emerald-700')
  })

  it('renderiza card de status com ação contextual para mesa concluída', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-table-delivered',
          order_number: 89,
          status: 'delivered',
          payment_status: 'pending',
          payment_method: 'table',
          delivery_status: null,
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido servido na mesa #89')
    expect(markup).toContain('Seu pedido foi servido na mesa.')
    expect(markup).toContain('Ver comanda')
    expect(markup).toContain('border-emerald-200')
    expect(markup).toContain('bg-emerald-50')
    expect(markup).toContain('bg-emerald-600')
    expect(markup).toContain('hover:bg-emerald-700')
  })

  it('renderiza card de status com título contextual para mesa pronta', async () => {
    const { PublicOrderStatusCard } = await import('@/features/menu/PublicOrderStatusCard')

    const markup = renderToStaticMarkup(
      React.createElement(PublicOrderStatusCard, {
        publicOrderStatus: {
          id: 'order-table',
          order_number: 88,
          status: 'ready',
          payment_status: 'pending',
          payment_method: 'table',
          delivery_status: null,
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        onTrack: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido pronto para servir #88')
    expect(markup).toContain('Seu pedido está pronto para servir.')
    expect(markup).toContain('Ver comanda')
    expect(markup).toContain('border-emerald-200')
    expect(markup).toContain('bg-emerald-50')
    expect(markup).toContain('bg-emerald-600')
    expect(markup).toContain('hover:bg-emerald-700')
  })

  it('renderiza modal de meia a meia com sabores elegíveis', async () => {
    const { HalfFlavorModal } = await import('@/features/menu/HalfFlavorModal')

    const item = {
      id: 'item-1',
      tenant_id: 'tenant-1',
      category_id: 'cat-1',
      name: 'Margherita',
      description: 'Clássica',
      price: 30,
      available: true,
      display_order: 1,
      category: { id: 'cat-1', name: 'Pizzas' },
      extras: [],
    }

    const markup = renderToStaticMarkup(
      React.createElement(HalfFlavorModal, {
        item,
        options: [
          { ...item, id: 'item-2', name: 'Calabresa', price: 32, description: 'Picante' },
        ],
        onClose: vi.fn(),
        onSelect: vi.fn(),
      })
    )

    expect(markup).toContain('Escolha o segundo sabor')
    expect(markup).toContain('Primeiro:')
    expect(markup).toContain('Calabresa')
    expect(markup).toContain('(maior preço)')
  })

  it('renderiza passo do carrinho com totais e ações', async () => {
    const { MenuCartStep } = await import('@/features/menu/MenuCartStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuCartStep, {
        cart: [
          {
            menu_item_id: 'item-1',
            name: 'Pizza Margherita',
            price: 30,
            quantity: 2,
            extras: [{ name: 'Borda', price: 5 }],
          },
        ],
        cartTotal: 70,
        deliveryFee: 8,
        orderTotal: 78,
        onIncrement: vi.fn(),
        onDecrement: vi.fn(),
        onRemove: vi.fn(),
        onContinue: vi.fn(),
        onClear: vi.fn(),
      })
    )

    expect(markup).toContain('Pizza Margherita')
    expect(markup).toContain('Subtotal')
    expect(markup).toContain('Taxa de entrega')
    expect(markup).toContain('Limpar carrinho')
  })

  it('renderiza passo do carrinho vazio', async () => {
    const { MenuCartStep } = await import('@/features/menu/MenuCartStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuCartStep, {
        cart: [],
        cartTotal: 0,
        deliveryFee: 0,
        orderTotal: 0,
        onIncrement: vi.fn(),
        onDecrement: vi.fn(),
        onRemove: vi.fn(),
        onContinue: vi.fn(),
        onClear: vi.fn(),
      })
    )

    expect(markup).toContain('Nenhum item adicionado.')
  })

  it('aciona handlers do passo do carrinho', async () => {
    const { MenuCartStep } = await import('@/features/menu/MenuCartStep')

    const onIncrement = vi.fn()
    const onDecrement = vi.fn()
    const onRemove = vi.fn()
    const onContinue = vi.fn()
    const onClear = vi.fn()

    const elements = flattenElements(
      React.createElement(MenuCartStep, {
        cart: [
          {
            menu_item_id: 'item-1',
            name: 'Pizza Pepperoni',
            price: 35,
            quantity: 1,
            extras: [],
          },
        ],
        cartTotal: 35,
        deliveryFee: 0,
        orderTotal: 35,
        onIncrement,
        onDecrement,
        onRemove,
        onContinue,
        onClear,
      })
    )

    const actionButtons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )

    expect(actionButtons).toHaveLength(5)
    expect(getTextContent(elements)).not.toContain('Taxa de entrega')

    actionButtons[0].props.onClick()
    actionButtons[1].props.onClick()
    actionButtons[2].props.onClick()
    actionButtons[3].props.onClick()
    actionButtons[4].props.onClick()

    expect(onDecrement).toHaveBeenCalledWith(0)
    expect(onIncrement).toHaveBeenCalledWith(0)
    expect(onRemove).toHaveBeenCalledWith(0)
    expect(onContinue).toHaveBeenCalledOnce()
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('renderiza dialogo de abertura de comanda e aciona cancelamento', async () => {
    const { OpenSessionDialog } = await import('@/features/tables/OpenSessionDialog')

    const onOpenChange = vi.fn()
    const elements = flattenElements(
      React.createElement(
        OpenSessionDialog,
        {
          table: { id: 'table-1', number: '12', capacity: 4, status: 'available' },
          open: true,
          errorMessage: 'Erro ao abrir comanda.',
          isSubmitting: true,
          onOpenChange,
        },
        React.createElement('form', null, 'Session form')
      ),
    )

    expect(getTextContent(elements)).toContain('Abrir comanda - Mesa 12')
    expect(getTextContent(elements)).toContain('Erro ao abrir comanda.')
    expect(getTextContent(elements)).toContain('Abrindo...')

    const cancelButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element.props.children) === 'Cancelar',
    )

    cancelButton?.props.onClick()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renderiza dialogo de mesa e aciona cancelamento', async () => {
    const { TableFormDialog } = await import('@/features/tables/TableFormDialog')

    const onOpenChange = vi.fn()
    const elements = flattenElements(
      React.createElement(
        TableFormDialog,
        {
          open: true,
          editingTable: { id: 'table-1', number: '7', capacity: 4, status: 'available' },
          errorMessage: 'Erro ao salvar mesa.',
          isSubmitting: false,
          onOpenChange,
        },
        React.createElement('form', null, 'Table form')
      ),
    )

    expect(getTextContent(elements)).toContain('Editar Mesa 7')
    expect(getTextContent(elements)).toContain('Erro ao salvar mesa.')
    expect(getTextContent(elements)).toContain('Criar mesa')

    const cancelButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element.props.children) === 'Cancelar',
    )

    cancelButton?.props.onClick()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('aciona filtros do dashboard de cardapio', async () => {
    const { MenuDashboardFilters } = await import('@/features/menu/MenuDashboardFilters')

    const onCategoryFilterChange = vi.fn()
    const onStatusFilterChange = vi.fn()
    const elements = flattenElements(
      React.createElement(MenuDashboardFilters, {
        categoryFilter: 'all',
        onCategoryFilterChange,
        categories: [{ id: 'cat-1', name: 'Pizzas' }],
        statusFilter: 'all',
        onStatusFilterChange,
      }),
    )

    const selects = elements.filter((element) => element.type === 'select')
    expect(selects).toHaveLength(2)

    selects[0].props.onChange({ target: { value: 'cat-1' } })
    selects[1].props.onChange({ target: { value: 'inactive' } })

    expect(onCategoryFilterChange).toHaveBeenCalledWith('cat-1')
    expect(onStatusFilterChange).toHaveBeenCalledWith('inactive')
  })

  it('aciona acoes da tabela do dashboard de cardapio', async () => {
    const { MenuDashboardTable } = await import('@/features/menu/MenuDashboardTable')

    const onEdit = vi.fn()
    const onToggleAvailable = vi.fn()
    const elements = flattenElements(
      React.createElement(MenuDashboardTable, {
        deletingId: null,
        onEdit,
        onToggleAvailable,
        items: [
          {
            id: 'item-1',
            tenant_id: 'tenant-1',
            category_id: 'cat-1',
            name: 'Pizza Pepperoni',
            description: 'Picante',
            price: 35,
            available: true,
            display_order: 1,
            category: { id: 'cat-1', name: 'Pizzas' },
          },
          {
            id: 'item-2',
            tenant_id: 'tenant-1',
            category_id: 'cat-1',
            name: 'Pizza Quatro Queijos',
            description: null,
            price: 38,
            available: false,
            display_order: 2,
            category: { id: 'cat-1', name: 'Pizzas' },
          },
        ],
      }),
    )

    const actionButtons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function',
    )

    expect(getTextContent(elements)).toContain('Disponível')
    expect(getTextContent(elements)).toContain('Indisponível')
    expect(getTextContent(elements)).toContain('Reativar')

    actionButtons[0].props.onClick()
    actionButtons[1].props.onClick()
    actionButtons[2].props.onClick()

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }))
    expect(onToggleAvailable).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }))
    expect(onToggleAvailable).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-2' }))
  })

  it('aciona acoes da grade de comandas', async () => {
    const { TabsDashboardGrid } = await import('@/features/tabs/TabsDashboardGrid')

    const onSelect = vi.fn()
    const onClose = vi.fn()
    const stopPropagation = vi.fn()
    const elements = flattenElements(
      React.createElement(TabsDashboardGrid, {
        closeTabPending: false,
        onSelect,
        onClose,
        tabs: [
          {
            id: 'tab-1',
            label: 'Mesa 10',
            status: 'open',
            notes: 'Cliente VIP',
            created_at: '2026-03-22T12:00:00.000Z',
            orders: [{ id: 'order-1', total: 40 }],
          },
          {
            id: 'tab-2',
            label: 'Balcao',
            status: 'closed',
            notes: null,
            created_at: '2026-03-22T13:00:00.000Z',
            orders: [],
          },
        ],
      }),
    )

    expect(getTextContent(elements)).toContain('Mesa 10')
    expect(getTextContent(elements)).toContain('Cliente VIP')
    expect(getTextContent(elements)).toContain('Fechar comanda')

    const clickableCards = elements.filter(
      (element) => element.type === 'div' && typeof element.props.onClick === 'function',
    )
    const actionButtons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function',
    )

    clickableCards[0].props.onClick()
    actionButtons[0].props.onClick({ stopPropagation })
    actionButtons[1].props.onClick({ stopPropagation })

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'tab-1' }))
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ id: 'tab-1' }))
    expect(stopPropagation).toHaveBeenCalledTimes(2)
  })

  it('renderiza passo de dados com cliente existente e pagamento', async () => {
    const { MenuInfoStep } = await import('@/features/menu/MenuInfoStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuInfoStep, {
        tableInfo: { id: 'table-1', number: '12' },
        phone: '(11) 99999-9999',
        onPhoneChange: vi.fn(),
        phoneVerified: true,
        onPhoneLookup: vi.fn(),
        verificationCode: '',
        onVerificationCodeChange: vi.fn(),
        onVerifyPhoneCode: vi.fn(),
        codeSent: false,
        lookingUpPhone: false,
        verifyingPhoneCode: false,
        errors: {},
        isPaidPlan: true,
        existingCustomer: { id: 'cust-1', name: 'Maria', phone: '11999999999' },
        isNewCustomer: false,
        customerName: 'Maria',
        onCustomerNameChange: vi.fn(),
        customerCpf: '123.456.789-09',
        onCustomerCpfChange: vi.fn(),
        paymentOptions: [{ value: 'online', label: 'Pagar online' }],
        paymentMethod: 'online',
        onPaymentMethodChange: vi.fn(),
        notes: 'Sem cebola',
        onNotesChange: vi.fn(),
        cartTotal: 50,
        deliveryFee: 0,
        orderTotal: 50,
        isProcessing: false,
        onContinue: vi.fn(),
        onBack: vi.fn(),
      })
    )

    expect(markup).toContain('Mesa 12')
    expect(markup).toContain('Maria')
    expect(markup).toContain('Forma de pagamento')
    expect(markup).toContain('Continuar')
  })

  it('renderiza passo de dados para novo cliente sem plano pago e com erro de telefone', async () => {
    const { MenuInfoStep } = await import('@/features/menu/MenuInfoStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuInfoStep, {
        tableInfo: null,
        phone: '11999999999',
        onPhoneChange: vi.fn(),
        phoneVerified: false,
        onPhoneLookup: vi.fn(),
        verificationCode: '',
        onVerificationCodeChange: vi.fn(),
        onVerifyPhoneCode: vi.fn(),
        codeSent: false,
        lookingUpPhone: false,
        verifyingPhoneCode: false,
        errors: { phone: 'Telefone inválido', name: 'Nome obrigatório' },
        isPaidPlan: false,
        existingCustomer: null,
        isNewCustomer: true,
        customerName: '',
        onCustomerNameChange: vi.fn(),
        customerCpf: '',
        onCustomerCpfChange: vi.fn(),
        paymentOptions: [
          { value: 'pix', label: 'Pix' },
          { value: 'cash', label: 'Dinheiro' },
        ],
        paymentMethod: 'cash',
        onPaymentMethodChange: vi.fn(),
        notes: '',
        onNotesChange: vi.fn(),
        cartTotal: 25,
        deliveryFee: 0,
        orderTotal: 25,
        isProcessing: false,
        onContinue: vi.fn(),
        onBack: vi.fn(),
      })
    )

    expect(markup).toContain('Telefone inválido')
    expect(markup).toContain('Nome obrigatório')
    expect(markup).toContain('Pix')
    expect(markup).toContain('Dinheiro')
    expect(markup).not.toContain('Enviar código')
    expect(markup).not.toContain('Taxa de entrega')
    expect(markup).not.toContain('Primeiro pedido? Preencha seus dados.')
  })

  it('nao exige codigo de telefone em pedido de mesa no plano pago', async () => {
    const { MenuInfoStep } = await import('@/features/menu/MenuInfoStep')

    const elements = flattenElements(
      React.createElement(MenuInfoStep, {
        tableInfo: { id: 'table-1', number: '7' },
        phone: '(11) 99999-9999',
        onPhoneChange: vi.fn(),
        phoneVerified: false,
        onPhoneLookup: vi.fn(),
        verificationCode: '',
        onVerificationCodeChange: vi.fn(),
        onVerifyPhoneCode: vi.fn(),
        codeSent: false,
        lookingUpPhone: false,
        verifyingPhoneCode: false,
        errors: {},
        isPaidPlan: true,
        existingCustomer: null,
        isNewCustomer: false,
        customerName: 'Maria',
        onCustomerNameChange: vi.fn(),
        customerCpf: '123.456.789-09',
        onCustomerCpfChange: vi.fn(),
        paymentOptions: [{ value: 'table', label: 'Na mesa' }],
        paymentMethod: 'table',
        onPaymentMethodChange: vi.fn(),
        notes: '',
        onNotesChange: vi.fn(),
        cartTotal: 30,
        deliveryFee: 0,
        orderTotal: 30,
        isProcessing: false,
        onContinue: vi.fn(),
        onBack: vi.fn(),
      })
    )

    const buttons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )
    const continueButton = buttons.find((element) => getTextContent(element) === 'Continuar')

    expect(getTextContent(elements)).not.toContain('Enviar código')
    expect(getTextContent(elements)).not.toContain('Confirmar código')
    expect(continueButton?.props.disabled).toBe(false)
  })

  it('aciona handlers e estados do passo de dados', async () => {
    const { MenuInfoStep } = await import('@/features/menu/MenuInfoStep')

    const onPhoneChange = vi.fn()
    const onPhoneLookup = vi.fn()
    const onVerificationCodeChange = vi.fn()
    const onVerifyPhoneCode = vi.fn()
    const onCustomerNameChange = vi.fn()
    const onCustomerCpfChange = vi.fn()
    const onPaymentMethodChange = vi.fn()
    const onNotesChange = vi.fn()
    const onContinue = vi.fn()
    const onBack = vi.fn()

    const elements = flattenElements(
      React.createElement(MenuInfoStep, {
        tableInfo: null,
        phone: '1199999',
        onPhoneChange,
        phoneVerified: false,
        onPhoneLookup,
        verificationCode: '123456',
        onVerificationCodeChange,
        onVerifyPhoneCode,
        codeSent: true,
        lookingUpPhone: true,
        verifyingPhoneCode: false,
        errors: {},
        isPaidPlan: true,
        existingCustomer: null,
        isNewCustomer: true,
        customerName: '',
        onCustomerNameChange,
        customerCpf: '123.456.789-00',
        onCustomerCpfChange,
        paymentOptions: [
          { value: 'online', label: 'Online' },
          { value: 'cash', label: 'Dinheiro' },
        ],
        paymentMethod: 'online',
        onPaymentMethodChange,
        notes: '',
        onNotesChange,
        cartTotal: 20,
        deliveryFee: 7,
        orderTotal: 27,
        isProcessing: false,
        onContinue,
        onBack,
      })
    )

    const inputs = elements.filter((element) => element.type === 'input')
    const buttons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )
    const backButton = buttons.find((element) => getTextContent(element) === 'Voltar')
    const continueButton = buttons.find((element) => getTextContent(element) === 'Continuar')

    expect(getTextContent(elements)).toContain('Primeiro pedido? Preencha seus dados.')
    expect(getTextContent(elements)).toContain('Taxa de entrega')
    expect(buttons[0].props.disabled).toBe(true)
    expect(getTextContent(buttons[0])).toContain('Enviando')

    inputs[0].props.onChange({ target: { value: 'Cliente Teste' } })
    inputs[1].props.onChange({ target: { value: '(11) 98888-7777' } })
    inputs[2].props.onChange({ target: { value: '123456' } })
    inputs[3].props.onChange({ target: { value: 'Sem gelo' } })
    buttons[0].props.onClick()
    buttons[1].props.onClick()
    buttons[2].props.onClick()
    buttons[3].props.onClick()

    expect(onCustomerNameChange).toHaveBeenCalledWith('Cliente Teste')
    expect(onPhoneChange).toHaveBeenCalledWith('(11) 98888-7777')
    expect(onVerificationCodeChange).toHaveBeenCalledWith('123456')
    expect(onVerifyPhoneCode).toHaveBeenCalledOnce()
    expect(onNotesChange).toHaveBeenCalledWith('Sem gelo')
    expect(onPhoneLookup).toHaveBeenCalledOnce()
    expect(onPaymentMethodChange).toHaveBeenNthCalledWith(1, 'online')
    expect(onPaymentMethodChange).toHaveBeenNthCalledWith(2, 'cash')
    expect(onContinue).not.toHaveBeenCalled()
    expect(backButton).toBeTruthy()
    backButton?.props.onClick()
    expect(onBack).toHaveBeenCalledOnce()
    expect(continueButton?.props.disabled).toBe(true)
    expect(getTextContent(buttons[1])).toContain('Confirmar código')
  })

  it('renderiza passo de endereço com loading de CEP', async () => {
    const { MenuAddressStep } = await import('@/features/menu/MenuAddressStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuAddressStep, {
        address: {
          zip_code: '01001000',
          street: 'Praça da Sé',
          number: '100',
          city: 'São Paulo',
          state: 'SP',
        },
        onAddressChange: vi.fn(),
        onCepLookup: vi.fn(),
        loadingCep: true,
        errors: {},
        paymentMethod: 'online',
        isProcessing: false,
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      })
    )

    expect(markup).toContain('Informe o endereço de entrega.')
    expect(markup).toContain('Buscando...')
    expect(markup).toContain('Ir para pagamento')
  })

  it('renderiza passo de endereço com erros e envio em processamento', async () => {
    const { MenuAddressStep } = await import('@/features/menu/MenuAddressStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuAddressStep, {
        address: {
          zip_code: '01001000',
          street: '',
          number: '',
          city: '',
          state: 'sp',
        },
        onAddressChange: vi.fn(),
        onCepLookup: vi.fn(),
        loadingCep: false,
        errors: {
          zip_code: 'CEP inválido',
          street: 'Rua obrigatória',
          number: 'Número obrigatório',
          city: 'Cidade obrigatória',
        },
        paymentMethod: 'delivery',
        isProcessing: true,
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      })
    )

    expect(markup).toContain('CEP inválido')
    expect(markup).toContain('Rua obrigatória')
    expect(markup).toContain('Número obrigatório')
    expect(markup).toContain('Cidade obrigatória')
    expect(markup).toContain('Processando...')
    expect(markup).toContain('Voltar')
  })

  it('aciona handlers e normaliza campos do passo de endereço', async () => {
    const { MenuAddressStep } = await import('@/features/menu/MenuAddressStep')

    const onAddressChange = vi.fn()
    const onCepLookup = vi.fn()
    const onSubmit = vi.fn()
    const onBack = vi.fn()

    const elements = flattenElements(
      React.createElement(MenuAddressStep, {
        address: {
          zip_code: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
        },
        onAddressChange,
        onCepLookup,
        loadingCep: false,
        errors: {},
        paymentMethod: 'cash',
        isProcessing: false,
        onSubmit,
        onBack,
      })
    )

    const inputs = elements.filter((element) => element.type === 'input')
    const buttons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )

    inputs[0].props.onChange({ target: { value: '01001-000' } })
    inputs[1].props.onChange({ target: { value: 'Praça da Sé' } })
    inputs[2].props.onChange({ target: { value: '10' } })
    inputs[3].props.onChange({ target: { value: 'Apto 2' } })
    inputs[4].props.onChange({ target: { value: 'Centro' } })
    inputs[5].props.onChange({ target: { value: 'São Paulo' } })
    inputs[6].props.onChange({ target: { value: 'sp' } })
    buttons[0].props.onClick()
    buttons[1].props.onClick()

    expect(onAddressChange).toHaveBeenCalledTimes(7)
    expect(onCepLookup).toHaveBeenCalledWith('01001000')
    expect(onAddressChange.mock.calls[0][0]({})).toEqual({ zip_code: '01001000' })
    expect(onAddressChange.mock.calls[1][0]({})).toEqual({ street: 'Praça da Sé' })
    expect(onAddressChange.mock.calls[2][0]({})).toEqual({ number: '10' })
    expect(onAddressChange.mock.calls[3][0]({})).toEqual({ complement: 'Apto 2' })
    expect(onAddressChange.mock.calls[4][0]({})).toEqual({ neighborhood: 'Centro' })
    expect(onAddressChange.mock.calls[5][0]({})).toEqual({ city: 'São Paulo' })
    expect(onAddressChange.mock.calls[6][0]({})).toEqual({ state: 'SP' })
    expect(getTextContent(buttons[0])).toContain('Fazer pedido')
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('não dispara busca de CEP enquanto o valor ainda está incompleto', async () => {
    const { MenuAddressStep } = await import('@/features/menu/MenuAddressStep')

    const onAddressChange = vi.fn()
    const onCepLookup = vi.fn()

    const elements = flattenElements(
      React.createElement(MenuAddressStep, {
        address: {
          zip_code: '',
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
        },
        onAddressChange,
        onCepLookup,
        loadingCep: false,
        errors: {},
        paymentMethod: 'online',
        isProcessing: false,
        onSubmit: vi.fn(),
        onBack: vi.fn(),
      })
    )

    const inputs = elements.filter((element) => element.type === 'input')
    inputs[0].props.onChange({ target: { value: '01001-00' } })

    expect(onAddressChange).toHaveBeenCalledTimes(1)
    expect(onAddressChange.mock.calls[0][0]({})).toEqual({ zip_code: '0100100' })
    expect(onCepLookup).not.toHaveBeenCalled()
  })

  it('renderiza passo final com status em andamento e cancelamento disponível', async () => {
    const { MenuDoneStep } = await import('@/features/menu/MenuDoneStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuDoneStep, {
        orderNumber: 42,
        tableInfo: null,
        publicOrderStatus: {
          id: 'order-1',
          order_number: 42,
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'delivery',
          delivery_status: 'waiting_dispatch',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [
          { key: 'pending', label: 'Recebido', description: 'Entrou na fila.' },
          { key: 'confirmed', label: 'Confirmado', description: 'Confirmado.' },
        ],
        getStepState: (key: 'pending' | 'confirmed') => (key === 'pending' ? 'done' : 'current'),
        cancelOrderLoading: false,
        onCancelOrder: vi.fn(),
        onClose: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido realizado!')
    expect(markup).toContain('Acompanhe o andamento do pedido até a entrega.')
    expect(markup).toContain('Número do pedido')
    expect(markup).toContain('#42')
    expect(markup).toContain('Acompanhe o status do pedido')
    expect(markup).toContain('Pagamento na entrega')
    expect(markup).toContain('Cancelar pedido')
    expect(markup).toContain('Aprovado')
  })

  it('renderiza passo final cancelado com mensagem de reembolso', async () => {
    const { MenuDoneStep } = await import('@/features/menu/MenuDoneStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuDoneStep, {
        orderNumber: 99,
        tableInfo: { id: 'table-1', number: '8' },
        publicOrderStatus: {
          id: 'order-2',
          order_number: 99,
          status: 'cancelled',
          payment_status: 'refunded',
          cancelled_reason: 'Estoque indisponível',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [],
        getStepState: () => 'upcoming',
        cancelOrderLoading: false,
        onCancelOrder: vi.fn(),
        onClose: vi.fn(),
      })
    )

    expect(markup).toContain('Pedido cancelado')
    expect(markup).toContain('Comanda aberta!')
    expect(markup).toContain('Acompanhe a comanda da sua mesa.')
    expect(markup).toContain('Número da comanda')
    expect(markup).toContain('Acompanhe a comanda')
    expect(markup).toContain('Estoque indisponível')
    expect(markup).toContain('Reembolso solicitado com sucesso')
    expect(markup).toContain('Mesa 8')
  })

  it('renderiza rótulo de retirada no passo final de balcão', async () => {
    const { MenuDoneStep } = await import('@/features/menu/MenuDoneStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuDoneStep, {
        orderNumber: 321,
        tableInfo: null,
        publicOrderStatus: {
          id: 'order-counter',
          order_number: 321,
          status: 'confirmed',
          payment_status: 'pending',
          payment_method: 'counter',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [
          { key: 'pending', label: 'Recebido', description: 'Entrou na fila.' },
          { key: 'confirmed', label: 'Confirmado', description: 'Confirmado.' },
        ],
        getStepState: () => 'current',
        cancelOrderLoading: false,
        onCancelOrder: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(markup).toContain('Número para retirada')
    expect(markup).toContain('Pedido pronto para retirada!')
    expect(markup).toContain('Use este número para retirar o pedido.')
    expect(markup).toContain('Voltar ao cardápio')
    expect(markup).toContain('Acompanhe a retirada')
    expect(markup).toContain('Pagamento na retirada')
    expect(markup).toContain('#321')
  })

  it('aciona handlers e renderiza etapa de entrega no passo final', async () => {
    const { MenuDoneStep } = await import('@/features/menu/MenuDoneStep')

    const onCancelOrder = vi.fn()
    const onConfirmDelivery = vi.fn()
    const onClose = vi.fn()
    const elements = flattenElements(
      React.createElement(MenuDoneStep, {
        orderNumber: 123,
        tableInfo: null,
        publicOrderStatus: {
          id: 'order-3',
          order_number: 123,
          status: 'ready',
          payment_status: 'pending',
          payment_method: 'delivery',
          delivery_status: 'out_for_delivery',
          delivery_driver: { name: 'João' },
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [
          { key: 'pending', label: 'Recebido', description: 'Entrou na fila.' },
          { key: 'confirmed', label: 'Confirmado', description: 'Confirmado.' },
          { key: 'ready', label: 'Pronto', description: 'Pronto para sair.' },
        ],
        getStepState: (key: 'pending' | 'confirmed' | 'ready') =>
          key === 'ready' ? 'current' : 'done',
        cancelOrderLoading: true,
        confirmDeliveryLoading: false,
        onCancelOrder,
        onConfirmDelivery,
        onClose,
      }),
    )

    expect(getTextContent(elements)).toContain('Saiu para entrega')
    expect(getTextContent(elements)).toContain('Seu pedido saiu para entrega com João.')
    expect(getTextContent(elements)).toContain('Na entrega')
    expect(getTextContent(elements)).not.toContain('Cancelar pedido')

    const buttons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function',
    )

    expect(buttons).toHaveLength(2)
    expect(getTextContent(buttons[0])).toContain('Confirmar recebimento')
    expect(getTextContent(buttons[1])).toContain('Acompanhar depois')

    buttons[0].props.onClick()
    buttons[1].props.onClick()

    expect(onConfirmDelivery).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCancelOrder).not.toHaveBeenCalled()
  })

  it('renderiza etapa de entrega pendente sem marcar como concluída', async () => {
    const { MenuDoneStep } = await import('@/features/menu/MenuDoneStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuDoneStep, {
        orderNumber: 222,
        tableInfo: null,
        publicOrderStatus: {
          id: 'order-pending-delivery',
          order_number: 222,
          status: 'ready',
          payment_status: 'paid',
          payment_method: 'delivery',
          delivery_status: 'waiting_dispatch',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [
          { key: 'pending', label: 'Recebido', description: 'Entrou na fila.' },
          { key: 'confirmed', label: 'Confirmado', description: 'Confirmado.' },
          { key: 'ready', label: 'Pronto', description: 'Pronto para sair.' },
        ],
        getStepState: (key: 'pending' | 'confirmed' | 'ready') =>
          key === 'ready' ? 'current' : 'done',
        cancelOrderLoading: false,
        confirmDeliveryLoading: false,
        onCancelOrder: vi.fn(),
        onConfirmDelivery: vi.fn(),
        onClose: vi.fn(),
      })
    )

    expect(markup).toContain('Saiu para entrega')
    expect(markup).toContain('Seu pedido vai aparecer aqui quando sair para entrega.')
    expect(markup).toContain('border-slate-300 bg-white text-slate-400')
    expect(markup).not.toContain('com João')
  })

  it('aciona cancelamento no passo final e mostra entrega pendente sem motorista', async () => {
    const { MenuDoneStep } = await import('@/features/menu/MenuDoneStep')

    const onCancelOrder = vi.fn()
    const onClose = vi.fn()
    const elements = flattenElements(
      React.createElement(MenuDoneStep, {
        orderNumber: 321,
        tableInfo: null,
        publicOrderStatus: {
          id: 'order-4',
          order_number: 321,
          status: 'confirmed',
          payment_status: 'refunded',
          payment_method: 'delivery',
          delivery_status: 'waiting_dispatch',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [
          { key: 'pending', label: 'Recebido', description: 'Entrou na fila.' },
          { key: 'confirmed', label: 'Confirmado', description: 'Confirmado.' },
          { key: 'ready', label: 'Pronto', description: 'Pronto para sair.' },
        ],
        getStepState: (key: 'pending' | 'confirmed' | 'ready') =>
          key === 'pending' ? 'done' : key === 'confirmed' ? 'current' : 'upcoming',
        cancelOrderLoading: false,
        confirmDeliveryLoading: false,
        onCancelOrder,
        onConfirmDelivery: vi.fn(),
        onClose,
      }),
    )

    expect(getTextContent(elements)).toContain('Reembolsado')
    expect(getTextContent(elements)).toContain('Cancelar pedido')
    expect(getTextContent(elements)).not.toContain('Saiu para entrega')

    const buttons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function',
    )

    expect(buttons).toHaveLength(2)
    buttons[0].props.onClick()
    buttons[1].props.onClick()

    expect(onCancelOrder).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('não mostra confirmar recebimento quando o pedido já está entregue mesmo com delivery_status inconsistente', async () => {
    const { MenuDoneStep } = await import('@/features/menu/MenuDoneStep')

    const markup = renderToStaticMarkup(
      React.createElement(MenuDoneStep, {
        orderNumber: 500,
        tableInfo: null,
        publicOrderStatus: {
          id: 'order-500',
          order_number: 500,
          status: 'delivered',
          payment_status: 'paid',
          payment_method: 'delivery',
          delivery_status: 'out_for_delivery',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [
          { key: 'pending', label: 'Recebido', description: 'Entrou na fila.' },
          { key: 'confirmed', label: 'Confirmado', description: 'Confirmado.' },
          { key: 'ready', label: 'Pronto', description: 'Pronto para sair.' },
          { key: 'delivered', label: 'Entregue', description: 'Finalizado.' },
        ],
        getStepState: (key: 'pending' | 'confirmed' | 'ready' | 'delivered') =>
          key === 'delivered' ? 'current' : 'done',
        cancelOrderLoading: false,
        confirmDeliveryLoading: false,
        onCancelOrder: vi.fn(),
        onConfirmDelivery: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(markup).not.toContain('Confirmar recebimento')
  })

  it('renderiza cancelamento em andamento e cancelado sem mensagem de reembolso', async () => {
    const { MenuDoneStep } = await import('@/features/menu/MenuDoneStep')

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(MenuDoneStep, {
        orderNumber: 555,
        tableInfo: null,
        publicOrderStatus: {
          id: 'order-5',
          order_number: 555,
          status: 'pending',
          payment_status: 'pending',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [{ key: 'pending', label: 'Recebido', description: 'Entrou na fila.' }],
        getStepState: () => 'current',
        cancelOrderLoading: true,
        confirmDeliveryLoading: false,
        onCancelOrder: vi.fn(),
        onConfirmDelivery: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    const cancelledMarkup = renderToStaticMarkup(
      React.createElement(MenuDoneStep, {
        orderNumber: 556,
        tableInfo: null,
        publicOrderStatus: {
          id: 'order-6',
          order_number: 556,
          status: 'cancelled',
          payment_status: 'pending',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        orderSteps: [],
        getStepState: () => 'upcoming',
        cancelOrderLoading: false,
        confirmDeliveryLoading: false,
        onCancelOrder: vi.fn(),
        onConfirmDelivery: vi.fn(),
        onClose: vi.fn(),
      }),
    )

    expect(loadingMarkup).toContain('Cancelando...')
    expect(cancelledMarkup).toContain('Pedido cancelado')
    expect(cancelledMarkup).not.toContain('Reembolso solicitado com sucesso')
  })

  it('renderiza filtro de categorias com estado ativo', async () => {
    const { MenuCategoryFilter } = await import('@/features/menu/MenuCategoryFilter')

    const markup = renderToStaticMarkup(
      React.createElement(MenuCategoryFilter, {
        groups: [
          {
            category: { id: 'cat-1', name: 'Pizzas' },
            items: [],
          },
          {
            category: { id: 'cat-2', name: 'Bebidas' },
            items: [],
          },
        ],
        activeCategory: 'cat-2',
        onChange: vi.fn(),
      })
    )

    expect(markup).toContain('Todos')
    expect(markup).toContain('Pizzas')
    expect(markup).toContain('Bebidas')
  })

  it('renderiza filtro de categorias com Todos ativo por padrao', async () => {
    const { MenuCategoryFilter } = await import('@/features/menu/MenuCategoryFilter')

    const markup = renderToStaticMarkup(
      React.createElement(MenuCategoryFilter, {
        groups: [
          {
            category: { id: 'cat-1', name: 'Pizzas' },
            items: [],
          },
          {
            category: { id: 'cat-2', name: 'Bebidas' },
            items: [],
          },
        ],
        activeCategory: null,
        onChange: vi.fn(),
      })
    )

    expect(markup).toContain('Todos')
    expect(markup).toContain('bg-slate-900 text-white border-slate-900')
  })

  it('aciona handlers do filtro de categorias e cobre categoria nula', async () => {
    const { MenuCategoryFilter } = await import('@/features/menu/MenuCategoryFilter')

    const onChange = vi.fn()
    const elements = flattenElements(
      React.createElement(MenuCategoryFilter, {
        groups: [
          {
            category: { id: 'cat-1', name: 'Pizzas' },
            items: [],
          },
          {
            category: null,
            items: [],
          },
        ],
        activeCategory: 'outros',
        onChange,
      }),
    )

    const buttons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function',
    )

    expect(getTextContent(elements)).toContain('Todos')
    expect(getTextContent(elements)).toContain('Pizzas')
    expect(getTextContent(elements)).toContain('Outros')

    buttons[0].props.onClick()
    buttons[1].props.onClick()
    buttons[2].props.onClick()

    expect(onChange).toHaveBeenNthCalledWith(1, null)
    expect(onChange).toHaveBeenNthCalledWith(2, 'cat-1')
    expect(onChange).toHaveBeenNthCalledWith(3, 'outros')
  })

  it('nao renderiza filtro de categorias quando existe so um grupo', async () => {
    const { MenuCategoryFilter } = await import('@/features/menu/MenuCategoryFilter')

    expect(
      renderToStaticMarkup(
        React.createElement(MenuCategoryFilter, {
          groups: [
            {
              category: { id: 'cat-1', name: 'Pizzas' },
              items: [],
            },
          ],
          activeCategory: null,
          onChange: vi.fn(),
        }),
      ),
    ).toBe('')
  })

  it('renderiza card de item com borda e meia a meia', async () => {
    const { MenuItemCard } = await import('@/features/menu/MenuItemCard')

    const onAdd = vi.fn()
    const onBorderToggle = vi.fn()
    const onHalfFlavor = vi.fn()

    const elements = flattenElements(
      React.createElement(MenuItemCard, {
        item: {
          id: 'item-1',
          tenant_id: 'tenant-1',
          category_id: 'cat-1',
          name: 'Margherita',
          description: 'Clássica',
          price: 30,
          available: true,
          display_order: 1,
          category: { id: 'cat-1', name: 'Pizzas' },
          extras: [{ extra: { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' } }],
        },
        selectedBorder: { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' },
        onAdd,
        onBorderToggle,
        onHalfFlavor,
      })
    )

    expect(getTextContent(elements)).toContain('Margherita')
    expect(getTextContent(elements)).toContain('Clássica')
    expect(getTextContent(elements)).toContain('Borda')
    expect(getTextContent(elements)).toContain('Catupiry')
    expect(getTextContent(elements)).toContain('Pedir meia a meia')

    const buttons = elements.filter((element) => element.type === 'button')

    expect(buttons).toHaveLength(4)

    buttons[2].props.onClick()
    buttons[3].props.onClick()

    expect(onBorderToggle).toHaveBeenCalledWith(null)
    expect(onHalfFlavor).toHaveBeenCalledTimes(1)
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('renderiza card simples e aciona adicionar sem borda nem meia a meia', async () => {
    const { MenuItemCard } = await import('@/features/menu/MenuItemCard')

    const onAdd = vi.fn()
    const onBorderToggle = vi.fn()
    const onHalfFlavor = vi.fn()

    const elements = flattenElements(
      React.createElement(MenuItemCard, {
        item: {
          id: 'item-2',
          tenant_id: 'tenant-1',
          category_id: 'cat-2',
          name: 'Suco de Laranja',
          description: null,
          price: 8.5,
          available: true,
          display_order: 2,
          category: { id: 'cat-2', name: 'Bebidas' },
          extras: [],
        },
        selectedBorder: null,
        onAdd,
        onBorderToggle,
        onHalfFlavor,
      }),
    )

    expect(getTextContent(elements)).toContain('Suco de Laranja')
    expect(getTextContent(elements)).toContain('R$ 8.50')
    expect(getTextContent(elements)).not.toContain('Borda')
    expect(getTextContent(elements)).not.toContain('Pedir meia a meia')

    const buttons = elements.filter((element) => element.type === 'button')

    expect(buttons).toHaveLength(1)

    buttons[0].props.onClick()

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onBorderToggle).not.toHaveBeenCalled()
    expect(onHalfFlavor).not.toHaveBeenCalled()
  })

  it('renderiza topo do menu com tenant, mesa e badge do carrinho', async () => {
    const { MenuTopBar } = await import('@/features/menu/MenuTopBar')

    const markup = renderToStaticMarkup(
      React.createElement(MenuTopBar, {
        tenantName: 'ChefOps Pizza',
        tableInfo: { id: 'table-1', number: '15' },
        cartCount: 3,
        onCartOpen: vi.fn(),
      })
    )

    expect(markup).toContain('ChefOps Pizza')
    expect(markup).toContain('Mesa 15')
    expect(markup).toContain('Carrinho')
    expect(markup).toContain('3')
  })

  it('renderiza painel de status com aviso distinto, pedido e banner de mesa', async () => {
    const { MenuStatusPanel } = await import('@/features/menu/MenuStatusPanel')

    const markup = renderToStaticMarkup(
      React.createElement(MenuStatusPanel, {
        checkoutNotice: 'Pagamento pendente.',
        publicOrderStatus: {
          id: 'order-1',
          order_number: 42,
          status: 'preparing',
          payment_status: 'paid',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        cartOpen: false,
        onTrackOrder: vi.fn(),
        tableInfo: { id: 'table-2', number: '9' },
      })
    )

    expect(markup).toContain('Pagamento pendente.')
    expect(markup).toContain('border-blue-200 bg-blue-50 text-blue-700')
    expect(markup).toContain('Pedido em preparo #42')
    expect(markup).toContain('Mesa 9')
  })

  it('oculta o banner quando ele só repete o status em andamento já exibido no card', async () => {
    const { MenuStatusPanel } = await import('@/features/menu/MenuStatusPanel')

    const markup = renderToStaticMarkup(
      React.createElement(MenuStatusPanel, {
        checkoutNotice: 'Seu pedido está em preparo.',
        publicOrderStatus: {
          id: 'order-duplicate',
          order_number: 77,
          status: 'preparing',
          payment_status: 'paid',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        cartOpen: false,
        onTrackOrder: vi.fn(),
        tableInfo: null,
      })
    )

    expect(markup).not.toContain('border-blue-200 bg-blue-50 text-blue-700')
    expect(markup).toContain('Pedido em preparo #77')
  })

  it('nao renderiza card de pedido em andamento para estados finais no painel de status', async () => {
    const { MenuStatusPanel } = await import('@/features/menu/MenuStatusPanel')

    const cancelledMarkup = renderToStaticMarkup(
      React.createElement(MenuStatusPanel, {
        checkoutNotice: 'Pedido cancelado.',
        publicOrderStatus: {
          id: 'order-cancelled',
          order_number: 99,
          status: 'cancelled',
          payment_status: 'refunded',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        cartOpen: false,
        onTrackOrder: vi.fn(),
        tableInfo: null,
      })
    )

    const deliveredMarkup = renderToStaticMarkup(
      React.createElement(MenuStatusPanel, {
        checkoutNotice: 'Pedido entregue com sucesso.',
        publicOrderStatus: {
          id: 'order-delivered',
          order_number: 100,
          status: 'delivered',
          payment_status: 'paid',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        cartOpen: false,
        onTrackOrder: vi.fn(),
        tableInfo: null,
      })
    )

    expect(cancelledMarkup).toContain('Pedido cancelado.')
    expect(cancelledMarkup).toContain('border-red-200 bg-red-50 text-red-700')
    expect(cancelledMarkup).not.toContain('Pedido em andamento')
    expect(deliveredMarkup).toContain('Pedido entregue com sucesso.')
    expect(deliveredMarkup).toContain('border-green-200 bg-green-50 text-green-700')
    expect(deliveredMarkup).not.toContain('Pedido em andamento')
  })

  it('renderiza o card de status sem depender de headline no painel', async () => {
    const { MenuStatusPanel } = await import('@/features/menu/MenuStatusPanel')

    const markup = renderToStaticMarkup(
      React.createElement(MenuStatusPanel, {
        checkoutNotice: null,
        publicOrderStatus: {
          id: 'order-no-headline',
          order_number: 55,
          status: 'confirmed',
          payment_status: 'paid',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        cartOpen: false,
        onTrackOrder: vi.fn(),
        tableInfo: null,
      })
    )

    expect(markup).toContain('Pedido confirmado #55')
  })

  it('renderiza casca da página pública do menu com modal e drawer', async () => {
    const { PublicMenuPageShell } = await import('@/features/menu/PublicMenuPageShell')

    const item = {
      id: 'item-1',
      tenant_id: 'tenant-1',
      category_id: 'cat-1',
      name: 'Margherita',
      description: 'Clássica',
      price: 30,
      available: true,
      display_order: 1,
      category: { id: 'cat-1', name: 'Pizzas' },
      extras: [],
    }

    const markup = renderToStaticMarkup(
      React.createElement(PublicMenuPageShell, {
        tenantName: 'ChefOps Pizza',
        tableInfo: { id: 'table-1', number: '7' },
        cartCount: 2,
        onCartOpen: vi.fn(),
        checkoutNotice: 'Pagamento aprovado.',
        publicOrderStatus: {
          id: 'order-1',
          order_number: 42,
          status: 'preparing',
          payment_status: 'paid',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        cartOpen: false,
        onTrackOrder: vi.fn(),
        groups: [
          { category: item.category, items: [item] },
          {
            category: { id: 'cat-2', name: 'Bebidas' },
            items: [
              {
                ...item,
                id: 'item-2',
                category_id: 'cat-2',
                category: { id: 'cat-2', name: 'Bebidas' },
                name: 'Suco',
              },
            ],
          },
        ],
        activeCategory: 'cat-1',
        onCategoryChange: vi.fn(),
        items: [item],
        filteredGroups: [{ category: item.category, items: [item] }],
        selectedBorders: {},
        onAdd: vi.fn(),
        onBorderToggle: vi.fn(),
        onHalfFlavor: vi.fn(),
        halfFlavorModal: { item },
        halfFlavorOptions: [item],
        onCloseHalfFlavor: vi.fn(),
        onSelectHalfFlavor: vi.fn(),
        drawerProps: {
          open: true,
          title: 'Seu pedido',
          checkoutStep: 'cart',
          onClose: vi.fn(),
          onStepChange: vi.fn(),
          cartStepProps: {
            cart: [{ menu_item_id: 'item-1', name: 'Margherita', price: 30, quantity: 1, extras: [] }],
            cartTotal: 30,
            deliveryFee: 0,
            orderTotal: 30,
            onIncrement: vi.fn(),
            onDecrement: vi.fn(),
            onRemove: vi.fn(),
            onContinue: vi.fn(),
            onClear: vi.fn(),
          },
          infoStepProps: {
            tableInfo: { id: 'table-1', number: '7' },
            phone: '',
            onPhoneChange: vi.fn(),
            phoneVerified: false,
            onPhoneLookup: vi.fn(),
            lookingUpPhone: false,
            errors: {},
            isPaidPlan: true,
            existingCustomer: null,
            isNewCustomer: false,
            customerName: '',
            onCustomerNameChange: vi.fn(),
            customerCpf: '',
            onCustomerCpfChange: vi.fn(),
            paymentOptions: [{ value: 'online', label: 'Online' }],
            paymentMethod: 'online',
            onPaymentMethodChange: vi.fn(),
            notes: '',
            onNotesChange: vi.fn(),
            cartTotal: 30,
            deliveryFee: 0,
            orderTotal: 30,
            isProcessing: false,
            onContinue: vi.fn(),
            onBack: vi.fn(),
          },
          addressStepProps: {
            address: {},
            onAddressChange: vi.fn(),
            onCepLookup: vi.fn(),
            loadingCep: false,
            errors: {},
            paymentMethod: 'online',
            isProcessing: false,
            onSubmit: vi.fn(),
            onBack: vi.fn(),
          },
          doneStepProps: {
            orderNumber: 42,
            tableInfo: { id: 'table-1', number: '7' },
            publicOrderStatus: null,
            orderSteps: [],
            getStepState: () => 'upcoming',
            cancelOrderLoading: false,
            onCancelOrder: vi.fn(),
            onClose: vi.fn(),
          },
        },
      })
    )

    expect(markup).toContain('ChefOps Pizza')
    expect(markup).toContain('Pagamento aprovado.')
    expect(markup).toContain('Pizzas')
    expect(markup).toContain('Escolha o segundo sabor')
    expect(markup).toContain('Seu pedido')
  })

  it('aciona callbacks da casca pública do menu', async () => {
    const { PublicMenuPageShell } = await import('@/features/menu/PublicMenuPageShell')

    const item = {
      id: 'item-1',
      tenant_id: 'tenant-1',
      category_id: 'cat-1',
      name: 'Margherita',
      description: 'Clássica',
      price: 30,
      available: true,
      display_order: 1,
      category: { id: 'cat-1', name: 'Pizzas' },
      extras: [],
    }

    const onCartOpen = vi.fn()
    const onCategoryChange = vi.fn()
    const onSelectHalfFlavor = vi.fn()
    const onCloseDrawer = vi.fn()

    const elements = flattenElements(
      React.createElement(PublicMenuPageShell, {
        tenantName: 'ChefOps Pizza',
        tableInfo: { id: 'table-1', number: '7' },
        cartCount: 2,
        onCartOpen,
        checkoutNotice: 'Pagamento aprovado.',
        publicOrderStatus: {
          id: 'order-1',
          order_number: 42,
          status: 'preparing',
          payment_status: 'paid',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
        },
        cartOpen: true,
        onTrackOrder: vi.fn(),
        groups: [
          { category: item.category, items: [item] },
          {
            category: { id: 'cat-2', name: 'Bebidas' },
            items: [{ ...item, id: 'item-2', category_id: 'cat-2', category: { id: 'cat-2', name: 'Bebidas' }, name: 'Suco' }],
          },
        ],
        activeCategory: 'cat-1',
        onCategoryChange,
        items: [item],
        filteredGroups: [{ category: item.category, items: [item] }],
        selectedBorders: {},
        onAdd: vi.fn(),
        onBorderToggle: vi.fn(),
        onHalfFlavor: vi.fn(),
        halfFlavorModal: { item },
        halfFlavorOptions: [item],
        onCloseHalfFlavor: vi.fn(),
        onSelectHalfFlavor,
        drawerProps: {
          open: true,
          title: 'Pedido realizado!',
          checkoutStep: 'done',
          onClose: onCloseDrawer,
          onStepChange: vi.fn(),
          cartStepProps: {
            cart: [],
            cartTotal: 0,
            deliveryFee: 0,
            orderTotal: 0,
            onIncrement: vi.fn(),
            onDecrement: vi.fn(),
            onRemove: vi.fn(),
            onContinue: vi.fn(),
            onClear: vi.fn(),
          },
          infoStepProps: {
            tableInfo: null,
            phone: '',
            onPhoneChange: vi.fn(),
            phoneVerified: false,
            onPhoneLookup: vi.fn(),
            lookingUpPhone: false,
            errors: {},
            isPaidPlan: true,
            existingCustomer: null,
            isNewCustomer: false,
            customerName: '',
            onCustomerNameChange: vi.fn(),
            customerCpf: '',
            onCustomerCpfChange: vi.fn(),
            paymentOptions: [{ value: 'online', label: 'Online' }],
            paymentMethod: 'online',
            onPaymentMethodChange: vi.fn(),
            notes: '',
            onNotesChange: vi.fn(),
            cartTotal: 0,
            deliveryFee: 0,
            orderTotal: 0,
            isProcessing: false,
            onContinue: vi.fn(),
            onBack: vi.fn(),
          },
          addressStepProps: {
            address: {},
            onAddressChange: vi.fn(),
            onCepLookup: vi.fn(),
            loadingCep: false,
            errors: {},
            paymentMethod: 'online',
            isProcessing: false,
            onSubmit: vi.fn(),
            onBack: vi.fn(),
          },
          doneStepProps: {
            orderNumber: 42,
            tableInfo: null,
            publicOrderStatus: {
              id: 'order-1',
              order_number: 42,
              status: 'preparing',
              payment_status: 'paid',
              created_at: '2026-03-21T00:00:00.000Z',
              updated_at: '2026-03-21T00:00:00.000Z',
            },
            orderSteps: [],
            getStepState: () => 'upcoming',
            cancelOrderLoading: false,
            onCancelOrder: vi.fn(),
            onClose: onCloseDrawer,
          },
        },
      })
    )

    const cartButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element).includes('Carrinho')
    )
    const categoryButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Pizzas'
    )
    const chooseFlavorButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element).includes('Margherita')
    )

    cartButton?.props.onClick()
    categoryButton?.props.onClick()
    chooseFlavorButton?.props.onClick()

    expect(onCartOpen).toHaveBeenCalledOnce()
    expect(onCategoryChange).toHaveBeenCalledWith('cat-1')
    expect(onSelectHalfFlavor).toHaveBeenCalledWith(item)
  })

  it('renderiza seções públicas do cardápio e estado vazio', async () => {
    const { PublicMenuSections } = await import('@/features/menu/PublicMenuSections')

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(PublicMenuSections, {
        items: [],
        filteredGroups: [],
        selectedBorders: {},
        onAdd: vi.fn(),
        onBorderToggle: vi.fn(),
        onHalfFlavor: vi.fn(),
      })
    )

    const groupedMarkup = renderToStaticMarkup(
      React.createElement(PublicMenuSections, {
        items: [
          {
            id: 'item-1',
            tenant_id: 'tenant-1',
            category_id: 'cat-1',
            name: 'Margherita',
            description: 'Clássica',
            price: 30,
            available: true,
            display_order: 1,
            category: { id: 'cat-1', name: 'Pizzas' },
            extras: [],
          },
        ],
        filteredGroups: [
          {
            category: { id: 'cat-1', name: 'Pizzas' },
            items: [
              {
                id: 'item-1',
                tenant_id: 'tenant-1',
                category_id: 'cat-1',
                name: 'Margherita',
                description: 'Clássica',
                price: 30,
                available: true,
                display_order: 1,
                category: { id: 'cat-1', name: 'Pizzas' },
                extras: [],
              },
            ],
          },
        ],
        selectedBorders: {},
        onAdd: vi.fn(),
        onBorderToggle: vi.fn(),
        onHalfFlavor: vi.fn(),
      })
    )
    const groupedWithoutCategoryMarkup = renderToStaticMarkup(
      React.createElement(PublicMenuSections, {
        items: [
          {
            id: 'item-2',
            tenant_id: 'tenant-1',
            category_id: null,
            name: 'Suco de Uva',
            description: null,
            price: 9,
            available: true,
            display_order: 2,
            category: null,
            extras: [],
          },
        ],
        filteredGroups: [
          {
            category: null,
            items: [
              {
                id: 'item-2',
                tenant_id: 'tenant-1',
                category_id: null,
                name: 'Suco de Uva',
                description: null,
                price: 9,
                available: true,
                display_order: 2,
                category: null,
                extras: [],
              },
            ],
          },
        ],
        selectedBorders: {},
        onAdd: vi.fn(),
        onBorderToggle: vi.fn(),
        onHalfFlavor: vi.fn(),
      })
    )

    expect(emptyMarkup).toContain('Cardápio em breve.')
    expect(groupedMarkup).toContain('Pizzas')
    expect(groupedMarkup).toContain('Margherita')
    expect(groupedWithoutCategoryMarkup).toContain('Outros')
    expect(groupedWithoutCategoryMarkup).toContain('Suco de Uva')
  })

  it('aciona handlers das seções públicas do cardápio', async () => {
    const { PublicMenuSections } = await import('@/features/menu/PublicMenuSections')

    const onAdd = vi.fn()
    const onBorderToggle = vi.fn()
    const onHalfFlavor = vi.fn()

    const item = {
      id: 'item-1',
      tenant_id: 'tenant-1',
      category_id: 'cat-1',
      name: 'Margherita',
      description: 'Clássica',
      price: 30,
      available: true,
      display_order: 1,
      category: { id: 'cat-1', name: 'Pizzas' },
      extras: [{ extra: { id: 'border-1', name: 'Catupiry', price: 5, category: 'border' } }],
    }

    const elements = flattenElements(
      React.createElement(PublicMenuSections, {
        items: [item],
        filteredGroups: [{ category: item.category, items: [item] }],
        selectedBorders: { 'item-1': null },
        onAdd,
        onBorderToggle,
        onHalfFlavor,
      })
    )

    const buttons = elements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )

    buttons.forEach((button) => button.props.onClick())

    expect(onBorderToggle).toHaveBeenCalledWith(item, {
      id: 'border-1',
      name: 'Catupiry',
      price: 5,
      category: 'border',
    })
    expect(onHalfFlavor).toHaveBeenCalledWith(item)
    expect(onAdd).toHaveBeenCalledWith(item)
  })

  it('renderiza drawer do checkout e aciona fechamento', async () => {
    const { MenuCheckoutDrawer } = await import('@/features/menu/MenuCheckoutDrawer')

    const onClose = vi.fn()
    const onStepChange = vi.fn()
    const onContinue = vi.fn()

    const elements = flattenElements(
      React.createElement(MenuCheckoutDrawer, {
        open: true,
        title: 'Seu pedido',
        checkoutStep: 'cart',
        onClose,
        onStepChange,
        cartStepProps: {
          cart: [
            {
              menu_item_id: 'item-1',
              name: 'Pizza',
              price: 30,
              quantity: 1,
              extras: [],
            },
          ],
          cartTotal: 30,
          deliveryFee: 0,
          orderTotal: 30,
          onIncrement: vi.fn(),
          onDecrement: vi.fn(),
          onRemove: vi.fn(),
          onContinue,
          onClear: vi.fn(),
        },
        infoStepProps: {
          tableInfo: null,
          phone: '',
          onPhoneChange: vi.fn(),
          phoneVerified: false,
          onPhoneLookup: vi.fn(),
          lookingUpPhone: false,
          errors: {},
          isPaidPlan: true,
          existingCustomer: null,
          isNewCustomer: false,
          customerName: '',
          onCustomerNameChange: vi.fn(),
          customerCpf: '',
          onCustomerCpfChange: vi.fn(),
          paymentOptions: [{ value: 'online', label: 'Online' }],
          paymentMethod: 'online',
          onPaymentMethodChange: vi.fn(),
          notes: '',
          onNotesChange: vi.fn(),
          cartTotal: 30,
          deliveryFee: 0,
          orderTotal: 30,
          isProcessing: false,
          onContinue: vi.fn(),
          onBack: vi.fn(),
        },
        addressStepProps: {
          address: {},
          onAddressChange: vi.fn(),
          onCepLookup: vi.fn(),
          loadingCep: false,
          errors: {},
          paymentMethod: 'online',
          isProcessing: false,
          onSubmit: vi.fn(),
          onBack: vi.fn(),
        },
        doneStepProps: {
          orderNumber: 42,
          tableInfo: null,
          publicOrderStatus: null,
          orderSteps: [],
          getStepState: () => 'upcoming',
          cancelOrderLoading: false,
          onCancelOrder: vi.fn(),
          onClose: vi.fn(),
        },
      })
    )

    expect(getTextContent(elements)).toContain('Seu pedido')
    expect(getTextContent(elements)).toContain('Pizza')

    const clickable = elements.filter((element) =>
      typeof element.props.onClick === 'function' && (element.type === 'button' || element.type === 'div')
    )

    clickable[0].props.onClick()
    clickable[1].props.onClick()
    clickable[5].props.onClick()

    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onStepChange).toHaveBeenCalledWith('info')
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('aciona navegação e fechamento nos outros steps do drawer', async () => {
    const { MenuCheckoutDrawer } = await import('@/features/menu/MenuCheckoutDrawer')

    const onClose = vi.fn()
    const onStepChange = vi.fn()
    const onDoneClose = vi.fn()

    const infoElements = flattenElements(
      React.createElement(MenuCheckoutDrawer, {
        open: true,
        title: 'Seus dados',
        checkoutStep: 'info',
        onClose,
        onStepChange,
        cartStepProps: {
          cart: [],
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          onIncrement: vi.fn(),
          onDecrement: vi.fn(),
          onRemove: vi.fn(),
          onContinue: vi.fn(),
          onClear: vi.fn(),
        },
        infoStepProps: {
          tableInfo: null,
          phone: '(11) 99999-9999',
          onPhoneChange: vi.fn(),
          phoneVerified: true,
          onPhoneLookup: vi.fn(),
          lookingUpPhone: false,
          errors: {},
          isPaidPlan: true,
          existingCustomer: null,
          isNewCustomer: false,
          customerName: 'Maria',
          onCustomerNameChange: vi.fn(),
          customerCpf: '',
          onCustomerCpfChange: vi.fn(),
          paymentOptions: [{ value: 'online', label: 'Online' }],
          paymentMethod: 'online',
          onPaymentMethodChange: vi.fn(),
          notes: '',
          onNotesChange: vi.fn(),
          cartTotal: 30,
          deliveryFee: 0,
          orderTotal: 30,
          isProcessing: false,
          onContinue: vi.fn(),
          onBack: vi.fn(),
        },
        addressStepProps: {
          address: {},
          onAddressChange: vi.fn(),
          onCepLookup: vi.fn(),
          loadingCep: false,
          errors: {},
          paymentMethod: 'online',
          isProcessing: false,
          onSubmit: vi.fn(),
          onBack: vi.fn(),
        },
        doneStepProps: {
          orderNumber: 42,
          tableInfo: null,
          publicOrderStatus: null,
          orderSteps: [],
          getStepState: () => 'upcoming',
          cancelOrderLoading: false,
          onCancelOrder: vi.fn(),
          onClose: onDoneClose,
        },
      })
    )

    const addressElements = flattenElements(
      React.createElement(MenuCheckoutDrawer, {
        open: true,
        title: 'Endereço de entrega',
        checkoutStep: 'address',
        onClose,
        onStepChange,
        cartStepProps: {
          cart: [],
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          onIncrement: vi.fn(),
          onDecrement: vi.fn(),
          onRemove: vi.fn(),
          onContinue: vi.fn(),
          onClear: vi.fn(),
        },
        infoStepProps: {
          tableInfo: null,
          phone: '',
          onPhoneChange: vi.fn(),
          phoneVerified: false,
          onPhoneLookup: vi.fn(),
          lookingUpPhone: false,
          errors: {},
          isPaidPlan: false,
          existingCustomer: null,
          isNewCustomer: false,
          customerName: '',
          onCustomerNameChange: vi.fn(),
          customerCpf: '',
          onCustomerCpfChange: vi.fn(),
          paymentOptions: [{ value: 'delivery', label: 'Entrega' }],
          paymentMethod: 'delivery',
          onPaymentMethodChange: vi.fn(),
          notes: '',
          onNotesChange: vi.fn(),
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          isProcessing: false,
          onContinue: vi.fn(),
          onBack: vi.fn(),
        },
        addressStepProps: {
          address: { zip_code: '12345-678' },
          onAddressChange: vi.fn(),
          onCepLookup: vi.fn(),
          loadingCep: false,
          errors: {},
          paymentMethod: 'delivery',
          isProcessing: false,
          onSubmit: vi.fn(),
          onBack: vi.fn(),
        },
        doneStepProps: {
          orderNumber: 42,
          tableInfo: null,
          publicOrderStatus: null,
          orderSteps: [],
          getStepState: () => 'upcoming',
          cancelOrderLoading: false,
          onCancelOrder: vi.fn(),
          onClose: onDoneClose,
        },
      })
    )

    const doneElements = flattenElements(
      React.createElement(MenuCheckoutDrawer, {
        open: true,
        title: 'Pedido realizado!',
        checkoutStep: 'done',
        onClose,
        onStepChange,
        cartStepProps: {
          cart: [],
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          onIncrement: vi.fn(),
          onDecrement: vi.fn(),
          onRemove: vi.fn(),
          onContinue: vi.fn(),
          onClear: vi.fn(),
        },
        infoStepProps: {
          tableInfo: null,
          phone: '',
          onPhoneChange: vi.fn(),
          phoneVerified: false,
          onPhoneLookup: vi.fn(),
          lookingUpPhone: false,
          errors: {},
          isPaidPlan: false,
          existingCustomer: null,
          isNewCustomer: false,
          customerName: '',
          onCustomerNameChange: vi.fn(),
          customerCpf: '',
          onCustomerCpfChange: vi.fn(),
          paymentOptions: [{ value: 'delivery', label: 'Entrega' }],
          paymentMethod: 'delivery',
          onPaymentMethodChange: vi.fn(),
          notes: '',
          onNotesChange: vi.fn(),
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          isProcessing: false,
          onContinue: vi.fn(),
          onBack: vi.fn(),
        },
        addressStepProps: {
          address: {},
          onAddressChange: vi.fn(),
          onCepLookup: vi.fn(),
          loadingCep: false,
          errors: {},
          paymentMethod: 'delivery',
          isProcessing: false,
          onSubmit: vi.fn(),
          onBack: vi.fn(),
        },
        doneStepProps: {
          orderNumber: 42,
          tableInfo: null,
          publicOrderStatus: {
            id: 'order-1',
            order_number: 42,
            status: 'pending',
            payment_status: 'paid',
            created_at: '2026-03-21T00:00:00.000Z',
            updated_at: '2026-03-21T00:00:00.000Z',
          },
          orderSteps: [],
          getStepState: () => 'upcoming',
          cancelOrderLoading: false,
          onCancelOrder: vi.fn(),
          onClose: onDoneClose,
        },
      })
    )

    const infoBackButton = infoElements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Voltar'
    )
    const addressBackButton = addressElements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Voltar'
    )
    const doneCloseButton = doneElements.find(
      (element) =>
        element.type === 'button' &&
        ['Fechar', 'Voltar ao cardápio', 'Acompanhar depois'].includes(getTextContent(element))
    )
    const doneDrawerCloseButton = doneElements.find(
      (element) => element.type === 'button' && getTextContent(element) === ''
    )

    infoBackButton?.props.onClick()
    addressBackButton?.props.onClick()
    doneCloseButton?.props.onClick()
    doneDrawerCloseButton?.props.onClick()

    expect(onStepChange).toHaveBeenCalledWith('cart')
    expect(onStepChange).toHaveBeenCalledWith('info')
    expect(onDoneClose).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('renderiza casca da página de pedidos', async () => {
    const { OrdersPageContent } = await import('@/features/orders/OrdersPageContent')

    const order = {
      id: 'order-1',
      tenant_id: 'tenant-1',
      customer_name: 'Maria',
      customer_phone: '11999999999',
      items: [{ menu_item_id: 'item-1', name: 'Pizza', price: 30, quantity: 1 }],
      total: 30,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'online',
      table_number: null,
      tab_id: null,
      delivery_address: null,
      delivery_fee: 0,
      delivery_status: null,
      notifications: [],
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-21T00:00:00.000Z',
    }

    const markup = renderToStaticMarkup(
      React.createElement(OrdersPageContent, {
        manualOrderOpen: true,
        onManualOrderOpenChange: vi.fn(),
        filters: [{ label: 'Todos', value: '' }],
        statusFilter: '',
        onStatusFilterChange: vi.fn(),
        isLoading: false,
        orders: [order] as never,
        totalCount: 1,
        page: 1,
        pageSize: 10,
        onPageChange: vi.fn(),
        deliveryDrivers: [],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(markup).toContain('Pedidos')
    expect(markup).toContain('Maria')
    expect(markup).toContain('Novo pedido manual')
  })

  it('encaminha ações da casca da página de pedidos', async () => {
    const { OrdersPageContent } = await import('@/features/orders/OrdersPageContent')

    const onManualOrderOpenChange = vi.fn()
    const onStatusFilterChange = vi.fn()
    const onPageChange = vi.fn()
    const onAssignDriver = vi.fn()
    const onAdvance = vi.fn()
    const onAdvanceDelivery = vi.fn()
    const onMercadoPagoCheckout = vi.fn()
    const onConfirmPayment = vi.fn()
    const onCancel = vi.fn()

    const order = {
      id: 'order-1',
      order_number: 42,
      tenant_id: 'tenant-1',
      customer_name: 'Maria',
      customer_phone: '11999999999',
      customer_cpf: null,
      items: [{ id: 'item-1', menu_item_id: 'item-1', name: 'Pizza', price: 30, quantity: 1, extras: [] }],
      subtotal: 30,
      total: 38,
      status: 'ready',
      payment_status: 'pending',
      payment_method: 'delivery',
      table_number: null,
      tab: null,
      tab_id: null,
      delivery_address: { street: 'Rua A' },
      delivery_fee: 8,
      delivery_status: 'assigned',
      delivery_driver: { id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true },
      delivery_driver_id: 'driver-1',
      notifications: [],
      notes: null,
      created_at: '2026-03-21T00:00:00.000Z',
      updated_at: '2026-03-21T00:00:00.000Z',
    }

    const elements = flattenElements(
      React.createElement(OrdersPageContent, {
        manualOrderOpen: false,
        onManualOrderOpenChange,
        filters: [
          { label: 'Todos', value: '' },
          { label: 'Pronto', value: 'ready' },
        ],
        statusFilter: '',
        onStatusFilterChange,
        isLoading: false,
        orders: [order] as never,
        totalCount: 30,
        page: 2,
        pageSize: 10,
        onPageChange,
        deliveryDrivers: [{ id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true }],
        hasWhatsappNotifications: false,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver,
        onAdvance,
        onAdvanceDelivery,
        onMercadoPagoCheckout,
        onConfirmPayment,
        onCancel,
      })
    )

    const createButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element).includes('Novo pedido')
    )
    const readyFilter = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Pronto'
    )
    const previousButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Anterior'
    )
    const nextButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Próxima'
    )
    const deliveryButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Saiu para entrega'
    )
    const cancelButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Cancelar'
    )
    const select = elements.find(
      (element) => element.type === 'select' && typeof element.props.onChange === 'function'
    )

    expect(createButton).toBeTruthy()
    expect(readyFilter).toBeTruthy()
    expect(previousButton).toBeTruthy()
    expect(nextButton).toBeTruthy()
    expect(deliveryButton).toBeTruthy()
    expect(cancelButton).toBeTruthy()
    expect(select).toBeTruthy()

    createButton!.props.onClick()
    readyFilter!.props.onClick()
    previousButton!.props.onClick()
    nextButton!.props.onClick()
    deliveryButton!.props.onClick()
    cancelButton!.props.onClick()
    select!.props.onChange({ target: { value: '' } })

    expect(onManualOrderOpenChange).toHaveBeenCalledWith(true)
    expect(onStatusFilterChange).toHaveBeenCalledWith('ready')
    expect(onPageChange).toHaveBeenCalledWith(1)
    expect(onPageChange).toHaveBeenCalledWith(3)
    expect(onAdvanceDelivery).toHaveBeenCalledWith(order)
    expect(onCancel).toHaveBeenCalledWith(order)
    expect(onAssignDriver).toHaveBeenCalledWith(order, '')
    expect(onAdvance).not.toHaveBeenCalled()
    expect(onConfirmPayment).not.toHaveBeenCalled()
  })

  it('renderiza casca da página de cardápio', async () => {
    const { MenuDashboardPageContent } = await import('@/features/menu/MenuDashboardPageContent')

    const item = {
      id: 'item-1',
      tenant_id: 'tenant-1',
      category_id: 'cat-1',
      name: 'Pizza Margherita',
      description: 'Clássica',
      price: 30,
      available: true,
      display_order: 1,
      category: { id: 'cat-1', name: 'Pizzas' },
      extras: [],
    }

    const markup = renderToStaticMarkup(
      React.createElement(MenuDashboardPageContent, {
        availableCount: 3,
        inactiveCount: 1,
        limitLabel: '4/10 no plano',
        menuItemLimitReached: true,
        onCreate: vi.fn(),
        planName: 'free',
        menuItemLimit: 10,
        categoryFilter: 'all',
        onCategoryFilterChange: vi.fn(),
        categories: [{ id: 'cat-1', name: 'Pizzas' }],
        statusFilter: 'available',
        onStatusFilterChange: vi.fn(),
        isLoading: false,
        items: [item] as never,
        paginatedItems: [item] as never,
        deletingId: null,
        onEdit: vi.fn(),
        onToggleAvailable: vi.fn(),
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        dialogProps: {
          open: true,
          onOpenChange: vi.fn(),
          editing: item,
          form: {
            control: {},
            formState: { isSubmitting: false, errors: {} },
            handleSubmit: (callback: (values: unknown) => void) => () => callback({}),
          } as never,
          categories: [{ id: 'cat-1', name: 'Pizzas' }],
          hasStockAutomation: false,
          linkedProductId: 'none',
          onLinkedProductChange: vi.fn(),
          products: { data: [] },
          ingredients: [],
          onAddIngredient: vi.fn(),
          onUpdateIngredient: vi.fn(),
          onRemoveIngredient: vi.fn(),
          allExtras: [],
          selectedExtras: [],
          onSelectedExtrasChange: vi.fn(),
          onSubmit: vi.fn(),
        },
      })
    )

    expect(markup).toContain('Cardápio')
    expect(markup).toContain('Pizza Margherita')
    expect(markup).toContain('limite de 10 itens')
    expect(markup).toContain('Editar item')
  })

  it('renderiza loading e estado vazio da casca de cardápio sem banner do plano free', async () => {
    const { MenuDashboardPageContent } = await import('@/features/menu/MenuDashboardPageContent')

    const onCreate = vi.fn()

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(MenuDashboardPageContent, {
        availableCount: 0,
        inactiveCount: 0,
        limitLabel: '0/10 no plano',
        menuItemLimitReached: false,
        onCreate,
        planName: 'basic',
        menuItemLimit: 10,
        categoryFilter: 'all',
        onCategoryFilterChange: vi.fn(),
        categories: [{ id: 'cat-1', name: 'Pizzas' }],
        statusFilter: 'available',
        onStatusFilterChange: vi.fn(),
        isLoading: true,
        items: [] as never,
        paginatedItems: [] as never,
        deletingId: null,
        onEdit: vi.fn(),
        onToggleAvailable: vi.fn(),
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        dialogProps: {
          open: false,
          onOpenChange: vi.fn(),
          editing: null,
          form: {
            control: {},
            formState: { isSubmitting: false, errors: {} },
            handleSubmit: (callback: (values: unknown) => void) => () => callback({}),
          } as never,
          categories: [],
          hasStockAutomation: false,
          linkedProductId: 'none',
          onLinkedProductChange: vi.fn(),
          products: { data: [] },
          ingredients: [],
          onAddIngredient: vi.fn(),
          onUpdateIngredient: vi.fn(),
          onRemoveIngredient: vi.fn(),
          allExtras: [],
          selectedExtras: [],
          onSelectedExtrasChange: vi.fn(),
          onSubmit: vi.fn(),
        },
      }),
    )

    expect(loadingMarkup).toContain('Carregando...')
    expect(loadingMarkup).not.toContain('No plano Basic')

    const emptyElements = flattenElements(
      React.createElement(MenuDashboardPageContent, {
        availableCount: 0,
        inactiveCount: 0,
        limitLabel: '0/10 no plano',
        menuItemLimitReached: false,
        onCreate,
        planName: 'basic',
        menuItemLimit: 10,
        categoryFilter: 'all',
        onCategoryFilterChange: vi.fn(),
        categories: [{ id: 'cat-1', name: 'Pizzas' }],
        statusFilter: 'available',
        onStatusFilterChange: vi.fn(),
        isLoading: false,
        items: [] as never,
        paginatedItems: [] as never,
        deletingId: null,
        onEdit: vi.fn(),
        onToggleAvailable: vi.fn(),
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        dialogProps: {
          open: false,
          onOpenChange: vi.fn(),
          editing: null,
          form: {
            control: {},
            formState: { isSubmitting: false, errors: {} },
            handleSubmit: (callback: (values: unknown) => void) => () => callback({}),
          } as never,
          categories: [],
          hasStockAutomation: false,
          linkedProductId: 'none',
          onLinkedProductChange: vi.fn(),
          products: { data: [] },
          ingredients: [],
          onAddIngredient: vi.fn(),
          onUpdateIngredient: vi.fn(),
          onRemoveIngredient: vi.fn(),
          allExtras: [],
          selectedExtras: [],
          onSelectedExtrasChange: vi.fn(),
          onSubmit: vi.fn(),
        },
      }),
    )

    expect(getTextContent(emptyElements)).toContain('Nenhum item encontrado para os filtros atuais.')

    const createButtons = emptyElements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function',
    )

    createButtons.at(-1)?.props.onClick()

    expect(onCreate).toHaveBeenCalled()
  })

  it('nao renderiza drawer fechado e mostra step final quando aberto', async () => {
    const { MenuCheckoutDrawer } = await import('@/features/menu/MenuCheckoutDrawer')

    const closedMarkup = renderToStaticMarkup(
      React.createElement(MenuCheckoutDrawer, {
        open: false,
        title: 'Fechado',
        checkoutStep: 'done',
        onClose: vi.fn(),
        onStepChange: vi.fn(),
        cartStepProps: {
          cart: [],
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          onIncrement: vi.fn(),
          onDecrement: vi.fn(),
          onRemove: vi.fn(),
          onContinue: vi.fn(),
          onClear: vi.fn(),
        },
        infoStepProps: {
          tableInfo: null,
          phone: '',
          onPhoneChange: vi.fn(),
          phoneVerified: false,
          onPhoneLookup: vi.fn(),
          lookingUpPhone: false,
          errors: {},
          isPaidPlan: false,
          existingCustomer: null,
          isNewCustomer: false,
          customerName: '',
          onCustomerNameChange: vi.fn(),
          customerCpf: '',
          onCustomerCpfChange: vi.fn(),
          paymentOptions: [{ value: 'delivery', label: 'Entrega' }],
          paymentMethod: 'delivery',
          onPaymentMethodChange: vi.fn(),
          notes: '',
          onNotesChange: vi.fn(),
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          isProcessing: false,
          onContinue: vi.fn(),
          onBack: vi.fn(),
        },
        addressStepProps: {
          address: {},
          onAddressChange: vi.fn(),
          onCepLookup: vi.fn(),
          loadingCep: false,
          errors: {},
          paymentMethod: 'delivery',
          isProcessing: false,
          onSubmit: vi.fn(),
          onBack: vi.fn(),
        },
        doneStepProps: {
          orderNumber: 9,
          tableInfo: { id: 'table-1', number: '7' },
          publicOrderStatus: {
            id: 'order-9',
            order_number: 9,
            status: 'cancelled',
            payment_status: 'refunded',
            cancelled_reason: 'Cliente desistiu',
            created_at: '2026-03-21T00:00:00.000Z',
            updated_at: '2026-03-21T00:00:00.000Z',
          },
          orderSteps: [],
          getStepState: () => 'upcoming',
          cancelOrderLoading: false,
          onCancelOrder: vi.fn(),
          onClose: vi.fn(),
        },
      })
    )

    const openMarkup = renderToStaticMarkup(
      React.createElement(MenuCheckoutDrawer, {
        open: true,
        title: 'Pedido realizado!',
        checkoutStep: 'done',
        onClose: vi.fn(),
        onStepChange: vi.fn(),
        cartStepProps: {
          cart: [],
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          onIncrement: vi.fn(),
          onDecrement: vi.fn(),
          onRemove: vi.fn(),
          onContinue: vi.fn(),
          onClear: vi.fn(),
        },
        infoStepProps: {
          tableInfo: null,
          phone: '',
          onPhoneChange: vi.fn(),
          phoneVerified: false,
          onPhoneLookup: vi.fn(),
          lookingUpPhone: false,
          errors: {},
          isPaidPlan: false,
          existingCustomer: null,
          isNewCustomer: false,
          customerName: '',
          onCustomerNameChange: vi.fn(),
          customerCpf: '',
          onCustomerCpfChange: vi.fn(),
          paymentOptions: [{ value: 'delivery', label: 'Entrega' }],
          paymentMethod: 'delivery',
          onPaymentMethodChange: vi.fn(),
          notes: '',
          onNotesChange: vi.fn(),
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          isProcessing: false,
          onContinue: vi.fn(),
          onBack: vi.fn(),
        },
        addressStepProps: {
          address: {},
          onAddressChange: vi.fn(),
          onCepLookup: vi.fn(),
          loadingCep: false,
          errors: {},
          paymentMethod: 'delivery',
          isProcessing: false,
          onSubmit: vi.fn(),
          onBack: vi.fn(),
        },
        doneStepProps: {
          orderNumber: 9,
          tableInfo: { id: 'table-1', number: '7' },
          publicOrderStatus: {
            id: 'order-9',
            order_number: 9,
            status: 'cancelled',
            payment_status: 'refunded',
            cancelled_reason: 'Cliente desistiu',
            created_at: '2026-03-21T00:00:00.000Z',
            updated_at: '2026-03-21T00:00:00.000Z',
          },
          orderSteps: [],
          getStepState: () => 'upcoming',
          cancelOrderLoading: false,
          onCancelOrder: vi.fn(),
          onClose: vi.fn(),
        },
      })
    )

    expect(closedMarkup).toBe('')
    expect(openMarkup).toContain('Pedido realizado!')
    expect(openMarkup).toContain('Pedido cancelado')
    expect(openMarkup).toContain('Mesa 7')
  })

  it('renderiza os steps de dados e endereço no drawer', async () => {
    const { MenuCheckoutDrawer } = await import('@/features/menu/MenuCheckoutDrawer')

    const infoMarkup = renderToStaticMarkup(
      React.createElement(MenuCheckoutDrawer, {
        open: true,
        title: 'Seus dados',
        checkoutStep: 'info',
        onClose: vi.fn(),
        onStepChange: vi.fn(),
        cartStepProps: {
          cart: [],
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          onIncrement: vi.fn(),
          onDecrement: vi.fn(),
          onRemove: vi.fn(),
          onContinue: vi.fn(),
          onClear: vi.fn(),
        },
        infoStepProps: {
          tableInfo: { id: 'table-1', number: '12' },
          phone: '(11) 99999-9999',
          onPhoneChange: vi.fn(),
          phoneVerified: true,
          onPhoneLookup: vi.fn(),
          lookingUpPhone: false,
          errors: {},
          isPaidPlan: true,
          existingCustomer: { id: 'cust-1', name: 'Maria', phone: '11999999999' },
          isNewCustomer: false,
          customerName: 'Maria',
          onCustomerNameChange: vi.fn(),
          customerCpf: '123.456.789-09',
          onCustomerCpfChange: vi.fn(),
          paymentOptions: [{ value: 'online', label: 'Online' }],
          paymentMethod: 'online',
          onPaymentMethodChange: vi.fn(),
          notes: '',
          onNotesChange: vi.fn(),
          cartTotal: 30,
          deliveryFee: 0,
          orderTotal: 30,
          isProcessing: false,
          onContinue: vi.fn(),
          onBack: vi.fn(),
        },
        addressStepProps: {
          address: {},
          onAddressChange: vi.fn(),
          onCepLookup: vi.fn(),
          loadingCep: false,
          errors: {},
          paymentMethod: 'online',
          isProcessing: false,
          onSubmit: vi.fn(),
          onBack: vi.fn(),
        },
        doneStepProps: {
          orderNumber: null,
          tableInfo: null,
          publicOrderStatus: null,
          orderSteps: [],
          getStepState: () => 'upcoming',
          cancelOrderLoading: false,
          onCancelOrder: vi.fn(),
          onClose: vi.fn(),
        },
      })
    )

    const addressMarkup = renderToStaticMarkup(
      React.createElement(MenuCheckoutDrawer, {
        open: true,
        title: 'Endereço de entrega',
        checkoutStep: 'address',
        onClose: vi.fn(),
        onStepChange: vi.fn(),
        cartStepProps: {
          cart: [],
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          onIncrement: vi.fn(),
          onDecrement: vi.fn(),
          onRemove: vi.fn(),
          onContinue: vi.fn(),
          onClear: vi.fn(),
        },
        infoStepProps: {
          tableInfo: null,
          phone: '',
          onPhoneChange: vi.fn(),
          phoneVerified: false,
          onPhoneLookup: vi.fn(),
          lookingUpPhone: false,
          errors: {},
          isPaidPlan: false,
          existingCustomer: null,
          isNewCustomer: false,
          customerName: '',
          onCustomerNameChange: vi.fn(),
          customerCpf: '',
          onCustomerCpfChange: vi.fn(),
          paymentOptions: [{ value: 'delivery', label: 'Entrega' }],
          paymentMethod: 'delivery',
          onPaymentMethodChange: vi.fn(),
          notes: '',
          onNotesChange: vi.fn(),
          cartTotal: 0,
          deliveryFee: 0,
          orderTotal: 0,
          isProcessing: false,
          onContinue: vi.fn(),
          onBack: vi.fn(),
        },
        addressStepProps: {
          address: {
            zip_code: '01001000',
            street: 'Praça da Sé',
            number: '100',
            city: 'São Paulo',
            state: 'SP',
          },
          onAddressChange: vi.fn(),
          onCepLookup: vi.fn(),
          loadingCep: false,
          errors: {},
          paymentMethod: 'online',
          isProcessing: false,
          onSubmit: vi.fn(),
          onBack: vi.fn(),
        },
        doneStepProps: {
          orderNumber: null,
          tableInfo: null,
          publicOrderStatus: null,
          orderSteps: [],
          getStepState: () => 'upcoming',
          cancelOrderLoading: false,
          onCancelOrder: vi.fn(),
          onClose: vi.fn(),
        },
      })
    )

    expect(infoMarkup).toContain('Mesa 12')
    expect(infoMarkup).toContain('Forma de pagamento')
    expect(addressMarkup).toContain('Praça da Sé')
    expect(addressMarkup).toContain('Ir para pagamento')
  })

  it('renderiza estado vazio do cardápio', async () => {
    const { MenuEmptyState } = await import('@/features/menu/MenuEmptyState')

    const markup = renderToStaticMarkup(React.createElement(MenuEmptyState))

    expect(markup).toContain('Cardápio em breve.')
  })

  it('renderiza header e filtros do dashboard do cardápio', async () => {
    const { MenuDashboardHeader } = await import('@/features/menu/MenuDashboardHeader')
    const { MenuDashboardFilters } = await import('@/features/menu/MenuDashboardFilters')

    const headerMarkup = renderToStaticMarkup(
      React.createElement(MenuDashboardHeader, {
        availableCount: 12,
        inactiveCount: 2,
        limitLabel: '12/20 no plano',
        menuItemLimitReached: false,
        onCreate: vi.fn(),
      })
    )

    const filtersMarkup = renderToStaticMarkup(
      React.createElement(MenuDashboardFilters, {
        categoryFilter: 'cat-1',
        onCategoryFilterChange: vi.fn(),
        categories: [
          { id: 'cat-1', name: 'Pizzas' },
          { id: 'cat-2', name: 'Bebidas' },
        ],
        statusFilter: 'available',
        onStatusFilterChange: vi.fn(),
      })
    )

    expect(headerMarkup).toContain('Cardápio')
    expect(headerMarkup).toContain('12 itens disponíveis')
    expect(headerMarkup).toContain('12/20 no plano')
    expect(filtersMarkup).toContain('Todas as categorias')
    expect(filtersMarkup).toContain('Pizzas')
    expect(filtersMarkup).toContain('Somente disponíveis')
  })

  it('renderiza singular de inativo e omite limite no header do dashboard do cardápio', async () => {
    const { MenuDashboardHeader } = await import('@/features/menu/MenuDashboardHeader')

    const elements = flattenElements(
      React.createElement(MenuDashboardHeader, {
        availableCount: 3,
        inactiveCount: 1,
        limitLabel: '',
        menuItemLimitReached: true,
        onCreate: vi.fn(),
      })
    )

    expect(getTextContent(elements)).toContain('3 itens disponíveis · 1 inativo')
    expect(getTextContent(elements)).not.toContain('no plano')

    const createButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element.props.children).includes('Novo item')
    )

    expect(createButton?.props.disabled).toBe(true)
  })

  it('renderiza estado vazio e tabela do dashboard do cardápio', async () => {
    const { MenuDashboardEmptyState } = await import('@/features/menu/MenuDashboardEmptyState')
    const { MenuDashboardTable } = await import('@/features/menu/MenuDashboardTable')

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(MenuDashboardEmptyState, {
        menuItemLimitReached: false,
        onCreate: vi.fn(),
      })
    )

    const tableMarkup = renderToStaticMarkup(
      React.createElement(MenuDashboardTable, {
        items: [
          {
            id: 'menu-1',
            name: 'Pizza Margherita',
            description: 'Clássica',
            price: 32,
            available: true,
            category: { id: 'cat-1', name: 'Pizzas' },
          },
          {
            id: 'menu-2',
            name: 'Suco',
            description: null,
            price: 8,
            available: false,
            category: null,
          },
        ] as never,
        deletingId: null,
        onEdit: vi.fn(),
        onToggleAvailable: vi.fn(),
      })
    )

    expect(emptyMarkup).toContain('Nenhum item encontrado para os filtros atuais.')
    expect(emptyMarkup).toContain('Adicionar primeiro item')
    expect(tableMarkup).toContain('Pizza Margherita')
    expect(tableMarkup).toContain('Disponível')
    expect(tableMarkup).toContain('Reativar')
  })

  it('renderiza header e estado vazio do dashboard de comandas', async () => {
    const { TabsDashboardHeader } = await import('@/features/tabs/TabsDashboardHeader')
    const { TabsDashboardEmptyState } = await import('@/features/tabs/TabsDashboardEmptyState')

    const headerMarkup = renderToStaticMarkup(
      React.createElement(TabsDashboardHeader, {
        openCount: 3,
        closedCount: 1,
        onCreate: vi.fn(),
      })
    )

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(TabsDashboardEmptyState, {
        onCreate: vi.fn(),
      })
    )

    expect(headerMarkup).toContain('Comandas')
    expect(headerMarkup).toContain('3 abertas')
    expect(headerMarkup).toContain('Nova comanda')
    expect(emptyMarkup).toContain('Nenhuma comanda avulsa aberta no momento.')
    expect(emptyMarkup).toContain('Criar primeira comanda')
  })

  it('renderiza singular no header do dashboard de comandas', async () => {
    const { TabsDashboardHeader } = await import('@/features/tabs/TabsDashboardHeader')

    const headerMarkup = renderToStaticMarkup(
      React.createElement(TabsDashboardHeader, {
        openCount: 1,
        closedCount: 1,
        onCreate: vi.fn(),
      })
    )

    expect(headerMarkup).toContain('1 aberta')
    expect(headerMarkup).toContain('1 fechada')
  })

  it('renderiza singular de aberta com plural de fechadas no header de comandas', async () => {
    const { TabsDashboardHeader } = await import('@/features/tabs/TabsDashboardHeader')

    const headerMarkup = renderToStaticMarkup(
      React.createElement(TabsDashboardHeader, {
        openCount: 1,
        closedCount: 2,
        onCreate: vi.fn(),
      }),
    )

    expect(headerMarkup).toContain('1 aberta')
    expect(headerMarkup).toContain('2 fechadas')
  })

  it('renderiza singular e omite limite no header do dashboard de mesas', async () => {
    const { TablesDashboardHeader } = await import('@/features/tables/TablesDashboardHeader')

    const elements = flattenElements(
      React.createElement(TablesDashboardHeader, {
        occupied: 1,
        available: 1,
        tableCount: 4,
        maxTables: undefined,
        tableLimitReached: true,
        onCreate: vi.fn(),
      }),
    )

    expect(getTextContent(elements)).toContain('1 ocupada · 1 livre')
    expect(getTextContent(elements)).not.toContain('mesas')

    const createButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element.props.children).includes('Nova mesa'),
    )

    expect(createButton?.props.disabled).toBe(true)
  })

  it('renderiza diálogo de detalhes e diálogo de nova comanda', async () => {
    const { TabDetailsDialog } = await import('@/features/tabs/TabDetailsDialog')
    const { NewTabDialog } = await import('@/features/tabs/NewTabDialog')

    const detailsMarkup = renderToStaticMarkup(
      React.createElement(TabDetailsDialog, {
        selectedTab: {
          id: 'tab-1',
          label: 'C-10',
          status: 'open',
          notes: 'Mesa da janela',
          total: 12,
          created_at: '2026-03-21T00:00:00.000Z',
          orders: [
            {
              id: 'order-1',
              status: 'pending',
              total: 32,
              payment_status: 'paid',
            },
          ],
        } as never,
        onOpenChange: vi.fn(),
        onCloseTab: vi.fn(),
      })
    )

    const newTabMarkup = renderToStaticMarkup(
      React.createElement(NewTabDialog, {
        open: true,
        newTabLabel: 'Balcao 3',
        newTabNotes: 'Cliente VIP',
        formError: 'Erro ao criar',
        isCreating: true,
        onOpenChange: vi.fn(),
        onLabelChange: vi.fn(),
        onNotesChange: vi.fn(),
        onSubmit: vi.fn(),
      })
    )

    expect(detailsMarkup).toContain('Comanda C-10')
    expect(detailsMarkup).toContain('Mesa da janela')
    expect(detailsMarkup).toContain('Pagamento: paid')
    expect(detailsMarkup).toContain('Fechar comanda')
    expect(newTabMarkup).toContain('Nova comanda')
    expect(newTabMarkup).toContain('Balcao 3')
    expect(newTabMarkup).toContain('Cliente VIP')
    expect(newTabMarkup).toContain('Erro ao criar')
    expect(newTabMarkup).toContain('Criando...')
  })

  it('renderiza estados alternativos do diálogo de detalhes da comanda', async () => {
    const { TabDetailsDialog } = await import('@/features/tabs/TabDetailsDialog')

    const closedDetailsMarkup = renderToStaticMarkup(
      React.createElement(TabDetailsDialog, {
        selectedTab: {
          id: 'tab-2',
          label: 'C-11',
          status: 'closed',
          notes: null,
          total: 18,
          created_at: '2026-03-21T00:00:00.000Z',
          closed_at: '2026-03-21T01:00:00.000Z',
          orders: [],
        } as never,
        onOpenChange: vi.fn(),
        onCloseTab: vi.fn(),
      })
    )

    const nullMarkup = renderToStaticMarkup(
      React.createElement(TabDetailsDialog, {
        selectedTab: null,
        onOpenChange: vi.fn(),
        onCloseTab: vi.fn(),
      })
    )

    expect(closedDetailsMarkup).toContain('Fechada')
    expect(closedDetailsMarkup).toContain('Fechada em')
    expect(closedDetailsMarkup).toContain('Nenhum pedido vinculado a esta comanda.')
    expect(closedDetailsMarkup).not.toContain('Fechar comanda')
    expect(nullMarkup).toBe('')
  })

  it('aciona ações dos diálogos de comanda', async () => {
    const { TabDetailsDialog } = await import('@/features/tabs/TabDetailsDialog')
    const { NewTabDialog } = await import('@/features/tabs/NewTabDialog')

    const onOpenChange = vi.fn()
    const onCloseTab = vi.fn()
    const onLabelChange = vi.fn()
    const onNotesChange = vi.fn()
    const onSubmit = vi.fn()

    const detailsElements = flattenElements(
      React.createElement(TabDetailsDialog, {
        selectedTab: {
          id: 'tab-1',
          label: 'C-10',
          status: 'open',
          notes: null,
          total: 10,
          created_at: '2026-03-21T00:00:00.000Z',
          orders: [],
        } as never,
        onOpenChange,
        onCloseTab,
      })
    )

    const newTabElements = flattenElements(
      React.createElement(NewTabDialog, {
        open: true,
        newTabLabel: '',
        newTabNotes: '',
        formError: '',
        isCreating: false,
        onOpenChange,
        onLabelChange,
        onNotesChange,
        onSubmit,
      })
    )

    const detailButtons = detailsElements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )
    const newTabInputs = newTabElements.filter((element) => element.type === 'input')
    const newTabTextarea = newTabElements.find((element) => element.type === 'textarea')
    const newTabButtons = newTabElements.filter(
      (element) => element.type === 'button' && typeof element.props.onClick === 'function'
    )

    await detailButtons[0].props.onClick()
    newTabInputs[0].props.onChange({ target: { value: 'C-11' } })
    newTabTextarea?.props.onChange({ target: { value: 'Sem taxa' } })
    newTabButtons[0].props.onClick()
    newTabButtons[1].props.onClick()

    expect(onCloseTab).toHaveBeenCalledWith(expect.objectContaining({ id: 'tab-1' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onLabelChange).toHaveBeenCalledWith('C-11')
    expect(onNotesChange).toHaveBeenCalledWith('Sem taxa')
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('renderiza grade do dashboard de comandas com totais e ações', async () => {
    const { TabsDashboardGrid } = await import('@/features/tabs/TabsDashboardGrid')

    const markup = renderToStaticMarkup(
      React.createElement(TabsDashboardGrid, {
        tabs: [
          {
            id: 'tab-1',
            label: 'C-10',
            status: 'open',
            created_at: '2026-03-21T12:00:00.000Z',
            notes: 'Mesa da janela',
            total: 0,
            orders: [
              { id: 'order-1', total: 42, status: 'confirmed' },
            ],
          },
          {
            id: 'tab-2',
            label: 'C-11',
            status: 'closed',
            created_at: '2026-03-21T12:05:00.000Z',
            total: 18,
            orders: [],
          },
        ] as never,
        closeTabPending: false,
        onSelect: vi.fn(),
        onClose: vi.fn(),
      })
    )

    expect(markup).toContain('C-10')
    expect(markup).toContain('Aberta')
    expect(markup).toContain('Fechar comanda')
    expect(markup).toContain('Mesa da janela')
    expect(markup).toContain('R$ 42.00')
    expect(markup).toContain('C-11')
    expect(markup).toContain('Fechada')
  })

  it('renderiza fallback de pedidos indefinidos e botão de fechar desabilitado na grade de comandas', async () => {
    const { TabsDashboardGrid } = await import('@/features/tabs/TabsDashboardGrid')

    const elements = flattenElements(
      React.createElement(TabsDashboardGrid, {
        tabs: [
          {
            id: 'tab-3',
            label: 'C-12',
            status: 'open',
            created_at: '2026-03-21T12:10:00.000Z',
            notes: null,
            total: 0,
            orders: undefined,
          },
        ] as never,
        closeTabPending: true,
        onSelect: vi.fn(),
        onClose: vi.fn(),
      })
    )

    expect(getTextContent(elements)).toContain('C-12')
    expect(getTextContent(elements)).toContain('0 pedidos')

    const closeButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element.props.children) === 'Fechar comanda'
    )

    expect(closeButton?.props.disabled).toBe(true)
  })

  it('renderiza lista de pedidos em loading, vazio e com paginação', async () => {
    const { OrdersListSection } = await import('@/features/orders/OrdersListSection')

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(OrdersListSection, {
        isLoading: true,
        orders: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        onPageChange: vi.fn(),
        deliveryDrivers: [],
        hasWhatsappNotifications: false,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(OrdersListSection, {
        isLoading: false,
        orders: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        onPageChange: vi.fn(),
        deliveryDrivers: [],
        hasWhatsappNotifications: false,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    const listMarkup = renderToStaticMarkup(
      React.createElement(OrdersListSection, {
        isLoading: false,
        orders: [
          {
            id: 'order-1',
            order_number: 42,
            status: 'confirmed',
            payment_method: 'delivery',
            payment_status: 'paid',
            subtotal: 32,
            delivery_fee: 8,
            total: 40,
            created_at: '2026-03-21T12:00:00.000Z',
            customer_name: 'Maria',
            customer_phone: '11999999999',
            customer_cpf: null,
            table_number: null,
            tab: null,
            delivery_address: { street: 'Rua A' },
            delivery_status: 'assigned',
            delivery_driver: { id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true },
            delivery_driver_id: 'driver-1',
            notes: null,
            notifications: [],
            items: [{ id: 'item-1', name: 'Pizza', quantity: 1, notes: null, extras: [] }],
          },
        ] as never,
        totalCount: 21,
        page: 2,
        pageSize: 10,
        onPageChange: vi.fn(),
        deliveryDrivers: [{ id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true }],
        hasWhatsappNotifications: false,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(loadingMarkup).toContain('Carregando...')
    expect(emptyMarkup).toContain('Nenhum pedido encontrado')
    expect(listMarkup).toContain('#42')
    expect(listMarkup).toContain('Maria')
    expect(listMarkup).toContain('R$ 40.00')
  })

  it('renderiza grade de comandas fechadas sem botão de fechar e com total salvo', async () => {
    const { TabsDashboardGrid } = await import('@/features/tabs/TabsDashboardGrid')

    const markup = renderToStaticMarkup(
      React.createElement(TabsDashboardGrid, {
        tabs: [
          {
            id: 'tab-3',
            tenant_id: 'tenant-1',
            label: 'C-20',
            status: 'closed',
            notes: null,
            opened_by: null,
            closed_by: null,
            total: 33,
            created_at: '2026-03-21T13:00:00.000Z',
            closed_at: '2026-03-21T14:00:00.000Z',
            orders: [],
          },
        ],
        closeTabPending: true,
        onSelect: vi.fn(),
        onClose: vi.fn(),
      })
    )

    expect(markup).toContain('C-20')
    expect(markup).toContain('Fechada')
    expect(markup).toContain('R$ 33.00')
    expect(markup).toContain('0 pedidos')
    expect(markup).toContain('Ver detalhes')
    expect(markup).not.toContain('Fechar comanda')
  })

  it('renderiza header, filtros e vazio do dashboard de pedidos', async () => {
    const { OrdersDashboardHeader } = await import('@/features/orders/OrdersDashboardHeader')
    const { OrdersFilters } = await import('@/features/orders/OrdersFilters')
    const { OrdersEmptyState } = await import('@/features/orders/OrdersEmptyState')

    const headerMarkup = renderToStaticMarkup(
      React.createElement(OrdersDashboardHeader, {
        onCreate: vi.fn(),
      })
    )

    const filtersMarkup = renderToStaticMarkup(
      React.createElement(OrdersFilters, {
        filters: [
          { label: 'Todos', value: '' },
          { label: 'Aguardando', value: 'pending' },
        ],
        statusFilter: 'pending',
        onChange: vi.fn(),
      })
    )

    const emptyMarkup = renderToStaticMarkup(React.createElement(OrdersEmptyState))

    expect(headerMarkup).toContain('Pedidos')
    expect(headerMarkup).toContain('Novo pedido')
    expect(filtersMarkup).toContain('Todos')
    expect(filtersMarkup).toContain('Aguardando')
    expect(emptyMarkup).toContain('Nenhum pedido encontrado.')
  })

  it('renderiza card de pedido com entrega, whatsapp e ações sem cobrança manual por MP', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const markup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-1',
          order_number: 42,
          customer_name: 'Maria',
          customer_phone: '11999999999',
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          status: 'ready',
          payment_method: 'delivery',
          payment_status: 'pending',
          delivery_status: 'waiting_dispatch',
          delivery_driver_id: 'driver-1',
          delivery_driver: {
            id: 'driver-1',
            name: 'João',
            phone: null,
            vehicle_type: 'moto',
            active: true,
          },
          subtotal: 40,
          delivery_fee: 8,
          total: 48,
          notes: 'Sem cebola',
          cancelled_reason: null,
          delivery_address: {
            street: 'Rua A',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01000-000',
          },
          created_at: '2026-03-21T12:00:00.000Z',
          updated_at: '2026-03-21T12:00:00.000Z',
          items: [
            {
              id: 'item-1',
              order_id: 'order-1',
              menu_item_id: 'menu-1',
              name: 'Pizza',
              price: 40,
              quantity: 1,
              notes: 'Sem cebola',
              extras: [{ id: 'extra-1', order_item_id: 'item-1', name: 'Borda', price: 5 }],
            },
          ],
          notifications: [
            {
              id: 'notif-1',
              channel: 'whatsapp',
              event_key: 'order_ready',
              status: 'sent',
              recipient: '11999999999',
              created_at: '2026-03-21T12:05:00.000Z',
            },
          ],
          tab: null,
        } as never,
        config: { label: 'Pronto', color: 'bg-green-100 text-green-800', nextLabel: 'Entregar' },
        deliveryDrivers: [{ id: 'driver-1', name: 'João', vehicle_type: 'moto', active: true }],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(markup).toContain('#42')
    expect(markup).toContain('Maria')
    expect(markup).toContain('Endereço de entrega')
    expect(markup).toContain('WhatsApp')
    expect(markup).toContain('Saiu para entrega')
    expect(markup).not.toContain('Cobrar com MP')
    expect(markup).toContain('Cancelar')
  })

  it('renderiza card de pedido entregue com confirmacao de pagamento e sem whatsapp', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const markup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-2',
          tenant_id: 'tenant-1',
          order_number: 77,
          customer_name: null,
          customer_phone: null,
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          tab: { id: 'tab-1', label: 'C-15', status: 'open' },
          status: 'delivered',
          payment_method: 'counter',
          payment_status: 'pending',
          subtotal: 25,
          total: 25,
          notes: null,
          cancelled_reason: null,
          delivery_address: null,
          created_at: '2026-03-21T13:20:00.000Z',
          updated_at: '2026-03-21T13:20:00.000Z',
          items: [
            {
              id: 'item-2',
              order_id: 'order-2',
              menu_item_id: 'menu-2',
              name: 'Suco',
              price: 25,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: [],
        } as never,
        config: { label: 'Entregue', color: 'bg-slate-100 text-slate-600' },
        deliveryDrivers: [],
        hasWhatsappNotifications: false,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(markup).toContain('#77')
    expect(markup).toContain('Comanda:')
    expect(markup).toContain('C-15')
    expect(markup).toContain('No caixa')
    expect(markup).toContain('Confirmar pagamento')
    expect(markup).not.toContain('WhatsApp')
    expect(markup).not.toContain('Cancelar')
  })

  it('renderiza card de pedido com whatsapp falho, historico e cobranca em andamento', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const markup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-3',
          tenant_id: 'tenant-1',
          order_number: 120,
          customer_name: 'Ana',
          customer_phone: '11911112222',
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          tab: null,
          status: 'confirmed',
          payment_method: 'online',
          payment_status: 'pending',
          subtotal: 32,
          total: 32,
          notes: null,
          cancelled_reason: null,
          delivery_address: null,
          created_at: '2026-03-21T15:00:00.000Z',
          updated_at: '2026-03-21T15:00:00.000Z',
          items: [
            {
              id: 'item-3',
              order_id: 'order-3',
              menu_item_id: 'menu-3',
              name: 'Lasanha',
              price: 32,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: [
            {
              id: 'notif-2',
              channel: 'whatsapp',
              event_key: 'order_confirmed',
              status: 'failed',
              recipient: '11911112222',
              error_message: 'Número inválido',
              created_at: '2026-03-21T15:10:00.000Z',
            },
            {
              id: 'notif-1',
              channel: 'whatsapp',
              event_key: 'order_received',
              status: 'sent',
              recipient: '11911112222',
              created_at: '2026-03-21T15:05:00.000Z',
            },
          ],
        } as never,
        config: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', nextLabel: 'Iniciar preparo' },
        deliveryDrivers: [],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: 'order-3',
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(markup).toContain('WhatsApp')
    expect(markup).toContain('Falhou')
    expect(markup).toContain('Motivo: Número inválido')
    expect(markup).toContain('Pedido recebido')
    expect(markup).toContain('Iniciar preparo')
  })

  it('renderiza fallback de whatsapp ignorado e eventos desconhecidos', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const markup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-3b',
          tenant_id: 'tenant-1',
          order_number: 121,
          customer_name: 'Ana',
          customer_phone: '11911112222',
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          tab: null,
          status: 'confirmed',
          payment_method: 'online',
          payment_status: 'pending',
          subtotal: 32,
          total: 32,
          notes: null,
          cancelled_reason: null,
          delivery_address: null,
          created_at: '2026-03-21T15:00:00.000Z',
          updated_at: '2026-03-21T15:00:00.000Z',
          items: [
            {
              id: 'item-3b',
              order_id: 'order-3b',
              menu_item_id: 'menu-3',
              name: 'Lasanha',
              price: 32,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: [
            {
              id: 'notif-3',
              channel: 'whatsapp',
              event_key: 'custom_event',
              status: 'ignored',
              recipient: null,
              created_at: '2026-03-21T15:10:00.000Z',
            },
            {
              id: 'notif-2',
              channel: 'whatsapp',
              event_key: 'another_custom_event',
              status: 'ignored',
              recipient: null,
              created_at: '2026-03-21T15:08:00.000Z',
            },
          ],
        } as never,
        config: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', nextLabel: 'Iniciar preparo' },
        deliveryDrivers: [],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(markup).toContain('WhatsApp')
    expect(markup).toContain('Ignorado')
    expect(markup).toContain('custom_event')
    expect(markup).toContain('another_custom_event')
    expect(markup).toContain('ignorado')
    expect(markup).not.toContain(' · 119')
  })

  it('renderiza complemento, fallback de entrega e motorista inativo já atribuído', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const markup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-3c',
          tenant_id: 'tenant-1',
          order_number: 122,
          customer_name: 'Carla',
          customer_phone: '11977776666',
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          tab: null,
          status: 'confirmed',
          payment_method: 'delivery',
          payment_status: 'pending',
          delivery_status: null,
          delivery_driver_id: 'driver-inactive',
          delivery_driver: null,
          subtotal: 44,
          delivery_fee: 9,
          total: 53,
          notes: null,
          cancelled_reason: null,
          delivery_address: {
            street: 'Rua C',
            number: '789',
            complement: 'Apto 12',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '03000-000',
          },
          created_at: '2026-03-21T17:00:00.000Z',
          updated_at: '2026-03-21T17:00:00.000Z',
          items: [
            {
              id: 'item-3c',
              order_id: 'order-3c',
              menu_item_id: 'menu-3c',
              name: 'Parmegiana',
              price: 44,
              quantity: 1,
              notes: null,
              extras: [],
            },
          ],
          notifications: [
            {
              id: 'notif-4',
              channel: 'whatsapp',
              event_key: 'order_confirmed',
              status: 'sent',
              recipient: '11977776666',
              created_at: '2026-03-21T17:10:00.000Z',
            },
            {
              id: 'notif-5',
              channel: 'whatsapp',
              event_key: 'order_ready',
              status: 'failed',
              recipient: '11977776666',
              created_at: '2026-03-21T17:05:00.000Z',
            },
          ],
        } as never,
        config: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', nextLabel: 'Iniciar preparo' },
        deliveryDrivers: [
          { id: 'driver-active', name: 'Marina', vehicle_type: 'moto', active: true },
          { id: 'driver-inactive', name: 'Carlos', vehicle_type: 'carro', active: false },
        ],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(markup).toContain('Rua C, 789 - Apto 12')
    expect(markup).toContain('Aguardando atribuição')
    expect(markup).toContain('Aguardando despacho')
    expect(markup).toContain('Carlos · carro')
    expect(markup).toContain('Pedido pronto · falhou')
  })

  it('renderiza cliente com mesa ou comanda e endereco sem linha principal', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const tableMarkup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-3d',
          tenant_id: 'tenant-1',
          order_number: 123,
          customer_name: 'Bruno',
          customer_phone: null,
          customer_cpf: null,
          customer_id: null,
          table_number: '9',
          tab: null,
          status: 'pending',
          payment_method: 'table',
          payment_status: 'pending',
          subtotal: 20,
          total: 20,
          notes: null,
          cancelled_reason: null,
          delivery_address: null,
          created_at: '2026-03-21T18:00:00.000Z',
          updated_at: '2026-03-21T18:00:00.000Z',
          items: [
            {
              id: 'item-3d',
              order_id: 'order-3d',
              menu_item_id: 'menu-3d',
              name: 'Calzone',
              price: 20,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: undefined,
        } as never,
        config: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800', nextLabel: 'Confirmar' },
        deliveryDrivers: [],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    const tabMarkup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-3e',
          tenant_id: 'tenant-1',
          order_number: 124,
          customer_name: 'Bianca',
          customer_phone: null,
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          tab: { id: 'tab-3', label: 'C-99', status: 'open' },
          status: 'confirmed',
          payment_method: 'delivery',
          payment_status: 'paid',
          delivery_status: 'assigned',
          delivery_driver_id: null,
          delivery_driver: null,
          subtotal: 31,
          delivery_fee: 0,
          total: 31,
          notes: null,
          cancelled_reason: null,
          delivery_address: {
            street: null,
            number: null,
            complement: null,
            neighborhood: null,
            city: 'São Paulo',
            state: 'SP',
            zip_code: null,
          },
          created_at: '2026-03-21T18:10:00.000Z',
          updated_at: '2026-03-21T18:10:00.000Z',
          items: [
            {
              id: 'item-3e',
              order_id: 'order-3e',
              menu_item_id: 'menu-3e',
              name: 'Risoto',
              price: 31,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: [],
        } as never,
        config: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', nextLabel: 'Iniciar preparo' },
        deliveryDrivers: [],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(tableMarkup).toContain('Cliente: <span class="font-medium">Bruno</span> — Mesa 9')
    expect(tableMarkup).not.toContain('WhatsApp')
    expect(tabMarkup).toContain('Cliente: <span class="font-medium">Bianca</span> — Comanda C-99')
    expect(tabMarkup).toContain('São Paulo - SP')
    expect(tabMarkup).not.toContain(', </p>')
    expect(tabMarkup).toContain('Aguardando atribuição')
    expect(tabMarkup).toContain('Entregador atribuído')
  })

  it('nao renderiza historico de whatsapp para pedidos locais mesmo com notificacoes', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const counterMarkup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-local-1',
          tenant_id: 'tenant-1',
          order_number: 125,
          customer_name: 'Paulo',
          customer_phone: '11988887777',
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          tab: null,
          status: 'confirmed',
          payment_method: 'counter',
          payment_status: 'pending',
          subtotal: 28,
          total: 28,
          notes: null,
          cancelled_reason: null,
          delivery_address: null,
          created_at: '2026-03-21T18:30:00.000Z',
          updated_at: '2026-03-21T18:30:00.000Z',
          items: [
            {
              id: 'item-local-1',
              order_id: 'order-local-1',
              menu_item_id: 'menu-local-1',
              name: 'Hambúrguer',
              price: 28,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: [
            {
              id: 'notif-local-1',
              channel: 'whatsapp',
              event_key: 'order_received',
              status: 'sent',
              recipient: '11988887777',
              created_at: '2026-03-21T18:31:00.000Z',
            },
          ],
        } as never,
        config: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', nextLabel: 'Iniciar preparo' },
        deliveryDrivers: [],
        hasWhatsappNotifications: true,
        updatePending: false,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    const tableMarkup = renderToStaticMarkup(
      React.createElement(OrderCard, {
        order: {
          id: 'order-local-2',
          tenant_id: 'tenant-1',
          order_number: 126,
          customer_name: 'Lara',
          customer_phone: '11977776655',
          customer_cpf: null,
          customer_id: null,
          table_number: '12',
          tab: null,
          status: 'pending',
          payment_method: 'table',
          payment_status: 'pending',
          subtotal: 22,
          total: 22,
          notes: null,
          cancelled_reason: null,
          delivery_address: null,
          created_at: '2026-03-21T18:40:00.000Z',
          updated_at: '2026-03-21T18:40:00.000Z',
          items: [
            {
              id: 'item-local-2',
              order_id: 'order-local-2',
              menu_item_id: 'menu-local-2',
              name: 'Suco natural',
              price: 22,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: [
            {
              id: 'notif-local-2',
              channel: 'whatsapp',
              event_key: 'order_received',
              status: 'sent',
              recipient: '11977776655',
              created_at: '2026-03-21T18:41:00.000Z',
            },
          ],
        } as never,
        config: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800', nextLabel: 'Confirmar' },
        deliveryDrivers: [],
        hasWhatsappNotifications: true,
        updatePending: false,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    expect(counterMarkup).not.toContain('WhatsApp')
    expect(counterMarkup).not.toContain('Pedido recebido')
    expect(tableMarkup).not.toContain('WhatsApp')
    expect(tableMarkup).not.toContain('Pedido recebido')
  })

  it('aciona handlers do card de pedido com entrega e pagamento pendente', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const onAssignDriver = vi.fn()
    const onAdvance = vi.fn()
    const onAdvanceDelivery = vi.fn()
    const onMercadoPagoCheckout = vi.fn()
    const onConfirmPayment = vi.fn()
    const onCancel = vi.fn()

    const order = {
      id: 'order-4',
      tenant_id: 'tenant-1',
      order_number: 88,
      customer_name: 'Paula',
      customer_phone: '11933334444',
      customer_cpf: null,
      customer_id: null,
      table_number: null,
      tab: null,
      status: 'ready',
      payment_method: 'delivery',
      payment_status: 'pending',
      subtotal: 35,
      delivery_fee: 6,
      total: 41,
      notes: null,
      cancelled_reason: null,
      delivery_status: 'waiting_dispatch',
      delivery_driver_id: 'driver-1',
      delivery_driver: {
        id: 'driver-1',
        name: 'João',
        phone: null,
        vehicle_type: 'bike',
        active: true,
      },
      delivery_address: {
        street: 'Rua B',
        number: '456',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '02000-000',
      },
      created_at: '2026-03-21T16:00:00.000Z',
      updated_at: '2026-03-21T16:00:00.000Z',
      items: [
        {
          id: 'item-4',
          order_id: 'order-4',
          menu_item_id: 'menu-4',
          name: 'Hambúrguer',
          price: 35,
          quantity: 1,
          notes: null,
          extras: [],
        },
      ],
      notifications: [],
    }

    const elements = flattenElements(
      React.createElement(OrderCard, {
        order: order as never,
        config: { label: 'Pronto', color: 'bg-green-100 text-green-800', nextLabel: 'Entregar' },
        deliveryDrivers: [
          { id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true },
          { id: 'driver-2', name: 'Maria', vehicle_type: 'moto', active: true },
        ],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver,
        onAdvance,
        onAdvanceDelivery,
        onMercadoPagoCheckout,
        onConfirmPayment,
        onCancel,
      })
    )

    const select = elements.find(
      (element) => element.type === 'select' && typeof element.props.onChange === 'function'
    )
    const deliveryButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Saiu para entrega'
    )
    const cancelButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Cancelar'
    )

    expect(select).toBeTruthy()
    expect(deliveryButton).toBeTruthy()
    expect(cancelButton).toBeTruthy()

    select!.props.onChange({ target: { value: 'driver-2' } })
    deliveryButton!.props.onClick()
    cancelButton!.props.onClick()

    expect(onAssignDriver).toHaveBeenCalledWith(order, 'driver-2')
    expect(onAdvance).not.toHaveBeenCalled()
    expect(onAdvanceDelivery).toHaveBeenCalledWith(order)
    expect(onCancel).toHaveBeenCalledWith(order)
    expect(onConfirmPayment).not.toHaveBeenCalled()
  })

  it('aciona confirmação de pagamento no card entregue pendente', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const onConfirmPayment = vi.fn()

    const elements = flattenElements(
      React.createElement(OrderCard, {
        order: {
          id: 'order-5',
          tenant_id: 'tenant-1',
          order_number: 99,
          customer_name: null,
          customer_phone: null,
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          tab: { id: 'tab-2', label: 'C-20', status: 'open' },
          status: 'delivered',
          payment_method: 'counter',
          payment_status: 'pending',
          subtotal: 18,
          total: 18,
          notes: null,
          cancelled_reason: null,
          delivery_address: null,
          created_at: '2026-03-21T18:00:00.000Z',
          updated_at: '2026-03-21T18:00:00.000Z',
          items: [
            {
              id: 'item-5',
              order_id: 'order-5',
              menu_item_id: 'menu-5',
              name: 'Refrigerante',
              price: 18,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: [],
        } as never,
        config: { label: 'Entregue', color: 'bg-slate-100 text-slate-600' },
        deliveryDrivers: [],
        hasWhatsappNotifications: false,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance: vi.fn(),
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment,
        onCancel: vi.fn(),
      })
    )

    const confirmButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Confirmar pagamento'
    )

    expect(confirmButton).toBeTruthy()

    confirmButton!.props.onClick()

    expect(onConfirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-5', order_number: 99 })
    )
  })

  it('aciona avanço normal do card quando não é fluxo de entrega pronta', async () => {
    const { OrderCard } = await import('@/features/orders/OrderCard')

    const onAdvance = vi.fn()

    const elements = flattenElements(
      React.createElement(OrderCard, {
        order: {
          id: 'order-6',
          tenant_id: 'tenant-1',
          order_number: 121,
          customer_name: 'Rita',
          customer_phone: '11988887777',
          customer_cpf: null,
          customer_id: null,
          table_number: null,
          tab: null,
          status: 'confirmed',
          payment_method: 'online',
          payment_status: 'paid',
          subtotal: 29,
          total: 29,
          notes: null,
          cancelled_reason: null,
          delivery_address: null,
          created_at: '2026-03-21T19:00:00.000Z',
          updated_at: '2026-03-21T19:00:00.000Z',
          items: [
            {
              id: 'item-6',
              order_id: 'order-6',
              menu_item_id: 'menu-6',
              name: 'Wrap',
              price: 29,
              quantity: 1,
              notes: null,
            },
          ],
          notifications: [],
        } as never,
        config: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', nextLabel: 'Iniciar preparo' },
        deliveryDrivers: [],
        hasWhatsappNotifications: false,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver: vi.fn(),
        onAdvance,
        onAdvanceDelivery: vi.fn(),
        onMercadoPagoCheckout: vi.fn(),
        onConfirmPayment: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    const advanceButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element) === 'Iniciar preparo'
    )

    expect(advanceButton).toBeTruthy()

    advanceButton!.props.onClick()

    expect(onAdvance).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-6', order_number: 121, status: 'confirmed' })
    )
  })

  it('renderiza header e vazio do dashboard de mesas', async () => {
    const { TablesDashboardHeader } = await import('@/features/tables/TablesDashboardHeader')
    const { TablesDashboardEmptyState } = await import('@/features/tables/TablesDashboardEmptyState')

    const headerMarkup = renderToStaticMarkup(
      React.createElement(TablesDashboardHeader, {
        occupied: 2,
        available: 5,
        tableCount: 7,
        maxTables: 10,
        tableLimitReached: false,
        onCreate: vi.fn(),
      })
    )

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(TablesDashboardEmptyState, {
        tableLimitReached: false,
        onCreate: vi.fn(),
      })
    )

    expect(headerMarkup).toContain('Mesas')
    expect(headerMarkup).toContain('2 ocupadas')
    expect(headerMarkup).toContain('7/10 mesas')
    expect(headerMarkup).toContain('Nova mesa')
    expect(emptyMarkup).toContain('Nenhuma mesa cadastrada.')
    expect(emptyMarkup).toContain('Cadastrar primeira mesa')
  })

  it('renderiza grade do dashboard de mesas com estados e ações', async () => {
    const { TablesDashboardGrid } = await import('@/features/tables/TablesDashboardGrid')

    const markup = renderToStaticMarkup(
      React.createElement(TablesDashboardGrid, {
        tables: [
          {
            id: 'table-1',
            number: '10',
            capacity: 4,
            status: 'available',
            active_session: null,
          },
          {
            id: 'table-2',
            number: '12',
            capacity: 6,
            status: 'occupied',
            active_session: {
              id: 'session-1',
              table_id: 'table-2',
              customer_count: 3,
              total: 54,
              opened_at: '2026-03-21T12:00:00.000Z',
              orders: [{ id: 'order-1' }],
            },
          },
        ] as never,
        onSelect: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onOpenSession: vi.fn(),
        onCopyQr: vi.fn(),
        onCloseSession: vi.fn(),
      })
    )

    expect(markup).toContain('10')
    expect(markup).toContain('Livre')
    expect(markup).toContain('Abrir comanda')
    expect(markup).toContain('Copiar link QR')
    expect(markup).toContain('12')
    expect(markup).toContain('Ocupada')
    expect(markup).toContain('1 pedido')
    expect(markup).toContain('Ver comanda')
    expect(markup).toContain('Fechar comanda')
  })

  it('renderiza plural de pedidos na sessão da mesa ocupada', async () => {
    const { TablesDashboardGrid } = await import('@/features/tables/TablesDashboardGrid')

    const markup = renderToStaticMarkup(
      React.createElement(TablesDashboardGrid, {
        tables: [
          {
            id: 'table-6',
            tenant_id: 'tenant-1',
            number: '14',
            capacity: 6,
            status: 'occupied',
            created_at: '2026-03-21T12:00:00.000Z',
            updated_at: '2026-03-21T12:00:00.000Z',
            active_session: {
              id: 'session-2',
              tenant_id: 'tenant-1',
              table_id: 'table-6',
              opened_by: null,
              closed_by: null,
              status: 'open',
              customer_count: 4,
              total: 80,
              opened_at: '2026-03-21T12:00:00.000Z',
              closed_at: null,
              orders: [{ id: 'order-1' }, { id: 'order-2' }],
            },
          },
        ] as never,
        onSelect: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onOpenSession: vi.fn(),
        onCopyQr: vi.fn(),
        onCloseSession: vi.fn(),
      }),
    )

    expect(markup).toContain('2 pedidos')
  })

  it('renderiza grade de mesas reservada e em manutencao sem acoes de comanda', async () => {
    const { TablesDashboardGrid } = await import('@/features/tables/TablesDashboardGrid')

    const markup = renderToStaticMarkup(
      React.createElement(TablesDashboardGrid, {
        tables: [
          {
            id: 'table-3',
            tenant_id: 'tenant-1',
            number: '20',
            capacity: 2,
            status: 'reserved',
            created_at: '2026-03-21T12:00:00.000Z',
            updated_at: '2026-03-21T12:00:00.000Z',
            active_session: null,
          },
          {
            id: 'table-4',
            tenant_id: 'tenant-1',
            number: '21',
            capacity: 8,
            status: 'maintenance',
            created_at: '2026-03-21T12:00:00.000Z',
            updated_at: '2026-03-21T12:00:00.000Z',
            active_session: null,
          },
        ],
        onSelect: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onOpenSession: vi.fn(),
        onCopyQr: vi.fn(),
        onCloseSession: vi.fn(),
      })
    )

    expect(markup).toContain('20')
    expect(markup).toContain('Reservada')
    expect(markup).toContain('21')
    expect(markup).toContain('Manutenção')
    expect(markup).not.toContain('Abrir comanda')
    expect(markup).not.toContain('Copiar link QR')
    expect(markup).not.toContain('Fechar comanda')
  })

  it('renderiza mesa ocupada sem sessao ativa sem acoes de comanda', async () => {
    const { TablesDashboardGrid } = await import('@/features/tables/TablesDashboardGrid')

    const markup = renderToStaticMarkup(
      React.createElement(TablesDashboardGrid, {
        tables: [
          {
            id: 'table-5',
            tenant_id: 'tenant-1',
            number: '30',
            capacity: 4,
            status: 'occupied',
            created_at: '2026-03-21T12:00:00.000Z',
            updated_at: '2026-03-21T12:00:00.000Z',
            active_session: null,
          },
        ],
        onSelect: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onOpenSession: vi.fn(),
        onCopyQr: vi.fn(),
        onCloseSession: vi.fn(),
      }),
    )

    expect(markup).toContain('30')
    expect(markup).toContain('Ocupada')
    expect(markup).not.toContain('Ver comanda')
    expect(markup).not.toContain('Fechar comanda')
    expect(markup).not.toContain('Abrir comanda')
  })

  it('dispara ações da grade de mesas para seleção, edição, QR e fechamento', async () => {
    const { TablesDashboardGrid } = await import('@/features/tables/TablesDashboardGrid')
    const onSelect = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const onOpenSession = vi.fn()
    const onCopyQr = vi.fn()
    const onCloseSession = vi.fn()

    const tree = TablesDashboardGrid({
      tables: [
        {
          id: 'table-1',
          tenant_id: 'tenant-1',
          number: '10',
          capacity: 4,
          status: 'available',
          created_at: '2026-03-21T12:00:00.000Z',
          updated_at: '2026-03-21T12:00:00.000Z',
          active_session: null,
        },
        {
          id: 'table-2',
          tenant_id: 'tenant-1',
          number: '12',
          capacity: 6,
          status: 'occupied',
          created_at: '2026-03-21T12:00:00.000Z',
          updated_at: '2026-03-21T12:00:00.000Z',
          active_session: {
            id: 'session-1',
            tenant_id: 'tenant-1',
            table_id: 'table-2',
            opened_by: null,
            closed_by: null,
            status: 'open',
            customer_count: 3,
            total: 54,
            opened_at: '2026-03-21T12:00:00.000Z',
            closed_at: null,
            orders: [{ id: 'order-1' }],
          },
        },
      ],
      onSelect,
      onEdit,
      onDelete,
      onOpenSession,
      onCopyQr,
      onCloseSession,
    })

    const elements = flattenElements(tree)
    const clickableCards = elements.filter(
      (element) =>
        element.type === 'div' &&
        typeof element.props.onClick === 'function' &&
        String(element.props.className ?? '').includes('cursor-pointer')
    )
    const buttons = elements.filter((element) => element.type === 'button')
    const stopPropagation = vi.fn()

    clickableCards[0]?.props.onClick()
    clickableCards[1]?.props.onClick()

    buttons.find((button) => getTextContent(button).includes('Abrir comanda'))?.props.onClick({ stopPropagation })
    buttons.find((button) => getTextContent(button).includes('Copiar link QR'))?.props.onClick({ stopPropagation })
    buttons.find((button) => getTextContent(button).includes('Ver comanda'))?.props.onClick({ stopPropagation })
    buttons.find((button) => getTextContent(button).includes('Fechar comanda'))?.props.onClick({ stopPropagation })
    buttons.find((button) => String(button.props.className ?? '').includes('hover:text-red-500'))?.props.onClick({ stopPropagation })
    buttons.find((button) => String(button.props.className ?? '').includes('hover:text-slate-700'))?.props.onClick({ stopPropagation })

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'table-1' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'table-2' }))
    expect(onOpenSession).toHaveBeenCalledWith(expect.objectContaining({ id: 'table-1' }))
    expect(onCopyQr).toHaveBeenCalledWith(expect.objectContaining({ id: 'table-1' }))
    expect(onCloseSession).toHaveBeenCalledWith(expect.objectContaining({ id: 'table-2' }))
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'table-1' }))
    expect(onEdit).toHaveBeenCalled()
    expect(stopPropagation).toHaveBeenCalled()
  })

  it('renderiza detalhes da mesa ocupada com pedidos e total', async () => {
    const { TableSessionDetailsDialog } = await import('@/features/tables/TableSessionDetailsDialog')
    const onCloseSession = vi.fn()
    const table = {
      id: 'table-1',
      tenant_id: 'tenant-1',
      number: '12',
      capacity: 4,
      status: 'occupied',
      created_at: '2026-03-21T12:00:00.000Z',
      updated_at: '2026-03-21T12:00:00.000Z',
      active_session: {
        id: 'session-1',
        tenant_id: 'tenant-1',
        table_id: 'table-1',
        opened_by: null,
        closed_by: null,
        status: 'open',
        customer_count: 2,
        total: 74,
        opened_at: '2026-03-21T12:30:00.000Z',
        closed_at: null,
        orders: [
          {
            id: 'order-1',
            tenant_id: 'tenant-1',
            order_number: 88,
            customer_name: null,
            customer_phone: null,
            customer_cpf: null,
            customer_id: null,
            table_number: '12',
            status: 'confirmed',
            payment_method: 'table',
            payment_status: 'pending',
            subtotal: 74,
            total: 74,
            notes: null,
            cancelled_reason: null,
            delivery_address: null,
            created_at: '2026-03-21T12:31:00.000Z',
            updated_at: '2026-03-21T12:31:00.000Z',
            items: [
              {
                id: 'item-1',
                order_id: 'order-1',
                menu_item_id: null,
                name: 'Pizza Margherita',
                price: 37,
                quantity: 2,
                notes: null,
              },
            ],
          },
        ],
      },
    }

    const markup = renderToStaticMarkup(
      React.createElement(TableSessionDetailsDialog, {
        table,
        open: true,
        onOpenChange: vi.fn(),
        onCloseSession,
      })
    )

    expect(markup).toContain('Mesa 12')
    expect(markup).toContain('Pedido #88')
    expect(markup).toContain('2× Pizza Margherita')
    expect(markup).toContain('R$ 74.00')
    expect(markup).toContain('Fechar comanda')

    const elements = flattenElements(
      React.createElement(TableSessionDetailsDialog, {
        table,
        open: true,
        onOpenChange: vi.fn(),
        onCloseSession,
      }),
    )

    const closeButton = elements.find(
      (element) => element.type === 'button' && getTextContent(element).includes('Fechar comanda'),
    )

    closeButton?.props.onClick()

    expect(onCloseSession).toHaveBeenCalledWith(table)
  })

  it('renderiza detalhes da mesa livre e modal para abrir comanda', async () => {
    const { TableSessionDetailsDialog } = await import('@/features/tables/TableSessionDetailsDialog')
    const { OpenSessionDialog } = await import('@/features/tables/OpenSessionDialog')
    const { TableFormDialog } = await import('@/features/tables/TableFormDialog')

    const detailsMarkup = renderToStaticMarkup(
      React.createElement(TableSessionDetailsDialog, {
        table: {
          id: 'table-2',
          tenant_id: 'tenant-1',
          number: '7',
          capacity: 2,
          status: 'available',
          created_at: '2026-03-21T12:00:00.000Z',
          updated_at: '2026-03-21T12:00:00.000Z',
          active_session: null,
        },
        open: true,
        onOpenChange: vi.fn(),
        onCloseSession: vi.fn(),
      })
    )

    const openMarkup = renderToStaticMarkup(
      React.createElement(
        OpenSessionDialog,
        {
          table: {
            id: 'table-3',
            tenant_id: 'tenant-1',
            number: '9',
            capacity: 4,
            status: 'available',
            created_at: '2026-03-21T12:00:00.000Z',
            updated_at: '2026-03-21T12:00:00.000Z',
            active_session: null,
          },
          open: true,
          errorMessage: 'Erro ao abrir comanda.',
          isSubmitting: true,
          onOpenChange: vi.fn(),
        },
        React.createElement('form', null, React.createElement('input', { value: '4' }))
      )
    )

    const formMarkup = renderToStaticMarkup(
      React.createElement(
        TableFormDialog,
        {
          open: true,
          editingTable: {
            id: 'table-4',
            tenant_id: 'tenant-1',
            number: '11',
            capacity: 6,
            status: 'available',
            created_at: '2026-03-21T12:00:00.000Z',
            updated_at: '2026-03-21T12:00:00.000Z',
            active_session: null,
          },
          errorMessage: 'Erro ao atualizar mesa.',
          isSubmitting: true,
          onOpenChange: vi.fn(),
        },
        React.createElement('form', null, React.createElement('input', { value: '11' }))
      )
    )

    expect(detailsMarkup).toContain('Mesa livre - sem comanda aberta.')
    expect(openMarkup).toContain('Abrir comanda - Mesa 9')
    expect(openMarkup).toContain('Erro ao abrir comanda.')
    expect(openMarkup).toContain('Abrindo...')
    expect(formMarkup).toContain('Editar Mesa 11')
    expect(formMarkup).toContain('Erro ao atualizar mesa.')
    expect(formMarkup).toContain('Criando...')
  })

  it('retorna vazio quando TableSessionDetailsDialog não recebe mesa', async () => {
    const { TableSessionDetailsDialog } = await import('@/features/tables/TableSessionDetailsDialog')

    const markup = renderToStaticMarkup(
      React.createElement(TableSessionDetailsDialog, {
        table: null,
        open: true,
        onOpenChange: vi.fn(),
        onCloseSession: vi.fn(),
      }),
    )

    expect(markup).toBe('')
  })
})
