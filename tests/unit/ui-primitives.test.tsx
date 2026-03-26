import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

let mockFieldState: { error?: { message?: string } } = {}

function createForwardComponent(tag: string, displayName: string) {
  const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(
    ({ children, ...props }, ref) => React.createElement(tag, { ref, ...props }, children)
  )
  Component.displayName = displayName
  return Component
}

function createWrapperComponent(tag: string, displayName: string) {
  const Component = ({ children, ...props }: Record<string, unknown>) =>
    React.createElement(tag, props, children)
  Component.displayName = displayName
  return Component
}

const SlotRoot = React.forwardRef<HTMLElement, Record<string, unknown>>(
  ({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, { ref, ...props })
    }
    return React.createElement('span', { ref, ...props }, children)
  }
)
SlotRoot.displayName = 'SlotRoot'

const LabelRoot = React.forwardRef<HTMLElement, Record<string, unknown>>(
  ({ children, ...props }, ref) => React.createElement('label', { ref, ...props }, children)
)
LabelRoot.displayName = 'LabelRoot'

const RadixSlot = React.forwardRef<HTMLElement, Record<string, unknown>>(
  ({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, { ref, ...props })
    }
    return React.createElement('span', { ref, ...props }, children)
  }
)
RadixSlot.displayName = 'RadixSlot'

function createIcon(name: string) {
  const Icon = (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-icon': name, ...props })
  Icon.displayName = `${name}-icon`
  return Icon
}

vi.mock('radix-ui', () => {
  return {
    Dialog: {
      Root: createWrapperComponent('div', 'DialogRoot'),
      Trigger: createForwardComponent('button', 'DialogTrigger'),
      Portal: createWrapperComponent('div', 'DialogPortal'),
      Close: createForwardComponent('button', 'DialogClose'),
      Overlay: createForwardComponent('div', 'DialogOverlay'),
      Content: createForwardComponent('div', 'DialogContent'),
      Title: createForwardComponent('h2', 'DialogTitle'),
      Description: createForwardComponent('p', 'DialogDescription'),
    },
    Select: {
      Root: createWrapperComponent('div', 'SelectRoot'),
      Group: createForwardComponent('div', 'SelectGroup'),
      Value: createForwardComponent('span', 'SelectValue'),
      Trigger: createForwardComponent('button', 'SelectTrigger'),
      Icon: createWrapperComponent('span', 'SelectIcon'),
      Portal: createWrapperComponent('div', 'SelectPortal'),
      Content: createForwardComponent('div', 'SelectContent'),
      Viewport: createForwardComponent('div', 'SelectViewport'),
      Label: createForwardComponent('div', 'SelectLabel'),
      Item: createForwardComponent('div', 'SelectItem'),
      ItemIndicator: createWrapperComponent('span', 'SelectItemIndicator'),
      ItemText: createWrapperComponent('span', 'SelectItemText'),
      Separator: createForwardComponent('div', 'SelectSeparator'),
      ScrollUpButton: createForwardComponent('button', 'SelectScrollUpButton'),
      ScrollDownButton: createForwardComponent('button', 'SelectScrollDownButton'),
    },
    Separator: {
      Root: createForwardComponent('div', 'SeparatorRoot'),
    },
    Label: {
      Root: createForwardComponent('label', 'LabelRoot'),
    },
    Slot: {
      Root: SlotRoot,
    },
  }
})

vi.mock('@radix-ui/react-label', () => {
  return {
    Root: LabelRoot,
  }
})

vi.mock('@radix-ui/react-slot', () => {
  return {
    Slot: RadixSlot,
  }
})

vi.mock('react-hook-form', () => ({
  Controller: ({ render }: { render?: (args: { field: Record<string, unknown> }) => React.ReactNode }) =>
    render ? render({ field: { name: 'email', onChange: vi.fn(), onBlur: vi.fn(), value: '' } }) : null,
  FormProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  useFormContext: () => ({
    getFieldState: () => mockFieldState,
    formState: {},
  }),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'dark',
  }),
}))

vi.mock('sonner', () => ({
  Toaster: ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('div', { 'data-slot': 'sonner', ...props }, children),
}))

vi.mock('lucide-react', () => {
  return {
    XIcon: createIcon('x'),
    ChevronDownIcon: createIcon('chevron-down'),
    CheckIcon: createIcon('check'),
    ChevronUpIcon: createIcon('chevron-up'),
    CircleCheckIcon: createIcon('circle-check'),
    InfoIcon: createIcon('info'),
    TriangleAlertIcon: createIcon('triangle-alert'),
    OctagonXIcon: createIcon('octagon-x'),
    Loader2Icon: createIcon('loader-2'),
  }
})

describe('ui primitives', () => {
  it('renderiza dialog com slots principais', async () => {
    const {
      Dialog,
      DialogClose,
      DialogTrigger,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
      DialogFooter,
    } = await import('@/components/ui/dialog')

    const markup = renderToStaticMarkup(
      React.createElement(
        Dialog,
        null,
        React.createElement(DialogTrigger, null, 'Abrir'),
        React.createElement(
          DialogContent,
          { showCloseButton: true },
          React.createElement(
            DialogHeader,
            null,
            React.createElement(DialogTitle, null, 'Título'),
            React.createElement(DialogDescription, null, 'Descrição')
          ),
          React.createElement(DialogFooter, { showCloseButton: true }, 'Rodapé')
        )
      )
    )

    expect(markup).toContain('data-slot="dialog-content"')
    expect(markup).toContain('Título')
    expect(markup).toContain('Descrição')
    expect(markup).toContain('Rodapé')
    expect(markup).toContain('Close')

    const closeMarkup = renderToStaticMarkup(
      React.createElement(DialogClose, null, 'Fechar direto')
    )

    expect(closeMarkup).toContain('data-slot="dialog-close"')
    expect(closeMarkup).toContain('Fechar direto')
  })

  it('renderiza select, separator e tabela com estrutura básica', async () => {
    const {
      Select,
      SelectContent,
      SelectGroup,
      SelectItem,
      SelectLabel,
      SelectScrollDownButton,
      SelectScrollUpButton,
      SelectSeparator,
      SelectTrigger,
      SelectValue,
    } = await import('@/components/ui/select')
    const { Separator } = await import('@/components/ui/separator')
    const {
      Table,
      TableBody,
      TableCaption,
      TableCell,
      TableFooter,
      TableHead,
      TableHeader,
      TableRow,
    } = await import('@/components/ui/table')

    const markup = renderToStaticMarkup(
      React.createElement(
        'div',
        null,
        React.createElement(
          Select,
          null,
          React.createElement(
            SelectTrigger,
            { size: 'sm' },
            React.createElement(SelectValue, null, 'Opção 1')
          ),
          React.createElement(
            SelectContent,
            { position: 'popper' },
            React.createElement(SelectScrollUpButton, null, 'Up'),
            React.createElement(
              SelectGroup,
              null,
              React.createElement(SelectLabel, null, 'Grupo'),
              React.createElement(SelectItem, { value: '1' }, 'Item 1')
            ),
            React.createElement(SelectSeparator, null),
            React.createElement(SelectScrollDownButton, null, 'Down')
          )
        ),
        React.createElement(Separator, { orientation: 'vertical' }),
        React.createElement(
          Table,
          null,
          React.createElement(
            TableCaption,
            null,
            'Legenda'
          ),
          React.createElement(
            TableHeader,
            null,
            React.createElement(
              TableRow,
              null,
              React.createElement(TableHead, null, 'Coluna')
            )
          ),
          React.createElement(
            TableBody,
            null,
            React.createElement(
              TableRow,
              { 'data-state': 'selected' },
              React.createElement(TableCell, null, 'Valor')
            )
          ),
          React.createElement(
            TableFooter,
            null,
            React.createElement(
              TableRow,
              null,
              React.createElement(TableCell, null, 'Total')
            )
          )
        )
      )
    )

    expect(markup).toContain('data-slot="select-trigger"')
    expect(markup).toContain('data-slot="separator"')
    expect(markup).toContain('data-slot="table-container"')
    expect(markup).toContain('Legenda')
    expect(markup).toContain('Valor')
  })

  it('renderiza toaster com tema e ícones customizados', async () => {
    const { Toaster } = await import('@/components/ui/sonner')

    const markup = renderToStaticMarkup(React.createElement(Toaster, { richColors: true }))

    expect(markup).toContain('data-slot="sonner"')
    expect(markup).toContain('class="toaster group"')
    expect(markup).toContain('theme="dark"')
  })

  it('renderiza card com slots e variação de tamanho', async () => {
    const {
      Card,
      CardHeader,
      CardTitle,
      CardDescription,
      CardAction,
      CardContent,
      CardFooter,
    } = await import('@/components/ui/card')

    const markup = renderToStaticMarkup(
      React.createElement(
        Card,
        { size: 'sm', className: 'custom-card' },
        React.createElement(
          CardHeader,
          null,
          React.createElement(CardTitle, null, 'Título do card'),
          React.createElement(CardDescription, null, 'Descrição do card'),
          React.createElement(CardAction, null, 'Ação')
        ),
        React.createElement(CardContent, null, 'Conteúdo'),
        React.createElement(CardFooter, null, 'Rodapé')
      )
    )

    expect(markup).toContain('data-slot="card"')
    expect(markup).toContain('data-size="sm"')
    expect(markup).toContain('data-slot="card-header"')
    expect(markup).toContain('data-slot="card-title"')
    expect(markup).toContain('data-slot="card-description"')
    expect(markup).toContain('data-slot="card-action"')
    expect(markup).toContain('data-slot="card-content"')
    expect(markup).toContain('data-slot="card-footer"')
    expect(markup).toContain('Título do card')
    expect(markup).toContain('custom-card')
  })

  it('renderiza badge com variant link e asChild', async () => {
    const { Badge } = await import('@/components/ui/badge')

    const markup = renderToStaticMarkup(
      React.createElement(
        Badge,
        { variant: 'link', asChild: true },
        React.createElement('a', { href: '/planos' }, 'Ver planos')
      )
    )

    expect(markup).toContain('data-slot="badge"')
    expect(markup).toContain('data-variant="link"')
    expect(markup).toContain('href="/planos"')
    expect(markup).toContain('hover:underline')
  })

  it('renderiza form sem erro usando description e mensagem customizada', async () => {
    mockFieldState = {}

    const {
      Form,
      FormField,
      FormItem,
      FormLabel,
      FormControl,
      FormDescription,
      FormMessage,
    } = await import('@/components/ui/form')

    const markup = renderToStaticMarkup(
      React.createElement(
        Form,
        null,
        React.createElement(FormField, {
          name: 'email',
          render: () =>
            React.createElement(
              FormItem,
              null,
              React.createElement(FormLabel, null, 'E-mail'),
              React.createElement(
                FormControl,
                null,
                React.createElement('input', { defaultValue: 'user@chefops.com' })
              ),
              React.createElement(FormDescription, null, 'Use seu melhor e-mail'),
              React.createElement(FormMessage, null, 'Tudo certo')
            ),
        })
      )
    )

    expect(markup).toContain('E-mail')
    expect(markup).toContain('Use seu melhor e-mail')
    expect(markup).toContain('Tudo certo')
    expect(markup).toContain('aria-invalid="false"')
    expect(markup).toContain('form-item-description')
  })

  it('renderiza form com erro e esconde mensagem vazia quando nao ha body', async () => {
    mockFieldState = { error: { message: 'Campo obrigatório' } }

    const {
      Form,
      FormField,
      FormItem,
      FormLabel,
      FormControl,
      FormDescription,
      FormMessage,
    } = await import('@/components/ui/form')

    const withErrorMarkup = renderToStaticMarkup(
      React.createElement(
        Form,
        null,
        React.createElement(FormField, {
          name: 'email',
          render: () =>
            React.createElement(
              FormItem,
              null,
              React.createElement(FormLabel, null, 'E-mail'),
              React.createElement(
                FormControl,
                null,
                React.createElement('input', null)
              ),
              React.createElement(FormDescription, null, 'Descrição'),
              React.createElement(FormMessage, null, 'Ignorado')
            ),
        })
      )
    )

    mockFieldState = {}

    const emptyMessageMarkup = renderToStaticMarkup(
      React.createElement(
        Form,
        null,
        React.createElement(FormField, {
          name: 'email',
          render: () => React.createElement(FormItem, null, React.createElement(FormMessage, null)),
        })
      )
    )

    expect(withErrorMarkup).toContain('Campo obrigatório')
    expect(withErrorMarkup).toContain('aria-invalid="true"')
    expect(withErrorMarkup).toContain('text-destructive')
    expect(withErrorMarkup).toContain('form-item-message')
    expect(emptyMessageMarkup).toBe('<div><div class="space-y-2"></div></div>')
  })

})
