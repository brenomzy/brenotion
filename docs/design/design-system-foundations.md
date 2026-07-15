# Fundamentos candidatos do design system

Status: **exploração inicial, não aprovado para produção**.

Direção confirmada: a primeira versão permanece próxima aos defaults do ecossistema shadcn/React Native Reusables. O accent inicial é `#ff4d29`, equivalente a `oklch(0.669 0.220 33.158)`. A personalidade deve surgir primeiro do uso disciplinado de tipografia, espaço, estados, alinhamento óptico e motion; customizações mais expressivas entram apenas quando houver uma razão observável.

O design system deve controlar significado, hierarquia e composição. Button, Card, Dialog, Select e Tabs continuam candidatos a partir do React Native Reusables; não há motivo para redesenhar esses primitivos antes do spike universal.

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

## Cores candidatas — tema claro

Todos os valores são candidatos em sRGB e usam OKLCH como fonte. Os pares principais foram verificados contra WCAG 2 AA; APCA deverá ser executado no scaffold, já com fonte e tamanho reais.

| Token semântico | OKLCH | Uso | Contraste de texto candidato |
|---|---|---|---|
| `canvas` | `oklch(0.975 0.008 85)` | fundo geral quente | `ink` 14,98:1 |
| `surface` | `oklch(0.995 0.003 85)` | cards, sheets e painéis | `ink` 15,87:1 |
| `ink` | `oklch(0.245 0.025 150)` | texto principal | — |
| `ink-muted` | `oklch(0.460 0.025 150)` | texto secundário | 6,55:1 sobre `canvas` |
| `action-primary` | `oklch(0.669 0.220 33.158)` | confirmação e avanço principal | `ink` escuro 4,86:1 |
| `action-primary-soft` | `oklch(0.930 0.025 33.158)` | seleção, progresso e ênfase suave | `ink` escuro |
| `focus-ring` | `oklch(0.730 0.155 33.158)` | foco e destaque de controle | não recebe texto diretamente |
| `scope-personal` | `oklch(0.490 0.105 250)` | contexto Pessoal | `on-primary` 5,89:1 |
| `scope-company` | `oklch(0.480 0.105 300)` | contexto Empresa | `on-primary` 6,45:1 |
| `money-protected` | `oklch(0.910 0.050 265)` | fundos protegidos e reservas | `ink` deve acompanhar |
| `status-warning` | `oklch(0.840 0.105 85)` | atenção ou cobertura parcial | `ink` 9,81:1 |
| `status-danger` | `oklch(0.530 0.180 28)` | atraso, falha e divergência crítica | `on-primary` 5,46:1 |
| `status-success` | `oklch(0.500 0.120 150)` | confirmação concluída | `on-primary` 5,36:1 |

O laranja principal comunica ação deliberada e identidade, não receita, urgência ou dinheiro “positivo”. Sucesso continua verde e atenção usa amarelo/âmbar com texto e ícone, reduzindo a ambiguidade entre marca e estado.

## Cores candidatas — tema escuro

| Token semântico | OKLCH | Contraste de texto candidato |
|---|---|---|
| `canvas` | `oklch(0.180 0.015 150)` | `ink` 15,73:1 |
| `surface` | `oklch(0.225 0.018 150)` | `ink` 14,27:1 |
| `ink` | `oklch(0.940 0.010 85)` | — |
| `ink-muted` | `oklch(0.740 0.020 150)` | 8,20:1 sobre `canvas` |
| `action-primary` | `oklch(0.669 0.220 33.158)` | usa `on-primary` escuro; contraste candidato 4,86:1 |
| `on-primary` | `oklch(0.180 0.020 150)` | — |
| `action-primary-soft` | `oklch(0.266 0.079 36.259)` | usa `ink` claro; contraste candidato acima de 14:1 |

Os demais estados devem ser recalculados por significado e contraste no tema escuro, não apenas invertidos mecanicamente.

## Tipografia candidata

Inter é a candidata inicial por legibilidade, variedade de pesos e números tabulares. O spike deve comparar Inter com a fonte de sistema no Android e medir custo de bundle. Na web, arquivos de fonte devem usar `.woff2`; no aplicativo nativo, usar o formato suportado pelo pipeline Expo.

| Papel | Tamanho / entrelinha | Peso | Regras |
|---|---|---|---|
| `display-money` | 40 / 44 | 650 | números tabulares, tracking `-0.02em` |
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

### Baseline para o spike

- microinterações: `100–150 ms`;
- tooltip, popover e select: `150–250 ms`, `ease-out`, origem no acionador;
- dialog e sheet: `200–300 ms`, entrada `ease-out`, saída aproximadamente 20% mais curta;
- elementos já visíveis que mudam de posição: `ease-in-out`;
- press de botão candidato: escala `0.96`, interruptível e desabilitável por variante;
- animar preferencialmente `transform` e `opacity`;
- não animar navegação por teclado nem ações vistas dezenas de vezes em uma revisão;
- respeitar redução de movimento no Android e na web;
- nenhuma dependência de animação é aprovada antes do spike Expo/NativeWind/Reusables.

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

## Mapeamento futuro para NativeWind

O spike deve expor tokens semânticos como variáveis controladas pelo projeto e mapeá-las para utilitários. Exemplo conceitual, ainda não pronto para copiar:

```css
@theme {
  --color-canvas: oklch(0.975 0.008 85);
  --color-surface: oklch(0.995 0.003 85);
  --color-ink: oklch(0.245 0.025 150);
  --color-action-primary: oklch(0.669 0.220 33.158);
  --color-scope-personal: oklch(0.490 0.105 250);
  --color-scope-company: oklch(0.480 0.105 300);
}
```

A versão real depende do resultado do spike NativeWind v4 e da forma de tema universal aprovada.
