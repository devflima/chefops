import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const pains = [
  {
    title: 'Operação espalhada em várias telas e planilhas',
    description:
      'Pedidos, mesas, comandas, estoque e cobrança ficam desencontrados quando a equipe trabalha em ferramentas separadas.',
  },
  {
    title: 'Demora para enxergar gargalos do salão e da cozinha',
    description:
      'Sem visão em tempo real, o atendimento reage tarde e o restaurante perde giro, margem e experiência do cliente.',
  },
  {
    title: 'Integrações soltas atrapalham a cobrança e a comunicação',
    description:
      'Cobrança online, WhatsApp e rotina de entrega precisam funcionar como fluxo, não como remendo operacional.',
  },
]

const features = [
  'Pedidos, mesas e comandas no mesmo painel operacional',
  'KDS para cozinha com visão por status e tempo de preparo',
  'Estoque com baixa automática e fechamento diário',
  'Integração com Mercado Pago para cobrança online',
  'Notificações e rotinas via WhatsApp',
  'Onboarding simples para colocar a operação no ar sem travar a equipe',
]

const benefits = [
  {
    eyebrow: 'Atendimento',
    title: 'Menos ruído no salão, mais velocidade na decisão',
    description:
      'A equipe visualiza o pedido do caixa à cozinha sem depender de recado informal, tela duplicada ou improviso.',
  },
  {
    eyebrow: 'Gestão',
    title: 'Tudo que impacta faturamento em um único fluxo',
    description:
      'O gestor acompanha pedidos, status, cobrança, estoque e vendas no mesmo lugar, com menos retrabalho operacional.',
  },
  {
    eyebrow: 'Expansão',
    title: 'Base pronta para restaurante que quer crescer sem perder controle',
    description:
      'ChefOps foi pensado para negócios que precisam profissionalizar a operação e converter melhor o tráfego em receita.',
  },
]

const journey = [
  {
    step: '01',
    title: 'Centralize a operação',
    description:
      'Cadastre cardápio, mesas, extras e equipe para parar de operar cada frente em uma ferramenta diferente.',
  },
  {
    step: '02',
    title: 'Ganhe ritmo no atendimento',
    description:
      'Pedidos entram no fluxo certo, a cozinha recebe prioridade e o salão acompanha a evolução em tempo real.',
  },
  {
    step: '03',
    title: 'Converta mais com menos fricção',
    description:
      'Cobrança, entrega e comunicação deixam de ser gargalo e passam a sustentar um crescimento mais previsível.',
  },
]

const proofPoints = [
  {
    metric: 'Menos ruído no atendimento',
    description:
      'Pedidos deixam de depender de recado verbal e passam a seguir um fluxo claro entre salão, caixa e cozinha.',
  },
  {
    metric: 'Mais clareza para o gestor',
    description:
      'A operação ganha visibilidade real sobre o que está travando preparo, cobrança, entrega e giro de mesa.',
  },
  {
    metric: 'Mais confiança para vender',
    description:
      'Quando o operacional para de ser gargalo, a aquisição de novos clientes deixa de assustar e começa a escalar.',
  },
]

const testimonials = [
  {
    quote:
      '“Antes, a equipe dependia de recado e improviso. Com o ChefOps, o atendimento ficou mais previsível e a cozinha passou a responder melhor nos horários críticos.”',
    author: 'Operação piloto de restaurante casual',
  },
  {
    quote:
      '“O ganho maior não foi só velocidade. Foi clareza para enxergar onde estávamos perdendo margem no dia a dia.”',
    author: 'Gestão de operação food service',
  },
]

const faqs = [
  {
    question: 'O ChefOps serve para restaurante pequeno ou só para operação maior?',
    answer:
      'Ele funciona para operações que já precisam de mais organização, seja um restaurante em crescimento ou uma casa que quer parar de depender de improviso para operar.',
  },
  {
    question: 'Preciso trocar toda a minha operação de uma vez?',
    answer:
      'Não. A proposta comercial do ChefOps é entrar pelo fluxo mais crítico da operação e evoluir a rotina com mais controle, sem exigir uma virada brusca no primeiro dia.',
  },
  {
    question: 'O sistema ajuda só no atendimento ou também na gestão?',
    answer:
      'Os dois. O atendimento ganha ritmo com pedidos, mesas e cozinha alinhados, enquanto a gestão acompanha estoque, cobrança, vendas e gargalos operacionais no mesmo fluxo.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7f0_0%,#fff_28%,#fff_100%)] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/chefops-logo.svg"
              alt="ChefOps"
              width={180}
              height={46}
              priority
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
            <a href="#solucao" className="transition-colors hover:text-orange-600">
              Solução
            </a>
            <a href="#beneficios" className="transition-colors hover:text-orange-600">
              Benefícios
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-orange-600">
              Como funciona
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="lg" className="bg-orange-500 text-white hover:bg-orange-600">
              <Link href="/register">Começar agora</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(255,106,0,0.18),transparent_45%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_38%)]" />
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-18 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                Plataforma SaaS para restaurantes que querem crescer com controle
              </Badge>
              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
                Transforme a operação do seu restaurante em um sistema que vende
                junto com você.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                O ChefOps conecta pedidos, mesas, comandas, cozinha, estoque, cobrança e
                integrações em uma única operação. Menos improviso, mais agilidade para
                atender melhor e faturar com previsibilidade.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-12 bg-orange-500 px-6 text-white hover:bg-orange-600">
                  <Link href="/register">Criar conta e testar o ChefOps</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-slate-300 px-6">
                  <Link href="#solucao">Ver a solução em detalhes</Link>
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <Card className="border-orange-100 bg-white/90 py-0 shadow-[0_20px_60px_-45px_rgba(255,106,0,0.85)]">
                  <CardHeader>
                    <CardTitle className="text-3xl font-black text-slate-950">1</CardTitle>
                    <CardDescription>Painel central para operação inteira</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border-orange-100 bg-white/90 py-0">
                  <CardHeader>
                    <CardTitle className="text-3xl font-black text-slate-950">Tempo real</CardTitle>
                    <CardDescription>Cozinha, salão e gestão alinhados</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border-orange-100 bg-white/90 py-0">
                  <CardHeader>
                    <CardTitle className="text-3xl font-black text-slate-950">Mais margem</CardTitle>
                    <CardDescription>Menos retrabalho, menos perda operacional</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-10 h-28 w-28 rounded-full bg-orange-200/50 blur-3xl" />
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-slate-200/60 blur-3xl" />
              <Card className="relative border-slate-200 bg-slate-950 py-0 text-white shadow-[0_40px_120px_-45px_rgba(15,23,42,0.65)]">
                <CardHeader className="border-b border-white/10 pb-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/brand/chefops-mark.svg"
                        alt="Marca ChefOps"
                        width={44}
                        height={44}
                      />
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-orange-300">
                          Controle operacional
                        </p>
                        <CardTitle className="mt-1 text-2xl font-black text-white">
                          O restaurante inteiro no mesmo fluxo
                        </CardTitle>
                      </div>
                    </div>
                    <Badge className="bg-orange-500 text-white">Ao vivo</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 py-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Atendimento
                      </p>
                      <p className="mt-3 text-2xl font-black">Pedidos, mesas e comandas</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Menos atrito entre caixa, salão e cozinha durante o pico da operação.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-orange-200">
                        Cobrança e integração
                      </p>
                      <p className="mt-3 text-2xl font-black">Mercado Pago + WhatsApp</p>
                      <p className="mt-2 text-sm leading-6 text-orange-50/85">
                        Automatize etapas críticas sem perder o controle do relacionamento com o cliente.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Estoque + cozinha + gestão
                        </p>
                        <p className="mt-2 text-lg font-bold text-white">
                          A operação para de reagir no escuro e passa a decidir com contexto.
                        </p>
                      </div>
                      <Badge variant="outline" className="border-white/20 bg-transparent text-white">
                        Feito para restaurantes em crescimento
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="solucao" className="mx-auto max-w-7xl px-6 py-18 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
              O problema que o ChefOps resolve
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">
              Quando a operação cresce, improviso deixa de ser solução e vira custo.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A landing precisa vender uma promessa crível: mais clareza, menos atrito
              operacional e uma base pronta para escalar sem perder controle. É isso que o
              ChefOps organiza.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {pains.map((pain) => (
              <Card key={pain.title} className="border-slate-200 bg-white py-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-950">
                    {pain.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <p className="text-sm leading-7 text-slate-600">{pain.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="beneficios" className="bg-slate-950 py-18 text-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
                Por que isso converte
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
                O ChefOps fala com a dor real de quem opera restaurante todos os dias.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {benefits.map((item) => (
                <Card
                  key={item.title}
                  className="border-white/10 bg-white/5 py-0 text-white shadow-none"
                >
                  <CardHeader>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                      {item.eyebrow}
                    </p>
                    <CardTitle className="text-2xl font-black text-white">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <p className="text-sm leading-7 text-slate-300">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 lg:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-2xl bg-white/5 px-4 py-4">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-400" />
                  <p className="text-sm font-medium leading-6 text-slate-100">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-7xl px-6 py-18 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                Como o ChefOps entra na operação
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">
                Não é só sistema. É organização comercial aplicada ao dia a dia do restaurante.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                A proposta é simples: substituir ruído operacional por um fluxo claro que a
                equipe entende rápido e o gestor acompanha sem adivinhação.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-12 bg-orange-500 px-6 text-white hover:bg-orange-600">
                  <Link href="/register">Criar conta</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <Link href="/login">Acessar painel</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-5">
              {journey.map((item) => (
                <div
                  key={item.step}
                  className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.6)] sm:grid-cols-[auto_1fr]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-lg font-black text-white">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#fff6ee_0%,#fff_100%)] py-18">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                Resultados que fazem sentido para quem vive a operação
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">
                A landing vende melhor quando a promessa parece prática, plausível e operacional.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {proofPoints.map((item) => (
                <Card key={item.metric} className="border-orange-100 bg-white py-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-950">
                      {item.metric}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <p className="text-sm leading-7 text-slate-600">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {testimonials.map((item) => (
                <Card key={item.quote} className="border-slate-200 bg-slate-950 py-0 text-white shadow-[0_30px_90px_-60px_rgba(15,23,42,0.8)]">
                  <CardContent className="py-8">
                    <p className="text-lg leading-8 text-slate-100">{item.quote}</p>
                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-orange-300">
                      {item.author}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-18 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                FAQ comercial
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-slate-950 sm:text-5xl">
                Dúvidas comuns antes de levar o ChefOps para a operação
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Uma boa landing não força decisão cega. Ela remove objeções e ajuda o cliente
                certo a entender se o produto já faz sentido para a rotina dele.
              </p>
            </div>

            <div className="grid gap-4">
              {faqs.map((item) => (
                <Card key={item.question} className="border-slate-200 bg-white py-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-black text-slate-950">
                      {item.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <p className="text-sm leading-7 text-slate-600">{item.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-orange-200 bg-[linear-gradient(135deg,#1e2329_0%,#101317_100%)] p-8 text-white shadow-[0_40px_120px_-60px_rgba(255,106,0,0.6)] sm:p-10 lg:p-14">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
                  Pronto para profissionalizar sua operação
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
                  Se o restaurante já vende, o próximo passo é parar de crescer no improviso.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  O ChefOps foi pensado para negócio real: quem precisa vender mais, atender
                  melhor e reduzir atrito operacional sem transformar o time em refém do sistema.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-4">
                  <Image
                    src="/brand/chefops-mark.svg"
                    alt="ChefOps"
                    width={56}
                    height={56}
                  />
                  <div>
                    <p className="text-xl font-black">Comece pelo seu fluxo mais crítico</p>
                    <p className="text-sm text-slate-300">
                      Cadastre sua operação e evolua o restaurante com mais clareza.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <Button asChild size="lg" className="h-12 bg-orange-500 text-white hover:bg-orange-600">
                    <Link href="/register">Quero testar o ChefOps</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 border-white/15 bg-transparent text-white hover:bg-white/10">
                    <Link href="/login">Já tenho conta</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
