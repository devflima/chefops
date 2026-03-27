import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES, type Plan } from '@/features/plans/types'

const capabilities = [
  'Pedidos, mesas, comandas, cozinha, estoque e cobrança em um fluxo único.',
  'Equipe enxergando o que precisa acontecer sem recado perdido.',
  'Integrações conectadas para operação, pagamento e comunicação.',
]

const pillars = [
  {
    title: 'Atendimento sem ruído',
    description:
      'Salão, delivery e cozinha passam a trabalhar com o mesmo contexto, sem ruído entre pedido, preparo e entrega.',
  },
  {
    title: 'Gestão mais clara',
    description:
      'O gestor enxerga o que está travando giro, cobrança, estoque e preparo sem depender de improviso.',
  },
  {
    title: 'Base para crescer',
    description:
      'Quando a operação fica consistente, aquisição e recorrência deixam de pressionar o time.',
  },
]

const faqs = [
  {
    question: 'Serve para operação pequena ou só para casa maior?',
    answer:
      'Serve para restaurante que já precisa organizar melhor atendimento, cozinha, cobrança e rotina operacional, independentemente do porte.',
  },
  {
    question: 'Eu preciso trocar toda a operação de uma vez?',
    answer:
      'Não. A ideia é começar pelo fluxo mais crítico e evoluir o restante com mais clareza, sem forçar uma virada brusca no primeiro dia.',
  },
  {
    question: 'O ChefOps é só atendimento ou também ajuda a gestão?',
    answer:
      'Os dois. Ele melhora o fluxo do atendimento e, ao mesmo tempo, dá visibilidade para estoque, cobrança, vendas e gargalos do dia a dia.',
  },
]

const landingPlans: Plan[] = ['free', 'basic', 'pro']

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-[#FBFBFB] text-[#3D3D3E]">
      <header className="sticky top-0 z-40 border-b border-[#3D3D3E]/8 bg-[#FBFBFB]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/chefops-logo.svg"
              alt="ChefOps"
              width={152}
              height={38}
              priority
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#3D3D3E]/68 lg:flex">
            <a href="#produto" className="transition-colors hover:text-[#3D3D3E]">
              Produto
            </a>
            <a href="#planos" className="transition-colors hover:text-[#3D3D3E]">
              Planos
            </a>
            <a href="#beneficios" className="transition-colors hover:text-[#3D3D3E]">
              Benefícios
            </a>
            <a href="#faq" className="transition-colors hover:text-[#3D3D3E]">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              className="text-[#3D3D3E] hover:bg-[#3D3D3E]/5 hover:text-[#3D3D3E]"
            >
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-[#FA680B] text-[#FBFBFB] hover:bg-[#e25f0b]">
              <Link href="/register">Começar com o ChefOps</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                SaaS operacional para restaurantes
              </p>
              <h1 className="mt-6 text-5xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                Organize a operação do seu restaurante para vender mais, atender melhor e
                crescer com controle.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#3D3D3E]/72">
                Um sistema para restaurante que precisa operar com clareza. O ChefOps
                organiza pedidos, mesas, comandas, cozinha, estoque, cobrança e
                integrações sem transformar a rotina em uma coleção de telas soltas.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 bg-[#3D3D3E] px-6 text-[#FBFBFB] shadow-[0_18px_40px_-24px_rgba(61,61,62,0.55)] hover:bg-[#313132]"
                >
                  <Link href="/register">Começar com o ChefOps</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-[#3D3D3E]/15 bg-transparent px-6 text-[#3D3D3E] hover:bg-[#3D3D3E]/5"
                >
                  <Link href="/login">Ver a plataforma</Link>
                </Button>
              </div>

              <div className="mt-8 lg:hidden">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#3D3D3E]/52">
                  Acesso rápido
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="#produto"
                    className="rounded-full border border-[#3D3D3E]/10 bg-[#FBFBFB] px-4 py-2 text-sm font-medium text-[#3D3D3E]"
                  >
                    Produto
                  </a>
                  <a
                    href="#planos"
                    className="rounded-full border border-[#3D3D3E]/10 bg-[#FBFBFB] px-4 py-2 text-sm font-medium text-[#3D3D3E]"
                  >
                    Planos
                  </a>
                  <a
                    href="#faq"
                    className="rounded-full border border-[#3D3D3E]/10 bg-[#FBFBFB] px-4 py-2 text-sm font-medium text-[#3D3D3E]"
                  >
                    FAQ
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#3D3D3E]/8 bg-[#3D3D3E] p-8 text-[#FBFBFB] shadow-[0_40px_120px_-72px_rgba(61,61,62,0.65)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Image
                    src="/brand/chefops-mark.svg"
                    alt="Marca ChefOps"
                    width={42}
                    height={42}
                  />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#FA680B]">
                      ChefOps
                    </p>
                    <p className="text-lg font-semibold text-[#FBFBFB]">
                      Operação concentrada em um só lugar
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center rounded-full border border-[#FBFBFB]/10 bg-[#FBFBFB]/8 px-3 py-1 text-xs font-medium whitespace-nowrap text-[#FBFBFB]/72">
                  Tempo real
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-[#FBFBFB]/8 bg-[#FBFBFB]/6 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#FBFBFB]/55">
                    Pedidos ativos
                  </p>
                  <p className="mt-3 text-4xl font-black text-[#FBFBFB]">18</p>
                </div>
                <div className="rounded-3xl border border-[#FBFBFB]/8 bg-[#FBFBFB]/6 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#FBFBFB]/55">
                    Tempo médio
                  </p>
                  <p className="mt-3 text-4xl font-black text-[#FBFBFB]">12:05</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-[#FBFBFB]/10 pt-6">
                {capabilities.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-[#FA680B]" />
                    <p className="text-sm leading-7 text-[#FBFBFB]/76">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="produto" className="border-y border-[#3D3D3E]/10 bg-[#3D3D3E]/[0.02]">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-18 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                O que o ChefOps organiza
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#3D3D3E]">
                Restaurantes não perdem venda só por falta de demanda.
              </h2>
            </div>

            <div className="grid gap-5">
              {pillars.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.75rem] border border-[#3D3D3E]/10 bg-[#FBFBFB] p-6 shadow-[0_20px_60px_-52px_rgba(61,61,62,0.28)]"
                >
                  <h3 className="text-xl font-bold text-[#3D3D3E]">{item.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#3D3D3E]/72">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="beneficios" className="mx-auto max-w-6xl px-6 py-18 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
              Estrutura comercial clara
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#3D3D3E]">
              Pronto para transformar operação em crescimento?
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#3D3D3E]/72">
              O ChefOps entra onde a operação costuma falhar primeiro: alinhamento entre
              atendimento, cozinha, cobrança e gestão. O resultado é menos atrito interno
              e mais segurança para o restaurante crescer.
            </p>
          </div>
        </section>

        <section className="border-y border-[#3D3D3E]/10 bg-[#3D3D3E]/[0.02]">
          <div className="mx-auto max-w-6xl px-6 py-18 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                Prova social
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#3D3D3E]">
                Resultados percebidos por quem vive a operação
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#3D3D3E]/72">
                São ganhos operacionais que o restaurante sente na rotina e consegue
                perceber rápido.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              <div className="rounded-[1.75rem] border border-[#3D3D3E]/8 bg-[#FBFBFB] p-6 shadow-[0_18px_48px_-44px_rgba(61,61,62,0.22)]">
                <h3 className="text-xl font-bold text-[#3D3D3E]">
                  Menos atraso entre pedido e preparo
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#3D3D3E]/72">
                  O fluxo deixa de depender de recado e a cozinha trabalha com mais
                  contexto desde o início.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-[#3D3D3E]/8 bg-[#FBFBFB] p-6 shadow-[0_18px_48px_-44px_rgba(61,61,62,0.22)]">
                <h3 className="text-xl font-bold text-[#3D3D3E]">
                  Mais clareza para cobrar, entregar e girar mesa
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#3D3D3E]/72">
                  Atendimento, cobrança e gestão passam a enxergar o mesmo estado da
                  operação no mesmo fluxo.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-[#3D3D3E]/8 bg-[#FBFBFB] p-6 shadow-[0_18px_48px_-44px_rgba(61,61,62,0.22)]">
                <h3 className="text-xl font-bold text-[#3D3D3E]">
                  Usado para organizar rotinas de atendimento, cozinha e gestão
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#3D3D3E]/72">
                  O ChefOps entra para dar clareza operacional, não para criar mais uma
                  camada de ruído no dia a dia.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-[#3D3D3E]/10 bg-[#FBFBFB]">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-18 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                FAQ comercial
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#3D3D3E]">
                Dúvidas normais antes de escolher um sistema novo.
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((item) => (
                <div key={item.question} className="rounded-[1.75rem] border border-[#3D3D3E]/10 p-6">
                  <h3 className="text-lg font-bold text-[#3D3D3E]">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#3D3D3E]/72">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl px-6 py-18 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
              Planos
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#3D3D3E]">
              Planos para o estágio atual da sua operação
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#3D3D3E]/72">
              A mesma estrutura de planos da plataforma, apresentada de forma direta para
              facilitar a comparação entre entrada, crescimento e escala.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {landingPlans.map((plan) => {
              const isHighlighted = plan === 'basic'
              const isPremium = plan === 'pro'

              return (
                <div
                  key={plan}
                  className={`relative rounded-[2rem] border p-8 ${
                    isPremium
                      ? 'border-[#3D3D3E] bg-[#3D3D3E] text-[#FBFBFB] shadow-[0_30px_80px_-48px_rgba(61,61,62,0.6)]'
                      : isHighlighted
                        ? 'border-[#FA680B]/35 bg-[#FBFBFB] shadow-[0_30px_80px_-52px_rgba(250,104,11,0.22)]'
                        : 'border-[#3D3D3E]/10 bg-[#3D3D3E]/[0.015]'
                  }`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3 left-8 rounded-full bg-[#FA680B] px-3 py-1 text-xs font-medium text-[#FBFBFB]">
                      Mais popular
                    </div>
                  )}

                  <p
                    className={`text-sm font-medium uppercase tracking-[0.24em] ${
                      isPremium ? 'text-[#FA680B]' : 'text-[#FA680B]'
                    }`}
                  >
                    {PLAN_LABELS[plan]}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1">
                    {PLAN_PRICES[plan] === 0 ? (
                      <span className={`text-3xl font-black ${isPremium ? 'text-[#FBFBFB]' : 'text-[#3D3D3E]'}`}>
                        Grátis
                      </span>
                    ) : (
                      <>
                        <span className={`text-sm ${isPremium ? 'text-[#FBFBFB]/60' : 'text-[#3D3D3E]/55'}`}>R$</span>
                        <span className={`text-4xl font-black ${isPremium ? 'text-[#FBFBFB]' : 'text-[#3D3D3E]'}`}>
                          {PLAN_PRICES[plan]}
                        </span>
                        <span className={`text-sm ${isPremium ? 'text-[#FBFBFB]/60' : 'text-[#3D3D3E]/55'}`}>/mês</span>
                      </>
                    )}
                  </div>

                  <ul className="mt-6 space-y-3">
                    {PLAN_FEATURES[plan].map((feature) => (
                      <li
                        key={feature}
                        className={`flex items-start gap-3 text-sm leading-6 ${
                          isPremium ? 'text-[#FBFBFB]/78' : 'text-[#3D3D3E]/72'
                        }`}
                      >
                        <div className="mt-2 h-2 w-2 rounded-full bg-[#FA680B]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isHighlighted && (
                    <p className="mt-6 text-sm font-medium text-[#3D3D3E]/72">
                      Recomendado para operação em crescimento
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-[#3D3D3E]/10 bg-[#3D3D3E]/[0.02] p-6">
            <h3 className="text-lg font-bold text-[#3D3D3E]">Precisa de ajuda para escolher?</h3>
            <p className="mt-2 text-sm leading-7 text-[#3D3D3E]/72">
              Entre em contato pelo email{' '}
              <a
                href="mailto:suporte@chefops.com.br"
                className="font-medium text-[#3D3D3E] underline underline-offset-4"
              >
                suporte@chefops.com.br
              </a>{' '}
              e nossa equipe te ajuda a encontrar o melhor plano para o seu negócio.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-18 lg:px-8">
          <div className="rounded-[2rem] border border-[#3D3D3E]/10 bg-[#3D3D3E]/[0.02] p-8 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                  Decisão comercial
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#3D3D3E]">
                  Escolha o melhor próximo passo para sua operação.
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#3D3D3E]/72">
                  Se você quer conhecer a plataforma no seu ritmo, pode criar a conta.
                  Se prefere entender primeiro como o ChefOps entra na rotina do seu
                  restaurante, vale começar por uma demonstração comercial.
                </p>
              </div>

              <div className="grid gap-3 sm:min-w-[18rem]">
                <Button
                  asChild
                  size="lg"
                  className="h-12 bg-[#3D3D3E] px-6 text-[#FBFBFB] hover:bg-[#313132]"
                >
                  <Link href="/register">Criar conta e explorar a plataforma</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-[#3D3D3E]/15 bg-transparent px-6 text-[#3D3D3E] hover:bg-[#3D3D3E]/5"
                >
                  <a href="mailto:contato@chefops.com.br?subject=Demonstra%C3%A7%C3%A3o%20ChefOps">
                    Agendar demonstração comercial
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-18 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-[#3D3D3E] px-8 py-10 text-[#FBFBFB] sm:px-10 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                  Próximo passo
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em]">
                  Leve a operação para um fluxo mais claro, com menos ruído e mais
                  capacidade de crescer.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#FBFBFB]/72">
                  Escolha entre começar sozinho na plataforma ou conversar com o time
                  comercial para entender o melhor encaixe para a sua operação.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button asChild size="lg" className="h-12 bg-[#FA680B] px-6 text-[#FBFBFB] hover:bg-[#e25f0b]">
                  <Link href="/register">Criar conta</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-[#FBFBFB]/15 bg-transparent px-6 text-[#FBFBFB] hover:bg-[#FBFBFB]/8"
                >
                  <Link href="/login">Entrar</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#3D3D3E]/10 bg-[#3D3D3E] text-[#FBFBFB]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr_0.9fr_1fr] lg:px-8">
          <div className="max-w-sm">
            <Image
              src="/brand/chefops-logo-dark.svg"
              alt="ChefOps"
              width={152}
              height={38}
            />
            <p className="mt-4 text-sm leading-7 text-[#FBFBFB]/68">
              ChefOps. Operação mais clara para restaurantes que querem crescer.
            </p>
            <p className="mt-3 text-sm leading-7 text-[#FBFBFB]/68">
              Plataforma para operação de restaurantes com pedidos, mesas, comandas,
              cozinha, cobrança e gestão no mesmo fluxo.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#FBFBFB]">Produto</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#FBFBFB]/72">
              <a href="#produto" className="transition-colors hover:text-[#FA680B]">
                Produto
              </a>
              <a href="#beneficios" className="transition-colors hover:text-[#FA680B]">
                Benefícios
              </a>
              <a href="#planos" className="transition-colors hover:text-[#FA680B]">
                Planos
              </a>
              <a href="#faq" className="transition-colors hover:text-[#FA680B]">
                FAQ
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#FBFBFB]">Empresa</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#FBFBFB]/72">
              <Link href="/register" className="transition-colors hover:text-[#FA680B]">
                Criar conta
              </Link>
              <Link href="/login" className="transition-colors hover:text-[#FA680B]">
                Entrar
              </Link>
              <span>Política de privacidade</span>
              <span>Termos de uso</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#FBFBFB]">Contato comercial</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#FBFBFB]/72">
              <a href="mailto:contato@chefops.com.br" className="transition-colors hover:text-[#FA680B]">
                contato@chefops.com.br
              </a>
              <span>Atendimento para implantação e demonstração</span>
              <a href="#top" className="transition-colors hover:text-[#FA680B]">
                Voltar ao topo
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
