'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useDisconnectMercadoPagoAccount,
  useMercadoPagoAccount,
} from '@/features/payments/hooks/useMercadoPagoAccount'
import { IntegrationsPageContent } from '@/features/payments/IntegrationsPageContent'
import {
  buildDeliveryHoursPayload,
  buildDeliveryOperationPayload,
  buildDeliverySchedulePayload,
  getDeliveryFeeValue,
  getDeliveryHourValue,
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
import FeatureGate from '@/features/plans/components/FeatureGate'

export default function IntegracoesPage() {
  const params = useSearchParams()
  const account = useMercadoPagoAccount()
  const disconnect = useDisconnectMercadoPagoAccount()
  const hasWhatsappNotifications = useHasFeature('whatsapp_notifications')
  const notificationSettings = useNotificationSettings(hasWhatsappNotifications)
  const updateNotificationSettings = useUpdateNotificationSettings()
  const deliverySettings = useDeliverySettings()
  const updateDeliverySettings = useUpdateDeliverySettings()
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<string | null>(null)
  const [openingHourInput, setOpeningHourInput] = useState<string | null>(null)
  const [closingHourInput, setClosingHourInput] = useState<string | null>(null)

  useEffect(() => {
    const message = getMercadoPagoAlertMessage(params.get('mercado_pago'))

    if (message) {
      alert(message)
    }
  }, [params])

  const connected = !!account.data
  const deliveryFeeValue = getDeliveryFeeValue(deliveryFeeInput, deliverySettings.data?.flat_fee)
  const openingHourValue = getDeliveryHourValue(openingHourInput, deliverySettings.data?.opens_at)
  const closingHourValue = getDeliveryHourValue(closingHourInput, deliverySettings.data?.closes_at)
  const whatsappOptions =
    hasWhatsappNotifications && notificationSettings.data ? whatsappOptionDefinitions : []

  return (
    <FeatureGate feature="payments">
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
        openingHourValue={openingHourValue}
        closingHourValue={closingHourValue}
        onDeliveryToggle={async (payload) => {
          await updateDeliverySettings.mutateAsync(payload)
        }}
        onDeliveryOperationChange={async (acceptingOrders) => {
          if (!deliverySettings.data) return
          await updateDeliverySettings.mutateAsync(
            buildDeliveryOperationPayload(deliverySettings.data, acceptingOrders)
          )
        }}
        onDeliveryScheduleChange={async (enabled) => {
          if (!deliverySettings.data) return
          await updateDeliverySettings.mutateAsync(
            buildDeliverySchedulePayload(deliverySettings.data, enabled)
          )
        }}
        onDeliveryHoursChange={(field, value) => {
          if (field === 'opens_at') {
            setOpeningHourInput(value)
            return
          }
          setClosingHourInput(value)
        }}
        onDeliveryFeeInputChange={setDeliveryFeeInput}
        onDeliveryFeeSave={async (payload) => {
          await updateDeliverySettings.mutateAsync(payload)
          setDeliveryFeeInput(null)
        }}
        onDeliveryHoursSave={async (payload) => {
          await updateDeliverySettings.mutateAsync(payload)
          setOpeningHourInput(null)
          setClosingHourInput(null)
        }}
        hasWhatsappNotifications={hasWhatsappNotifications}
        notificationSettingsLoading={
          hasWhatsappNotifications ? notificationSettings.isLoading : false
        }
        notificationSettingsData={
          hasWhatsappNotifications ? notificationSettings.data ?? null : null
        }
        notificationSettingsPending={updateNotificationSettings.isPending}
        whatsappOptions={whatsappOptions}
        onToggleWhatsappOption={async (payload) => {
          await updateNotificationSettings.mutateAsync(payload)
        }}
      />
    </FeatureGate>
  )
}
