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

    expect(markup).toContain('bg-[#FBFBFB]')
    expect(markup).toContain('text-[#3D3D3E]')
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

  it('renderiza atalhos de navegação para leitura mobile da landing', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Acesso rápido')
    expect(markup).toContain('href="#produto"')
    expect(markup).toContain('href="#planos"')
    expect(markup).toContain('href="#faq"')
  })

  it('renderiza um rodape mais corporativo com contato e sinais de confianca', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Contato comercial')
    expect(markup).toContain('contato@chefops.com.br')
    expect(markup).toContain('Produto')
    expect(markup).toContain('Empresa')
    expect(markup).toContain('Plataforma para operação de restaurantes')
    expect(markup).toContain('/brand/chefops-logo-dark.svg')
  })

  it('renderiza um fechamento comercial mais forte no bloco final de conversao', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Leve a operação para um fluxo mais claro, com menos ruído e mais capacidade de crescer.')
    expect(markup).toContain('Escolha entre começar sozinho na plataforma ou conversar com o time comercial para entender o melhor encaixe para a sua operação.')
    expect(markup).toContain('Criar conta')
  })

  it('renderiza uma secao de proximo passo com opcao de demonstracao comercial', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Escolha o melhor próximo passo para sua operação.')
    expect(markup).toContain('Criar conta e explorar a plataforma')
    expect(markup).toContain('Agendar demonstração comercial')
    expect(markup).toContain('href="mailto:contato@chefops.com.br?subject=Demonstra%C3%A7%C3%A3o%20ChefOps"')
  })

  it('renderiza prova social com resultados percebidos e sinais de confianca operacional', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Resultados percebidos por quem vive a operação')
    expect(markup).toContain('Menos atraso entre pedido e preparo')
    expect(markup).toContain('Mais clareza para cobrar, entregar e girar mesa')
    expect(markup).toContain('Usado para organizar rotinas de atendimento, cozinha e gestão')
    expect(markup).toContain('São ganhos operacionais que o restaurante sente na rotina e consegue perceber rápido.')
  })

  it('renderiza uma secao de planos para orientar a decisao comercial', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Planos para o estágio atual da sua operação')
    expect(markup).toContain('Basic')
    expect(markup).toContain('Standard')
    expect(markup).toContain('Premium')
    expect(markup).toContain('Até 20 produtos')
    expect(markup).toContain('KDS — tela da cozinha')
    expect(markup).toContain('White-label')
    expect(markup).toContain('Mais popular')
    expect(markup).toContain('Recomendado para operação em crescimento')
    expect(markup).toContain('Precisa de ajuda para escolher?')
    expect(markup).toContain('suporte@chefops.com.br')
  })

  it('reforca o bloco final sem repetir a mesma mensagem do bloco anterior', async () => {
    const { default: Home } = await import('@/app/page')

    const markup = renderToStaticMarkup(React.createElement(Home))

    expect(markup).toContain('Leve a operação para um fluxo mais claro, com menos ruído e mais capacidade de crescer.')
    expect(markup).toContain('Escolha entre começar sozinho na plataforma ou conversar com o time comercial para entender o melhor encaixe para a sua operação.')
  })
})
