import { randomInt, createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  normalizeBrazilPhone,
  normalizeWhatsappChannelAddress,
} from '@/lib/order-whatsapp'

const VERIFICATION_TTL_MINUTES = 10
const MAX_VERIFICATION_ATTEMPTS = 5

function getTwilioVerificationConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    return null
  }

  return {
    accountSid,
    authToken,
    from: normalizeWhatsappChannelAddress(from),
  }
}

export function generateCustomerPhoneVerificationCode() {
  return String(randomInt(100000, 1000000))
}

export function buildCustomerPhoneVerificationMessage(params: {
  tenantName: string
  code: string
}) {
  return `Seu código de verificação da ${params.tenantName} é ${params.code}. Ele expira em ${VERIFICATION_TTL_MINUTES} minutos.`
}

function buildVerificationCodeHash(params: {
  tenantId: string
  phone: string
  code: string
}) {
  return createHash('sha256')
    .update(`${params.tenantId}:${params.phone}:${params.code}`)
    .digest('hex')
}

export async function sendCustomerPhoneVerificationCode(params: {
  tenantId: string
  phone: string
}) {
  const admin = createAdminClient()
  const config = getTwilioVerificationConfig()

  if (!config) {
    throw new Error('WhatsApp de verificação não configurado.')
  }

  const normalizedPhone = normalizeBrazilPhone(params.phone)
  if (!normalizedPhone) {
    throw new Error('Telefone inválido.')
  }

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .select('id, name')
    .eq('id', params.tenantId)
    .maybeSingle()

  if (tenantError || !tenant) {
    throw tenantError ?? new Error('Estabelecimento não encontrado.')
  }

  const code = generateCustomerPhoneVerificationCode()
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60_000).toISOString()

  const { data: record, error: insertError } = await admin
    .from('customer_phone_verifications')
    .insert({
      tenant_id: params.tenantId,
      phone: normalizedPhone.replace(/[^\d]/g, ''),
      code_hash: buildVerificationCodeHash({
        tenantId: params.tenantId,
        phone: normalizedPhone,
        code,
      }),
      channel: 'whatsapp',
      expires_at: expiresAt,
      attempts: 0,
    })
    .select('id')
    .single()

  if (insertError || !record) {
    throw insertError ?? new Error('Não foi possível registrar a verificação.')
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: `whatsapp:${normalizedPhone}`,
        From: config.from,
        Body: buildCustomerPhoneVerificationMessage({
          tenantName: tenant.name,
          code,
        }),
      }),
    }
  )

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    await admin
      .from('customer_phone_verifications')
      .update({
        error_message: json?.message || 'twilio-send-failed',
      })
      .eq('id', record.id)

    throw new Error(json?.message || 'Não foi possível enviar o código de verificação.')
  }

  await admin
    .from('customer_phone_verifications')
    .update({
      provider_message_id: json?.sid ?? null,
      sent_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', record.id)

  return { sent: true as const, expiresInMinutes: VERIFICATION_TTL_MINUTES }
}

export async function verifyCustomerPhoneVerificationCode(params: {
  tenantId: string
  phone: string
  code: string
}) {
  const admin = createAdminClient()
  const normalizedPhone = normalizeBrazilPhone(params.phone)

  if (!normalizedPhone) {
    throw new Error('Telefone inválido.')
  }

  const { data: record, error } = await admin
    .from('customer_phone_verifications')
    .select('id, code_hash, expires_at, attempts')
    .eq('tenant_id', params.tenantId)
    .eq('phone', normalizedPhone.replace(/[^\d]/g, ''))
    .is('verified_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  if (!record) {
    return { verified: false as const, reason: 'missing' as const }
  }

  if (Number(record.attempts ?? 0) >= MAX_VERIFICATION_ATTEMPTS) {
    return { verified: false as const, reason: 'too_many_attempts' as const }
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { verified: false as const, reason: 'expired' as const }
  }

  const expectedHash = buildVerificationCodeHash({
    tenantId: params.tenantId,
    phone: normalizedPhone,
    code: params.code,
  })

  if (record.code_hash !== expectedHash) {
    const nextAttempts = Number(record.attempts ?? 0) + 1

    await admin
      .from('customer_phone_verifications')
      .update({ attempts: nextAttempts })
      .eq('id', record.id)

    if (nextAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      return { verified: false as const, reason: 'too_many_attempts' as const }
    }

    return { verified: false as const, reason: 'invalid' as const }
  }

  await admin
    .from('customer_phone_verifications')
    .update({
      verified_at: new Date().toISOString(),
      attempts: Number(record.attempts ?? 0) + 1,
    })
    .eq('id', record.id)

  return { verified: true as const }
}
