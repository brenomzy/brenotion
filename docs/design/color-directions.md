# Direções iniciais de laranja

Status: **exploração para calibração**.

Laranja é a família principal candidata. Ela não substitui cores semânticas de sucesso, atenção, risco, Empresa, Pessoal ou dinheiro protegido. O token de marca deve comunicar ação e identidade, não o sinal financeiro de um valor.

## Direção A — Accent do portfólio

Baseline confirmada para a primeira rodada. O tom `500` preserva exatamente `#ff4d29`, já usado pelo Titular em seu portfólio. Os demais tons são candidatos construídos ao redor da mesma família perceptual e ainda devem ser ajustados em contexto.

| Tom | OKLCH | Aproximação sRGB | Uso candidato |
|---|---|---|---|
| 50 | `oklch(0.970 0.010 33.158)` | `#FCF3F1` | fundo muito sutil |
| 100 | `oklch(0.930 0.025 33.158)` | `#F8E2DD` | seleção e destaque suave |
| 200 | `oklch(0.860 0.075 33.158)` | `#FEC0B2` | superfície ativa |
| 300 | `oklch(0.790 0.120 33.158)` | `#FE9D88` | gráfico e indicador grande |
| 400 | `oklch(0.730 0.155 33.158)` | `#F97F65` | foco e acento moderado |
| 500 | `oklch(0.669 0.220 33.158)` | `#FF4D29` | accent principal com texto escuro |
| 600 | `oklch(0.600 0.205 33.158)` | `#E03C1A` | hover ou pressed |
| 700 | `oklch(0.520 0.175 33.158)` | `#B83216` | acento profundo com texto claro |
| 800 | `oklch(0.440 0.135 33.158)` | `#8E2D1A` | detalhe profundo |
| 900 | `oklch(0.360 0.095 33.158)` | `#662619` | superfície escura |
| 950 | `oklch(0.250 0.055 33.158)` | `#38160F` | fundo tonal no tema escuro |

O accent `#ff4d29` tem contraste aproximado de `4,86:1` com `#18241a` e apenas `3,12:1` com o branco quente atual. Buttons e labels pequenos usam texto escuro; texto claro fica restrito a tons `700–950` ou a títulos grandes verificados em contexto.

## Direção B — Terracota

Mais baixa em chroma, material e sóbria. Pode combinar melhor com dados financeiros e superfícies quentes, mas se aproxima de marrom quando escurecida.

| Papel | OKLCH | Aproximação sRGB | Contraste recomendado |
|---|---|---|---|
| soft | `oklch(0.940 0.030 45)` | `#FEE5DB` | `ink` escuro |
| mid | `oklch(0.780 0.080 42)` | `#E4A78F` | `ink` escuro |
| base | `oklch(0.610 0.130 38)` | `#C46446` | somente texto grande; não usar como button padrão |
| strong | `oklch(0.500 0.110 35)` | `#974936` | texto claro, 5,96:1 |
| deep | `oklch(0.360 0.070 32)` | `#5C2E25` | texto claro |

## Direção C — Âmbar

Mais luminosa e energética. Funciona bem para seleção e progressos, mas exige distinção adicional do estado de atenção.

| Papel | OKLCH | Aproximação sRGB | Contraste recomendado |
|---|---|---|---|
| soft | `oklch(0.960 0.030 85)` | `#FBF1DC` | `ink` escuro |
| mid | `oklch(0.860 0.080 80)` | `#EDCC95` | `ink` escuro |
| base | `oklch(0.720 0.140 72)` | `#DA942C` | `ink` escuro, 6,33:1 |
| strong | `oklch(0.580 0.130 62)` | `#B0660C` | apenas texto grande; contraste normal insuficiente |
| deep | `oklch(0.400 0.080 50)` | `#69391C` | texto claro |

## O que comparar no próximo board

Aplicar as três direções na mesma tela inicial, sem alterar layout, tipografia ou conteúdo. Comparar:

- botão principal;
- estado selecionado da navegação;
- foco e press;
- superfície suave;
- relação com sucesso verde, atenção amarela e erro vermelho;
- tema claro e um recorte do tema escuro.

Escolher uma direção não congela cada tom. Primeiro definimos o caráter; depois ajustamos lightness e chroma em contexto e validamos APCA/WCAG com a tipografia real.
