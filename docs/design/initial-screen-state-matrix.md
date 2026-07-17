# Matriz de estados das telas iniciais

Status: **contrato de conteúdo para a primeira versão sintética; composição visual ainda sujeita a refinamento**.

Esta matriz organiza os estados de **Início**, **Plano**, **Revisar** e **Mais** antes da alimentação com dados financeiros oficiais. Ela deriva do inventário de telas, da especificação do produto e da pesquisa visual já registrada. Os protótipos comparativos continuam descartáveis e não devem ser copiados para a aplicação.

## Direção comum

- A primeira versão permanece monocromática e próxima aos defaults de shadcn/React Native Reusables. Wise e Cash App orientam somente hierarquia, tipografia, neutros e espaçamento.
- Estado nunca depende apenas de cor. Rótulo, ícone, recência, explicação e ação carregam o significado.
- Um retrato persistido conhecido permanece visível durante atualização, perda de conexão ou erro recuperável. `Skeleton` é reservado ao primeiro carregamento, quando ainda não há estrutura conhecida.
- Valores financeiros sintéticos recebem o rótulo persistente **“Demonstração com dados sintéticos”** e nunca são chamados de sincronizados, recentes ou oficiais.
- **Empresa** e **Pessoal** permanecem explícitos por texto e ícone sempre que coexistirem.
- **Disponível para Gastar** nunca é chamado de saldo e sempre aparece com horizonte, data de referência e confiança.
- A ação primária resolve ou esclarece o estado atual; ações secundárias não competem visualmente com ela.
- Carregamento, falha ou cobertura parcial não promovem cálculos incertos a valores oficiais.

## Estrutura mínima preservada

| Tela | Estrutura que não desaparece entre estados |
|---|---|
| Início | título, navegação principal, contexto **Pessoal**, rótulo **Disponível para Gastar**, horizonte, área de confiança e acesso a Plano, Revisar e Mais |
| Plano | título **Plano Financeiro**, Ciclo Financeiro, separação Empresa/Pessoal, ordem das alocações e acesso à evidência do cálculo |
| Revisar | título, alcance da revisão, progresso ou contagem de pendências, separação Empresa/Pessoal e limite de até três ações recomendadas |
| Mais | título, identidade do Titular sem identificadores sensíveis, estado das conexões, acesso e preferências, além da entrada para o Cofre Fiscal |

## Início

| Estado | Informação obrigatória | Copy e ação | O que permanece visível |
|---|---|---|---|
| Loading inicial | Informar que o primeiro retrato está sendo preparado, sem exibir valor provisório ou `R$ 0`. | **“Preparando seu retrato”**. Sem ação primária durante a espera curta; oferecer **“Tentar novamente”** apenas após exceder o limite de carregamento. | Shell da tela, navegação, título, rótulos das seções e skeletons com a geometria aproximada de Disponível para Gastar, confiança e próxima ação. |
| Vazio | Explicar qual fonte ou etapa ainda falta para existir um retrato e que nenhum cálculo oficial foi produzido. | **“Ainda não há um retrato financeiro”** e **“Conecte ou importe dados para começar”**. Ação: **“Ver opções de dados”**. | Hierarquia da tela, explicação de Disponível para Gastar, separação Empresa/Pessoal e atalhos para Plano, Revisar e Mais; nenhum valor zerado que pareça oficial. |
| Recente | Exibir Disponível para Gastar, horizonte até o próximo recebimento, `asOf`, instante da última atualização, cobertura completa e próxima Obrigação acionável. | **“Dados atualizados às {hora}”**. Ação principal deriva da próxima Obrigação; ação secundária **“Entender o cálculo”**. | Valor e qualificadores no mesmo bloco, dinheiro protegido, Empresa/Pessoal, fatura e compromissos futuros relevantes, próxima ação e navegação. |
| Parcial | Identificar a fonte ou cobertura ausente, a data de cada parte conhecida e o impacto sobre Disponível para Gastar. O valor deve ser omitido ou apresentado como limite conservador quando o núcleo permitir. | **“Dados parciais”** e **“{fonte} ainda não entrou neste retrato”**. Ação: **“Entender a lacuna”**. | Último conteúdo confirmado, horizonte, `asOf`, obrigações conhecidas, dinheiro protegido e próxima ação; a lacuna fica junto do valor afetado, não apenas num aviso global. |
| Desatualizado | Mostrar data absoluta do último retrato, fontes atrasadas e quais decisões não devem usar aquele valor como atual. | **“Atualizado em {data}”** e **“Este valor pode não refletir compras e pagamentos recentes”**. Ação: **“Atualizar dados”**. | Último retrato conhecido, valor qualificado como desatualizado, decomposição, obrigações e fatura conhecidas; nada é substituído por skeleton. |
| Offline | Informar que o app está sem conexão, quando o retrato em cache foi produzido e quais ações estão indisponíveis. | **“Você está offline”** e **“Mostrando o retrato de {data e hora}”**. Ação: **“Tentar novamente”**. | Todo o retrato em cache, navegação e detalhes locais; controles que exigem rede permanecem visíveis, identificados como indisponíveis. |
| Erro recuperável | Explicar qual atualização falhou, confirmar que o último retrato foi preservado e separar falha de conexão de falha de cálculo. | **“Não foi possível atualizar agora”** e **“Seu último retrato continua disponível”**. Ação: **“Tentar novamente”**; secundária **“Ver estado da conexão”** quando aplicável. | Último retrato, data real, confiança anterior agora rebaixada, obrigações e navegação. |
| Divergente | Identificar a Ocorrência de Obrigação afetada, valores esperado e encontrado, diferença e impacto potencial no retrato. Não recalcular silenciosamente. | **“Uma Obrigação precisa de revisão”**. Ação: **“Revisar divergência”**. | Último valor oficial com confiança reduzida, data de referência, demais obrigações e próxima ação; a divergência não ocupa o lugar de todo o retrato. |

## Plano

| Estado | Informação obrigatória | Copy e ação | O que permanece visível |
|---|---|---|---|
| Loading inicial | Informar que a estrutura do Plano Financeiro está sendo preparada sem sugerir uma alocação. | **“Preparando o Plano Financeiro”**. Sem confirmação ou execução disponível. | Shell, Ciclo Financeiro, separação Empresa/Pessoal e skeletons da cascata de alocação. |
| Vazio | Explicar qual condição impede criar o Plano Financeiro: ausência de Recebimento Empresarial, Ciclo Financeiro ou dados mínimos. | **“Ainda não há um Plano Financeiro para este ciclo”**. Ação: **“Ver dados necessários”**. | Ordem determinística das etapas em caráter explicativo, escopos Empresa/Pessoal e acesso ao Início; não exibir alocações zeradas. |
| Recente | Exibir Ciclo Financeiro, `asOf`, Recebimento Empresarial, Provisão de Obrigações, Pró-labore, margens, Distribuição Projetada, reservas, Objetivo Principal e ações manuais com origem e destino. | **“Plano calculado com dados atualizados às {hora}”**. Ação conforme etapa: **“Ver ações do plano”** ou **“Revisar Plano Financeiro”**. | Ordem determinística completa, Empresa/Pessoal, evidência do cálculo, estado de cada ação e aviso de que o produto não movimenta dinheiro. |
| Parcial | Identificar dados ausentes e quais alocações permanecem confirmadas, estimadas ou indisponíveis. Não completar lacunas com IA. | **“Plano incompleto”** e **“Falta confirmar {fonte ou entrada}”**. Ação: **“Completar dados”**. | Etapas calculáveis, ordem integral do plano, `asOf`, escopos e explicação das etapas bloqueadas. |
| Desatualizado | Mostrar a data do cálculo, eventos posteriores possivelmente ausentes e impedir que ações antigas pareçam atuais. | **“Plano calculado em {data}”** e **“Atualize os dados antes de executar as ações restantes”**. Ação: **“Atualizar Plano Financeiro”**. | Plano anterior, ações já confirmadas, evidências e histórico do ciclo; ações pendentes aparecem bloqueadas ou qualificadas. |
| Offline | Informar que o Plano Financeiro em cache pode ser consultado, mas atualização e confirmação dependentes do backend estão indisponíveis. | **“Plano disponível offline para consulta”**. Ação: **“Tentar novamente”**. | Último plano, data, alocações, ações já confirmadas e aviso de somente leitura. |
| Erro recuperável | Informar se falhou a leitura ou o recálculo, preservar o plano anterior e não alterar o estado das ações. | **“Não foi possível atualizar o plano”** e **“Nenhuma ação foi alterada”**. Ação: **“Tentar novamente”**. | Último Plano Financeiro válido, versão/data, evidências, estados de execução e separação patrimonial. |
| Divergente | Exibir a ação manual esperada, o Pagamento Identificado ou movimentação encontrada, a diferença e o alcance da revisão. | **“Uma ação do plano não corresponde aos dados encontrados”**. Ação: **“Revisar correspondência”**. | Plano e ações restantes, estado anterior preservado, origem, destino e valores envolvidos; nenhuma confirmação automática. |

## Revisar

| Estado | Informação obrigatória | Copy e ação | O que permanece visível |
|---|---|---|---|
| Loading inicial | Informar que as pendências estão sendo reunidas, sem mostrar contagem provisória. | **“Preparando sua revisão”**. | Shell, alcance da revisão, estrutura de progresso e skeletons de uma fila curta. |
| Vazio | Distinguir “nenhum dado disponível” de “nenhuma pendência”. Se a revisão foi calculada, informar período e recência. | **“Nada precisa da sua atenção”** quando há evidência completa; ou **“Ainda não há dados para revisar”** quando não há. Ação contextual: **“Voltar ao Início”** ou **“Ver opções de dados”**. | Período, confiança, Empresa/Pessoal, resumo concluído e navegação; não celebrar ausência de dados como revisão concluída. |
| Recente | Exibir período, última atualização, pendências por impacto, progresso e no máximo três ações recomendadas. | **“Revisão pronta”** e **“{quantidade} itens precisam da sua atenção”**. Ação: **“Começar revisão”** ou **“Continuar revisão”**. | Anomalias, fatura e parcelamentos relevantes, Obrigações em risco, impacto nas reservas, alcance e progresso. |
| Parcial | Identificar fontes ausentes, itens que podem ser revisados agora e itens que permanecem fora do alcance. | **“Revisão parcial”** e **“Você pode revisar {escopo disponível}; {escopo ausente} ainda falta”**. Ação: **“Revisar o que está disponível”**; secundária **“Entender a lacuna”**. | Pendências conhecidas, período, confiança, progresso separado por cobertura e até três ações suportadas pelos dados presentes. |
| Desatualizado | Mostrar data da fila, novos eventos potencialmente ausentes e risco de tomar decisões com a revisão antiga. | **“Esta revisão usa dados de {data}”**. Ação: **“Atualizar antes de revisar”**. | Fila anterior em modo de consulta, decisões já confirmadas, progresso e fontes afetadas; nenhuma pendência antiga some. |
| Offline | Informar que a fila em cache pode ser consultada e quais confirmações não serão salvas. | **“Você está offline”** e **“As decisões ficam indisponíveis até reconectar”**. Ação: **“Tentar novamente”**. | Pendências em cache, evidências já carregadas, período e progresso; controles de decisão permanecem visíveis, porém indisponíveis. |
| Erro recuperável | Informar a etapa que falhou, preservar decisões já registradas e evitar reapresentá-las como pendentes sem confirmação. | **“Não foi possível carregar toda a revisão”** e **“Suas decisões anteriores foram preservadas”**. Ação: **“Tentar novamente”**. | Itens carregados com segurança, período, confiança reduzida, progresso confirmado e navegação. |
| Divergente | Mostrar esperado, encontrado, diferença, evidência e a Ocorrência de Obrigação ou ação afetada. | **“Os valores não correspondem”**. Ação: **“Revisar correspondência”**. | Contexto da movimentação e da Obrigação, Empresa/Pessoal, demais itens da fila e progresso; a decisão não é reduzida a um badge. |
| Incerto | Explicar o motivo da sugestão, itens alcançados, confiança e efeito futuro de criar uma Regra de Classificação. | **“Esta classificação precisa da sua confirmação”**. Ações: **“Confirmar classificação”** e **“Corrigir”**. | Movimentações de Origem sanitizadas para a interface, escopo da regra, evidências, opção de aplicar somente ao item atual e progresso. |

## Mais

| Estado | Informação obrigatória | Copy e ação | O que permanece visível |
|---|---|---|---|
| Loading inicial | Informar que acesso, conexões e preferências estão sendo consultados sem desmontar a navegação. | **“Carregando configurações”**. | Título, identidade textual do Titular sem identificadores sensíveis, grupos de menu e skeletons localizados. |
| Vazio | Usar vazio apenas dentro de uma seção: nenhuma conexão configurada, nenhum Documento Fiscal ou preferência ainda não definida. | **“Nenhuma conexão financeira configurada”**. Ação: **“Configurar conexão”**. | Acesso, preferências, Cofre Fiscal e saída da sessão; a tela inteira não vira um estado vazio por falta de uma integração. |
| Recente | Exibir estado da conexão, última atualização, cobertura, consentimento, acesso do Titular e preferências efetivas. | **“Conexão pronta”** e **“Atualizada às {hora}”**. Ação contextual: **“Ver detalhes”**. | Todos os grupos, separação entre configurações e dados, entrada para Cofre Fiscal e ação de sair. |
| Parcial | Identificar fonte, conta bancária ou cartão sem cobertura e o impacto nas telas financeiras. | **“Dados parciais”** e **“A conexão não cobre todo o perímetro esperado”**. Ação: **“Ver cobertura”**. | Conexões disponíveis, última atualização, acesso, preferências, Cofre Fiscal e demais configurações. |
| Desatualizado | Mostrar data da última atualização, estado ou expiração do consentimento e telas afetadas. | **“Conexão desatualizada”**. Ação: **“Atualizar conexão”** ou **“Reconectar”**, conforme a causa real. | Detalhes conhecidos da conexão sem identificadores, acesso, preferências, Cofre Fiscal e saída. |
| Offline | Informar que o estado mostrado vem do cache e que verificar ou alterar a conexão exige rede. | **“Você está offline”** e **“Mostrando o estado de {data e hora}”**. Ação: **“Tentar novamente”**. | Estado conhecido das conexões, acesso local, preferências legíveis, Cofre Fiscal e navegação; ações remotas ficam indisponíveis. |
| Erro recuperável | Informar qual seção falhou, o estado preservado e o impacto nas outras telas. | **“Não foi possível verificar a conexão”** e **“O último estado conhecido continua visível”**. Ação: **“Verificar novamente”**. | Último estado, recência, cobertura, acesso, preferências, Cofre Fiscal e saída; nenhum detalhe técnico ou identificador sensível aparece. |

## Estados incluídos na primeira versão sintética

A primeira versão implementa os estados abaixo por meio de view models sintéticos tipados e selecionáveis em desenvolvimento. Todos exibem **“Demonstração com dados sintéticos”**:

| Tela | Estados que entram agora | Estados adiados até existir evidência real |
|---|---|---|
| Início | loading inicial, vazio, recente demonstrativo, parcial, desatualizado, offline e erro recuperável | divergente, que depende de correspondência entre Ocorrência de Obrigação e Pagamento Identificado |
| Plano | loading inicial, vazio, recente demonstrativo, parcial, desatualizado, offline e erro recuperável | divergente, que depende de ação manual e movimentação ingerida |
| Revisar | loading inicial, vazio concluído, vazio sem dados, recente demonstrativo, parcial, desatualizado, offline, erro recuperável e incerto sintético | divergente, que depende de valores esperado e encontrado produzidos pelo núcleo |
| Mais | loading inicial, vazio localizado, recente demonstrativo, parcial, desatualizado, offline e erro recuperável | nenhum estado transversal adicional; conexão real continua usando o card já validado |

O estado recente sintético valida hierarquia e composição, não recência operacional. Antes de conectar cada tela ao backend, o adapter em memória deve manter a mesma interface pequena do adapter de produção, sem fórmulas financeiras dentro de telas, rotas ou componentes.

## Critérios de aceite visual e de conteúdo

- Cada estado pode ser reconhecido em escala de cinza por título, ícone, texto e ação.
- A primeira leitura responde: **o que sei, de quando são os dados, o que falta e o que posso fazer agora**.
- Atualização em segundo plano não apaga o último retrato conhecido.
- Zero, vazio, erro, offline e revisão concluída não são visualmente ou semanticamente confundidos.
- Nenhum estado usa saldo, limite do cartão ou patrimônio como sinônimo de Disponível para Gastar.
- Nenhuma tela sugere que o Brenotion movimenta dinheiro, confirma pagamentos sem evidência ou aplica Alteração de Plano sem decisão do Titular.
- Copy, componentes e fixtures permanecem em português brasileiro e usam apenas conceitos canônicos de `CONTEXT.md`.
