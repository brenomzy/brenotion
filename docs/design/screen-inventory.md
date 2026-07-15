# Inventário inicial de telas

Este inventário deriva da especificação e do plano atuais. Ele organiza superfícies de exploração; não antecipa a aprovação de integrações ou funcionalidades ainda sujeitas a spike.

## Prioridades

- **P0**: necessária para validar a proposta central ou o primeiro mês.
- **P1**: necessária para completar uma jornada já prevista no MVP.
- **P2**: posterior ou dependente de uma hipótese ainda não validada.

## Android principal

| ID | Superfície | Decisão principal | Prioridade | Fase prevista |
|---|---|---|---|---|
| A01 | Entrada e desbloqueio | Entrar com a identidade autorizada ou usar biometria | P1 | Spikes / scaffold |
| A02 | Início | Entender o Disponível para Gastar, confiança e próxima ação | P0 | Alpha histórica / MVP diário |
| A03 | Detalhe do Disponível para Gastar | Entender entradas, descontos, data de referência e incerteza | P0 | Núcleo financeiro / MVP diário |
| A04 | Organização do recebimento | Revisar o Plano Financeiro e executar ações manualmente | P0 | MVP diário |
| A05 | Ações do plano | Ver valor, origem, destino e confirmação por sincronização | P0 | MVP diário |
| A06 | Cartão e ciclos futuros | Entender fatura, fechamento, vencimento e parcelas futuras | P0 | Alpha histórica / MVP diário |
| A07 | Central de Obrigações | Priorizar Ocorrências de Obrigação por risco e vencimento | P0 | Alpha histórica / MVP diário |
| A08 | Detalhe da obrigação | Ver valor esperado, evidência, correspondência e divergência | P1 | MVP diário |
| A09 | Reservas | Entender marcos e meses de autonomia por patrimônio | P1 | Alpha histórica / MVP diário |
| A10 | Revisão semanal | Resolver anomalias e até três ações em aproximadamente cinco minutos | P0 | MVP diário |
| A11 | Detalhe de anomalia | Confirmar ou corrigir classificação e criar Regra de Classificação | P1 | Alpha histórica / MVP diário |
| A12 | Fechamento Mensal | Conciliar pagamentos, retiradas, sobras e documentos | P1 | MVP diário |
| A13 | Alteração de Plano | Comparar antes, proposta, impacto e confirmar ou rejeitar | P1 | Advisor |
| A14 | Estado das conexões | Entender recência, falha, cobertura parcial e reconexão | P0 | Spikes / MVP diário |
| A15 | Advisor | Pedir explicação ou comparar cenários sem confundir IA com cálculo oficial | P2 | Advisor |

## Onboarding histórico

| ID | Superfície | Decisão principal | Plataforma | Prioridade |
|---|---|---|---|---|
| O01 | Perímetro e fontes | Confirmar Empresa, Pessoal, instituições e lacunas conhecidas | Android / web | P0 |
| O02 | Envio de arquivo | Selecionar OFX, CSV ou fallback permitido | Web primeiro | P0 |
| O03 | Mapeamento e prévia | Conferir colunas, período, totais, erros e duplicidades | Web | P0 |
| O04 | Resultado do Lote de Importação | Confirmar ingestão e exclusão do arquivo bruto | Web / Android | P0 |
| O05 | Revisão agrupada | Classificar descrições semelhantes em lote | Android | P0 |
| O06 | Natureza econômica | Separar despesa empresarial, mista ou pessoal | Android | P0 |
| O07 | Proposta de base essencial | Revisar composição, estabilidade trimestral e lacunas | Android | P0 |
| O08 | Proposta de obrigações | Confirmar recorrência, vencimento e conta responsável | Android | P1 |
| O09 | Retrato histórico | Entender receitas, despesas, ciclos e confiança histórica | Android | P0 |

## Companion web e Fiscal

| ID | Superfície | Decisão principal | Prioridade | Fase prevista |
|---|---|---|---|---|
| W01 | Upload | Enviar arquivo bancário temporário ou Documento Fiscal | P0 | Importação / Fiscal |
| W02 | Prévia de importação | Validar totais, erros e duplicidades antes de confirmar | P0 | Importação histórica |
| W03 | Cofre Fiscal | Encontrar documentos sem misturar Empresa e Pessoal | P1 | Fiscal e Cofre |
| W04 | Documento Fiscal | Conferir tipo, competência, hash, obrigação e validação | P1 | Fiscal e Cofre |
| W05 | NFS-e assistida | Copiar campos preparados e enviar a nota emitida no PC | P1 | Fiscal e Cofre |
| W06 | Pacote para contador | Revisar perímetro e exportar pacote organizado | P2 | Fiscal e Cofre |

## Estados transversais obrigatórios

Cada superfície relevante deve ser explorada nos estados abaixo. O texto e as ações mudam junto com o estado; não basta trocar a cor de um ícone.

| Estado | Informação obrigatória | Ação esperada |
|---|---|---|
| Recente e completo | instante da última atualização e confiança | seguir normalmente |
| Recente e parcial | fonte ausente ou cobertura incompleta | entender a lacuna |
| Desatualizado | data real de referência e impacto no cálculo | atualizar ou reconectar |
| Offline | retrato em cache e operações indisponíveis | aguardar conexão |
| Em processamento | etapa atual sem prometer conclusão imediata | acompanhar ou sair com segurança |
| Divergente | valor esperado, encontrado e diferença | revisar correspondência |
| Incerto | motivo da incerteza e alcance da sugestão | confirmar ou corrigir |
| Vazio | por que ainda não há conteúdo | iniciar a jornada adequada |
| Erro recuperável | efeito, dados preservados e próximo passo | tentar novamente |
| Regra provisória | fonte, data, versão e limite de confiança | consultar evidência ou validação pendente |

## Navegação candidata para exploração

A navegação Android inicial pode começar com quatro destinos: **Início**, **Plano**, **Revisar** e **Mais**. Cartão, Obrigações, Reservas e Conexões entram por contexto e por Mais. A hipótese reduz destinos equivalentes e mantém as decisões mais frequentes próximas; deve ser validada nos mockups antes de virar arquitetura de rotas.
