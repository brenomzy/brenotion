# Plano de Implementação

## 1. Estratégia

Construir o aplicativo real por fatias verticais pequenas e executáveis. Uma
tela pode começar com dados inteiramente sintéticos, desde que deixe explícita a
origem e não apresente um número simulado como financeiro oficial. A mesma tela é
então conectada ao backend, ao núcleo determinístico e aos adapters reais sem ser
descartada.

Spikes isolados não são pré-requisito para começar. Uma hipótese técnica é
validada dentro da menor fatia que realmente a usa. Se falhar, registrar a
limitação, manter o aplicativo executável e trocar o adapter ou ativar o fallback.

Continuam sendo gates obrigatórios:

- autorização do Titular aplicada no backend;
- ausência de segredos e dados financeiros reais no repositório;
- cálculos financeiros determinísticos, versionados e testados;
- ingestão idempotente e arquivos bancários brutos efêmeros;
- distinção explícita entre fechamento confirmado, registro provisório e estimativa;
- conciliação sem dupla contagem entre entrada manual e importação posterior.

### Direção aprovada em 19 de julho de 2026

O caminho de produto passa a ser um Brenotion mensal inteligente com três pontos
de entrada: Início, Checklist Mensal e Atualizar mês. O Titular não deve operar
Lotes de Importação, Ocorrências, conciliações, Fechamento parcial ou Ciclo
Financeiro para receber valor, e não existe rotina obrigatória de lançamentos
diários.

Esta direção sucede a cadência diária descrita em etapas anteriores sem apagar os
checkpoints históricos nem remover imediatamente capacidades já implementadas.
Gastos Informados permanecem compatíveis no backend, fora da navegação principal.
Categorias, sugestões de IA sanitizadas, resumo retrospectivo, registro do
Recebimento Empresarial e Plano Financeiro determinístico são próximas fatias;
não estão disponíveis no estado atual.

## 2. Estados de entrega

### Base executável

Aplicação universal abre em Android e web, possui qualidade automatizada e
oferece telas navegáveis com dados sintéticos. Ainda não sustenta decisões
financeiras reais.

### Alpha histórica

Atualiza uma competência pelas três fontes, aplica Regras de Classificação,
solicita somente exceções e produz um resumo retrospectivo com lacunas
explícitas. Não apresenta o Disponível para Gastar como atualizado durante o
mês.

### MVP de revisão

Fecha uma competência do Itaú por arquivos importados com Patrimônio de Origem,
mantém a Checklist Mensal, registra o Recebimento Empresarial e produz um Plano
Financeiro determinístico com confiança explícita. A rotina mensal não depende
de Gastos Informados ou Limites por Categoria atualizados diariamente.

### Produção pessoal

Adiciona hardening, backup testado, auditoria, distribuição privada estável e
rotina de atualização.

## 3. Fase 0 — Fundação do repositório

### Estado

1. [x] Criar repositório GitHub público, sem dados reais, credenciais ou documentos sensíveis.
2. [x] Inicializar Git e registrar a documentação inicial.
3. [x] Adicionar `.gitignore`, `.editorconfig`, licença privada e política de segredos.
4. [x] Ativar Gitleaks em `main` pelo PR #1.
5. [ ] Proteger a branch principal quando todos os checks de código existirem.
6. [ ] Configurar CodeRabbit depois dos primeiros checks completos.

## 4. Fase 1 — Base executável

O objetivo é ter o Brenotion instalado no Android e evoluir sobre telas reais,
sem esperar a conclusão das integrações financeiras.

### Aplicação e ambiente

1. [x] Criar e vincular o projeto EAS `@breno-daroz/brenotion`.
2. [x] Criar a aplicação Expo Router com TypeScript estrito na raiz.
3. [x] Configurar `expo-dev-client` e o perfil Android de distribuição interna.
4. [x] Instalar a primeira Development Build no celular e abrir o app via Metro.
5. [x] Construir a primeira tela Início ao adicionar NativeWind v4 e tokens semânticos.
6. [x] Usar Button e Card do React Native Reusables nessa tela.
7. [ ] Consultar a matriz de adoção do React Native Reusables em cada nova tela e incorporar Dialog, Select, Tabs ou outro primitivo somente quando o primeiro fluxo real exigir.
8. [ ] Evoluir tema escuro, teclado web, leitor de tela e alvos de toque junto das telas; a primeira fatia permanece explicitamente clara até a validação do dark mode.
9. [x] Validar os tokens NativeWind no Android com fallbacks sRGB e uma verificação automatizada de compilação nativa.
10. [x] Configurar CI com lint, tipos, estilos Android, export web, Expo Doctor e verificação de segredos.

### Primeira tela funcional

A tela Início nasce com um retrato sintético tipado e deve exibir:

- Disponível para Gastar com horizonte e `asOf`;
- confiança recente, parcial e desatualizada;
- separação visível entre Empresa e Pessoal;
- próxima Obrigação acionável;
- acesso a Plano, Revisar e Mais;
- estado vazio e erro recuperável.

Nenhuma fórmula financeira fica na tela. O valor sintético vem de um adapter em
memória com a mesma interface pequena que será consumida pelo backend.

Validação registrada em 15 de julho de 2026: o Titular confirmou no Android a
hierarquia visual, os cards, botões, cores semânticas e ícones depois do reinício
do Metro com cache limpo. A falha anterior era causada por tokens `oklch()`
descartados pelo runtime nativo; os fallbacks sRGB e `npm run check:styles`
passaram a proteger essa fronteira.

### Critérios de aceite

- Android e web iniciam a partir do mesmo projeto;
- alterações TypeScript aparecem no celular sem nova build nativa;
- navegação e estados principais são utilizáveis com dados sintéticos;
- a interface não chama dados simulados de sincronizados;
- TypeScript, lint, compilação de estilos Android, export web, Expo Doctor e Gitleaks passam.

## 5. Fase 2 — Acesso e backend

Implementar como segunda fatia vertical, usando uma tela real protegida.

### Ações

1. [x] Criar projeto Convex para desenvolvimento.
2. [x] Criar Application no Clerk.
3. [x] Implementar Google login em Android e web. A web usa o componente oficial `SignIn`; o Android usa o `AuthView` nativo beta. Login Google, cache seguro, gate da tela Início, persistência após reinício e saída de sessão foram validados no aparelho pelo Titular.
4. [x] Aplicar allowlist de um Clerk User ID no Convex.
5. [x] Negar leitura e escrita server-side para qualquer outra identidade.
6. [x] Adicionar `ownerId` aos registros persistidos.
7. [x] Criar sessão fake somente para testes automatizados.
8. [x] Provar upload temporário, hash e exclusão verificável.
9. [ ] Adicionar biometria Android para desbloqueio cotidiano.
10. [x] Verificar que segredos não aparecem no bundle da fatia atual.

### Critérios de aceite

- sessão não autorizada não lê nem escreve dados;
- falhas negativas de autorização possuem testes;
- arquivo bancário bruto é apagado e a exclusão é auditável;
- nenhuma credencial entra no Git, bundle, log ou fixture.

Checkpoint inicial de 15 de julho de 2026: `@clerk/expo` `3.7.6`, `@clerk/localizations` `4.13.4` e `expo-secure-store` `57.0.1` foram integrados pela cadeia compatível com Expo SDK 57. O callback browser-based anterior apontava para uma rota inexistente e produzia `Unmatched Route`; a adoção de `AuthView` no Android e `SignIn` na web removeu esse callback e também dispensou `expo-auth-session` no código atual. Login Google, gate da tela Início e saída foram validados de ponta a ponta na web e no Android; no aparelho, o Titular também confirmou a persistência da sessão após fechar e reabrir a Development Build versionCode 2. Nesse checkpoint inicial, o Convex ainda não havia sido iniciado. `npm audit --omit=dev` reportou 23 avisos moderados, nenhum alto ou crítico e nenhum reparo compatível direto; os avisos vêm principalmente do grafo transitivo de wallets/Solana incluído por `@clerk/clerk-js` e devem ser reavaliados nas atualizações do Clerk.

Checkpoint de backend de 15 de julho de 2026: o projeto Convex de desenvolvimento foi criado e `convex` `1.42.2` implantou `auth.config.ts` com a integração Clerk ativada. `ConvexProviderWithClerk` compõe o cliente; `requireAuthorizedOwner` aplica no backend a allowlist de um único Clerk User ID configurado no deployment; e `access.verifyOwner` é consumida antes de montar a aplicação interna. `convex-test` cobre identidade ausente, allowlist ausente, identidade sintética diferente e Titular sintético autorizado. A chamada real sem identidade também foi negada com `AUTHENTICATION_REQUIRED`, enquanto o Titular confirmou no Android que sua sessão real autorizada atravessou o gate e abriu a tela Início. TypeScript, lint, testes, estilos Android, bundle Android, export web e os 20 checks do Expo Doctor passaram; valores backend-only locais não apareceram no bundle web. Nenhum registro financeiro foi criado, o retrato da tela Início permanece sintético em memória e mutations com `ownerId`, upload e OFX continuam posteriores.

Checkpoint de persistência de 16 de julho de 2026: perfil e preferências do Titular e a fundação de um retrato financeiro futuro passaram a usar registros isolados por `ownerId`, sempre derivado de `requireAuthorizedOwner` e nunca aceito do cliente. Queries e mutations públicas validam argumentos e retornos, aplicam autorização no backend e usam índices com unicidade. Valores BRL são persistidos como `int64` na menor unidade, com moeda e unidade explícitas; writes usam upsert idempotente e auditoria sanitizada sem valores financeiros ou identificadores externos. Testes sintéticos cobrem identidade ausente, outra identidade, isolamento, idempotência e dinheiro exato. Nenhum seed foi criado e a interface continua desacoplada dessas tabelas nesta etapa.

Checkpoint de importação OFX de 17 de julho de 2026: a aplicação universal ganhou a rota protegida `/import`, com interface web específica baseada em componentes shadcn-style sobre Base UI e fallback informativo no Android. O backend cria intenções de upload do Titular com expiração de 15 minutos, valida tamanho, tipo, moeda, período, transações e centavos exatos, apaga o bruto antes de persistir ou devolver a prévia e mantém somente hash, metadados, entradas estruturadas e auditoria sanitizada. Confirmação cria Movimentações de Origem idempotentes; descarte remove as entradas da prévia; reimportações confirmadas não duplicam origem, e lotes descartados ou rejeitados podem ser reabertos. Fixtures inteiramente sintéticas cobrem autorização, parser, exclusão do Storage, rejeição, confirmação, descarte, limpeza de erro e reimportação. Os 24 testes, TypeScript, lint, NativeWind e export web passaram. O Expo Doctor ficou em 19/20 apenas pelo drift de patches do SDK 57 (`57.0.6` instalado versus `57.0.7` recomendado), sem regressão atribuída à fatia. A validação pós-login com o OFX real do Titular permanece como próximo passo local e o arquivo não deve entrar no repositório.

Checkpoint de validação real de 18 de julho de 2026: o Titular abriu o companion web autenticado, selecionou o OFX somente pelo input local, recebeu a prévia depois da exclusão do bruto e confirmou que período, quantidade de movimentações, créditos e débitos conferiam antes de confirmar o Lote de Importação. O formato real não exigiu ajuste adicional do parser e nenhum arquivo OFX entrou no repositório. A validação revelou e corrigiu três falhas de integração: `/import` precisava ficar fora do navegador de tabs, a configuração web de Geist precisava emitir `font-family` CSS em vez de `platformSelect(...)`, e `npx convex codegen` não substituía a publicação das funções no deployment dev, concluída com `npx convex dev --once`. Os 24 testes, TypeScript, lint, NativeWind, bundles Android e web e a chamada negativa real protegida por `AUTHENTICATION_REQUIRED` passaram depois dos ajustes.

Checkpoint de leitura real de 19 de julho de 2026: a tela Revisar deixou de usar
uma fila inteiramente sintética e passou a consultar Lotes de Importação
confirmados e suas Movimentações de Origem por queries Convex autorizadas,
paginadas e isoladas por Titular. A interface mostra período, totais,
duplicidades e movimentações persistidas, preservando o aviso de que importação
confirmada ainda não é classificação, conciliação ou Fechamento Mensal. A
fundação determinística de classificação também passou a normalizar e agrupar
descrições com explicação versionada, sem IA e sem confirmar categorias
silenciosamente. O catálogo inicial de categorias, a persistência da decisão de
classificação e o adapter da fatura XLSX continuam posteriores a este
checkpoint. Os patches recomendados do Expo SDK 57 foram alinhados e o Expo
Doctor voltou a 20/20.

Checkpoint de fatura XLSX de 19 de julho de 2026: o pipeline temporário passou
a aceitar a fatura do cartão Itaú PF com formato e conta de origem explícitos,
adapter Node isolado em `read-excel-file` `9.3.2`, versão do parser, hash e
idempotência preservados. Título, competência, vencimento, data original,
parcelas, compras, créditos/estornos e Liquidação do Cartão são persistidos de
forma estruturada; titularidade, nome, tipo e número do cartão são ignorados na
fronteira. O total é reconciliado em centavos sem o pagamento, com tolerância
somente para ruído binário anterior à conversão. Fixture inteiramente sintética,
testes de autorização/reprocessamento e uma amostra real efêmera passaram; o
companion web e a tela Revisar distinguem extrato de fatura. O deployment Convex
dev, 54 testes, tipos, lint, estilos, export web e Expo Doctor 20/20 passaram.
O parser `itau-credit-card-xlsx-v3` também aceita os títulos exportados pelo Itaú
para faturas abertas ou pagas, preservando as mesmas validações de competência,
vencimento, total e centavos exatos.

Checkpoint de configuração diária de 19 de julho de 2026: Obrigações genéricas
e Decisões de Classificação passaram a ter persistência Convex autorizada,
idempotente e auditável. A configuração não contém seed de dados pessoais,
separa Natureza Econômica de origem pagadora e restringe a decisão a Pessoal ou
Empresa. A alternativa Mista e sua política de rateio foram retiradas antes de
existirem Obrigações ou decisões com esse valor no deployment. A decisão de
revisão usa o agrupamento determinístico versionado e não antecipa categorias,
limites ou fórmulas oficiais. Revisar agora consulta e confirma Natureza
Econômica por grupo, exceto Liquidação do Cartão. Alterações materiais preservam
revisões imutáveis numeradas e auditáveis; reprocessamentos sem mudança não
produzem histórico artificial. A navegação Android mantém Revisar como ação
principal. Setenta e oito testes, tipos, lint e estilos passaram neste checkpoint.

Checkpoint de proveniência e Liquidação do Cartão de 19 de julho de 2026: novos
uploads OFX/XLSX passaram a exigir Patrimônio de Origem Pessoal ou Empresa antes
do envio, sem default e sem reclassificar lotes legados. A origem é propagada da
intenção às Movimentações de Origem e participa da chave idempotente versionada.
Uma relação nova preserva a conciliação confirmada entre o pagamento estruturado
da fatura e um débito bancário; candidatos exigem valor oposto exato, conta
bancária com origem explícita e distância máxima de sete dias. Revisar explica o
efeito e exige confirmação; após o vínculo, os dois lados ficam fora da decisão
de Natureza Econômica. O schema ampliado e as funções foram publicados no
Convex dev sem backfill, e a interface autenticada confirmou que nenhuma origem
vem pré-selecionada. A validação real do OFX Itaú Empresa permanece pendente da
seleção local do arquivo pelo Titular e deve parar na prévia antes de qualquer
confirmação.

Decisão de cadência de 19 de julho de 2026: como a conta da Empresa paga também
muitas Obrigações de Natureza Econômica Pessoal, o OFX do Itaú Empresa deixa de
ser uma entrada apenas seletiva e passa a integrar todo ciclo mensal normal ao
lado do OFX do Itaú Pessoal e da fatura. O fluxo acompanha a cobertura das três
fontes sem fundir Patrimônios de Origem nem inferir Natureza Econômica pela conta
pagadora. Esta decisão atualiza o plano; não confirma novos lotes, classificações
ou conciliações.

Checkpoint de cobertura mensal de 19 de julho de 2026: uma query Convex
autorizada deriva, de uma busca recente limitada e sinalizada, os estados ausente,
prévia ou confirmado para Itaú Pessoal, fatura e Itaú Empresa em uma competência.
O companion web exibe as três entradas, permite alternar o mês, abre Revisar e
guia o upload sem pré-selecionar Patrimônio de Origem. A função foi publicada no
deployment dev e validada na sessão autenticada com os lotes já existentes, sem
novos uploads, confirmações ou decisões financeiras.

Checkpoint da interface de Obrigações de 19 de julho de 2026: a rota universal
`/obligations`, acessível por Mais, passou a listar configurações recorrentes e
oferecer criação, edição, desativação e reativação sobre o backend auditável já
existente. O formulário mantém `obligationKey` técnica e estável, trata valor e
vencimento como opcionais e exige Natureza Econômica e origem pagadora em escolhas
independentes. O estado vazio e a validação foram conferidos no companion web sem
salvar dados pessoais. A fatia não materializa Ocorrências de Obrigação, não
concilia pagamentos e não inicia transações financeiras.

Checkpoint operacional de 19 de julho de 2026: o caminho normal do Início deixou
de consumir o retrato sintético e passou a consultar cobertura, revisão,
Obrigações e Fechamento no Convex. Cenários sintéticos permanecem somente por
parâmetro explícito de desenvolvimento. A tela omite quantias enquanto não há
cálculo oficial e orienta a próxima ação entre importar, revisar, configurar
Obrigações e abrir o Fechamento.

Checkpoint de Ocorrências e Fechamento de 19 de julho de 2026: Obrigações ativas
podem ser materializadas de forma idempotente por competência. Cada ocorrência
preserva o snapshot da configuração daquele mês; conclusão manual, dispensa,
atenção e reabertura são explícitas e auditáveis. O Fechamento Mensal inicial é
append-only, versionado e baseado em fingerprint. Ele registra cobertura,
Ocorrências e lacunas reconhecidas sob a política `metadata-only-partial-v1`,
mas mantém o cálculo financeiro indisponível e nunca confunde conclusão manual
com Pagamento Identificado.

Checkpoint de Ciclo atual de 19 de julho de 2026: um Ciclo Financeiro pode ser
aberto explicitamente com datas próprias. Gastos Informados são persistidos em
centavos exatos, revisáveis e anuláveis; candidatos de conciliação usam valor
oposto exato, janela de sete dias e Patrimônio de Origem compatível. A confirmação
é um vínculo auditável um-para-um e exclui Liquidações do Cartão. Sem categorias,
Plano ou Limites, a interface declara que o impacto financeiro ainda não foi
calculado.

Checkpoint de remoção dos placeholders operacionais de 19 de julho de 2026:
Início, Plano e Mais passaram a usar somente fontes reais no caminho normal.
Plano mostra datas do ciclo e contagens de Gastos Informados, sem somar ou exibir
quantias como se houvesse cálculo financeiro; Mais contém apenas navegação e
configurações reais. Cenários sintéticos permanecem acessíveis somente por
parâmetro explícito de desenvolvimento.

Validação integrada deste estado: 33 arquivos e 141 testes passaram, junto com
TypeScript, lint, verificação de estilos NativeWind, export web e bundle Android.

## 6. Fase 3 — Importação histórica e calibração

### Ordem de formatos

1. OFX de extrato;
2. XLSX de fatura;
3. CSV como fallback;
4. PDF de fatura;
5. PDF de extrato como fallback.

O perímetro detalhado aceita OFX do Itaú Pessoal ou Empresa e a fatura do cartão
associado, sempre com Patrimônio de Origem explícito nos novos lotes. Wise não
entra por arquivo nesta fase.

### Primeira fatia

1. Enviar arquivo pelo companion web.
2. Criar Lote de Importação.
3. Exibir prévia, totais, erros e duplicidades.
4. Confirmar ou descartar o lote.
5. Criar Movimentações de Origem imutáveis.
6. Apagar o arquivo bruto.
7. Auditar importação e exclusão.

### Evolução

- normalizar estabelecimentos;
- agrupar descrições semelhantes;
- confirmar classificações em lote;
- reaplicar Regras de Classificação ao histórico;
- propor Limites por Categoria a partir do histórico confirmado;
- separar transferências internas de receitas e despesas;
- marcar despesas empresariais e pessoais.

### Critérios de aceite

- até 12 meses podem ser importados com lacunas explícitas;
- reimportar o mesmo arquivo não duplica movimentações;
- totais conferem com fixtures sintéticas;
- exclusão do bruto é verificável;
- nenhuma sugestão incerta é confirmada silenciosamente.

## 7. Fase 4 — Núcleo financeiro determinístico

Desenvolver guiado por testes de comportamento, sem acoplar fórmulas às telas.

### Capacidades

- moeda decimal exata;
- calendário, competência e Ciclo Financeiro;
- transferências internas e câmbio;
- fatura, pagamento, estorno e parcelas futuras;
- base essencial trimestral;
- Provisão de Obrigações e Margem de Imprevistos;
- Reserva Operacional, Familiar e em Dólar;
- ordem de financiamento 1 mês PJ → 1 mês pessoal → 20/80;
- Disponível para Gastar com `asOf` e confiança;
- Limite de Gasto do Ciclo e Limites por Categoria;
- impacto provisório de Gastos Informados;
- Resumo Empresarial integrado ao planejamento sem unificar patrimônios;
- Fechamento Mensal e preservação histórica.

### Regressões obrigatórias

- horas extras não aumentam consumo automaticamente;
- compra informada reduz o limite aplicável sem afirmar saldo atual;
- importação posterior concilia o Gasto Informado sem dupla contagem;
- parcelamento compromete ciclos futuros;
- pagamento da fatura não duplica despesa;
- Itaú PJ → Itaú PF vira retirada, não despesa;
- despesa pessoal paga pela Empresa conclui a obrigação pessoal sem virar automaticamente despesa empresarial;
- Wise Business → Wise Pessoal compõe retirada;
- US$ 200 não reduzem a receita fiscal bruta;
- sobra da margem migra para reserva no fechamento;
- atraso de dados diminui confiança;
- mudança de regra não recalcula ciclos fechados.

## 8. Fase 5 — Alpha histórica

Conectar o núcleo às telas já existentes:

- onboarding e importação;
- revisão de categorias;
- histórico de receitas e despesas;
- proposta e confirmação de Limites por Categoria;
- proposta de base essencial;
- progresso simulado das reservas;
- central de obrigações;
- Início com rótulo explícito de último fechamento confirmado.

O Titular deve conseguir explicar os 12 meses por categorias e ciclos, com
lacunas e incertezas visíveis.

## 9. Fase 6 — Brenotion mensal inteligente

### Fatia vertical

1. Reduzir a navegação principal a Início e Checklist Mensal, com Atualizar mês
   como ação de primeiro nível.
2. Apresentar Ocorrências de Obrigação como checklist simples, preservando
   conclusão informada, reabertura e auditoria.
3. Reunir cobertura, upload, revisão e conclusão da competência em Atualizar mês.
4. Aplicar Regras de Classificação confirmadas antes de consultar IA.
5. Enviar somente descrições desconhecidas e dados sanitizados ao modelo.
6. Confirmar exceções novas, ambíguas ou materiais e reutilizar a regra nos meses
   seguintes.
7. Gerar um resumo retrospectivo sobre totais e categorias determinísticos.
8. Registrar o Recebimento Empresarial com semântica canônica e criar o Plano
   Financeiro determinístico em uma fatia posterior à atualização mensal básica.

### Critérios de aceite

- Início mostra competência, recência, progresso da Checklist Mensal e uma única
  próxima ação sem inventar valores financeiros;
- o caminho principal não exige abrir Ciclo Financeiro nem registrar compras;
- preparar ou copiar a Checklist não duplica itens;
- marcar um item como concluído não cria um Pagamento Identificado;
- Atualizar mês preserva separadamente a cobertura das três fontes e pode ser
  retomado;
- reimportar o mesmo arquivo não cria duplicatas;
- classificações conhecidas não voltam para revisão sem motivo;
- sugestões incertas ou materiais não são confirmadas silenciosamente;
- o resumo da IA usa somente dados sanitizados e não calcula valores oficiais;
- dados antigos ou incompletos reduzem a confiança exibida;
- ações financeiras continuam manuais;
- a aplicação permanece executável após cada fatia.

### Checkpoint da primeira fatia de classificação por IA — 19 de julho de 2026

- taxonomia inicial com dez Categorias, independente de Patrimônio de Origem e
  Natureza Econômica;
- sanitização determinística bloqueia identificadores, transferências,
  liquidações e instruções adversariais antes do modelo;
- Regras de Classificação confirmadas são aplicadas antes da IA;
- sugestões, decisões confirmadas e memória determinística permanecem separadas,
  versionadas e auditáveis;
- confirmação, correção e abstenção estão integradas a Conferir atualização;
- adapter fake e fixtures totalmente sintéticas cobrem o fluxo ponta a ponta;
- adapter OpenAI usa Responses API, `store: false` e saída estruturada estrita;
- o eval sintético foi reexecutado em 19 de julho de 2026: `gpt-5.6-sol` e
  `gpt-5.6-luna` atingiram acurácia `1,00` e zero falsos positivos de baixa
  incerteza; `gpt-5.4-nano` atingiu `0,8333` e não passou;
- `gpt-5.6-luna` foi escolhido como o candidato mais barato aprovado, com custo
  observado de US$ 0,006301 para 1.279 tokens de entrada e 837 de saída, e foi
  configurado no deployment Convex de desenvolvimento;
- a fatura paga em julho passou a preservar esse mês como metadado da fonte e a
  completar a Competência dos Gastos do Cartão de junho, conforme ADR 0007;
- a primeira tentativa autenticada com as três fontes reais falhou fechada antes
  de criar o job com `TOO_MANY_CLASSIFICATION_GROUPS`, sem chamadas nem custo;
- a action passou a aceitar até 300 grupos por competência e dividir o trabalho
  em chamadas sequenciais de no máximo 40 grupos, com telemetria agregada e
  regressão sintética de 103 grupos em três chamadas;
- a reexecução real concluiu em `needs_review` com 145 grupos: 42 protegidos para
  revisão manual, 77 sugestões, 26 abstinências, zero rejeitados e zero grupos
  resolvidos por regra; Luna usou três chamadas, 7.910 tokens de entrada, 4.128
  de saída, 18.391 ms agregados e custo estimado de US$ 0,032678;
- as 145 decisões permanecem pendentes do Titular; nenhuma confirmação,
  correção, abstenção ou Regra de Classificação foi criada em seu nome;
- o resumo retrospectivo permanece posterior à aprovação do gate de classificação.

Próxima ação mínima: o Titular revisar explicitamente as 145 exceções de
`2026-06`; depois, repetir o processamento para medir quantos grupos são
resolvidos por regras e comprovar a redução de chamadas ao modelo.

Próximos refinamentos para a Revisão, aprovados para decisão posterior:

- dar aos grupos de `Revisão protegida` contexto suficiente dentro da interface
  autenticada — descrição parcialmente redigida, quantidade, período, direção,
  Patrimônio de Origem e acesso às Movimentações de Origem relacionadas — sem
  enviar esse conteúdo à IA;
- permitir que o Titular crie Categorias manualmente quando a taxonomia não
  representar a finalidade econômica, com identificador estável, descrição,
  renomeação e desativação sem apagar histórico;
- separar `Outros`, como escolha residual deliberada, de `Não classificado` ou
  `Não sei`, que não criam Regra de Classificação;
- versionar mudanças na taxonomia e reexecutar o eval antes de confiar em
  sugestões automáticas que usem Categorias novas ou alteradas.

## 10. Direção confirmada — Acesso a dados financeiros

Decisão inicialmente confirmada em 17 de julho de 2026 e refinada pelo Titular em
19 de julho de 2026: o MVP não depende de agregador financeiro. A ingestão
detalhada de cada ciclo mensal normal reúne o OFX do Itaú Pessoal, a fatura do
cartão associado e o OFX do Itaú Empresa; Wise Business e Wise Pessoal entram
apenas pelo Resumo Empresarial. Gastos Informados foram implementados como prova,
mas deixaram de integrar a cadência principal após a aprovação do Brenotion
mensal inteligente.

Empresa e Pessoal permanecem patrimônios distintos no Livro Financeiro. A
interface oferece uma visão mensal e de planejamento integrada ao Titular,
preservando Patrimônio de Origem, Natureza Econômica e tratamento contábil ainda
não confirmado. A conta que pagou não determina a Natureza Econômica.

O Brenotion não lê notificações de outros aplicativos e não exige captura diária
de compras.

### Evidências que encerraram o spike Pluggy

- [x] criar conta, Team e Application `Brenotion Spike` no Pluggy Dashboard;
- [x] validar sandbox com conta, cartão e movimentações sintéticas;
- [x] conectar Itaú PF pelo Meu Pluggy com consentimento delegado e somente leitura;
- [x] validar a API real da Development Application: `GET /items` devolve `401` porque listagem foi desabilitada por segurança; `GET /items/{itemId}` e `GET /accounts?itemId=...` devolveram `200` em 16 de julho de 2026, com Item `UPDATED`/`SUCCESS`, uma conta bancária e um cartão, sem leitura de transações;
- [x] implementar uma Action Convex autorizada que reduz Item e contas a metadados sanitizados de cobertura e recência, com testes sintéticos e sem persistência;
- [x] validar a Action de ponta a ponta no Android autenticado em 16 de julho de 2026, após alinhar o Item ativo à mesma Pluggy Application das credenciais; o card exibiu `Conexão pronta` apenas com conector, recência e contagens sanitizadas, sem saldos, transações ou identificadores; após a revisão do PR, o diagnóstico passou a incluir a expiração do consentimento e a exigir atualização em até 48 horas e cobertura de conta bancária e cartão para o estado pronto;
- [x] observar em 17 de julho de 2026 que os lançamentos mais recentes no Meu Pluggy ainda eram de 13 de julho, uma defasagem aproximada de quatro dias;
- [x] confirmar que o valor principal pode tolerar até um mês de atraso quando o Fechamento Mensal é confiável e o ciclo atual aceita registros seletivos;
- [x] retirar Pluggy do caminho crítico antes de implementar leitura e persistência de transações reais.

O spike permanece como evidência técnica, não como adapter aprovado. Em 17 de
julho de 2026, a limpeza removeu do aplicativo e do backend o card, a Action, o
cliente, os testes e a configuração versionada Pluggy, sem alterar autenticação
ou persistência. Após confirmação do Titular, as variáveis residuais foram
apagadas do deployment Convex. A API retornou `CLIENT_DISABLED`, e o portal Meu
Pluggy confirmou que não havia conexão nem app parceiro com acesso ativo para
revogar.

### Evidência sobre notificações Android

A captura por notificações Android foi descartada antes da concessão do acesso no
aparelho. Embora uma prova local com fixtures sintéticas tenha compilado e
executado, a permissão seria mais ampla que o perímetro do Itaú e dependeria de
controles aplicados pelo próprio aplicativo. O ganho potencial não justifica essa
superfície de acesso.

### Gate para MVP de revisão

| Critério | Exigência |
|---|---|
| Itaú Pessoal e cartão | entradas mensais importáveis com período e totais conferíveis |
| Itaú Empresa | entrada mensal OFX com Patrimônio de Origem explícito e prévia antes da confirmação |
| Classificação | regras confirmadas explicam o histórico material e só exceções retornam ao Titular |
| Resumo | IA recebe dados sanitizados e interpreta totais determinísticos sem inventar valores |
| Checklist | conclusão informada não é apresentada como Pagamento Identificado |
| Plano | Recebimento Empresarial e Plano determinístico entram após a experiência mensal básica |
| Conciliação | reimportação e reaplicação de regras não criam duplicatas |
| Empresa | Resumo Empresarial preserva a separação patrimonial |
| Segurança | arquivos efêmeros, nenhuma credencial bancária e nenhuma leitura de notificações |
| Custo | total recorrente próximo ou abaixo de R$ 100/mês |
| Esforço manual | uma atualização mensal e somente exceções de classificação |

Próxima ação: simplificar as rotas operacionais em Início, Checklist Mensal e
Atualizar mês usando as capacidades reais já persistidas. Depois, implementar
categorias e memória de classificação, sugestões sanitizadas de IA, resumo
retrospectivo, Recebimento Empresarial e Plano determinístico, nessa ordem.
Pagamento Identificado de Obrigações e reversão append-only de conciliações
permanecem posteriores. Qualquer novo arquivo bancário real permanece fora do
repositório.

## 11. Fases posteriores

### Fiscal e Cofre

- Cofre Fiscal separado entre Empresa e Pessoal;
- upload, hash, busca, filtros e pacote para contador;
- NFS-e assistida com PTAX e regra provisória explícita;
- pró-labore, INSS e distribuições versionadas;
- identificadores sensíveis ausentes de logs.

### Advisor

- contexto sanitizado produzido pelo retrato determinístico;
- Luna para rotina e Terra para decisões profundas;
- três cenários estruturados;
- Alterações de Plano com antes, proposta e impacto;
- confirmação obrigatória antes de persistir.

### Hardening

- backup e restauração testados;
- exclusão completa;
- revisão de logs e métricas;
- rotação de segredos;
- permissões Android;
- dependências e licenças;
- threat model final;
- runbook de incidentes;
- monitoramento de custo.

## 12. Ordem das próximas entregas

1. [x] Concluir e instalar a Development Build Android.
2. [x] Abrir a aplicação pelo Metro no celular e validar o Fast Refresh.
3. [x] Construir a tela Início com retrato sintético, tokens, NativeWind, Button e Card.
4. [x] Configurar os checks de código no CI.
5. [x] Implementar a fatia inicial de autenticação e backend.
6. [x] Remover o spike Pluggy do aplicativo e do backend.
7. [x] Implementar o primeiro Lote de Importação OFX com fixture sintética.
8. [x] Criar o primeiro Gasto Informado textual e sua conciliação como prova,
   depois retirado do caminho principal.
9. [ ] Simplificar a navegação e o Início em torno da competência e da próxima
   ação.
10. [ ] Transformar Obrigações e Ocorrências na Checklist Mensal.
11. [ ] Orquestrar cobertura, upload, exceções e conclusão em Atualizar mês.
12. [ ] Adicionar categorias e memória por Regras de Classificação confirmadas.
13. [ ] Adicionar sugestões de IA sanitizadas somente para exceções.
14. [ ] Gerar o resumo retrospectivo sobre totais determinísticos.
15. [ ] Registrar o Recebimento Empresarial e construir o Plano determinístico
    por regressões.
16. [ ] Adicionar o Resumo Empresarial mensal.

Advisor amplo, Limites por Categoria durante o ciclo, Cofre Fiscal e NFS-e
assistida continuam posteriores ao valor mensal principal; não bloqueiam um
aplicativo útil e evolutivo.
