# Guia de feedback visual

O feedback mais útil descreve a decisão por trás da preferência. Valores exatos são bem-vindos quando representam uma convicção ou restrição; não são necessários para cada detalhe.

## Como usar referências do Mobbin

Um link para uma tela é excelente, desde que venha acompanhado de três recortes:

1. **Aproveitar:** qual parte ou comportamento funciona.
2. **Adaptar:** como isso deveria servir ao Brenotion.
3. **Evitar:** o que pertence à identidade ou ao modelo mental do produto referenciado.

Exemplo:

> Gosto da densidade e da separação em blocos desta tela. Quero adaptar a hierarquia da área superior, mas evitar o card promocional e os cantos tão arredondados.

Não é necessário encontrar uma referência que represente a tela inteira. Duas ou três referências por problema costumam produzir uma direção melhor que um único app tratado como modelo.

## Quando dar valores exatos

Valores exatos ajudam quando o feedback é um limite ou uma preferência já testada:

- “Quero este laranja como âncora: `#ff4d29`.”
- “Cantos acima de `12 px` começam a parecer infantis para mim.”
- “Quero cards quase planos; esta sombra já é demais.”
- “Este press precisa responder em menos de `150 ms`.”

Quando ainda não houver certeza, feedback relativo é mais útil:

- mais compacto ou mais arejado;
- mais seco ou mais macio;
- mais sóbrio ou mais energético;
- mais plano ou mais elevado;
- mais imediato ou mais físico;
- mais próximo do default ou mais autoral.

O agente pode converter essa direção em valores candidatos, compará-los lado a lado e verificar contraste ou timing.

## Eixos para criticar uma tela estática

| Eixo | Pergunta prática |
|---|---|
| Hierarquia | O olhar chega primeiro à decisão correta? |
| Densidade | Há informação demais, de menos ou na proporção certa? |
| Tipografia | Peso, tamanho e espaçamento parecem precisos ou genéricos? |
| Superfícies | Cards, divisores, sombras e raios ajudam ou fragmentam? |
| Cor | A cor expressa marca, estado ou patrimônio sem ambiguidade? |
| Iconografia | Ícones têm função, peso e alinhamento coerentes? |
| Copy | O texto é direto, humano e fiel aos termos canônicos? |
| Estados | Recência, incerteza, erro e sucesso permanecem compreensíveis? |

## Eixos para criticar motion

Motion deve ser avaliado em vídeo ou protótipo executável. Para apontar um problema, informar:

- interação observada;
- momento ou timestamp;
- o que deveria permanecer contínuo;
- sensação atual: lenta, brusca, pesada, elástica, atrasada ou decorativa;
- referência de comportamento, quando houver.

Não é necessário sugerir um easing. “O sheet parece perder contato com o gesto ao soltar” é mais valioso que escolher uma curva sem observar a implementação.

## Formato rápido de feedback

```text
Tela ou fluxo:
Referência, se houver:

Manter:
Adaptar:
Evitar:

Hierarquia:
Densidade:
Superfícies e raios:
Tipografia:
Cor:
Motion:

Não negociável:
Pode continuar aberto:
```

## Ciclo recomendado

1. Escolher uma única superfície de calibração, começando pela tela inicial.
2. Comparar duas ou três variações que alterem poucos eixos por vez.
3. Registrar feedback no formato **manter / adaptar / evitar**.
4. Promover as decisões repetíveis para tokens.
5. Aplicar os tokens em duas telas diferentes para verificar se a direção generaliza.
6. Prototipar em código apenas as microinterações que dependem de timing ou gesto.

O objetivo não é fechar toda a identidade antes do desenvolvimento. É remover ambiguidade suficiente para que o scaffold nasça consistente e continue fácil de refinar.
