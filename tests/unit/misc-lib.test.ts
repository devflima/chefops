import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const { recordAdminTenantEvent } = await import('@/lib/admin-audit')
const { cn } = await import('@/lib/utils')
const { registerServiceWorker } = await import('@/lib/registerSW')

describe('misc libs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recordAdminTenantEvent persiste evento admin', async () => {
    let row: Record<string, unknown> | undefined
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        insert: (value: Record<string, unknown>) => {
          row = value
          return Promise.resolve({ error: null })
        },
      }),
    } as never)

    await recordAdminTenantEvent({
      tenantId: 'tenant-1',
      eventType: 'updated',
      message: 'Tenant updated',
    })

    expect(row).toEqual({
      tenant_id: 'tenant-1',
      admin_user_id: null,
      event_type: 'updated',
      message: 'Tenant updated',
      metadata: {},
    })
  })

  it('recordAdminTenantEvent persiste adminUserId e metadata e propaga erro', async () => {
    const insertError = new Error('insert failed')
    const insert = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: insertError })

    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        insert,
      }),
    } as never)

    await recordAdminTenantEvent({
      tenantId: 'tenant-2',
      adminUserId: 'admin-1',
      eventType: 'plan_changed',
      message: 'Plano alterado',
      metadata: { from: 'starter', to: 'pro' },
    })

    expect(insert).toHaveBeenNthCalledWith(1, {
      tenant_id: 'tenant-2',
      admin_user_id: 'admin-1',
      event_type: 'plan_changed',
      message: 'Plano alterado',
      metadata: { from: 'starter', to: 'pro' },
    })

    await expect(
      recordAdminTenantEvent({
        tenantId: 'tenant-2',
        eventType: 'failed',
        message: 'Falha ao registrar evento',
      }),
    ).rejects.toThrow('insert failed')
  })

  it('cn faz merge de classes tailwind', () => {
    expect(cn('p-2', 'p-4', 'font-bold')).toBe('p-4 font-bold')
  })

  it('registerServiceWorker respeita ambiente e registra no load', async () => {
    const addEventListener = vi.fn((_event: string, handler: () => void) => handler())
    const register = vi.fn().mockResolvedValue({ scope: '/' })
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.stubGlobal('window', { addEventListener } as unknown as Window)
    vi.stubGlobal('navigator', { serviceWorker: { register } } as unknown as Navigator)

    registerServiceWorker()
    await Promise.resolve()

    expect(addEventListener).toHaveBeenCalledWith('load', expect.any(Function))
    expect(register).toHaveBeenCalledWith('/sw.js')

    register.mockRejectedValueOnce(new Error('fail'))
    registerServiceWorker()
    await Promise.resolve()
    await Promise.resolve()

    expect(consoleLog).toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalled()
  })

  it('registerServiceWorker ignora execução fora do browser ou sem service worker', () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('navigator', {})

    expect(() => registerServiceWorker()).not.toThrow()

    const addEventListener = vi.fn()
    vi.stubGlobal('window', { addEventListener } as unknown as Window)
    vi.stubGlobal('navigator', {} as Navigator)

    registerServiceWorker()

    expect(addEventListener).not.toHaveBeenCalled()
  })
})
