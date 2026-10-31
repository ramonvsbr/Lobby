# Lobby — contexto do projeto

Documento para quem for mexer no código (eu mesmo no futuro ou uma IA): o que é, como está organizado, o que foi decidido e onde estão as armadilhas. Mantenha atualizado quando algo importante mudar.

## O que é

App Android pessoal (Capacitor 8, HTML/CSS/JS puros, sem bundler) que reúne mini-apps: **Maromba** (treino), **Nutri** (dieta e água) e **Saldo** (finanças). Nasceu da fusão de projetos separados para manter o visual padronizado; o Nutri foi separado do Maromba depois. Uso pessoal, sem backend: todos os dados ficam em `localStorage` no aparelho.

- `appId`: `br.com.ramon.lobby`. Nome exibido: **Lobby**.
- O `namespace` do `android/app/build.gradle` e o `package` do `MainActivity.java` precisam ser iguais entre si.
- Plugins: `@capacitor/app`, `filesystem`, `local-notifications`, `share`, `status-bar`. As barras do sistema usam o plugin `SystemBars` (embutido no Capacitor 8).

## Arquitetura

Cada app é uma **página separada**, e a navegação é por `location.href` (não há iframe). Motivo: cada app roda como página de topo, então os plugins do Capacitor funcionam como antes, sem mudar o código deles.

```
src/index.html + hub.js     hub, abre os apps
src/apps/<id>/index.html    cada app, com seu CSS/JS
src/shared/theme.css        tema único, carregado POR ÚLTIMO em cada página
src/shared/bridge.js        força o tema escuro, ajusta a barra de status e injeta o botão "‹ Lobby"
```

- Voltar: o botão voltar do Android, na tela inicial de cada app, faz `window.location.href = '../../index.html'` (antes chamava `exitApp`). No hub, o voltar fecha o app.
- Como o hub é uma página à parte, ele recalcula tudo em `pageshow` e `visibilitychange`.
- Deep link: o hub grava `sessionStorage['maromba_aba_atual']` (abas: `sessao`, `meus-treinos`, `exercicios`, `historico`) ou `sessionStorage['nutri_aba_atual']` (`dieta`, `agua`) antes de navegar.
- Portal: a transição hub ⇄ app (círculo da cor do app + ícone) vive em `shared/bridge.js` e na seção 9 do `theme.css`. Cada app novo precisa de cor e ícone ali (`--portal-<id>`, `--emb-<id>`); a cor é um tom escuro e o ícone um traço claro.
- `copiar-www.js` copia `src/` para `www/`. `npm run sync` = `node copiar-www.js && npx cap sync`.

## Tema e visual

- **Um único tema, escuro e sóbrio (v4).** Fundo quase-preto esverdeado (`--bg #0E1311`), um destaque sálvia (`--chalk #6F9A7B`) e âmbar apagado só como tom de recompensa. O nome `--chalk` é herdado: hoje é a cor de destaque.
- Todos os tokens (`--bg`, `--surface`, `--chalk`, ...) ficam em `src/shared/theme.css`. Ele redefine os tokens dos apps (que já usavam os mesmos nomes) para `:root`, `[data-theme="light"]` e `[data-theme="dark"]` com os mesmos valores.
- `bridge.js` grava `dark` em `maromba_tema`, `saldo_theme` e `lobby_tema` e reforça `data-theme="dark"` com um `MutationObserver`. Os botões de alternar tema são escondidos por CSS.
- **Sem cartões.** Blocos viram linhas separadas por um fio de 1px; seções têm título em caixa-alta com fio embaixo. Só o que precisa parecer tocável mantém contorno (`.selectable-card`, campos, botões, abas). Sem sombras "degrau", cantos pequenos (`--radius` 8, `--radius-lg` 10).
- **Tipografia única:** Plus Jakarta Sans. A Fredoka (arredondada) foi removida; `src/fonts/Fredoka.ttf` pode ser apagado. Sem emojis no hub.
- **Barra de status do Android:** como o tema é escuro, os ícones nativos precisam ser CLAROS (`SystemBars` estilo `DARK`). Isso é aplicado em `hub.js` e em `bridge.js` (várias vezes, porque o `app.js` de cada app ainda pode pedir `LIGHT` ao iniciar; troque lá também).
- **Navegação inferior fixa** (telas até 900px): `.sidebar-nav.bottom-nav` fica `position: fixed`, colada na borda, largura total, com fio no topo e respeitando a área segura. O item ativo ganha um traço de 2px no topo.
- Em telas até 900px: `.sidebar-brand` some; `.main::before` desenha uma barra de topo discreta (nome de `--world-title`, com um traço curto na cor `--world-c` do app); o `.sidebar-footer` (engrenagem) e o botão **‹ Lobby** ficam sobre essa barra, em `position: absolute`, e rolam com a página. Cor e nome de cada app: `:root[data-world=...]` no `theme.css`, seção 8.
- Elementos com cor fixa no CSS original dos apps podem destoar do tema escuro (por exemplo, `#fff` ou cores claras escritas direto). Corrija no `theme.css` ou direto no CSS do app.

## Hub: gamificação

Tudo é **calculado a cada abertura** a partir dos dados dos apps (nada de XP salvo), então não dessincroniza.

- **XP por dia**: treino +50 cada (+15 se bateu recorde); meta de água +20 (ou +5 se bebeu algo abaixo da meta); refeição registrada +10; gasto lançado no Saldo +10 (conta uma vez por dia; cada item novo do Mensal guarda `criado` com a data, e lançamentos antigos do Diário continuam valendo).
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
| `maromba_agua` | `{ id, data, horario, ml }` (Nutri; o hub também grava aqui no "+250") |
| `maromba_agua_config` | `{ metaMl, ... }` (padrão 2000) |
| `maromba_dieta` | refeições (usada pelo **Nutri**): `{ id, data, horario, nome, ingredientes }` |
| `maromba_sessao_ativa` | treino em andamento |
| `saldo-dados` | estado do Saldo (ver abaixo) |
| `maromba_tema`, `saldo_theme`, `lobby_tema` | sempre `dark` |
| `lobby_nivel_visto` | último nível mostrado no hub |

Datas são `YYYY-MM-DD` na hora **local**. Valores em dinheiro do Saldo são **centavos**.

## Saldo: regra do saldo atual

- O **Diário foi removido da interface** (o Saldo tem só **Mensal**, padrão, e **Anual**). Os lançamentos antigos ficam em `state.daily.entries` (`{ id, day, item, amount, monthKey, type? }`) e **continuam contando** no cofre; não dá mais para criar nem editar. O Mensal guarda receitas e despesas (avulsas, recorrentes e parceladas) em `state.income` e `state.expenses`; itens criados pelo botão + trazem `criado: 'YYYY-MM-DD'`.
- **Saldo atual** = saldo inicial do mês + tudo que já aconteceu **até hoje**: receitas e despesas do Mensal com dia ≤ hoje, mais os lançamentos antigos do Diário com dia ≤ hoje. Mês encerrado conta tudo (igual ao projetado); mês futuro não conta nada. Item sem dia só conta no último dia do mês.
- **Projetado** = saldo inicial + Mensal inteiro + lançamentos antigos do Diário do mês. O saldo inicial do mês seguinte é o projetado do anterior.
- Editar o saldo atual grava `initial = valorDigitado − saldoCaido(mês)` e marca o mês como `manual`.
- O botão **i** no cartão abre "Como é calculado", e em mês manual (que não seja o primeiro) oferece **Voltar ao automático**.
- Funções-chave em `apps/saldo/app.js`: `mensalCutoffDay`, `mensalSaldoFor`, `mensalCaido`, `dailyNetCaido`, `saldoCaido`, `recomputeDailyBalances`.

## Notificações

Os dois apps agendam lembretes no mesmo pacote, então os ids **não podem colidir** nem um apagar os do outro:

- Maromba usa só o id `900` (fim do descanso).
- Nutri usa a faixa `1000–1999` (lembretes de água).
- O Nutri reagenda os lembretes ao abrir; se você não abrir o Nutri depois da atualização, os lembretes já agendados continuam valendo.
- Saldo usa ids por hash (até 2147483000).
- O `cancelAll` do Saldo (`notificacoes.js`) filtra e **preserva** os ids do Maromba. Se criar outro app com lembretes, defina uma faixa própria e faça o mesmo filtro.

## Alterações feitas nos apps originais

- Botão voltar leva ao hub em vez de fechar o app.
- Maromba: Dieta e Água saíram para o app **Nutri** (as chaves `maromba_*` foram mantidas de propósito, sem migração). Backups de cada app guardam só o seu pedaço; o importador do Nutri aceita backups antigos do Maromba.
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
- **Barra inferior sem toque (corrigido):** `.sidebar-nav.bottom-nav` é `position:fixed`, mas o `.main` (`position:relative`, depois dela no DOM) ficava por cima e engolia os toques. A barra precisa de `z-index` (hoje 50, no `theme.css`, seção 8). Toasts e janelas usam 200+.

## Como mexer

**App novo**: pasta em `src/apps/<id>/`; incluir `theme.css` e `bridge.js` no `<head>`; prefixar as chaves do `localStorage`; fazer o voltar do Android ir para `../../index.html`; registrar em `APPS` no `hub.js` (`id`, `nome`, `icone`, `url`, `resumo`); reservar uma faixa de ids de notificação.

**Mudar cores**: só em `src/shared/theme.css`. Para um app novo, defina também `--world-c` e `--world-title` na seção 8 (a barra de topo usa os dois).

**Mudar regras de XP, missões ou conquistas**: `stats()`, `BADGES` (objetos `{ n, d, ok, p }`) e `render()` em `src/hub.js`.

## Ícone

Monograma **L** em sálvia (gradiente `#A9CDB2` → `#6F9A7B`) com um ponto âmbar (`#D2B466`, a cor de recompensa) sobre fundo `#0E1311`. Arquivos gerados: `android/app/src/main/res/mipmap-*/ic_launcher*.png` (legado, redondo, camada de frente e de fundo do ícone adaptativo) e `icons/icon-*.webp`. Se for recriar com `capacitor-assets` (`assets/icon-only.png`), troque o `--iconBackgroundColor` do workflow, que ainda está em `#ECEBE3` (bege), para `#0E1311`.

## Pendências e ideias

- Testar no aparelho: lembretes com o app fechado, comportamento após reiniciar o celular e o saldo atual com dados reais.
- Marcar cada item do Mensal como "pago/recebido" em vez de depender do dia.
- Redesenho das telas internas dos apps (hoje só o tema e o acabamento são compartilhados).
- Definir `smallIcon` das notificações em `capacitor.config.json`.
- Escolher um `appId`/nome definitivo, se for publicar fora do uso pessoal.