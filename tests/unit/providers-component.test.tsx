import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const queryClientMock = vi.fn()
const registerServiceWorkerMock = vi.fn()

vi.mock('@/lib/registerSW', () => ({
  registerServiceWorker: () => registerServiceWorkerMock(),
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class QueryClient {
    constructor(options: unknown) {
      queryClientMock(options)
    }
  },
  QueryClientProvider: ({
    children,
    client,
  }: React.PropsWithChildren<{ client: unknown }>) =>
    React.createElement('div', { 'data-client': Boolean(client) }, children),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    useEffect: (callback: () => void | (() => void)) => {
      callback()
    },
    useState: <T,>(initialValue: T | (() => T)) => [
      typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue,
      vi.fn(),
    ],
  }
})

describe('Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cria QueryClient com defaults esperados e registra service worker', async () => {
    const { default: Providers } = await import('@/lib/providers')

    const markup = renderToStaticMarkup(
      React.createElement(Providers, null, React.createElement('span', null, 'provider-child')),
    )

    expect(markup).toContain('provider-child')
    expect(registerServiceWorkerMock).toHaveBeenCalledOnce()
    expect(queryClientMock).toHaveBeenCalledWith({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 30,
          retry: 1,
        },
      },
    })
  })
})
