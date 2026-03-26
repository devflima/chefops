'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useDisconnectMercadoPagoAccount,
  useMercadoPagoAccount,
} from '@/features/payments/hooks/useMercadoPagoAccount'
import { IntegrationsPageContent } from '@/features/payments/IntegrationsPageContent'
import {
  getDeliveryFeeValue,
  getMercadoPagoAlertMessage,
  whatsappOptionDefinitions,
} from '@/features/payments/integrations-page'
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
    const message = getMercadoPagoAlertMessage(params.get('mercado_pago'))

    if (message) {
      alert(message)
    }
  }, [params])

  const connected = !!account.data
  const deliveryFeeValue = getDeliveryFeeValue(deliveryFeeInput, deliverySettings.data?.flat_fee)
  const whatsappOptions = notificationSettings.data ? whatsappOptionDefinitions : []

  return (
    <IntegrationsPageContent
      connected={connected}
      accountLoading={account.isLoading}
      accountData={account.data ?? null}
      disconnectPending={disconnect.isPending}
      onDisconnect={() => disconnect.mutate()}
      deliverySettingsLoading={deliverySettings.isLoading}
      deliverySettingsData={deliverySettings.data ?? null}
      deliverySettingsPending={updateDeliverySettings.isPending}
      deliveryFeeValue={deliveryFeeValue}
      onDeliveryToggle={async (payload) => {
        await updateDeliverySettings.mutateAsync(payload)
      }}
      onDeliveryFeeInputChange={setDeliveryFeeInput}
      onDeliveryFeeSave={async (payload) => {
        await updateDeliverySettings.mutateAsync(payload)
        setDeliveryFeeInput(null)
      }}
      hasWhatsappNotifications={hasWhatsappNotifications}
      notificationSettingsLoading={notificationSettings.isLoading}
      notificationSettingsData={notificationSettings.data ?? null}
      notificationSettingsPending={updateNotificationSettings.isPending}
      whatsappOptions={whatsappOptions}
      onToggleWhatsappOption={async (payload) => {
        await updateNotificationSettings.mutateAsync(payload)
      }}
    />
  )
}
