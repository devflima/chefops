# ChefOps

Plataforma SaaS para operação e gestão de restaurantes, com foco em pedidos, mesas, comandas, cozinha, estoque, integrações e governança operacional em um fluxo único.

## Visão Geral

O ChefOps foi construído para restaurantes que precisam reduzir ruído operacional e ganhar clareza entre atendimento, cozinha, cobrança, delivery e gestão. A aplicação combina experiência pública para pedidos, área operacional interna, integração com pagamentos e recursos de administração em uma base única.

Hoje o produto cobre:

- cardápio público com slug por estabelecimento
- pedidos online e fluxo de checkout
- gestão de mesas e comandas
- KDS para cozinha
- controle de estoque e baixa automática por ficha técnica
- produtos, categorias, extras e itens de menu
- entregadores, configuração de entrega e operação de delivery
- notificações e integrações com WhatsApp
- integração com Mercado Pago
- onboarding, gestão de usuários e controle por plano
- área administrativa para tenants e métricas

## Principais Capacidades

### Operação do restaurante

- pedidos online e presenciais no mesmo ecossistema
- acompanhamento de status de pedidos e atendimento
- fluxo de mesas, sessões e comandas
- gestão operacional de cozinha via KDS
- acompanhamento de vendas e indicadores operacionais

### Catálogo e cardápio

- produtos, categorias, extras e combinações
- cardápio público por slug
- estrutura para ficha técnica e insumos
- recursos para controle de disponibilidade e composição

### Estoque e execução

- controle de saldo e movimentações
- alertas de estoque
- fechamento operacional
- baixa automática com base em ficha técnica

### Cobrança e integrações

- Mercado Pago para checkout e contas conectadas
- notificações via WhatsApp usando Twilio
- configuração de webhook e fluxo de retorno

### Governança SaaS

- controle por planos (`Basic`, `Standard`, `Premium`)
- limites por tenant
- RBAC por função
- área administrativa para visão multi-tenant
- trilha de auditoria administrativa

## Stack Tecnológica

- [Next.js 16](https://nextjs.org/) com App Router
- [React 19](https://react.dev/)
- [TypeScript 5](https://www.typescriptlang.org/)
- [Supabase](https://supabase.com/) para autenticação e dados
- [TanStack Query](https://tanstack.com/query/latest) para data fetching no front-end
- [Zod](https://zod.dev/) para validação
- [React Hook Form](https://react-hook-form.com/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/) para testes
- [ESLint 9](https://eslint.org/) para lint

## Arquitetura do Repositório

```text
chefops/
├── app/                    # Rotas do App Router, páginas e APIs
│   ├── (auth)/             # Login e cadastro
│   ├── (dashboard)/        # Área operacional interna
│   ├── [slug]/menu/        # Cardápio público por estabelecimento
│   ├── admin/              # Administração central
│   └── api/                # Endpoints server-side
├── components/             # UI primitives e componentes compartilhados
├── features/               # Domínios funcionais do produto
├── lib/                    # Regras de negócio, integrações e utilitários
├── public/                 # Assets públicos, ícones e manifest
├── tests/                  # Testes unitários, integração e regressão
└── .github/workflows/      # CI, segurança e análise estática
```

## Módulos do Produto

### Área pública

- landing page institucional em [`app/page.tsx`](app/page.tsx)
- cardápio público em [`app/[slug]/menu`](app/%5Bslug%5D/menu)
- checkout e pedidos públicos via APIs em [`app/api/public`](app/api/public)

### Área operacional

- dashboard em [`app/(dashboard)/dashboard`](app/(dashboard)/dashboard)
- pedidos em [`app/(dashboard)/pedidos`](app/(dashboard)/pedidos)
- mesas em [`app/(dashboard)/mesas`](app/(dashboard)/mesas)
- comandas em [`app/(dashboard)/comandas`](app/(dashboard)/comandas)
- estoque em [`app/(dashboard)/estoque`](app/(dashboard)/estoque)
- entregadores em [`app/(dashboard)/entregadores`](app/(dashboard)/entregadores)
- integrações em [`app/(dashboard)/integracoes`](app/(dashboard)/integracoes)
- planos em [`app/(dashboard)/planos`](app/(dashboard)/planos)

### Administração

- visão administrativa central em [`app/admin`](app/admin)
- tenants, histórico e saúde operacional em [`app/api/admin`](app/api/admin)

## Integrações Externas

### Supabase

Usado para:

- autenticação
- acesso server-side e client-side
- administração via service role

Implementações principais:

- [`lib/supabase/client.ts`](lib/supabase/client.ts)
- [`lib/supabase/server.ts`](lib/supabase/server.ts)
- [`lib/supabase/admin.ts`](lib/supabase/admin.ts)

### Mercado Pago

Usado para:

- pagamentos
- webhooks
- OAuth para contas por tenant
- sessões de checkout

Implementações principais:

- [`lib/mercadopago.ts`](lib/mercadopago.ts)
- [`lib/tenant-mercadopago.ts`](lib/tenant-mercadopago.ts)
- [`app/api/mercado-pago`](app/api/mercado-pago)

### Twilio / WhatsApp

Usado para:

- notificações operacionais
- verificação de telefone

Implementações principais:

- [`lib/order-whatsapp.ts`](lib/order-whatsapp.ts)
- [`lib/customer-phone-verification.ts`](lib/customer-phone-verification.ts)

## Variáveis de Ambiente

As variáveis abaixo refletem o estado atual do código. Para ambiente local, recomenda-se criar um arquivo `.env.local`.

### Obrigatórias para execução principal

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
PAYMENT_ACCOUNT_ENCRYPTION_KEY=
```

### Mercado Pago

```bash
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_CLIENT_ID=
MERCADO_PAGO_CLIENT_SECRET=
MERCADO_PAGO_OAUTH_REDIRECT_URI=
```

### Twilio / WhatsApp

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

## Como Rodar Localmente

### Pré-requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
npm ci
```

### Desenvolvimento

```bash
npm run dev
```

Aplicação local:

- [http://localhost:3000](http://localhost:3000)

## Scripts Disponíveis

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:unit
npm run test:integration
npm run test:regression
npm run audit:prod
```

## Qualidade, Segurança e CI

O repositório já possui esteiras de validação e segurança em [`/.github/workflows/ci.yml`](.github/workflows/ci.yml) e [`/.github/workflows/codeql.yml`](.github/workflows/codeql.yml).

### Gates atuais

- `Quality Gate`
  - lint
  - testes
  - build
- `Dependency Audit`
  - auditoria de dependências de produção
- `Secrets Scan`
  - detecção de segredos com Gitleaks
- `Filesystem Vulnerability Scan`
  - análise de vulnerabilidades com Trivy
- `Analyze`
  - análise estática via CodeQL

## Testes

A suíte está organizada em três níveis:

- [`tests/unit`](tests/unit)
- [`tests/integration`](tests/integration)
- [`tests/regression`](tests/regression)

Execução recomendada:

```bash
npm run test
npm run test:coverage
```

## PWA e Assets

O projeto possui manifest e ícones preparados para instalação:

- [`public/manifest.json`](public/manifest.json)
- [`public/icons/icon-192.png`](public/icons/icon-192.png)
- [`public/icons/icon-512.png`](public/icons/icon-512.png)
- [`app/icon.png`](app/icon.png)

## Deploy

O deploy atual é feito na Vercel, com validação de CI nas branches `develop` e `main`.

Fluxo recomendado:

1. desenvolvimento em `feature/*`
2. merge para `develop`
3. validação de CI
4. PR de `develop` para `main`
5. nova validação de CI
6. deploy de produção pela Vercel a partir de `main`

## Convenções de Branch

- `feature/*` para desenvolvimento
- `develop` para integração
- `main` para release e produção

## Roadmap Natural do Produto

Próximos tópicos que combinam com o estado atual do projeto:

- maturidade de onboarding por tenant
- melhoria de métricas operacionais e comerciais
- evolução de planos e billing
- maior governança administrativa
- documentação de arquitetura e runbooks operacionais

## Status do Projeto

Versão atual do `package.json`:

- `0.1.0`

O estado atual do produto já representa uma base sólida de operação, com cobertura ampla de fluxo funcional, integração contínua configurada e posicionamento claro para evolução incremental.
