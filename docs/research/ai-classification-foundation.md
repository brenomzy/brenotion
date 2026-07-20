# Fundação de IA para classificação e resumo mensal

Pesquisa validada em **19 de julho de 2026** exclusivamente em fontes oficiais
da OpenAI e da Convex. O foco é a primeira integração de IA do Brenotion:
aplicação universal Expo, Convex como backend, Clerk para um único Titular,
arquivos bancários brutos efêmeros, dados minimizados e custo operacional
recorrente desejado de aproximadamente R$ 100 por mês.

## Resumo executivo

A primeira arquitetura deve ser um **workflow pequeno e auditável**, não um
agente autônomo:

1. uma mutation autenticada registra a intenção de classificar uma competência e
   agenda uma `internalAction`;
2. uma query interna aplica primeiro as Regras de Classificação já confirmadas e
   prepara apenas as exceções, agrupadas e sanitizadas;
3. a action chama a OpenAI Responses API com `store: false` e Structured Outputs;
4. outra mutation interna valida e persiste **sugestões**, nunca decisões
   confirmadas;
5. o Titular revisa grupos inéditos ou ambíguos; cada confirmação cria ou melhora
   uma regra determinística reutilizável;
6. depois da confirmação, cálculos determinísticos produzem agregados oficiais;
7. uma segunda chamada opcional recebe somente esses agregados e devolve
   interpretações que referenciam seus identificadores, sem gerar valores.

Essa separação preserva a invariante central: **a IA classifica e explica; o
backend calcula, versiona e confirma**. Structured Outputs garante aderência ao
JSON Schema, inclusive campos obrigatórios e enums, mas não torna uma conclusão
semanticamente verdadeira; por isso ainda são necessários validação de domínio,
evals e revisão humana. [Fonte: Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

Recomenda-se escolher o modelo por um eval pequeno antes de fixá-lo: usar
**`gpt-5.6-sol` como referência de qualidade** e comparar `gpt-5.4-nano` com
`gpt-5.6-luna`. A documentação descreve `gpt-5.4-nano` especificamente para
classificação, extração e ranking; `gpt-5.6-luna` é a opção atual da família
GPT-5.6 para workloads sensíveis a custo. A produção usa um único modelo
configurado: o mais barato que atingir o gate de precisão, sem criar um roteador
prematuro. [Fontes: catálogo de modelos](https://developers.openai.com/api/docs/models),
[GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano) e
[seleção de modelo](https://developers.openai.com/api/docs/guides/model-selection)

Não se recomenda fine-tuning. A documentação atual informa que a plataforma de
fine-tuning está sendo descontinuada e já não aceita novos usuários. Embeddings
também não são necessários na primeira fatia: eles são apropriados para busca,
clustering e classificação por similaridade, mas o pequeno universo de um único
Titular pode ser resolvido de forma mais barata, explicável e auditável por
normalização e regras confirmadas. Reavaliar embeddings somente se as regras
determinísticas demonstrarem baixa cobertura sobre descrições genuinamente
variáveis. [Fontes: fluxo de otimização e situação do fine-tuning](https://developers.openai.com/api/docs/guides/model-optimization) e [embeddings](https://developers.openai.com/api/docs/guides/embeddings)

## 1. Onde executar as chamadas

### Decisão

Executar a OpenAI **somente no backend Convex**, em `internalAction`. A chave da
API fica em [variável de ambiente do deployment](https://docs.convex.dev/production/environment-variables)
e nunca chega ao Expo.

A Convex documenta Actions como a função destinada a chamar serviços externos.
Actions podem ler e escrever indiretamente por queries e mutations, verificar
autenticação e usar `fetch` no runtime Convex padrão. O runtime Node só é
necessário quando uma biblioteca exige APIs Node não suportadas. Para esta
primeira fatia, `fetch` direto mantém a integração menor e evita o cold start do
runtime Node. [Fonte: Convex Actions](https://docs.convex.dev/functions/actions)

O cliente não deve chamar a action diretamente. A própria Convex trata isso como
anti-pattern na maioria dos casos e recomenda que uma mutation primeiro capture
a intenção e então agende uma action interna. A mutation permite:

- verificar `ctx.auth.getUserIdentity()` e a allowlist do único Titular;
- verificar se a competência está pronta;
- criar um job idempotente por `ownerId + competence + inputHash + promptVersion`;
- impedir dois processamentos concorrentes equivalentes;
- exibir estado `queued | running | needs_review | completed | failed`.

A integração Clerk–Convex disponibiliza a identidade autenticada em queries,
mutations e actions por `ctx.auth.getUserIdentity()`. A autorização do proprietário
continua sendo regra explícita do backend, não uma condição visual do Expo.
[Fonte: autenticação em funções Convex](https://docs.convex.dev/auth/functions-auth)

Actions não são retentadas automaticamente porque podem ter efeitos externos e
têm timeout de dez minutos. Portanto, falhas devem deixar o job recuperável,
com tentativas limitadas e sem duplicar sugestões já persistidas. Toda leitura
necessária deve ser agrupada em uma query interna consistente e toda gravação
final em uma mutation interna. [Fonte: limites e tratamento de erros de Actions](https://docs.convex.dev/functions/actions)

## 2. Pipeline recomendado

### 2.1 Preparação determinística

Antes de consultar a IA:

1. validar, hashear e parsear cada arquivo bruto, persistir somente a
   representação estruturada necessária e apagar o arquivo temporário antes de
   agendar IA;
2. validar a competência e a cobertura das três fontes;
3. excluir Liquidações do Cartão, transferências conciliadas e outros casos
   resolvidos por regras de domínio;
4. aplicar Regras de Classificação confirmadas;
5. normalizar descrições sem destruir os tokens úteis do estabelecimento;
6. agrupar movimentações equivalentes;
7. redigir CPF, CNPJ, conta, agência, telefone, e-mail, chaves Pix, documentos,
   nomes de pessoas e identificadores bancários;
8. atribuir um `groupId` opaco local;
9. enviar somente grupos ainda não resolvidos.

A Convex permite apagar o objeto de File Storage por uma mutation ou action.
URLs de storage funcionam como bearer URLs reutilizáveis; portanto, não devem ser
enviadas ao modelo, e apagar o objeto é também o mecanismo de revogação.
[Fontes: exclusão de arquivos](https://docs.convex.dev/file-storage/delete-files)
e [modelo de segurança do File Storage](https://docs.convex.dev/file-storage/overview)

Arquivos OFX/XLSX e Movimentações de Origem completas nunca são enviados. Para
classificação, o payload mínimo sugerido contém:

- `groupId`;
- descrição normalizada e redigida;
- tipo `debit | credit`;
- Patrimônio de Origem, como contexto separado;
- faixa de magnitude opcional, nunca o saldo ou documento original;
- categorias permitidas com definição curta;
- poucos exemplos sanitizados de regras já confirmadas.

Patrimônio de Origem e Natureza Econômica são campos independentes no schema.
Uma conta Empresa não força Natureza Econômica Empresa.

### 2.2 Classificação por Structured Outputs

Usar um único request para vários grupos pequenos, com limite explícito de itens e
output curto. O schema deve aceitar abstinência:

```text
classification[]
  groupId
  suggestedCategoryId | null
  suggestedEconomicNature: personal | business | null
  evidence: known_merchant | description_semantics | recurring_pattern | insufficient
  uncertainty: low | medium | high
  explanation
```

O enum de categoria deve ser construído somente com IDs existentes. `null` e
`insufficient` são resultados válidos; o prompt não deve obrigar um palpite.
Além da garantia estrutural fornecida por Structured Outputs, o backend valida
novamente IDs, cardinalidade, duplicidade, comprimento, pertencimento ao Titular
e separação entre origem e natureza antes de persistir.

Na primeira versão, nenhuma sugestão da IA é aplicada silenciosamente:

- correspondência com regra confirmada: classificada automaticamente;
- sugestão inédita de baixa incerteza: aparece pré-selecionada, mas precisa de
  confirmação do Titular uma vez por grupo;
- sugestão de média ou alta incerteza: entra na caixa curta de exceções;
- abstinência ou schema inválido: permanece sem classificação.

Assim, a parte manual se concentra no começo e decresce sem confundir “o modelo
viu isso antes” com “o modelo foi treinado”. O aprendizado do produto é uma
Regra de Classificação versionada, auditável e reversível.

### 2.3 Resumo sem números inventados

O motor determinístico calcula totais, comparações, variações e rankings. A IA
recebe uma estrutura sanitizada como:

```text
aggregates[]
  aggregateId
  categoryId
  periodId
  officialAmount
  previousOfficialAmount | null
  deterministicChange | null
```

Mesmo sendo possível enviar valores agregados, a resposta do modelo não deve
conter campos numéricos livres. Ela devolve apenas referências:

```text
insights[]
  kind
  aggregateIds[]
  explanationWithoutAmounts
  suggestedNextStep
```

O backend rejeita explicações que tentem introduzir novos valores e a interface
insere os montantes oficiais a partir de `aggregateId`. Dessa forma, frases como
“alimentação subiu R$ X” usam `X` calculado, não texto produzido pelo modelo.
O resumo é interpretação versionada; o Fechamento Mensal continua sendo a fonte
auditável dos números.

## 3. Modelo, custo e Batch API

### Seleção inicial

Preços Standard publicados em 19 de julho de 2026, por milhão de tokens:

| Modelo | Entrada | Saída | Papel no spike |
| --- | ---: | ---: | --- |
| `gpt-5.6-sol` | US$ 5,00 | US$ 30,00 | referência de qualidade |
| `gpt-5.6-luna` | US$ 1,00 | US$ 6,00 | candidato equilibrado |
| `gpt-5.4-nano` | US$ 0,20 | US$ 1,25 | candidato mais barato para classificação |

### Resultado do eval de classificação

O eval foi executado em 19 de julho de 2026 com 30 casos sintéticos enviados ao
modelo e quatro casos sensíveis bloqueados deterministicamente antes da API. O
gate exigiu acurácia de Categoria de pelo menos `0,90` e nenhum falso positivo
de baixa incerteza. Os custos usam os preços Standard acima e a telemetria de
tokens devolvida pela Responses API:

| Modelo | Acurácia | Falsos positivos de baixa incerteza | Tokens entrada/saída | Latência | Custo observado | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `gpt-5.6-sol` | 1,0000 | 0 | 1.279 / 837 | 8.044 ms | US$ 0,031505 | aprovado |
| `gpt-5.6-luna` | 1,0000 | 0 | 1.279 / 837 | 3.303 ms | US$ 0,006301 | aprovado |
| `gpt-5.4-nano` | 0,8333 | 0 | 1.279 / 828 | 6.510 ms | US$ 0,001291 | reprovado |

`gpt-5.6-luna` foi aprovado para a primeira fatia por ser o modelo mais barato
entre os que passaram. O deployment de desenvolvimento usa esse identificador
em `OPENAI_CLASSIFICATION_MODEL`; a chave permanece separada e não versionada.

Este resultado é um gate inicial, não uma estimativa de desempenho em produção:
o conjunto é pequeno, inteiramente sintético, executado uma vez e mede Categoria,
não a acurácia separada de Natureza Econômica. Dados pessoais reais continuam
fora do spike, e toda sugestão inédita ainda exige decisão do Titular.

### Resultado autenticado da primeira competência real

A competência `2026-06` foi executada em 19 de julho de 2026 depois que a fatura
paga em julho passou a completar deterministicamente a Competência dos Gastos do
Cartão de junho. A primeira tentativa falhou antes da criação do job com
`TOO_MANY_CLASSIFICATION_GROUPS`; portanto, fez zero chamadas e teve custo zero.
Depois da regressão que divide o trabalho em até 40 grupos por chamada, o job
real concluiu em `needs_review` com somente telemetria agregada:

| Métrica | Resultado |
| --- | ---: |
| Grupos totais | 145 |
| Resolvidos por regra confirmada | 0 |
| Protegidos para revisão manual | 42 |
| Sugestões de Categoria | 77 |
| Abstinências do modelo | 26 |
| Rejeitados | 0 |
| Chamadas ao modelo | 3 |
| Tokens de entrada | 7.910 |
| Tokens de saída | 4.128 |
| Tokens totais | 12.038 |
| Latência agregada | 18.391 ms |
| Custo estimado | US$ 0,032678 |

O modelo foi `gpt-5.6-luna` com Responses API e `store: false`. As 42 revisões
manuais foram bloqueadas pelo sanitizador antes do modelo; os 103 grupos restantes
foram divididos em três chamadas síncronas, não na Batch API. O resultado ainda
não mede acurácia real: há 145 decisões pendentes e nenhuma sugestão se tornou
Regra de Classificação. A prova de redução para zero ou menos chamadas permanece
pendente das confirmações explícitas do Titular e de uma segunda execução.

[Fontes: catálogo e preços atuais](https://developers.openai.com/api/docs/models),
[comparação GPT-5.6](https://developers.openai.com/api/docs/models/compare) e
[GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano)

Rodar os três contra as mesmas 30–50 fixtures. Fixar em configuração o modelo
mais barato que atingir o gate, com output curto, Structured Outputs, sem
ferramentas, navegação ou estado conversacional e com o menor esforço de
raciocínio que preserve o resultado. O resumo pode exigir um modelo diferente no
futuro, mas isso é outra decisão apoiada por outro eval.

Como ilustração, 1.000 classificações com 300 tokens de entrada e 100 de saída
cada custariam aproximadamente US$ 0,19 no Nano, US$ 0,90 no Luna ou US$ 4,50 no
Sol. A estimativa não inclui retries, impostos, câmbio, Convex nem tokens
adicionais de raciocínio; o custo real deve usar a telemetria retornada pela API.

A OpenAI recomenda começar novos trabalhos com GPT-5.6 e usar evals, prompting e
exemplos antes de otimizações maiores. O próprio guia diz que prompt engineering
pode ser suficiente para obter bons resultados.
[Fonte: model optimization](https://developers.openai.com/api/docs/guides/model-optimization)

### Batch API

A Batch API aceita `/v1/responses`, oferece 50% de desconto e conclui em até 24
horas; a documentação cita classificação de grandes datasets e execução de evals
como casos adequados. [Fonte: Batch API](https://developers.openai.com/api/docs/guides/batch)

Apesar disso, **não usar Batch na primeira fatia**:

- o volume de um Titular é pequeno e mensal;
- o custo síncrono esperado já é baixo;
- Batch adiciona arquivo JSONL, polling, associação de resultados e limpeza;
- objetos `/v1/files` e `/v1/batches` têm estado persistente até exclusão, o que
  amplia o trabalho de retenção e auditoria.

Reavaliar Batch apenas para evals sanitizados ou quando volume/custo medidos
justificarem a complexidade e uma política de exclusão imediata estiver testada.

## 4. Privacidade e retenção

Chamadas da API não são usadas para treinar modelos por padrão. Isso não significa
retenção zero. Logs de monitoramento de abuso podem conter prompts, respostas e
metadados e, por padrão, são mantidos por até 30 dias. Na Responses API,
`store: false` impede a persistência do response como estado de aplicação, mas
não equivale a Zero Data Retention. ZDR é um controle separado, disponível para
organizações qualificadas. [Fontes: uso de dados da API](https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/) e [controles de dados](https://developers.openai.com/api/docs/guides/your-data)

Política inicial recomendada:

- usar sempre `store: false`;
- não usar Conversations, File Search, arquivos da OpenAI, background mode,
  ferramentas hospedadas ou MCP;
- não enviar arquivos brutos nem identificadores fiscais/bancários;
- tratar descrições com nomes de pessoas ou transferências Pix como exceção
  humana após redação, não como texto para o modelo;
- manter a memória no Convex, sob autorização do Titular;
- registrar somente metadados operacionais sem conteúdo financeiro;
- avaliar ZDR antes de produção com dados pessoais reais; até lá, limitar o spike
  a fixtures sintéticas e sanitizadas.

## 5. Confiança, observabilidade e evals

“Confiança” deve ser uma política do Brenotion, não uma porcentagem inventada pelo
modelo. A origem da decisão fica visível internamente:

- `confirmed_rule`: automático e auditável;
- `ai_suggestion_low_uncertainty`: ainda requer confirmação inicial;
- `ai_suggestion_ambiguous`: exceção;
- `unclassified`: abstinência segura.

O limiar futuro para reduzir revisões deve vir de precisão observada por categoria,
especialmente falsos positivos, e não apenas do campo `uncertainty`. A OpenAI
recomenda revisão humana antes do uso prático de outputs, sobretudo em domínios
de maior impacto. [Fonte: safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)

Persistir, sem prompt ou descrição financeira:

- `jobId`, `ownerId`, competência e `inputHash`;
- modelo, versão do prompt e versão do schema;
- instante, duração, estado e número de tentativas;
- contagem de grupos resolvidos, sugeridos, abstidos e rejeitados;
- tokens de entrada/saída e custo estimado;
- identificador técnico da resposta quando disponível;
- confirmação/correção posterior do Titular.

Separar projeto/chave de desenvolvimento e produção e configurar alertas/limites
de gasto. A documentação oficial recomenda projetos separados, limites por
projeto, proteção da chave em variável de ambiente e monitoramento de uso.
[Fonte: production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)

O primeiro eval deve usar descrições inteiramente sintéticas e cobrir:

- estabelecimentos recorrentes conhecidos;
- descrições ruidosas e abreviadas;
- homônimos entre categorias;
- despesa pessoal paga pela Empresa;
- despesa da Empresa paga pelo Pessoal;
- Liquidação do Cartão;
- transferências, estornos e créditos;
- dados insuficientes e tentativa de prompt injection na descrição.

Métricas mínimas:

- precisão e recall por categoria;
- precisão separada da Natureza Econômica;
- taxa de abstinência;
- falsos positivos de baixa incerteza;
- cobertura por regras antes da IA;
- quantidade de confirmações manuais por competência;
- custo e latência por 100 grupos.

A OpenAI recomenda desenvolvimento guiado por evals, datasets que representem a
distribuição real, logging para descobrir novos casos, scoring automatizado
calibrado por feedback humano e avaliação contínua a cada mudança. Classificação
com ground truth é um caso diretamente suportado pelos evals.
[Fonte: evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

## 6. Primeira fatia implementável

**Objetivo:** provar ponta a ponta que o Brenotion reduz revisão manual sem
permitir que IA altere números oficiais.

1. Definir 8–12 categorias canônicas pequenas e independentes de Natureza
   Econômica.
2. Criar fixtures sintéticas de 30–50 grupos, com ground truth e casos de
   abstinência.
3. Implementar sanitizador determinístico e testes que comprovem a remoção de
   identificadores.
4. Implementar `requestMonthlyClassification` como mutation autenticada,
   idempotente e agendadora.
5. Implementar query interna que aplica regras e produz exceções sanitizadas.
6. Implementar um adapter fake e um adapter OpenAI por `fetch`, ambos com o mesmo
   contrato de Structured Outputs.
7. Persistir sugestões separadas de decisões confirmadas, com prompt/model/schema
   versionados.
8. Criar revisão por **grupo inédito**, com confirmar, corrigir ou “não sei”.
9. Ao confirmar, criar Regra de Classificação e reaplicá-la deterministicamente.
10. Medir o segundo processamento: grupos conhecidos não devem consultar a IA.
11. Só então adicionar o resumo sobre agregados determinísticos, sem números
    livres na saída.

### Critérios de aceite

- nenhum arquivo bruto ou identificador sensível aparece no request, response,
  log, fixture ou erro;
- funções públicas recusam quem não seja o Titular;
- duas solicitações equivalentes não criam dois jobs ou duas sugestões;
- regras confirmadas são aplicadas antes de qualquer chamada;
- saída fora do schema, categoria desconhecida ou `groupId` inválido é rejeitada;
- a IA pode abster-se;
- uma sugestão da IA nunca vira regra sem confirmação explícita;
- Patrimônio de Origem e Natureza Econômica permanecem independentes;
- o resumo referencia somente agregados oficiais existentes;
- trocar modelo ou prompt exige rodar novamente os evals;
- custo e latência ficam observáveis sem registrar conteúdo financeiro.

## Recomendação final

Começar pela **classificação assistida de grupos inéditos**, não pelo Advisor
conversacional. Essa fatia já cria a infraestrutura reutilizável do futuro
Advisor — autenticação, sanitização, adapter de modelo, schema, jobs, telemetria e
evals — ao mesmo tempo que ataca diretamente a maior irritação do Titular:
revisar manualmente as mesmas descrições todos os meses.

O comportamento desejado não é “a IA fica treinada”; é melhor: **cada correção do
Titular vira memória determinística do Brenotion, e a IA volta a trabalhar apenas
quando aparece algo realmente novo**.

## Fontes primárias consultadas

- [OpenAI — Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI — Models e preços](https://developers.openai.com/api/docs/models/compare)
- [OpenAI — Model optimization](https://developers.openai.com/api/docs/guides/model-optimization)
- [OpenAI — Embeddings](https://developers.openai.com/api/docs/guides/embeddings)
- [OpenAI — Batch API](https://developers.openai.com/api/docs/guides/batch)
- [OpenAI — Data controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI — Uso de dados para treinamento](https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/)
- [OpenAI — Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [OpenAI — Production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)
- [OpenAI — Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Convex — Actions](https://docs.convex.dev/functions/actions)
- [Convex — Auth in Functions](https://docs.convex.dev/auth/functions-auth)
- [Convex — Clerk](https://docs.convex.dev/auth/clerk)
- [Convex — Environment variables](https://docs.convex.dev/production/environment-variables)
- [Convex — File Storage](https://docs.convex.dev/file-storage/overview)
- [Convex — Delete files](https://docs.convex.dev/file-storage/delete-files)
