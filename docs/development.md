# Ambiente de desenvolvimento

## Aplicação universal

A aplicação Expo vive na raiz do repositório. A configuração atual usa Expo SDK
57, Expo Router, React Native 0.86, TypeScript estrito e `expo-dev-client`.

- projeto EAS: `@breno-daroz/brenotion`;
- identificador Android: `com.brenomzy.brenotion`;
- distribuição de desenvolvimento: interna;
- credenciais Android: gerenciadas remotamente pela Expo, nunca pelo repositório.

## Preparar o ambiente

```powershell
npm install
```

## Executar no Android

Instale uma Development Build no celular uma vez. Depois, para alterações em
TypeScript e interface, inicie apenas o Metro:

```powershell
npm start
```

Computador e celular devem estar na mesma rede. Se a rede local bloquear a
descoberta, use:

```powershell
npx expo start --tunnel
```

Uma nova build nativa só é necessária quando dependências ou configurações
nativas mudarem.

## Configurar acesso Clerk

Crie `.env` localmente a partir de `.env.example` e preencha somente a Publishable Key da Application de desenvolvimento:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

Não envie o valor pela conversa nem o registre no Git. A ausência da variável exibe uma falha fechada e explícita. Depois de alterar `.env`, reinicie o Metro.

O Android usa o `AuthView` de `@clerk/expo/native`, atualmente beta, e a web usa o `SignIn` de `@clerk/expo/web`. O fluxo escolhido não usa `brenotion://access/callback`: o Android autentica pela interface nativa e a web usa o popup administrado pelo Clerk. A localização `pt-BR` e os tokens visuais da aplicação são aplicados ao componente web; a interface Android segue os recursos nativos do SDK e do sistema.

O Google nativo exige a conexão social com credenciais próprias e uma Native Application Android no Clerk Dashboard. Cadastre o package `com.brenomzy.brenotion` e a impressão SHA-256 do certificado que assinou a Development Build. Essa configuração é externa e não grava segredo no repositório.

`@clerk/expo` e `expo-secure-store` incluem configuração nativa. A Development Build Android versionCode 2 já contém o plugin e os módulos necessários, inclusive o `AuthView`; alterações atuais em TypeScript e localização usam apenas o Metro. Uma nova build só será necessária se plugin, tema nativo ou outra configuração de prebuild mudar.

## Configurar Convex com Clerk

Vincule o projeto de desenvolvimento com `npx convex dev`. O CLI cria `.env.local` com a referência do deployment e `EXPO_PUBLIC_CONVEX_URL`; esse arquivo permanece ignorado pelo Git.

No deployment de desenvolvimento, configure diretamente pelo Convex Dashboard:

- `CLERK_JWT_ISSUER_DOMAIN`: Frontend API URL da integração Convex ativada no Clerk;
- `AUTHORIZED_CLERK_USER_ID`: Clerk User ID do único Titular autorizado.

Não coloque o Clerk User ID real em documentação, fixture, comando versionado ou conversa. `npx convex env list --names-only` verifica somente a presença dos nomes. `npx convex dev --once` aplica `auth.config.ts`, gera a API tipada e implanta as funções. `npm test` executa os cenários sintéticos de autorização; `npx convex run access:verifyOwner` sem identidade deve falhar com `AUTHENTICATION_REQUIRED`.

## Cenários sintéticos da tela Início

A rota Início aceita `scenario` somente para desenvolvimento e QA. O padrão é
`recent`; os demais estados podem ser abertos com a mesma aplicação universal:

```text
/?scenario=recent
/?scenario=partial
/?scenario=stale
/?scenario=empty
/?scenario=error
```

O cenário `error` falha uma vez e retorna ao retrato recente depois de **Tentar
novamente**, permitindo validar a recuperação sem backend. Todos os valores são
fixtures sintéticas em memória e a interface os identifica como não
sincronizados.

## Verificações

```powershell
npm run lint
npm run typecheck
npm run check:styles
npm run export:web
npm run doctor
```

`check:styles` compila a folha NativeWind como Android e falha quando um token
semântico deixa de produzir uma declaração nativa válida.

Não execute `npm audit fix --force`. No grafo atual, a correção sugerida troca
pacotes Expo por versões incompatíveis; atualizações devem seguir uma versão
oficial compatível do SDK.

## Gerar Development Build Android

```powershell
npx eas-cli@latest build --platform android --profile development
```
