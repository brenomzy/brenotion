# Contribuindo com o Brenotion

O Brenotion é um projeto privado para um único Titular. Toda mudança deve preservar as invariantes descritas em [`AGENTS.md`](./AGENTS.md), a linguagem de [`CONTEXT.md`](./CONTEXT.md) e os gates do [`plano de implementação`](./docs/implementation-plan.md).

## Fluxo de trabalho

1. Atualize `main` antes de iniciar uma mudança.
2. Crie uma branch curta, como `agent/<description>`, `feat/<description>` ou `fix/<description>`.
3. Faça commits pequenos e intencionais, com mensagens técnicas em inglês.
4. Execute lint, verificação de tipos e testes aplicáveis.
5. Revise os arquivos staged para impedir segredos ou dados financeiros reais.
6. Abra um pull request descrevendo objetivo, impacto, riscos e validação executada.
7. Faça merge somente com os checks obrigatórios verdes quando o CI estiver configurado.

O commit inicial que estabelece `main` é a única exceção prevista ao fluxo por pull request. A proteção da branch será ativada depois que existirem checks automatizados.

## Commits

Use uma descrição curta e idiomática em inglês, preferencialmente no formato Conventional Commits:

- `docs: record product and architecture decisions`
- `chore: scaffold universal expo application`
- `test: verify backend authorization failures`

## Segurança e dados de teste

Consulte [`SECURITY.md`](./SECURITY.md) antes de adicionar integrações, fixtures, uploads ou variáveis de ambiente. Dados reais não são permitidos em protótipos, testes ou demonstrações.
