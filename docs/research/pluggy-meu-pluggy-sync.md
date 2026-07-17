# Pluggy para uso pessoal: gratuidade, skills e sincronização

Pesquisa validada em 16 de julho de 2026 exclusivamente em fontes oficiais da Pluggy. O foco é o cenário atual do Brenotion: um único Titular, dados próprios, conexão já criada no Meu Pluggy e aplicação de desenvolvimento usando o Conector 200.

## Resumo executivo

> Decisão de produto posterior à pesquisa, registrada em 16 de julho de 2026: o
> perímetro automático inicial foi reduzido ao Itaú PF e ao cartão associado, com
> uso esperado semanal ou mensal. Itaú PJ e Wise podem começar como entradas
> manuais explícitas. Nesse cenário, recência diária tende a ser suficiente, desde
> que o retrato seja atualizado e qualificado antes de uma decisão relevante.

- O uso pessoal é oficialmente gratuito tanto no portal Meu Pluggy quanto via API pelo Conector 200, inclusive depois do teste comercial. Isso não equivale ao produto de Dados em produção: o proxy gratuito não tem SLA, contrato, webhooks, categorização automática, identidade/KYC nem PIX, e a migração posterior não preserva conexões, transações ou configurações.
- Vale instalar as skills oficiais antes de implementar o adapter: `pluggy-integration` e `pluggy-open-finance` cobrem justamente credenciais, Items, sincronização, transações e webhooks; `pluggy-doctor` passa a valer quando existir código para revisar. `pluggy-payments` deve ficar fora do Brenotion enquanto o MVP permanecer somente leitura.
- No Conector 200, a fonte oficial promete atualização diária do proxy, não tempo real. Não encontrei promessa oficial de que `PATCH /items` force a conexão original do Meu Pluggy a buscar o banco, e a página de preços declara que esse modelo não tem webhooks. Portanto, podemos acelerar a ingestão e a interface depois que a Pluggy disponibilizar os dados, mas não reduzir com segurança a janela banco → Meu Pluggy no plano gratuito.

### Evidência do spike em 16 de julho de 2026

A Development Application `Brenotion Spike` autenticou com `POST /auth` e leu o
Item proxy do Meu Pluggy por `GET /items/{itemId}` com HTTP `200`, estado
`UPDATED` e execução `SUCCESS`. A consulta sanitizada a
`GET /accounts?itemId=...` também retornou HTTP `200` e confirmou cobertura de
duas contas: uma `BANK`/`CHECKING_ACCOUNT` e uma `CREDIT`/`CREDIT_CARD`. Nenhuma
transação foi consultada e nenhum identificador, saldo ou limite foi registrado.

O `401` observado em `GET /items` não era falha de credencial ou plano. A
documentação atual informa que a listagem de conexões não é mais oferecida por
segurança; o integrador deve guardar o `itemId` recebido no Connect e consultar o
Item específico. [Fonte: Item](https://docs.pluggy.ai/docs/item)

## 1. O que é gratuito e quais são os limites

O Meu Pluggy é um portal pessoal gratuito para conectar contas, consultar dados próprios, gerenciar/revogar consentimentos e exportar informações. Sua página atual anuncia API de Open Finance sem custo e sem expiração para uso pessoal, sem limite de contas desde que sejam do mesmo Titular. A documentação do projeto também diz que contas, cartões, transações e empréstimos fornecidos pela instituição ficam disponíveis no portal. [Fonte: página oficial do Meu Pluggy](https://www.pluggy.ai/meu-pluggy) e [repositório oficial](https://github.com/pluggyai/meu-pluggy)

Para acesso programático aos próprios dados, a Pluggy confirma que o **Conector 200** é um proxy gratuito sobre o que já foi conectado no Meu Pluggy. Depois do teste comercial, o uso pessoal via API pode continuar gratuitamente por esse conector. Cada banco configurado no Meu Pluggy precisa ser autorizado separadamente na aplicação de desenvolvimento; a conexão proxy é mantida pelo Meu Pluggy e atualizada diariamente. [Fonte: preços e FAQ oficiais](https://www.pluggy.ai/precos) e [fluxo oficial do Meu Pluggy para desenvolvedores](https://github.com/pluggyai/meu-pluggy)

Limitações explícitas do modelo gratuito:

- o usuário precisa criar a conta no Meu Pluggy, conectar o banco ali e depois autorizar a aplicação;
- a aplicação só acessa instituições que o usuário já conectou no Meu Pluggy;
- não há SLA nem contrato;
- faltam PIX, webhooks, categorização automática e identidade/KYC;
- conexões, transações e configurações do período gratuito não são portáveis para o onboarding comercial;
- o ritmo documentado do proxy é diário, sem garantia de horário ou latência.

Essas limitações estão descritas na [página oficial de preços](https://www.pluggy.ai/precos). Para o Brenotion pessoal, a fricção de onboarding é quase irrelevante, porque há um único Titular e a conexão já foi feita. Os limites importantes são ausência de webhooks/SLA, recência diária e risco de migração futura.

Há uma inconsistência menor entre fontes oficiais: a página atual do Meu Pluggy ainda fala em teste de 15 dias no Dashboard, enquanto a página de preços fala em 14 dias. Isso não muda o uso pessoal, que ambas tratam como gratuito e sem expiração. Também há tensão entre a [matriz dinâmica de cobertura](https://docs.pluggy.ai/docs/connectors-coverage), que marca alguns produtos no conector MeuPluggy, e a página de preços, que declara ausentes identidade/KYC e webhooks. A cobertura efetiva do Item conectado deve prevalecer e ser registrada pelo spike, sem inferir recurso apenas pela matriz.

Há uma separação importante entre o Conector 200 e uma aplicação comercial. O produto **Dados** começa em R$ 2.500/mês, oferece contas reais dentro do próprio produto, webhooks, enriquecimento e suporte; o teste de produção dura 14 dias. Depois dele, conexões reais comerciais pausam e os dados/configuração ficam guardados por 30 dias, enquanto o acesso pessoal gratuito continua possível somente pelo Conector 200. [Fonte: preços e FAQ oficiais](https://www.pluggy.ai/precos)

O sandbox permanece disponível para testar fluxos, incluindo MFA, erros, `PARTIAL_SUCCESS`, autorização pendente, Open Finance e grandes volumes sintéticos. Items de sandbox sem atualização por mais de 30 dias são apagados. [Fonte: Sandbox](https://docs.pluggy.ai/docs/sandbox)

## 2. Skills oficiais: instalar ou não

A Pluggy mantém um repositório oficial, aberto sob MIT e compatível com o formato Agent Skills. A instalação documentada é:

```sh
npx skills add pluggyai/agent-skills
```

O pacote inclui:

- `pluggy-integration`: autenticação, Pluggy Connect, ciclo de vida de Items, webhooks, MFA e erros;
- `pluggy-open-finance`: conectores, contas, transações, paginação e estratégia de sincronização;
- `pluggy-payments`: PIX, boleto e transferências;
- `pluggy-doctor`: revisão da integração contra a documentação oficial.

Fontes: [documentação oficial das skills](https://docs.pluggy.ai/docs/ai-skills) e [repositório oficial](https://github.com/pluggyai/agent-skills).

### Recomendação para o Brenotion

**Sim, vale instalar**, mas revisar o diff gerado e fixar a versão/commit no `skills-lock.json`, seguindo a prática já adotada pelo repositório. As duas skills diretamente úteis agora são `pluggy-integration` e `pluggy-open-finance`. `pluggy-doctor` é útil no gate da prova de conceito e antes de qualquer produção. `pluggy-payments` não deve orientar o código atual porque contradiz o invariante de somente leitura do MVP.

O ganho é qualidade e consistência de implementação, não velocidade de sincronização do banco. A própria Pluggy descreve as skills como padrões e boas práticas que funcionam sem MCP. O MCP remoto em `https://docs.pluggy.ai/mcp` é opcional e fornece busca em documentação e, quando autenticado, acesso à API/conta; por envolver dados financeiros, só deveria ser habilitado após revisão de escopo, autenticação e minimização de dados. [Fonte: MCP oficial](https://docs.pluggy.ai/docs/mcp)

## 3. Como tornar atualizações e sincronizações mais rápidas

### 3.1 O que depende da Pluggy e da instituição

No fluxo gratuito, a conexão da aplicação é um proxy sobre a conexão original mantida pelo Meu Pluggy e a promessa publicada é **atualização diária**. A página comercial ainda afirma que o Conector 200 não oferece webhooks. Não há, nas fontes consultadas, compromisso de atualização em tempo real nem garantia de que atualizar o Item proxy force uma coleta nova na instituição. [Fonte: fluxo do Meu Pluggy](https://github.com/pluggyai/meu-pluggy) e [preços/FAQ](https://www.pluggy.ai/precos)

Em aplicações de produção pagas, o auto-sync roda a cada 24, 12 ou 8 horas conforme o plano. `nextAutoSyncAt` é apenas o instante mínimo e pode atrasar conforme a carga do conector/instituição. A Pluggy proíbe rotinas próprias em lote para forçar atualizações; o padrão suportado é auto-sync mais webhooks. [Fonte: Item e auto-sync](https://docs.pluggy.ai/docs/item)

No Open Finance regulado também existem limites externos por CPF/CNPJ + instituição + produto. Contas permitem 240 coletas mensais de transações recentes e 420 de saldo; cartão permite 240 de limite/transações recentes, mas faturas são coletadas no máximo uma vez ao dia e novos cartões/detalhes podem levar até sete dias. Criar múltiplos Items para a mesma combinação consome o limite mais rápido. [Fonte: limites operacionais do Open Finance](https://docs.pluggy.ai/docs/rate-limits-of)

Portanto, para o Conector 200, “atualizar mais vezes” no Brenotion não cria dados mais novos se o proxy ainda não foi renovado. A prova de conceito deve medir o `updatedAt`/`lastUpdatedAt` real por pelo menos um ciclo e comparar com a postagem no Itaú, exibindo a recência observada em vez de supor 24 horas exatas.

### 3.2 O que controlamos no Brenotion

Mesmo sem acelerar a origem, podemos reduzir bastante a latência **depois** que os dados aparecem na Pluggy:

1. **Buscar incrementalmente, não revarrer o histórico.** Persistir cursor/checkpoint e consultar só transações novas ou alteradas. A API pagina transações em blocos de 500 e a Pluggy recomenda esse tamanho. No gratuito, um job de leitura duas a quatro vezes por dia pode detectar rapidamente o novo snapshot sem fingir que acelera o upstream; ele não deve executar `PATCH /items` em lote. [Fonte: Transaction](https://docs.pluggy.ai/docs/transactions) e [Data sync](https://docs.pluggy.ai/docs/data-sync-update-an-item)
2. **Ingerir de forma idempotente.** Usar o ID da Pluggy como referência, mas suportar `delete + create`: a Pluggy tenta manter o ID por hash, porém mudanças relevantes de data, descrição ou valor podem gerar um ID novo. [Fonte: Transaction](https://docs.pluggy.ai/docs/transactions)
3. **Separar “receber” de “processar”.** Quando houver webhooks em um plano compatível, responder `2xx` em menos de 5 segundos, deduplicar por `eventId` e enfileirar a ingestão. A Pluggy pode entregar o mesmo evento até nove vezes. Para eventos de Item, buscar `GET /items/{id}` antes de processar; para transações, consumir `createdTransactionsLink`, buscar IDs alterados e remover IDs excluídos. [Fonte: Webhooks](https://docs.pluggy.ai/docs/webhooks) e [Transaction](https://docs.pluggy.ai/docs/transactions)
4. **Recalcular apenas o afetado.** Após upsert das Movimentações de Origem, recalcular o Ciclo Financeiro e o retrato dependente dessas movimentações, em vez de todo o histórico.
5. **Entregar o último retrato imediatamente.** A tela deve abrir com o snapshot persistido e `asOf`; a atualização roda em segundo plano. “Atualizando” não deve substituir nem mascarar a recência real.
6. **Reusar a API key no backend.** A API key expira em duas horas; cacheá-la até perto do vencimento evita autenticações redundantes. O limite é 360 chamadas/minuto para `/auth` e transações, e 20 `PATCH /items`/minuto por IP. Respeitar `RateLimit-Reset`/`Retry-After` em respostas 429. [Fonte: autenticação](https://docs.pluggy.ai/reference/auth) e [rate limits da API](https://docs.pluggy.ai/docs/rate-limits)
7. **Solicitar apenas produtos necessários.** Em integrações normais é possível definir `products` no Item/Connect Token; menos produtos reduzem processamento e consumo operacional. Para o primeiro spike, `ACCOUNTS` é suficiente para conta, cartão e transações; identidade, investimentos e empréstimos podem ficar fora até haver caso de uso. [Fonte: Item](https://docs.pluggy.ai/docs/item)
8. **Manter um único Item por banco/CPF.** Além de evitar duplicidade, isso protege os limites mensais do Open Finance. [Fonte: limites operacionais](https://docs.pluggy.ai/docs/rate-limits-of)

### 3.3 Experimento recomendado

Antes de implementar uma arquitetura ampla, fazer um spike mínimo com dados sanitizados e telemetria sem conteúdo financeiro:

- a cada consulta, registrar somente `itemId` pseudonimizado, status, `updatedAt`, `lastUpdatedAt` por produto, instante da consulta, contagem de transações e o maior `createdAt`/`date` observado;
- criar uma movimentação pequena e conhecida, sem registrar descrição/valor nos logs;
- medir tempo banco → Meu Pluggy, Meu Pluggy → API do Conector 200 e API → Convex → tela;
- repetir por sete dias, incluindo fim de semana;
- testar se `PATCH /items` no proxy altera efetivamente a origem ou apenas reprocessa o snapshot, sem automatizar chamadas repetidas;
- confirmar empiricamente se eventos webhook realmente não chegam no Conector 200, como declara a página de preços;
- usar `PARTIAL_SUCCESS` e `statusDetail.*.lastUpdatedAt` como dado de confiança, não tratar sucesso parcial como sincronização completa.

O resultado esperado é separar a latência inevitável do plano gratuito da latência que o Brenotion introduz. Se o atraso diário não sustentar o `Disponível para Gastar`, a alternativa realista não é polling agressivo: é manter o modo degradado/importação ou negociar um plano/arranjo comercial, hoje muito acima do teto de aproximadamente R$ 100/mês do projeto.

## Fontes primárias consultadas

- [Quick introduction](https://docs.pluggy.ai/docs/quick-pluggy-introduction)
- [Meu Pluggy — projeto e acesso para desenvolvedores](https://github.com/pluggyai/meu-pluggy)
- [Meu Pluggy — página do produto pessoal](https://www.pluggy.ai/meu-pluggy)
- [Planos e preços](https://www.pluggy.ai/precos)
- [Item e auto-sync](https://docs.pluggy.ai/docs/item)
- [Atualização de Item](https://docs.pluggy.ai/docs/data-sync-update-an-item)
- [Ciclo de vida de Item](https://docs.pluggy.ai/docs/item-lifecycle)
- [Webhooks](https://docs.pluggy.ai/docs/webhooks)
- [Transações e sincronização incremental](https://docs.pluggy.ai/docs/transactions)
- [Rate limits da API](https://docs.pluggy.ai/docs/rate-limits)
- [Limites operacionais do Open Finance](https://docs.pluggy.ai/docs/rate-limits-of)
- [Autenticação e tokens](https://docs.pluggy.ai/reference/auth)
- [Sandbox](https://docs.pluggy.ai/docs/sandbox)
- [Agent Skills](https://docs.pluggy.ai/docs/ai-skills)
- [Repositório das Agent Skills](https://github.com/pluggyai/agent-skills)
- [MCP oficial](https://docs.pluggy.ai/docs/mcp)
