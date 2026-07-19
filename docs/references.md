# Referências

Estas fontes sustentam premissas que podem mudar com legislação, produto ou versão. Devem ser revisitadas antes de transformar uma regra provisória em regra confirmada.

## Fiscal e contábil

- [Receita Federal — Operações internacionais: conversão de exportações de serviços](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/ecf/perguntas-e-respostas-pessoa-juridica-2015/capitulo-xix-irpj-e-csll-operacoes-internacionais.pdf)
- [Receita Federal — Resolução CGSN nº 140/2018](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278)
- [Receita Federal — pagamentos de lucros e dividendos na EFD-Reinf](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/2-eventos-da-efd-reinf/2-13-1-quais-empresas-devem)
- [Receita Federal — rendimentos de sócio ou titular do Simples Nacional e rendimentos do trabalho](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/rendimentos/rendimentos-do-trabalho) — distingue distribuição, pró-labore e rendimentos do trabalho; validado em 17 de julho de 2026.
- [Receita Federal — tributação de lucros e dividendos a partir de 2026](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/dirf/manual_padrao_rfb_per_tributacao_cotin_v-19-12-2025.pdf/%40%40download/file)
- [Receita Federal — Solução de Consulta nº 23 sobre nota fiscal de exportação](https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=51213)
- [Banco Central — dados abertos de cotações do dólar](https://dadosabertos.bcb.gov.br/dataset/dolar-americano-usd-todos-os-boletins-diarios)
- [Código Civil — separação patrimonial, art. 50](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm)

## Planejamento financeiro

- [CAIXA — fundo de emergência](https://www.caixa.gov.br/educacao-financeira/voce/fundo-de-emergencia/Paginas/default.aspx)
- [CAIXA — capital de giro](https://www.caixa.gov.br/educacao-financeira/empresa/capital-de-giro/Paginas/default.aspx)
- [Portal do Investidor — planejamento de reservas financeiras](https://www.gov.br/investidor/pt-br/penso-logo-invisto/planejamento-e-gestao-de-reservas-financeiras)

## Plataforma

- [Meu Pluggy — Data Passport](https://meu.pluggy.ai/) — portal pessoal usado para conectar o Itaú PF e compartilhar a conexão com a Application `Brenotion Spike`; em 17 de julho de 2026, os lançamentos mais recentes observados pelo Titular ainda eram de 13 de julho.
- [Pluggy — fluxo oficial do Meu Pluggy para desenvolvedores](https://github.com/pluggyai/meu-pluggy) — descreve a autorização do conector MeuPluggy como proxy da conexão original e a atualização diária; validado em 14 de julho de 2026.
- [Pluggy — criação de Item por Open Finance](https://docs.pluggy.ai/docs/creating-an-item) — referência do consentimento delegado no ambiente da instituição; validado em 14 de julho de 2026.
- [Pluggy — cobertura dos conectores](https://docs.pluggy.ai/docs/connectors-coverage) — fonte dinâmica para produtos e atualização automática por conector; o agregador saiu do caminho crítico do MVP em 17 de julho de 2026 e só precisa ser revalidado se uma integração futura for reconsiderada.
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo — publicação web](https://docs.expo.dev/guides/publishing-websites/)
- [Clerk — Expo SDK](https://clerk.com/docs/reference/expo/overview)
- [Clerk — Expo Quickstart](https://clerk.com/docs/expo/getting-started/quickstart) — abordagens JavaScript, nativa e híbrida, `ClerkProvider` e cache seguro; revalidado em 15 de julho de 2026 para `@clerk/expo` `3.7.6`.
- [Clerk — componentes nativos Expo](https://clerk.com/docs/reference/expo/native-components/overview) — requisitos, estado beta, `AuthView` e separação entre componentes Android e web; validado em 15 de julho de 2026.
- [Clerk — `AuthView`](https://clerk.com/docs/reference/expo/native-components/auth-view) — tela nativa obrigatória, modo somente login e configuração Google; validado em 15 de julho de 2026.
- [Clerk — `SignIn` para Expo web](https://clerk.com/docs/expo/reference/components/authentication/sign-in) — interface pronta, OAuth em popup e redirecionamento após acesso; validado em 15 de julho de 2026.
- [Clerk — suporte web para Expo](https://clerk.com/docs/guides/development/web-support/overview) — componentes específicos por plataforma; revalidado em 15 de julho de 2026.
- [Convex — integração com Clerk](https://docs.convex.dev/auth/clerk) — `ConvexProviderWithClerk`, configuração do emissor e identidade em funções; validado em 15 de julho de 2026 para `convex` `1.42.2`.
- [Convex — variáveis de ambiente](https://docs.convex.dev/production/environment-variables) — configuração isolada por deployment; validado em 15 de julho de 2026.
- [Convex — testes com `convex-test`](https://docs.convex.dev/testing/convex-test) — identidades sintéticas e runtime Edge com Vitest; validado em 15 de julho de 2026 para `convex-test` `0.0.54`.
- [`read-excel-file` `9.3.2`](https://www.npmjs.com/package/read-excel-file/v/9.3.2) — adapter Node usado para ler a fatura XLSX do Itaú sem persistir o bruto; API de `Buffer`, múltiplas abas e tipos de célula validada em 19 de julho de 2026.
- [NativeWind — instalação](https://www.nativewind.dev/docs/getting-started/installation) — configuração Expo da v4 estável, com Tailwind CSS 3.4; validado em 15 de julho de 2026 para NativeWind `4.2.6`.
- [React Native Reusables — documentação](https://reactnativereusables.com/docs) — catálogo usado como fonte dos primitivos incorporados; validado em 15 de julho de 2026.
- [React Native Reusables — instalação manual](https://reactnativereusables.com/docs/installation/manual) — dependências e estrutura manual; validado em 15 de julho de 2026.
- [React Native Reusables — CLI](https://reactnativereusables.com/docs/cli) — adição seletiva, diagnóstico e atualização deliberada dos componentes copiados; validado em 15 de julho de 2026.
- [React Native Reusables — registry NativeWind](https://github.com/founded-labs/react-native-reusables/blob/main/apps/docs/registry/nativewind.json) — fonte mais completa para itens, dependências e helpers do catálogo; consultado em 15 de julho de 2026 para a [matriz de adoção](./design/react-native-reusables-adoption-matrix.md).
- [React Native Reusables — código-fonte](https://github.com/founded-labs/react-native-reusables/tree/main/packages/registry/src/nativewind/components/ui) — fonte de `Button`, `Card` e `Text` adaptada pelo projeto; consultado em 15 de julho de 2026.

## Exploração visual

- [Mobbin](https://mobbin.com/) — repertório de padrões de interface usado apenas como referência; cada tela selecionada e sua adaptação são registradas no [board de inspirações](./design/inspiration-board.md).

## Política de validação

- Fontes fiscais devem ser revistas na competência em que a regra for usada.
- Regras confirmadas pelo contador registram autor, data e vigência.
- Versões usadas pela aplicação são fixadas no lockfile quando entram em uma fatia executável. Clerk, Convex, NativeWind e adapters externos só se tornam escolhas definitivas depois de funcionar de ponta a ponta no produto.
- O resultado da prova de conceito prevalece sobre uma suposição de cobertura do agregador financeiro; a evidência de recência e o esforço real do Titular prevalecem sobre a disponibilidade nominal do conector.
- Referências visuais são reavaliadas quando a jornada ou um invariante do produto muda; nenhuma referência externa define sozinha a identidade do Brenotion.
