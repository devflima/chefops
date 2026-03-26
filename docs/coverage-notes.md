# Coverage Notes

Estado registrado em 2026-03-26 apos a rodada de fechamento de cobertura.

Resumo:
- cobertura global final validada: `99.93%` statements, `99.77%` branches, `100%` functions e `100%` lines
- suite validada com `npx vitest run --coverage`
- restante concentrado em poucos ramos com forte cara de ghost de instrumentacao ou ramo estruturalmente morto

Pontos restantes mapeados:
- [`app/api/products/route.ts`](/Volumes/SSDExterno/Projects/chefops/app/api/products/route.ts): linha `87`
  - ramo do gate `if ((count ?? 0) >= (tenant?.max_products ?? 0))`
  - casos ja cobertos: `count` exato, `null`, `undefined`, tenant sem data, limite atingido e caminho feliz abaixo do limite
  - comportamento restante tem cara de ghost de instrumentacao

- [`app/api/tables/route.ts`](/Volumes/SSDExterno/Projects/chefops/app/api/tables/route.ts): linha `88`
  - ramo equivalente ao de produtos para `max_tables`
  - casos ja cobertos: limite atingido, `count` nulo, `count` indefinido, tenant sem data e caminho feliz abaixo do limite
  - comportamento restante tambem parece ghost de instrumentacao

- [`features/menu/public-menu.ts`](/Volumes/SSDExterno/Projects/chefops/features/menu/public-menu.ts): linha `510`
  - ramo `if (c >= 10) c = 0` do primeiro digito verificador em `validateCPF()`
  - CPFs validos e invalidos ja exercitam esse caminho, inclusive com primeiro digito zerado
  - relatorio continua marcando a linha, indicando ghost

- [`features/onboarding/components/OnboardingWizard.tsx`](/Volumes/SSDExterno/Projects/chefops/features/onboarding/components/OnboardingWizard.tsx): linha `111`
  - guard `if (!onboarding) return` em `handleTableSubmit`
  - teste ja forca render do passo de mesa com `onboarding: null` e dispara o submit real
  - linha continua pendente no relatorio

- [`app/(dashboard)/mesas/page.tsx`](/Volumes/SSDExterno/Projects/chefops/app/(dashboard)/mesas/page.tsx): linhas `102` e `131`
  - `if (!editingTable) return` em `onEditTable`
  - `const confirm = prompt ? window.confirm(prompt) : false` em `handleCloseSession`
  - ambos os pontos parecem estruturalmente mortos no fluxo real:
  - o submit de edicao so existe quando a mesa em edicao esta selecionada
  - o prompt so existe quando ha `active_session`, e sem sessao a funcao retorna antes

- [`components/ui/form.tsx`](/Volumes/SSDExterno/Projects/chefops/components/ui/form.tsx): linha `30`
  - `if (!fieldContext) throw new Error(...)`
  - o contexto e criado com objeto padrao truthy e o codigo acessa `fieldContext.name` antes do guard
  - na pratica, o throw atual e inalcancavel sem alterar a implementacao

Conclusao:
- o nivel de cobertura atual ja representa praticamente o teto util sem alterar codigo de producao so para agradar a instrumentacao
- qualquer tentativa futura nesses pontos deve vir acompanhada de ajuste de implementacao ou aceitacao explicita de cobertura residual
