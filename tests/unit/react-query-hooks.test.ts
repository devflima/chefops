import { beforeEach, describe, expect, it, vi } from 'vitest'

const invalidateQueries = vi.fn()
const setQueryData = vi.fn()
const useQueryMock = vi.fn((options: unknown) => options)
const useMutationMock = vi.fn((options: unknown) => options)

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), { status: 200, ...init })
}

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: () => ({
    invalidateQueries,
    setQueryData,
  }),
}))

const deliveryDrivers = await import('@/features/delivery/hooks/useDeliveryDrivers')
const deliverySettings = await import('@/features/delivery/hooks/useDeliverySettings')
const notificationSettings = await import('@/features/notifications/hooks/useNotificationSettings')
const onboarding = await import('@/features/onboarding/hooks/useOnboarding')
const ordersHooks = await import('@/features/orders/hooks/useOrders')
const paymentsHooks = await import('@/features/payments/hooks/useMercadoPagoAccount')
const planHooks = await import('@/features/plans/hooks/usePlan')
const productHooks = await import('@/features/products/hooks/useProducts')
const stockHooks = await import('@/features/stock/hooks/useStock')
const tableHooks = await import('@/features/tables/hooks/useTables')
const tabHooks = await import('@/features/tabs/hooks/useTabs')
const userHooks = await import('@/features/users/hooks/useUsers')

describe('react-query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ data: { ok: true } }))
  })

  it('configura hooks de delivery drivers', async () => {
    const list = deliveryDrivers.useDeliveryDrivers() as { queryKey: unknown; queryFn: () => Promise<unknown> }
    expect(list.queryKey).toEqual(['delivery-drivers'])
    await expect(list.queryFn()).resolves.toEqual({ ok: true })

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ data: [{ ok: true }] })
    )
    await expect(list.queryFn()).resolves.toEqual([{ ok: true }])

    const create = deliveryDrivers.useCreateDeliveryDriver() as {
      mutationFn: (payload: unknown) => Promise<unknown>
      onSuccess: () => void
    }
    await create.mutationFn({ name: 'Moto', vehicle_type: 'moto' })
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/delivery-drivers', expect.objectContaining({ method: 'POST' }))
    create.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['delivery-drivers'] })

    const update = deliveryDrivers.useUpdateDeliveryDriver() as {
      mutationFn: (payload: { id: string; name: string; vehicle_type: string }) => Promise<unknown>
      onSuccess: () => void
    }
    await update.mutationFn({ id: 'driver-1', name: 'Moto', vehicle_type: 'moto' })
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/delivery-drivers/driver-1', expect.objectContaining({ method: 'PATCH' }))
    update.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })

    const remove = deliveryDrivers.useDeleteDeliveryDriver() as {
      mutationFn: (id: string) => Promise<unknown>
      onSuccess: () => void
    }
    await remove.mutationFn('driver-1')
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/delivery-drivers/driver-1', { method: 'DELETE' })
    remove.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['delivery-drivers'] })
  })

  it('configura hooks de delivery settings e notification settings', async () => {
    const deliveryQuery = deliverySettings.useDeliverySettings() as { queryFn: () => Promise<unknown> }
    await deliveryQuery.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/delivery-settings')

    const deliveryMutation = deliverySettings.useUpdateDeliverySettings() as {
      mutationFn: (payload: unknown) => Promise<unknown>
      onSuccess: () => void
    }
    await deliveryMutation.mutationFn({ delivery_enabled: true, flat_fee: 10 })
    deliveryMutation.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['delivery-settings'] })

    const notifQuery = notificationSettings.useNotificationSettings() as { queryFn: () => Promise<unknown> }
    await notifQuery.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/notification-settings')

    const notifMutation = notificationSettings.useUpdateNotificationSettings() as {
      mutationFn: (payload: unknown) => Promise<unknown>
      onSuccess: () => void
    }
    await notifMutation.mutationFn({ whatsapp_order_received: true })
    notifMutation.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['notification-settings'] })
  })

  it('configura hooks de onboarding e pagamentos', async () => {
    const onboardingQuery = onboarding.useOnboarding() as { queryFn: () => Promise<unknown> }
    await onboardingQuery.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/onboarding')

    const completeStep = onboarding.useCompleteStep() as {
      mutationFn: (payload: unknown) => Promise<unknown>
      onSuccess: (data: unknown) => void
    }
    const stepData = await completeStep.mutationFn({ has_category: true })
    completeStep.onSuccess(stepData)
    expect(setQueryData).toHaveBeenCalledWith(['onboarding'], { ok: true })

    const mpQuery = paymentsHooks.useMercadoPagoAccount() as { queryFn: () => Promise<unknown> }
    await mpQuery.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/mercado-pago/account')

    const disconnect = paymentsHooks.useDisconnectMercadoPagoAccount() as {
      mutationFn: () => Promise<unknown>
      onSuccess: () => void
    }
    await disconnect.mutationFn()
    disconnect.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['mercado-pago-account'] })
  })

  it('configura hooks de pedidos', async () => {
    const orders = ordersHooks.useOrders({
      status: 'pending',
      from: '2026-03-01',
      to: '2026-03-21',
      page: 2,
      pageSize: 20,
    }) as { queryKey: unknown; queryFn: () => Promise<unknown>; refetchInterval: number }

    expect(orders.queryKey).toEqual([
      'orders',
      { status: 'pending', from: '2026-03-01', to: '2026-03-21', page: 2, pageSize: 20 },
    ])
    expect(orders.refetchInterval).toBe(15000)
    await orders.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/orders?status=pending&from=2026-03-01&to=2026-03-21&page=2&pageSize=20')

    const updateStatus = ordersHooks.useUpdateOrderStatus() as {
      mutationFn: (payload: { id: string; status: string }) => Promise<unknown>
      onSuccess: () => void
    }
    await updateStatus.mutationFn({ id: 'order-1', status: 'confirmed' })
    updateStatus.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })

    const createOrder = ordersHooks.useCreateOrder() as {
      mutationFn: (payload: unknown) => Promise<unknown>
      onSuccess: () => void
    }
    await createOrder.mutationFn({ items: [] })
    createOrder.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tables'] })

    const menuItems = ordersHooks.useMenuItems() as { queryFn: () => Promise<unknown> }
    await menuItems.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/menu-items')

    const createMenuItem = ordersHooks.useCreateMenuItem() as {
      mutationFn: (payload: unknown) => Promise<unknown>
      onSuccess: () => void
    }
    await createMenuItem.mutationFn({ name: 'Pizza', price: 50 })
    createMenuItem.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['menu-items'] })

    const metrics = ordersHooks.useSalesMetrics('month') as {
      queryFn: () => Promise<unknown>
      refetchInterval: number
    }
    expect(metrics.refetchInterval).toBe(30000)
    await metrics.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/sales/metrics?period=month')

    const kds = ordersHooks.useKDSOrders() as { queryFn: () => Promise<unknown>; refetchInterval: number }
    expect(kds.refetchInterval).toBe(10000)
    await kds.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/orders/kds')
  })

  it('configura hooks de plano', () => {
    const planQuery = planHooks.usePlan() as { queryKey: unknown; queryFn: () => Promise<unknown>; staleTime: number }
    expect(planQuery.queryKey).toEqual(['tenant-plan'])
    expect(planQuery.staleTime).toBe(1000 * 60 * 5)

    useQueryMock.mockReturnValueOnce({
      data: {
        features: ['reports'],
        max_users: 2,
        max_tables: 3,
        max_products: 4,
        resource_limits: {
          categories: 1,
          extras: -1,
          menu_items: 10,
        },
      },
    })
    expect(planHooks.useHasFeature('reports')).toBe(true)

    useQueryMock.mockReturnValueOnce({
      data: {
        features: [],
        max_users: 2,
        max_tables: 3,
        max_products: 4,
        resource_limits: {
          categories: 1,
          extras: -1,
          menu_items: 10,
        },
      },
    })
    expect(planHooks.useCanAddMore('extras', 999)).toBe(true)

    useQueryMock.mockReturnValueOnce({
      data: {
        features: [],
        max_users: 2,
        max_tables: 3,
        max_products: 4,
        resource_limits: {
          categories: 1,
          extras: -1,
          menu_items: 10,
        },
      },
    })
    expect(planHooks.useCanAddMore('categories', 1)).toBe(false)

    useQueryMock.mockReturnValueOnce({
      data: {
        features: [],
        max_users: 2,
        max_tables: 3,
        max_products: 4,
        resource_limits: {
          categories: 1,
          extras: -1,
          menu_items: 10,
        },
      },
    })
    expect(planHooks.useCanAddMore('users', 1)).toBe(true)
  })

  it('executa queryFn do hook de plano e propaga erro da api', async () => {
    const planQuery = planHooks.usePlan() as { queryFn: () => Promise<unknown> }

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ data: { plan: 'pro' } })
    )
    await expect(planQuery.queryFn()).resolves.toEqual({ plan: 'pro' })
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/plan')

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'falhou' }), { status: 500 })
    )
    await expect(planQuery.queryFn()).rejects.toThrow('falhou')
  })

  it('configura hooks de produtos e estoque', async () => {
    const products = productHooks.useProducts({ category_id: 'cat-1', active: true, page: 1, pageSize: 10 }) as {
      queryFn: () => Promise<unknown>
    }
    await products.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/products?category_id=cat-1&active=true&page=1&pageSize=10')

    const createProduct = productHooks.useCreateProduct() as { mutationFn: (payload: unknown) => Promise<unknown>; onSuccess: () => void }
    await createProduct.mutationFn({ name: 'Coca' })
    createProduct.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] })

    const updateProduct = productHooks.useUpdateProduct() as { mutationFn: (payload: { id: string }) => Promise<unknown>; onSuccess: () => void }
    await updateProduct.mutationFn({ id: 'prod-1' })
    updateProduct.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] })

    const categories = productHooks.useCategories() as { queryFn: () => Promise<unknown> }
    await categories.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/categories')

    const balance = stockHooks.useStockBalance({ category_id: 'cat-1', only_active: true }) as { queryFn: () => Promise<unknown> }
    await balance.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/stock/balance?category_id=cat-1&only_active=true')

    const alerts = stockHooks.useStockAlerts() as { queryFn: () => Promise<unknown> }
    await alerts.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/stock/alerts')

    const movements = stockHooks.useStockMovements({ product_id: 'prod-1' }) as { queryFn: () => Promise<unknown> }
    await movements.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/stock/movements?product_id=prod-1')

    const createMovement = stockHooks.useCreateMovement() as { mutationFn: (payload: unknown) => Promise<unknown>; onSuccess: () => void }
    await createMovement.mutationFn({ product_id: 'prod-1' })
    createMovement.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stock-alerts'] })

    const closeDay = stockHooks.useCloseDay() as { mutationFn: () => Promise<unknown>; onSuccess: () => void }
    await closeDay.mutationFn()
    closeDay.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stock-balance'] })
  })

  it('configura hooks de mesas, tabs e usuarios', async () => {
    const tables = tableHooks.useTables() as { queryFn: () => Promise<unknown>; refetchInterval: number }
    expect(tables.refetchInterval).toBe(15000)
    await tables.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/tables')

    const updateTable = tableHooks.useUpdateTable() as { mutationFn: (payload: { id: string }) => Promise<unknown>; onSuccess: () => void }
    await updateTable.mutationFn({ id: 'table-1' })
    updateTable.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tables'] })

    const deleteTable = tableHooks.useDeleteTable() as { mutationFn: (id: string) => Promise<unknown>; onSuccess: () => void }
    await deleteTable.mutationFn('table-1')
    deleteTable.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tables'] })

    const createTable = tableHooks.useCreateTable() as { mutationFn: (payload: unknown) => Promise<unknown>; onSuccess: () => void }
    await createTable.mutationFn({ number: '1' })
    createTable.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tables'] })

    const openSession = tableHooks.useOpenSession() as { mutationFn: (payload: unknown) => Promise<unknown>; onSuccess: () => void }
    await openSession.mutationFn({ table_id: 'table-1' })
    openSession.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tables'] })

    const closeSession = tableHooks.useCloseSession() as { mutationFn: (id: string) => Promise<unknown>; onSuccess: () => void }
    await closeSession.mutationFn('session-1')
    closeSession.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })

    const session = tableHooks.useSession('session-1') as { queryFn: () => Promise<unknown>; enabled: boolean; refetchInterval: number }
    expect(session.enabled).toBe(true)
    expect(session.refetchInterval).toBe(10000)
    await session.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/tables/sessions/session-1')

    const tabs = tabHooks.useTabs('closed') as { queryFn: () => Promise<unknown>; refetchInterval: number }
    expect(tabs.refetchInterval).toBe(15000)
    await tabs.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/tabs?status=closed')

    const createTab = tabHooks.useCreateTab() as { mutationFn: (payload: unknown) => Promise<unknown>; onSuccess: () => void }
    await createTab.mutationFn({ table_id: 'table-1' })
    createTab.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tabs'] })

    const closeTab = tabHooks.useCloseTab() as { mutationFn: (id: string) => Promise<unknown>; onSuccess: () => void }
    await closeTab.mutationFn('tab-1')
    closeTab.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })

    const users = userHooks.useUsers() as { queryFn: () => Promise<unknown> }
    await users.queryFn()
    expect(globalThis.fetch).toHaveBeenLastCalledWith('/api/users')

    const createUser = userHooks.useCreateUser() as { mutationFn: (payload: unknown) => Promise<unknown>; onSuccess: () => void }
    await createUser.mutationFn({ full_name: 'Felipe' })
    createUser.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tenant-plan'] })

    const updateUser = userHooks.useUpdateUserRole() as { mutationFn: (payload: { id: string; role: string }) => Promise<unknown>; onSuccess: () => void }
    await updateUser.mutationFn({ id: 'user-1', role: 'manager' })
    updateUser.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['team-users'] })

    const deleteUser = userHooks.useDeleteUser() as { mutationFn: (id: string) => Promise<unknown>; onSuccess: () => void }
    await deleteUser.mutationFn('user-1')
    deleteUser.onSuccess()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tenant-plan'] })
  })

  it('propaga erros de resposta nao ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'boom' }), { status: 500 })
    )

    const query = deliveryDrivers.useDeliveryDrivers() as { queryFn: () => Promise<unknown> }

    await expect(query.queryFn()).rejects.toThrow('boom')
  })
})
