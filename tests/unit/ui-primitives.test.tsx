import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('radix-ui', () => {
  const React = require('react') as typeof import('react')

  function forward(tag: string, displayName: string) {
    const Component = React.forwardRef(({ children, ...props }: Record<string, unknown>, ref) =>
      React.createElement(tag, { ref, ...props }, children)
    )
    Component.displayName = displayName
    return Component
  }

  const withChildren = (tag: string, displayName: string) => {
    const Component = ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(tag, props, children)
    Component.displayName = displayName
    return Component
  }

  return {
    Dialog: {
      Root: withChildren('div', 'DialogRoot'),
      Trigger: forward('button', 'DialogTrigger'),
      Portal: withChildren('div', 'DialogPortal'),
      Close: forward('button', 'DialogClose'),
      Overlay: forward('div', 'DialogOverlay'),
      Content: forward('div', 'DialogContent'),
      Title: forward('h2', 'DialogTitle'),
      Description: forward('p', 'DialogDescription'),
    },
    Select: {
      Root: withChildren('div', 'SelectRoot'),
      Group: forward('div', 'SelectGroup'),
      Value: forward('span', 'SelectValue'),
      Trigger: forward('button', 'SelectTrigger'),
      Icon: withChildren('span', 'SelectIcon'),
      Portal: withChildren('div', 'SelectPortal'),
      Content: forward('div', 'SelectContent'),
      Viewport: forward('div', 'SelectViewport'),
      Label: forward('div', 'SelectLabel'),
      Item: forward('div', 'SelectItem'),
      ItemIndicator: withChildren('span', 'SelectItemIndicator'),
      ItemText: withChildren('span', 'SelectItemText'),
      Separator: forward('div', 'SelectSeparator'),
      ScrollUpButton: forward('button', 'SelectScrollUpButton'),
      ScrollDownButton: forward('button', 'SelectScrollDownButton'),
    },
    Separator: {
      Root: forward('div', 'SeparatorRoot'),
    },
  }
})

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
  const React = require('react') as typeof import('react')
  const icon = (name: string) => (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-icon': name, ...props })

  return {
    XIcon: icon('x'),
    ChevronDownIcon: icon('chevron-down'),
    CheckIcon: icon('check'),
    ChevronUpIcon: icon('chevron-up'),
    CircleCheckIcon: icon('circle-check'),
    InfoIcon: icon('info'),
    TriangleAlertIcon: icon('triangle-alert'),
    OctagonXIcon: icon('octagon-x'),
    Loader2Icon: icon('loader-2'),
  }
})

describe('ui primitives', () => {
  it('renderiza dialog com slots principais', async () => {
    const {
      Dialog,
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
})
