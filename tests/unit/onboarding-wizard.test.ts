import { describe, expect, it } from 'vitest'

import {
  buildCategoryPayload,
  buildMenuItemPayload,
  buildProductPayload,
  buildTableCompletionPayload,
  buildTablePayload,
  getOnboardingActiveStep,
  getOnboardingCompletedCount,
  getOnboardingProgress,
  onboardingSteps,
  shouldRenderOnboardingWizard,
} from '@/features/onboarding/onboarding-wizard'

describe('onboarding wizard helpers', () => {
  const onboarding = {
    has_category: true,
    has_product: false,
    has_menu_item: false,
    has_table: false,
    completed_at: null,
  }

  it('calcula progresso e passo ativo', () => {
    expect(onboardingSteps).toHaveLength(4)
    expect(getOnboardingCompletedCount(onboarding)).toBe(1)
    expect(getOnboardingProgress(onboarding)).toBe(25)
    expect(getOnboardingActiveStep(onboarding)).toBe(1)
    expect(getOnboardingActiveStep({
      has_category: true,
      has_product: true,
      has_menu_item: true,
      has_table: true,
      completed_at: null,
    })).toBe(3)
  })

  it('decide quando renderizar o wizard', () => {
    expect(shouldRenderOnboardingWizard(null, false)).toBe(false)
    expect(shouldRenderOnboardingWizard(onboarding, true)).toBe(false)
    expect(shouldRenderOnboardingWizard({ ...onboarding, completed_at: '2026-03-21T00:00:00Z' }, false)).toBe(false)
    expect(shouldRenderOnboardingWizard(onboarding, false)).toBe(true)
  })

  it('monta payloads de criação e conclusão', () => {
    expect(buildCategoryPayload({ name: 'Pizzas' })).toEqual({ name: 'Pizzas', display_order: 0 })
    expect(buildProductPayload({ name: 'Farinha', unit: 'kg' })).toEqual({
      name: 'Farinha',
      unit: 'kg',
      cost_price: 0,
      min_stock: 0,
    })
    expect(buildMenuItemPayload({ name: 'Pizza Margherita', price: 32 })).toEqual({
      name: 'Pizza Margherita',
      price: 32,
    })
    expect(buildTablePayload({ number: '10' })).toEqual({ number: '10', capacity: 4 })
    expect(buildTableCompletionPayload(onboarding)).toEqual({
      has_category: true,
      has_product: false,
      has_menu_item: false,
      has_table: true,
    })
    expect(onboardingSteps[3]).toMatchObject({
      title: 'Cadastre uma mesa (opcional)',
    })
  })
})
