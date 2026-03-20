'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Landmark, Link2, ShieldCheck, Unplug } from 'lucide-react'
import {
  useDisconnectMercadoPagoAccount,
  useMercadoPagoAccount,
} from '@/features/payments/hooks/useMercadoPagoAccount'
import { useHasFeature } from '@/features/plans/hooks/usePlan'
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/features/notifications/hooks/useNotificationSettings'
import {
  useDeliverySettings,
  useUpdateDeliverySettings,
} from '@/features/delivery/hooks/useDeliverySettings'

export default function IntegracoesPage() {
  const params = useSearchParams()
  const account = useMercadoPagoAccount()
  const disconnect = useDisconnectMercadoPagoAccount()
  const hasWhatsappNotifications = useHasFeature('whatsapp_notifications')
  const notificationSettings = useNotificationSettings()
  const updateNotificationSettings = useUpdateNotificationSettings()
  const deliverySettings = useDeliverySettings()
  const updateDeliverySettings = useUpdateDeliverySettings()
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<string | null>(null)

  useEffect(() => {
    const status = params.get('mercado_pago')

    if (!status) return

    if (status === 'connected') {
      alert('Conta Mercado Pago conectada com sucesso.')
    } else if (status === 'error') {
      alert('Não foi possível concluir a conexão com o Mercado Pago.')
    } else if (status === 'invalid_state') {
      alert('A validação do retorno OAuth falhou. Tente conectar novamente.')
    }
  }, [params])

  const connected = !!account.data
  const deliveryFeeValue = deliveryFeeInput ?? String(deliverySettings.data?.flat_fee ?? 0)
  const whatsappOptions = notificationSettings.data
    ? [
        { key: 'whatsapp_order_received', label: 'Pedido recebido' },
        { key: 'whatsapp_order_confirmed', label: 'Pedido confirmado' },
        { key: 'whatsapp_order_preparing', label: 'Em preparo' },
        { key: 'whatsapp_order_ready', label: 'Pedido pronto' },
        { key: 'whatsapp_order_out_for_delivery', label: 'Saiu para entrega' },
        { key: 'whatsapp_order_delivered', label: 'Pedido entregue' },
        { key: 'whatsapp_order_cancelled', label: 'Pedido cancelado' },
      ] as const
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Integrações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conecte a conta do estabelecimento para receber pagamentos direto no Mercado Pago do cliente.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
            <Landmark className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Mercado Pago</h2>
              <Badge variant={connected ? 'default' : 'secondary'}>
                {connected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              O dinheiro das vendas vai direto para a conta do restaurante conectado.
            </p>
          </div>
        </div>

        {account.isLoading ? (
          <div className="py-8 text-sm text-slate-400">Carregando integração...</div>
        ) : connected ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Seller ID</p>
                <p className="mt-1 font-medium text-slate-900">{account.data.mercado_pago_user_id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Modo</p>
                <p className="mt-1 font-medium text-slate-900">
                  {account.data.live_mode ? 'Produção' : 'Teste'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ShieldCheck className="h-4 w-4" />
                Token renovado automaticamente
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Expiração atual: {account.data.token_expires_at ? new Date(account.data.token_expires_at).toLocaleString('pt-BR') : 'não informado'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button asChild>
                <a href="/api/mercado-pago/oauth/start">
                  <Link2 className="mr-2 h-4 w-4" />
                  Reconectar conta
                </a>
              </Button>
              <Button
                variant="outline"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                <Unplug className="mr-2 h-4 w-4" />
                {disconnect.isPending ? 'Desconectando...' : 'Desconectar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
              <p className="text-sm text-slate-600">
                Conecte a conta Mercado Pago do estabelecimento para habilitar checkout online e cobranças direto para o restaurante.
              </p>
            </div>

            <Button asChild>
              <a href="/api/mercado-pago/oauth/start">
                <Link2 className="mr-2 h-4 w-4" />
                Conectar Mercado Pago
              </a>
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Entrega</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure uma taxa fixa para pedidos de delivery feitos pelo cardápio online.
          </p>
        </div>

        {deliverySettings.isLoading ? (
          <div className="py-6 text-sm text-slate-400">Carregando configuração de entrega...</div>
        ) : deliverySettings.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">Habilitar entrega</p>
                <p className="text-sm text-slate-500">Mostra a opção de delivery no cardápio público.</p>
              </div>
              <button
                type="button"
                disabled={updateDeliverySettings.isPending}
                onClick={async () => {
                  await updateDeliverySettings.mutateAsync({
                    ...deliverySettings.data,
                    delivery_enabled: !deliverySettings.data.delivery_enabled,
                  })
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  deliverySettings.data.delivery_enabled ? 'bg-slate-900' : 'bg-slate-200'
                } ${updateDeliverySettings.isPending ? 'opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    deliverySettings.data.delivery_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Taxa fixa de entrega (R$)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryFeeValue}
                  onChange={(event) => setDeliveryFeeInput(event.target.value)}
                  className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <Button
                  variant="outline"
                  disabled={updateDeliverySettings.isPending}
                  onClick={async () => {
                    await updateDeliverySettings.mutateAsync({
                      ...deliverySettings.data,
                      flat_fee: Number(deliveryFeeValue || 0),
                    })
                    setDeliveryFeeInput(null)
                  }}
                >
                  {updateDeliverySettings.isPending ? 'Salvando...' : 'Salvar taxa'}
                </Button>
                <p className="self-center text-sm text-slate-500">
                  Esse valor será somado ao total dos pedidos com entrega.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-sm text-slate-400">
            Não foi possível carregar as configurações de entrega.
          </div>
        )}
      </div>

      <div className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Notificações WhatsApp</h2>
          <p className="mt-1 text-sm text-slate-500">
            Escolha em quais eventos o cliente deve receber atualização automática pelo WhatsApp.
          </p>
        </div>

        {!hasWhatsappNotifications ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Recurso disponível apenas nos planos Standard e Premium.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Faça upgrade para habilitar notificações automáticas por WhatsApp para os pedidos.
            </p>
          </div>
        ) : notificationSettings.isLoading ? (
          <div className="py-6 text-sm text-slate-400">Carregando configurações...</div>
        ) : notificationSettings.data ? (
          <div className="space-y-3">
            {whatsappOptions.map((option) => (
              <div
                key={option.key}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{option.label}</p>
                  <p className="text-sm text-slate-500">Enviar quando este evento acontecer.</p>
                </div>
                <button
                  type="button"
                  disabled={updateNotificationSettings.isPending}
                  onClick={async () => {
                    await updateNotificationSettings.mutateAsync({
                      ...notificationSettings.data,
                      [option.key]: !notificationSettings.data[option.key],
                    })
                  }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    notificationSettings.data[option.key] ? 'bg-slate-900' : 'bg-slate-200'
                  } ${updateNotificationSettings.isPending ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      notificationSettings.data[option.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-sm text-slate-400">
            Não foi possível carregar as configurações de WhatsApp.
          </div>
        )}
      </div>
    </div>
  )
}
