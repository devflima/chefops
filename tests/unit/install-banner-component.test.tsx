import React from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    Download: Icon,
    X: Icon,
  }
})

function flattenElements(node: React.ReactNode): React.ReactElement[] {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') {
    return []
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => flattenElements(child))
  }

  if (!React.isValidElement(node)) {
    return []
  }

  if (typeof node.type === 'function') {
    return flattenElements(node.type(node.props))
  }

  return [node, ...flattenElements(node.props.children)]
}

function getTextContent(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => getTextContent(child)).join('')
  if (!React.isValidElement(node)) return ''
  return getTextContent(node.props.children)
}

describe('InstallBanner component', () => {
  afterEach(() => {
    vi.doUnmock('react')
    vi.resetModules()
  })

  it('renderiza banner quando há prompt pendente', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    let stateCall = 0

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => {
        stateCall += 1
        if (stateCall === 1) {
          return [
            {
              prompt: vi.fn(),
              userChoice: Promise.resolve({ outcome: 'accepted' }),
            },
            vi.fn(),
          ]
        }

        if (stateCall === 2) {
          return [false, vi.fn()]
        }

        return [initialValue, vi.fn()]
      },
      useEffect: vi.fn(),
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    const markup = renderToStaticMarkup(React.createElement(InstallBanner))

    expect(markup).toContain('Instalar ChefOps')
    expect(markup).toContain('Acesse mais rápido pelo celular')
    expect(markup).toContain('Instalar')
  })

  it('retorna vazio quando já foi dispensado', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    let stateCall = 0

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => {
        stateCall += 1
        if (stateCall === 1) {
          return [null, vi.fn()]
        }

        if (stateCall === 2) {
          return [true, vi.fn()]
        }

        return [initialValue, vi.fn()]
      },
      useEffect: vi.fn(),
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    expect(renderToStaticMarkup(React.createElement(InstallBanner))).toBe('')
  })

  it('exibe ações de instalar e dispensar quando o banner está visível', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    let stateCall = 0

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => {
        stateCall += 1

        if (stateCall === 1) {
          return [
            {
              prompt: vi.fn(),
              userChoice: Promise.resolve({ outcome: 'accepted' as const }),
            },
            vi.fn(),
          ]
        }

        if (stateCall === 2) {
          return [false, vi.fn()]
        }

        return [initialValue, vi.fn()]
      },
      useEffect: vi.fn(),
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    const tree = React.createElement(InstallBanner)
    const buttons = flattenElements(tree).filter((element) => element.type === 'button')
    const installButton = buttons.find((button) => getTextContent(button).includes('Instalar'))
    const dismissButton = buttons.find((button) => getTextContent(button).trim() === '')

    expect(installButton).toBeTruthy()
    expect(dismissButton).toBeTruthy()
  })

  it('aciona instalacao e limpa o prompt quando o usuario aceita', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    const setPrompt = vi.fn()
    const setDismissed = vi.fn()
    const promptMock = vi.fn().mockResolvedValue(undefined)
    let stateCall = 0

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => {
        stateCall += 1

        if (stateCall === 1) {
          return [
            {
              prompt: promptMock,
              userChoice: Promise.resolve({ outcome: 'accepted' as const }),
            },
            setPrompt,
          ]
        }

        if (stateCall === 2) {
          return [false, setDismissed]
        }

        return [initialValue, vi.fn()]
      },
      useEffect: vi.fn(),
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    const buttons = flattenElements(React.createElement(InstallBanner)).filter((element) => element.type === 'button')
    const installButton = buttons.find((button) => getTextContent(button).includes('Instalar'))

    await installButton?.props.onClick()

    expect(promptMock).toHaveBeenCalled()
    expect(setDismissed).toHaveBeenCalledWith(true)
    expect(setPrompt).toHaveBeenCalledWith(null)
  })

  it('dispensa o banner e persiste a escolha no localStorage', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    const setDismissed = vi.fn()
    const setItem = vi.fn()
    let stateCall = 0

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem,
    })

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => {
        stateCall += 1

        if (stateCall === 1) {
          return [
            {
              prompt: vi.fn(),
              userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
            },
            vi.fn(),
          ]
        }

        if (stateCall === 2) {
          return [false, setDismissed]
        }

        return [initialValue, vi.fn()]
      },
      useEffect: vi.fn(),
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    const buttons = flattenElements(React.createElement(InstallBanner)).filter((element) => element.type === 'button')
    const dismissButton = buttons.find((button) => getTextContent(button).trim() === '')

    dismissButton?.props.onClick()

    expect(setItem).toHaveBeenCalledWith('pwa-dismissed', '1')
    expect(setDismissed).toHaveBeenCalledWith(true)
  })

  it('não marca como dispensado quando a instalação é rejeitada pelo usuário', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    const setPrompt = vi.fn()
    const setDismissed = vi.fn()
    const promptMock = vi.fn().mockResolvedValue(undefined)
    let stateCall = 0

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => {
        stateCall += 1

        if (stateCall === 1) {
          return [
            {
              prompt: promptMock,
              userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
            },
            setPrompt,
          ]
        }

        if (stateCall === 2) {
          return [false, setDismissed]
        }

        return [initialValue, vi.fn()]
      },
      useEffect: vi.fn(),
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    const buttons = flattenElements(React.createElement(InstallBanner)).filter((element) => element.type === 'button')
    const installButton = buttons.find((button) => getTextContent(button).includes('Instalar'))

    await installButton?.props.onClick()

    expect(promptMock).toHaveBeenCalled()
    expect(setDismissed).not.toHaveBeenCalled()
    expect(setPrompt).toHaveBeenCalledWith(null)
  })

  it('registra o listener de beforeinstallprompt quando não deve pular o banner', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    const cleanupFns: Array<() => void> = []

    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    })
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      addEventListener,
      removeEventListener,
    })

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => [initialValue, vi.fn()],
      useEffect: (effect: () => void | (() => void)) => {
        const cleanup = effect()
        if (typeof cleanup === 'function') cleanupFns.push(cleanup)
      },
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    renderToStaticMarkup(React.createElement(InstallBanner))

    expect(addEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    cleanupFns.forEach((cleanup) => cleanup())
    expect(removeEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
  })

  it('captura o evento beforeinstallprompt e salva o prompt no estado', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    const addEventListener = vi.fn()
    const setPrompt = vi.fn()

    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    })
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      addEventListener,
      removeEventListener: vi.fn(),
    })

    let stateCall = 0

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => {
        stateCall += 1

        if (stateCall === 1) {
          return [initialValue, setPrompt]
        }

        if (stateCall === 2) {
          return [false, vi.fn()]
        }

        return [initialValue, vi.fn()]
      },
      useEffect: (effect: () => void | (() => void)) => {
        effect()
      },
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    renderToStaticMarkup(React.createElement(InstallBanner))

    const handler = addEventListener.mock.calls[0]?.[1] as ((event: Event) => void) | undefined
    const event = {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    } as unknown as Event

    handler?.(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(setPrompt).toHaveBeenCalledWith(event)
  })

  it('não registra listener quando o banner deve ser ignorado no efeito', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    const addEventListener = vi.fn()

    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('1'),
      setItem: vi.fn(),
    })
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      addEventListener,
      removeEventListener: vi.fn(),
    })

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => [initialValue, vi.fn()],
      useEffect: (effect: () => void | (() => void)) => {
        effect()
      },
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    renderToStaticMarkup(React.createElement(InstallBanner))

    expect(addEventListener).not.toHaveBeenCalled()
  })

  it('ignora o clique em instalar quando nao existe prompt ativo', async () => {
    const actualReact = await vi.importActual<typeof import('react')>('react')
    const promptSpy = vi.fn()
    let stateCall = 0

    vi.doMock('@/features/pwa/install-banner', async () => {
      const actual = await vi.importActual<typeof import('@/features/pwa/install-banner')>('@/features/pwa/install-banner')
      return {
        ...actual,
        shouldRenderInstallBanner: () => true,
      }
    })

    vi.doMock('react', () => ({
      ...actualReact,
      useState: (initialValue: unknown) => {
        stateCall += 1
        if (stateCall === 1) {
          return [null, vi.fn()]
        }

        if (stateCall === 2) {
          return [false, vi.fn()]
        }

        return [initialValue, vi.fn()]
      },
      useEffect: vi.fn(),
    }))

    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')
    const buttons = flattenElements(React.createElement(InstallBanner)).filter((element) => element.type === 'button')
    const installButton = buttons.find((button) => getTextContent(button).includes('Instalar'))

    await expect(installButton?.props.onClick()).resolves.toBeUndefined()
    expect(promptSpy).not.toHaveBeenCalled()
  })
})
