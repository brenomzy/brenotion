# Matriz de adoção do React Native Reusables

## Escopo da pesquisa

Pesquisa realizada em **15 de julho de 2026** para cruzar o catálogo oficial atual do React Native Reusables com as superfícies previstas no [inventário de telas](./screen-inventory.md) e na [especificação do produto](../product-spec.md). Foram consultadas somente fontes primárias: a [documentação oficial](https://reactnativereusables.com/docs), o [repositório oficial](https://github.com/founded-labs/react-native-reusables) e seus registries.

Este documento é uma matriz de decisão, não uma autorização para instalar todos os componentes. Cada adoção ainda deve acontecer dentro da fatia vertical que a utiliza, com validação no Android e na web quando a superfície for universal.

O catálogo e o branch `main` são mutáveis. Revalidar links, dependências e APIs antes de cada adoção relevante e registrar a versão ou o commit consultado na mudança.

## Princípios

1. **Primitivo genérico começa no catálogo.** Antes de criar controles, overlays, feedback ou disclosure, verificar React Native Reusables e usar seu código como ponto de partida quando comportamento, semântica e acessibilidade forem compatíveis.
2. **Código local, não dependência visual opaca.** O projeto se define como uma forma de construir a biblioteca local, não como uma biblioteca de componentes pronta; a CLI copia os arquivos para `components/ui`, onde passam a pertencer ao Brenotion. Esse é o modelo descrito na [introdução](https://reactnativereusables.com/docs) e na [instalação oficial](https://reactnativereusables.com/docs/installation).
3. **Componente de domínio compõe primitivos.** `AvailableToSpendCard`, `DataConfidence`, `ManualMoneyAction`, `ObligationRow`, `PlanChangeComparison`, `ImportBatchSummary` e equivalentes encapsulam linguagem, regras e estados financeiros do Brenotion. Não devem ser reduzidos a um `Card` ou `Badge`, embora possam compor `Text`, `Button`, `Separator`, `Progress` e outros primitivos.
4. **Cor nunca é o único estado.** `Badge`, `Alert` e variantes visuais complementam rótulos, valores, datas, evidências e ações; não substituem a explicação exigida para recência, divergência, incerteza ou regra provisória.
5. **Modal só para decisão focal.** `Dialog` e `Alert Dialog` não devem esconder fluxos de comparação, revisão ou auditoria que precisam de espaço, contexto ou navegação própria.
6. **Semântica financeira prevalece sobre conveniência.** `Checkbox` não é evidência de pagamento; `Progress` não pode sugerir precisão que os dados não possuem; `Switch` não confirma uma alteração de plano; `Skeleton` não apaga dados conhecidos durante uma importação.
7. **Universalidade é verificada, não presumida.** Portais, teclado, foco, leitor de tela, botão voltar do Android, áreas seguras, scroll e responsividade web fazem parte do critério de aceite.

## Inventário oficial atual

A documentação mantém **30 páginas de componentes**. O agrupamento abaixo é editorial; o catálogo oficial é apresentado de forma plana.

| Grupo | Componentes oficiais |
|---|---|
| Fundação e conteúdo | [Alert](https://reactnativereusables.com/docs/components/alert), [Aspect Ratio](https://reactnativereusables.com/docs/components/aspect-ratio), [Avatar](https://reactnativereusables.com/docs/components/avatar), [Badge](https://reactnativereusables.com/docs/components/badge), [Button](https://reactnativereusables.com/docs/components/button), [Card](https://reactnativereusables.com/docs/components/card), [Separator](https://reactnativereusables.com/docs/components/separator), [Skeleton](https://reactnativereusables.com/docs/components/skeleton), [Text](https://reactnativereusables.com/docs/components/text) |
| Entrada e seleção | [Checkbox](https://reactnativereusables.com/docs/components/checkbox), [Input](https://reactnativereusables.com/docs/components/input), [Label](https://reactnativereusables.com/docs/components/label), [Radio Group](https://reactnativereusables.com/docs/components/radio-group), [Select](https://reactnativereusables.com/docs/components/select), [Switch](https://reactnativereusables.com/docs/components/switch), [Textarea](https://reactnativereusables.com/docs/components/textarea), [Toggle](https://reactnativereusables.com/docs/components/toggle), [Toggle Group](https://reactnativereusables.com/docs/components/toggle-group) |
| Disclosure e navegação local | [Accordion](https://reactnativereusables.com/docs/components/accordion), [Collapsible](https://reactnativereusables.com/docs/components/collapsible), [Menubar](https://reactnativereusables.com/docs/components/menubar), [Tabs](https://reactnativereusables.com/docs/components/tabs) |
| Overlays e menus | [Alert Dialog](https://reactnativereusables.com/docs/components/alert-dialog), [Context Menu](https://reactnativereusables.com/docs/components/context-menu), [Dialog](https://reactnativereusables.com/docs/components/dialog), [Dropdown Menu](https://reactnativereusables.com/docs/components/dropdown-menu), [Hover Card](https://reactnativereusables.com/docs/components/hover-card), [Popover](https://reactnativereusables.com/docs/components/popover), [Tooltip](https://reactnativereusables.com/docs/components/tooltip) |
| Feedback de progresso | [Progress](https://reactnativereusables.com/docs/components/progress) |

O registry possui 32 itens `registry:ui`: os 30 componentes documentados, mais `icon`, componente instalável anunciado no [changelog oficial](https://reactnativereusables.com/docs/changelog), e `native-only-animated-view`, helper interno usado por overlays. O helper não é candidato a componente de produto. As fontes de verdade mais completas são o [registry NativeWind](https://github.com/founded-labs/react-native-reusables/blob/main/apps/docs/registry/nativewind.json), o [registry Uniwind](https://github.com/founded-labs/react-native-reusables/blob/main/apps/docs/registry/uniwind.json) e os [sources do registry](https://github.com/founded-labs/react-native-reusables/tree/main/packages/registry/src).

Além dos primitivos, existem blocos oficiais de autenticação para [entrar](https://reactnativereusables.com/docs/blocks/authentication/sign-in-form), [cadastrar](https://reactnativereusables.com/docs/blocks/authentication/sign-up-form), [recuperar senha](https://reactnativereusables.com/docs/blocks/authentication/forgot-password-form), [redefinir senha](https://reactnativereusables.com/docs/blocks/authentication/reset-password-form), [verificar e-mail](https://reactnativereusables.com/docs/blocks/authentication/verify-email-form), [conexões sociais](https://reactnativereusables.com/docs/blocks/authentication/social-connections) e [menu do usuário](https://reactnativereusables.com/docs/blocks/authentication/user-menu), com variantes sem integração e Clerk. Eles são referências compostas para A01, não uma arquitetura de autenticação a ser aceita sem revisar a autorização de Titular único no backend.

## Escala de prioridade de adoção

| Prioridade | Significado |
|---|---|
| **R0 — fundação** | Adotar ou consolidar antes das próximas superfícies P0 porque será reutilizado amplamente. |
| **R1 — com a jornada** | Adotar na primeira fatia vertical que exigir o comportamento, evitando abstração antecipada. |
| **R2 — posterior** | Avaliar somente quando a superfície posterior entrar em implementação. |
| **Não priorizar** | O catálogo tem o componente, mas o padrão não combina com o uso principal do Brenotion ou há alternativa mais simples e acessível. |

Prioridade R não substitui a prioridade P do inventário de telas: P ordena valor de produto; R ordena a construção da biblioteca local.

## Matriz por superfície do Brenotion

### Android principal

| ID e superfície | Primitivos ou blocos candidatos | Prioridade R | Orientação |
|---|---|---:|---|
| A01 Entrada e desbloqueio | blocos `social-connections` ou `sign-in-form`, `Button`, `Alert`, `Skeleton` | R1 | Partir da variante Clerk adequada ao login Google e ao retorno biométrico; não adicionar cadastro, senha ou provedores que não pertencem ao Titular único. |
| A02 Início | `Text`, `Button`, `Card`, `Separator`, `Badge`, `Alert`, `Skeleton` | R0 | Usar primitivos na composição; manter Disponível para Gastar, confiança, patrimônio e próxima ação como componentes de domínio. |
| A03 Detalhe do Disponível para Gastar | `Accordion` ou `Collapsible`, `Separator`, `Badge`, `Tooltip` | R1 | Disclosure serve para premissas e memória de cálculo secundária; data de referência e incerteza permanecem visíveis. |
| A04 Organização do recebimento | `Card`, `Separator`, `Badge`, `Progress`, `Alert` | R1 | Compor as etapas do Plano Financeiro; `Progress` comunica execução do plano, não suficiência financeira. |
| A05 Ações do plano | `Button`, `Badge`, `Alert Dialog`, `Collapsible` | R1 | `Alert Dialog` apenas para confirmação focal; origem, destino, valor e estado de conciliação pertencem a `ManualMoneyAction`. |
| A06 Cartão e ciclos futuros | `Tabs`, `Progress`, `Badge`, `Separator`, `Accordion` | R1 | Tabs podem separar a última fatura fechada e ciclos futuros se a comparação continuar clara; barras exigem escala e valor textual. |
| A07 Central de Obrigações | `Tabs`, `Badge`, `Separator`, `Dropdown Menu`, `Skeleton` | R1 | Status e filtros usam primitivos; a linha de ocorrência continua um componente de domínio. Evitar `Checkbox` como status de pagamento. |
| A08 Detalhe da obrigação | `Badge`, `Alert`, `Accordion`, `Button`, `Alert Dialog` | R1 | Compor evidência e correspondência; correção manual pode confirmar em modal, divergência completa fica na tela. |
| A09 Reservas | `Progress`, `Tabs`, `Card`, `Tooltip` | R1 | Adaptar `Progress` para marcos e exibir sempre valor e meses de autonomia; separar Empresa e Pessoal explicitamente. |
| A10 Revisão semanal | `Progress`, `Card`, `Button`, `Badge`, `Alert Dialog` | R1 | Progresso pode indicar itens revisados; cards não devem transformar cada anomalia em caixa decorativa. |
| A11 Detalhe de anomalia | `Radio Group`, `Select`, `Input`, `Label`, `Textarea`, `Alert Dialog` | R1 | Usar seleção única para natureza/classificação e confirmação explícita para criar regra futura. |
| A12 Fechamento Mensal | `Progress`, `Accordion`, `Badge`, `Alert`, `Alert Dialog` | R1 | Etapas e pendências podem compor primitivos; o fechamento versionado exige componente de domínio e confirmação inequívoca. |
| A13 Alteração de Plano | `Tabs`, `Card`, `Separator`, `Alert`, `Alert Dialog` | R2 | Antes/proposta/impacto precisa de comparação própria; não esconder diferenças críticas em tabs no mobile se isso impedir comparação. |
| A14 Registro rápido | `Input`, `Button`, `Badge`, `Select`, `Alert Dialog` | R0 | Valor e descrição formam a entrada mínima; categoria sugerida, origem e impacto provisório exigem confirmação clara. |
| A15 Advisor | `Textarea`, `Button`, `Tabs`, `Card`, `Alert`, `Skeleton` | R2 | Tabs podem alternar cenários; mensagens, proveniência e distinção entre IA e cálculo oficial exigem componentes próprios. |

### Onboarding histórico

| ID e superfície | Primitivos candidatos | Prioridade R | Orientação |
|---|---|---:|---|
| O01 Perímetro e fontes | `Checkbox`, `Radio Group`, `Card`, `Alert` | R1 | Checkbox seleciona fontes, não confirma cobertura; lacunas precisam de texto persistente. |
| O02 Envio de arquivo | `Button`, `Card`, `Alert`, `Progress` | R1 | O seletor/área de arquivo é composição própria por plataforma; progresso deve distinguir envio de processamento. |
| O03 Mapeamento e prévia | `Select`, `Input`, `Label`, `Tabs`, `Alert`, `Badge` | R1 | Mapeamento usa controles genéricos; grade/prévia, erros e duplicidades exigem composição própria web responsiva. |
| O04 Resultado do Lote de Importação | `Alert`, `Badge`, `Accordion`, `Separator`, `Button` | R1 | Resumo, hash e confirmação de exclusão do bruto pertencem a `ImportBatchSummary`. |
| O05 Revisão agrupada | `Checkbox`, `Select`, `Badge`, `Alert Dialog` | R1 | Seleção em lote é válida; regras aplicadas ao histórico e ao futuro precisam de escopo e confirmação explícitos. |
| O06 Natureza econômica | `Radio Group`, `Input`, `Label`, `Alert` | R1 | Adaptar a escolha Empresa/mista/Pessoal; percentual misto exige validação numérica própria. |
| O07 Proposta de base essencial | `Card`, `Accordion`, `Badge`, `Alert Dialog` | R1 | A composição e estabilidade trimestral são domínio; disclosure apenas para evidências secundárias. |
| O08 Proposta de obrigações | `Input`, `Label`, `Select`, `Radio Group`, `Alert Dialog` | R1 | Data, recorrência e conta responsável precisam de validação de fronteira além dos controles visuais. |
| O09 Retrato histórico | `Tabs`, `Card`, `Badge`, `Alert`, `Accordion` | R1 | Tabs podem separar patrimônios ou períodos; confiança histórica e lacunas permanecem visíveis. |

### Companion web e Fiscal

| ID e superfície | Primitivos candidatos | Prioridade R | Orientação |
|---|---|---:|---|
| W01 Upload | `Button`, `Card`, `Alert`, `Progress`, `Tabs` | R1 | Compor seletor próprio de arquivo; separar claramente importação bancária efêmera de Documento Fiscal persistente. |
| W02 Prévia de importação | `Select`, `Input`, `Label`, `Badge`, `Alert`, `Dropdown Menu` | R1 | Tabela/grade de dados não existe no catálogo oficial; criar composição web acessível sobre primitives de React Native/Web. |
| W03 Cofre Fiscal | `Tabs`, `Card`, `Badge`, `Dropdown Menu`, `Skeleton` | R1 | Tabs podem separar Empresa/Pessoal; lista, busca e metadados documentais exigem composição própria. |
| W04 Documento Fiscal | `Badge`, `Separator`, `Accordion`, `Alert`, `Dropdown Menu` | R1 | Hash, competência, vínculo e validação são domínio e não devem virar coleção genérica de badges. |
| W05 NFS-e assistida | `Input`, `Label`, `Button`, `Alert`, `Accordion`, `Progress` | R1 | Campos preparados podem usar input somente quando editáveis; dados somente leitura precisam de semântica distinta. |
| W06 Pacote para contador | `Checkbox`, `Accordion`, `Progress`, `Alert Dialog`, `Button` | R2 | A seleção do perímetro usa checkbox; geração e exportação exigem estado de job e auditoria próprios. |

### Estados transversais

| Estado | Primitivos úteis | Regra de composição |
|---|---|---|
| Fechamento confirmado/ciclo provisório | `Badge`, `Alert`, `Tooltip` | Sempre mostrar competência, data de referência e quais Gastos Informados afetam a estimativa; tooltip só complementa. |
| Sem registros atuais/offline | `Alert`, `Badge`, `Button` | Preservar o último fechamento conhecido e indicar o alcance do plano; não trocar tudo por skeleton. |
| Em processamento | `Progress`, `Skeleton`, `Alert` | Progress para avanço conhecido; skeleton apenas no primeiro carregamento de estrutura ainda desconhecida. |
| Divergente/incerto | `Alert`, `Badge`, `Accordion`, `Radio Group` | Esperado, encontrado, diferença, causa e correção são composição de domínio. |
| Vazio/erro recuperável | `Alert`, `Card`, `Button` | Explicar por que está vazio ou o que foi preservado e oferecer a próxima ação. |
| Regra provisória | `Alert`, `Badge`, `Accordion`, `Tooltip` | Fonte, data, versão e limite de confiança ficam acessíveis sem depender de hover. |

## Prioridade recomendada de adoção

### R0 — consolidar a fundação

- **Já incorporados e adaptados:** `Text`, `Button` e `Card`. Tratá-los como código do Brenotion e manter origem e divergências documentadas nos próprios PRs.
- **Próximos candidatos transversais:** `Separator`, `Badge`, `Alert` e `Skeleton`.
- **Infraestrutura antes de overlays:** `icon` e `PortalHost`; só então adotar `Alert Dialog`, `Dialog`, `Dropdown Menu`, `Popover` ou `Tooltip`.
- **Reavaliar o `Collapsible` local:** o projeto já possui um componente homônimo próprio. Comparar API, acessibilidade e animação com o oficial antes de adaptar ou substituir; não manter duas abstrações com a mesma responsabilidade.

### R1 — adotar com a primeira jornada real

- `Progress`, `Accordion`/`Collapsible`, `Tabs`, `Input`, `Label`, `Radio Group`, `Select`, `Checkbox`, `Textarea`, `Alert Dialog` e `Dropdown Menu`.
- Adicionar um componente por necessidade concreta, com exemplo no fluxo real e testes de estados, em vez de `add --all`.
- Preferir `Radio Group` para escolhas mutuamente exclusivas, `Checkbox` para seleção independente e `Switch` somente para preferências booleanas de efeito imediato.

### R2 ou não priorizar

- **R2:** `Dialog`, `Popover` e `Toggle Group` quando Advisor, filtros avançados ou ferramentas web demonstrarem necessidade.
- **Não priorizar no Android principal:** `Menubar`, `Hover Card` e `Context Menu`, por dependerem de padrões mais naturais em desktop/ponteiro ou esconderem ações importantes.
- **Sem caso atual claro:** `Avatar`, `Aspect Ratio`, `Toggle` isolado e `Switch`. Não instalar preventivamente.

## Dependências e requisitos relevantes

A instalação manual oficial pede NativeWind, `inlineRem: 16` no Metro, tokens CSS/Tailwind, `theme.ts`, helper `cn`, aliases TypeScript e `components.json`; as dependências-base indicadas são `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge` e `@rn-primitives/portal`. O layout raiz deve renderizar `PortalHost` para componentes em portal. Ver [instalação manual](https://reactnativereusables.com/docs/installation/manual).

No estado pesquisado do Brenotion:

- já existem NativeWind, `class-variance-authority`, `clsx`, `tailwind-merge`, `@rn-primitives/slot`, `react-native-reanimated` e `react-native-gesture-handler`;
- `tailwindcss-animate`, `@rn-primitives/portal`, os demais pacotes `@rn-primitives/*` e `components.json` não aparecem no manifesto/configuração atual e devem ser adicionados somente quando exigidos;
- cada componente composto declara dependências no registry; a CLI instala itens auxiliares como `text`, `icon`, `button` e `native-only-animated-view`;
- `Select` rolável requer `react-native-gesture-handler`, conforme a [documentação do Select](https://reactnativereusables.com/docs/components/select);
- overlays e menus exigem `PortalHost`; sem ele não renderizam corretamente no native, conforme a [introdução](https://reactnativereusables.com/docs) e a [instalação manual](https://reactnativereusables.com/docs/installation/manual);
- alguns controles usam `@rn-primitives/<componente>`. Confirmar compatibilidade com Expo, React Native e web da fatia antes de fixar versão.

A [CLI oficial](https://reactnativereusables.com/docs/cli) oferece `add <component>`, `add --all`, escolha de NativeWind/Uniwind e `doctor`. Para o Brenotion, preferir adição seletiva e revisão explícita do diff.

## Critérios de decisão

### Adotar

Adotar quase diretamente quando:

- a responsabilidade é genérica e coincide com a semântica oficial;
- API, foco, teclado, leitor de tela, press/hover e retorno do Android funcionam nas plataformas-alvo;
- tokens, tamanhos de toque, tipografia e estados podem ser alinhados sem alterar a arquitetura do componente;
- a dependência adicional é proporcional ao uso e não cria uma segunda solução para a mesma responsabilidade.

### Adaptar

Adaptar o código incorporado quando:

- a estrutura e a acessibilidade são úteis, mas variantes, tokens ou densidade precisam seguir o design system Brenotion;
- o componente precisa expor estado ou composição adicional para recência, incerteza, domínio financeiro ou responsividade;
- a versão oficial pressupõe interação de ponteiro, portal ou animação inadequada ao Android principal;
- já existe um primitivo local equivalente e a migração deve preservar a API dos consumidores.

Registrar no PR a origem, versão/commit, diferenças locais, dependências, testes por plataforma e motivo da adaptação.

### Rejeitar

Rejeitar ou adiar quando:

- o padrão esconde informação ou ação essencial;
- depende de hover/clique direito em uma jornada Android;
- a abstração conflita com invariantes do produto ou sugere certeza inexistente;
- uma composição simples de React Native é menor e mais acessível;
- introduz infraestrutura ou pacote sem segundo uso concreto;
- seria necessário contorcer a API até o componente deixar de cumprir sua responsabilidade original.

## Riscos e manutenção

- **Divergência do upstream:** o código copiado não se atualiza sozinho. Ao revisar uma versão, usar a origem oficial, criar commit antes de sobrescrever e inspecionar o diff para preservar customizações, como recomenda o [changelog](https://reactnativereusables.com/docs/changelog).
- **Atualização em massa:** `add --overwrite` ou `add --all` pode apagar adaptações Brenotion. Nunca executar sem diff isolado e testes.
- **Colisões de nome/API:** componentes locais como `Collapsible` podem não ter a semântica do homônimo oficial. Resolver por migração deliberada, não por duplicação.
- **Portais e empilhamento:** overlays podem falhar por ausência de host, ordem de providers, safe areas, teclado ou navegação Android.
- **Acessibilidade regressiva:** copiar um componente acessível não garante que a composição final mantenha rótulos, ordem de foco, tamanho de toque e anúncio de mudanças.
- **Universalidade desigual:** hover, contexto e menubar são naturais na web, mas não no Android; testar cada superfície-alvo.
- **Dependências transitivas:** cada primitive aumenta a superfície de upgrades. Adicionar sob demanda e manter versões compatíveis com o SDK Expo vigente.
- **Design system fragmentado:** variantes locais sem critério criam dialetos. Novas variantes devem representar intenção reutilizável, não uma tela específica.

## Lacunas que justificam composição própria

O catálogo não oferece, e não deveria definir, as seguintes responsabilidades do Brenotion:

- visualização do **Disponível para Gastar** com data de referência, descontos, recência e confiança;
- acompanhamento do **Limite de Gasto do Ciclo** e dos **Limites por Categoria** sem sugerir saldo atual;
- criação e estado provisório de um **Gasto Informado**;
- separação explícita entre patrimônios **Empresa** e **Pessoal**;
- comparação de **Alteração de Plano** entre estado atual, proposta, impacto e confirmação;
- ação de **Plano Financeiro** com valor, origem, destino e confirmação por Resumo Empresarial ou importação;
- **Ocorrência de Obrigação** com esperado, encontrado, correspondência, evidência e divergência;
- confiança de dados, cobertura parcial, recência e regra provisória com fonte e versão;
- ciclos de cartão, última fatura fechada, parcelas futuras e efeito conhecido sobre os limites;
- marcos de reserva e meses de autonomia por patrimônio;
- tabela/grade de mapeamento e prévia de importação, deduplicação e resumo auditável do lote;
- upload seguro com distinção entre arquivo bancário efêmero e Documento Fiscal persistente;
- Cofre Fiscal, detalhe documental, hash, competência e vínculo com obrigações;
- fechamento mensal versionado e pacote para contador;
- mensagens e cenários do Advisor com separação inequívoca entre interpretação da IA e cálculo oficial.

Essas composições devem ter interfaces pequenas e usar os primitivos adotados internamente. A lacuna justifica código de domínio, não a recriação de controles genéricos.
