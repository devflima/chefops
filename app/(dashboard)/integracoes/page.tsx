'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useDisconnectMercadoPagoAccount,
  useMercadoPagoAccount,
} from '@/features/payments/hooks/useMercadoPagoAccount'
import { IntegrationsPageContent } from '@/features/payments/IntegrationsPageContent'
import {
  buildDeliveryOperationPayload,
  buildDeliveryPricingModePayload,
  buildDeliverySchedulePayload,
  getDeliveryFeePerKmValue,
  getDeliveryFeeValue,
  getDeliveryHourValue,
  getDeliveryOriginValue,
  getDeliveryRadiusValue,
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
  const [deliveryRadiusInput, setDeliveryRadiusInput] = useState<string | null>(null)
  const [deliveryFeePerKmInput, setDeliveryFeePerKmInput] = useState<string | null>(null)
  const [deliveryOriginZipInput, setDeliveryOriginZipInput] = useState<string | null>(null)
  const [deliveryOriginStreetInput, setDeliveryOriginStreetInput] = useState<string | null>(null)
  const [deliveryOriginNumberInput, setDeliveryOriginNumberInput] = useState<string | null>(null)
  const [deliveryOriginNeighborhoodInput, setDeliveryOriginNeighborhoodInput] = useState<string | null>(null)
  const [deliveryOriginCityInput, setDeliveryOriginCityInput] = useState<string | null>(null)
  const [deliveryOriginStateInput, setDeliveryOriginStateInput] = useState<string | null>(null)
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
  const deliveryRadiusValue = getDeliveryRadiusValue(deliveryRadiusInput, deliverySettings.data?.max_radius_km)
  const deliveryFeePerKmValue = getDeliveryFeePerKmValue(deliveryFeePerKmInput, deliverySettings.data?.fee_per_km)
  const deliveryOriginZipValue = getDeliveryOriginValue(deliveryOriginZipInput, deliverySettings.data?.origin_zip_code)
  const deliveryOriginStreetValue = getDeliveryOriginValue(deliveryOriginStreetInput, deliverySettings.data?.origin_street)
  const deliveryOriginNumberValue = getDeliveryOriginValue(deliveryOriginNumberInput, deliverySettings.data?.origin_number)
  const deliveryOriginNeighborhoodValue = getDeliveryOriginValue(deliveryOriginNeighborhoodInput, deliverySettings.data?.origin_neighborhood)
  const deliveryOriginCityValue = getDeliveryOriginValue(deliveryOriginCityInput, deliverySettings.data?.origin_city)
  const deliveryOriginStateValue = getDeliveryOriginValue(deliveryOriginStateInput, deliverySettings.data?.origin_state)
  const openingHourValue = getDeliveryHourValue(openingHourInput, deliverySettings.data?.opens_at)
  const closingHourValue = getDeliveryHourValue(closingHourInput, deliverySettings.data?.closes_at)
  const whatsappOptions = hasWhatsappNotifications && notificationSettings.data ? whatsappOptionDefinitions : []

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
        deliveryRadiusValue={deliveryRadiusValue}
        deliveryFeePerKmValue={deliveryFeePerKmValue}
        deliveryOriginZipValue={deliveryOriginZipValue}
        deliveryOriginStreetValue={deliveryOriginStreetValue}
        deliveryOriginNumberValue={deliveryOriginNumberValue}
        deliveryOriginNeighborhoodValue={deliveryOriginNeighborhoodValue}
        deliveryOriginCityValue={deliveryOriginCityValue}
        deliveryOriginStateValue={deliveryOriginStateValue}
        openingHourValue={openingHourValue}
        closingHourValue={closingHourValue}
        onDeliveryToggle={async (payload) => {
          await updateDeliverySettings.mutateAsync(payload)
        }}
        onDeliveryOperationChange={async (acceptingOrders) => {
          if (!deliverySettings.data) return
          await updateDeliverySettings.mutateAsync(buildDeliveryOperationPayload(deliverySettings.data, acceptingOrders))
        }}
        onDeliveryScheduleChange={async (enabled) => {
          if (!deliverySettings.data) return
          await updateDeliverySettings.mutateAsync(buildDeliverySchedulePayload(deliverySettings.data, enabled))
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
        onDeliveryPricingModeChange={async (mode) => {
          if (!deliverySettings.data) return
          await updateDeliverySettings.mutateAsync(buildDeliveryPricingModePayload(deliverySettings.data, mode))
        }}
        onDeliveryDistanceInputChange={(field, value) => {
          if (field === 'max_radius_km') setDeliveryRadiusInput(value)
          if (field === 'fee_per_km') setDeliveryFeePerKmInput(value)
          if (field === 'origin_zip_code') setDeliveryOriginZipInput(value)
          if (field === 'origin_street') setDeliveryOriginStreetInput(value)
          if (field === 'origin_number') setDeliveryOriginNumberInput(value)
          if (field === 'origin_neighborhood') setDeliveryOriginNeighborhoodInput(value)
          if (field === 'origin_city') setDeliveryOriginCityInput(value)
          if (field === 'origin_state') setDeliveryOriginStateInput(value.toUpperCase())
        }}
        onDeliveryDistanceSave={async (payload) => {
          await updateDeliverySettings.mutateAsync(payload)
          setDeliveryRadiusInput(null)
          setDeliveryFeePerKmInput(null)
          setDeliveryOriginZipInput(null)
          setDeliveryOriginStreetInput(null)
          setDeliveryOriginNumberInput(null)
          setDeliveryOriginNeighborhoodInput(null)
          setDeliveryOriginCityInput(null)
          setDeliveryOriginStateInput(null)
        }}
        onDeliveryHoursSave={async (payload) => {
          await updateDeliverySettings.mutateAsync(payload)
          setOpeningHourInput(null)
          setClosingHourInput(null)
        }}
        hasWhatsappNotifications={hasWhatsappNotifications}
        notificationSettingsLoading={hasWhatsappNotifications ? notificationSettings.isLoading : false}
        notificationSettingsData={hasWhatsappNotifications ? notificationSettings.data ?? null : null}
        notificationSettingsPending={updateNotificationSettings.isPending}
        whatsappOptions={whatsappOptions}
        onToggleWhatsappOption={async (payload) => {
          await updateNotificationSettings.mutateAsync(payload)
        }}
      />
    </FeatureGate>
  )
}
