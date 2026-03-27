import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const capabilities = [
  'Pedidos, mesas, comandas, cozinha, estoque e cobrança em um fluxo único.',
  'Equipe enxergando o que precisa acontecer sem recado perdido.',
  'Integrações conectadas para operação, pagamento e comunicação.',
]

const pillars = [
  {
    title: 'Atendimento sem ruído',
    description:
      'Do salão ao delivery, o time acompanha a operação com menos atrito e mais contexto.',
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

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#25262B]">
      <header className="border-b border-[#25262B]/10">
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

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#25262B]/68 lg:flex">
            <a href="#produto" className="transition-colors hover:text-[#25262B]">
              Produto
            </a>
            <a href="#beneficios" className="transition-colors hover:text-[#25262B]">
              Benefícios
            </a>
            <a href="#faq" className="transition-colors hover:text-[#25262B]">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              className="text-[#25262B] hover:bg-[#25262B]/5 hover:text-[#25262B]"
            >
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-[#FA680B] text-white hover:bg-[#e25f0b]">
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
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#25262B]/72">
                Um sistema para restaurante que precisa operar com clareza. O ChefOps
                organiza pedidos, mesas, comandas, cozinha, estoque, cobrança e
                integrações sem transformar a rotina em uma coleção de telas soltas.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-12 bg-[#25262B] px-6 text-white hover:bg-[#1d1e22]">
                  <Link href="/register">Começar com o ChefOps</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-[#25262B]/15 bg-transparent px-6 text-[#25262B] hover:bg-[#25262B]/5"
                >
                  <Link href="/login">Ver a plataforma</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#25262B]/10 bg-white p-8 shadow-[0_32px_100px_-72px_rgba(37,38,43,0.45)]">
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
                    <p className="text-lg font-semibold text-[#25262B]">
                      Operação concentrada em um só lugar
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center rounded-full border border-[#25262B]/10 bg-[#F7F5EF] px-3 py-1 text-xs font-medium whitespace-nowrap text-[#25262B]/70">
                  Tempo real
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-[#F7F5EF] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#25262B]/55">
                    Pedidos ativos
                  </p>
                  <p className="mt-3 text-4xl font-black text-[#25262B]">18</p>
                </div>
                <div className="rounded-3xl bg-[#F7F5EF] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#25262B]/55">
                    Tempo médio
                  </p>
                  <p className="mt-3 text-4xl font-black text-[#25262B]">12:05</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-[#25262B]/10 pt-6">
                {capabilities.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-[#FA680B]" />
                    <p className="text-sm leading-7 text-[#25262B]/76">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="produto" className="border-y border-[#25262B]/10 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-18 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                O que o ChefOps organiza
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#25262B]">
                Restaurantes não perdem venda só por falta de demanda.
              </h2>
            </div>

            <div className="grid gap-5">
              {pillars.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.75rem] border border-[#25262B]/10 bg-[#F7F5EF] p-6"
                >
                  <h3 className="text-xl font-bold text-[#25262B]">{item.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#25262B]/72">
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
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#25262B]">
              Pronto para transformar operação em crescimento?
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#25262B]/72">
              O ChefOps entra onde a operação costuma falhar primeiro: alinhamento entre
              atendimento, cozinha, cobrança e gestão. O resultado é menos atrito interno
              e mais segurança para o restaurante crescer.
            </p>
          </div>
        </section>

        <section id="faq" className="border-t border-[#25262B]/10 bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-18 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                FAQ comercial
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#25262B]">
                Dúvidas normais antes de escolher um sistema novo.
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((item) => (
                <div key={item.question} className="rounded-[1.75rem] border border-[#25262B]/10 p-6">
                  <h3 className="text-lg font-bold text-[#25262B]">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#25262B]/72">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-18 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-[#25262B] px-8 py-10 text-white sm:px-10 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#FA680B]">
                  Próximo passo
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em]">
                  Comece pelo ponto que mais trava seu atendimento, sua cozinha ou sua
                  gestão hoje.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
                  O ChefOps foi feito para restaurante que quer parar de perder eficiência
                  no improviso e ganhar tração com uma operação mais clara.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button asChild size="lg" className="h-12 bg-[#FA680B] px-6 text-white hover:bg-[#e25f0b]">
                  <Link href="/register">Criar conta</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/15 bg-transparent px-6 text-white hover:bg-white/8"
                >
                  <Link href="/login">Entrar</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#25262B]/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr_0.9fr_1fr] lg:px-8">
          <div className="max-w-sm">
            <Image src="/brand/chefops-logo.svg" alt="ChefOps" width={132} height={33} />
            <p className="mt-4 text-sm leading-7 text-[#25262B]/68">
              ChefOps. Operação mais clara para restaurantes que querem crescer.
            </p>
            <p className="mt-3 text-sm leading-7 text-[#25262B]/68">
              Plataforma para operação de restaurantes com pedidos, mesas, comandas,
              cozinha, cobrança e gestão no mesmo fluxo.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#25262B]">Produto</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#25262B]/72">
              <a href="#produto" className="transition-colors hover:text-[#25262B]">
                Produto
              </a>
              <a href="#beneficios" className="transition-colors hover:text-[#25262B]">
                Benefícios
              </a>
              <a href="#faq" className="transition-colors hover:text-[#25262B]">
                FAQ
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#25262B]">Empresa</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#25262B]/72">
              <Link href="/register" className="transition-colors hover:text-[#25262B]">
                Criar conta
              </Link>
              <Link href="/login" className="transition-colors hover:text-[#25262B]">
                Entrar
              </Link>
              <span>Política de privacidade</span>
              <span>Termos de uso</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#25262B]">Contato comercial</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#25262B]/72">
              <a href="mailto:contato@chefops.com.br" className="transition-colors hover:text-[#25262B]">
                contato@chefops.com.br
              </a>
              <span>Atendimento para implantação e demonstração</span>
              <a href="#top" className="transition-colors hover:text-[#25262B]">
                Voltar ao topo
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
