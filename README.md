# Brenotion

Brenotion é um aplicativo financeiro pessoal e empresarial para um único
empreendedor brasileiro que presta serviços ao exterior. O produto mensal
inteligente transforma as três fontes do Itaú em um resumo do mês anterior, uma
Checklist Mensal e decisões práticas para o mês seguinte: quanto reservar,
quanto pode sair da Empresa e quais obrigações ainda exigem ação.

O projeto está em desenvolvimento incremental. A aplicação universal já possui um
scaffold Expo executável; cada nova capacidade entra como uma fatia vertical
pequena, primeiro com dados sintéticos e depois com adapters reais validados no
próprio fluxo do produto.

## Documentação

- [Orientações para agentes e colaboradores](./AGENTS.md)
- [Guia de contribuição](./CONTRIBUTING.md)
- [Política de segurança do repositório](./SECURITY.md)
- [Linguagem do domínio](./CONTEXT.md)
- [Especificação do produto](./docs/product-spec.md)
- [Arquitetura](./docs/architecture.md)
- [Segurança](./docs/security.md)
- [Plano de implementação](./docs/implementation-plan.md)
- [Ambiente de desenvolvimento](./docs/development.md)
- [Exploração visual e design system](./docs/design/README.md)
- [Referências](./docs/references.md)
- [Pesquisa da fundação de IA](./docs/research/ai-classification-foundation.md)
- [Decisões arquiteturais](./docs/adr/)

## Desenvolvimento

O código é desenvolvido em branches curtas e integrado por pull request. A versão
de cada dependência usada pela aplicação fica fixada no lockfile e só muda de forma
deliberada. Integrações externas continuam candidatas até funcionarem de ponta a
ponta em uma fatia real, com fallback explícito quando necessário.

Copie `.env.example` para `.env` apenas quando uma fatia ou adapter exigir
configuração local. Nunca registre valores reais no Git.

## Estado atual

- Plataforma principal: Android.
- Companion web inicial: upload e cofre documental.
- Direção de produto aprovada: Início, Checklist Mensal e Atualizar mês formam o
  caminho principal. O uso cotidiano se limita à checklist; não existe rotina
  obrigatória de lançamentos diários. A primeira simplificação dessas rotas já
  está implementada.
- Fonte de verdade operacional: Convex, com importações, revisão, Obrigações,
  Ocorrências de Obrigação, Fechamentos Mensais parciais, Ciclos Financeiros e
  Gastos Informados persistidos e isolados por Titular. O Início normal consulta
  esse estado real e omite quantias enquanto o núcleo financeiro ainda não puder
  produzir um retrato oficial.
- Autenticação em integração: interface pronta do Clerk com `AuthView` nativo no Android, `SignIn` na web e sessão Android em armazenamento seguro; o Convex valida o JWT e aplica a allowlist server-side antes de liberar a aplicação.
- Interface: Expo Router, NativeWind 4.2.6, tema inicial claro, tokens semânticos com fallbacks nativos e Button/Card adaptados do React Native Reusables na primeira tela Início.
- Entrada financeira: o ciclo mensal normal reúne o OFX do Itaú Pessoal, o XLSX
  da fatura e o OFX do Itaú Empresa, sempre com Patrimônio de Origem explícito
  nos novos lotes. Uma Obrigação paga pela Empresa pode manter Natureza Econômica
  Pessoal. A Liquidação do Cartão pode ser conciliada com um débito bancário por
  confirmação auditável. O companion web mostra a cobertura das três entradas por
  competência; na fatura, preserva o mês de pagamento e associa os gastos ao mês
  imediatamente anterior. Gastos Informados podem ser registrados em um Ciclo Financeiro
  explícito e conciliados posteriormente por confirmação, sem recalcular Plano ou
  Limites ainda indisponíveis. O spike Pluggy não é dependência do MVP.
- Configuração existente: Obrigações genéricas e Decisões de Classificação já
  possuem persistência autorizada, idempotente e auditável, sem seed de dados
  pessoais. Natureza Econômica é exclusivamente Pessoal ou Empresa e permanece
  distinta da origem pagadora. A rota Obrigações permite listar, criar, editar,
  desativar e reativar configurações recorrentes e materializar ocorrências por
  competência; a tela Revisar permite confirmar a Natureza Econômica por grupo.
  Fechamentos Mensais iniciais preservam revisões imutáveis e lacunas reconhecidas,
  sem publicar valores financeiros. O backend preserva revisões de cada alteração
  material.
- Aplicação: Expo SDK 57, Expo Router e Development Build Android configurados;
  Início operacional, Fechamento Mensal, Obrigações e Gastos Informados possuem
  rotas universais. Início, Plano e Mais não usam dados demonstrativos no caminho
  normal; seus cenários sintéticos permanecem somente para desenvolvimento
  explícito.
- Demonstração local: `/checklist?scenario=demo` apresenta uma Checklist
  interativa com dados inteiramente sintéticos e conecta a
  `/obligations?scenario=demo`, que explica como Recorrências geram itens
  mensais. Nenhuma ação desses cenários persiste dados.
- A primeira fatia de Categoria e classificação assistida está implementada no
  backend e em Conferir atualização: regras confirmadas resolvem grupos
  conhecidos; somente grupos inéditos sanitizados seguem ao adapter configurado;
  confirmar ou corrigir cria memória determinística, enquanto “não sei” não cria
  regra. O eval sintético aprovou `gpt-5.6-luna` como o candidato mais barato que
  atingiu o gate, e o deployment Convex de desenvolvimento já usa esse modelo.
  A primeira execução real de `2026-06` concluiu com 145 grupos pendentes de
  revisão humana, três chamadas agregadas e nenhuma regra criada
  automaticamente.
- Ainda não implementados: resumo retrospectivo, registro do Recebimento
  Empresarial e Plano Financeiro determinístico. A IA não é fonte de valores
  financeiros oficiais.

Nenhuma credencial, CNPJ, CPF, número de conta ou documento financeiro bruto deve ser commitido neste repositório.
