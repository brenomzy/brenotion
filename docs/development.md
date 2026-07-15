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
