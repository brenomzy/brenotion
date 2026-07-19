# Especificação do Produto

## 1. Visão

Brenotion deve impedir que o saldo bancário seja confundido com dinheiro livre. Sempre que um recebimento chegar, o produto deve explicar quanto pertence a impostos e obrigações, quanto pode sair da Empresa, quanto deve ser protegido e quanto permanece disponível para a vida familiar.

O produto substitui a lista mensal de contas mantida no Notion e acrescenta importação e conciliação assistidas, planejamento, reservas, documentos fiscais e aconselhamento baseado em dados.

## 2. Resultado esperado

Ao final do primeiro mês de uso confiável, o Titular deve conseguir:

- entender para onde foi o dinheiro;
- não perder vencimentos financeiros ou burocráticos;
- compreender a fatura do cartão e seu impacto no ciclo seguinte;
- distinguir o último Disponível para Gastar conhecido do Limite de Gasto do Ciclo;
- executar um plano de separação no dia posterior ao pagamento;
- observar crescimento das reservas;
- registrar em poucos segundos um gasto atual que altere o plano;
- fechar o mês com retiradas e documentos conciliados.

## 3. Princípios

1. **Automação com controle.** Arquivos e regras eliminam redigitação do histórico; entrada manual curta é aceitável quando atualiza deliberadamente o ciclo em andamento.
2. **Saldo não é disponibilidade.** O produto destaca o valor disponível, não o saldo agregado.
3. **Empresa e pessoa são patrimônios distintos.** Pagamento e natureza econômica são classificados separadamente.
4. **Cálculos são determinísticos.** A IA interpreta e aconselha, mas não inventa valores oficiais.
5. **Recomendações são firmes e explicáveis.** O Titular pode discordar, mas vê o impacto.
6. **Uma meta principal por vez.** Reservas mínimas antecedem objetivos de consumo.
7. **Recência condiciona linguagem.** Um fechamento antigo pode sustentar planejamento, mas nunca é apresentado como retrato atual.
8. **Menos notificações, mais ação.** Alertas existem apenas quando há uma decisão relevante.
9. **Configuração é revisável.** Regras fiscais e contábeis preservam histórico e podem mudar por competência.
10. **Custo operacional baixo.** O total recorrente desejado é de aproximadamente R$ 100 por mês.

## 4. Perímetro inicial

- Um único Titular e um único dispositivo Android principal.
- Renda da esposa fora do cálculo inicial.
- Despesas familiares pagas pelo Titular dentro do planejamento.
- O ciclo mensal normal de ingestão financeira detalhada reúne o extrato OFX do
  Itaú Pessoal, a fatura XLSX do cartão e o extrato OFX do Itaú Empresa, sempre
  com Patrimônio de Origem escolhido explicitamente.
- Gastos relevantes do ciclo atual podem ser fornecidos como Gastos Informados curtos e provisórios; a importação posterior os concilia sem dupla contagem.
- Cada categoria variável ou flexível pode receber um Limite por Categoria dentro do Limite de Gasto do Ciclo.
- Wise Business e Wise Pessoal não recebem ingestão detalhada no MVP. O OFX do
  Itaú Empresa integra a rotina mensal porque a conta da Empresa paga também
  Obrigações de Natureza Econômica Pessoal; o Resumo Empresarial mensal continua
  responsável pelos demais agregados empresariais necessários ao planejamento.
- Empresa e Pessoal permanecem patrimônios distintos nos registros, mas aparecem juntos na visão de planejamento do Titular.
- Pluggy e outros agregadores não são dependências do MVP. Uma integração futura só entra se reduzir esforço sem comprometer segurança, custo ou confiabilidade.
- O aplicativo não lê notificações. Texto ou imagem escolhidos e enviados explicitamente pelo Titular podem se tornar meios assistidos de criar um Gasto Informado.
- Empresa optante pelo Simples Nacional, com regras confirmadas posteriormente pelo contador quando necessário.
- Município de prestação configurado como Paranavaí, Paraná.

Identificadores fiscais e bancários não pertencem ao código-fonte e devem ser configurados com armazenamento seguro.

## 5. Jornada principal

### 5.1 Onboarding histórico

1. Importar até 12 meses completos do Itaú Pessoal; o mês atual parcial é
   opcional. O histórico anterior do Itaú Empresa pode se limitar aos períodos
   necessários à visão integrada e às conciliações; depois da ativação, seu OFX
   integra todo ciclo mensal normal.
2. Preferir OFX ou CSV; aceitar PDF como fallback.
3. Normalizar e deduplicar movimentações.
4. Agrupar descrições semelhantes.
5. Realizar uma revisão guiada de 30 a 60 minutos.
6. Aplicar as regras confirmadas ao histórico e às movimentações futuras.
7. Propor despesas essenciais, obrigações recorrentes, limites iniciais por categoria e uma base trimestral.
8. Apagar arquivos bancários brutos após validação da extração.

Lacunas diminuem o nível de confiança, mas não impedem a análise histórica.

### 5.2 Recebimento empresarial

No dia do recebimento, o produto cria um Plano Financeiro com esta ordem:

1. provisionar impostos e obrigações da Empresa;
2. provisionar pró-labore e INSS;
3. preservar custos e margem operacional;
4. determinar a retirada pessoal projetada;
5. financiar as reservas conforme a política vigente;
6. apresentar ações com valor, origem e destino;
7. aguardar execução manual nos aplicativos financeiros;
8. confirmar as ações pelo Resumo Empresarial, pelos Gastos Informados e pelas importações posteriores aplicáveis.

O MVP não inicia Pix, transferências, pagamentos ou investimentos.

### 5.3 Acompanhamento periódico

O Titular consulta o produto principalmente no Fechamento Mensal, em checkpoints
curtos e antes de decisões financeiras relevantes. Ao abrir a aplicação, o último
retrato fechado aparece imediatamente com sua data de referência e confiança. O
plano do ciclo atual é atualizado somente por informações importadas, calculadas
ou fornecidas explicitamente pelo Titular.

A tela inicial prioriza:

- último Disponível para Gastar conhecido e sua data de referência;
- Limite de Gasto do Ciclo e estimativas restantes por categoria;
- fatura fechada, Gastos Informados e compromissos futuros do cartão;
- obrigações pendentes;
- dinheiro protegido;
- próxima ação necessária;
- data do último fechamento, dados provisórios e nível de confiança.

Um Gasto Informado reduz imediatamente o limite aplicável, mas permanece
provisório até ser conciliado com a Movimentação de Origem importada. A entrada
rápida prioriza valor e descrição; data, categoria e meio de pagamento usam
sugestões confirmáveis. Imagens escolhidas pelo Titular podem ser processadas
temporariamente como conveniência futura, sem acesso ao fluxo de notificações.

Compras importadas são reconhecidas na data da compra. Parcelas futuras reduzem
a liberdade dos ciclos correspondentes.

### 5.4 Revisão semanal

A revisão semanal é um checkpoint opcional de aproximadamente cinco minutos e apresenta somente:

- anomalias de categorização;
- gastos acima do ritmo planejado;
- fatura e parcelamentos relevantes;
- obrigações em risco;
- impacto sobre as reservas;
- até três ações recomendadas.

Na fundação inicial, Revisar agrupa Movimentações de Origem por descrição
normalizada e permite confirmar somente sua Natureza Econômica. Liquidação do
Cartão permanece fora dessa decisão, e nenhuma confirmação classifica categorias,
concilia pagamentos ou altera valores oficiais.

### 5.5 Fechamento mensal

O fechamento mensal:

- verifica a cobertura do Itaú Pessoal, da fatura e do Itaú Empresa como três
  entradas separadas do mesmo ciclo, sem fundir seus Patrimônios de Origem;
- concilia obrigações e pagamentos;
- concilia Gastos Informados com Movimentações de Origem sem dupla contagem;
- confirma ou sinaliza distribuições projetadas;
- transfere a sobra da Margem de Imprevistos para a reserva aplicável;
- registra documentos faltantes;
- fecha a competência sem alterar históricos;
- produz um resumo explicável do mês.

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

Sem dados completos do ciclo atual, esse resultado é uma estimativa de aderência
ao plano, não um saldo ou um Disponível para Gastar atualizado. Gastos flexíveis
reduzem sua categoria; gastos essenciais variáveis reduzem a provisão aplicável;
imprevistos essenciais usam primeiro a Margem de Imprevistos; uma nova obrigação
recorrente pode exigir uma Alteração de Plano.

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

## 11. Central de obrigações

A central substitui os checkboxes mensais do Notion. Cada Ocorrência de Obrigação contém nome, valor esperado, vencimento, conta responsável, status e evidência.

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

Pagamentos identificados concluem ocorrências automaticamente. Ação manual existe apenas para correção ou ausência de correspondência.

Exemplos iniciais incluem internet, carro, casa, saúde, energia, água, contabilidade, celular e fatura do cartão.

## 12. Cartão de crédito

- Um cartão no perímetro inicial.
- Compras reduzem o limite aplicável quando são informadas ou importadas.
- A fatura apresenta o último fechamento importado, vencimento, pagamento e total atual somente quando informado explicitamente.
- Compras são saídas da conta de cartão; créditos, estornos e Liquidação do
  Cartão são entradas com tipos explícitos. O pagamento da fatura não cria nova
  despesa nem participa da reconciliação do total da fatura.
- A Liquidação do Cartão pode ser vinculada a um débito bancário de valor oposto
  exato em período compatível. O vínculo exige confirmação explícita, preserva o
  Patrimônio de Origem de ambos os registros e impede dupla contagem sem alterar
  a Natureza Econômica.
- Parcelamentos são projetados nos ciclos futuros.
- Alertas imediatos ocorrem apenas para compra atípica, comprometimento relevante ou marcos de 75%, 90% e 100% de um Limite por Categoria.
- Demais informações aparecem na revisão semanal.

## 13. Advisor

O Advisor oferece três cenários:

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
- leitura assistida de prints antes de o registro textual provar valor.

## 18. Dependências de validação

- Formatos reais de exportação dos extratos Itaú Pessoal/Empresa e da fatura do cartão.
- Qualidade dos PDFs de fatura e extrato.
- Qualidade da conciliação entre Gastos Informados e arquivos importados.
- Campos mínimos e cadência confortável para o Resumo Empresarial.
- Regra fiscal definitiva de conversão cambial.
- Documentos disponibilizados pelo contador e cadência de confirmação.
