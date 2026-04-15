import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  buildDeliveryDistancePayload,
  buildDeliveryFeePayload,
  buildDeliveryHoursPayload,
  buildDeliveryTogglePayload,
  type DeliverySettingsShape,
  type NotificationSettingsShape,
  type WhatsappOptionKey,
} from '@/features/payments/integrations-page'
import { Landmark, Link2, ShieldCheck, Unplug } from 'lucide-react'

type MercadoPagoAccountShape = {
  mercado_pago_user_id: string
  live_mode: boolean
  token_expires_at?: string | null
}

type WhatsappOption = {
  key: WhatsappOptionKey
  label: string
}

type Props = {
  connected: boolean
  accountLoading: boolean
  accountData: MercadoPagoAccountShape | null
  disconnectPending: boolean
  onDisconnect: () => void | Promise<void>
  deliverySettingsLoading: boolean
  deliverySettingsData: DeliverySettingsShape | null
  deliverySettingsPending: boolean
  deliveryFeeValue: string
  deliveryRadiusValue?: string
  deliveryFeePerKmValue?: string
  deliveryOriginZipValue?: string
  deliveryOriginStreetValue?: string
  deliveryOriginNumberValue?: string
  deliveryOriginNeighborhoodValue?: string
  deliveryOriginCityValue?: string
  deliveryOriginStateValue?: string
  openingHourValue: string
  closingHourValue: string
  onDeliveryToggle: (payload: DeliverySettingsShape) => void | Promise<void>
  onDeliveryOperationChange: (acceptingOrders: boolean) => void | Promise<void>
  onDeliveryScheduleChange: (enabled: boolean) => void | Promise<void>
  onDeliveryHoursChange: (field: 'opens_at' | 'closes_at', value: string) => void
  onDeliveryFeeInputChange: (value: string) => void
  onDeliveryFeeSave: (payload: DeliverySettingsShape) => void | Promise<void>
  onDeliveryPricingModeChange?: (mode: 'flat' | 'distance') => void | Promise<void>
  onDeliveryDistanceInputChange?: (
    field:
      | 'max_radius_km'
      | 'fee_per_km'
      | 'origin_zip_code'
      | 'origin_street'
      | 'origin_number'
      | 'origin_neighborhood'
      | 'origin_city'
      | 'origin_state',
    value: string,
  ) => void
  onDeliveryDistanceSave?: (payload: DeliverySettingsShape) => void | Promise<void>
  onDeliveryHoursSave: (payload: DeliverySettingsShape) => void | Promise<void>
  hasWhatsappNotifications: boolean
  notificationSettingsLoading: boolean
  notificationSettingsData: NotificationSettingsShape | null
  notificationSettingsPending: boolean
  whatsappOptions: readonly WhatsappOption[]
  onToggleWhatsappOption: (payload: NotificationSettingsShape) => void | Promise<void>
}

export function IntegrationsPageContent({
  connected,
  accountLoading,
  accountData,
  disconnectPending,
  onDisconnect,
  deliverySettingsLoading,
  deliverySettingsData,
  deliverySettingsPending,
  deliveryFeeValue,
  deliveryRadiusValue = '',
  deliveryFeePerKmValue = '',
  deliveryOriginZipValue = '',
  deliveryOriginStreetValue = '',
  deliveryOriginNumberValue = '',
  deliveryOriginNeighborhoodValue = '',
  deliveryOriginCityValue = '',
  deliveryOriginStateValue = '',
  openingHourValue,
  closingHourValue,
  onDeliveryToggle,
  onDeliveryOperationChange,
  onDeliveryScheduleChange,
  onDeliveryHoursChange,
  onDeliveryFeeInputChange,
  onDeliveryFeeSave,
  onDeliveryPricingModeChange,
  onDeliveryDistanceInputChange,
  onDeliveryDistanceSave,
  onDeliveryHoursSave,
  hasWhatsappNotifications,
  notificationSettingsLoading,
  notificationSettingsData,
  notificationSettingsPending,
  whatsappOptions,
  onToggleWhatsappOption,
}: Props) {
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

        {accountLoading ? (
          <div className="py-8 text-sm text-slate-400">Carregando integração...</div>
        ) : connected && accountData ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Seller ID</p>
                <p className="mt-1 font-medium text-slate-900">{accountData.mercado_pago_user_id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Modo</p>
                <p className="mt-1 font-medium text-slate-900">
                  {accountData.live_mode ? 'Produção' : 'Teste'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ShieldCheck className="h-4 w-4" />
                Token renovado automaticamente
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Expiração atual:{' '}
                {accountData.token_expires_at
                  ? new Date(accountData.token_expires_at).toLocaleString('pt-BR')
                  : 'não informado'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button asChild>
                <a href="/api/mercado-pago/oauth/start">
                  <Link2 className="mr-2 h-4 w-4" />
                  Reconectar conta
                </a>
              </Button>
              <Button variant="outline" disabled={disconnectPending} onClick={() => onDisconnect()}>
                <Unplug className="mr-2 h-4 w-4" />
                {disconnectPending ? 'Desconectando...' : 'Desconectar'}
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
            Configure taxa fixa ou cobrança por distância com limite de raio para o cardápio online.
          </p>
        </div>

        {deliverySettingsLoading ? (
          <div className="py-6 text-sm text-slate-400">Carregando configuração de entrega...</div>
        ) : deliverySettingsData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">Habilitar entrega</p>
                <p className="text-sm text-slate-500">Mostra a opção de delivery no cardápio público.</p>
              </div>
              <button
                type="button"
                disabled={deliverySettingsPending}
                onClick={() => onDeliveryToggle(buildDeliveryTogglePayload(deliverySettingsData))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  deliverySettingsData.delivery_enabled ? 'bg-slate-900' : 'bg-slate-200'
                } ${deliverySettingsPending ? 'opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    deliverySettingsData.delivery_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">Operação de pedidos</p>
                <p className="text-sm text-slate-500">
                  {deliverySettingsData.accepting_orders ? 'Estabelecimento aberto' : 'Estabelecimento fechado'}
                </p>
              </div>
              <button
                type="button"
                disabled={deliverySettingsPending}
                onClick={() => onDeliveryOperationChange(!deliverySettingsData.accepting_orders)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  deliverySettingsData.accepting_orders ? 'bg-emerald-600' : 'bg-rose-300'
                } ${deliverySettingsPending ? 'opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    deliverySettingsData.accepting_orders ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Horário de funcionamento</p>
                  <p className="text-sm text-slate-500">Bloqueia novos pedidos fora da faixa configurada.</p>
                </div>
                <button
                  type="button"
                  disabled={deliverySettingsPending}
                  onClick={() => onDeliveryScheduleChange(!deliverySettingsData.schedule_enabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    deliverySettingsData.schedule_enabled ? 'bg-slate-900' : 'bg-slate-200'
                  } ${deliverySettingsPending ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      deliverySettingsData.schedule_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {deliverySettingsData.schedule_enabled && (
                <div className="flex items-end gap-3">
                  <label className="text-sm text-slate-600">
                    <span className="mb-1 block">Abertura</span>
                    <input
                      type="time"
                      value={openingHourValue}
                      onChange={(event) => onDeliveryHoursChange('opens_at', event.target.value)}
                      className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    <span className="mb-1 block">Fechamento</span>
                    <input
                      type="time"
                      value={closingHourValue}
                      onChange={(event) => onDeliveryHoursChange('closes_at', event.target.value)}
                      className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <Button
                    variant="outline"
                    disabled={deliverySettingsPending}
                    onClick={() =>
                      onDeliveryHoursSave(
                        buildDeliveryHoursPayload(deliverySettingsData, openingHourValue, closingHourValue),
                      )
                    }
                  >
                    {deliverySettingsPending ? 'Salvando...' : 'Salvar horário'}
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-4">
              <div>
                <p className="font-medium text-slate-900">Modelo de cobrança</p>
                <p className="text-sm text-slate-500">Use taxa fixa ou combine taxa base, raio e valor por quilômetro.</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={deliverySettingsData.pricing_mode === 'distance' ? 'outline' : 'default'}
                  disabled={deliverySettingsPending}
                  onClick={() => onDeliveryPricingModeChange?.('flat')}
                >
                  Taxa fixa
                </Button>
                <Button
                  variant={deliverySettingsData.pricing_mode === 'distance' ? 'default' : 'outline'}
                  disabled={deliverySettingsPending}
                  onClick={() => onDeliveryPricingModeChange?.('distance')}
                >
                  Por distância
                </Button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {deliverySettingsData.pricing_mode === 'distance' ? 'Taxa base de entrega (R$)' : 'Taxa fixa de entrega (R$)'}
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryFeeValue}
                    onChange={(event) => onDeliveryFeeInputChange(event.target.value)}
                    className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    disabled={deliverySettingsPending}
                    onClick={() => onDeliveryFeeSave(buildDeliveryFeePayload(deliverySettingsData, deliveryFeeValue))}
                  >
                    {deliverySettingsPending ? 'Salvando...' : 'Salvar taxa'}
                  </Button>
                </div>
              </div>

              {deliverySettingsData.pricing_mode === 'distance' && (
                <div className="space-y-4 rounded-xl bg-slate-50 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block">Raio máximo (km)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={deliveryRadiusValue}
                        onChange={(event) => onDeliveryDistanceInputChange?.('max_radius_km', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block">Valor por km (R$)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={deliveryFeePerKmValue}
                        onChange={(event) => onDeliveryDistanceInputChange?.('fee_per_km', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block">CEP de origem</span>
                      <input
                        value={deliveryOriginZipValue}
                        onChange={(event) => onDeliveryDistanceInputChange?.('origin_zip_code', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block">Cidade de origem</span>
                      <input
                        value={deliveryOriginCityValue}
                        onChange={(event) => onDeliveryDistanceInputChange?.('origin_city', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-600 md:col-span-2">
                      <span className="mb-1 block">Rua de origem</span>
                      <input
                        value={deliveryOriginStreetValue}
                        onChange={(event) => onDeliveryDistanceInputChange?.('origin_street', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block">Número</span>
                      <input
                        value={deliveryOriginNumberValue}
                        onChange={(event) => onDeliveryDistanceInputChange?.('origin_number', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block">Bairro</span>
                      <input
                        value={deliveryOriginNeighborhoodValue}
                        onChange={(event) => onDeliveryDistanceInputChange?.('origin_neighborhood', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      <span className="mb-1 block">Estado</span>
                      <input
                        value={deliveryOriginStateValue}
                        maxLength={2}
                        onChange={(event) => onDeliveryDistanceInputChange?.('origin_state', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <Button
                    variant="outline"
                    disabled={deliverySettingsPending}
                    onClick={() =>
                      onDeliveryDistanceSave?.(
                        buildDeliveryDistancePayload(deliverySettingsData, {
                          max_radius_km: deliveryRadiusValue,
                          fee_per_km: deliveryFeePerKmValue,
                          origin_zip_code: deliveryOriginZipValue,
                          origin_street: deliveryOriginStreetValue,
                          origin_number: deliveryOriginNumberValue,
                          origin_neighborhood: deliveryOriginNeighborhoodValue,
                          origin_city: deliveryOriginCityValue,
                          origin_state: deliveryOriginStateValue,
                        }),
                      )
                    }
                  >
                    {deliverySettingsPending ? 'Salvando...' : 'Salvar cálculo por distância'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-sm text-slate-400">Não foi possível carregar as configurações de entrega.</div>
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
            <p className="text-sm font-medium text-amber-900">Recurso disponível apenas nos planos Standard e Premium.</p>
            <p className="mt-1 text-sm text-amber-800">
              Faça upgrade para habilitar notificações automáticas por WhatsApp para os pedidos.
            </p>
          </div>
        ) : notificationSettingsLoading ? (
          <div className="py-6 text-sm text-slate-400">Carregando configurações de notificação...</div>
        ) : notificationSettingsData ? (
          <div className="space-y-3">
            {whatsappOptions.map((option) => (
              <div key={option.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{option.label}</p>
                  <p className="text-sm text-slate-500">Ativa envio automático para este evento.</p>
                </div>
                <button
                  type="button"
                  disabled={notificationSettingsPending}
                  onClick={() => onToggleWhatsappOption({ ...notificationSettingsData, [option.key]: !notificationSettingsData[option.key] })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    notificationSettingsData[option.key] ? 'bg-slate-900' : 'bg-slate-200'
                  } ${notificationSettingsPending ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      notificationSettingsData[option.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-sm text-slate-400">Não foi possível carregar as notificações.</div>
        )}
      </div>
    </div>
  )
}
