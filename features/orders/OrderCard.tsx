import { Button } from '@/components/ui/button'
import type { DeliveryStatus, Order } from '@/features/orders/types'
import {
  deliveryStatusLabels,
  getDeliveryActionLabel,
  normalizeDeliveryAddress,
  paymentLabels,
  shouldShowAdvanceButton,
  shouldShowWhatsappCard,
  whatsappEventLabels,
  whatsappStatusStyles,
} from '@/features/orders/orders-page'

export function OrderCard({
  order,
  config,
  deliveryDrivers,
  hasWhatsappNotifications,
  updatePending,
  onAssignDriver,
  onAdvance,
  onAdvanceDelivery,
  onConfirmPayment,
  onCancel,
}: {
  order: Order
  config: { label: string; color: string; nextLabel?: string }
  deliveryDrivers: Array<{ id: string; name: string; vehicle_type: string; active: boolean }>
  hasWhatsappNotifications: boolean
  updatePending: boolean
  chargingOrderId?: string | null
  onAssignDriver: (order: Order, deliveryDriverId: string) => void
  onAdvance: (order: Order) => void
  onAdvanceDelivery: (order: Order) => void
  onMercadoPagoCheckout?: (order: Order) => void
  onConfirmPayment: (order: Order) => void
  onCancel: (order: Order) => void
}) {
  const address = normalizeDeliveryAddress(order.delivery_address)
  const notifications = [...(order.notifications ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const latestWhatsapp = notifications[0] ?? null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <span className="text-lg font-bold text-slate-900">#{order.order_number}</span>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-slate-400">{paymentLabels[order.payment_method]}</span>
          </div>
          {order.customer_name && (
            <div className="mb-1 space-y-0.5 text-sm text-slate-600">
              <p>
                Cliente: <span className="font-medium">{order.customer_name}</span>
                {order.table_number && ` — Mesa ${order.table_number}`}
                {!order.table_number && order.tab?.label && ` — Comanda ${order.tab.label}`}
              </p>
              {order.customer_phone && <p className="text-slate-500">📞 {order.customer_phone}</p>}
            </div>
          )}

          {!order.customer_name && order.tab?.label && (
            <p className="mb-1 text-sm text-slate-600">
              Comanda: <span className="font-medium">{order.tab.label}</span>
            </p>
          )}

          {address && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <p className="mb-0.5 font-medium">📍 Endereço de entrega</p>
              {(address.street || address.number || address.complement) && (
                <p>
                  {[address.street, address.number].filter(Boolean).join(', ')}
                  {address.complement ? ` - ${address.complement}` : ''}
                </p>
              )}
              {(address.neighborhood || address.city || address.state) && (
                <p>
                  {[address.neighborhood, address.city, address.state].filter(Boolean).join(' - ')}
                </p>
              )}
              {address.zip_code && <p className="mt-0.5 text-blue-600">CEP: {address.zip_code}</p>}
            </div>
          )}

          {address && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Entregador</p>
                  <p className="text-sm text-slate-700">
                    {order.delivery_driver?.name ?? 'Aguardando atribuição'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {deliveryStatusLabels[(order.delivery_status ?? 'waiting_dispatch') as DeliveryStatus]}
                  </p>
                </div>
                <select
                  value={order.delivery_driver_id ?? ''}
                  onChange={(event) => onAssignDriver(order, event.target.value)}
                  disabled={updatePending}
                  className="h-9 min-w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">Sem entregador</option>
                  {deliveryDrivers
                    .filter((driver) => driver.active || driver.id === order.delivery_driver_id)
                    .map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} · {driver.vehicle_type}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-2 space-y-0.5">
            {order.items?.map((item) => (
              <div key={item.id}>
                <p className="text-sm text-slate-500">
                  {item.quantity}× {item.name}
                  {item.notes && <span className="text-slate-400"> ({item.notes})</span>}
                </p>
                {item.extras?.map((extra) => (
                  <p key={extra.id} className="ml-4 text-xs text-slate-400">
                    + {extra.name}
                    {extra.price > 0 && ` R$ ${Number(extra.price).toFixed(2)}`}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {order.notes && (
            <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-400">Obs: {order.notes}</p>
          )}

          {shouldShowWhatsappCard(order, hasWhatsappNotifications) && latestWhatsapp && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">WhatsApp</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${whatsappStatusStyles[latestWhatsapp.status]}`}>
                  {latestWhatsapp.status === 'sent'
                    ? 'Enviado'
                    : latestWhatsapp.status === 'failed'
                      ? 'Falhou'
                      : 'Ignorado'}
                </span>
                <span className="text-xs text-slate-500">
                  {whatsappEventLabels[latestWhatsapp.event_key] ?? latestWhatsapp.event_key}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                {new Date(latestWhatsapp.created_at).toLocaleDateString('pt-BR')} às{' '}
                {new Date(latestWhatsapp.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {latestWhatsapp.recipient ? ` · ${latestWhatsapp.recipient}` : ''}
              </p>

              {latestWhatsapp.error_message && (
                <p className="mt-1 text-xs text-red-500">Motivo: {latestWhatsapp.error_message}</p>
              )}

              {notifications.length > 1 && (
                <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                  {notifications.slice(1, 3).map((notification) => (
                    <p key={notification.id} className="text-[11px] text-slate-400">
                      {whatsappEventLabels[notification.event_key] ?? notification.event_key} ·{' '}
                      {notification.status === 'sent'
                        ? 'enviado'
                        : notification.status === 'failed'
                          ? 'falhou'
                          : 'ignorado'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="space-y-1">
            <p className="text-sm text-slate-500">
              Subtotal: <span className="font-medium text-slate-900">R$ {Number(order.subtotal).toFixed(2)}</span>
            </p>
            {Number(order.delivery_fee ?? 0) > 0 && (
              <p className="text-sm text-slate-500">
                Entrega: <span className="font-medium text-slate-900">R$ {Number(order.delivery_fee).toFixed(2)}</span>
              </p>
            )}
            <p className="font-semibold text-slate-900">R$ {Number(order.total).toFixed(2)}</p>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(order.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            {shouldShowAdvanceButton(order) && (
              <Button size="sm" onClick={() => onAdvance(order)} disabled={updatePending}>
                {config.nextLabel}
              </Button>
            )}
            {address && order.status === 'ready' && (
              <Button size="sm" variant="outline" disabled={updatePending} onClick={() => onAdvanceDelivery(order)}>
                {getDeliveryActionLabel(order)}
              </Button>
            )}
            {order.status === 'delivered' && order.payment_status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
                disabled={updatePending}
                onClick={() => onConfirmPayment(order)}
              >
                Confirmar pagamento
              </Button>
            )}
            {!['delivered', 'cancelled'].includes(order.status) && (
              <Button size="sm" variant="outline" onClick={() => onCancel(order)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
