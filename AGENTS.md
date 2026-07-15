# AGENTS.md

Este arquivo orienta agentes e colaboradores que trabalhem no Brenotion. Ele deve permanecer curto e apontar para as fontes de verdade, sem duplicar toda a especificação.

## Comunicação e idioma

- Converse com o Titular em português brasileiro.
- Escreva código, identificadores, nomes de arquivos de código, tipos, testes, logs, mensagens técnicas de erro e commits em inglês, seguindo as convenções do ecossistema usado.
- Textos visíveis no produto e termos apresentados ao Titular devem estar em português brasileiro e respeitar a linguagem definida em `CONTEXT.md`.
- A documentação do projeto pode permanecer em português brasileiro. Preserve o idioma e o estilo do documento que estiver sendo alterado.
- Não traduza literalmente conceitos do domínio para identificadores pouco idiomáticos. Escolha um nome técnico claro em inglês e mantenha a correspondência com o termo canônico de `CONTEXT.md` consistente.

## Leitura inicial e fontes de verdade

Antes de fazer mudanças, leia somente o contexto necessário para a tarefa:

- `README.md`: visão geral e estado atual.
- `CONTEXT.md`: linguagem canônica do domínio. Não crie sinônimos para conceitos já definidos.
- `docs/product-spec.md`: comportamento, limites e princípios do produto.
- `docs/architecture.md`: módulos, fluxos, modelo de dados e fronteiras arquiteturais.
- `docs/security.md`: classificação de dados, ameaças, controles e gates de produção.
- `docs/implementation-plan.md`: ordem de implementação, critérios de aceite e próxima ação.
- `docs/adr/`: decisões arquiteturais aceitas que não devem ser reabertas silenciosamente.
- `docs/references.md`: fontes externas e premissas que precisam ser revalidadas.

Em caso de divergência, sinalize-a antes de implementar. Uma decisão mais recente e explícita do Titular prevalece, mas a documentação afetada deve ser atualizada na mesma mudança para que a decisão não se perca.

## Estado e direção do projeto

- O projeto está em desenvolvimento incremental sobre uma aplicação universal Expo executável. Valide hipóteses dentro de fatias verticais pequenas; não transforme uma integração candidata em decisão definitiva antes de demonstrá-la de ponta a ponta e registrar limitações e fallback.
- A experiência principal é Android. A web começa como companion para upload e Cofre Fiscal, dentro de uma aplicação universal Expo Router.
- Convex é a fonte de verdade planejada para dados em nuvem. Clerk deve autenticar um único Titular com autorização também aplicada no backend.
- Pluggy é o primeiro candidato para integração financeira, ainda sujeito à prova de conceito de cobertura, recência, estabilidade, segurança e custo.
- O custo operacional recorrente desejado é de aproximadamente R$ 100 por mês; decisões de infraestrutura devem considerar esse limite.

## Invariantes do produto

- Saldo bancário não é sinônimo de `Disponível para Gastar`.
- Empresa e vida pessoal são patrimônios separados, mesmo quando uma conta paga uma despesa de outra natureza.
- Valores financeiros oficiais são calculados por regras determinísticas, testáveis e versionadas. IA interpreta resultados e propõe `Alterações de Plano`; não inventa números oficiais nem persiste mudanças sem confirmação do Titular.
- Dados desatualizados ou incompletos devem reduzir a confiança exibida. O produto nunca apresenta recência ou certeza que não possui.
- O MVP é somente leitura em relação às instituições financeiras. Ele não inicia Pix, transferências, pagamentos, investimentos ou emissão de NFS-e.
- Histórico financeiro fechado não é recalculado silenciosamente quando uma regra muda.
- Regras fiscais provisórias devem permanecer identificadas como provisórias até validação por fonte oficial ou contador.

## Princípios de implementação

- Concentre regras complexas em módulos profundos com interfaces pequenas, conforme `docs/architecture.md`.
- Mantenha fórmulas financeiras fora de telas, rotas, jobs, prompts e componentes de interface.
- Use valores decimais exatos para dinheiro e torne explícitas as regras de arredondamento, competência, vigência e fuso horário.
- Toda operação de ingestão ou sincronização deve ser idempotente, auditável e tolerante a reprocessamento sem duplicar movimentações.
- Crie uma seam apenas quando houver um adapter de produção e um adapter de teste, fallback ou alternativa real.
- Prefira fatias verticais pequenas. Cada mudança deve preservar um estado executável e verificável.
- Use TypeScript estrito e valide dados nas fronteiras externas. Não silencie incerteza com coerções de tipo ou defaults enganosos.
- Cubra cálculos e invariantes financeiros com testes de comportamento e regressão. Use dados sintéticos ou fixtures irreversivelmente sanitizadas.
- Respeite as convenções já estabelecidas pelas ferramentas do repositório quando o scaffold existir; não introduza uma segunda ferramenta para a mesma responsabilidade sem justificativa.

## Segurança e privacidade

- Nunca grave no repositório credenciais, tokens, CPF, CNPJ, dados bancários reais, números de conta, documentos financeiros brutos ou fixtures derivadas de dados reais sem sanitização comprovada.
- A autorização de proprietário único deve ser aplicada no backend; esconder conteúdo apenas na interface não é controle de acesso.
- Minimize os dados enviados a modelos de IA e nunca envie identificadores fiscais, bancários ou documentos brutos quando um retrato estruturado e sanitizado for suficiente.
- Não registre segredos ou dados financeiros sensíveis em logs, erros, analytics, snapshots ou fixtures.
- Extratos e faturas bancárias brutos são efêmeros: processe, valide e apague. Preserve apenas dados estruturados, hash e metadados de auditoria. Documentos fiscais seguem a política própria do Cofre Fiscal.
- Não use dados financeiros pessoais reais em protótipos, testes ou demonstrações.

## Manutenção do contexto

Ao concluir uma mudança relevante:

- atualize `CONTEXT.md` quando surgir ou mudar um termo do domínio;
- crie ou altere um ADR quando uma decisão arquitetural difícil de reverter for tomada;
- atualize a especificação quando o comportamento ou o perímetro do produto mudar;
- atualize arquitetura e segurança quando interfaces, fluxos de dados, controles ou classificação de dados mudarem;
- atualize o plano quando uma fatia aprovar ou rejeitar uma hipótese e registrar versão, custo ou limitação relevante;
- registre fontes e data de validação para regras fiscais, contábeis ou APIs sujeitas a mudança.

Não deixe decisões importantes existirem apenas na conversa, em comentários de código ou na memória de uma sessão.
