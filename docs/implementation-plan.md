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
- recência e confiança honestas antes de chamar a experiência de MVP de revisão.

## 2. Estados de entrega

### Base executável

Aplicação universal abre em Android e web, possui qualidade automatizada e
oferece telas navegáveis com dados sintéticos. Ainda não sustenta decisões
financeiras reais.

### Alpha histórica

Importa arquivos, classifica o histórico, calcula bases e permite revisar o
modelo financeiro. Não apresenta o Disponível para Gastar como atualizado
durante o mês.

### MVP de revisão

Sincroniza conta e cartão com recência conhecida, reconcilia obrigações e
sustenta revisões semanais ou mensais e decisões relevantes com confiança explícita.

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
5. [ ] Negar leitura e escrita server-side para qualquer outra identidade. A consulta mínima já nega leitura; o mesmo helper deve proteger cada mutation quando escritas forem introduzidas.
6. [ ] Adicionar `ownerId` aos registros persistidos.
7. [x] Criar sessão fake somente para testes automatizados.
8. [ ] Provar upload temporário, hash e exclusão verificável.
9. [ ] Adicionar biometria Android para desbloqueio cotidiano.
10. [x] Verificar que segredos não aparecem no bundle da fatia atual.

### Critérios de aceite

- sessão não autorizada não lê nem escreve dados;
- falhas negativas de autorização possuem testes;
- arquivo bancário bruto é apagado e a exclusão é auditável;
- nenhuma credencial entra no Git, bundle, log ou fixture.

Checkpoint inicial de 15 de julho de 2026: `@clerk/expo` `3.7.6`, `@clerk/localizations` `4.13.4` e `expo-secure-store` `57.0.1` foram integrados pela cadeia compatível com Expo SDK 57. O callback browser-based anterior apontava para uma rota inexistente e produzia `Unmatched Route`; a adoção de `AuthView` no Android e `SignIn` na web removeu esse callback e também dispensou `expo-auth-session` no código atual. Login Google, gate da tela Início e saída foram validados de ponta a ponta na web e no Android; no aparelho, o Titular também confirmou a persistência da sessão após fechar e reabrir a Development Build versionCode 2. Nesse checkpoint inicial, o Convex ainda não havia sido iniciado. `npm audit --omit=dev` reportou 23 avisos moderados, nenhum alto ou crítico e nenhum reparo compatível direto; os avisos vêm principalmente do grafo transitivo de wallets/Solana incluído por `@clerk/clerk-js` e devem ser reavaliados nas atualizações do Clerk.

Checkpoint de backend de 15 de julho de 2026: o projeto Convex de desenvolvimento foi criado e `convex` `1.42.2` implantou `auth.config.ts` com a integração Clerk ativada. `ConvexProviderWithClerk` compõe o cliente; `requireAuthorizedOwner` aplica no backend a allowlist de um único Clerk User ID configurado no deployment; e `access.verifyOwner` é consumida antes de montar a aplicação interna. `convex-test` cobre identidade ausente, allowlist ausente, identidade sintética diferente e Titular sintético autorizado. A chamada real sem identidade também foi negada com `AUTHENTICATION_REQUIRED`, enquanto o Titular confirmou no Android que sua sessão real autorizada atravessou o gate e abriu a tela Início. TypeScript, lint, testes, estilos Android, bundle Android, export web e os 20 checks do Expo Doctor passaram; valores backend-only locais não apareceram no bundle web. Nenhum registro financeiro foi criado, o retrato da tela Início permanece sintético em memória e mutations com `ownerId`, upload e OFX continuam posteriores.

## 6. Fase 3 — Importação histórica e calibração

### Ordem de formatos

1. OFX;
2. CSV;
3. PDF de fatura;
4. PDF de extrato como fallback.

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
- separar transferências internas de receitas e despesas;
- marcar despesas empresariais, mistas e pessoais.

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
- Fechamento Mensal e preservação histórica.

### Regressões obrigatórias

- horas extras não aumentam consumo automaticamente;
- compra no cartão reduz disponibilidade na data da compra;
- parcelamento compromete ciclos futuros;
- pagamento da fatura não duplica despesa;
- Itaú PJ → Itaú PF vira retirada, não despesa;
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
- proposta de base essencial;
- progresso simulado das reservas;
- central de obrigações;
- Início com rótulo explícito de dados não sincronizados.

O Titular deve conseguir explicar os 12 meses por categorias e ciclos, com
lacunas e incertezas visíveis.

## 9. Fase 6 — Sincronização e MVP de revisão

### Fatia vertical

1. Sincronizar conta ou cartão.
2. Ingerir Movimentação de Origem de forma idempotente.
3. Classificar.
4. Reconciliar Obrigação.
5. Recalcular Plano Financeiro.
6. Atualizar a tela Início.
7. Gerar alerta somente se necessário.

### Critérios de aceite

- última sincronização sempre visível;
- atraso conhecido nunca aparece como certeza;
- pagamentos identificados concluem obrigações;
- compras atualizam disponibilidade sem dupla contagem;
- ações financeiras continuam manuais;
- revisão semanal cabe em aproximadamente cinco minutos.

## 10. Trilha contínua — Integração financeira

Pluggy permanece o primeiro candidato, não uma decisão definitiva. A validação
acontece em paralelo ao aplicativo e só bloqueia o MVP de revisão.

Decisão de perímetro registrada em 16 de julho de 2026: a integração automática
inicial fica limitada ao Itaú PF e ao cartão associado. Itaú PJ, Wise Business e
Wise Pessoal permanecem fontes futuras; enquanto seus fluxos forem previsíveis e
de baixo volume, entradas manuais explícitas são aceitáveis.

### Estado e cenários

- [x] criar conta, Team e Application `Brenotion Spike` no Pluggy Dashboard;
- [x] validar sandbox com conta, cartão e movimentações sintéticas;
- [x] conectar Itaú PF pelo Meu Pluggy com consentimento delegado e somente leitura;
- [x] validar a API real da Development Application: `GET /items` devolve `401` porque listagem foi desabilitada por segurança; `GET /items/{itemId}` e `GET /accounts?itemId=...` devolveram `200` em 16 de julho de 2026, com Item `UPDATED`/`SUCCESS`, uma conta bancária e um cartão, sem leitura de transações;
- [x] implementar uma Action Convex autorizada que reduz Item e contas a metadados sanitizados de cobertura e recência, com testes sintéticos e sem persistência;
- [x] validar a Action de ponta a ponta no Android autenticado em 16 de julho de 2026, após alinhar o Item ativo à mesma Pluggy Application das credenciais; o card exibiu `Conexão pronta` apenas com conector, recência e contagens sanitizadas, sem saldos, transações ou identificadores; após a revisão do PR, o diagnóstico passou a incluir a expiração do consentimento e a exigir atualização em até 48 horas e cobertura de conta bancária e cartão para o estado pronto;
- [ ] observar compras do cartão e Pix do Itaú PF durante um ciclo;
- [ ] obter cartão, fatura, fechamento e vencimento;
- [ ] medir histórico realmente retornado;
- [ ] confirmar IDs estáveis e deduplicação após ressincronização;
- [ ] identificar parcelas futuras;
- [ ] testar leitura sob demanda, expiração e reconexão no Conector 200;
- [ ] registrar limites do plano gratuito e custo mensal total.

Próxima ação: observar a recência de compras do cartão e Pix do Itaú PF durante
um ciclo e então adicionar uma leitura paginada e idempotente de movimentações,
sem persistir respostas brutas nem registrar conteúdo financeiro em logs.

### Gate para MVP de revisão

| Critério | Exigência |
|---|---|
| Itaú PF | contas, Pix e movimentações confiáveis |
| Cartão | compras, fatura e pagamento reconhecíveis |
| Recência | conhecida e suficiente no momento da revisão ou decisão |
| Idempotência | ressincronização não cria duplicatas |
| Segurança | consentimento delegado e modo somente leitura |
| Custo | total recorrente próximo ou abaixo de R$ 100/mês |
| Esforço manual | nenhuma digitação recorrente de compras ou Pix do Itaú PF; demais fontes podem ser explícitas e manuais |

Se o adapter falhar, a aplicação continua pela importação histórica ou modo
degradado e nunca finge recência que não possui.

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
5. [ ] Implementar a fatia de autenticação e backend.
6. [ ] Implementar o primeiro Lote de Importação OFX.
7. [ ] Construir o núcleo determinístico por regressões.

Advisor amplo, Cofre Fiscal e NFS-e assistida continuam posteriores ao valor
financeiro principal; não bloqueiam um aplicativo útil e evolutivo.
