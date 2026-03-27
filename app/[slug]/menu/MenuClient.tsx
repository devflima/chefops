'use client'

import { useEffect, useState } from 'react'
import { useCreatePublicOrder } from '@/features/orders/hooks/useOrders'
import type { CartItem, CustomerAddress } from '@/features/orders/types'
import { toast } from 'sonner'
import {
  buildPublicOrderCancelPayload,
  createCartItem,
  createPublicOrderStatusFromCheckout,
  createPublicOrderStatusFromOrder,
  decrementCartItem,
  filterGroupsByCategory,
  formatCPF,
  getActiveOrderStorageKey,
  getCancelOrderErrorMessage,
  getCancelSuccessNotice,
  getCartDrawerState,
  getCartTotals,
  getConvertedCheckoutState,
  getCheckoutPollingErrorNotice,
  getCheckoutStepTitle,
  getCheckoutNoticeFromResult,
  getCreatedPublicOrderNotice,
  getContinueFlowTarget,
  getHalfFlavorOptions,
  getOrderStepState,
  getOrderSteps,
  getPhoneChangeState,
  getPublicOrderPlacementErrorMessage,
  getPublicOrderHeadline,
  getPublicOrderStatusNotice,
  getOpenCartState,
  getSuccessfulPublicOrderState,
  groupMenuItems,
  incrementCartItem,
  getLookupCustomerFoundState,
  getLookupCustomerMissingState,
  getOnlineCheckoutErrorMessage,
  getPublicCheckoutProcessingState,
  paymentOptionsByContext,
  buildPublicCheckoutPayload,
  buildPublicOrderPayload,
  parseStoredActiveOrder,
  type MenuExtra,
  type PublicMenuItem as MenuItem,
  type PublicOrderStatus,
  removeCartItem,
  resolvePublicCheckoutUrl,
  serializeStoredActiveOrder,
  getAddressFlowTarget,
  getTrackOrderState,
  shouldContinueCheckoutPolling,
  shouldContinueOrderPolling,
  shouldPersistActiveOrder,
  validateCustomerAddress,
  validateCustomerInfo,
} from '@/features/menu/public-menu'
import { PublicMenuPageShell } from '@/features/menu/PublicMenuPageShell'

type Props = {
  tenant: {
    id: string
    name: string
    slug: string
    plan: string
    delivery_settings?: {
      delivery_enabled: boolean
      flat_fee: number
    } | null
  }
  items: MenuItem[]
  tableInfo: { id: string; number: string } | null
  checkoutSessionId: string | null
  checkoutResult: string | null
}

type Customer = {
  id: string
  name: string
  phone: string
  addresses?: CustomerAddress[]
}

export default function MenuClient({
  tenant,
  items,
  tableInfo,
  checkoutSessionId,
  checkoutResult,
}: Props) {
  const isPaidPlan = tenant.plan !== 'free'

  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'info' | 'address' | 'done'>('cart')
  const [halfFlavorModal, setHalfFlavorModal] = useState<{ item: MenuItem } | null>(null)
  const [selectedBorders, setSelectedBorders] = useState<Record<string, MenuExtra | null>>({})
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerCpf, setCustomerCpf] = useState('')
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [lookingUpPhone, setLookingUpPhone] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [address, setAddress] = useState<Partial<CustomerAddress>>({})
  const [loadingCep, setLoadingCep] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>(tableInfo ? 'table' : '')
  const [notes, setNotes] = useState('')
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [onlineCheckoutLoading, setOnlineCheckoutLoading] = useState(false)
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null)
  const [publicOrderStatus, setPublicOrderStatus] = useState<PublicOrderStatus | null>(null)
  const [cancelOrderLoading, setCancelOrderLoading] = useState(false)
  const [confirmDeliveryLoading, setConfirmDeliveryLoading] = useState(false)
  const activeOrderStorageKey = getActiveOrderStorageKey(tenant.slug, tableInfo?.id)

  const createOrder = useCreatePublicOrder()
  const paymentOptions = tableInfo ? paymentOptionsByContext.table : paymentOptionsByContext.online

  const groupedValues = groupMenuItems(items)
  const filteredGroups = filterGroupsByCategory(groupedValues, activeCategory)
  const { cartTotal, deliveryFee, orderTotal, cartCount } = getCartTotals(
    cart,
    tableInfo,
    tenant.delivery_settings,
  )

  function addToCart(item: MenuItem, halfFlavor?: MenuItem) {
    const border = selectedBorders[item.id] ?? null
    const cartItem = createCartItem(item, border, halfFlavor)

    setCart((prev) => [...prev, cartItem])
    setSelectedBorders((prev) => ({ ...prev, [item.id]: null }))
    setHalfFlavorModal(null)
    toast.success(`${cartItem.name} adicionado ao carrinho`, {
      description: `Agora voce tem ${cartCount + 1} item(ns) no carrinho.`,
      action: {
        label: 'Ver carrinho',
        onClick: () => {
          const nextState = getOpenCartState()
          setCartOpen(nextState.cartOpen)
          setCheckoutStep(nextState.checkoutStep)
        },
      },
    })
  }

  function incrementCart(index: number) {
    setCart((prev) => incrementCartItem(prev, index))
  }

  function decrementCart(index: number) {
    setCart((prev) => decrementCartItem(prev, index))
  }

  function removeFromCart(index: number) {
    setCart((prev) => removeCartItem(prev, index))
  }

  function clearCart() {
    if (!confirm('Deseja limpar o carrinho?')) return
    setCart([])
  }

  async function handlePhoneLookup() {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) return
    if (!isPaidPlan) { setPhoneVerified(true); return }
    setLookingUpPhone(true)
    try {
      const res = await fetch(`/api/customers?phone=${cleanPhone}&tenant_id=${tenant.id}`)
      const json = await res.json()
      if (json.data) {
        const nextState = getLookupCustomerFoundState(json.data)
        setExistingCustomer(nextState.existingCustomer)
        setCustomerName(nextState.customerName)
        setIsNewCustomer(nextState.isNewCustomer)
        setPhoneVerified(nextState.phoneVerified)
        const def = json.data.addresses?.find((a: CustomerAddress) => a.is_default)
        if (def) setAddress(def)
      } else {
        const nextState = getLookupCustomerMissingState()
        setExistingCustomer(nextState.existingCustomer)
        setIsNewCustomer(nextState.isNewCustomer)
        setCustomerName(nextState.customerName)
        setPhoneVerified(nextState.phoneVerified)
      }
    } finally { setLookingUpPhone(false) }
  }

  async function handleCepLookup(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`/api/cep/${clean}`)
      const json = await res.json()
      if (json.data) setAddress((prev) => ({ ...prev, ...json.data }))
    } finally { setLoadingCep(false) }
  }

  function validateInfo() {
    const errs = validateCustomerInfo(customerName, phone, customerCpf, tableInfo, paymentMethod)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Confira os campos obrigatórios antes de continuar.')
    }
    return Object.keys(errs).length === 0
  }

  function validateAddress() {
    const errs = validateCustomerAddress(address)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Confira os campos obrigatórios antes de continuar.')
    }
    return Object.keys(errs).length === 0
  }

  useEffect(() => {
    const stored = parseStoredActiveOrder(window.localStorage.getItem(activeOrderStorageKey))
    if (stored) {
      setOrderId(stored.id)
      setOrderNumber(stored.order_number)
    }
  }, [activeOrderStorageKey])

  useEffect(() => {
    if (!checkoutSessionId) return

    let cancelled = false
    let attempts = 0

    async function pollCheckout() {
      try {
        const res = await fetch(`/api/public/checkout/${checkoutSessionId}`)
        const json = await res.json()

        if (!res.ok || cancelled) return

        if (json.data?.status === 'converted' && json.data?.order_number) {
          const publicStatus = createPublicOrderStatusFromCheckout(json.data)
          if (!publicStatus) return
          const nextState = getConvertedCheckoutState({
            orderId: json.data.created_order_id,
            orderNumber: json.data.order_number,
            publicOrderStatus: publicStatus,
          })
          setOrderId(nextState.orderId)
          setOrderNumber(nextState.orderNumber)
          setPublicOrderStatus(nextState.publicOrderStatus)
          setCheckoutStep(nextState.checkoutStep)
          setCart(nextState.cart)
          setCartOpen(nextState.cartOpen)
          setCheckoutNotice(nextState.checkoutNotice)
          return
        }

        if (json.data?.status === 'approved') {
          setCheckoutNotice('Pagamento aprovado. Estamos confirmando seu pedido.')
        } else {
          setCheckoutNotice(getCheckoutNoticeFromResult(checkoutResult))
        }

        attempts += 1
        if (shouldContinueCheckoutPolling(json.data?.status, attempts)) {
          window.setTimeout(pollCheckout, 3000)
        }
      } catch {
        if (!cancelled) {
          setCheckoutNotice(getCheckoutPollingErrorNotice())
        }
      }
    }

    pollCheckout()

    return () => {
      cancelled = true
    }
  }, [checkoutResult, checkoutSessionId])

  useEffect(() => {
    if (!orderId) return

    let cancelled = false

    async function pollOrderStatus() {
      try {
        const res = await fetch(`/api/public/orders/${orderId}/status`)
        const json = await res.json()

        if (!res.ok || cancelled) return

        setPublicOrderStatus(json.data)
        const statusNotice = getPublicOrderStatusNotice(json.data)
        if (statusNotice) {
          setCheckoutNotice(statusNotice)
        }

        if (shouldContinueOrderPolling(json.data.status)) {
          window.setTimeout(pollOrderStatus, 10000)
        }
      } catch {
        // silently ignore and try again on next poll cycle
      }
    }

    pollOrderStatus()

    return () => {
      cancelled = true
    }
  }, [orderId])

  useEffect(() => {
    if (!orderId || !orderNumber || !publicOrderStatus) return

    if (!shouldPersistActiveOrder(publicOrderStatus.status)) {
      window.localStorage.removeItem(activeOrderStorageKey)
      return
    }

    window.localStorage.setItem(activeOrderStorageKey, serializeStoredActiveOrder(orderId, orderNumber))
  }, [activeOrderStorageKey, orderId, orderNumber, publicOrderStatus])

  async function handleContinueToAddress() {
    if (!validateInfo()) return
    const target = getContinueFlowTarget(paymentMethod, tableInfo)
    if (target === 'address') {
      setCheckoutStep('address')
      return
    }
    if (target === 'online-checkout') {
      await handleStartOnlineCheckout()
      return
    }
    await handlePlaceOrder()
  }

  async function handleStartOnlineCheckout(deliveryAddress?: Partial<CustomerAddress>) {
    try {
      setOnlineCheckoutLoading(true)

      const res = await fetch('/api/public/checkout/mercado-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPublicCheckoutPayload({
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          customerName,
          phone,
          customerCpf,
          tableInfo,
          notes,
          deliveryFee,
          deliveryAddress,
          items: cart,
        })),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error)
      }

      const checkoutUrl = resolvePublicCheckoutUrl(json.data)

      if (!checkoutUrl) {
        throw new Error('O Mercado Pago nao retornou um link de pagamento.')
      }

      window.location.href = checkoutUrl
    } catch (e: unknown) {
      alert(getOnlineCheckoutErrorMessage(e))
    } finally {
      setOnlineCheckoutLoading(false)
    }
  }

  async function handlePlaceOrder(deliveryAddress?: Partial<CustomerAddress>) {
    try {
      let customerId: string | undefined
      if (isPaidPlan) {
        const cleanPhone = phone.replace(/\D/g, '')
        const customerRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: tenant.id,
            name: customerName,
            phone: cleanPhone,
            cpf: customerCpf || undefined,
            address: deliveryAddress?.zip_code ? deliveryAddress : undefined,
          }),
        })
        if (!customerRes.ok) {
          const customerJson = await customerRes.json()
          throw new Error(customerJson.error || 'Nao foi possivel cadastrar o cliente.')
        }
        const customerJson = await customerRes.json()
        customerId = customerJson.data?.id
        if (!customerId) {
          throw new Error('Nao foi possivel identificar o cliente para concluir o pedido.')
        }
      }

      const order = await createOrder.mutateAsync({
        ...buildPublicOrderPayload({
          tenantId: tenant.id,
          customerName,
          customerCpf,
          phone,
          customerId,
          tableInfo,
          paymentMethod: paymentMethod as 'online' | 'table' | 'counter' | 'delivery',
          notes,
          deliveryFee,
          deliveryAddress,
          items: cart,
        }),
      })

      const nextState = getSuccessfulPublicOrderState({
        orderId: order.id,
        orderNumber: order.order_number,
        publicOrderStatus: createPublicOrderStatusFromOrder(order),
      })
      setOrderId(nextState.orderId)
      setOrderNumber(nextState.orderNumber)
      setPublicOrderStatus(nextState.publicOrderStatus)
      setCheckoutStep(nextState.checkoutStep)
      setCart(nextState.cart)
      setCheckoutNotice(
        getCreatedPublicOrderNotice(
          order.payment_status ?? nextState.publicOrderStatus.payment_status,
          order.payment_method ?? nextState.publicOrderStatus.payment_method ?? (paymentMethod as PublicOrderStatus['payment_method'])
        )
      )
    } catch (e: unknown) {
      alert(getPublicOrderPlacementErrorMessage(e))
    }
  }

  async function handleAddressSubmit() {
    if (!validateAddress()) return
    if (getAddressFlowTarget(paymentMethod) === 'online-checkout') {
      await handleStartOnlineCheckout(address)
      return
    }
    await handlePlaceOrder(address)
  }

  async function handleCancelOrder() {
    if (!orderId || !publicOrderStatus) return

    const reason = window.prompt('Motivo do cancelamento:', 'Cancelado pelo cliente')
    if (reason === null) return

    try {
      setCancelOrderLoading(true)

      const res = await fetch(`/api/public/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPublicOrderCancelPayload(reason)),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error)
      }

      setPublicOrderStatus(json.data)
      setCheckoutNotice(getCancelSuccessNotice(json.data.payment_status))
      toast.success('Pedido cancelado com sucesso.')
    } catch (error) {
      alert(getCancelOrderErrorMessage(error))
    } finally {
      setCancelOrderLoading(false)
    }
  }

  async function handleConfirmDelivery() {
    if (!orderId) return

    try {
      setConfirmDeliveryLoading(true)

      const res = await fetch(`/api/public/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error)
      }

      setPublicOrderStatus(json.data)
      setCheckoutNotice('Pedido entregue com sucesso.')
      toast.success('Entrega confirmada com sucesso.')
    } catch (error) {
      alert(getPublicOrderPlacementErrorMessage(error))
    } finally {
      setConfirmDeliveryLoading(false)
    }
  }

  const orderSteps = getOrderSteps(tableInfo)
  const isCheckoutProcessing = getPublicCheckoutProcessingState(
    createOrder.isPending,
    onlineCheckoutLoading,
  )

  function getStepState(stepKey: PublicOrderStatus['status']) {
    return getOrderStepState(
      publicOrderStatus?.status ?? null,
      orderSteps.map((step) => step.key),
      stepKey,
    )
  }

  return (
    <PublicMenuPageShell
      tenantName={tenant.name}
      tableInfo={tableInfo}
      cartCount={cartCount}
      onCartOpen={() => {
        const nextState = getOpenCartState()
        setCartOpen(nextState.cartOpen)
        setCheckoutStep(nextState.checkoutStep)
      }}
      checkoutNotice={checkoutNotice}
      publicOrderStatus={publicOrderStatus}
      cartOpen={cartOpen}
      headline={getPublicOrderHeadline(publicOrderStatus, orderSteps)}
      onTrackOrder={() => {
        const nextState = getTrackOrderState()
        setCartOpen(nextState.cartOpen)
        setCheckoutStep(nextState.checkoutStep)
      }}
      groups={groupedValues}
      activeCategory={activeCategory}
      onCategoryChange={setActiveCategory}
      items={items}
      filteredGroups={filteredGroups}
      selectedBorders={selectedBorders}
      onAdd={addToCart}
      onBorderToggle={(item, border) =>
        setSelectedBorders((prev) => ({ ...prev, [item.id]: border }))
      }
      onHalfFlavor={(item) => setHalfFlavorModal({ item })}
      halfFlavorModal={halfFlavorModal}
      halfFlavorOptions={halfFlavorModal ? getHalfFlavorOptions(items, halfFlavorModal.item) : []}
      onCloseHalfFlavor={() => setHalfFlavorModal(null)}
      onSelectHalfFlavor={(flavor) => {
        if (!halfFlavorModal) return
        addToCart(halfFlavorModal.item, flavor)
      }}
      drawerProps={{
        open: cartOpen,
        title: getCheckoutStepTitle(checkoutStep),
        checkoutStep,
        onClose: () => setCartOpen(false),
        onStepChange: setCheckoutStep,
        cartStepProps: {
          cart,
          cartTotal,
          deliveryFee,
          orderTotal,
          onIncrement: incrementCart,
          onDecrement: decrementCart,
          onRemove: removeFromCart,
          onContinue: () => setCheckoutStep(getCartDrawerState('info').checkoutStep),
          onClear: clearCart,
        },
        infoStepProps: {
          tableInfo,
          phone,
          onPhoneChange: (value) => {
            const nextState = getPhoneChangeState(value)
            setPhone(nextState.phone)
            setPhoneVerified(nextState.phoneVerified)
            setExistingCustomer(nextState.existingCustomer)
            setIsNewCustomer(nextState.isNewCustomer)
            setCustomerName(nextState.customerName)
          },
          phoneVerified,
          onPhoneLookup: handlePhoneLookup,
          lookingUpPhone,
          errors,
          isPaidPlan,
          existingCustomer,
          isNewCustomer,
          customerName,
          onCustomerNameChange: setCustomerName,
          customerCpf,
          onCustomerCpfChange: (value) => setCustomerCpf(formatCPF(value)),
          paymentOptions,
          paymentMethod,
          onPaymentMethodChange: setPaymentMethod,
          notes,
          onNotesChange: setNotes,
          cartTotal,
          deliveryFee,
          orderTotal,
          isProcessing: isCheckoutProcessing,
          onContinue: handleContinueToAddress,
          onBack: () => setCheckoutStep('cart'),
        },
        addressStepProps: {
          address,
          onAddressChange: (updater) => setAddress((prev) => updater(prev)),
          onCepLookup: handleCepLookup,
          loadingCep,
          errors,
          paymentMethod,
          isProcessing: isCheckoutProcessing,
          onSubmit: handleAddressSubmit,
          onBack: () => setCheckoutStep('info'),
        },
        doneStepProps: {
          orderNumber,
          tableInfo,
          publicOrderStatus,
          orderSteps,
          getStepState,
          cancelOrderLoading,
          confirmDeliveryLoading,
          onCancelOrder: handleCancelOrder,
          onConfirmDelivery: handleConfirmDelivery,
          onClose: () => setCartOpen(false),
        },
      }}
    />
  )
}
