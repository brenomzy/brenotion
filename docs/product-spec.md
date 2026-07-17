# Especificação do Produto

## 1. Visão

Brenotion deve impedir que o saldo bancário seja confundido com dinheiro livre. Sempre que um recebimento chegar, o produto deve explicar quanto pertence a impostos e obrigações, quanto pode sair da Empresa, quanto deve ser protegido e quanto permanece disponível para a vida familiar.

O produto substitui a lista mensal de contas mantida no Notion e acrescenta conciliação automática, planejamento, reservas, documentos fiscais e aconselhamento baseado em dados.

## 2. Resultado esperado

Ao final do primeiro mês de uso confiável, o Titular deve conseguir:

- entender para onde foi o dinheiro;
- não perder vencimentos financeiros ou burocráticos;
- antecipar a fatura do cartão sem surpresa;
- conhecer o valor disponível até o próximo recebimento;
- executar um plano de separação no dia posterior ao pagamento;
- observar crescimento das reservas;
- revisar a semana em cerca de cinco minutos;
- fechar o mês com retiradas e documentos conciliados.

## 3. Princípios

1. **Automação antes de digitação.** Entrada manual recorrente é uma exceção.
2. **Saldo não é disponibilidade.** O produto destaca o valor disponível, não o saldo agregado.
3. **Empresa e pessoa são patrimônios distintos.** Pagamento e natureza econômica são classificados separadamente.
4. **Cálculos são determinísticos.** A IA interpreta e aconselha, mas não inventa valores oficiais.
5. **Recomendações são firmes e explicáveis.** O Titular pode discordar, mas vê o impacto.
6. **Uma meta principal por vez.** Reservas mínimas antecedem objetivos de consumo.
7. **Dados recentes condicionam confiança.** Um indicador desatualizado nunca é chamado de seguro.
8. **Menos notificações, mais ação.** Alertas existem apenas quando há uma decisão relevante.
9. **Configuração é revisável.** Regras fiscais e contábeis preservam histórico e podem mudar por competência.
10. **Custo operacional baixo.** O total recorrente desejado é de aproximadamente R$ 100 por mês.

## 4. Perímetro inicial

- Um único Titular e um único dispositivo Android principal.
- Renda da esposa fora do cálculo inicial.
- Despesas familiares pagas pelo Titular dentro do planejamento.
- Itaú PF e um cartão de crédito Itaú formam a única integração financeira automática do perímetro inicial.
- Compras do cartão e Pix do Itaú PF exigem ingestão automática; digitação recorrente dessas movimentações não é um fallback aceitável.
- Itaú PJ, Wise Business e Wise Pessoal permanecem fora da integração automática inicial. Enquanto os fluxos forem previsíveis e de baixo volume, valores necessários ao planejamento podem ser informados manualmente de forma explícita e auditável.
- Novas fontes financeiras só entram depois que a revisão periódica com Itaú PF demonstrar valor e exigir menor esforço manual.
- Empresa optante pelo Simples Nacional, com regras confirmadas posteriormente pelo contador quando necessário.
- Município de prestação configurado como Paranavaí, Paraná.

Identificadores fiscais e bancários não pertencem ao código-fonte e devem ser configurados com armazenamento seguro.

## 5. Jornada principal

### 5.1 Onboarding histórico

1. Importar até 12 meses completos e o mês atual parcial.
2. Preferir OFX ou CSV; aceitar PDF como fallback.
3. Normalizar e deduplicar movimentações.
4. Agrupar descrições semelhantes.
5. Realizar uma revisão guiada de 30 a 60 minutos.
6. Aplicar as regras confirmadas ao histórico e às movimentações futuras.
7. Propor despesas essenciais, obrigações recorrentes e uma base trimestral.
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
8. confirmar as ações pelas movimentações sincronizadas.

O MVP não inicia Pix, transferências, pagamentos ou investimentos.

### 5.3 Acompanhamento periódico

O Titular consulta o produto principalmente em revisões semanais ou mensais e
antes de decisões financeiras relevantes. Ao abrir a aplicação, o último retrato
persistido aparece imediatamente com sua recência explícita; uma atualização pode
rodar em segundo plano quando os dados estiverem antigos.

A tela inicial prioriza:

- Disponível para gastar até o próximo recebimento;
- fatura atual e compromissos futuros do cartão;
- obrigações pendentes;
- dinheiro protegido;
- próxima ação necessária;
- data da última sincronização e nível de confiança.

Compras são reconhecidas na data da compra. Parcelas futuras reduzem a liberdade dos ciclos correspondentes.

### 5.4 Revisão semanal

A revisão semanal deve durar aproximadamente cinco minutos e apresentar somente:

- anomalias de categorização;
- gastos acima do ritmo planejado;
- fatura e parcelamentos relevantes;
- obrigações em risco;
- impacto sobre as reservas;
- até três ações recomendadas.

### 5.5 Fechamento mensal

O fechamento mensal:

- concilia obrigações e pagamentos;
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
```

Recursos da Empresa, impostos, reservas e valores com dados desatualizados não entram como disponibilidade pessoal.

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

## 10. Despesas empresariais e mistas

Cada despesa recorrente pode ser:

- integralmente empresarial;
- mista, com percentual empresarial configurável;
- pessoal.

O pagamento pela conta PJ não determina sua natureza. A parcela pessoal de uma despesa paga pela Empresa é tratada como retirada. A lista e os percentuais serão configurados durante o onboarding e poderão ser revisados no futuro.

## 11. Central de obrigações

A central substitui os checkboxes mensais do Notion. Cada Ocorrência de Obrigação contém nome, valor esperado, vencimento, conta responsável, status e evidência.

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
- Compras reduzem imediatamente o Disponível para Gastar.
- A fatura apresenta valor atual, fechamento, vencimento e pagamento.
- Parcelamentos são projetados nos ciclos futuros.
- Alertas imediatos ocorrem apenas para compra atípica, comprometimento relevante ou marcos de 75%, 90% e 100% da verba variável.
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
- sincronização quebrada ou consentimento expirando;
- compra atípica;
- limite financeiro importante;
- Plano Financeiro aguardando confirmação.

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
- suporte a múltiplas instituições além das necessárias ao Titular.

## 18. Dependências de validação

- Cobertura, histórico, parcelamentos, estabilidade e preço da integração financeira.
- Formatos reais de exportação do Itaú e da Wise.
- Qualidade dos PDFs de fatura e extrato.
- Percentuais de despesas mistas.
- Regra fiscal definitiva de conversão cambial.
- Documentos disponibilizados pelo contador e cadência de confirmação.
