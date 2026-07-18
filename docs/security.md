# Segurança

## 1. Objetivo

Proteger dados bancários, fiscais e pessoais de um único Titular sem tornar o acesso diário impraticável. Segurança é aplicada no backend e no ciclo de vida dos dados; biometria e revisão de código são camadas adicionais, não substitutos de autorização.

## 2. Ativos sensíveis

- identidade e sessão do Titular;
- movimentações, saldos, faturas e categorias;
- documentos fiscais empresariais e pessoais;
- regras de orçamento, reservas e objetivos;
- CNPJ, CPF, contas, cartões e identificadores de conexão;
- tokens de integração financeira;
- chaves de OpenAI, Clerk, Convex e provedores futuros;
- pacotes exportados para o contador.

## 3. Ameaças prioritárias

| Ameaça | Controle principal |
|---|---|
| Outro usuário autenticado acessa dados | allowlist server-side e `ownerId` obrigatório |
| Token roubado no aparelho | armazenamento seguro, biometria local e revogação de sessão |
| Função backend sem autorização | helper central obrigatório e testes negativos |
| Arquivo malicioso ou falso | validação real de tipo, tamanho, hash e parser isolado |
| Documento bancário persiste além do necessário | política de área temporária e exclusão verificável |
| Dados sensíveis enviados à IA | minimização, redação, `store: false` e auditoria |
| Segredo commitido ou empacotado no cliente | variáveis exclusivas do backend e secret scanning |
| Entrada maliciosa altera histórico | validação, origem imutável, idempotência e trilha de auditoria |
| Gasto Informado duplica uma compra importada | estado provisório, correspondência explícita e conciliação idempotente |
| Print financeiro persiste além da extração | seleção deliberada, área temporária e exclusão verificável |
| Celular desbloqueado expõe dados | bloqueio biométrico após inatividade e ocultação no app switcher |
| Pacote fiscal compartilhado vaza | geração explícita, expiração local e orientação de canal seguro |

## 4. Identidade e autorização

- Clerk fornece a identidade; Google é o login principal.
- A primeira prova usa a interface pronta do Clerk: `AuthView` nativo beta no Android e `SignIn` na web. O Android não depende de callback browser-based; a web mantém o fluxo dentro do componente oficial.
- A conta Google deve manter segundo fator ou passkey.
- O backend aceita somente o Clerk User ID configurado na allowlist.
- O emissor Clerk e o Clerk User ID autorizado são variáveis exclusivas do deployment Convex; nenhum deles é aceito como argumento vindo do cliente.
- A consulta de prova usa um helper central que falha fechada para identidade ausente, allowlist ausente ou identidade diferente e devolve somente o estado autorizado, nunca o identificador real.
- Toda função pública valida sessão e `ownerId`; confiar apenas no cliente é proibido.
- Registros já nascem associados ao Titular.
- Expansão para mais usuários exige revisão de autorização, não apenas remoção da allowlist.
- Operações sensíveis podem exigir autenticação recente.

## 5. Segurança no Android

- Tokens em `SecureStore` ou mecanismo equivalente suportado pela plataforma.
- O cliente usa o `tokenCache` oficial do Clerk apoiado por `expo-secure-store` no Android e não registra nem persiste tokens por conta própria.
- Biometria como desbloqueio cotidiano depois da primeira autenticação.
- Bloqueio após período de inatividade configurável.
- Conteúdo oculto na visualização de aplicativos recentes quando viável.
- Logs locais não incluem valores, documentos ou identificadores completos.
- APK distribuído de forma privada e assinado pelo processo EAS.

## 6. Segredos

- Chaves privadas existem apenas em variáveis do backend.
- Nenhuma chave administrativa usa prefixo público ou entra no bundle Expo.
- Ambientes de desenvolvimento e produção usam credenciais distintas.
- Rotação é documentada e testada antes da produção.
- `.env.example` contém somente nomes e descrições, nunca valores reais.
- A Publishable Key do Clerk é configuração pública do cliente, não recebe valor padrão e fica apenas no `.env` local ou no ambiente de build; chaves secretas continuam exclusivas do backend.
- O export web é verificado contra os valores backend-only presentes no ambiente local; a prova de 15 de julho de 2026 não encontrou esses valores no bundle.
- Secret scanning e push protection nativos do GitHub devem ser habilitados quando disponíveis; o Gitleaks permanece no CI como controle independente.

## 7. Entrada de dados financeiros

- O MVP recebe dados detalhados apenas por arquivos do Itaú PF escolhidos explicitamente pelo Titular e por Gastos Informados.
- O produto não armazena senha bancária, automatiza login ou inicia qualquer ação financeira.
- O Android não solicita acesso para ler notificações de outros aplicativos.
- Um texto ou print só entra quando o Titular o compartilha deliberadamente com o Brenotion.
- Prints são tratados como arquivos bancários temporários: validar, extrair, apresentar prévia, confirmar e apagar.
- A extração de imagem deve ocorrer no aparelho quando a qualidade for suficiente; processamento no backend exige minimização e exclusão verificável.
- Gastos Informados permanecem provisórios até conciliação com uma Movimentação de Origem importada.
- O Resumo Empresarial persiste somente os agregados necessários ao planejamento e preserva a separação entre Empresa e Pessoal.
- A Action de diagnóstico Pluggy e suas credenciais pertencem a um spike descontinuado; enquanto existirem, continuam exclusivas do backend e sem acesso ao Livro Financeiro. A limpeza deve remover a Action, revogar o consentimento e apagar as credenciais em uma mudança operacional explícita.
- Uma integração financeira futura deve usar consentimento delegado, modo somente leitura e tokens exclusivos do backend.

## 8. Ciclo de vida de arquivos

### 8.1 Extratos e faturas bancárias

1. Upload para área temporária.
2. Verificação de tipo, tamanho e hash.
3. Extração para prévia.
4. Confirmação ou rejeição do Lote de Importação.
5. Exclusão do original.
6. Registro do resultado da exclusão na auditoria.

Somente dados estruturados, hash e metadados de importação permanecem.

Prints usados para criar Gastos Informados seguem o mesmo ciclo, mas preservam
somente o registro estruturado confirmado e os metadados mínimos de auditoria.

### 8.2 Documentos fiscais

NFS-e, DAS, comprovantes, informes e relatórios podem permanecer no Cofre Fiscal. Retenção é configurável por tipo e deve permitir exportação e exclusão explícita.

### 8.3 Arquivos rejeitados

Arquivos inválidos ou não processáveis são apagados rapidamente e não entram em backup.

## 9. IA e privacidade

- A IA recebe apenas o necessário para a pergunta atual.
- CPF, CNPJ, conta, agência, cartão, endereço e credenciais são removidos ou substituídos por IDs opacos.
- Documentos brutos não são enviados automaticamente.
- O contexto enviado é registrado em forma resumida e sanitizada.
- Chamadas usam `store: false` quando suportado.
- Respostas passam por validação estrutural antes da apresentação.
- Prompt injection em texto de transação ou documento é tratado como dado, nunca como instrução.
- A IA não executa ações financeiras nem chama diretamente adapters bancários.

## 10. Criptografia e transporte

- Todo tráfego externo usa TLS.
- Dados em nuvem usam a criptografia em repouso fornecida pelos provedores selecionados.
- Cache local sensível usa armazenamento protegido pela plataforma.
- Exportações fiscais são temporárias e devem ser removíveis.
- Se os controles nativos do provedor não forem suficientes para um tipo de documento, criptografia adicional no nível da aplicação será avaliada antes de armazená-lo.

## 11. Auditoria

Registrar, sem duplicar conteúdo sensível:

- autenticação e revogação;
- upload, validação e exclusão de arquivo;
- confirmação de Lote de Importação;
- criação, correção e conciliação de Gasto Informado;
- confirmação de Resumo Empresarial;
- criação e confirmação de Alteração de Plano;
- mudança de Regra Fiscal ou de Classificação;
- exportação de pacote fiscal;
- ação administrativa ou falha de autorização.

Eventos de auditoria são append-only e usam IDs, não payloads completos.

## 12. Backup, exportação e recuperação

- Dados estruturados e documentos fiscais exigem estratégia de backup antes da produção.
- Arquivos bancários temporários são excluídos do backup.
- O Titular deve conseguir exportar seus dados em formato legível.
- Recuperação é testada, não apenas configurada.
- Exclusão completa deve remover registros, documentos, tokens e caches derivados.

## 13. Desenvolvimento seguro

- Repositório GitHub público, limitado a código, documentação e dados sintéticos ou irreversivelmente sanitizados.
- Proteção de branch e PRs para mudanças relevantes.
- TypeScript estrito, lint, testes e verificação de dependências.
- Gitleaks em pull requests e pushes para `main`, independentemente das camadas nativas de secret scanning do GitHub.
- CodeRabbit auxilia revisão, mas não substitui revisão humana, testes ou threat modeling.
- Dependências são fixadas e atualizadas deliberadamente.
- Adapters externos recebem testes de contrato.
- Dados de teste são sintéticos ou irreversivelmente sanitizados.
- Nenhum PDF ou extrato real entra em fixtures commitadas.

## 14. Gates de produção

O produto não entra em uso diário confiável antes de:

- autorização negativa estar testada;
- backup e recuperação serem exercitados;
- exclusão de arquivos bancários ser verificável;
- toda entrada financeira permanecer somente leitura e sem credenciais bancárias;
- acesso a notificações de outros aplicativos permanecer ausente;
- tela distinguir fechamento confirmado, Gasto Informado e estimativa do ciclo;
- conciliação impedir dupla contagem entre registro provisório e importação;
- segredos estarem ausentes do bundle e do repositório;
- cálculos financeiros críticos terem regressões automatizadas;
- logs de produção passarem por revisão de dados sensíveis.
