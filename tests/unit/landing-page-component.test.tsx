import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

describe('landing page', () => {
  it('renderiza a proposta de valor principal e os CTAs de aquisição', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Transforme a operação do seu restaurante em um sistema que vende junto com você.')
    expect(markup).toContain('Criar conta e testar o ChefOps')
    expect(markup).toContain('Quero testar o ChefOps')
    expect(markup).toContain('href="/register"')
    expect(markup).toContain('href="/login"')
  })

  it('renderiza os blocos centrais da narrativa comercial', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('O problema que o ChefOps resolve')
    expect(markup).toContain('O ChefOps fala com a dor real de quem opera restaurante todos os dias.')
    expect(markup).toContain('Como o ChefOps entra na operação')
    expect(markup).toContain('Se o restaurante já vende, o próximo passo é parar de crescer no improviso.')
  })

  it('renderiza a identidade visual oficial do ChefOps na home pública', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('/brand/chefops-logo.svg')
    expect(markup).toContain('/brand/chefops-mark.svg')
    expect(markup).toContain('alt="ChefOps"')
    expect(markup).toContain('alt="Marca ChefOps"')
  })

  it('renderiza prova social e resultados percebidos para reduzir fricção comercial', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Resultados que fazem sentido para quem vive a operação')
    expect(markup).toContain('Menos ruído no atendimento')
    expect(markup).toContain('Mais clareza para o gestor')
    expect(markup).toContain('“Antes, a equipe dependia de recado e improviso.')
  })

  it('renderiza FAQ comercial com respostas para objeções comuns', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Dúvidas comuns antes de levar o ChefOps para a operação')
    expect(markup).toContain('O ChefOps serve para restaurante pequeno ou só para operação maior?')
    expect(markup).toContain('Preciso trocar toda a minha operação de uma vez?')
    expect(markup).toContain('O sistema ajuda só no atendimento ou também na gestão?')
  })
})
