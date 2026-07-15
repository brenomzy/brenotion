# Brenotion

Brenotion é um aplicativo financeiro pessoal e empresarial para um único empreendedor brasileiro que presta serviços ao exterior. O produto transforma movimentações financeiras em decisões práticas: quanto reservar, quanto pode sair da empresa, quanto está disponível até o próximo recebimento e quais obrigações ainda exigem ação.

O projeto está em fase de especificação. Antes de construir a interface, será validada a viabilidade da sincronização com Itaú e Wise.

## Documentação

- [Orientações para agentes e colaboradores](./AGENTS.md)
- [Guia de contribuição](./CONTRIBUTING.md)
- [Política de segurança do repositório](./SECURITY.md)
- [Linguagem do domínio](./CONTEXT.md)
- [Especificação do produto](./docs/product-spec.md)
- [Arquitetura](./docs/architecture.md)
- [Segurança](./docs/security.md)
- [Plano de implementação](./docs/implementation-plan.md)
- [Exploração visual e design system](./docs/design/README.md)
- [Referências](./docs/references.md)
- [Decisões arquiteturais](./docs/adr/)

## Desenvolvimento

O código será desenvolvido em branches curtas e integrado por pull request depois do commit inicial que estabelece `main`. Versões de Expo, Convex, Clerk, NativeWind e adapters externos só serão fixadas após os respectivos spikes.

Copie `.env.example` para `.env` apenas quando um spike ou adapter aprovado exigir configuração local. Nunca registre valores reais no Git.

## Estado atual

- Plataforma principal: Android.
- Companion web inicial: upload e cofre documental.
- Fonte de verdade planejada: Convex.
- Autenticação planejada: Clerk, com allowlist de um único usuário.
- Interface planejada: Expo Router, NativeWind e avaliação seletiva do React Native Reusables.
- Integração financeira: Pluggy é o primeiro candidato, ainda sujeito a prova de conceito.

Nenhuma credencial, CNPJ, CPF, número de conta ou documento financeiro bruto deve ser commitido neste repositório.
