'use client'

import { useEffect, useState } from 'react'
import { useCreateOrder } from '@/features/orders/hooks/useOrders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShoppingCart, Plus, Minus, X, ChefHat, Trash2 } from 'lucide-react'
import type { CartItem, CustomerAddress } from '@/features/orders/types'
import { toast } from 'sonner'

type Extra = {
  id: string
  name: string
  price: number
  category: string
}

type Category = {
  id: string
  name: string
}

type MenuItem = {
  id: string
  tenant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  available: boolean
  display_order: number
  category: Category | null
  extras: { extra: Extra | null }[]
}

type Props = {
  tenant: { id: string; name: string; slug: string; plan: string }
  items: MenuItem[]
  tableInfo: { id: string; number: string } | null
  checkoutSessionId: string | null
  checkoutResult: string | null
}

type PublicOrderStatus = {
  id: string
  order_number: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'refunded'
  cancelled_reason?: string | null
  refunded_at?: string | null
  created_at: string
  updated_at: string
}

type Customer = {
  id: string
  name: string
  phone: string
  addresses?: CustomerAddress[]
}

type StoredActiveOrder = {
  id: string
  order_number: number
}

function getActiveOrderStorageKey(tenantSlug: string, tableId?: string | null) {
  return `chefops:active-order:${tenantSlug}:${tableId ?? 'no-table'}`
}

function formatPhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function formatCPF(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatCEP(value: string) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

function validateCPF(cpf: string) {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i)
  let c = 11 - (s % 11); if (c >= 10) c = 0
  if (c !== parseInt(d[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i)
  c = 11 - (s % 11); if (c >= 10) c = 0
  return c === parseInt(d[10])
}

const paymentOptionsByContext = {
  table:  [{ value: 'table', label: 'Pagar na mesa' }, { value: 'counter', label: 'Pagar no caixa' }, { value: 'online', label: 'Pagar online' }],
  online: [{ value: 'online', label: 'Pagar online' }, { value: 'delivery', label: 'Pagar na entrega' }],
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
  const [selectedBorders, setSelectedBorders] = useState<Record<string, Extra | null>>({})
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerCpf, setCustomerCpf] = useState('')
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [lookingUpPhone, setLookingUpPhone] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [address, setAddress] = useState<Partial<CustomerAddress>>({})
  const [loadingCep, setLoadingCep] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>(tableInfo ? 'table' : 'online')
  const [notes, setNotes] = useState('')
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [onlineCheckoutLoading, setOnlineCheckoutLoading] = useState(false)
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null)
  const [publicOrderStatus, setPublicOrderStatus] = useState<PublicOrderStatus | null>(null)
  const [cancelOrderLoading, setCancelOrderLoading] = useState(false)
  const activeOrderStorageKey = getActiveOrderStorageKey(tenant.slug, tableInfo?.id)

  const createOrder = useCreateOrder()
  const paymentOptions = tableInfo ? paymentOptionsByContext.table : paymentOptionsByContext.online

  // Agrupamento por categoria — sem dependência de joins aninhados
  const grouped: Record<string, { category: Category | null; items: MenuItem[] }> = {}
  for (const item of items) {
    const key = item.category?.id ?? 'outros'
    if (!grouped[key]) grouped[key] = { category: item.category ?? null, items: [] }
    grouped[key].items.push(item)
  }
  const groupedValues = Object.values(grouped)
  const filteredGroups = activeCategory
    ? groupedValues.filter(({ category }) => (category?.id ?? 'outros') === activeCategory)
    : groupedValues

  const cartTotal = cart.reduce((sum, i) => {
    const ext = i.extras?.reduce((s, e) => s + e.price, 0) ?? 0
    return sum + (i.price + ext) * i.quantity
  }, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  function getBorders(item: MenuItem): Extra[] {
    return item.extras
      .filter((e) => e.extra?.category === 'border')
      .map((e) => e.extra!)
  }

  function addToCart(item: MenuItem, halfFlavor?: MenuItem) {
    const border = selectedBorders[item.id] ?? null
    const itemName = halfFlavor ? `${item.name} / ${halfFlavor.name}` : item.name
    const cartItem: CartItem = {
      menu_item_id: item.id,
      name: itemName,
      price: halfFlavor ? Math.max(item.price, halfFlavor.price) : item.price,
      quantity: 1,
      extras: border ? [{ name: border.name, price: border.price }] : [],
      half_flavor: halfFlavor ? { menu_item_id: halfFlavor.id, name: halfFlavor.name } : undefined,
    }
    setCart((prev) => [...prev, cartItem])
    setSelectedBorders((prev) => ({ ...prev, [item.id]: null }))
    setHalfFlavorModal(null)
    toast.success(`${itemName} adicionado ao carrinho`, {
      description: `Agora voce tem ${cartCount + 1} item(ns) no carrinho.`,
      action: {
        label: 'Ver carrinho',
        onClick: () => {
          setCartOpen(true)
          setCheckoutStep('cart')
        },
      },
    })
  }

  function incrementCart(index: number) {
    setCart((prev) => prev.map((i, idx) => idx === index ? { ...i, quantity: i.quantity + 1 } : i))
  }

  function decrementCart(index: number) {
    setCart((prev) => {
      const item = prev[index]
      if (item.quantity > 1) return prev.map((i, idx) => idx === index ? { ...i, quantity: i.quantity - 1 } : i)
      return prev.filter((_, i) => i !== index)
    })
  }

  function removeFromCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index))
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
        setExistingCustomer(json.data)
        setCustomerName(json.data.name)
        setIsNewCustomer(false)
        const def = json.data.addresses?.find((a: CustomerAddress) => a.is_default)
        if (def) setAddress(def)
      } else {
        setExistingCustomer(null)
        setIsNewCustomer(true)
        setCustomerName('')
      }
      setPhoneVerified(true)
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
    const errs: Record<string, string> = {}
    if (!customerName.trim() || customerName.trim().length < 2) errs.name = 'Nome obrigatório'
    if (!phone || phone.replace(/\D/g, '').length < 10) errs.phone = 'Telefone inválido'
    if (tableInfo && (!customerCpf || !validateCPF(customerCpf))) errs.cpf = 'CPF inválido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateAddress() {
    const errs: Record<string, string> = {}
    if (!address.zip_code) errs.zip_code = 'CEP obrigatório'
    if (!address.street) errs.street = 'Rua obrigatória'
    if (!address.number) errs.number = 'Número obrigatório'
    if (!address.city) errs.city = 'Cidade obrigatória'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(activeOrderStorageKey)
      if (!raw) return

      const stored = JSON.parse(raw) as StoredActiveOrder

      if (stored?.id) {
        setOrderId(stored.id)
        setOrderNumber(stored.order_number)
      }
    } catch {
      // ignore corrupted local state
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
          setOrderId(json.data.created_order_id)
          setOrderNumber(json.data.order_number)
          setPublicOrderStatus(json.data.created_order_id ? {
            id: json.data.created_order_id,
            order_number: json.data.order_number,
            status: json.data.order_status ?? 'pending',
            payment_status: json.data.payment_status ?? 'paid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } : null)
          setCheckoutStep('done')
          setCartOpen(true)
          setCart([])
          setCheckoutNotice('Pagamento confirmado. Pedido enviado para o estabelecimento.')
          return
        }

        if (json.data?.status === 'approved') {
          setCheckoutNotice('Pagamento aprovado. Estamos confirmando seu pedido.')
        } else if (checkoutResult === 'pending') {
          setCheckoutNotice('Pagamento pendente. Assim que confirmar, seu pedido sera enviado.')
        } else if (checkoutResult === 'failure') {
          setCheckoutNotice('O pagamento nao foi concluido. Tente novamente.')
        }

        attempts += 1
        if (attempts < 10) {
          window.setTimeout(pollCheckout, 3000)
        }
      } catch {
        if (!cancelled) {
          setCheckoutNotice('Nao foi possivel consultar o status do pagamento agora.')
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

        if (!['delivered', 'cancelled'].includes(json.data.status)) {
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

    if (['delivered', 'cancelled'].includes(publicOrderStatus.status)) {
      window.localStorage.removeItem(activeOrderStorageKey)
      return
    }

    window.localStorage.setItem(
      activeOrderStorageKey,
      JSON.stringify({
        id: orderId,
        order_number: orderNumber,
      } satisfies StoredActiveOrder)
    )
  }, [activeOrderStorageKey, orderId, orderNumber, publicOrderStatus])

  async function handleContinueToAddress() {
    if (!validateInfo()) return
    if (paymentMethod === 'online') {
      if (!tableInfo) {
        setCheckoutStep('address')
        return
      }

      await handleStartOnlineCheckout()
      return
    }

    if (!tableInfo) {
      setCheckoutStep('address')
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
        body: JSON.stringify({
          tenant_id: tenant.id,
          tenant_slug: tenant.slug,
          customer_name: customerName,
          customer_phone: phone.replace(/\D/g, '') || undefined,
          customer_cpf: customerCpf || undefined,
          table_number: tableInfo?.number,
          table_id: tableInfo?.id,
          notes: notes || undefined,
          delivery_address: deliveryAddress as CustomerAddress | undefined,
          items: cart,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error)
      }

      const checkoutUrl = json.data?.init_point || json.data?.sandbox_init_point

      if (!checkoutUrl) {
        throw new Error('O Mercado Pago nao retornou um link de pagamento.')
      }

      window.location.href = checkoutUrl
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao iniciar pagamento online.')
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
        const customerJson = await customerRes.json()
        customerId = customerJson.data?.id
      }

      const order = await createOrder.mutateAsync({
        tenant_id: tenant.id,
        customer_name: customerName,
        customer_cpf: customerCpf || undefined,
        customer_phone: phone.replace(/\D/g, '') || undefined,
        customer_id: customerId,
        table_number: tableInfo?.number,
        table_id: tableInfo?.id,
        payment_method: paymentMethod as 'online' | 'table' | 'counter' | 'delivery',
        notes: notes || undefined,
        delivery_address: deliveryAddress as CustomerAddress | undefined,
        items: cart,
      })

      setOrderId(order.id)
      setOrderNumber(order.order_number)
      setPublicOrderStatus({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        updated_at: order.updated_at,
      })
      setCheckoutStep('done')
      setCart([])
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao fazer pedido.')
    }
  }

  async function handleAddressSubmit() {
    if (!validateAddress()) return
    if (paymentMethod === 'online') {
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
        body: JSON.stringify({
          cancelled_reason: reason.trim() || 'Cancelado pelo cliente',
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error)
      }

      setPublicOrderStatus(json.data)
      setCheckoutNotice(
        json.data.payment_status === 'refunded'
          ? 'Pedido cancelado e reembolso solicitado com sucesso.'
          : 'Pedido cancelado com sucesso.'
      )
      toast.success('Pedido cancelado com sucesso.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao cancelar pedido.')
    } finally {
      setCancelOrderLoading(false)
    }
  }

  const orderSteps: Array<{
    key: PublicOrderStatus['status']
    label: string
    description: string
  }> = [
    { key: 'pending', label: 'Recebido', description: 'Seu pedido entrou na fila do estabelecimento.' },
    { key: 'confirmed', label: 'Confirmado', description: 'O estabelecimento confirmou seu pedido.' },
    { key: 'preparing', label: 'Em preparo', description: 'Seu pedido está sendo preparado.' },
    { key: 'ready', label: 'Pronto', description: tableInfo ? 'Seu pedido está pronto para servir.' : 'Seu pedido está pronto para sair.' },
    { key: 'delivered', label: 'Entregue', description: 'Pedido finalizado com sucesso.' },
  ]

  function getStepState(stepKey: PublicOrderStatus['status']) {
    if (!publicOrderStatus) return 'upcoming'
    if (publicOrderStatus.status === 'cancelled') return 'upcoming'

    const currentIndex = orderSteps.findIndex((step) => step.key === publicOrderStatus.status)
    const stepIndex = orderSteps.findIndex((step) => step.key === stepKey)

    if (stepIndex < currentIndex) return 'done'
    if (stepIndex === currentIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">{tenant.name}</h1>
              {tableInfo && <p className="text-xs text-slate-400">Mesa {tableInfo.number}</p>}
            </div>
          </div>
          <button
            onClick={() => { setCartOpen(true); setCheckoutStep('cart') }}
            className="relative flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <ShoppingCart className="w-4 h-4" />
            Carrinho
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Cardápio */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {checkoutNotice && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {checkoutNotice}
          </div>
        )}

        {publicOrderStatus && !cartOpen && !['delivered', 'cancelled'].includes(publicOrderStatus.status) && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Pedido em andamento #{publicOrderStatus.order_number}
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  Seu pedido está em {orderSteps.find((step) => step.key === publicOrderStatus.status)?.label.toLowerCase() ?? 'andamento'}.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  setCartOpen(true)
                  setCheckoutStep('done')
                }}
              >
                Acompanhar
              </Button>
            </div>
          </div>
        )}

        {tableInfo && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 text-sm text-orange-700">
            Você está na <strong>Mesa {tableInfo.number}</strong>
          </div>
        )}

        {/* Filtro de categorias */}
        {groupedValues.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${!activeCategory ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Todos
            </button>
            {groupedValues.map(({ category }) => (
              <button
                key={category?.id ?? 'outros'}
                onClick={() => setActiveCategory(category?.id ?? 'outros')}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${activeCategory === (category?.id ?? 'outros') ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {category?.name ?? 'Outros'}
              </button>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Cardápio em breve.</p>
          </div>
        ) : (
          filteredGroups.map(({ category, items: groupItems }) => {
            const isPizzaCategory = category?.name?.toLowerCase().includes('pizza') ?? false
            return (
              <div key={category?.id ?? 'outros'} className="mb-8">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  {category?.name ?? 'Outros'}
                </h2>
                <div className="space-y-3">
                  {groupItems.map((item) => {
                    const borders = getBorders(item)
                    const selectedBorder = selectedBorders[item.id]
                    return (
                      <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-sm font-semibold text-slate-900 mt-1">
                              R$ {Number(item.price).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-700 transition-colors flex-shrink-0"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>

                        {/* Seleção de borda */}
                        {borders.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-2">Borda</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setSelectedBorders((prev) => ({ ...prev, [item.id]: null }))}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!selectedBorder ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                Normal
                              </button>
                              {borders.map((border) => (
                                <button
                                  key={border.id}
                                  onClick={() => setSelectedBorders((prev) => ({
                                    ...prev,
                                    [item.id]: prev[item.id]?.id === border.id ? null : border,
                                  }))}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedBorder?.id === border.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  {border.name} +R$ {Number(border.price).toFixed(2)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Meia a meia — só para categorias com mais de 1 item */}
                        {isPizzaCategory && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => setHalfFlavorModal({ item })}
                              className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
                            >
                              + Pedir meia a meia
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </main>

      {/* Modal meia a meia */}
      {halfFlavorModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-900">Escolha o segundo sabor</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Primeiro: <strong>{halfFlavorModal.item.name}</strong>
                </p>
              </div>
              <button onClick={() => setHalfFlavorModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items
                .filter((i) => i.category?.id === halfFlavorModal.item.category?.id && i.id !== halfFlavorModal.item.id)
                .map((flavor) => (
                  <button
                    key={flavor.id}
                    onClick={() => addToCart(halfFlavorModal.item, flavor)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    <p className="font-medium text-slate-900 text-sm">{flavor.name}</p>
                    {flavor.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{flavor.description}</p>}
                    <p className="text-xs font-medium text-slate-700 mt-1">
                      R$ {Number(Math.max(halfFlavorModal.item.price, flavor.price)).toFixed(2)}
                      <span className="text-slate-400 font-normal ml-1">(maior preço)</span>
                    </p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Carrinho / Checkout */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-md bg-white flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">
                {checkoutStep === 'cart' ? 'Seu pedido'
                  : checkoutStep === 'info' ? 'Seus dados'
                  : checkoutStep === 'address' ? 'Endereço de entrega'
                  : 'Pedido realizado!'}
              </h2>
              <button onClick={() => setCartOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Step: carrinho */}
            {checkoutStep === 'cart' && (
              <div className="flex-1 flex flex-col">
                {cart.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Nenhum item adicionado.
                  </div>
                ) : (
                  <>
                    <div className="flex-1 p-4 space-y-3">
                      {cart.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                            <button
                              onClick={() => decrementCart(idx)}
                              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => incrementCart(idx)}
                              className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-700 transition-colors"
                            >
                              <Plus className="w-3 h-3 text-white" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{item.name}</p>
                            {item.extras?.map((e) => (
                              <p key={e.name} className="text-xs text-slate-400">+ {e.name} R$ {e.price.toFixed(2)}</p>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-medium text-slate-900">
                              R$ {((item.price + (item.extras?.reduce((s, e) => s + e.price, 0) ?? 0)) * item.quantity).toFixed(2)}
                            </span>
                            <button onClick={() => removeFromCart(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-slate-200">
                      <div className="flex justify-between text-sm mb-4">
                        <span className="text-slate-500">Total</span>
                        <span className="font-semibold text-slate-900">R$ {cartTotal.toFixed(2)}</span>
                      </div>
                      <Button className="w-full mb-2" onClick={() => setCheckoutStep('info')}>
                        Continuar
                      </Button>
                      <button
                        onClick={clearCart}
                        className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-500 py-2 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Limpar carrinho
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step: dados */}
            {checkoutStep === 'info' && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4 space-y-4">
                  {tableInfo && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                      Pedido na comanda da <strong>Mesa {tableInfo.number}</strong>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Telefone <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="(11) 99999-9999"
                        value={phone}
                        onChange={(e) => {
                          setPhone(formatPhone(e.target.value))
                          setPhoneVerified(false)
                          setExistingCustomer(null)
                          setIsNewCustomer(false)
                          setCustomerName('')
                        }}
                        className="flex-1"
                      />
                      {!phoneVerified && (
                        <Button size="sm" variant="outline" onClick={handlePhoneLookup} disabled={lookingUpPhone || phone.replace(/\D/g, '').length < 10}>
                          {lookingUpPhone ? '...' : 'OK'}
                        </Button>
                      )}
                    </div>
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    {isPaidPlan && existingCustomer && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-green-700">Olá, <strong>{existingCustomer.name}</strong>!</p>
                      </div>
                    )}
                    {isPaidPlan && isNewCustomer && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-blue-700">Primeiro pedido? Preencha seus dados.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Nome completo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Ex: João Silva"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={isPaidPlan && !!existingCustomer}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  {tableInfo && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">
                        CPF <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="000.000.000-00"
                        value={customerCpf}
                        onChange={(e) => setCustomerCpf(formatCPF(e.target.value))}
                        maxLength={14}
                      />
                      {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Forma de pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentOptions.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setPaymentMethod(value)}
                          className={`text-xs p-2.5 rounded-lg border text-center transition-colors ${paymentMethod === value ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Observações <span className="text-slate-400">(opcional)</span>
                    </label>
                    <Input placeholder="Ex: sem cebola" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleContinueToAddress}
                    disabled={createOrder.isPending || onlineCheckoutLoading || (isPaidPlan && !phoneVerified)}
                  >
                    {createOrder.isPending || onlineCheckoutLoading ? 'Processando...' : 'Continuar'}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setCheckoutStep('cart')}>
                    Voltar
                  </Button>
                </div>
              </div>
            )}

            {/* Step: endereço */}
            {checkoutStep === 'address' && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4 space-y-4">
                  <p className="text-sm text-slate-500">Informe o endereço de entrega.</p>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">CEP <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="00000-000"
                        value={address.zip_code ? formatCEP(address.zip_code) : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          setAddress((prev) => ({ ...prev, zip_code: val }))
                          if (val.length === 8) handleCepLookup(val)
                        }}
                        maxLength={9}
                        className="flex-1"
                      />
                      {loadingCep && <span className="text-xs text-slate-400 self-center">Buscando...</span>}
                    </div>
                    {errors.zip_code && <p className="text-xs text-red-500 mt-1">{errors.zip_code}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Rua</label>
                    <Input placeholder="Nome da rua" value={address.street ?? ''} onChange={(e) => setAddress((p) => ({ ...p, street: e.target.value }))} />
                    {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Número</label>
                      <Input placeholder="123" value={address.number ?? ''} onChange={(e) => setAddress((p) => ({ ...p, number: e.target.value }))} />
                      {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Complemento</label>
                      <Input placeholder="Apto..." value={address.complement ?? ''} onChange={(e) => setAddress((p) => ({ ...p, complement: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Bairro</label>
                    <Input placeholder="Bairro" value={address.neighborhood ?? ''} onChange={(e) => setAddress((p) => ({ ...p, neighborhood: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Cidade</label>
                      <Input placeholder="Cidade" value={address.city ?? ''} onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))} />
                      {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Estado</label>
                      <Input placeholder="UF" maxLength={2} value={address.state ?? ''} onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value.toUpperCase() }))} />
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-200 space-y-2">
                  <Button className="w-full" onClick={handleAddressSubmit} disabled={createOrder.isPending || onlineCheckoutLoading}>
                    {createOrder.isPending || onlineCheckoutLoading ? 'Processando...' : paymentMethod === 'online' ? 'Ir para pagamento' : 'Fazer pedido'}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setCheckoutStep('info')}>Voltar</Button>
                </div>
              </div>
            )}

            {/* Step: confirmação */}
            {checkoutStep === 'done' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <ChefHat className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Pedido realizado!</h3>
                <p className="text-slate-500 text-sm mb-1">Seu número de pedido é</p>
                <p className="text-4xl font-bold text-slate-900 mb-4">#{orderNumber}</p>
                {tableInfo && <p className="text-sm text-slate-500">Comanda da <strong>Mesa {tableInfo.number}</strong></p>}
                {publicOrderStatus?.status === 'cancelled' ? (
                  <div className="mt-6 w-full rounded-xl border border-red-200 bg-red-50 p-4 text-left">
                    <p className="font-medium text-red-700">Pedido cancelado</p>
                    <p className="mt-1 text-sm text-red-600">
                      {publicOrderStatus.cancelled_reason ?? 'O pedido foi cancelado.'}
                    </p>
                    {publicOrderStatus.payment_status === 'refunded' && (
                      <p className="mt-2 text-xs text-red-500">
                        Reembolso solicitado com sucesso no pagamento online.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <p className="mb-4 text-sm font-medium text-slate-700">Acompanhe o status do pedido</p>
                    <div className="space-y-3">
                      {orderSteps.map((step) => {
                        const state = getStepState(step.key)
                        return (
                          <div key={step.key} className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                                state === 'done'
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : state === 'current'
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-300 bg-white text-slate-400'
                              }`}
                            >
                              {state === 'done' ? '✓' : ''}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-900'}`}>
                                {step.label}
                              </p>
                              <p className={`text-xs ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {step.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                      <span>Pagamento</span>
                      <span className="font-medium text-slate-700">
                        {publicOrderStatus?.payment_status === 'paid'
                          ? 'Aprovado'
                          : publicOrderStatus?.payment_status === 'refunded'
                            ? 'Reembolsado'
                            : 'Pendente'}
                      </span>
                    </div>

                    {['pending', 'confirmed'].includes(publicOrderStatus?.status ?? '') && (
                      <Button
                        variant="outline"
                        className="mt-4 w-full border-red-200 text-red-700 hover:bg-red-50"
                        onClick={handleCancelOrder}
                        disabled={cancelOrderLoading}
                      >
                        {cancelOrderLoading ? 'Cancelando...' : 'Cancelar pedido'}
                      </Button>
                    )}
                  </div>
                )}
                <Button className="mt-8 w-full" onClick={() => setCartOpen(false)}>Fechar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
