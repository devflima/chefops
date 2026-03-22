import { describe, expect, it } from 'vitest'

import {
  shouldDismissAfterInstall,
  shouldRenderInstallBanner,
  shouldSkipInstallBanner,
} from '@/features/pwa/install-banner'

describe('install banner helpers', () => {
  it('decide quando pular o banner', () => {
    expect(shouldSkipInstallBanner('1', false)).toBe(true)
    expect(shouldSkipInstallBanner(null, true)).toBe(true)
    expect(shouldSkipInstallBanner(null, false)).toBe(false)
  })

  it('decide quando renderizar o banner', () => {
    expect(shouldRenderInstallBanner({}, false)).toBe(true)
    expect(shouldRenderInstallBanner(null, false)).toBe(false)
    expect(shouldRenderInstallBanner({}, true)).toBe(false)
  })

  it('decide quando dispensar após instalação', () => {
    expect(shouldDismissAfterInstall('accepted')).toBe(true)
    expect(shouldDismissAfterInstall('dismissed')).toBe(false)
  })
})
