import type { CartItem, CustomerAddress } from '@/features/orders/types'

export type MenuExtra = {
  id: string
  name: string
  price: number
  category: string
}

export type MenuCategory = {
  id: string
  name: string
}

export type PublicMenuItem = {
  id: string
  tenant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  available: boolean
  display_order: number
  category: MenuCategory | null
  extras: { extra: MenuExtra | null }[]
}

export type PublicOrderStatus = {
  id: string
  order_number: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'refunded'
  payment_method?: 'online' | 'table' | 'counter' | 'delivery'
  delivery_status?: 'waiting_dispatch' | 'assigned' | 'out_for_delivery' | 'delivered' | null
  delivery_driver?: { name: string } | null
  cancelled_reason?: string | null
  refunded_at?: string | null
  created_at: string
  updated_at: string
}

export type StoredActiveOrder = {
  id: string
  order_number: number
}

export type PublicCustomerLookupState = {
  phone: string
  phoneVerified: boolean
  existingCustomer: { id: string; name: string; phone: string } | null
  isNewCustomer: boolean
  customerName: string
}

export type PublicCheckoutStep = 'cart' | 'info' | 'address' | 'done'

type RawExtra = {
  extra:
    | { id: string; name: string; price: number; category: string }
    | { id: string; name: string; price: number; category: string }[]
    | null
}

type RawItem = PublicMenuItem & {
  image_url?: string | null
  created_at?: string
  updated_at?: string
  category: { id: string; name: string } | { id: string; name: string }[] | null
  extras: RawExtra[]
}

export function getActiveOrderStorageKey(tenantSlug: string, tableId?: string | null) {
  return `chefops:active-order:${tenantSlug}:${tableId ?? 'no-table'}`
}

export function getPhoneChangeState(value: string): PublicCustomerLookupState {
  return {
    phone: formatPhone(value),
    phoneVerified: false,
    existingCustomer: null,
    isNewCustomer: false,
    customerName: '',
  }
}

export function getLookupCustomerFoundState(customer: {
  id: string
  name: string
  phone: string
}) {
  return {
    existingCustomer: customer,
    customerName: customer.name,
    isNewCustomer: false,
    phoneVerified: true,
  }
}

export function getLookupCustomerMissingState() {
  return {
    existingCustomer: null,
    customerName: '',
    isNewCustomer: true,
    phoneVerified: true,
  }
}

export function createCartItem(
  item: PublicMenuItem,
  selectedBorder?: MenuExtra | null,
  halfFlavor?: PublicMenuItem
) {
  const itemName = halfFlavor ? `${item.name} / ${halfFlavor.name}` : item.name

  return {
    menu_item_id: item.id,
    name: itemName,
    price: halfFlavor ? Math.max(item.price, halfFlavor.price) : item.price,
    quantity: 1,
    extras: selectedBorder ? [{ name: selectedBorder.name, price: selectedBorder.price }] : [],
    half_flavor: halfFlavor ? { menu_item_id: halfFlavor.id, name: halfFlavor.name } : undefined,
  } satisfies CartItem
}

export function incrementCartItem(cart: CartItem[], index: number) {
  return cart.map((item, idx) => (idx === index ? { ...item, quantity: item.quantity + 1 } : item))
}

export function decrementCartItem(cart: CartItem[], index: number) {
  const item = cart[index]
  if (!item) return cart

  if (item.quantity > 1) {
    return cart.map((entry, idx) => (idx === index ? { ...entry, quantity: entry.quantity - 1 } : entry))
  }

  return cart.filter((_, idx) => idx !== index)
}

export function removeCartItem(cart: CartItem[], index: number) {
  return cart.filter((_, idx) => idx !== index)
}

export function getCheckoutNoticeFromResult(checkoutResult: string | null) {
  if (checkoutResult === 'pending') {
    return 'Pagamento pendente. Assim que confirmar, seu pedido sera enviado.'
  }

  if (checkoutResult === 'failure') {
    return 'O pagamento nao foi concluido. Tente novamente.'
  }

  return null
}

export function createPublicOrderStatusFromCheckout(data: {
  created_order_id?: string | null
  order_number?: number | null
  order_status?: PublicOrderStatus['status'] | null
  payment_status?: PublicOrderStatus['payment_status'] | null
}) {
  if (!data.created_order_id || !data.order_number) return null

  const now = new Date().toISOString()

  return {
    id: data.created_order_id,
    order_number: data.order_number,
    status: data.order_status ?? 'pending',
    payment_status: data.payment_status ?? 'paid',
    payment_method: 'online',
    delivery_status: null,
    created_at: now,
    updated_at: now,
  } satisfies PublicOrderStatus
}

export function createPublicOrderStatusFromOrder(data: {
  id: string
  order_number: number
  status: PublicOrderStatus['status']
  payment_status: PublicOrderStatus['payment_status']
  payment_method?: PublicOrderStatus['payment_method']
  delivery_status?: PublicOrderStatus['delivery_status']
  created_at: string
  updated_at: string
}) {
  return {
    id: data.id,
    order_number: data.order_number,
    status: data.status,
    payment_status: data.payment_status,
    payment_method: data.payment_method,
    delivery_status: data.delivery_status ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } satisfies PublicOrderStatus
}

export function getSuccessfulPublicOrderState(params: {
  orderId: string
  orderNumber: number
  publicOrderStatus: PublicOrderStatus
}) {
  return {
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    publicOrderStatus: params.publicOrderStatus,
    checkoutStep: 'done' as const,
    cart: [] as CartItem[],
  }
}

export function getCartDrawerState(checkoutStep: PublicCheckoutStep) {
  return {
    cartOpen: true,
    checkoutStep,
  }
}

export function getTrackOrderState() {
  return getCartDrawerState('done')
}

export function getOpenCartState() {
  return getCartDrawerState('cart')
}

export function getCheckoutConvertedNotice() {
  return 'Pagamento confirmado. Pedido enviado para o estabelecimento.'
}

export function getCreatedPublicOrderNotice(
  paymentStatus?: PublicOrderStatus['payment_status'] | null,
  paymentMethod?: PublicOrderStatus['payment_method'] | null
) {
  if (paymentStatus === 'paid') {
    return getCheckoutConvertedNotice()
  }

  if (paymentMethod === 'delivery') {
    return 'Pedido enviado para o estabelecimento. O pagamento será realizado na entrega.'
  }

  if (paymentMethod === 'counter' || paymentMethod === 'table') {
    return 'Pedido enviado para o estabelecimento. O pagamento será realizado no local.'
  }

  return 'Pedido enviado para o estabelecimento.'
}

export function getCheckoutPollingErrorNotice() {
  return 'Nao foi possivel consultar o status do pagamento agora.'
}

export function getConvertedCheckoutState(params: {
  orderId: string
  orderNumber: number
  publicOrderStatus: PublicOrderStatus
}) {
  return {
    ...getSuccessfulPublicOrderState(params),
    ...getTrackOrderState(),
    checkoutNotice: getCheckoutConvertedNotice(),
  }
}

export function shouldContinueCheckoutPolling(status?: string | null, attempts = 0, maxAttempts = 10) {
  return status !== 'converted' && attempts < maxAttempts
}

export function shouldContinueOrderPolling(status?: PublicOrderStatus['status'] | null) {
  return !!status && !['delivered', 'cancelled'].includes(status)
}

export function shouldPersistActiveOrder(status?: PublicOrderStatus['status'] | null) {
  return !!status && !['delivered', 'cancelled'].includes(status)
}

export function serializeStoredActiveOrder(orderId: string, orderNumber: number) {
  return JSON.stringify({
    id: orderId,
    order_number: orderNumber,
  } satisfies StoredActiveOrder)
}

export function parseStoredActiveOrder(raw: string | null) {
  if (!raw) return null

  try {
    const stored = JSON.parse(raw) as StoredActiveOrder
    if (!stored?.id || typeof stored.order_number !== 'number') {
      return null
    }

    return stored
  } catch {
    return null
  }
}

export function getPublicCheckoutProcessingState(
  createOrderPending: boolean,
  onlineCheckoutLoading: boolean
) {
  return createOrderPending || onlineCheckoutLoading
}

export function getOrderSteps(
  tableInfo: { id: string; number: string } | null,
  paymentMethod?: PublicOrderStatus['payment_method'] | null
) {
  const readyDescription = tableInfo
    ? 'Seu pedido está pronto para servir.'
    : paymentMethod === 'delivery'
      ? 'Seu pedido está pronto para sair para entrega.'
      : 'Seu pedido está pronto para retirada.'
  const deliveredDescription = tableInfo
    ? 'Pedido servido na mesa com sucesso.'
    : paymentMethod === 'delivery'
      ? 'Pedido entregue com sucesso.'
      : 'Pedido retirado com sucesso.'

  return [
    { key: 'pending', label: 'Recebido', description: 'Seu pedido entrou na fila do estabelecimento.' },
    { key: 'confirmed', label: 'Confirmado', description: 'O estabelecimento confirmou seu pedido.' },
    { key: 'preparing', label: 'Em preparo', description: 'Seu pedido está sendo preparado.' },
    {
      key: 'ready',
      label: 'Pronto',
      description: readyDescription,
    },
    { key: 'delivered', label: 'Entregue', description: deliveredDescription },
  ] as const satisfies Array<{
    key: PublicOrderStatus['status']
    label: string
    description: string
  }>
}

export function getCheckoutStepTitle(step: 'cart' | 'info' | 'address' | 'done') {
  if (step === 'cart') return 'Seu pedido'
  if (step === 'info') return 'Seus dados'
  if (step === 'address') return 'Endereço de entrega'
  return 'Pedido realizado!'
}

export function getPublicOrderReferenceLabel(params: {
  tableInfo: { id: string; number: string } | null
  paymentMethod?: PublicOrderStatus['payment_method'] | null
}) {
  if (params.tableInfo) return 'Número da comanda'
  if (params.paymentMethod === 'counter') return 'Número para retirada'
  return 'Número do pedido'
}

export function getPublicOrderCompletionTitle(params: {
  tableInfo: { id: string; number: string } | null
  paymentMethod?: PublicOrderStatus['payment_method'] | null
}) {
  if (params.tableInfo) return 'Comanda aberta!'
  if (params.paymentMethod === 'counter') return 'Pedido pronto para retirada!'
  return 'Pedido realizado!'
}

export function getPublicOrderCompletionSubtitle(params: {
  tableInfo: { id: string; number: string } | null
  paymentMethod?: PublicOrderStatus['payment_method'] | null
}) {
  if (params.tableInfo) return 'Acompanhe a comanda da sua mesa.'
  if (params.paymentMethod === 'counter') return 'Use este número para retirar o pedido.'
  return 'Acompanhe o andamento do pedido até a entrega.'
}

export function getPublicOrderCompletionCloseLabel(params: {
  tableInfo: { id: string; number: string } | null
  paymentMethod?: PublicOrderStatus['payment_method'] | null
}) {
  if (params.tableInfo || params.paymentMethod === 'counter') {
    return 'Voltar ao cardápio'
  }

  return 'Acompanhar depois'
}

export function getPublicOrderProgressTitle(params: {
  tableInfo: { id: string; number: string } | null
  paymentMethod?: PublicOrderStatus['payment_method'] | null
}) {
  if (params.tableInfo) return 'Acompanhe a comanda'
  if (params.paymentMethod === 'counter') return 'Acompanhe a retirada'
  return 'Acompanhe o status do pedido'
}

export function getPublicOrderPaymentLabel(paymentMethod?: PublicOrderStatus['payment_method'] | null) {
  if (paymentMethod === 'table') return 'Pagamento no local'
  if (paymentMethod === 'counter') return 'Pagamento na retirada'
  if (paymentMethod === 'delivery') return 'Pagamento na entrega'
  if (paymentMethod === 'online') return 'Pagamento online'
  return 'Pagamento'
}

export function getContinueFlowTarget(
  paymentMethod: string,
  tableInfo: { id: string; number: string } | null
) {
  if (paymentMethod === 'online') {
    return tableInfo ? 'online-checkout' : 'address'
  }

  return tableInfo ? 'place-order' : 'address'
}

export function getAddressFlowTarget(paymentMethod: string) {
  return paymentMethod === 'online' ? 'online-checkout' : 'place-order'
}

export function buildPublicCheckoutPayload(params: {
  tenantId: string
  tenantSlug: string
  customerName: string
  phone: string
  customerCpf: string
  tableInfo: { id: string; number: string } | null
  notes: string
  deliveryFee: number
  deliveryAddress?: Partial<CustomerAddress>
  items: CartItem[]
}) {
  return {
    tenant_id: params.tenantId,
    tenant_slug: params.tenantSlug,
    customer_name: params.customerName,
    customer_phone: params.phone.replace(/\D/g, '') || undefined,
    customer_cpf: params.customerCpf || undefined,
    table_number: params.tableInfo?.number,
    table_id: params.tableInfo?.id,
    notes: params.notes || undefined,
    delivery_fee: params.deliveryFee,
    delivery_address: params.deliveryAddress?.zip_code ? params.deliveryAddress as CustomerAddress : undefined,
    items: params.items,
  }
}

export function resolvePublicCheckoutUrl(data?: {
  checkout_url?: string | null
  sandbox_init_point?: string | null
  init_point?: string | null
} | null) {
  return data?.checkout_url || data?.sandbox_init_point || data?.init_point || null
}

export function buildPublicOrderPayload(params: {
  tenantId: string
  customerName: string
  customerCpf: string
  phone: string
  customerId?: string
  tableInfo: { id: string; number: string } | null
  paymentMethod: 'online' | 'table' | 'counter' | 'delivery'
  notes: string
  deliveryFee: number
  deliveryAddress?: Partial<CustomerAddress>
  items: CartItem[]
}) {
  return {
    tenant_id: params.tenantId,
    customer_name: params.customerName,
    customer_cpf: params.customerCpf || undefined,
    customer_phone: params.phone.replace(/\D/g, '') || undefined,
    customer_id: params.customerId,
    table_number: params.tableInfo?.number,
    table_id: params.tableInfo?.id,
    payment_method: params.paymentMethod,
    notes: params.notes || undefined,
    delivery_fee: params.deliveryFee,
    delivery_address: params.deliveryAddress?.zip_code ? params.deliveryAddress as CustomerAddress : undefined,
    items: params.items,
  }
}

export function getHalfFlavorOptions(items: PublicMenuItem[], selectedItem: PublicMenuItem) {
  return items.filter((item) => item.category?.id === selectedItem.category?.id && item.id !== selectedItem.id)
}

export function getCartItemLineTotal(item: CartItem) {
  const extras = item.extras?.reduce((sum, extra) => sum + extra.price, 0) ?? 0
  return (item.price + extras) * item.quantity
}

export function getCustomerBannerState(
  isPaidPlan: boolean,
  existingCustomer: { id: string } | null,
  isNewCustomer: boolean
) {
  if (!isPaidPlan) return null
  if (existingCustomer) return 'existing'
  if (isNewCustomer) return 'new'
  return null
}

export function shouldRequirePhoneVerification(
  isPaidPlan: boolean,
  tableInfo: { id: string; number: string } | null
) {
  return isPaidPlan && !tableInfo
}

export function getInfoContinueLabel(isProcessing: boolean) {
  return isProcessing ? 'Processando...' : 'Continuar'
}

export function getAddressSubmitLabel(paymentMethod: string, isProcessing: boolean) {
  if (isProcessing) return 'Processando...'
  return paymentMethod === 'online' ? 'Ir para pagamento' : 'Fazer pedido'
}

export function getPublicOrderHeadline(
  publicOrderStatus: PublicOrderStatus | null,
  orderSteps: ReadonlyArray<{ key: PublicOrderStatus['status']; label: string }>
) {
  if (!publicOrderStatus) return null

  if (publicOrderStatus.payment_method === 'counter' && publicOrderStatus.status === 'ready') {
    return 'pronto para retirada'
  }

  return orderSteps.find((step) => step.key === publicOrderStatus.status)?.label.toLowerCase() ?? 'andamento'
}

export function getCancelledOrderMessage(publicOrderStatus: PublicOrderStatus | null) {
  return publicOrderStatus?.cancelled_reason ?? 'O pedido foi cancelado.'
}

export function getCancelSuccessNotice(paymentStatus: PublicOrderStatus['payment_status']) {
  return paymentStatus === 'refunded'
    ? 'Pedido cancelado e reembolso solicitado com sucesso.'
    : 'Pedido cancelado com sucesso.'
}

export function buildPublicOrderCancelPayload(reason: string) {
  return {
    cancelled_reason: reason.trim() || 'Cancelado pelo cliente',
  }
}

export function getOnlineCheckoutErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao iniciar pagamento online.'
}

export function getPublicOrderPlacementErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao fazer pedido.'
}

export function getCancelOrderErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao cancelar pedido.'
}

export function getPublicOrderTrackingMessage(
  publicOrderStatus: PublicOrderStatus,
  headline: string
) {
  if (publicOrderStatus.status === 'pending') return 'Seu pedido foi recebido.'
  if (publicOrderStatus.status === 'confirmed') return 'Seu pedido foi confirmado.'
  if (publicOrderStatus.status === 'preparing') return 'Seu pedido está em preparo.'
  if (publicOrderStatus.status === 'delivered') return 'Seu pedido foi entregue.'
  if (publicOrderStatus.status === 'cancelled') {
    return publicOrderStatus.payment_status === 'refunded'
      ? 'Seu pedido foi cancelado e o reembolso foi solicitado.'
      : 'Seu pedido foi cancelado.'
  }
  if (
    publicOrderStatus.payment_method === 'delivery' &&
    publicOrderStatus.status === 'ready' &&
    publicOrderStatus.delivery_status === 'out_for_delivery'
  ) {
    return 'Seu pedido saiu para entrega.'
  }
  if (publicOrderStatus.payment_method === 'counter' && publicOrderStatus.status === 'ready') {
    return 'Seu pedido está pronto para retirada.'
  }
  if (publicOrderStatus.status === 'ready') return 'Seu pedido está pronto.'
  return `Seu pedido está em ${headline}.`
}

export function getPublicOrderStatusCardTitle(publicOrderStatus: PublicOrderStatus) {
  if (publicOrderStatus.status === 'pending') return `Pedido recebido #${publicOrderStatus.order_number}`
  if (publicOrderStatus.status === 'confirmed') return `Pedido confirmado #${publicOrderStatus.order_number}`
  if (publicOrderStatus.status === 'preparing') return `Pedido em preparo #${publicOrderStatus.order_number}`
  if (publicOrderStatus.payment_method === 'counter' && publicOrderStatus.status === 'ready') {
    return `Pedido pronto para retirada #${publicOrderStatus.order_number}`
  }
  if (
    publicOrderStatus.payment_method === 'delivery' &&
    publicOrderStatus.status === 'ready' &&
    publicOrderStatus.delivery_status === 'out_for_delivery'
  ) {
    return `Pedido saiu para entrega #${publicOrderStatus.order_number}`
  }
  if (publicOrderStatus.status === 'ready') return `Pedido pronto #${publicOrderStatus.order_number}`
  return `Pedido #${publicOrderStatus.order_number}`
}

export function getPublicOrderStatusCardMessage(publicOrderStatus: PublicOrderStatus) {
  if (publicOrderStatus.status === 'pending') {
    return 'Seu pedido entrou na fila do estabelecimento.'
  }

  if (publicOrderStatus.status === 'confirmed') {
    return 'O estabelecimento confirmou seu pedido.'
  }

  if (publicOrderStatus.status === 'preparing') {
    return 'Seu pedido está sendo preparado.'
  }

  if (
    publicOrderStatus.payment_method === 'delivery' &&
    publicOrderStatus.status === 'ready' &&
    publicOrderStatus.delivery_status === 'out_for_delivery'
  ) {
    return 'Acompanhe o deslocamento da entrega.'
  }

  if (publicOrderStatus.payment_method === 'counter' && publicOrderStatus.status === 'ready') {
    return 'Seu pedido está aguardando retirada.'
  }

  if (publicOrderStatus.status === 'ready') {
    return 'Seu pedido está pronto para a próxima etapa.'
  }

  return 'Acompanhe o andamento do seu pedido.'
}

export function getPublicOrderStatusCardActionLabel(publicOrderStatus: PublicOrderStatus) {
  if (
    publicOrderStatus.payment_method === 'delivery' &&
    publicOrderStatus.status === 'ready' &&
    publicOrderStatus.delivery_status === 'out_for_delivery'
  ) {
    return 'Ver entrega'
  }

  return 'Ver pedido'
}

export function getPublicOrderStatusCardTone(publicOrderStatus: PublicOrderStatus) {
  if (publicOrderStatus.status === 'pending') return 'warning'

  if (
    publicOrderStatus.payment_method === 'delivery' &&
    publicOrderStatus.status === 'ready' &&
    publicOrderStatus.delivery_status === 'out_for_delivery'
  ) {
    return 'delivery'
  }

  if (publicOrderStatus.status === 'confirmed' || publicOrderStatus.status === 'preparing') {
    return 'progress'
  }

  return 'success'
}

export function getPublicOrderStatusNotice(publicOrderStatus: PublicOrderStatus | null) {
  if (!publicOrderStatus) return null
  if (publicOrderStatus.status === 'cancelled') {
    return publicOrderStatus.payment_status === 'refunded'
      ? 'Pedido cancelado e reembolso solicitado com sucesso.'
      : 'Pedido cancelado.'
  }
  if (publicOrderStatus.status === 'confirmed') {
    return 'Seu pedido foi confirmado pelo estabelecimento.'
  }
  if (publicOrderStatus.status === 'preparing') {
    return 'Seu pedido está em preparo.'
  }
  if (publicOrderStatus.status === 'ready') {
    if (
      publicOrderStatus.payment_method === 'delivery' &&
      publicOrderStatus.delivery_status === 'out_for_delivery'
    ) {
      return 'Seu pedido saiu para entrega.'
    }

    if (publicOrderStatus.payment_method === 'counter') {
      return 'Seu pedido está pronto para retirada.'
    }

    return 'Seu pedido está pronto.'
  }
  if (publicOrderStatus.status === 'delivered') return 'Pedido entregue com sucesso.'

  return null
}

export function getPaymentStatusLabel(
  paymentStatus?: PublicOrderStatus['payment_status'] | null,
  paymentMethod?: PublicOrderStatus['payment_method'] | null
) {
  if (paymentStatus === 'paid') return 'Aprovado'
  if (paymentStatus === 'refunded') return 'Reembolsado'
  if (paymentMethod === 'delivery') return 'Na entrega'
  if (paymentMethod === 'counter' || paymentMethod === 'table') return 'No local'
  return 'Pendente'
}

export function shouldShowCancelOrderButton(status?: PublicOrderStatus['status'] | null) {
  return ['pending', 'confirmed'].includes(status ?? '')
}

export function shouldShowDeliveryStep(publicOrderStatus: PublicOrderStatus | null) {
  return publicOrderStatus?.payment_method === 'delivery' && publicOrderStatus.status === 'ready'
}

export function isDeliveryStepCompleted(publicOrderStatus: PublicOrderStatus | null) {
  return publicOrderStatus?.delivery_status === 'out_for_delivery' || publicOrderStatus?.delivery_status === 'delivered'
}

export function getDeliveryStepMessage(publicOrderStatus: PublicOrderStatus | null) {
  if (isDeliveryStepCompleted(publicOrderStatus)) {
    return `Seu pedido saiu para entrega${publicOrderStatus?.delivery_driver?.name ? ` com ${publicOrderStatus.delivery_driver.name}` : ''}.`
  }

  return 'Seu pedido vai aparecer aqui quando sair para entrega.'
}

export function shouldShowPublicDeliveryConfirmButton(publicOrderStatus: PublicOrderStatus | null) {
  return (
    publicOrderStatus?.payment_method === 'delivery' &&
    publicOrderStatus?.status === 'ready' &&
    publicOrderStatus?.delivery_status === 'out_for_delivery'
  )
}

export function getCheckoutNoticeTone(publicOrderStatus: PublicOrderStatus | null) {
  if (publicOrderStatus?.status === 'cancelled') {
    return 'danger'
  }

  if (publicOrderStatus?.status === 'delivered') {
    return 'success'
  }

  return 'info'
}

export function shouldShowCheckoutNoticeBanner(params: {
  checkoutNotice: string | null
  publicOrderStatus: PublicOrderStatus | null
  cartOpen: boolean
}) {
  if (!params.checkoutNotice) return false
  if (params.cartOpen) return true
  if (!params.publicOrderStatus) return true
  if (['delivered', 'cancelled'].includes(params.publicOrderStatus.status)) return true

  const statusNotice = getPublicOrderStatusNotice(params.publicOrderStatus)
  if (statusNotice && statusNotice === params.checkoutNotice) {
    return false
  }

  return true
}

export function formatPhone(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function formatCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatCEP(value: string) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

export function validateCPF(cpf: string) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false

  let s = 0
  for (let i = 0; i < 9; i += 1) s += parseInt(d[i]) * (10 - i)
  let c = 11 - (s % 11)
  if (c >= 10) c = 0
  if (c !== parseInt(d[9])) return false

  s = 0
  for (let i = 0; i < 10; i += 1) s += parseInt(d[i]) * (11 - i)
  c = 11 - (s % 11)
  if (c >= 10) c = 0

  return c === parseInt(d[10])
}

export const paymentOptionsByContext = {
  table: [
    { value: 'table', label: 'Pagar na mesa' },
    { value: 'counter', label: 'Pagar no caixa' },
    { value: 'online', label: 'Pagar online' },
  ],
  online: [
    { value: 'online', label: 'Pagar online' },
    { value: 'delivery', label: 'Pagar na entrega' },
  ],
}

export function groupMenuItems(items: PublicMenuItem[]) {
  const grouped: Record<string, { category: MenuCategory | null; items: PublicMenuItem[] }> = {}

  for (const item of items) {
    const key = item.category?.id ?? 'outros'
    if (!grouped[key]) {
      grouped[key] = { category: item.category ?? null, items: [] }
    }
    grouped[key].items.push(item)
  }

  return Object.values(grouped)
}

export function filterGroupsByCategory(
  groups: Array<{ category: MenuCategory | null; items: PublicMenuItem[] }>,
  activeCategory: string | null
) {
  if (!activeCategory) return groups
  return groups.filter(({ category }) => (category?.id ?? 'outros') === activeCategory)
}

export function getCartTotals(
  cart: CartItem[],
  tableInfo: { id: string; number: string } | null,
  deliverySettings?: { delivery_enabled: boolean; flat_fee: number } | null
) {
  const cartTotal = cart.reduce((sum, item) => {
    const extras = item.extras?.reduce((inner, extra) => inner + extra.price, 0) ?? 0
    return sum + (item.price + extras) * item.quantity
  }, 0)

  const deliveryFee =
    !tableInfo && deliverySettings?.delivery_enabled
      ? Number(deliverySettings.flat_fee ?? 0)
      : 0

  const orderTotal = cartTotal + deliveryFee
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return { cartTotal, deliveryFee, orderTotal, cartCount }
}

export function getBorders(item: PublicMenuItem) {
  return item.extras
    .filter((entry) => entry.extra?.category === 'border')
    .map((entry) => entry.extra!)
}

export function validateCustomerInfo(
  customerName: string,
  phone: string,
  customerCpf: string,
  tableInfo: { id: string; number: string } | null,
  paymentMethod?: string
) {
  const errors: Record<string, string> = {}

  if (!customerName.trim() || customerName.trim().length < 2) {
    errors.name = 'Nome obrigatório'
  }
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Telefone inválido'
  }
  if (tableInfo && (!customerCpf || !validateCPF(customerCpf))) {
    errors.cpf = 'CPF inválido'
  }
  if (!paymentMethod) {
    errors.payment_method = 'Selecione uma forma de pagamento'
  }

  return errors
}

export function validateCustomerAddress(address: Partial<CustomerAddress>) {
  const errors: Record<string, string> = {}
  if (!address.zip_code) errors.zip_code = 'CEP obrigatório'
  if (!address.street) errors.street = 'Rua obrigatória'
  if (!address.number) errors.number = 'Número obrigatório'
  if (!address.city) errors.city = 'Cidade obrigatória'
  return errors
}

export function getValidationErrorToastMessage(errors: Record<string, string>) {
  const messages = Object.values(errors).filter(Boolean)
  if (messages.length === 0) {
    return 'Confira os campos obrigatórios antes de continuar.'
  }

  return `Confira os campos obrigatórios: ${messages.join(', ')}`
}

export function getOrderStepState(
  currentStatus: PublicOrderStatus['status'] | null,
  stepKeys: PublicOrderStatus['status'][],
  stepKey: PublicOrderStatus['status']
) {
  if (!currentStatus || currentStatus === 'cancelled') return 'upcoming'

  const currentIndex = stepKeys.findIndex((item) => item === currentStatus)
  const stepIndex = stepKeys.findIndex((item) => item === stepKey)

  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

export function normalizePublicMenuItems(rawItems: RawItem[]) {
  return rawItems.map((item) => {
    const category = Array.isArray(item.category) ? (item.category[0] ?? null) : (item.category ?? null)
    const extras = (item.extras ?? [])
      .map((entry) => {
        const extra = Array.isArray(entry.extra) ? (entry.extra[0] ?? null) : (entry.extra ?? null)
        return { extra }
      })
      .filter((entry) => entry.extra !== null)

    return { ...item, category, extras }
  })
}

export function normalizeTenantDeliverySettings(
  value: { delivery_enabled: boolean; flat_fee: number } | { delivery_enabled: boolean; flat_fee: number }[] | null
) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}
