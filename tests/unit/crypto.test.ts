import { afterEach, describe, expect, it } from 'vitest'

import { decryptSecret, encryptSecret } from '@/lib/crypto'

describe('crypto', () => {
  afterEach(() => {
    delete process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY
  })

  it('encryptSecret e decryptSecret fazem roundtrip com a mesma chave', () => {
    process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY = 'test-secret-key'

    const encrypted = encryptSecret('super-secret')

    expect(encrypted).not.toBe('super-secret')
    expect(decryptSecret(encrypted)).toBe('super-secret')
  })

  it('decryptSecret rejeita payload inválido', () => {
    process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY = 'test-secret-key'

    expect(() => decryptSecret('invalid-payload')).toThrow(/Invalid encrypted payload format/)
  })

  it('encryptSecret exige a env de criptografia', () => {
    expect(() => encryptSecret('value')).toThrow(/Missing PAYMENT_ACCOUNT_ENCRYPTION_KEY env/)
  })
})
