# Matriz de estados das telas iniciais

Esta matriz aplica a direção confirmada em 17 de julho de 2026: Fechamento
Mensal por arquivos do Itaú PF, ciclo atual acompanhado por Gastos Informados e
nenhuma dependência de conexão bancária automática.

## Regras transversais

- Fechamento confirmado, plano e estimativa do ciclo são estados diferentes.
- Todo valor financeiro mostra competência ou `asOf`.
- `Disponível para Gastar` nunca é chamado de atual quando o ciclo não está completo.
- O Limite de Gasto do Ciclo e os Limites por Categoria comunicam intenção, não saldo.
- Gasto Informado permanece identificado como provisório até a conciliação.
- Um retrato conhecido permanece visível durante importação, perda de conexão ou erro recuperável.
- `Skeleton` é reservado ao primeiro carregamento, quando ainda não existe retrato conhecido.
- Valores sintéticos recebem o rótulo persistente **“Demonstração com dados sintéticos”**.
- Empresa e Pessoal permanecem identificados mesmo quando aparecem na mesma visão de planejamento.

## Estrutura persistente

| Tela | Estrutura que não desaparece entre estados |
|---|---|
| Início | último fechamento, Limite de Gasto do Ciclo, categorias, confiança e próxima ação |
| Plano | Ciclo Financeiro, separação Empresa/Pessoal, alocações e evidência do cálculo |
| Revisar | alcance, pendências materiais, progresso e até três ações recomendadas |
| Mais | identidade do Titular sem identificadores sensíveis, acesso, preferências, importações e Cofre Fiscal |
| Registro rápido | valor, descrição, categoria sugerida, origem e impacto provisório |

## Início

| Estado | Informação obrigatória | Copy e ação |
|---|---|---|
| Loading inicial | informar que o primeiro retrato está sendo preparado sem exibir `R$ 0` | **“Preparando seu retrato”** |
| Sem fechamento | explicar que nenhum valor oficial existe | **“Importe seu primeiro período”** → **“Enviar arquivo”** |
| Fechamento confirmado | competência, arquivos cobertos, último Disponível para Gastar e confiança | **“Fechamento de {competência} confirmado”** |
| Ciclo provisório | data de referência, Limite de Gasto do Ciclo, Gastos Informados e categorias afetadas | **“Estimativa do ciclo atual”** → **“Registrar gasto”** |
| Sem registros atuais | alcance da estimativa e ausência de movimentos observados após o fechamento | **“Nenhum gasto atual foi informado”** |
| Offline | fechamento em cache e registros que aguardam envio | **“Você está offline”** |
| Erro recuperável | efeito da falha e dados preservados | **“Seu último fechamento continua disponível”** → **“Tentar novamente”** |

## Plano

| Estado | Informação obrigatória | Copy e ação |
|---|---|---|
| Sem plano | insumo ainda ausente e jornada necessária | **“Conclua o fechamento para criar seu plano”** |
| Proposto | valores, origem, destino, confiança e diferenças entre Empresa/Pessoal | **“Revisar Plano Financeiro”** |
| Confirmado | versão, data, limites e alocações aceitas | **“Plano deste ciclo confirmado”** |
| Alterado pelo ciclo | Gastos Informados, categorias pressionadas e impacto conhecido | **“Seu plano mudou desde o fechamento”** |
| Precisa de confirmação | obrigação nova, imprevisto ou decisão que não cabe na regra vigente | **“Revisar Alteração de Plano”** |
| Offline | último plano e ações indisponíveis | **“Plano disponível offline para consulta”** |

## Revisar

| Estado | Informação obrigatória | Copy e ação |
|---|---|---|
| Sem pendências | alcance verificado e data | **“Nada material precisa da sua atenção”** |
| Pendente | até três itens por impacto | **“{quantidade} itens precisam da sua atenção”** |
| Incerto | motivo, alternativas e efeito da escolha | **“Confirme a classificação”** |
| Divergente | esperado, encontrado e diferença | **“Os valores não correspondem”** |
| Importação em processamento | etapa atual sem prometer conclusão imediata | **“Processando seu arquivo”** |

## Registro rápido

| Estado | Informação obrigatória | Copy e ação |
|---|---|---|
| Vazio | formato mínimo aceito | **“Ex.: 68,40 iFood”** |
| Sugestão pronta | valor, data, categoria, origem e impacto | **“Revisar antes de registrar”** |
| Confirmado | estado provisório e novo restante estimado | **“Gasto informado”** |
| Possível duplicata | registro semelhante e consequência | **“Isso já pode ter sido informado”** |
| Aguardando envio | proteção local e estado offline | **“Será enviado quando houver conexão”** |

## Fechamento Mensal

| Estado | Informação obrigatória | Copy e ação |
|---|---|---|
| Arquivo selecionado | tipo, período, tamanho e hash | **“Validar arquivo”** |
| Prévia | totais, erros, duplicidades e lacunas | **“Revisar importação”** |
| Conciliação | Gastos Informados correspondentes e divergências | **“Confirmar correspondências”** |
| Pronto para fechar | obrigações, categorias, retiradas e confiança | **“Confirmar Fechamento Mensal”** |
| Fechado | competência, versão e resumo explicável | **“Fechamento confirmado”** |

## Estados que exigem dados reais

Dados sintéticos validam hierarquia e comportamento, mas não aprovam:

- deduplicação de arquivos reais;
- correspondência entre Gasto Informado e Movimentação de Origem;
- qualidade das descrições do Itaú PF;
- valores ou datas extraídos de PDF;
- tratamento contábil de despesas pessoais pagas pela Empresa.
