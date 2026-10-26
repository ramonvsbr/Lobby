# Lobby — contexto do projeto

Documento para quem for mexer no código (eu mesmo no futuro ou uma IA): o que é, como está organizado, o que foi decidido e onde estão as armadilhas. Mantenha atualizado quando algo importante mudar.

## O que é

App Android pessoal (Capacitor 8, HTML/CSS/JS puros, sem bundler) que reúne mini-apps. Nasceu da fusão de dois projetos separados, **Maromba** e **Saldo**, para manter o visual padronizado. Uso pessoal, sem backend: todos os dados ficam em `localStorage` no aparelho.

- `appId`: `br.com.ramon.lobby`. Nome exibido: **Lobby**.
- O `namespace` do `android/app/build.gradle` e o `package` do `MainActivity.java` precisam ser iguais entre si.
- Plugins: `@capacitor/app`, `filesystem`, `local-notifications`, `share`, `status-bar`. As barras do sistema usam o plugin `SystemBars` (embutido no Capacitor 8).

## Arquitetura

Cada app é uma **página separada**, e a navegação é por `location.href` (não há iframe). Motivo: cada app roda como página de topo, então os plugins do Capacitor funcionam como antes, sem mudar o código deles.

```
src/index.html + hub.js     hub, abre os apps
src/apps/<id>/index.html    cada app, com seu CSS/JS
src/shared/theme.css        tema único, carregado POR ÚLTIMO em cada página
src/shared/bridge.js        força o tema claro e injeta o botão "‹ Lobby"
```

- Voltar: o botão voltar do Android, na tela inicial de cada app, faz `window.location.href = '../../index.html'` (antes chamava `exitApp`). No hub, o voltar fecha o app.
- Como o hub é uma página à parte, ele recalcula tudo em `pageshow` e `visibilitychange`.
- Deep link para o Maromba: o hub grava `sessionStorage['maromba_aba_atual']` antes de navegar (abas válidas: `sessao`, `meus-treinos`, `agua`, ...).
- `copiar-www.js` copia `src/` para `www/`. `npm run sync` = `node copiar-www.js && npx cap sync`.

## Tema e visual

- **Um único tema, claro.** Paleta "Earthy Forest Hues": `#DAD8CC`, `#A6B38D`, `#58825C`, `#3C5C40`, `#335042`.
- Todos os tokens (`--bg`, `--surface`, `--chalk`, ...) ficam em `src/shared/theme.css`. Ele redefine os tokens dos dois apps (que já usavam os mesmos nomes) para `:root`, `[data-theme="light"]` e `[data-theme="dark"]` com os mesmos valores. O nome `--chalk` é herdado: hoje é a cor de destaque (verde).
- `bridge.js` grava `light` em `maromba_tema`, `saldo_theme` e `lobby_tema` e reforça o atributo `data-theme="light"` com um `MutationObserver`. Os botões de alternar tema são escondidos por CSS.
- Em telas até 900px, o header fixo foi removido: `.sidebar-brand` some, `.sidebar-footer` (engrenagem de Ajustes) vira `position: absolute` e rola com a página, e o `.main` tem 60px de padding no topo. O botão **‹ Lobby** ocupa esse espaço.
- Elementos com cor fixa no CSS original dos apps podem destoar da paleta. Corrija no `theme.css` ou direto no CSS do app.

## Hub: gamificação

Tudo é **calculado a cada abertura** a partir dos dados dos apps (nada de XP salvo), então não dessincroniza.

- **XP por dia**: treino +50 cada (+15 se bateu recorde); meta de água +20 (ou +5 se bebeu algo abaixo da meta); refeição registrada +10; gasto no Diário +10 (cada um conta uma vez por dia).
- **Nível**: `floor(sqrt(xp / 50)) + 1`. O nível L começa em `50 * (L-1)²` XP.
- **Título**: muda a cada 2 níveis (Iniciante, Aprendiz, Constante, Focado, Disciplinado, Imparável, Lenda).
- **Sequência**: dias seguidos com qualquer atividade. Se hoje ainda não tem atividade, a contagem parte de ontem.
- **Missões**: treinar hoje, meta de água, lançar um gasto. O botão "+250" grava direto em `maromba_agua`, com "Desfazer".
- **Conquistas** (6): primeiro treino, 10 treinos, 7 dias seguidos, 30 dias seguidos, 7 dias na meta de água, 30 gastos lançados.
- O aviso de subir de nível usa `lobby_nivel_visto`.

## Dados (`localStorage`)

| Chave | Conteúdo |
| --- | --- |
| `maromba_historico` | treinos feitos: `{ data, recordes, ... }` |
| `maromba_agua` | `{ id, data, horario, ml }` |
| `maromba_agua_config` | `{ metaMl, ... }` (padrão 2000) |
| `maromba_dieta` | refeições: `{ id, data, horario, nome, ingredientes }` |
| `maromba_sessao_ativa` | treino em andamento |
| `saldo-dados` | estado do Saldo (ver abaixo) |
| `maromba_tema`, `saldo_theme`, `lobby_tema` | sempre `light` |
| `lobby_nivel_visto` | último nível mostrado no hub |

Datas são `YYYY-MM-DD` na hora **local**. Valores em dinheiro do Saldo são **centavos**.

## Saldo: regra do saldo atual

- Lançamento do Diário: `{ id, day, item, amount, monthKey, type? }` (`type: 'income'` para receita). O Mensal guarda receitas e despesas (avulsas, recorrentes e parceladas) em `state.income` e `state.expenses`.
- **Saldo atual** = saldo inicial do mês + tudo que já aconteceu **até hoje**: receitas e despesas do Mensal com dia ≤ hoje, mais o Diário com dia ≤ hoje. Mês encerrado conta tudo (igual ao projetado); mês futuro não conta nada. Item sem dia só conta no último dia do mês.
- **Projetado** = saldo inicial + Mensal inteiro + Diário do mês. O saldo inicial do mês seguinte é o projetado do anterior.
- Editar o saldo atual grava `initial = valorDigitado − saldoCaido(mês)` e marca o mês como `manual`.
- O botão **i** no cartão abre "Como é calculado", e em mês manual (que não seja o primeiro) oferece **Voltar ao automático**.
- Funções-chave em `apps/saldo/app.js`: `mensalCutoffDay`, `mensalSaldoFor`, `mensalCaido`, `dailyNetCaido`, `saldoCaido`, `recomputeDailyBalances`.

## Notificações

Os dois apps agendam lembretes no mesmo pacote, então os ids **não podem colidir** nem um apagar os do outro:

- Maromba usa o id `900` e a faixa `1000–1999`.
- Saldo usa ids por hash (até 2147483000).
- O `cancelAll` do Saldo (`notificacoes.js`) filtra e **preserva** os ids do Maromba. Se criar outro app com lembretes, defina uma faixa própria e faça o mesmo filtro.

## Alterações feitas nos apps originais

- Botão voltar leva ao hub em vez de fechar o app.
- Maromba: `todayISO()` e `shiftDateISO()` usavam `toISOString()` (UTC), o que virava o dia às 21h no Brasil. Agora usam `dataLocalISO()`.
- Saldo: `cancelAll` preserva os lembretes do Maromba; nova regra do saldo atual; botão **i**; "voltar ao automático".
- `@capacitor/app` foi adicionado (o Maromba usava o plugin sem tê-lo instalado).
- Estilo: link para `theme.css` e `bridge.js` no `index.html` de cada app.

## Build e release (GitHub Actions)

`.github/workflows/gerar-apk.yml`, disparado por `push` na `main` (ignora `docs/**` e `*.md`) e por `workflow_dispatch`.

1. Node 22 e Java 21 (Temurin); aceita as licenças do SDK que já vem no runner.
2. `npm install`, `node copiar-www.js`, `npx cap sync android`.
3. Se existir `assets/icon-only.png`, gera os ícones com `capacitor-assets`.
4. Se os segredos `KEYSTORE_BASE64` e `KEYSTORE_PASSWORD` existirem, decodifica a chave (PKCS12, alias `lobby`) e roda `assembleRelease`; senão, `assembleDebug`.
5. Publica `Lobby-1.0.N.apk` em Releases com a tag `v1.0.N`.

`versionCode` e `versionName` vêm do número da execução (`GITHUB_RUN_NUMBER`) no `android/app/build.gradle`.

**Armadilhas já encontradas**
- `android-actions/setup-android` falhou ao instalar o pacote `tools`; foi trocado por aceitar as licenças com `sdkmanager --licenses`.
- No `build.gradle`, `versionCode`/`versionName` precisam de `=`. Sem ele, o Gradle interpreta como chamada de função e falha com "Value is null".
- Troca de chave de assinatura = o APK novo não instala por cima do antigo.

## Como mexer

**App novo**: pasta em `src/apps/<id>/`; incluir `theme.css` e `bridge.js` no `<head>`; prefixar as chaves do `localStorage`; fazer o voltar do Android ir para `../../index.html`; registrar em `APPS` no `hub.js` (`id`, `nome`, `cor`, `icone`, `url`, `resumo`); reservar uma faixa de ids de notificação.

**Mudar cores**: só em `src/shared/theme.css`.

**Mudar regras de XP, missões ou conquistas**: `stats()`, `BADGES` e `render()` em `src/hub.js`.

## Pendências e ideias

- Testar no aparelho: lembretes com o app fechado, comportamento após reiniciar o celular e o saldo atual com dados reais.
- Marcar cada item do Mensal como "pago/recebido" em vez de depender do dia.
- Redesenho das telas internas dos apps (hoje só o tema e o acabamento são compartilhados).
- Ícone próprio do Lobby (hoje ainda é o do Maromba, a menos que exista `assets/icon-only.png`).
- Definir `smallIcon` das notificações em `capacitor.config.json`.
- Escolher um `appId`/nome definitivo, se for publicar fora do uso pessoal.
