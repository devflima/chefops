import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

let capturedHeaderProps: Record<string, unknown> | null = null
let capturedFiltersProps: Record<string, unknown> | null = null
let capturedListProps: Record<string, unknown> | null = null
let capturedDialogProps: Record<string, unknown> | null = null

vi.mock('@/features/orders/OrdersDashboardHeader', () => ({
  OrdersDashboardHeader: (props: Record<string, unknown>) => {
    capturedHeaderProps = props
    return React.createElement('div', null, 'Orders Header Mock')
  },
}))

vi.mock('@/features/orders/OrdersFilters', () => ({
  OrdersFilters: (props: Record<string, unknown>) => {
    capturedFiltersProps = props
    return React.createElement('div', null, 'Orders Filters Mock')
  },
}))

vi.mock('@/features/orders/OrdersListSection', () => ({
  OrdersListSection: (props: Record<string, unknown>) => {
    capturedListProps = props
    return React.createElement('div', null, 'Orders List Mock')
  },
}))

vi.mock('@/features/orders/components/ManualOrderDialog', () => ({
  default: (props: Record<string, unknown>) => {
    capturedDialogProps = props
    return React.createElement('div', null, 'Manual Order Dialog Mock')
  },
}))

describe('OrdersPageContent', () => {
  beforeEach(() => {
    capturedHeaderProps = null
    capturedFiltersProps = null
    capturedListProps = null
    capturedDialogProps = null
  })

  it('encaminha props e ações para os blocos filhos', async () => {
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
      tenant_id: 'tenant-1',
      customer_name: 'Maria',
      customer_phone: '11999999999',
      items: [],
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
      created_at: '2026-03-22T00:00:00.000Z',
      updated_at: '2026-03-22T00:00:00.000Z',
    }

    const markup = renderToStaticMarkup(
      React.createElement(OrdersPageContent, {
        manualOrderOpen: true,
        onManualOrderOpenChange,
        filters: [{ label: 'Todos', value: '' }],
        statusFilter: 'pending',
        onStatusFilterChange,
        isLoading: false,
        orders: [order] as never,
        totalCount: 1,
        page: 2,
        pageSize: 10,
        onPageChange,
        deliveryDrivers: [{ id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true }],
        hasWhatsappNotifications: true,
        updatePending: false,
        chargingOrderId: null,
        onAssignDriver,
        onAdvance,
        onAdvanceDelivery,
        onMercadoPagoCheckout,
        onConfirmPayment,
        onCancel,
      }),
    )

    expect(markup).toContain('Orders Header Mock')
    expect(markup).toContain('Orders Filters Mock')
    expect(markup).toContain('Orders List Mock')
    expect(markup).toContain('Manual Order Dialog Mock')

    expect(capturedHeaderProps).toBeTruthy()
    expect(capturedFiltersProps).toBeTruthy()
    expect(capturedListProps).toBeTruthy()
    expect(capturedDialogProps).toBeTruthy()

    ;(capturedHeaderProps as { onCreate: () => void }).onCreate()
    ;(capturedFiltersProps as { onChange: (value: string) => void }).onChange('ready')

    expect(onManualOrderOpenChange).toHaveBeenCalledWith(true)
    expect(onStatusFilterChange).toHaveBeenCalledWith('ready')

    expect(capturedListProps).toMatchObject({
      isLoading: false,
      orders: [order],
      totalCount: 1,
      page: 2,
      pageSize: 10,
      deliveryDrivers: [{ id: 'driver-1', name: 'João', vehicle_type: 'bike', active: true }],
      hasWhatsappNotifications: true,
      updatePending: false,
      chargingOrderId: null,
      onPageChange,
      onAssignDriver,
      onAdvance,
      onAdvanceDelivery,
      onMercadoPagoCheckout,
      onConfirmPayment,
      onCancel,
    })

    expect(capturedDialogProps).toMatchObject({
      open: true,
      onOpenChange: onManualOrderOpenChange,
    })
  })
})
