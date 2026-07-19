# Brenotion

Brenotion é um aplicativo financeiro pessoal e empresarial para um único empreendedor brasileiro que presta serviços ao exterior. O produto transforma movimentações financeiras em decisões práticas: quanto reservar, quanto pode sair da empresa, quanto está disponível até o próximo recebimento e quais obrigações ainda exigem ação.

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
- Fonte de verdade planejada: Convex, com importações confirmadas persistidas e
  consultadas pela tela Revisar; o retrato financeiro da tela Início ainda
  permanece sintético em memória.
- Autenticação em integração: interface pronta do Clerk com `AuthView` nativo no Android, `SignIn` na web e sessão Android em armazenamento seguro; o Convex valida o JWT e aplica a allowlist server-side antes de liberar a aplicação.
- Interface: Expo Router, NativeWind 4.2.6, tema inicial claro, tokens semânticos com fallbacks nativos e Button/Card adaptados do React Native Reusables na primeira tela Início.
- Entrada financeira: importações OFX do extrato e XLSX da fatura do Itaú PF
  validadas de ponta a ponta; Gastos Informados do ciclo atual são a próxima
  adaptação, e o spike Pluggy não é dependência do MVP.
- Aplicação: Expo SDK 57, Expo Router e Development Build Android configurados; tela Início navegável e visualmente validada no Android com retrato sintético.

Nenhuma credencial, CNPJ, CPF, número de conta ou documento financeiro bruto deve ser commitido neste repositório.
