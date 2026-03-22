import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/button', () => ({
  Button: (props: Record<string, unknown>) => ({ type: 'Button', props }),
}))

vi.mock('@/features/plans/hooks/usePlan', async () => {
  const actual = await vi.importActual('@/features/plans/hooks/usePlan')
  return {
    ...actual,
    useHasFeature: vi.fn(),
  }
})

vi.mock('next/link', () => ({
  default: (props: Record<string, unknown>) => ({ type: 'Link', props }),
}))

vi.mock('lucide-react', () => ({
  Lock: (props: Record<string, unknown>) => ({ type: 'Lock', props }),
}))

import PaginationControls from '@/components/shared/PaginationControls'
import FeatureGate from '@/features/plans/components/FeatureGate'
import { useHasFeature } from '@/features/plans/hooks/usePlan'

describe('simple components', () => {
  it('PaginationControls nao renderiza com uma pagina', () => {
    expect(PaginationControls({ page: 1, totalPages: 1, onPageChange: vi.fn() })).toBeNull()
  })

  it('PaginationControls renderiza controles e chama callback esperado', () => {
    const onPageChange = vi.fn()
    const element = PaginationControls({ page: 2, totalPages: 3, onPageChange })

    expect(element).toBeTruthy()

    const children = (element as { props: { children: unknown[] } }).props.children as unknown[]
    const buttons = ((children[1] as { props: { children: unknown[] } }).props.children) as Array<{ props: { onClick: () => void } }>
    buttons[0].props.onClick()
    buttons[1].props.onClick()

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
  })

  it('FeatureGate renderiza children, fallback ou bloqueio padrão', () => {
    vi.mocked(useHasFeature).mockReturnValueOnce(true)
    const allowed = FeatureGate({ feature: 'reports', children: 'ok' }) as { props: { children: unknown } }
    expect(allowed.props.children).toBe('ok')

    vi.mocked(useHasFeature).mockReturnValueOnce(false)
    const fallback = FeatureGate({ feature: 'reports', children: 'ok', fallback: 'fallback' }) as { props: { children: unknown } }
    expect(fallback.props.children).toBe('fallback')

    vi.mocked(useHasFeature).mockReturnValueOnce(false)
    const blocked = FeatureGate({ feature: 'reports', children: 'ok' })
    expect(blocked).toBeTruthy()
  })
})
