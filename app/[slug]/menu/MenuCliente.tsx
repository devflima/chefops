'use client'

import { useState } from 'react'
import { useCreateOrder } from '@/features/orders/hooks/useOrders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShoppingCart, Plus, Minus, X, ChefHat } from 'lucide-react'
import type { MenuItem, CartItem } from '@/features/orders/types'

type Props = {
  tenant: { id: string; name: string; slug: string }
  items: MenuItem[]
  tableInfo: { id: string; number: string } | null
}

const paymentLabels = {
  online: 'Pagar online',
  table: 'Pagar na mesa',
  counter: 'Pagar no caixa',
}

function formatCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function validateCPF(cpf: string) {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1+$/.test(digits)) return false
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

export default function MenuClient({ tenant, items, tableInfo }: Props) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'info' | 'done'>(
    'cart'
  )
  const [customerName, setCustomerName] = useState('')
  const [customerCpf, setCustomerCpf] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<
    'online' | 'table' | 'counter'
  >(tableInfo ? 'table' : 'counter')
  const [notes, setNotes] = useState('')
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createOrder = useCreateOrder()

  const grouped = items.reduce(
    (
      acc: Record<
        string,
        { category: { id: string; name: string } | null; items: MenuItem[] }
      >,
      item
    ) => {
      const key = item.category_id ?? 'outros'
      if (!acc[key]) acc[key] = { category: item.category ?? null, items: [] }
      acc[key].items.push(item)
      return acc
    },
    {}
  )

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menu_item_id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ]
    })
  }

  function removeFromCart(menu_item_id: string) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menu_item_id === menu_item_id)
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.menu_item_id === menu_item_id
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
      }
      return prev.filter((i) => i.menu_item_id !== menu_item_id)
    })
  }

  function getQty(menu_item_id: string) {
    return cart.find((i) => i.menu_item_id === menu_item_id)?.quantity ?? 0
  }

  function validateInfo() {
    const errs: Record<string, string> = {}

    if (!customerName.trim() || customerName.trim().length < 2) {
      errs.name = 'Nome obrigatório (mínimo 2 caracteres)'
    }

    // CPF obrigatório apenas quando vier de mesa via QR Code
    if (tableInfo) {
      if (!customerCpf.trim()) {
        errs.cpf = 'CPF obrigatório para pedidos na mesa'
      } else if (!validateCPF(customerCpf)) {
        errs.cpf = 'CPF inválido'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handlePlaceOrder() {
    if (!validateInfo()) return

    try {
      const order = await createOrder.mutateAsync({
        tenant_id: tenant.id,
        customer_name: customerName,
        customer_cpf: customerCpf || undefined,
        customer_phone: customerPhone || undefined,
        table_number: tableInfo?.number,
        table_id: tableInfo?.id,
        payment_method: paymentMethod,
        notes: notes || undefined,
        items: cart,
      })
      setOrderNumber(order.order_number)
      setCheckoutStep('done')
      setCart([])
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao fazer pedido.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <ChefHat className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">{tenant.name}</h1>
              {tableInfo && (
                <p className="text-xs text-slate-400">
                  Mesa {tableInfo.number}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setCartOpen(true)
              setCheckoutStep('cart')
            }}
            className="relative flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            <ShoppingCart className="h-4 w-4" />
            Carrinho
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Cardápio */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {tableInfo && (
          <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            Você está na <strong>Mesa {tableInfo.number}</strong> — seu pedido
            será lançado automaticamente na comanda.
          </div>
        )}

        {items.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ChefHat className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>Cardápio em breve.</p>
          </div>
        ) : (
          Object.values(grouped).map(({ category, items: groupItems }) => (
            <div key={category?.id ?? 'outros'} className="mb-8">
              <h2 className="mb-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
                {category?.name ?? 'Outros'}
              </h2>
              <div className="space-y-3">
                {groupItems.map((item) => {
                  const qty = getQty(item.id)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                            {item.description}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          R$ {Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {qty > 0 && (
                          <>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-sm font-semibold">
                              {qty}
                            </span>
                          </>
                        )}
                        <button
                          onClick={() => addToCart(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 transition-colors hover:bg-slate-700"
                        >
                          <Plus className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Carrinho / Checkout */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setCartOpen(false)}
          />
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">
                {checkoutStep === 'cart'
                  ? 'Seu pedido'
                  : checkoutStep === 'info'
                    ? 'Seus dados'
                    : 'Pedido realizado!'}
              </h2>
              <button onClick={() => setCartOpen(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Step: carrinho */}
            {checkoutStep === 'cart' && (
              <div className="flex flex-1 flex-col">
                {cart.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                    Nenhum item adicionado.
                  </div>
                ) : (
                  <>
                    <div className="flex-1 space-y-3 p-4">
                      {cart.map((item) => (
                        <div
                          key={item.menu_item_id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(item.menu_item_id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-4 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                addToCart({
                                  id: item.menu_item_id,
                                  name: item.name,
                                  price: item.price,
                                } as MenuItem)
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900"
                            >
                              <Plus className="h-3 w-3 text-white" />
                            </button>
                            <span className="text-sm text-slate-700">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 p-4">
                      <div className="mb-4 flex justify-between text-sm">
                        <span className="text-slate-500">Total</span>
                        <span className="font-semibold text-slate-900">
                          R$ {cartTotal.toFixed(2)}
                        </span>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => setCheckoutStep('info')}
                      >
                        Continuar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step: dados */}
            {checkoutStep === 'info' && (
              <div className="flex flex-1 flex-col">
                <div className="flex-1 space-y-4 p-4">
                  {tableInfo && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                      Pedido será lançado na comanda da{' '}
                      <strong>Mesa {tableInfo.number}</strong>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Nome completo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Ex: João Silva"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>

                  {/* CPF obrigatório só na mesa */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      CPF{' '}
                      {tableInfo ? (
                        <span className="text-red-500">*</span>
                      ) : (
                        <span className="text-slate-400">(opcional)</span>
                      )}
                    </label>
                    <Input
                      placeholder="000.000.000-00"
                      value={customerCpf}
                      onChange={(e) =>
                        setCustomerCpf(formatCPF(e.target.value))
                      }
                      maxLength={14}
                    />
                    {errors.cpf && (
                      <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>
                    )}
                    {tableInfo && (
                      <p className="mt-1 text-xs text-slate-400">
                        Necessário para garantir o pagamento da comanda.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Telefone{' '}
                      <span className="text-slate-400">(opcional)</span>
                    </label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  {/* Forma de pagamento — fixada em "na mesa" se vier de QR */}
                  {!tableInfo && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Forma de pagamento
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          Object.entries(paymentLabels) as [
                            typeof paymentMethod,
                            string,
                          ][]
                        ).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setPaymentMethod(val)}
                            className={`rounded-lg border p-2 text-center text-xs transition-colors ${
                              paymentMethod === val
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Observações{' '}
                      <span className="text-slate-400">(opcional)</span>
                    </label>
                    <Input
                      placeholder="Ex: sem cebola"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-200 p-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold">
                      R$ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePlaceOrder}
                    disabled={createOrder.isPending}
                  >
                    {createOrder.isPending ? 'Enviando...' : 'Fazer pedido'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCheckoutStep('cart')}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            )}

            {/* Step: confirmação */}
            {checkoutStep === 'done' && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <ChefHat className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Pedido realizado!
                </h3>
                <p className="mb-1 text-sm text-slate-500">
                  Seu número de pedido é
                </p>
                <p className="mb-4 text-4xl font-bold text-slate-900">
                  #{orderNumber}
                </p>
                {tableInfo && (
                  <p className="text-sm text-slate-500">
                    Lançado na comanda da{' '}
                    <strong>Mesa {tableInfo.number}</strong>
                  </p>
                )}
                <Button
                  className="mt-8 w-full"
                  onClick={() => setCartOpen(false)}
                >
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
