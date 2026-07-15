# Plano de Implementação

## 1. Estratégia

Construir por fatias verticais pequenas, começando pelos riscos que podem invalidar o produto. A interface usa dados simulados até a integração financeira comprovar cobertura e custo; a versão histórica pode existir como alpha, mas o uso diário só é chamado de MVP quando a recência dos dados for confiável.

## 2. Estados de entrega

### Protótipo

Valida uma decisão isolada e pode ser descartado. Não recebe dados reais permanentes.

### Alpha histórica

Importa arquivos, classifica o histórico, calcula bases e permite revisar o modelo financeiro. Não apresenta o Disponível para Gastar como atualizado durante o mês.

### MVP diário

Sincroniza contas e cartão com recência conhecida, reconcilia obrigações e sustenta o acompanhamento cotidiano com confiança explícita.

### Produção pessoal

Adiciona hardening, backup testado, auditoria, distribuição privada estável e rotina de atualização.

## 3. Fase 0 — Fundação do repositório

O GitHub não é necessário para esta documentação, mas deve existir antes de começar código que dependa de CI ou CodeRabbit.

### Ações

1. [x] Criar repositório GitHub privado.
2. [x] Inicializar Git local e fazer um commit exclusivo da documentação.
3. [x] Adicionar `.gitignore`, `.editorconfig`, licença privada e política de segredos.
4. [ ] Configurar branch principal protegida quando houver CI completo.
5. [ ] Configurar CodeRabbit somente depois dos primeiros checks automatizados.

### Critérios de aceite

- [x] nenhum identificador ou arquivo financeiro real identificado no histórico inicial;
- [x] documentação navegável a partir do README;
- [ ] secret scanning ativo em `main` — workflow Gitleaks validado no PR #1, ainda pendente de merge;
- [x] fluxo de PR documentado.

Enquanto o secret scanning nativo do GitHub não estiver disponível para o repositório privado, o gate é atendido por Gitleaks em todo pull request e push para `main`. O recurso nativo e o push protection devem ser adicionados como segunda camada se o plano do GitHub passar a oferecê-los.

## 4. Fase 1 — Spikes de risco

Antes dos spikes de interface, manter uma exploração visual leve e versionada em
[`docs/design`](./design/README.md). Ela deve mapear jornadas, registrar referências,
propor direções visuais com dados sintéticos e transformar decisões aprovadas em
tokens semânticos. A exploração não congela o produto: novas hipóteses podem ser
adicionadas, comparadas e substituídas sem quebrar a linguagem já confirmada.

### Gate visual anterior ao scaffold

- inventário inicial de telas e estados transversais;
- referências externas registradas com intenção, adaptação e risco de cópia;
- ao menos uma exploração estática das jornadas Android principais e do companion web;
- tokens candidatos para cor, tipografia, espaço, forma e elevação;
- componentes de domínio separados dos primitivos de interface;
- nenhuma imagem ou fixture contém dado financeiro pessoal real.

### Preparação das contas

- [x] criar conta, Team e Application `Brenotion Spike` no Pluggy Dashboard;
- [ ] validar o sandbox, os limites da assinatura gratuita, o acesso aos conectores live e o custo além desses limites;
- [ ] criar conta Expo para EAS Development Build e Internal Distribution no Android;
- [ ] criar conta Convex; o projeto será criado pelo scaffold ou por `npx convex dev`;
- [ ] criar conta e Application no Clerk para o spike de identidade;
- [ ] garantir acesso ao Google Cloud Console; criar o projeto e as credenciais OAuth somente depois de definir package name, redirect URI e certificado Android;
- [ ] confirmar acesso ativo e MFA nos Itaú PF/PJ e Wise Business/Pessoal existentes, sem registrar credenciais no projeto.

Google Play Console, Apple Developer Program e conta da OpenAI não são necessários para os spikes da Fase 1.

### 4.1 Integração financeira

Pluggy é o primeiro candidato, não uma decisão definitiva.

#### Cenários obrigatórios

- conectar Itaú PF;
- conectar Itaú PJ;
- obter cartão, fatura, fechamento e vencimento;
- verificar Wise Business e Wise Pessoal;
- medir o histórico realmente retornado;
- confirmar IDs estáveis e deduplicação após nova sincronização;
- identificar compras parceladas e parcelas futuras;
- testar atualização, webhook, expiração e reconexão;
- registrar custo mensal total para o uso pessoal pretendido;
- confirmar que nenhuma senha bancária chega ao backend do produto.

#### Gate de aprovação

| Critério | Exigência |
|---|---|
| Itaú PF | contas e movimentações confiáveis |
| Itaú PJ | contas e movimentações confiáveis |
| Cartão | compras, fatura e pagamento reconhecíveis |
| Wise | ao menos os recebimentos e transferências necessários |
| Recência | suficiente para o indicador diário |
| Idempotência | ressincronização não cria duplicatas |
| Segurança | consentimento delegado e modo somente leitura |
| Custo | total recorrente desejado próximo ou abaixo de R$ 100/mês |

Se falhar, avaliar outro adapter ou manter importação como modo degradado. O produto não finge recência que não possui.

### 4.2 Aplicação universal e UI

Criar um protótipo mínimo Android/web com:

- Expo Router na versão estável suportada no momento do scaffold;
- NativeWind v4 estável;
- React Native Reusables para Button, Card, Dialog, Select e Tabs;
- tema claro/escuro;
- navegação por teclado na web;
- leitor de tela e alvos de toque no Android;
- smoke test em build de desenvolvimento, não apenas Expo Go.

#### Gate de aprovação

- os cinco primitivos funcionam em Android e web;
- portais não quebram Dialog ou Select;
- tokens visuais são controláveis pelo projeto;
- código gerado pode ser testado e alterado sem depender de runtime remoto;
- componentes problemáticos são substituídos isoladamente, sem abandonar NativeWind.

### 4.3 Identidade, backend e arquivos

Provar:

- Google login com Clerk em Android e web;
- allowlist de um Clerk User ID no Convex;
- negação server-side para qualquer outra identidade;
- `ownerId` em registros;
- upload temporário, hash e exclusão verificável;
- biometria Android para desbloqueio cotidiano;
- segredos ausentes do bundle.

### Saída da Fase 1

Um relatório curto registra resultado, custo, limitações e decisão de cada spike. Somente adapters aprovados entram no produto.

## 5. Fase 2 — Scaffold de produção

### Ações

1. Criar a aplicação Expo Router TypeScript.
2. Adicionar Convex e Clerk.
3. Criar estrutura de módulos descrita em [Arquitetura](./architecture.md).
4. Ativar TypeScript estrito, lint e formatação.
5. Configurar testes unitários e de integração.
6. Configurar EAS Development Build e Internal Distribution.
7. Criar ambientes separados de desenvolvimento e produção.
8. Adicionar CI com lint, tipos, testes e verificação de segredos.

### Primeiro conjunto de commits

1. `docs: record product and architecture decisions`
2. `chore: scaffold universal expo application`
3. `chore: add strict quality gates`
4. `feat: enforce single-owner authentication`
5. `test: verify backend authorization failures`

### Critérios de aceite

- Android e web iniciam a partir do mesmo projeto;
- sessão não autorizada não lê nem escreve dados;
- build Android privado instalável;
- CI verde sem segredos;
- nenhum cálculo financeiro existe em rota ou tela.

## 6. Fase 3 — Importação histórica e calibração

### Ordem de formatos

1. OFX;
2. CSV;
3. PDF de fatura;
4. PDF de extrato como fallback.

### Fatia vertical

1. Fazer upload pelo companion web.
2. Criar Lote de Importação.
3. Exibir prévia, totais e erros.
4. Confirmar o lote.
5. Criar Movimentações de Origem imutáveis.
6. Apagar o arquivo bruto.
7. Auditar importação e exclusão.

### Classificação guiada

- normalizar estabelecimentos;
- agrupar descrições semelhantes;
- priorizar recorrência, valor e incerteza;
- confirmar regras em lote;
- reaplicar regras ao histórico;
- separar transferências internas de receitas e despesas;
- marcar despesas empresariais, mistas e pessoais.

### Critérios de aceite

- até 12 meses podem ser importados com lacunas explícitas;
- reimportar o mesmo arquivo não duplica movimentações;
- totais da prévia conferem com o arquivo sanitizado de teste;
- exclusão do bruto é verificável;
- uma correção cria regra reutilizável;
- nenhuma sugestão incerta é silenciosamente confirmada.

## 7. Fase 4 — Núcleo financeiro determinístico

Desenvolver esta fase guiada por testes de comportamento.

### Capacidades

- moeda decimal exata;
- calendário e competências;
- Ciclo Financeiro entre recebimentos;
- transferências internas e câmbio;
- fatura, pagamento e estorno;
- base essencial trimestral;
- Provisão de Obrigações;
- Margem de Imprevistos;
- Reserva Operacional, Familiar e em Dólar;
- ordem de financiamento 1 mês PJ → 1 mês pessoal → 20/80;
- Disponível para Gastar com `asOf` e confiança;
- fechamento mensal e preservação histórica.

### Casos de regressão obrigatórios

- recebimento maior por horas extras não aumenta consumo automaticamente;
- compra no cartão reduz disponibilidade na data da compra;
- parcelamento compromete os ciclos futuros;
- pagamento da fatura não duplica a despesa;
- transferência Itaú PJ → Itaú PF vira retirada, não despesa;
- transferência Wise Business → Wise Pessoal compõe a retirada;
- US$ 200 não reduzem a receita fiscal bruta;
- sobra da margem migra para reserva no fechamento;
- dados atrasados diminuem confiança e mudam a linguagem;
- mudança de regra não recalcula ciclos fechados.

### Critérios de aceite

- invariantes financeiros cobertos por testes;
- nenhuma fórmula depende de IA;
- resultados explicam entradas e descontos;
- arredondamento é explícito e repetível;
- fixtures reais são sanitizadas antes de entrar no repositório.

## 8. Fase 5 — Alpha histórica

### Telas

- onboarding e importação;
- revisão de categorias;
- visão histórica de receitas e despesas;
- proposta de base essencial;
- progresso simulado das reservas;
- central de obrigações gerada pelo histórico;
- indicador com rótulo explícito de dados não sincronizados.

### Critérios de aceite

- o Titular consegue explicar os 12 meses por categorias e ciclos;
- lacunas e incertezas são visíveis;
- a base essencial pode ser confirmada e versionada;
- o produto não chama o retrato histórico de informação diária segura.

## 9. Fase 6 — Sincronização e MVP diário

### Fatia vertical

1. Sincronizar conta/cartão.
2. Ingerir movimentação idempotente.
3. Classificar.
4. Reconciliar Obrigação.
5. Recalcular Plano Financeiro.
6. Atualizar a tela inicial.
7. Gerar alerta somente se necessário.

### Telas

- Disponível para Gastar;
- modo de organização do recebimento;
- cartão e parcelas futuras;
- central de obrigações;
- reservas e meses de autonomia;
- revisão semanal;
- fechamento mensal.

### Critérios de aceite

- data da última sincronização sempre visível;
- atraso conhecido nunca aparece como certeza;
- pagamentos detectados concluem obrigações automaticamente;
- compras atualizam disponibilidade sem dupla contagem;
- ações financeiras continuam manuais e são confirmadas pela sincronização;
- revisão semanal cabe em aproximadamente cinco minutos.

## 10. Fase 7 — Fiscal e Cofre

### Cofre

- áreas Empresa e Pessoal;
- upload web e Android;
- tipo, competência, hash e obrigação relacionada;
- busca e filtros;
- pacote exportável para contador;
- política de retenção por tipo.

### NFS-e assistida

- entrada ou detecção do valor bruto em USD;
- PTAX oficial de compra do último dia útil anterior, marcada como regra provisória;
- cálculo decimal e rastreável;
- descrição e campos copiáveis;
- Obrigação de emissão;
- upload e validação da nota emitida no PC;
- preservação da taxa e regra usadas.

### Pró-labore e distribuição

- salário mínimo versionado por competência;
- cálculo versionado do INSS;
- distribuição projetada e confirmação posterior;
- acompanhamento de obrigações declarativas e limites vigentes;
- nenhum ajuste fiscal autônomo pela IA.

### Critérios de aceite

- documento errado ou duplicado é sinalizado;
- NFS-e é comparada ao cálculo esperado;
- regra fiscal provisória aparece como tal;
- pacote fiscal não mistura Empresa e Pessoal;
- identificadores sensíveis não aparecem em logs.

## 11. Fase 8 — Advisor

### Ordem

1. Gerar contexto sanitizado a partir do retrato determinístico.
2. Implementar Luna para revisão semanal e perguntas rotineiras.
3. Implementar Terra para fechamento e decisões profundas.
4. Produzir cenários confortável, equilibrado e acelerado.
5. Representar recomendações como Alterações de Plano.
6. Exigir confirmação para qualquer alteração persistida.

### Critérios de aceite

- schema inválido não chega à interface;
- recomendação referencia apenas valores calculados pelo núcleo;
- contexto não contém identificadores proibidos;
- toda alteração mostra antes, depois e impacto;
- o Titular pode rejeitar sem efeitos colaterais;
- custo por análise é medido.

## 12. Fase 9 — Hardening e operação pessoal

### Ações

- testar backup e restauração;
- testar exclusão completa;
- revisar logs e métricas;
- exercitar rotação de segredos;
- validar permissões Android;
- revisar dependências e licenças;
- executar threat model final;
- produzir runbook de incidentes e recuperação;
- estabilizar canal EAS interno;
- configurar monitoramento de custo.

### Critérios de aceite

Todos os gates listados em [Segurança](./security.md) estão cumpridos e demonstrados.

## 13. Alvo das primeiras quatro semanas

O calendário depende do resultado dos spikes; é uma meta, não uma promessa de ignorar gates.

### Semana 1

- criar GitHub privado e scaffold mínimo;
- executar spike Pluggy;
- executar spike Expo/NativeWind/Reusables;
- provar Clerk + Convex + allowlist;
- decidir seguir, trocar adapter ou degradar escopo.

### Semana 2

- pipeline OFX/CSV;
- upload temporário e exclusão;
- Livro Financeiro básico;
- primeiras regras de classificação;
- tela histórica com dados sintéticos e sanitizados.

### Semana 3

- Planejador determinístico;
- base essencial e reservas;
- cartão, transferências e obrigações;
- onboarding de classificação em lote;
- primeiros dados históricos completos.

### Semana 4

- sincronização aprovada integrada;
- tela inicial e central de obrigações;
- revisão semanal e fechamento mínimo;
- APK interno;
- avaliação honesta: alpha histórica ou MVP diário.

Advisor completo, Cofre Fiscal amplo e NFS-e assistida podem continuar depois do primeiro mês sem bloquear o valor financeiro principal.

## 14. Backlog posterior

- web app completo;
- acesso seguro e temporário do contador;
- emissão de NFS-e por webservice após homologação;
- iniciação de pagamentos, somente após nova análise de risco;
- iOS e publicação em loja;
- expansão para esposa ou outros usuários;
- objetivos secundários mais sofisticados;
- importadores adicionais.

## 15. Métricas do produto

- porcentagem de movimentações classificadas sem intervenção;
- quantidade de correções por revisão semanal;
- recência média da sincronização;
- obrigações pagas sem atraso;
- diferença entre fatura projetada e fechada;
- precisão percebida do Disponível para Gastar;
- meses de autonomia acumulados;
- tempo gasto na revisão semanal e no fechamento;
- custo mensal de infraestrutura e IA;
- quantidade de alertas ignorados ou inúteis.

## 16. Próxima ação executável

Quando o Titular decidir começar a implementação:

1. [x] criar o repositório GitHub privado;
2. [x] inicializar Git neste diretório e fazer o commit da documentação;
3. [ ] fazer merge do PR #1 para ativar o Gitleaks em `main`;
4. [x] criar a conta Pluggy e a Application `Brenotion Spike`, sem compartilhar credenciais;
5. [ ] validar o sandbox e então conectar Itaú PF pelo Pluggy Connect com consentimento interativo do Titular;
6. [ ] abrir as demais contas necessárias sem compartilhar credenciais;
7. [ ] executar os demais cenários do spike financeiro;
8. [ ] registrar o relatório do spike antes de escolher o adapter definitivo.
