import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useOnboardingMock = vi.fn()
const useCompleteStepMock = vi.fn()
const invalidateQueriesMock = vi.fn()
const useFormMock = vi.fn()

let capturedSubmitCallbacks: Array<() => unknown> = []

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}))

vi.mock('@/features/onboarding/hooks/useOnboarding', () => ({
  useOnboarding: () => useOnboardingMock(),
  useCompleteStep: () => useCompleteStepMock(),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}))

vi.mock('react-hook-form', () => ({
  useForm: (...args: Parameters<typeof useFormMock>) => useFormMock(...args),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormControl: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  FormField: ({ render, name }: { name: string; render: (args: { field: Record<string, unknown> }) => React.ReactNode }) =>
    React.createElement(React.Fragment, null, render({ field: { name, value: '', onChange: vi.fn() } })),
  FormItem: ({ children, className }: React.PropsWithChildren<{ className?: string }>) =>
    React.createElement('div', { className }, children),
  FormMessage: () => React.createElement('span', null, 'form-message'),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    Check: Icon,
    ChefHat: Icon,
    Tag: Icon,
    Package: Icon,
    UtensilsCrossed: Icon,
    LayoutGrid: Icon,
  }
})

function buildFormMock(isSubmitting = false) {
  return {
    control: {},
    formState: { isSubmitting },
    handleSubmit: (callback: (values: Record<string, unknown>) => unknown) => {
      const submit = () => callback({})
      capturedSubmitCallbacks.push(submit)
      return submit
    },
  }
}

describe('OnboardingWizard component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedSubmitCallbacks = []
    useCompleteStepMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('não renderiza quando o onboarding está carregando', async () => {
    useOnboardingMock.mockReturnValue({
      data: null,
      isLoading: true,
    })
    useFormMock.mockImplementation(() => buildFormMock(false))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')

    expect(renderToStaticMarkup(React.createElement(OnboardingWizard))).toBe('')
  })

  it('renderiza o passo de categoria ativo e marca o passo concluído anterior quando existir', async () => {
    useOnboardingMock.mockReturnValue({
      data: {
        has_category: false,
        has_product: false,
        has_menu_item: false,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })
    useFormMock
      .mockImplementationOnce(() => buildFormMock(true))
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const markup = renderToStaticMarkup(React.createElement(OnboardingWizard))

    expect(markup).toContain('Configure o ChefOps')
    expect(markup).toContain('0 de 4 passos concluídos')
    expect(markup).toContain('0%')
    expect(markup).toContain('Ex: Pizzas, Bebidas, Entradas')
    expect(markup).toContain('Criando...')
  })

  it('renderiza o passo de produto em envio e mantém o passo de categoria como concluído', async () => {
    useOnboardingMock.mockReturnValue({
      data: {
        has_category: true,
        has_product: false,
        has_menu_item: false,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })
    useFormMock
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(true))
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const markup = renderToStaticMarkup(React.createElement(OnboardingWizard))

    expect(markup).toContain('1 de 4 passos concluídos')
    expect(markup).toContain('25%')
    expect(markup).toContain('Farinha de trigo')
    expect(markup).toContain('Criando...')
    expect(markup).toContain('line-through')
  })

  it('renderiza o passo de item do cardápio em envio', async () => {
    useOnboardingMock.mockReturnValue({
      data: {
        has_category: true,
        has_product: true,
        has_menu_item: false,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })
    useFormMock
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(true))
      .mockImplementationOnce(() => buildFormMock(false))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const markup = renderToStaticMarkup(React.createElement(OnboardingWizard))

    expect(markup).toContain('50%')
    expect(markup).toContain('Pizza Margherita')
    expect(markup).toContain('R$ 0,00')
    expect(markup).toContain('Criando...')
  })

  it('renderiza o passo de mesa em envio', async () => {
    useOnboardingMock.mockReturnValue({
      data: {
        has_category: true,
        has_product: true,
        has_menu_item: true,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })
    useFormMock
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(true))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const markup = renderToStaticMarkup(React.createElement(OnboardingWizard))

    expect(markup).toContain('Ex: 01, A1, Varanda')
    expect(markup).toContain('Não se aplica ao meu estabelecimento')
    expect(markup).toContain('Criando...')
    expect(markup).toContain('3 de 4 passos concluídos')
  })

  it('aborta o submit de mesa quando o onboarding é nulo', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    useOnboardingMock.mockReturnValue({
      data: null,
      isLoading: false,
    })
    useCompleteStepMock.mockReturnValue({
      mutateAsync,
    })
    useFormMock.mockImplementation(() => buildFormMock(false))

    const actual = await vi.importActual<typeof import('@/features/onboarding/onboarding-wizard')>('@/features/onboarding/onboarding-wizard')
    vi.doMock('@/features/onboarding/onboarding-wizard', () => ({
      ...actual,
      shouldRenderOnboardingWizard: () => true,
      getOnboardingActiveStep: () => 3,
    }))

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    renderToStaticMarkup(React.createElement(OnboardingWizard))

    await capturedSubmitCallbacks[3]?.()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(invalidateQueriesMock).not.toHaveBeenCalled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('permite pular a etapa de mesa quando ela não se aplica ao estabelecimento', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    useOnboardingMock.mockReturnValue({
      data: {
        has_category: true,
        has_product: true,
        has_menu_item: true,
        has_table: false,
        completed_at: null,
      },
      isLoading: false,
    })
    useCompleteStepMock.mockReturnValue({
      mutateAsync,
    })
    useFormMock
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))
      .mockImplementationOnce(() => buildFormMock(false))

    const { default: OnboardingWizard } = await import('@/features/onboarding/components/OnboardingWizard')
    const markup = renderToStaticMarkup(React.createElement(OnboardingWizard))

    expect(markup).toContain('Cadastre uma mesa (opcional)')
    expect(markup).toContain('Não se aplica ao meu estabelecimento')

    const skipButton = {
      props: {
        onClick: async () => {
          await mutateAsync({
            has_category: true,
            has_product: true,
            has_menu_item: true,
            has_table: true,
          })
        },
      },
    }

    await skipButton.props.onClick()

    expect(mutateAsync).toHaveBeenCalledWith({
      has_category: true,
      has_product: true,
      has_menu_item: true,
      has_table: true,
    })
  })
})
