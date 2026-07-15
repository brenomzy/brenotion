# Política de segurança do repositório

Este é um repositório privado para um produto que processará dados financeiros, fiscais e pessoais sensíveis. A especificação completa de ameaças, controles e gates está em [`docs/security.md`](./docs/security.md).

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

O secret scanning nativo do GitHub não está disponível no plano atual deste repositório privado. Se essa disponibilidade mudar, ele e o push protection devem ser habilitados como uma camada adicional; o workflow não deve ser removido sem um controle equivalente.

## Relato de vulnerabilidades

Não registre detalhes exploráveis em uma issue. Comunique o Titular por um canal privado acordado ou use um GitHub Security Advisory privado quando esse recurso estiver habilitado.
