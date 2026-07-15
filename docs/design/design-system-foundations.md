# Fundamentos candidatos do design system

Status: **base inicial implementada na primeira fatia; evolução ainda incremental**.

Direção confirmada: a primeira versão permanece próxima aos defaults do ecossistema shadcn/React Native Reusables. Wise e Cash App orientam hierarquia, tipografia, neutros e espaçamento. A fase atual é monocromática para estabilizar o layout; a personalidade deve surgir primeiro do uso disciplinado de tipografia, espaço, estados, alinhamento óptico e motion. Cores de marca e de estado entram depois, com validação de contraste e sem carregar significado sozinhas.

O design system deve controlar significado, hierarquia e composição. `Text`, `Button` e `Card` já foram incorporados a partir do React Native Reusables; os demais primitivos são avaliados e validados no primeiro fluxo funcional que realmente os utiliza, antes de criar um equivalente próprio.

A [`matriz de adoção`](./react-native-reusables-adoption-matrix.md) cruza o catálogo oficial com o inventário de telas. Ela é um índice de decisão, não autorização para copiar o catálogo inteiro.

## Princípios visuais

1. **Decisão antes de saldo.** A primeira hierarquia responde o que está disponível, protegido ou exige ação.
2. **Calma com precisão.** Poucas cores, números fortes, espaços generosos e explicações acessíveis; alertas não dominam a experiência inteira.
3. **Confiança visível.** Recência, cobertura e incerteza acompanham o valor que qualificam.
4. **Patrimônios explícitos.** Empresa e Pessoal usam rótulo, contexto e ícone além da cor.
5. **Evidência antes de confirmação.** Toda decisão persistente mostra origem, impacto e alcance.
6. **Densidade progressiva.** O início resume; detalhes e auditoria ficam próximos sem disputar a primeira leitura.

## Arquitetura de tokens

```text
primitivos OKLCH → tokens semânticos → variantes de componente → composição de jornada
```

Componentes não devem consumir `orange-700` ou `violet-100` diretamente. Devem pedir `action-primary`, `scope-company`, `status-stale` ou outro significado estável.

## Neutros implementados — tema claro

Os valores atuais usam a escala `zinc` padrão do Tailwind CSS como base monocromática, estendida com `zinc-25` (`oklch(0.992 0 0)`) para criar uma separação mais leve entre o canvas e cards brancos com sombra. Os componentes consomem tokens semânticos, em vez de classes primitivas como `zinc-700`, para que cores próprias do Brenotion possam ser incorporadas depois sem reescrever as composições. Na web, os valores Zinc são representados em OKLCH; Android e iOS recebem os equivalentes sRGB, com `#FCFCFC` como fallback de `zinc-25`. Tokens de escopo e estado continuam separados semanticamente no código, embora compartilhem neutros nesta fase; rótulo, ícone e texto preservam a distinção.

| Token semântico | Zinc | OKLCH | Uso | Contraste de texto candidato |
|---|---|---|---|---|
| `canvas` | `zinc-25` | `oklch(0.992 0 0)` | fundo geral atrás de cards brancos | `ink` acompanha |
| `surface` | `white` | `oklch(1 0 0)` | cards, sheets e painéis | `ink` acompanha |
| `ink` | `zinc-950` | `oklch(0.141 0.005 285.823)` | texto principal e ação primária | — |
| `ink-muted` | `zinc-600` | `oklch(0.442 0.017 285.786)` | texto secundário | sobre `canvas` |
| `action-primary` | `zinc-950` | `oklch(0.141 0.005 285.823)` | confirmação e avanço principal | `ink-on-action` branco |
| `action-primary-soft` | `zinc-100` | `oklch(0.967 0.001 286.375)` | seleção e ênfase suave | `ink` acompanha |
| `focus-ring` | `zinc-500` | `oklch(0.552 0.016 285.938)` | foco e destaque de controle | não recebe texto diretamente |
| `scope-personal` | `zinc-700` | `oklch(0.370 0.013 285.805)` | contexto Pessoal | usa também rótulo e ícone |
| `scope-company` | `zinc-950` | `oklch(0.141 0.005 285.823)` | contexto Empresa | usa também rótulo e ícone |
| `money-protected` | `zinc-200` | `oklch(0.920 0.004 286.320)` | fundos protegidos e reservas | `ink` acompanha |
| `status-warning` | `zinc-700` | `oklch(0.370 0.013 285.805)` | atenção ou cobertura parcial | usa também rótulo e ícone |
| `status-danger` | `zinc-950` | `oklch(0.141 0.005 285.823)` | atraso, falha e divergência crítica | usa também rótulo e ícone |

O preto comunica ação deliberada e hierarquia, não receita, urgência ou dinheiro “positivo”. Quando cores forem integradas, elas serão aplicadas aos mesmos tokens semânticos sem alterar a composição aprovada.

## Tema escuro — adiado

| Token semântico | OKLCH | Contraste de texto candidato |
|---|---|---|
| `canvas` | `oklch(0.180 0.015 150)` | `ink` 15,73:1 |
| `surface` | `oklch(0.225 0.018 150)` | `ink` 14,27:1 |
| `ink` | `oklch(0.940 0.010 85)` | — |
| `ink-muted` | `oklch(0.740 0.020 150)` | 8,20:1 sobre `canvas` |
| `action-primary` | `oklch(0.940 0 0)` | usa `on-primary` escuro |
| `on-primary` | `oklch(0.145 0 0)` | — |
| `action-primary-soft` | `oklch(0.250 0 0)` | usa `ink` claro |

Os demais estados devem ser recalculados por significado e contraste no tema escuro, não apenas invertidos mecanicamente.

## Tipografia candidata

Inter é a candidata inicial por legibilidade, variedade de pesos e números tabulares. A comparação com a fonte de sistema no Android e o custo de bundle ocorre dentro da aplicação. Na web, arquivos de fonte devem usar `.woff2`; no aplicativo nativo, usar o formato suportado pelo pipeline Expo.

| Papel | Tamanho / entrelinha | Peso | Regras |
|---|---|---|---|
| `display-money` | 44 / 48 | 700 | números tabulares, tracking próximo de `-0.02em` |
| `title-screen` | 28 / 32 | 650 | balanceamento de quebra quando disponível |
| `title-section` | 20 / 24 | 650 | no máximo duas linhas |
| `body` | 16 / 24 | 450 | texto explicativo e entradas mobile com pelo menos 16 px |
| `label` | 14 / 20 | 600 | controles e linhas de lista |
| `caption` | 13 / 18 | 500 | recência, origem e metadados |
| `overline` | 12 / 16 | 650 | caixa natural no conteúdo; transformação visual opcional |

Regras monetárias:

- usar números tabulares em valores, percentuais, datas e contadores que mudam;
- manter moeda e valor juntos (`R$ 4.860`);
- nunca depender apenas do sinal ou da cor para expressar entrada, saída ou proteção;
- evitar casas decimais nos resumos quando não mudarem a decisão; preservar precisão no detalhe;
- valores negativos usam o sinal `−` e uma explicação contextual quando representam ajuste, não perda.

## Espaço, forma e elevação

- Grade base: `4`.
- Escala principal: `4, 8, 12, 16, 24, 32, 40, 48`.
- Alvo de toque Android: mínimo `44 × 44`.
- Controle compacto: raio `8`.
- Button, Select e Input: raio `8–10`.
- Card e Dialog: raio `10–12`.
- `12 px` é o teto para componentes; raios maiores ficam restritos à representação física de dispositivo nos boards.
- Superfícies aninhadas preservam concentricidade dentro desse limite; quando o padding inviabilizar a fórmula exata, as camadas são tratadas como superfícies independentes.
- Cards usam sombra translúcida curta; bordas permanecem em inputs, divisores e tabelas densas.
- Elevação não expressa prioridade financeira sozinha. Ordem, título e ação precisam sustentar a hierarquia.

Sombra clara candidata:

```css
0 0 0 1px oklch(0 0 0 / 0.06),
0 1px 2px -1px oklch(0 0 0 / 0.06),
0 2px 4px oklch(0 0 0 / 0.04)
```

## Estados semânticos

| Estado | Rótulo visível | Tratamento mínimo |
|---|---|---|
| confiança alta | “Dados atualizados” + horário | ícone, texto e acesso ao detalhe |
| confiança parcial | “Dados parciais” + fonte ausente | superfície âmbar suave e impacto |
| desatualizado | “Atualizado em …” | data absoluta, linguagem conservadora e ação |
| provisório | “Regra provisória” | fonte, versão e validação pendente |
| concluído | verbo no passado + evidência | data, origem e possibilidade de inspecionar |
| divergente | valores esperado e encontrado | diferença e ação de revisão |

## Motion candidato

Motion será uma camada progressiva de craft, não uma condição para a primeira versão parecer íntegra. A interface estática deve permanecer clara quando toda animação estiver desabilitada.

### Ordem de maturidade

1. **Resposta:** press, loading, sucesso, erro e mudança de seleção.
2. **Continuidade:** sheet, diálogo, expansão de detalhe, mudança de filtros e reconciliação de estados.
3. **Momentos de marca:** organização concluída, Fechamento Mensal e marcos de reserva; raros e nunca comemorando gasto ou risco.

### Baseline para a primeira fatia

- microinterações: `100–150 ms`;
- tooltip, popover e select: `150–250 ms`, `ease-out`, origem no acionador;
- dialog e sheet: `200–300 ms`, entrada `ease-out`, saída aproximadamente 20% mais curta;
- elementos já visíveis que mudam de posição: `ease-in-out`;
- press de botão candidato: escala `0.96`, interruptível e desabilitável por variante;
- animar preferencialmente `transform` e `opacity`;
- não animar navegação por teclado nem ações vistas dezenas de vezes em uma revisão;
- respeitar redução de movimento no Android e na web;
- dependências de animação entram somente quando uma interação real demonstrar a necessidade.

## Política para adotar primitivos

1. Começar pela decisão e pelos estados da tela, não pelo catálogo de componentes.
2. Consultar a matriz e revalidar o componente na documentação oficial antes de implementar.
3. Incorporar somente o menor primitivo ou composição que resolva o fluxo real.
4. Registrar fonte, data, dependências adicionadas e adaptações relevantes no pull request ou documento da fatia.
5. Adaptar tokens, alvo de toque, foco, teclado, leitor de tela, motion reduzido e diferenças Android/web.
6. Testar o comportamento na plataforma principal e em qualquer companion afetado.
7. Criar um componente próprio apenas quando houver linguagem, regra ou invariante do domínio que não pertença ao primitivo genérico.

Atualizar um primitivo copiado é uma mudança deliberada: comparar o código local com a fonte atual, preservar adaptações do Brenotion e executar novamente os testes do fluxo. Não há atualização automática por pacote.

## Componentes de domínio candidatos

Esses componentes podem justificar implementação própria porque concentram linguagem e invariantes do Brenotion:

- `AvailableToSpendCard`: valor, horizonte, `asOf`, confiança e acesso à decomposição.
- `DataConfidence`: recência, cobertura, fontes afetadas e ação de recuperação.
- `MoneyScopeBadge`: Empresa ou Pessoal com rótulo e ícone.
- `ProtectedMoneySummary`: natureza, valor e motivo de proteção.
- `ObligationRow`: vencimento, estado, valor esperado, evidência e risco.
- `PlanAllocation`: ordem determinística e composição do Plano Financeiro.
- `PlanChangeComparison`: antes, proposta, impacto, evidência e decisão.
- `ManualMoneyAction`: valor, origem, destino e confirmação posterior por sincronização.
- `ImportBatchSummary`: arquivo, período, totais, erros, duplicidade e exclusão do bruto.
- `ProvisionalRuleNotice`: regra, fonte, vigência e validação pendente.

## Mapeamento para NativeWind

A aplicação expõe tokens semânticos como variáveis controladas pelo projeto e os mapeia para utilitários. A fonte executável está em `src/global.css` e `tailwind.config.js`; o trecho abaixo continua sendo um resumo conceitual:

```css
@theme {
  --color-zinc-25: oklch(0.992 0 0);
  --color-canvas: oklch(0.992 0 0);
  --color-surface: oklch(1 0 0);
  --color-ink: oklch(0.141 0.005 285.823);
  --color-action-primary: oklch(0.141 0.005 285.823);
  --color-scope-personal: oklch(0.370 0.013 285.805);
  --color-scope-company: oklch(0.141 0.005 285.823);
}
```

A primeira configuração usa NativeWind `4.2.6` e Tailwind CSS `3.4.19`, com versões registradas no lockfile. A v4 estável do NativeWind usa o compilador Tailwind CSS 3; a configuração CSS-first do Tailwind CSS 4 pertence à prévia do NativeWind v5 e não entra nesta fatia.

OKLCH permanece como fonte perceptual dos tokens na web. O compilador nativo de `react-native-css-interop` `0.2.6` não aceita `oklch()` como valor final de cor; por isso `tailwind.config.js` fornece fallbacks sRGB em hexadecimal, derivados dos mesmos tokens, para Android e iOS. `npm run check:styles` compila os utilitários como Android e impede que cores, divisores ou sombras sem declaração nativa sejam aceitos novamente.

A primeira fatia é deliberadamente clara, inclusive quando o dispositivo usa tema escuro. O tema escuro permanece adiado até possuir tokens, contraste e inspeção visual próprios; acompanhar o sistema sem essa validação não é considerado suporte a dark mode.

`Button`, `Card` e o primitivo de texto foram incorporados em `src/components/ui/` a partir do React Native Reusables em 15 de julho de 2026. As adaptações locais trocam tokens genéricos pelos significados do Brenotion, usam raio máximo de `12 px`, sombra curta nos cards, alvo de toque de pelo menos `44 px`, foco visível na web e escala `0.96` no press.
