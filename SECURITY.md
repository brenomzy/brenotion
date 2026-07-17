# Política de segurança do repositório

Este é um repositório público para o código-fonte de um produto que processará dados financeiros, fiscais e pessoais sensíveis. Dados reais, credenciais e documentos permanecem fora do repositório. A especificação completa de ameaças, controles e gates está em [`docs/security.md`](./docs/security.md).

## Dados proibidos

Nunca envie ao repositório:

- credenciais, tokens, chaves privadas ou arquivos `.env` preenchidos;
- CPF, CNPJ, números de conta, agência ou cartão;
- extratos, faturas, documentos fiscais ou dados financeiros pessoais reais;
- logs, snapshots ou fixtures derivados de dados reais sem sanitização irreversível comprovada.

Dados de desenvolvimento devem ser sintéticos. Fixtures sanitizadas precisam ser pequenas, justificadas e revisadas antes do commit.

## Tratamento de segredos

- Segredos de backend não usam prefixos públicos nem entram no bundle Expo.
- Ambientes de desenvolvimento e produção usam credenciais distintas.
- `.env.example` registra apenas nomes de variáveis, nunca valores.
- Antes de cada push, revise os arquivos staged e o resultado do workflow `Secret scan`, executado com Gitleaks em cada pull request e push para `main`.
- Um segredo exposto deve ser revogado e rotacionado imediatamente; removê-lo apenas do último commit não é suficiente.

O secret scanning e o push protection nativos do GitHub devem ser habilitados quando disponíveis. O workflow com Gitleaks permanece como controle independente e não deve ser removido sem uma camada equivalente.

## Relato de vulnerabilidades

Não registre detalhes exploráveis em uma issue. Comunique o Titular por um canal privado acordado ou use um GitHub Security Advisory privado quando esse recurso estiver habilitado.
