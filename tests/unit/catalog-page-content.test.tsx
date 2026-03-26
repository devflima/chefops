import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const formFieldMockValues: Record<string, unknown> = {
  goes_to_kitchen: true,
  price: 0,
  category: 'other',
}

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    Plus: Icon,
    Tag: Icon,
    ChefHat: Icon,
    GlassWater: Icon,
    Pencil: Icon,
    Trash2: Icon,
    Settings: Icon,
    Shield: Icon,
    Users: Icon,
  }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/shared/PaginationControls', () => ({
  default: ({ page, totalPages }: { page: number; totalPages: number }) =>
    React.createElement('div', null, `Pagination ${page}/${totalPages}`),
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
    render: (params: { field: { value: unknown; onChange: ReturnType<typeof vi.fn> } }) => React.ReactNode
  }) =>
    React.createElement(
      React.Fragment,
      null,
      render({
        field: {
          value: name in formFieldMockValues ? formFieldMockValues[name] : '',
          onChange: vi.fn(),
        },
      })
    ),
  FormItem: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  FormLabel: ({ children }: React.PropsWithChildren) => React.createElement('label', null, children),
  FormMessage: () => null,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectItem: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectTrigger: ({ children }: React.PropsWithChildren) => React.createElement('button', null, children),
  SelectValue: () => React.createElement('span', null, 'valor'),
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

describe('catalog page contents', () => {
  it('renderiza o conteúdo de categorias', async () => {
    const { CategoriesPageContent } = await import('@/features/products/CategoriesPageContent')
    const openCreate = vi.fn()
    const onNameFilterChange = vi.fn()
    const onDestinationFilterChange = vi.fn()
    const openEdit = vi.fn()
    const onDelete = vi.fn()
    const onPageChange = vi.fn()
    const onOpenChange = vi.fn()

    const props = {
        planUsageText: ' (1/20)',
        categoryLimitReached: false,
        categoryLimit: 20,
        openCreate,
        nameFilter: '',
        onNameFilterChange,
        destinationFilter: 'all',
        onDestinationFilterChange,
        isLoading: false,
        filteredCategories: [{ id: 'cat-1', name: 'Pizzas', display_order: 1, goes_to_kitchen: true }],
        paginatedCategories: [{ id: 'cat-1', name: 'Pizzas', display_order: 1, goes_to_kitchen: true }],
        openEdit,
        deletingId: null,
        onDelete,
        page: 1,
        totalPages: 1,
        onPageChange,
        open: true,
        onOpenChange,
        editing: null,
        form: {
          control: {},
          handleSubmit: () => vi.fn(),
          formState: { isSubmitting: false, errors: {} },
        },
        onSubmit: vi.fn(),
      }

    const markup = renderToStaticMarkup(React.createElement(CategoriesPageContent, props))

    expect(markup).toContain('Categorias')
    expect(markup).toContain('Pizzas')
    expect(markup).toContain('Nova categoria')

    const elements = flattenElements(React.createElement(CategoriesPageContent, props))
    const nameInput = elements.find((element) => element.type === 'input' && element.props.placeholder === 'Filtrar por nome...')
    const select = elements.find((element) => element.type === 'select')
    const buttons = elements.filter((element) => element.type === 'button')

    nameInput?.props.onChange({ target: { value: 'pizza' } })
    select?.props.onChange({ target: { value: 'counter' } })
    buttons.find((element) => getTextContent(element.props.children).includes('Nova categoria'))?.props.onClick()
    buttons.find((element) => getTextContent(element.props.children).includes('Cancelar'))?.props.onClick()
    buttons.find((element) => getTextContent(element.props.children).includes('Salvar'))?.props.onClick?.()

    expect(onNameFilterChange).toHaveBeenCalledWith('pizza')
    expect(onDestinationFilterChange).toHaveBeenCalledWith('counter')
    expect(openCreate).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('cobre estados vazio/limite e ações da tabela de categorias', async () => {
    const { CategoriesPageContent } = await import('@/features/products/CategoriesPageContent')
    const openCreate = vi.fn()
    const openEdit = vi.fn()
    const onDelete = vi.fn()
    const onPageChange = vi.fn()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()

    const limitedElement = React.createElement(CategoriesPageContent, {
        planUsageText: ' (20/20)',
        categoryLimitReached: true,
        categoryLimit: 20,
        openCreate,
        nameFilter: '',
        onNameFilterChange: vi.fn(),
        destinationFilter: 'all',
        onDestinationFilterChange: vi.fn(),
        isLoading: false,
        filteredCategories: [],
        paginatedCategories: [],
        openEdit,
        deletingId: null,
        onDelete,
        page: 2,
        totalPages: 3,
        onPageChange,
        open: true,
        onOpenChange,
        editing: { id: 'cat-1', name: 'Pizzas', display_order: 1, goes_to_kitchen: true },
        form: {
          control: {},
          handleSubmit: (callback: (values: unknown) => void) => () =>
            callback({ name: 'Massas', display_order: 2, goes_to_kitchen: false }),
          formState: { isSubmitting: true, errors: { root: { message: 'Erro ao salvar categoria.' } } },
        },
        onSubmit,
      })

    const limitedMarkup = renderToStaticMarkup(limitedElement)

    expect(limitedMarkup).toContain('atingiu o limite de 20 categorias')
    expect(limitedMarkup).toContain('Nenhuma categoria cadastrada.')
    expect(limitedMarkup).toContain('Editar categoria')
    expect(limitedMarkup).toContain('Erro ao salvar categoria.')
    expect(limitedMarkup).toContain('Salvando...')

    const limitedButtons = flattenElements(limitedElement).filter((element) => element.type === 'button')
    limitedButtons.find((element) => getTextContent(element.props.children).includes('Criar primeira categoria'))?.props.onClick()

    const populatedProps = {
      planUsageText: ' (1/20)',
      categoryLimitReached: false,
      categoryLimit: 20,
      openCreate,
      nameFilter: '',
      onNameFilterChange: vi.fn(),
      destinationFilter: 'all' as const,
      onDestinationFilterChange: vi.fn(),
      isLoading: false,
      filteredCategories: [{ id: 'cat-1', name: 'Pizzas', display_order: 1, goes_to_kitchen: true }],
      paginatedCategories: [{ id: 'cat-1', name: 'Pizzas', display_order: 1, goes_to_kitchen: true }],
      openEdit,
      deletingId: 'cat-1',
      onDelete,
      page: 1,
      totalPages: 1,
      onPageChange,
      open: true,
      onOpenChange,
      editing: null,
      form: {
        control: {},
        handleSubmit: (callback: (values: unknown) => void) => () =>
          callback({ name: 'Massas', display_order: 2, goes_to_kitchen: false }),
        formState: { isSubmitting: false, errors: {} },
      },
      onSubmit,
    }

    const elements = flattenElements(React.createElement(CategoriesPageContent, populatedProps))
    const buttons = elements.filter((element) => element.type === 'button')
    const form = elements.find((element) => element.type === 'form')

    const iconButtons = buttons.filter((element) => !getTextContent(element.props.children).trim())
    iconButtons[0]?.props.onClick()
    iconButtons[1]?.props.onClick()
    buttons.find((element) => getTextContent(element).includes('Cozinha'))?.props.onClick()
    buttons.find((element) => getTextContent(element).includes('Balcão'))?.props.onClick()
    form?.props.onSubmit()

    expect(openCreate).toHaveBeenCalledTimes(1)
    expect(openEdit).toHaveBeenCalledWith({ id: 'cat-1', name: 'Pizzas', display_order: 1, goes_to_kitchen: true })
    expect(onDelete).toHaveBeenCalledWith({ id: 'cat-1', name: 'Pizzas', display_order: 1, goes_to_kitchen: true })
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Massas', display_order: 2, goes_to_kitchen: false })
  })

  it('cobre loading e render de categoria enviada ao balcao', async () => {
    const { CategoriesPageContent } = await import('@/features/products/CategoriesPageContent')

    formFieldMockValues.goes_to_kitchen = false

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(CategoriesPageContent, {
        planUsageText: '',
        categoryLimitReached: false,
        categoryLimit: undefined,
        openCreate: vi.fn(),
        nameFilter: '',
        onNameFilterChange: vi.fn(),
        destinationFilter: 'all',
        onDestinationFilterChange: vi.fn(),
        isLoading: true,
        filteredCategories: [],
        paginatedCategories: [],
        openEdit: vi.fn(),
        deletingId: null,
        onDelete: vi.fn(),
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        open: false,
        onOpenChange: vi.fn(),
        editing: null,
        form: {
          control: {},
          handleSubmit: () => vi.fn(),
          formState: { isSubmitting: false, errors: {} },
        },
        onSubmit: vi.fn(),
      }),
    )

    const counterMarkup = renderToStaticMarkup(
      React.createElement(CategoriesPageContent, {
        planUsageText: '',
        categoryLimitReached: false,
        categoryLimit: undefined,
        openCreate: vi.fn(),
        nameFilter: '',
        onNameFilterChange: vi.fn(),
        destinationFilter: 'all',
        onDestinationFilterChange: vi.fn(),
        isLoading: false,
        filteredCategories: [{ id: 'cat-2', name: 'Bebidas', display_order: 2, goes_to_kitchen: false }],
        paginatedCategories: [{ id: 'cat-2', name: 'Bebidas', display_order: 2, goes_to_kitchen: false }],
        openEdit: vi.fn(),
        deletingId: null,
        onDelete: vi.fn(),
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        open: false,
        onOpenChange: vi.fn(),
        editing: null,
        form: {
          control: {},
          handleSubmit: () => vi.fn(),
          formState: { isSubmitting: false, errors: {} },
        },
        onSubmit: vi.fn(),
      }),
    )

    expect(loadingMarkup).toContain('Carregando...')
    expect(counterMarkup).toContain('Bebidas')
    expect(counterMarkup).toContain('Balcão')

    formFieldMockValues.goes_to_kitchen = true
  })

  it('renderiza o conteúdo de extras', async () => {
    const { ExtrasPageContent } = await import('@/features/products/ExtrasPageContent')
    const openCreate = vi.fn()
    const onNameFilterChange = vi.fn()
    const onCategoryFilterChange = vi.fn()
    const openEdit = vi.fn()
    const onDelete = vi.fn()
    const onPageChange = vi.fn()
    const onOpenChange = vi.fn()

    const props = {
        planUsageText: ' (1/20)',
        extrasLimitReached: false,
        extrasLimit: 20,
        openCreate,
        nameFilter: '',
        onNameFilterChange,
        categoryFilter: 'all',
        onCategoryFilterChange,
        isLoading: false,
        filteredExtras: [{ id: 'extra-1', name: 'Borda', category: 'border', price: 10 }],
        paginatedExtras: [{ id: 'extra-1', name: 'Borda', category: 'border', price: 10 }],
        openEdit,
        onDelete,
        page: 1,
        totalPages: 1,
        onPageChange,
        open: true,
        onOpenChange,
        editing: null,
        form: {
          control: {},
          handleSubmit: () => vi.fn(),
          formState: { isSubmitting: false, errors: {} },
        },
        onSubmit: vi.fn(),
      }

    const markup = renderToStaticMarkup(React.createElement(ExtrasPageContent, props))

    expect(markup).toContain('Adicionais')
    expect(markup).toContain('Borda')
    expect(markup).toContain('Novo adicional')

    const elements = flattenElements(React.createElement(ExtrasPageContent, props))
    const nameInput = elements.find((element) => element.type === 'input' && element.props.placeholder === 'Filtrar por nome...')
    const select = elements.find((element) => element.type === 'select')
    const buttons = elements.filter((element) => element.type === 'button')

    nameInput?.props.onChange({ target: { value: 'borda' } })
    select?.props.onChange({ target: { value: 'flavor' } })
    buttons.find((element) => getTextContent(element.props.children).includes('Novo adicional'))?.props.onClick()
    buttons.find((element) => getTextContent(element.props.children).includes('Cancelar'))?.props.onClick()

    expect(onNameFilterChange).toHaveBeenCalledWith('borda')
    expect(onCategoryFilterChange).toHaveBeenCalledWith('flavor')
    expect(openCreate).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('cobre estados alternativos e ações de extras', async () => {
    const { ExtrasPageContent } = await import('@/features/products/ExtrasPageContent')
    const openCreate = vi.fn()
    const openEdit = vi.fn()
    const onDelete = vi.fn()
    const onPageChange = vi.fn()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()

    const emptyElement = React.createElement(ExtrasPageContent, {
      planUsageText: ' (20/20)',
      extrasLimitReached: true,
      extrasLimit: 20,
      openCreate,
      nameFilter: '',
      onNameFilterChange: vi.fn(),
      categoryFilter: 'all',
      onCategoryFilterChange: vi.fn(),
      isLoading: false,
      filteredExtras: [],
      paginatedExtras: [],
      openEdit,
      onDelete,
      page: 2,
      totalPages: 3,
      onPageChange,
      open: true,
      onOpenChange,
      editing: { id: 'extra-1', name: 'Borda', category: 'border', price: 10 },
      form: {
        control: {},
        handleSubmit: (callback: (values: unknown) => void) => () =>
          callback({ name: 'Cheddar', category: 'flavor', price: 5 }),
        formState: { isSubmitting: true, errors: { root: { message: 'Erro ao salvar adicional.' } } },
      },
      onSubmit,
    })

    const emptyMarkup = renderToStaticMarkup(emptyElement)
    expect(emptyMarkup).toContain('atingiu o limite de 20 adicionais')
    expect(emptyMarkup).toContain('Nenhum adicional cadastrado.')
    expect(emptyMarkup).toContain('Editar adicional')
    expect(emptyMarkup).toContain('Erro ao salvar adicional.')
    expect(emptyMarkup).toContain('Salvando...')

    const emptyButtons = flattenElements(emptyElement).filter((element) => element.type === 'button')
    emptyButtons.find((element) => getTextContent(element.props.children).includes('Criar primeiro adicional'))?.props.onClick()

    const populatedElement = React.createElement(ExtrasPageContent, {
      planUsageText: ' (1/20)',
      extrasLimitReached: false,
      extrasLimit: 20,
      openCreate,
      nameFilter: '',
      onNameFilterChange: vi.fn(),
      categoryFilter: 'all',
      onCategoryFilterChange: vi.fn(),
      isLoading: false,
      filteredExtras: [{ id: 'extra-1', name: 'Molho', category: 'other', price: 0 }],
      paginatedExtras: [{ id: 'extra-1', name: 'Molho', category: 'other', price: 0 }],
      openEdit,
      onDelete,
      page: 1,
      totalPages: 1,
      onPageChange,
      open: true,
      onOpenChange,
      editing: null,
      form: {
        control: {},
        handleSubmit: (callback: (values: unknown) => void) => () =>
          callback({ name: 'Cheddar', category: 'flavor', price: 5 }),
        formState: { isSubmitting: false, errors: {} },
      },
      onSubmit,
    })

    const populatedMarkup = renderToStaticMarkup(populatedElement)
    expect(populatedMarkup).toContain('Grátis')
    expect(populatedMarkup).toContain('Outro')

    const elements = flattenElements(populatedElement)
    const iconButtons = elements
      .filter((element) => element.type === 'button')
      .filter((element) => !getTextContent(element.props.children).trim())
    const form = elements.find((element) => element.type === 'form')

    iconButtons[0]?.props.onClick()
    iconButtons[1]?.props.onClick()
    form?.props.onSubmit?.({ preventDefault: vi.fn() })

    expect(openCreate).toHaveBeenCalledTimes(1)
    expect(openEdit).toHaveBeenCalledWith({ id: 'extra-1', name: 'Molho', category: 'other', price: 0 })
    expect(onDelete).toHaveBeenCalledWith({ id: 'extra-1', name: 'Molho', category: 'other', price: 0 })
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Cheddar', category: 'flavor', price: 5 })
  })

  it('cobre loading e render de adicional de sabor', async () => {
    const { ExtrasPageContent } = await import('@/features/products/ExtrasPageContent')

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(ExtrasPageContent, {
        planUsageText: '',
        extrasLimitReached: false,
        extrasLimit: undefined,
        openCreate: vi.fn(),
        nameFilter: '',
        onNameFilterChange: vi.fn(),
        categoryFilter: 'all',
        onCategoryFilterChange: vi.fn(),
        isLoading: true,
        filteredExtras: [],
        paginatedExtras: [],
        openEdit: vi.fn(),
        onDelete: vi.fn(),
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        open: false,
        onOpenChange: vi.fn(),
        editing: null,
        form: {
          control: {},
          handleSubmit: () => vi.fn(),
          formState: { isSubmitting: false, errors: {} },
        },
        onSubmit: vi.fn(),
      }),
    )

    const flavorMarkup = renderToStaticMarkup(
      React.createElement(ExtrasPageContent, {
        planUsageText: '',
        extrasLimitReached: false,
        extrasLimit: undefined,
        openCreate: vi.fn(),
        nameFilter: '',
        onNameFilterChange: vi.fn(),
        categoryFilter: 'all',
        onCategoryFilterChange: vi.fn(),
        isLoading: false,
        filteredExtras: [{ id: 'extra-2', name: 'Cheddar', category: 'flavor', price: 3 }],
        paginatedExtras: [{ id: 'extra-2', name: 'Cheddar', category: 'flavor', price: 3 }],
        openEdit: vi.fn(),
        onDelete: vi.fn(),
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        open: false,
        onOpenChange: vi.fn(),
        editing: null,
        form: {
          control: {},
          handleSubmit: () => vi.fn(),
          formState: { isSubmitting: false, errors: {} },
        },
        onSubmit: vi.fn(),
      }),
    )

    expect(loadingMarkup).toContain('Carregando...')
    expect(flavorMarkup).toContain('Cheddar')
    expect(flavorMarkup).toContain('Sabor extra')
    expect(flavorMarkup).toContain('+ R$ 3.00')
  })

  it('renderiza o conteúdo de usuários', async () => {
    const { UsersPageContent } = await import('@/features/users/UsersPageContent')
    const onNameFilterChange = vi.fn()
    const onRoleFilterChange = vi.fn()
    const onOpenCreate = vi.fn()
    const onOpenChange = vi.fn()
    const onFullNameChange = vi.fn()
    const onEmailChange = vi.fn()
    const onPasswordChange = vi.fn()
    const onRoleChange = vi.fn()

    const props = {
        isOwner: true,
        isLoading: false,
        data: {
          current_user_id: 'user-1',
          users: [],
          counts: { owner: 1, manager: 0, cashier: 0, kitchen: 0 },
          limits: {
            available_roles: ['manager', 'cashier'],
            role_limits: { owner: 1, manager: 3, cashier: 3, kitchen: 3 },
          },
        },
        nameFilter: '',
        onNameFilterChange,
        roleFilter: 'all',
        onRoleFilterChange,
        paginatedUsers: [],
        canManageUser: vi.fn(() => true),
        onOpenCreate,
        onOpenEdit: vi.fn(),
        onDeleteUser: vi.fn(),
        updatePending: false,
        deletePending: false,
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        open: true,
        onOpenChange,
        editingUser: null,
        fullName: '',
        onFullNameChange,
        email: '',
        onEmailChange,
        password: '',
        onPasswordChange,
        role: 'manager',
        onRoleChange,
        availableRoles: ['manager', 'cashier'],
        onSubmit: vi.fn(),
        createPending: false,
      }

    const markup = renderToStaticMarkup(React.createElement(UsersPageContent, props))

    expect(markup).toContain('Equipe e acessos')
    expect(markup).toContain('Nenhum usuário cadastrado.')
    expect(markup).toContain('Novo usuário')

    const elements = flattenElements(React.createElement(UsersPageContent, props))
    const filterInput = elements.find(
      (element) => element.type === 'input' && element.props.placeholder === 'Filtrar por nome ou e-mail...'
    )
    const inputs = elements.filter((element) => element.type === 'input')
    const selects = elements.filter((element) => element.type === 'select')
    const buttons = elements.filter((element) => element.type === 'button')

    filterInput?.props.onChange({ target: { value: 'chef' } })
    selects[0]?.props.onChange({ target: { value: 'cashier' } })
    buttons.find((element) => getTextContent(element.props.children).includes('Novo usuário'))?.props.onClick()
    buttons.find((element) => getTextContent(element.props.children).includes('Cancelar'))?.props.onClick()
    inputs.find((element) => element.props.placeholder === 'Nome completo')?.props.onChange({ target: { value: 'Chef Ops' } })
    inputs.find((element) => element.props.placeholder === 'usuario@empresa.com')?.props.onChange({
      target: { value: 'chef@ops.test' },
    })
    inputs.find((element) => element.props.placeholder === 'Min. 6 caracteres')?.props.onChange({
      target: { value: '123456' },
    })
    selects[1]?.props.onChange({ target: { value: 'cashier' } })

    expect(onNameFilterChange).toHaveBeenCalledWith('chef')
    expect(onRoleFilterChange).toHaveBeenCalledWith('cashier')
    expect(onOpenCreate).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onFullNameChange).toHaveBeenCalledWith('Chef Ops')
    expect(onEmailChange).toHaveBeenCalledWith('chef@ops.test')
    expect(onPasswordChange).toHaveBeenCalledWith('123456')
    expect(onRoleChange).toHaveBeenCalledWith('cashier')
  })

  it('cobre estados alternativos e ações de usuários', async () => {
    const { UsersPageContent } = await import('@/features/users/UsersPageContent')
    const onOpenEdit = vi.fn()
    const onDeleteUser = vi.fn()
    const onSubmit = vi.fn()

    const loadingMarkup = renderToStaticMarkup(React.createElement(UsersPageContent, {
      isOwner: false,
      isLoading: true,
      data: null,
      nameFilter: '',
      onNameFilterChange: vi.fn(),
      roleFilter: 'all',
      onRoleFilterChange: vi.fn(),
      paginatedUsers: [],
      canManageUser: vi.fn(() => false),
      onOpenCreate: vi.fn(),
      onOpenEdit,
      onDeleteUser,
      updatePending: false,
      deletePending: false,
      page: 1,
      totalPages: 1,
      onPageChange: vi.fn(),
      open: false,
      onOpenChange: vi.fn(),
      editingUser: null,
      fullName: '',
      onFullNameChange: vi.fn(),
      email: '',
      onEmailChange: vi.fn(),
      password: '',
      onPasswordChange: vi.fn(),
      role: 'manager',
      onRoleChange: vi.fn(),
      availableRoles: ['manager'],
      onSubmit,
      createPending: false,
    }))
    expect(loadingMarkup).toContain('Carregando equipe...')

    const errorMarkup = renderToStaticMarkup(React.createElement(UsersPageContent, {
      isOwner: false,
      isLoading: false,
      data: null,
      nameFilter: '',
      onNameFilterChange: vi.fn(),
      roleFilter: 'all',
      onRoleFilterChange: vi.fn(),
      paginatedUsers: [],
      canManageUser: vi.fn(() => false),
      onOpenCreate: vi.fn(),
      onOpenEdit,
      onDeleteUser,
      updatePending: false,
      deletePending: false,
      page: 1,
      totalPages: 1,
      onPageChange: vi.fn(),
      open: false,
      onOpenChange: vi.fn(),
      editingUser: null,
      fullName: '',
      onFullNameChange: vi.fn(),
      email: '',
      onEmailChange: vi.fn(),
      password: '',
      onPasswordChange: vi.fn(),
      role: 'manager',
      onRoleChange: vi.fn(),
      availableRoles: ['manager'],
      onSubmit,
      createPending: false,
    }))
    expect(errorMarkup).toContain('Não foi possível carregar a equipe.')

    const populatedElement = React.createElement(UsersPageContent, {
      isOwner: false,
      isLoading: false,
      data: {
        current_user_id: 'user-2',
        users: [],
        counts: { owner: 1, manager: 1, cashier: 0, kitchen: 0 },
        limits: {
          available_roles: ['manager', 'cashier', 'kitchen'],
          role_limits: { owner: 1, manager: 3, cashier: 3, kitchen: 3 },
        },
      },
      nameFilter: '',
      onNameFilterChange: vi.fn(),
      roleFilter: 'all',
      onRoleFilterChange: vi.fn(),
      paginatedUsers: [
        {
          id: 'user-2',
          full_name: null,
          email: 'carlos@test.com',
          role: 'manager',
          created_at: '2026-03-01T00:00:00.000Z',
        },
      ],
      canManageUser: vi.fn(() => true),
      onOpenCreate: vi.fn(),
      onOpenEdit,
      onDeleteUser,
      updatePending: true,
      deletePending: true,
      page: 2,
      totalPages: 4,
      onPageChange: vi.fn(),
      open: true,
      onOpenChange: vi.fn(),
      editingUser: {
        id: 'user-2',
        full_name: null,
        email: 'carlos@test.com',
        role: 'manager',
        created_at: '2026-03-01T00:00:00.000Z',
      },
      fullName: '',
      onFullNameChange: vi.fn(),
      email: 'carlos@test.com',
      onEmailChange: vi.fn(),
      password: '',
      onPasswordChange: vi.fn(),
      role: 'manager',
      onRoleChange: vi.fn(),
      availableRoles: ['manager', 'cashier'],
      onSubmit,
      createPending: false,
    })

    const populatedMarkup = renderToStaticMarkup(populatedElement)
    expect(populatedMarkup).toContain('Apenas o perfil owner pode criar, editar ou remover acessos da equipe.')
    expect(populatedMarkup).toContain('Sem nome')
    expect(populatedMarkup).toContain('Você')
    expect(populatedMarkup).toContain('manager')
    expect(populatedMarkup).toContain('Salvando...')
    expect(populatedMarkup).not.toContain('Senha inicial')

    const elements = flattenElements(populatedElement)
    const form = elements.find((element) => element.type === 'form')
    const iconButtons = elements
      .filter((element) => element.type === 'button')
      .filter((element) => !getTextContent(element.props.children).trim())
    const editButton = iconButtons[0]
    const deleteButton = iconButtons[1]

    expect(editButton?.props.disabled).toBe(true)
    expect(deleteButton?.props.disabled).toBe(true)

    editButton?.props.onClick()
    deleteButton?.props.onClick()
    form?.props.onSubmit?.({ preventDefault: vi.fn() })

    expect(onOpenEdit).toHaveBeenCalledWith({
      id: 'user-2',
      full_name: null,
      email: 'carlos@test.com',
      role: 'manager',
      created_at: '2026-03-01T00:00:00.000Z',
    })
    expect(onDeleteUser).toHaveBeenCalledWith({
      id: 'user-2',
      full_name: null,
      email: 'carlos@test.com',
      role: 'manager',
      created_at: '2026-03-01T00:00:00.000Z',
    })
    expect(onSubmit).toHaveBeenCalled()

    const creatingMarkup = renderToStaticMarkup(React.createElement(UsersPageContent, {
      isOwner: true,
      isLoading: false,
      data: {
        current_user_id: 'user-1',
        users: [],
        counts: { owner: 1, manager: 0, cashier: 0, kitchen: 0 },
        limits: {
          available_roles: ['manager', 'cashier'],
          role_limits: { owner: 1, manager: 3, cashier: 3, kitchen: 3 },
        },
      },
      nameFilter: '',
      onNameFilterChange: vi.fn(),
      roleFilter: 'all',
      onRoleFilterChange: vi.fn(),
      paginatedUsers: [],
      canManageUser: vi.fn(() => true),
      onOpenCreate: vi.fn(),
      onOpenEdit: vi.fn(),
      onDeleteUser: vi.fn(),
      updatePending: false,
      deletePending: false,
      page: 1,
      totalPages: 1,
      onPageChange: vi.fn(),
      open: true,
      onOpenChange: vi.fn(),
      editingUser: null,
      fullName: '',
      onFullNameChange: vi.fn(),
      email: '',
      onEmailChange: vi.fn(),
      password: '',
      onPasswordChange: vi.fn(),
      role: 'manager',
      onRoleChange: vi.fn(),
      availableRoles: ['manager', 'cashier'],
      onSubmit: vi.fn(),
      createPending: true,
    }))
    expect(creatingMarkup).toContain('Criando...')

    const editingReadyMarkup = renderToStaticMarkup(React.createElement(UsersPageContent, {
      isOwner: true,
      isLoading: false,
      data: {
        current_user_id: 'user-1',
        users: [],
        counts: { owner: 1, manager: 0, cashier: 0, kitchen: 0 },
        limits: {
          available_roles: ['manager', 'cashier'],
          role_limits: { owner: 1, manager: 3, cashier: 3, kitchen: 3 },
        },
      },
      nameFilter: '',
      onNameFilterChange: vi.fn(),
      roleFilter: 'all',
      onRoleFilterChange: vi.fn(),
      paginatedUsers: [],
      canManageUser: vi.fn(() => true),
      onOpenCreate: vi.fn(),
      onOpenEdit: vi.fn(),
      onDeleteUser: vi.fn(),
      updatePending: false,
      deletePending: false,
      page: 1,
      totalPages: 1,
      onPageChange: vi.fn(),
      open: true,
      onOpenChange: vi.fn(),
      editingUser: {
        id: 'user-3',
        full_name: 'Ana',
        email: 'ana@ops.test',
        role: 'cashier',
        created_at: '2026-03-01T00:00:00.000Z',
      },
      fullName: 'Ana',
      onFullNameChange: vi.fn(),
      email: 'ana@ops.test',
      onEmailChange: vi.fn(),
      password: '',
      onPasswordChange: vi.fn(),
      role: 'cashier',
      onRoleChange: vi.fn(),
      availableRoles: ['cashier', 'manager'],
      onSubmit: vi.fn(),
      createPending: false,
    }))
    expect(editingReadyMarkup).toContain('Salvar alterações')
  })
})
