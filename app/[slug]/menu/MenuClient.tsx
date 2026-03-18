'use client'

import { useState, useEffect } from 'react'
import { useCreateOrder } from '@/features/orders/hooks/useOrders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShoppingCart, Plus, Minus, X, ChefHat, Trash2 } from 'lucide-react'
import type { MenuItem, CartItem, Extra, Customer, CustomerAddress } from '@/features/orders/types'

type Props = {
  tenant: { id: string; name: string; slug: string; plan: string }
  items: MenuItem[]
  tableInfo: { id: string; number: string } | null
}

type HalfFlavorState = {
  item: MenuItem
  secondFlavor: MenuItem | null
}

function formatPhone(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function formatCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatCEP(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function validateCPF(cpf: string) {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let check = 11 - (sum % 11)
  if (check >= 10) check = 0
  if (check !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  check = 11 - (sum % 11)
  if (check >= 10) check = 0
  return check === parseInt(digits[10])
}

const paymentOptionsByContext = {
  table: [
    { value: 'table',   label: 'Pagar na mesa' },
    { value: 'counter', label: 'Pagar no caixa' },
    { value: 'online',  label: 'Pagar online' },
  ],
  online: [
    { value: 'online',   label: 'Pagar online' },
    { value: 'delivery', label: 'Pagar na entrega' },
  ],
}

export default function MenuClient({ tenant, items, tableInfo }: Props) {
  const isPaidPlan = tenant.plan !== 'free'

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'info' | 'address' | 'done'>('cart')

  // Half flavor modal
  const [halfFlavorModal, setHalfFlavorModal] = useState<HalfFlavorState | null>(null)

  // Border selection per item
  const [selectedBorders, setSelectedBorders] = useState<Record<string, Extra | null>>({})

  // Customer info
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerCpf, setCustomerCpf] = useState('')
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [lookingUpPhone, setLookingUpPhone] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)

  // Address
  const [address, setAddress] = useState<Partial<CustomerAddress>>({})
  const [loadingCep, setLoadingCep] = useState(false)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<string>(
    tableInfo ? 'table' : 'online'
  )
  const [notes, setNotes] = useState('')
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createOrder = useCreateOrder()

  const paymentOptions = tableInfo
    ? paymentOptionsByContext.table
    : paymentOptionsByContext.online

  // Agrupa por categoria
  const grouped = items.reduce(
    (acc: Record<string, { category: { id: string; name: string } | null; items: MenuItem[] }>, item) => {
      const key = item.category_id ?? 'outros'
      if (!acc[key]) acc[key] = { category: item.category ?? null, items: [] }
      acc[key].items.push(item)
      return acc
    },
    {}
  )

  const cartTotal = cart.reduce((sum, i) => {
    const extrasTotal = i.extras?.reduce((s, e) => s + e.price, 0) ?? 0
    return sum + (i.price + extrasTotal) * i.quantity
  }, 0)

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  // Pizzas da categoria para meia a meia
  const pizzaItems = halfFlavorModal
    ? items.filter(
        (i) =>
          i.category_id === halfFlavorModal.item.category_id &&
          i.id !== halfFlavorModal.item.id
      )
    : []

  // Bordas disponíveis para um item
  function getBorders(item: MenuItem): Extra[] {
    return (
      item.extras
        ?.filter((e) => e.extra.category === 'border')
        .map((e) => e.extra) ?? []
    )
  }

  function addToCart(item: MenuItem, halfFlavor?: MenuItem) {
    const borders = getBorders(item)
    const selectedBorder = selectedBorders[item.id] ?? null

    const cartItem: CartItem = {
      menu_item_id: item.id,
      name: halfFlavor
        ? `${item.name} / ${halfFlavor.name}`
        : item.name,
      price: halfFlavor
        ? Math.max(item.price, halfFlavor.price)
        : item.price,
      quantity: 1,
      extras: selectedBorder
        ? [{ name: selectedBorder.name, price: selectedBorder.price }]
        : [],
      half_flavor: halfFlavor
        ? { menu_item_id: halfFlavor.id, name: halfFlavor.name }
        : undefined,
    }

    setCart((prev) => [...prev, cartItem])
    setSelectedBorders((prev) => ({ ...prev, [item.id]: null }))
    setHalfFlavorModal(null)
  }

  function removeFromCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  function clearCart() {
    if (!confirm('Deseja limpar o carrinho?')) return
    setCart([])
  }

  function getQty(menu_item_id: string) {
    return cart.filter((i) => i.menu_item_id === menu_item_id).length
  }

  // Lookup de cliente por telefone (apenas planos pagos)
  async function handlePhoneLookup() {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) return

    if (!isPaidPlan) {
      setPhoneVerified(true)
      return
    }

    setLookingUpPhone(true)
    try {
      const res = await fetch(
        `/api/customers?phone=${cleanPhone}&tenant_id=${tenant.id}`
      )
      const json = await res.json()

      if (json.data) {
        setExistingCustomer(json.data)
        setCustomerName(json.data.name)
        setIsNewCustomer(false)

        // Preenche endereço padrão se existir
        const defaultAddr = json.data.addresses?.find(
          (a: CustomerAddress) => a.is_default
        )
        if (defaultAddr) setAddress(defaultAddr)
      } else {
        setExistingCustomer(null)
        setIsNewCustomer(true)
        setCustomerName('')
      }
      setPhoneVerified(true)
    } finally {
      setLookingUpPhone(false)
    }
  }

  // Busca CEP
  async function handleCepLookup(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`/api/cep/${clean}`)
      const json = await res.json()
      if (json.data) {
        setAddress((prev) => ({ ...prev, ...json.data }))
      }
    } finally {
      setLoadingCep(false)
    }
  }

  function validateInfo() {
    const errs: Record<string, string> = {}

    if (!customerName.trim() || customerName.trim().length < 2) {
      errs.name = 'Nome obrigatório'
    }

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Telefone inválido'
    }

    if (tableInfo && (!customerCpf || !validateCPF(customerCpf))) {
      errs.cpf = 'CPF inválido'
    }

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

  async function handleContinueToAddress() {
    if (!validateInfo()) return

    // Entrega online exige endereço
    if (!tableInfo && paymentMethod !== 'online') {
      setCheckoutStep('address')
      return
    }

    await handlePlaceOrder()
  }

  async function handlePlaceOrder(deliveryAddress?: Partial<CustomerAddress>) {
    try {
      // Salva cliente se plano pago
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

      setOrderNumber(order.order_number)
      setCheckoutStep('done')
      setCart([])
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao fazer pedido.')
    }
  }

  async function handleAddressSubmit() {
    if (!validateAddress()) return
    await handlePlaceOrder(address)
  }

  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = Object.values(grouped).map(({ category }) => category)

  const filteredGroups = activeCategory
    ? Object.values(grouped).filter(
        ({ category }) => (category?.id ?? 'outros') === activeCategory
      )
    : Object.values(grouped)
  
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
              {tableInfo && (
                <p className="text-xs text-slate-400">Mesa {tableInfo.number}</p>
              )}
              {/* Filtro por categoria */}
                {categories.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        !activeCategory
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Todos
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat?.id ?? 'outros'}
                        onClick={() => setActiveCategory(cat?.id ?? 'outros')}
                        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          activeCategory === (cat?.id ?? 'outros')
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat?.name ?? 'Outros'}
                      </button>
                    ))}
                  </div>
                )}
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
        {tableInfo && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 text-sm text-orange-700">
            Você está na <strong>Mesa {tableInfo.number}</strong>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Cardápio em breve.</p>
          </div>
        ) : (
          filteredGroups.map(({ category, items: groupItems }) => (
            <div key={category?.id ?? 'outros'} className="mb-8">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                {category?.name ?? 'Outros'}
              </h2>
              <div className="space-y-3">
                {groupItems.map((item) => {
                  const qty = getQty(item.id)
                  const borders = getBorders(item)
                  const selectedBorder = selectedBorders[item.id]
                  const hasFlavors = !!item.category_id && groupItems.length > 1

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
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-700 transition-colors"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>

                      {/* Borda */}
                      {borders.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-500 mb-2">Borda</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setSelectedBorders((prev) => ({ ...prev, [item.id]: null }))}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                !selectedBorder
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Normal
                            </button>
                            {borders.map((border) => (
                              <button
                                key={border.id}
                                onClick={() => setSelectedBorders((prev) => ({
                                  ...prev,
                                  [item.id]: selectedBorder?.id === border.id ? null : border,
                                }))}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  selectedBorder?.id === border.id
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {border.name} +R$ {Number(border.price).toFixed(2)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Meia a meia */}
                      {hasFlavors && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => setHalfFlavorModal({ item, secondFlavor: null })}
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
          ))
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
                  Primeiro sabor: <strong>{halfFlavorModal.item.name}</strong>
                </p>
              </div>
              <button onClick={() => setHalfFlavorModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {pizzaItems.map((flavor) => (
                <button
                  key={flavor.id}
                  onClick={() => addToCart(halfFlavorModal.item, flavor)}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium text-slate-900 text-sm">{flavor.name}</p>
                  {flavor.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{flavor.description}</p>
                  )}
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
                          {/* Controles de quantidade */}
                          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                            <button
                              onClick={() => removeFromCart(idx)}
                              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-semibold w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => {
                                setCart((prev) =>
                                  prev.map((i, ii) =>
                                    ii === idx ? { ...i, quantity: i.quantity + 1 } : i
                                  )
                                )
                              }}
                              className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-700 transition-colors"
                            >
                              <Plus className="w-3 h-3 text-white" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{item.name}</p>
                            {item.extras?.map((e) => (
                              <p key={e.name} className="text-xs text-slate-400">
                                + {e.name} R$ {e.price.toFixed(2)}
                              </p>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-medium text-slate-900">
                              R$ {((item.price + (item.extras?.reduce((s, e) => s + e.price, 0) ?? 0)) * item.quantity).toFixed(2)}
                            </span>
                            <button
                              onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-slate-200">
                      <div className="flex justify-between text-sm mb-4">
                        <span className="text-slate-500">Total</span>
                        <span className="font-semibold text-slate-900">
                          R$ {cartTotal.toFixed(2)}
                        </span>
                      </div>
                      <Button className="w-full mb-2" onClick={() => setCheckoutStep('info')}>
                        Continuar
                      </Button>
                      <button
                        onClick={clearCart}
                        className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-500 py-2 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Limpar carrinho
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step: dados do cliente */}
            {checkoutStep === 'info' && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4 space-y-4">
                  {tableInfo && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                      Pedido será lançado na comanda da <strong>Mesa {tableInfo.number}</strong>
                    </div>
                  )}

                  {/* Telefone com lookup */}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handlePhoneLookup}
                          disabled={lookingUpPhone || phone.replace(/\D/g, '').length < 10}
                        >
                          {lookingUpPhone ? '...' : 'OK'}
                        </Button>
                      )}
                    </div>
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}

                    {/* Cliente encontrado */}
                    {isPaidPlan && existingCustomer && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-green-700">
                          Olá, <strong>{existingCustomer.name}</strong>! Seus dados foram preenchidos.
                        </p>
                      </div>
                    )}

                    {/* Novo cliente */}
                    {isPaidPlan && isNewCustomer && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-blue-700">
                          Primeiro pedido? Preencha seus dados abaixo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Nome completo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Ex: João Silva"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={isPaidPlan && !!existingCustomer && !isNewCustomer}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  {/* CPF obrigatório apenas na mesa */}
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

                  {/* Forma de pagamento */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Forma de pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentOptions.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setPaymentMethod(value)}
                          className={`text-xs p-2.5 rounded-lg border text-center transition-colors ${
                            paymentMethod === value
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      Observações <span className="text-slate-400">(opcional)</span>
                    </label>
                    <Input
                      placeholder="Ex: sem cebola"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
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
                    disabled={createOrder.isPending || (!phoneVerified && isPaidPlan)}
                  >
                    {createOrder.isPending ? 'Enviando...' : 'Continuar'}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setCheckoutStep('cart')}>
                    Voltar
                  </Button>
                </div>
              </div>
            )}

            {/* Step: endereço de entrega */}
            {checkoutStep === 'address' && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4 space-y-4">
                  <p className="text-sm text-slate-500">Informe o endereço de entrega.</p>

                  {/* CEP */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">
                      CEP <span className="text-red-500">*</span>
                    </label>
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
                      {loadingCep && (
                        <span className="text-xs text-slate-400 self-center">Buscando...</span>
                      )}
                    </div>
                    {errors.zip_code && <p className="text-xs text-red-500 mt-1">{errors.zip_code}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Rua</label>
                    <Input
                      placeholder="Nome da rua"
                      value={address.street ?? ''}
                      onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                    />
                    {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Número</label>
                      <Input
                        placeholder="Ex: 123"
                        value={address.number ?? ''}
                        onChange={(e) => setAddress((prev) => ({ ...prev, number: e.target.value }))}
                      />
                      {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Complemento</label>
                      <Input
                        placeholder="Apto, bloco..."
                        value={address.complement ?? ''}
                        onChange={(e) => setAddress((prev) => ({ ...prev, complement: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Bairro</label>
                    <Input
                      placeholder="Bairro"
                      value={address.neighborhood ?? ''}
                      onChange={(e) => setAddress((prev) => ({ ...prev, neighborhood: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Cidade</label>
                      <Input
                        placeholder="Cidade"
                        value={address.city ?? ''}
                        onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                      />
                      {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Estado</label>
                      <Input
                        placeholder="UF"
                        maxLength={2}
                        value={address.state ?? ''}
                        onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 space-y-2">
                  <Button
                    className="w-full"
                    onClick={handleAddressSubmit}
                    disabled={createOrder.isPending}
                  >
                    {createOrder.isPending ? 'Enviando...' : 'Fazer pedido'}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setCheckoutStep('info')}>
                    Voltar
                  </Button>
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
                {tableInfo && (
                  <p className="text-sm text-slate-500">
                    Lançado na comanda da <strong>Mesa {tableInfo.number}</strong>
                  </p>
                )}
                <Button className="mt-8 w-full" onClick={() => setCartOpen(false)}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}