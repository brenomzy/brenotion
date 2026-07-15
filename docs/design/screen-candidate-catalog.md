# Catálogo de candidatos por tela

O catálogo conecta o [inventário completo](./screen-inventory.md), referências do Mobbin e recriações locais próximas dos primitivos shadcn/React Native Reusables. As recriações são código descartável: servem para comparar estrutura, não para iniciar a implementação.

## Protótipo navegável

Abra [`prototype-screen-catalog.html`](./prototypes/prototype-screen-catalog.html) ou execute:

```powershell
./docs/design/prototypes/open-screen-catalog.ps1
```

Cada superfície possui três candidatos (`A`, `B`, `C`) e um modo **Comparar lado a lado**. A URL preserva a tela e a variação, permitindo apontar diretamente para uma opção.

![Comparação inicial de candidatos](./prototypes/catalog-preview.png)

## Primeira rodada disponível

| ID | Superfície | Candidatos locais | Referências |
|---|---|---|---|
| A02 | Início | decisão empilhada; mapa do ciclo; painel compacto | Ubank, YNAB, Quicken |
| A04 | Organização do recebimento | recibo; cascata determinística; lista de execução | Cash App, Kit, Chime |
| A07 | Central de Obrigações | fila por risco; calendário; por patrimônio | Ubank, Quicken, YNAB |
| A10 | Revisão semanal | guiada; inbox; resumo e três ações | Rocket Money, Ubank, Quicken |
| O05 | Revisão agrupada | grupo primeiro; decisão focada; tabela compacta | Hyundai Card, Commons, Rocket Money |
| W02 | Prévia de importação | wizard; duas colunas; conciliação de totais | Wave, Dovetail, YNAB |
| W03 | Cofre Fiscal | tabela; por obrigação; linha por competência | Vanta, Origin |

## Próximas rodadas

| Rodada | Superfícies |
|---|---|
| 2 — detalhamento diário | A03 Disponível detalhado; A05 Ações do plano; A06 Cartão; A08 Detalhe da obrigação; A09 Reservas |
| 3 — fechamento e estado | A11 Anomalia; A12 Fechamento Mensal; A14 Conexões; estados recente/parcial/desatualizado/offline |
| 4 — onboarding completo | O01 Perímetro; O02 Upload; O03 Mapeamento; O04 Resultado; O06 Natureza econômica; O07 Base essencial; O08 Obrigações; O09 Retrato histórico |
| 5 — fiscal e Advisor | A13 Alteração de Plano; A15 Advisor; W01 Upload; W04 Documento; W05 NFS-e; W06 Pacote do contador |

## Como registrar uma escolha

Exemplo: “A02: quero o cabeçalho de B, a próxima ação de A e a densidade de C”. A resposta pode misturar partes; o objetivo das variantes é descobrir a composição desejada, não eleger obrigatoriamente uma tela inteira.
