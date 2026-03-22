import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogHeader: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogTitle: ({ children }: React.PropsWithChildren) => React.createElement('h2', null, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/features/plans/components/PlanSubscriptionSummary', () => ({
  PlanSubscriptionSummary: () => React.createElement('div', null, 'Plan Subscription Summary Mock'),
}))

vi.mock('@/features/plans/components/PlanCard', () => ({
  PlanCard: ({ plan }: { plan: string }) => React.createElement('div', null, `Plan Card ${plan}`),
}))

vi.mock('@/features/plans/components/PlanHelpPanel', () => ({
  PlanHelpPanel: () => React.createElement('div', null, 'Plan Help Panel Mock'),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    Bike: Icon,
    Pencil: Icon,
    Plus: Icon,
    Trash2: Icon,
  }
})

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

describe('plans and delivery page contents', () => {
  it('renderiza o conteúdo de planos', async () => {
    const { PlanosPageContent } = await import('@/features/plans/components/PlanosPageContent')
    const onCancelSubscription = vi.fn()

    const props = {
        currentPlan: 'basic',
        currentSubscription: {
          status: 'authorized',
          plan: 'basic',
          next_payment_date: '2026-04-01',
          cancel_at_period_end: false,
        },
        loadingPlan: null,
        onSelectPlan: vi.fn(),
        onCancelSubscription,
      }

    const markup = renderToStaticMarkup(React.createElement(PlanosPageContent, props))

    expect(markup).toContain('Plan Subscription Summary Mock')
    expect(markup).toContain('Plan Card free')
    expect(markup).toContain('Plan Card basic')
    expect(markup).toContain('Cancelar assinatura')

    const elements = flattenElements(React.createElement(PlanosPageContent, props))
    elements.find((element) => element.type === 'button' && getTextContent(element.props.children).includes('Cancelar assinatura'))
      ?.props.onClick()
    expect(onCancelSubscription).toHaveBeenCalledTimes(1)
  })

  it('renderiza o conteúdo de entregadores', async () => {
    const { DeliveryDriversPageContent } = await import('@/features/delivery/DeliveryDriversPageContent')
    const openCreate = vi.fn()
    const openEdit = vi.fn()
    const onDelete = vi.fn()
    const onOpenChange = vi.fn()
    const onNameChange = vi.fn()
    const onPhoneChange = vi.fn()
    const onVehicleTypeChange = vi.fn()
    const onNotesChange = vi.fn()
    const onActiveChange = vi.fn()

    const props = {
        canManage: true,
        activeDrivers: 1,
        isLoading: false,
        drivers: [
          {
            id: 'driver-1',
            name: 'Carlos',
            phone: '11999999999',
            vehicle_type: 'moto',
            notes: 'Turno noite',
            active: true,
          },
        ],
        openCreate,
        openEdit,
        onDelete,
        open: true,
        onOpenChange,
        editingDriver: null,
        name: '',
        onNameChange,
        phone: '',
        onPhoneChange,
        vehicleType: 'moto',
        onVehicleTypeChange,
        notes: '',
        onNotesChange,
        active: true,
        onActiveChange,
        onSubmit: vi.fn(),
        submitDisabled: false,
      }

    const markup = renderToStaticMarkup(React.createElement(DeliveryDriversPageContent, props))

    expect(markup).toContain('Entregadores')
    expect(markup).toContain('Carlos')
    expect(markup).toContain('Moto')
    expect(markup).toContain('Cadastrar entregador')

    const elements = flattenElements(React.createElement(DeliveryDriversPageContent, props))
    const buttons = elements.filter((element) => element.type === 'button')
    const inputs = elements.filter((element) => element.type === 'input')
    const selects = elements.filter((element) => element.type === 'select')
    const textarea = elements.find((element) => element.type === 'textarea')

    buttons.find((element) => getTextContent(element.props.children).includes('Novo entregador'))?.props.onClick()
    buttons.find((element) => getTextContent(element.props.children).includes('Cancelar'))?.props.onClick()
    buttons.find((element) => getTextContent(element.props.children).includes('Carlos'))?.props.onClick?.()
    inputs.find((element) => element.props.required)?.props.onChange({ target: { value: 'João' } })
    inputs.find((element) => element.props.placeholder === 'Opcional')?.props.onChange({ target: { value: '11999990000' } })
    inputs.find((element) => element.props.type === 'checkbox')?.props.onChange({ target: { checked: false } })
    selects[0]?.props.onChange({ target: { value: 'bike' } })
    textarea?.props.onChange({ target: { value: 'Centro' } })

    expect(openCreate).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onNameChange).toHaveBeenCalledWith('João')
    expect(onPhoneChange).toHaveBeenCalledWith('11999990000')
    expect(onVehicleTypeChange).toHaveBeenCalledWith('bike')
    expect(onNotesChange).toHaveBeenCalledWith('Centro')
    expect(onActiveChange).toHaveBeenCalledWith(false)
  })

  it('cobre estados alternativos e ações de entregadores', async () => {
    const { DeliveryDriversPageContent } = await import('@/features/delivery/DeliveryDriversPageContent')
    const openCreate = vi.fn()
    const openEdit = vi.fn()
    const onDelete = vi.fn()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(DeliveryDriversPageContent, {
        canManage: false,
        activeDrivers: 0,
        isLoading: true,
        drivers: null,
        openCreate,
        openEdit,
        onDelete,
        open: false,
        onOpenChange,
        editingDriver: null,
        name: '',
        onNameChange: vi.fn(),
        phone: '',
        onPhoneChange: vi.fn(),
        vehicleType: 'moto',
        onVehicleTypeChange: vi.fn(),
        notes: '',
        onNotesChange: vi.fn(),
        active: true,
        onActiveChange: vi.fn(),
        onSubmit,
        submitDisabled: false,
      })
    )

    expect(loadingMarkup).toContain('Carregando entregadores...')
    expect(loadingMarkup).toContain('apenas owner e manager podem cadastrar ou editar')

    const emptyElement = React.createElement(DeliveryDriversPageContent, {
      canManage: true,
      activeDrivers: 0,
      isLoading: false,
      drivers: [],
      openCreate,
      openEdit,
      onDelete,
      open: true,
      onOpenChange,
      editingDriver: {
        id: 'driver-1',
        name: 'Carlos',
        phone: '11999999999',
        vehicle_type: 'moto',
        notes: 'Turno noite',
        active: true,
      },
      name: 'Carlos',
      onNameChange: vi.fn(),
      phone: '11999999999',
      onPhoneChange: vi.fn(),
      vehicleType: 'moto',
      onVehicleTypeChange: vi.fn(),
      notes: 'Turno noite',
      onNotesChange: vi.fn(),
      active: true,
      onActiveChange: vi.fn(),
      onSubmit,
      submitDisabled: true,
    })

    const emptyMarkup = renderToStaticMarkup(emptyElement)
    expect(emptyMarkup).toContain('Nenhum entregador cadastrado.')
    expect(emptyMarkup).toContain('Editar entregador')

    const emptyButtons = flattenElements(emptyElement).filter((element) => element.type === 'button')
    emptyButtons.find((element) => getTextContent(element.props.children).includes('Cadastrar primeiro entregador'))
      ?.props.onClick()

    const populatedElement = React.createElement(DeliveryDriversPageContent, {
      canManage: true,
      activeDrivers: 2,
      isLoading: false,
      drivers: [
        {
          id: 'driver-1',
          name: 'Carlos',
          phone: '',
          vehicle_type: 'carro',
          notes: '',
          active: false,
        },
      ],
      openCreate,
      openEdit,
      onDelete,
      open: true,
      onOpenChange,
      editingDriver: null,
      name: '',
      onNameChange: vi.fn(),
      phone: '',
      onPhoneChange: vi.fn(),
      vehicleType: 'moto',
      onVehicleTypeChange: vi.fn(),
      notes: '',
      onNotesChange: vi.fn(),
      active: false,
      onActiveChange: vi.fn(),
      onSubmit,
      submitDisabled: false,
    })

    const populatedMarkup = renderToStaticMarkup(populatedElement)
    expect(populatedMarkup).toContain('Inativo')
    expect(populatedMarkup).toContain('Carro')
    expect(populatedMarkup).toContain('Não informado')

    const elements = flattenElements(populatedElement)
    const iconButtons = elements
      .filter((element) => element.type === 'button')
      .filter((element) => !getTextContent(element.props.children).trim())
    const form = elements.find((element) => element.type === 'form')

    iconButtons[0]?.props.onClick()
    iconButtons[1]?.props.onClick()
    form?.props.onSubmit?.({ preventDefault: vi.fn() })

    expect(openCreate).toHaveBeenCalledTimes(1)
    expect(openEdit).toHaveBeenCalledWith({
      id: 'driver-1',
      name: 'Carlos',
      phone: '',
      vehicle_type: 'carro',
      notes: '',
      active: false,
    })
    expect(onDelete).toHaveBeenCalledWith({
      id: 'driver-1',
      name: 'Carlos',
      phone: '',
      vehicle_type: 'carro',
      notes: '',
      active: false,
    })
    expect(onSubmit).toHaveBeenCalled()
  })
})
