import { describe, expect, it, vi } from 'vitest'

import {
  calculateDistanceDeliveryFee,
  calculateHaversineDistanceKm,
  resolveDeliveryQuote,
} from '@/lib/delivery-pricing'

describe('delivery pricing helpers', () => {
  it('calcula distância por haversine e taxa por km', () => {
    expect(
      calculateHaversineDistanceKm(
        { lat: -23.55052, lon: -46.633308 },
        { lat: -23.561414, lon: -46.656571 },
      ),
    ).toBeGreaterThan(2)

    expect(
      calculateDistanceDeliveryFee(4.5, {
        delivery_enabled: true,
        flat_fee: 5,
        fee_per_km: 2,
      }),
    ).toBe(14)
  })

  it('resolve cotação fixa e por distância', async () => {
    const fixed = await resolveDeliveryQuote(
      {
        delivery_enabled: true,
        flat_fee: 8,
        pricing_mode: 'flat',
      },
      {
        zip_code: '01001000',
        street: 'Rua A',
        number: '10',
        city: 'São Paulo',
        state: 'SP',
      },
      vi.fn(),
    )

    expect(fixed).toEqual({ ok: true, deliveryFee: 8, distanceKm: null, pricingMode: 'flat' })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: '-23.55052', lon: '-46.633308' }]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: '-23.561414', lon: '-46.656571' }]), { status: 200 }),
      )

    const quoted = await resolveDeliveryQuote(
      {
        delivery_enabled: true,
        flat_fee: 5,
        pricing_mode: 'distance',
        max_radius_km: 10,
        fee_per_km: 2,
        origin_zip_code: '01001000',
        origin_street: 'Praça da Sé',
        origin_number: '100',
        origin_city: 'São Paulo',
        origin_state: 'SP',
      },
      {
        zip_code: '01310930',
        street: 'Avenida Paulista',
        number: '1000',
        city: 'São Paulo',
        state: 'SP',
      },
      fetchMock as unknown as typeof fetch,
    )

    expect(quoted).toMatchObject({ ok: true, pricingMode: 'distance' })
    if (quoted.ok) {
      expect(quoted.distanceKm).toBeGreaterThan(2)
      expect(quoted.deliveryFee).toBeGreaterThan(5)
    }
  })

  it('bloqueia endereço fora do raio', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: '-23.55052', lon: '-46.633308' }]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ lat: '-22.906847', lon: '-43.172897' }]), { status: 200 }),
      )

    const quoted = await resolveDeliveryQuote(
      {
        delivery_enabled: true,
        flat_fee: 5,
        pricing_mode: 'distance',
        max_radius_km: 5,
        fee_per_km: 2,
        origin_zip_code: '01001000',
        origin_street: 'Praça da Sé',
        origin_number: '100',
        origin_city: 'São Paulo',
        origin_state: 'SP',
      },
      {
        zip_code: '20040002',
        street: 'Rua Primeiro de Março',
        number: '10',
        city: 'Rio de Janeiro',
        state: 'RJ',
      },
      fetchMock as unknown as typeof fetch,
    )

    expect(quoted).toEqual({ ok: false, error: 'Endereço fora do raio de entrega de 5 km.' })
  })
})
