# Especificação do Produto

## 1. Visão

Brenotion é um produto mensal inteligente. O Titular atualiza o mês anterior com
as três fontes do Itaú, resolve somente exceções, entende para onde foi o dinheiro
e usa esse retrato para preparar o mês seguinte.

O produto substitui a lista mensal de contas mantida no Notion por uma Checklist
Mensal integrada. Ao registrar um Recebimento Empresarial, o Brenotion deve
explicar quanto pertence a impostos e obrigações, quanto pode sair da Empresa,
quanto deve ser protegido e quanto permanece disponível para a vida familiar,
sem confundir saldo bancário com dinheiro livre.

A experiência principal possui três pontos de entrada: **Início**, **Checklist
Mensal** e **Atualizar mês**. Classificação, conciliação, lotes, ocorrências e
fechamento continuam existindo como mecanismos internos ou detalhes
progressivos, não como áreas que o Titular precisa operar.

## 2. Resultado esperado

Ao final do primeiro mês de uso confiável, o Titular deve conseguir:

- entender para onde foi o dinheiro;
- não perder vencimentos financeiros ou burocráticos;
- atualizar uma competência com o Itaú Pessoal, a fatura e o Itaú Empresa em um
  único fluxo;
- revisar apenas classificações novas, ambíguas ou materiais;
- receber um resumo retrospectivo com maiores gastos, variações, recorrências e
  oportunidades de economia;
- preparar e executar a Checklist Mensal;
- distinguir o último retrato confirmado de uma informação atual;
- registrar o Recebimento Empresarial e confirmar um Plano Financeiro quando
  essas próximas fatias estiverem implementadas.

## 3. Princípios

1. **Automação com controle.** Arquivos, regras confirmadas e sugestões da IA
   eliminam redigitação e reduzem a revisão às exceções. O produto não exige
   lançamentos diários.
2. **Saldo não é disponibilidade.** O produto destaca o valor disponível, não o saldo agregado.
3. **Empresa e pessoa são patrimônios distintos.** Pagamento e natureza econômica são classificados separadamente.
4. **Cálculos são determinísticos.** A IA interpreta e aconselha, mas não inventa valores oficiais.
5. **Recomendações são firmes e explicáveis.** O Titular pode discordar, mas vê o impacto.
6. **Uma meta principal por vez.** Reservas mínimas antecedem objetivos de consumo.
7. **Recência condiciona linguagem.** Um fechamento antigo pode sustentar planejamento, mas nunca é apresentado como retrato atual.
8. **Menos notificações, mais ação.** Alertas existem apenas quando há uma decisão relevante.
9. **Configuração é revisável.** Regras fiscais e contábeis preservam histórico e podem mudar por competência.
10. **Custo operacional baixo.** O total recorrente desejado é de aproximadamente R$ 100 por mês.
11. **Complexidade progressiva.** O caminho principal usa linguagem simples;
    detalhes de origem, conciliação, auditoria e confiança aparecem somente
    quando ajudam a decidir ou corrigir algo.

## 4. Perímetro inicial

- Um único Titular e um único dispositivo Android principal.
- Renda da esposa fora do cálculo inicial.
- Despesas familiares pagas pelo Titular dentro do planejamento.
- O ciclo mensal normal de ingestão financeira detalhada reúne o extrato OFX do
  Itaú Pessoal, a fatura XLSX do cartão e o extrato OFX do Itaú Empresa, sempre
  com Patrimônio de Origem escolhido explicitamente.
- Não há lançamento diário de compras no caminho principal. Gastos Informados
  persistidos continuam conciliáveis, mas a capacidade fica fora da rotina
  mensal aprovada.
- Categorias e Regras de Classificação são calibradas progressivamente. Uma
  confirmação do Titular pode ser reutilizada em competências futuras.
- Wise Business e Wise Pessoal não recebem ingestão detalhada no MVP. O OFX do
  Itaú Empresa integra a rotina mensal porque a conta da Empresa paga também
  Obrigações de Natureza Econômica Pessoal; o Resumo Empresarial mensal continua
  responsável pelos demais agregados empresariais necessários ao planejamento.
- Empresa e Pessoal permanecem patrimônios distintos nos registros, mas aparecem juntos na visão de planejamento do Titular.
- Pluggy e outros agregadores não são dependências do MVP. Uma integração futura só entra se reduzir esforço sem comprometer segurança, custo ou confiabilidade.
- O aplicativo não lê notificações de outros aplicativos.
- A IA recebe somente dados estruturados e sanitizados. Ela sugere categorias,
  destaca exceções e redige o resumo retrospectivo; valores oficiais continuam
  sendo produzidos por regras determinísticas.
- Empresa optante pelo Simples Nacional, com regras confirmadas posteriormente pelo contador quando necessário.
- Município de prestação configurado como Paranavaí, Paraná.

Identificadores fiscais e bancários não pertencem ao código-fonte e devem ser configurados com armazenamento seguro.

## 5. Jornada principal

### 5.1 Primeiro mês útil

1. Escolher uma competência concluída.
2. Preparar a Checklist Mensal a partir das Obrigações conhecidas.
3. Adicionar o OFX do Itaú Pessoal, a fatura XLSX e o OFX do Itaú Empresa em
   **Atualizar mês**.
4. Normalizar, deduplicar e agrupar descrições sem expor lotes ou movimentações
   técnicas no caminho principal.
5. Aplicar Regras de Classificação já confirmadas.
6. Pedir ao Titular somente decisões novas, ambíguas ou materiais.
7. Produzir o resumo retrospectivo e registrar a competência usada.
8. Apagar arquivos bancários brutos após validação da extração.

O uso pode começar com uma única competência. Histórico adicional é importado
progressivamente; lacunas diminuem a confiança, mas não impedem o primeiro
resumo.

### 5.2 Atualizar mês

O fluxo reúne as três fontes, mostra a cobertura da competência e pode ser
interrompido e retomado. Escolher o slot Itaú Pessoal, fatura ou Itaú Empresa
torna explícito o Patrimônio de Origem aplicável sem exigir um segundo formulário
técnico.

Reimportar um arquivo já confirmado é idempotente somente dentro do mesmo
Patrimônio de Origem. Um lote legado sem origem não substitui uma nova prévia
explicitamente marcada como Pessoal ou Empresa.

Na fatura XLSX do Itaú, o mês informado no título representa o pagamento. A
Competência dos Gastos do Cartão é o mês imediatamente anterior. Atualizar mês
preserva os dois: usa a competência dos gastos para cobertura, classificação,
resumo e Fechamento Mensal, sem apagar nem reinterpretar o mês de pagamento
declarado pela fonte.

Regras confirmadas classificam correspondências conhecidas. A IA sugere
categorias para descrições desconhecidas a partir de dados sanitizados e informa
incerteza; nenhuma sugestão incerta ou material é confirmada silenciosamente.
Cada correção do Titular produz memória auditável para as competências futuras.

Conferir atualização apresenta somente grupos ainda não cobertos por uma Regra
de Classificação. O Titular pode confirmar a Categoria sugerida, escolher outra
Categoria ou responder “não sei”. Confirmar e corrigir criam ou atualizam uma
Regra de Classificação versionada; “não sei” encerra a revisão daquele grupo sem
criar memória. Recusa, timeout, limite de requisições, saída inválida, Categoria
desconhecida ou identificador de grupo inválido deixam o fluxo recuperável e
nunca aplicam uma Categoria padrão.

Ao concluir, o produto apresenta totais determinísticos e um resumo retrospectivo
com maiores destinos do dinheiro, mudanças relevantes, recorrências e
oportunidades de economia. O resumo não altera categorias, Plano Financeiro ou
valores oficiais.

### 5.3 Checklist Mensal

A Checklist Mensal apresenta as Ocorrências de Obrigação da competência em
linguagem operacional. O Titular pode preparar o mês, copiar itens aplicáveis do
mês anterior, adicionar ou remover itens e concluir uma ação.

Marcar um item como concluído registra uma declaração do Titular; não cria um
Pagamento Identificado. A importação posterior pode conciliar uma movimentação e
acrescentar evidência sem apagar o histórico da conclusão informada.

### 5.4 Recebimento empresarial e Plano

O registro do Recebimento Empresarial e a criação do Plano Financeiro são as
fatias seguintes à experiência mensal básica. O valor deve respeitar a definição
canônica de recebimento bruto; um crédito líquido em conta não pode substituí-lo
silenciosamente.

Quando implementado, o Plano Financeiro segue esta ordem:

1. provisionar impostos e obrigações da Empresa;
2. provisionar pró-labore e INSS;
3. preservar custos e margem operacional;
4. determinar a retirada pessoal projetada;
5. financiar as reservas conforme a política vigente;
6. apresentar ações com valor, origem e destino;
7. aguardar execução manual nos aplicativos financeiros;
8. confirmar as ações pelo Resumo Empresarial e pelas importações posteriores
   aplicáveis.

O MVP não inicia Pix, transferências, pagamentos ou investimentos.

### 5.5 Uso durante o mês

Durante o mês, o Titular usa principalmente a Checklist Mensal. Não existe rotina
obrigatória de registro de compras nem revisão semanal.

A tela inicial prioriza:

- competência em foco e data da última atualização;
- progresso da Checklist Mensal;
- cobertura das três fontes;
- próxima ação necessária;
- último retrato oficial disponível, sua data e confiança, quando o núcleo
  determinístico puder produzi-lo.

Início nunca apresenta um retrato antigo como atual nem exige que o Titular
entenda Ciclo Financeiro, Lote de Importação, conciliação ou Fechamento parcial
para descobrir o que fazer.

## 6. Disponível para gastar

O cálculo conservador parte de saldos e compromissos conhecidos:

```text
Disponível para gastar =
  recursos pessoais líquidos
  - obrigações pessoais até o próximo recebimento
  - compras e parcelas já comprometidas
  - provisões essenciais não mensais
  - margem de imprevistos protegida
  - alocações confirmadas para reservas e objetivos
```

Recursos da Empresa, impostos, reservas e valores com dados desatualizados não entram como disponibilidade pessoal.

O Plano Financeiro transforma o valor calculado em um Limite de Gasto do Ciclo e
pode dividi-lo em Limites por Categoria. O restante estimado de cada categoria é:

```text
Restante estimado da categoria =
  Limite por Categoria
  - Gastos Informados ainda provisórios
  - movimentações do ciclo já importadas e conciliadas
```

Sem lançamentos diários e dados completos do ciclo atual, esse resultado não é
um saldo nem um Disponível para Gastar atualizado. O produto preserva a data do
cálculo e apresenta o Plano Financeiro como plano vigente, não como leitura em
tempo real.

## 7. Base essencial

A base essencial é proposta a partir de:

- obrigações fixas essenciais;
- percentil 75 dos gastos variáveis essenciais nos últimos 12 meses;
- um doze avos das provisões essenciais anuais;
- parcelas da casa e do carro enquanto estiverem vigentes.

A base fica estável por trimestre. Mudanças estruturais podem gerar uma Alteração de Plano antecipada, sempre sujeita a confirmação. Aumento de consumo discricionário não eleva automaticamente a base.

## 8. Reservas e prioridade

### 8.1 Reserva Operacional

- Meta: três meses dos custos fixos da Empresa.
- Primeiro marco: um mês.
- Exclui distribuição de lucros e impostos já provisionados.

### 8.2 Reserva Familiar

- Meta: nove meses das despesas familiares essenciais.
- Marcos: um, três, seis e nove meses.
- É exibida como meses de autonomia.

### 8.3 Reserva em Dólar

- Meta secundária de aproximadamente US$ 200 por mês.
- Não compõe a Reserva Familiar em reais.
- É flexível até a Reserva Familiar atingir um mês.
- Pode ser reduzida ou pausada em ciclos apertados, mediante confirmação.

### 8.4 Ordem de financiamento

1. Provisionar todas as obrigações.
2. Construir um mês da Reserva Operacional.
3. Construir um mês da Reserva Familiar.
4. Direcionar 20% da poupança disponível à Reserva Operacional e 80% à Reserva Familiar até a reserva empresarial completar três meses.
5. Direcionar a parcela liberada à Reserva Familiar e preservar a contribuição flexível em dólar.

## 9. Pró-labore e distribuições

- Pró-labore inicial: um salário mínimo nacional vigente na competência.
- O valor é versionado; mudança anual não reescreve o histórico.
- O INSS é calculado por regra determinística e versionada.
- Retiradas adicionais são inicialmente Distribuições Projetadas.
- A contabilização posterior pode confirmá-las ou exigir ajuste.
- Transferências para a Wise Pessoal fazem parte das retiradas pessoais e nunca reduzem o Recebimento Empresarial.

O produto acompanha o total mensal de distribuições e deve suportar as obrigações de informação e retenção vigentes, sem substituir a escrituração do contador.

## 10. Despesas pessoais e empresariais

Cada despesa recorrente possui uma única Natureza Econômica:

- integralmente empresarial;
- integralmente pessoal.

O pagamento pela conta PJ não determina sua natureza. Uma despesa pessoal paga
pela Empresa conclui a obrigação pessoal, reduz os recursos empresariais
disponíveis e permanece com tratamento contábil explícito até confirmação pelo
contador. Ela nunca é transformada automaticamente em despesa empresarial nem
contada novamente como saída da conta pessoal. Quando uma despesa beneficiar os
dois patrimônios, o Titular escolhe qual deles deve assumir integralmente sua
Natureza Econômica; o produto não mantém rateios.

## 11. Checklist Mensal e Obrigações

A Checklist Mensal substitui os checkboxes mensais do Notion sem transformar
interface em evidência financeira. Cada item é sustentado por uma Ocorrência de
Obrigação com nome, valor esperado, vencimento, conta responsável, status e
evidência.

A configuração de uma Obrigação separa Natureza Econômica — Pessoal ou Empresa —
da origem responsável pelo pagamento. A conta pagadora não muda essa decisão, e
uma Obrigação Pessoal pode ter a conta da Empresa como origem pagadora recorrente.

Status possíveis:

- prevista;
- aguardando pagamento;
- paga;
- divergente;
- atrasada;
- precisa de confirmação.

Uma conclusão informada mantém estado próprio e pode ser reaberta. Pagamentos
identificados podem concluir ocorrências automaticamente ou acrescentar
evidência, mas marcar o item manualmente nunca comprova pagamento.

Exemplos iniciais incluem internet, carro, casa, saúde, energia, água, contabilidade, celular e fatura do cartão.

## 12. Cartão de crédito

- Um cartão no perímetro inicial.
- Compras importadas integram a análise da competência.
- A fatura apresenta o último fechamento importado, vencimento, pagamento e total atual somente quando informado explicitamente.
- Compras são saídas da conta de cartão; créditos, estornos e Liquidação do
  Cartão são entradas com tipos explícitos. O pagamento da fatura não cria nova
  despesa nem participa da reconciliação do total da fatura.
- A Liquidação do Cartão pode ser vinculada a um débito bancário de valor oposto
  exato em período compatível. O vínculo exige confirmação explícita, preserva o
  Patrimônio de Origem de ambos os registros e impede dupla contagem sem alterar
  a Natureza Econômica.
- Parcelamentos são projetados nos ciclos futuros.
- Alertas imediatos ocorrem apenas quando existe uma ação material e confiável.
- Demais informações aparecem no resumo retrospectivo de Atualizar mês.

## 13. Resumo retrospectivo e Advisor

Na rotina mensal, a IA classifica somente o que não foi resolvido por regras
confirmadas, explica incertezas e redige o resumo retrospectivo sobre agregados
determinísticos e sanitizados. Esse uso não é um Plano Financeiro e não aplica
mudanças.

Em fase posterior, o Advisor oferece três cenários:

1. confortável;
2. equilibrado e recomendado;
3. acelerado.

Cada recomendação deve conter estado atual, alteração proposta, impacto, justificativa e ação de confirmação. Luna é o modo padrão de menor custo; Terra é reservado para análises mais profundas. O modelo Sol fica fora do MVP.

A IA não pode:

- calcular tributos oficiais como fonte de verdade;
- alterar regras fiscais, reservas ou objetivos silenciosamente;
- movimentar dinheiro;
- emitir documentos fiscais;
- apresentar investimento de risco como recomendação adequada ao perfil conservador;
- substituir contador ou aconselhamento profissional regulamentado.

## 14. NFS-e e câmbio

O MVP prepara a emissão, mas o Titular emite a NFS-e no PC.

Fluxo:

1. obter o valor bruto em USD;
2. calcular o valor fiscal em BRL;
3. preparar competência, descrição e campos recorrentes;
4. criar a Obrigação de emissão;
5. receber a NFS-e emitida pelo companion web;
6. extrair e conferir os campos;
7. guardar a nota no Cofre Fiscal;
8. concluir a Obrigação.

Regra provisória de conversão:

- PTAX de compra;
- fechamento do último dia útil anterior à emissão/fato gerador;
- aplicada ao valor bruto completo em USD;
- taxa, data, fonte e versão da regra armazenadas junto ao resultado.

A regra é deliberadamente provisória e deve ser validada futuramente com o contador. O código de serviço atual é uma configuração contábil confirmada e não pode ser alterado pela IA.

O código de serviço inicial é `130501`, conforme orientação do contador. O sistema o preserva como configuração versionada e não tenta substituí-lo por inferência sem uma nova validação contábil.

## 15. Cofre Fiscal

O cofre possui áreas Empresa e Pessoal.

Empresa inclui NFS-e, DAS, INSS, pró-labore, relatórios contábeis e fechamentos. Pessoal inclui IRPF, informes bancários, investimentos, imóvel, veículo e saúde.

Documentos ficam relacionados a competências e Obrigações. O produto pode gerar um pacote organizado para envio ao contador. Acesso direto do contador fica fora do MVP.

Extratos e faturas bancárias usados como fonte de importação não fazem parte do Cofre Fiscal e são apagados após processamento validado.

## 16. Notificações

Notificar somente quando houver:

- risco de vencimento;
- divergência relevante;
- compra atípica;
- limite financeiro importante;
- Plano Financeiro aguardando confirmação.

Essas são notificações emitidas pelo Brenotion. O produto não solicita acesso para
ler notificações de outros aplicativos.

## 17. Fora do MVP

- iniciação automática de pagamentos;
- emissão automática de NFS-e;
- acesso do contador ou da esposa;
- aplicativo iOS e publicação na Play Store;
- web app completo;
- to-do list genérica;
- múltiplos objetivos principais simultâneos;
- análise sofisticada de renda variável;
- recomendação autônoma de produtos financeiros;
- suporte a múltiplas instituições além das necessárias ao Titular;
- captura automática de notificações;
- integração bancária automática como requisito do MVP;
- lançamento diário obrigatório de compras.

## 18. Dependências de validação

- Formatos reais de exportação dos extratos Itaú Pessoal/Empresa e da fatura do cartão.
- Qualidade dos PDFs de fatura e extrato.
- Qualidade das sugestões de categoria, agrupamento e reaplicação das Regras de
  Classificação confirmadas.
- Utilidade do resumo retrospectivo produzido somente com dados sanitizados.
- Campos mínimos e cadência confortável para o Resumo Empresarial.
- Regra fiscal definitiva de conversão cambial.
- Documentos disponibilizados pelo contador e cadência de confirmação.
