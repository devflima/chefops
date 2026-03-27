import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

describe('landing page', () => {
  it('renderiza a proposta de valor principal e os CTAs de aquisição', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Organize a operação do seu restaurante para vender mais, atender melhor e crescer com controle.')
    expect(markup).toContain('Começar com o ChefOps')
    expect(markup).toContain('Ver a plataforma')
    expect(markup).toContain('href="/register"')
    expect(markup).toContain('href="/login"')
  })

  it('renderiza os blocos centrais da narrativa comercial em estilo minimalista', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Um sistema para restaurante que precisa operar com clareza.')
    expect(markup).toContain('Pedidos, mesas, comandas, cozinha, estoque e cobrança em um fluxo único.')
    expect(markup).toContain('O que o ChefOps organiza')
    expect(markup).toContain('Pronto para transformar operação em crescimento?')
  })

  it('renderiza a identidade visual oficial do ChefOps na home pública', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('/brand/chefops-logo.svg')
    expect(markup).toContain('/brand/chefops-mark.svg')
    expect(markup).toContain('alt="ChefOps"')
    expect(markup).toContain('alt="Marca ChefOps"')
  })

  it('usa a nova paleta institucional da landing', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('bg-[#F7F5EF]')
    expect(markup).toContain('text-[#25262B]')
    expect(markup).toContain('text-[#FA680B]')
  })

  it('renderiza prova comercial e FAQ para reduzir friccao de compra', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Restaurantes não perdem venda só por falta de demanda.')
    expect(markup).toContain('Serve para operação pequena ou só para casa maior?')
    expect(markup).toContain('Eu preciso trocar toda a operação de uma vez?')
    expect(markup).toContain('O ChefOps é só atendimento ou também ajuda a gestão?')
  })

  it('usa um selo de contexto claro no card do produto, sem a etiqueta ambigua anterior', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Tempo real')
    expect(markup).not.toContain('ao vivo')
  })

  it('renderiza um rodape institucional com marca e links principais', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('ChefOps. Operação mais clara para restaurantes que querem crescer.')
    expect(markup).toContain('href="/register"')
    expect(markup).toContain('href="/login"')
    expect(markup).toContain('Política de privacidade')
  })

  it('renderiza um menu de navegacao no header para orientar a leitura da landing', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('href="#produto"')
    expect(markup).toContain('href="#beneficios"')
    expect(markup).toContain('href="#faq"')
    expect(markup).toContain('Produto')
    expect(markup).toContain('Benefícios')
    expect(markup).toContain('FAQ')
  })

  it('renderiza um rodape mais corporativo com contato e sinais de confianca', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Contato comercial')
    expect(markup).toContain('contato@chefops.com.br')
    expect(markup).toContain('Produto')
    expect(markup).toContain('Empresa')
    expect(markup).toContain('Plataforma para operação de restaurantes')
  })

  it('renderiza um fechamento comercial mais forte no bloco final de conversao', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Comece pelo ponto que mais trava seu atendimento, sua cozinha ou sua gestão hoje.')
    expect(markup).toContain('O ChefOps foi feito para restaurante que quer parar de perder eficiência no improviso e ganhar tração com uma operação mais clara.')
    expect(markup).toContain('Criar conta')
  })
})
