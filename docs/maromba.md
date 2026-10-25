# Maromba — contexto do projeto

App de treino de academia, 100% local (sem servidor, sem conta, sem internet), **somente Android**: empacotado como APK com Capacitor. A versão web/PWA foi descontinuada e removida do projeto. Dados no `localStorage` da WebView. Idioma da interface e dos comentários: português do Brasil.

Projeto em `C:\Users\Ramon\Desktop\maromba`. ID do pacote Android: `br.com.ramon.maromba`. Repositório Git na branch `main`.

## Stack e arquivos

JavaScript puro, HTML e CSS. Sem build, sem framework.

- `index.html` — estrutura, navegação (sidebar no desktop, barra inferior no mobile) e os contêineres dos modais. Só tem `viewport`, `title` e as referências a `style.css`, `data.js`, `taco.js`, `bodymap.js` e `app.js` (sem `?v=`, sem meta de PWA, sem `manifest`, sem `<link rel="icon">`)
- `style.css` — todo o visual; breakpoint mobile em `max-width: 900px` (e um ajuste extra em 380px). Contém o `@font-face` da Plus Jakarta Sans, logo abaixo do `:root`
- `app.js` — toda a lógica (telas, sessão de treino, histórico, dieta, água, backup; o backup usa Filesystem + Share e os lembretes de água usam Local Notifications, ambos no Android)
- `data.js` — equipamentos (`EQUIPMENT`), músculos (`MUSCLES`) e biblioteca de exercícios
- `taco.js` — alimentos da Tabela TACO (valores por 100g)
- `bodymap.js` — silhueta que destaca os músculos
- `fonts/PlusJakartaSans.ttf` — fonte variável local (pesos 200–800), usada pelo `@font-face`
- `package.json`, `capacitor.config.json`, `copiar-www.js` — Capacitor e script de cópia
- `android/` — projeto Android gerado pelo Capacitor (vai para o Git, exceto os arquivos gerados do `.gitignore`)
- `www/` — **cópia gerada** pelo `npm run sync`; nunca editar nem versionar
- `.gitignore` — ignora `node_modules/`, `www/`, builds do Android, `*.keystore`/`*.jks`

Foram **removidos** `sw.js`, `manifest.json`, `favicon.svg` e a pasta `icons/` (o APK não precisa deles; o ícone do app vive em `android/app/src/main/res/mipmap-*`).

## ⚠️ LEMBRETE: depois de qualquer mudança no código, rodar `npm run sync`

O APK usa a pasta `www/`, que é uma **cópia** dos arquivos do app. Editar `app.js`, `style.css`, `index.html`, `fonts/` etc. na raiz **não** muda o APK até copiar para `www/` e sincronizar com o projeto Android:

```powershell
npm run sync
```

(esse script roda `node copiar-www.js && npx cap sync`). Depois, gerar o APK de novo (passo a passo abaixo). Se aparecer erro de "no such file" no sync, falta algum arquivo da lista em `copiar-www.js` (ou sobrou um que foi apagado, como o antigo `sw.js`, `manifest.json` ou `favicon.svg`).

Lista atual do `copiar-www.js`:

```js
const arquivos = ['index.html', 'style.css', 'app.js', 'data.js', 'taco.js', 'bodymap.js'];
const pastas = ['fonts'];
```

 **Se criar um arquivo ou pasta novos que o app use, incluir ali.**

## Passo a passo: dia a dia (VS Code + Android Studio)

### A. No VS Code (editar e sincronizar)

1. Abrir a pasta `maromba` no VS Code e editar os arquivos **da raiz** (nunca os de `www/`).
2. Abrir o terminal (`Ctrl+'`) e rodar `npm run sync`.
3. Opcional, atalhos pelo terminal:
   - `npx cap open android` — abre o projeto no Android Studio.
   - `npx cap run android` — compila e instala direto no celular conectado por USB (depuração USB ativada).
   - `git add .` → `git commit -m "mensagem"` → `git push` — salva no GitHub.

### B. No Android Studio (gerar o APK)

1. Abrir o projeto pela pasta `android` (via `npx cap open android` ou **File → Open → `maromba\android`**).
2. Esperar o Gradle terminar de sincronizar (barra de progresso no rodapé; a primeira vez demora).
3. **APK de teste (debug):** no Android Studio mais novo o menu fica escondido no ícone de três linhas (☰) no canto superior esquerdo: **☰ → Build → Generate App Bundles or APKs → Generate APKs** (em versões antigas: **Build → Build APK(s)**). Alternativa: janela **Gradle** (barra direita) → `app → Tasks → build → assembleDebug`. Ao terminar, clicar em **locate** no aviso do canto inferior direito. O arquivo fica em `C:\Users\Ramon\Desktop\maromba\android\app\build\outputs\apk\debug\app-debug.apk` (abrir pelo Explorador do Windows; no VS Code a pasta `build` fica escondida pelo `.gitignore`). `.aab` não instala direto no celular.
4. Passar o APK para o celular (cabo, Drive, e-mail), permitir instalar de fontes desconhecidas e abrir. Instalar por cima de uma versão anterior (mesmo ID e mesma chave) **mantém os dados**.
5. Alternativa sem passar arquivo: com o celular no USB e a depuração ativa, escolher o aparelho na barra superior e clicar no botão ▶ (Run).

### C. Trocar o ícone do app (Android Studio)

1. Na visão **Android** (painel esquerdo), botão direito em `app` → **New → Image Asset**.
2. **Icon Type:** *Launcher Icons (Adaptive and Legacy)*.
3. Aba **Foreground Layer:** *Image* e escolher o PNG do ícone (ideal 1024x1024; como a pasta `icons/` foi removida, guardar o PNG original fora do projeto).
4. Aba **Background Layer:** cor sólida (por exemplo o amarelo do app) ou imagem.
5. Ajustar **Resize** até o desenho caber dentro do círculo de recorte do preview (deixar margem de ~1/6 em cada lado).
6. **Next → Finish**, e gerar o APK de novo. Isso substitui os ícones em `android/app/src/main/res/mipmap-*`.
7. O nome embaixo do ícone fica em `android/app/src/main/res/values/strings.xml` (`app_name`).

### D. APK de release assinado (para distribuir / Play Store)

1. Criar a keystore uma única vez (terminal, `keytool` vem com o JDK do Android Studio):
   ```powershell
   keytool -genkey -v -keystore maromba.keystore -alias maromba -keyalg RSA -keysize 2048 -validity 10000
   ```
   Guardar o arquivo e as senhas **fora do Git**, com backup. Sem eles não dá para atualizar o app depois.
2. No Android Studio: **Build → Generate Signed Bundle / APK** → escolher *APK* (instalação direta) ou *Android App Bundle* (Play Store) → selecionar a keystore, alias e senhas → variante **release** → Finish.
3. A cada nova versão publicada, subir `versionCode` (e `versionName`) em `android/app/build.gradle`, senão o Android recusa atualizar por cima.
4. Alternativa por linha de comando (configurando `signingConfigs` no `build.gradle` com senhas em variáveis de ambiente `MAROMBA_STORE_PASS` e `MAROMBA_KEY_PASS`): `cd android` → `./gradlew assembleRelease` (APK) ou `./gradlew bundleRelease` (AAB).

### E. Subir para o GitHub (VS Code)

1. Garantir o `.gitignore` na raiz (ver Arquivos). O erro `Filename too long` / `adding files failed` acontece quando o Git tenta indexar a `node_modules`; os avisos `LF will be replaced by CRLF` são inofensivos.
2. Se o `git add` já falhou antes, limpar o índice e adicionar de novo:
   ```powershell
   git rm -r --cached . -q
   git add .
   git status
   ```
   Conferir que **não aparece** `node_modules/`, `www/` nem `android/app/build/`.
3. `git commit -m "mensagem"` e `git push`.
4. Se ainda der "Filename too long": `git config --global core.longpaths true`.
5. Em outro computador ou clone novo: `npm install` (recria `node_modules`) e `npm run sync` (recria `www/`).

## Ajustes específicos do Android (WebView)

### Barra de status e de navegação do sistema
- **Problema:** com o celular em modo escuro, o Android desenhava os ícones do sistema em branco sobre o app claro (invisíveis). No emulador (modo claro) aparecia certo.
- **Correção aplicada** em `android/app/src/main/res/values/styles.xml`, dentro de `AppTheme.NoActionBar`:
  ```xml
  <item name="android:windowLightStatusBar">true</item>
  <item name="android:windowLightNavigationBar">true</item>
  ```
- Esse arquivo vive em `android/`, então só exige **gerar o APK de novo** (o `npm run sync` não é necessário por causa dele).
- **Se ainda ficar branco:** (1) trocar o pai do estilo de `Theme.AppCompat.DayNight.NoActionBar` para `Theme.AppCompat.Light.NoActionBar`; (2) instalar `@capacitor/status-bar` (`npm i @capacitor/status-bar` + `npx cap sync`) e chamar `window.Capacitor.Plugins.StatusBar.setStyle({ style: 'LIGHT' })` depois do `render();` no init (no Capacitor, `LIGHT` = texto escuro).

### Lentidão ao abrir menus/modais (diagnóstico por leitura do código, não medido)
Causas prováveis e correções sugeridas:

1. **`localeCompare(..., 'pt-BR')` em ordenações** — lento no WebView porque cria um comparador a cada chamada. O modal de refeição reordena a Tabela TACO inteira a cada abertura e a cada letra da busca. Correção: criar `const COLLATOR_PT = new Intl.Collator('pt-BR');` (acima de `let currentTab`) e trocar as 3 ocorrências de `a.nome.localeCompare(b.nome, 'pt-BR')` por `COLLATOR_PT.compare(a.nome, b.nome)` (lista de exercícios, `renderMontarTreino`, `renderRefeicaoForm`).
2. **Efeitos pesados nos modais (`style.css`)** — remover `backdrop-filter: blur(2px)` da regra `.modal-overlay`; no `@media (max-width: 900px)`, na regra `.modal-panel`, adicionar `box-shadow: none;`.
3. **Busca de alimento redesenhando o formulário a cada tecla** — adicionar `let buscaAlimentoTimer = null;` nas globais e fazer o `input` da busca (`buscaInput` em `renderRefeicaoForm`) usar `setTimeout` de ~180 ms (debounce) antes de chamar `renderRefeicaoForm()` e restaurar foco/cursor.

Status: sugeridas ao usuário; confirmar se foram aplicadas e se a lentidão melhorou. Se persistir, identificar qual menu específico (montar treino, refeição, água) para investigar.

## Cache busting

Não existe mais. O `?v=N` foi retirado do `index.html` junto com a versão web/PWA. No APK os arquivos vêm embutidos, então basta `npm run sync` e gerar o APK de novo.

## Arquitetura do app.js

- Estado de navegação em variáveis globais; `currentTab` define a aba: `meus-treinos`, `sessao`, `historico`, `equipamentos`, `exercicios`, `dieta`, `agua`.
- `render()` salva a aba atual (`saveCurrentTab`), marca a aba ativa e chama `renderMeusTreinos`, `renderSessao`, `renderHistorico`, `renderEquipamentos`, `renderExercicios`, `renderDieta` ou `renderAgua`. Cada uma monta o HTML com template string em `#app` e liga os eventos em seguida.
- Persistência da aba: `sessionStorage` na chave `maromba_aba_atual` (`TAB_STORAGE_KEY`), validada contra `TABS_VALIDAS`. No init, `loadSavedTab()` restaura a aba ao recarregar; se não houver aba salva e existir sessão ativa, abre `sessao`. Recarregar mantém a aba; fechar e reabrir o app começa na tela inicial (trocar por `localStorage` se quiser sempre reabrir na última aba).
- Modais (`modal-montar`, `modal-config`, `modal-exercicio-custom`, `modal-refeicao`, `modal-alimento-custom`, `modal-meta-dieta`, `modal-agua-config`, `modal-confirm`) têm `openX`/`closeX` e um "mount" próprio. No mobile viram bottom sheet.
- Confirmações usam `showConfirm(msg, onOk, opts)`, nunca `confirm()` nativo, e só para ações grandes (excluir treino, histórico, exercício/alimento personalizado, abandonar/descartar sessão, importar backup). Avisos usam `toast(msg)`. Itens simples (refeição, registro de água, série) apagam na hora e chamam `desfazivel(msg, fnDesfazer)` = `toast(msg, { acao: { label: 'Desfazer', fn } })`; o toast com ação fica 5 s e aceita toque.
- Storage: helpers `loadJSON`/`saveJSON` e pares `getX`/`setX`.

Chaves do localStorage:

| Chave | Conteúdo |
|---|---|
| `maromba_equipamentos` | ids dos equipamentos marcados |
| `maromba_treinos` | treinos montados |
| `maromba_historico` | sessões concluídas |
| `maromba_sessao_ativa` | sessão em andamento |
| `maromba_exercicios_personalizados` | exercícios do usuário |
| `maromba_dieta` | refeições |
| `maromba_alimentos_personalizados` | alimentos do usuário |
| `maromba_meta_dieta` | meta diária de kcal/macros |
| `maromba_agua` | registros de água |
| `maromba_agua_config` | meta, janela acordado, intervalo e liga/desliga dos lembretes de água |
| `maromba_ultimo_backup` | ISO da última exportação de backup (só deste aparelho; **não** entra no `.json` do backup) |
| `maromba_backup_aviso_adiado` | timestamp até quando o aviso de backup da home fica silenciado (botão "Depois") |

Chave do sessionStorage: `maromba_aba_atual` (aba atual).

Backup: Ajustes exporta/importa um `.json` com tudo isso (`exportarDados` / `importarDados`). No Android, `exportarDados` grava o arquivo no cache com `@capacitor/filesystem` e abre o menu de compartilhar do sistema (Drive, WhatsApp, e-mail) com `@capacitor/share`. Se os plugins não existirem ou não for app nativo, cai no download por `Blob` (navegador). Cancelar o menu não gera erro.

## Convenções de UI

- Tema claro: texto azul-marinho (`--text`), ação amarela (`--chalk`), cards brancos com cantos arredondados.
- Botão principal de ação da tela = `btn btn-accent` (amarelo), integrado ao fluxo da página, **sem botão flutuante**.
- Padrão de cabeçalho de tela (Água e Dieta): `h1` com botão secundário `btn-ghost` ao lado (config/meta); o botão amarelo de registrar fica abaixo.
- Inputs com 16px no mobile para evitar zoom no iOS.
- Alvos de toque de pelo menos 44px no mobile.

## Empacotamento Android (Capacitor): decisões e notas

- Escolhido **Capacitor** (arquivos dentro do APK, funciona sem o site no ar) em vez de TWA/PWABuilder/Bubblewrap. Desempenho equivalente para este app; ganho principal é independência de hospedagem e possibilidade de plugins nativos.
- Dependências: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/local-notifications`. Os avisos de `uuid` e as 3 vulnerabilidades moderate do `npm audit` são de ferramentas de build locais; **não rodar `npm audit fix --force`**.
- **ID do pacote:** para o Android, cada ID é um app diferente (instala lado a lado, não atualiza um ao outro, não divide `localStorage`). Manter `br.com.ramon.maromba`. Para uma versão de teste, usar `applicationIdSuffix ".dev"` em `buildTypes.debug` no `android/app/build.gradle`.
- **Dados:** o `localStorage` do APK é separado do navegador. Para migrar de outro aparelho ou reinstalação, exportar o backup `.json` em Ajustes e importar no app. **Desinstalar o app apaga os dados**: exportar o backup antes e guardar fora do celular. Exportar de vez em quando como hábito (não há servidor nem conta).
- **Keystore:** no Capacitor não há SHA-256 nem `assetlinks.json` (isso é só do TWA). A keystore só é necessária para release; `assembleDebug` usa chave de debug automática.
- **Fonte:** Plus Jakarta Sans embutida via `@font-face` apontando para `fonts/PlusJakartaSans.ttf` (renomeado, sem `[wght]` no nome). Os `<link>` do Google Fonts devem ter sido removidos do `index.html`.

## Mudanças recentes

### Home: progresso do dia e painel "Sua semana"
- **Painel Hoje com barras:** `barraHojeHTML(atual, meta)` desenha uma barra fina (reaproveita `.meta-bar-track`/`.meta-bar-fill`, fica vermelha ao passar da meta) abaixo de Água e de Dieta. A dieta agora mostra as calorias do dia ("260 de 2.000 kcal"), somadas com `calcTotaisRefeicoes`; sem meta de kcal mostra "260 kcal · 1 refeição(ões)" e sem barra. A barra só aparece quando a meta existe.
- **Painel "Sua semana"** (`resumoSemanaHTML`, entre os cartões de estatística e o Hoje): "3 de 4 treinos esta semana" com barra, bolinhas de segunda a domingo (preenchida = treinou, anel = hoje) e sequência ("🔥 3 dias seguidos"). A semana vai de segunda a domingo. A **meta semanal é o número de treinos montados** (máx. 7); sem treinos montados mostra só a contagem. A sequência conta os dias de treino encadeados e **tolera 1 dia de descanso** entre dois treinos (`SEQUENCIA_DESCANSO_MAX = 1`, acima de `resumoSemanaHTML`; com 0 volta a exigir dias consecutivos). Ela fica viva enquanto o último treino tiver no máximo 2 dias: com treino ontem aparece "hoje pode descansar"; com treino anteontem, "treine hoje para manter". Dois dias de descanso seguidos quebram a sequência.
- O painel não aparece com o app totalmente vazio (sem treinos e sem histórico).

### Treino ativo: descanso em segundo plano, ±15 s, progresso, vibração, recorde e observação
- **Notificação de fim do descanso:** `agendarNotifDescanso(quandoMs, nomeExercicio)` / `cancelarNotifDescanso()` (id `DESCANSO_NOTIF_ID = 900`, fora da faixa 1000+ da água), usando `@capacitor/local-notifications` (`schedule.at` + `allowWhileIdle`). Agenda ao registrar a série (quando há descanso) e ao ajustar o tempo; cancela ao pular o descanso, pular exercício, abandonar, descartar e salvar. Com o app aberto e visível, o tick do cronômetro cancela a notificação ~1 s antes do fim (o bip/vibração do app já avisa; evita aviso duplo). Se a permissão for negada, `descansoNotifNegada` evita pedir de novo a cada série até reabrir o app. Fora do app nativo não faz nada.
- **−15 s / +15 s** no box de descanso; se o tempo zerar, o descanso termina.
- **Progresso:** barra segmentada (um segmento por exercício; o atual enche conforme as séries) abaixo do título da sessão, com `role="progressbar"`. O texto "Exercício X de N" continua ao lado do tempo.
- **Vibração curta** (40 ms, `navigator.vibrate`) ao registrar cada série. Se não vibrar no APK, falta a permissão no `android/app/src/main/AndroidManifest.xml`: `<uses-permission android:name="android.permission.VIBRATE" />` (precisa gerar o APK de novo; `npm run sync` não basta).
- **Recorde pessoal:** `recordesDaSessao(sessao)` compara a maior carga de cada exercício com o histórico (`maiorCargaHistorico`); a primeira vez de um exercício não conta. Aparece no resumo final (banner + selo por exercício), no toast ao salvar e é gravado em `recordes` no registro do histórico (selo 🏆 no card e no exercício). Só carga; repetições/volume não entram.
- **Observação por exercício:** campo recolhível "📝 Observação" na sessão (salva a cada tecla em `cfg.obs`, sem redesenhar), gravada como `obs` no exercício do histórico e mostrada no resumo e no histórico. Na próxima sessão do mesmo exercício aparece "Da última vez (data): …" (`ultimaObsExercicio`).
- Backup `.json` já leva `recordes` e `obs` (ficam dentro dos registros do histórico), sem mudança no formato.

### Melhorias de uso na academia (sessão ativa, home, desfazer, backup)
- **Carga da última vez:** `ultimaCargaExercicio(exId)` (série mais pesada da sessão mais recente do exercício, lida de `maromba_historico`). Na sessão ativa aparece "Última vez: 40 kg × 10 · data" e os campos já vêm preenchidos: série 1 = última vez; séries seguintes = série anterior desta sessão; sem histórico = alvo do treino. A "Meta" do treino continua visível na mesma linha.
- **Stepper − / +:** carga em passos de 2,5 kg, reps em passos de 1, botões de 56 px (`.step-btn`, `.stepper`). Tocar no campo seleciona o valor. No mobile os dois campos ficam um embaixo do outro. **"Repetir última série"** registra a série anterior direto (aparece da série 2 em diante). Cada série registrada ganha um ✕ para excluir (com Desfazer).
- **Desfazer:** `toast()` agora aceita `{ acao }` e tem `role="status"` / `aria-live="polite"`. Refeição, registro de água e série apagam na hora com "Desfazer" (a refeição/registro volta na mesma posição). Registrar água (aba Água e atalho "+" da home) também mostra "Desfazer". `showConfirm` ficou só para ações grandes.
- **Cartão "Continuar treino"** no topo da home (`continuarTreinoHTML`): nome do treino, exercício atual, série, "exercício X de N" e tempo decorrido ao vivo (`sessaoTimers.homeInt`, limpo em `clearSessaoTimers`). O botão abre a aba `sessao`.
- **Lembrete de backup:** `exportarDados` grava `maromba_ultimo_backup` (`aoConcluirBackup`). Ajustes mostra "Último backup: há N dias (data)" (em vermelho depois de 14 dias ou se nunca houve). A home mostra um aviso suave (`avisoBackupHTML`) se houver dados e nenhum backup, ou se o último tiver `BACKUP_AVISO_DIAS` (14) dias ou mais; "Depois" silencia por `BACKUP_ADIAR_DIAS` (3) dias; "Fazer backup" chama `exportarDados()` direto. No Android o plugin Share não informa se a pessoa de fato salvou/enviou, então o backup é marcado como feito quando o menu de compartilhar abre sem erro.
- `index.html` não mudou. Depois de copiar `app.js` e `style.css`: `npm run sync` e gerar o APK de novo.

### Lembretes de água nativos
- Reescritos com `@capacitor/local-notifications`: cada lembrete é uma notificação diária repetida (`schedule.on` com hora e minuto), uma por horário entre "Acordar" e antes de "Dormir", a cada `intervaloMin`. Funcionam com o app fechado e sobrevivem a reiniciar o celular.
- Ids 1000+ (`AGUA_NOTIF_ID_BASE`) reservados para esses lembretes. `agendarLembretesAgua(config)` cancela os antigos e agenda de novo; é chamada ao salvar "Meta e lembretes", no init e após importar backup.
- Ao ativar o checkbox, o app pede a permissão de notificação (`pedirPermissaoNotificacao`). Sem permissão, o checkbox desmarca e aparece um aviso. Fora do app nativo, o checkbox fica desabilitado.
- O texto é fixo (meta do dia, sem o total já bebido). Intervalo mínimo subiu de 5 para **15 min**. O campo `ultimaNotificacaoTs` e o `setInterval` foram removidos.
- Pasta `icons/` apagada (o ícone da notificação antiga era a última referência).
- Se não disparar no horário: bateria do Android em Configurações → Apps → Maromba → Bateria → "Sem restrições".

### Remoção da versão web/PWA e backup nativo
- Projeto passou a ser só Android. Removidos `manifest.json`, `favicon.svg`, as meta tags de PWA/Apple, os `<link>` de manifest/ícones e o comentário de cache busting do `index.html`; retirado o `?v=15` de todos os arquivos.
- `copiar-www.js` atualizado (lista acima).
- Instalados `@capacitor/filesystem` e `@capacitor/share`; `exportarDados` reescrita para abrir o menu de compartilhar do Android, com fallback de download no navegador.
- `npm run sync`, novo APK gerado e instalado por cima; alterações commitadas e enviadas ao Git (`git add -A`, para registrar também as exclusões).
- Backup `.json` feito antes da mudança e dados conferidos no APK.

### v15
- Aba atual persistida: ao recarregar a página, o usuário continua na aba em que estava (antes voltava para a tela inicial).
- Cache busting subido de `?v=14` para `?v=15`.
- Projeto empacotado com Capacitor; fonte passou a ser local; `sw.js` removido; `.gitignore` criado.
- `styles.xml` do Android com ícones escuros na barra de status/navegação (fix do modo escuro do celular).
- Primeiro APK de debug gerado e testado no emulador e no celular.

### v14
- Removido o botão flutuante "Montar treino" (HTML, CSS e JS). O botão amarelo `home-cta` fica no cabeçalho da tela inicial; no mobile ocupa a largura toda, abaixo do título.
- Dieta: "Editar meta" / "+ Definir meta" no topo, ao lado do título; "+ Nova refeição" abaixo, antes da lista de refeições do dia. O bloco "Meta do dia" ficou só com título e barras.
- Mobile: barra de navegação inferior só com ícones (os `span` de texto ficam ocultos, exceto o `nav-live-dot`); o menu "Mais" mantém os rótulos. Botões de navegação receberam `aria-label`.

## Pendências e ideias

- **Botão voltar do Android:** por padrão ele fecha o app. Tratar com o plugin `@capacitor/app` (`App.addListener('backButton', ...)`) para fechar modais abertos primeiro e, depois, voltar de aba (ou para a tela inicial) antes de sair. Deixar para depois de testar o APK.
- Conferir se os `<link>` do Google Fonts saíram do `index.html` e se a fonte aparece certa no APK, inclusive offline.
- **Confirmar no celular:** ícones de status/navegação visíveis após o ajuste do `styles.xml`; lentidão dos modais após as correções de desempenho (ver "Ajustes específicos do Android").
- Gerar APK de release assinado (keystore) quando for distribuir; considerar `.dev` para a versão de teste.
- **Testar no celular os lembretes de água:** permissão, horário certo com o app fechado e comportamento após reiniciar o aparelho. Opcional: definir `smallIcon` do plugin em `capacitor.config.json` (hoje a notificação usa o ícone padrão).
- Testar no celular real: altura do cabeçalho da home com o botão em largura total, a barra inferior sem texto, a área segura na WebView e se a aba persiste ao recarregar.

## Backlog de UX/UI (sugestões para fazer depois)

Lista priorizada por impacto/esforço, a partir de uma revisão do app. Marcar `[x]` ao concluir. Lembrar: depois de mexer no código, `npm run sync` e gerar o APK de novo.

### Prioridade alta (muito impacto, pouco esforço)

- [x] **Mostrar a carga da última vez durante o treino.** Na sessão ativa, exibir "Última vez: 40 kg × 10" e pré-preencher kg/reps com esse valor (hoje vem o `pesoAlvo`/`repeticoesAlvo` do treino). O dado já existe em `maromba_historico`; reaproveitar a lógica de `historicoResumoExercicio(exId)`.
- [x] **Botões `−` e `+` para kg e reps** na série atual (`renderSessao`): passos de 2,5 kg e 1 rep, alvos de toque grandes, ao lado de cada campo. Incluir botão **"repetir última série"**.
- [x] **Cartão "Continuar treino" na home** (`renderMeusTreinos`): quando houver `getSessaoAtiva()`, mostrar no topo nome do treino, exercício atual (`exercicioAtualIdx`) e tempo decorrido, com botão que abre a aba `sessao`. Hoje só há o pontinho vermelho na navegação (`.nav-live-dot`).
- [x] **Lembrete de backup.** Gravar a data do último backup exportado (ex.: chave `maromba_ultimo_backup`, definida em `exportarDados`), mostrar "Último backup: há N dias" em Ajustes e um aviso suave na home após 2–3 semanas. Motivo: os dados ficam só no `localStorage`; desinstalar o app apaga tudo.
- [x] **Desfazer em vez de confirmar** para itens simples (refeição, registro de água, série): apagar na hora e mostrar toast "Excluído · Desfazer" (o `toast()` atual precisa aceitar uma ação). Manter `showConfirm` só para ações grandes (excluir treino, importar backup, abandonar sessão).

### Treino ativo

- [x] **Descanso com a tela bloqueada:** o cronômetro usa `setInterval`, que pausa com o app em segundo plano. Agendar uma notificação local (`@capacitor/local-notifications`, já instalado) para o fim do descanso e cancelá-la ao pular/terminar. Usar um id fora da faixa 1000+ dos lembretes de água.
- [x] Botões **+15 s / −15 s** no cronômetro de descanso.
- [x] **Barra de progresso do treino** ("exercício 3 de 6") e vibração curta ao registrar cada série.
- [x] **Recorde pessoal:** ao salvar no histórico, destacar "Novo recorde: 45 kg" quando a maior carga do exercício superar o histórico.
- [x] **Observação por exercício** (ajuste do banco, dor etc.), salva junto com a sessão no histórico.

### Home e hábito

- [x] **Progresso em vez de números soltos:** barras/anéis de água e calorias do dia em relação à meta (a água já mostra "ml de meta"; calorias não aparecem na home).
- [x] **Frequência semanal** ("3 de 4 treinos esta semana") e sequência de dias, calculadas a partir de `maromba_historico`.
- [ ] **Sugerir o próximo treino** pela rotação do que foi feito por último.

### Dieta e água

- [ ] **Recentes e favoritos** no topo da lista de alimentos do modal de refeição (a TACO tem centenas de itens; hoje a lista mostra 50 por vez em ordem alfabética).
- [ ] **Repetir refeição** de ontem ou de outro dia.
- [ ] **Usar as barras de meta na tela de Dieta:** `metaProgressoHTML(totais, meta)` já existe em `app.js`, mas `renderDieta` não a chama. Encaixar logo abaixo dos cartões de macros.

### Histórico

- [ ] **Segundo modo do gráfico:** volume total (séries × reps × kg) ou 1RM estimado, além da maior carga, para mostrar evolução mesmo quando o peso não sobe.
- [ ] **Calendário de frequência** (mapa de calor estilo GitHub).

### Montagem de treino

- [ ] **Duplicar treino** ("Treino A" → "Treino B").
- [ ] **Arrastar para reordenar** exercícios, no lugar das setas.
- [ ] **Lembrar séries e pausa padrão** por exercício (último valor usado).

### Detalhes de UI e acessibilidade

- [x] `toast()` com `role="status"` e `aria-live="polite"` (leitores de tela).
- [ ] Modais prendendo o foco e devolvendo-o ao botão que os abriu.
- [ ] **Tema com três opções:** claro, escuro e seguir o sistema (hoje o botão só alterna claro/escuro e salva em `maromba_tema`).
- [ ] Ajustes extras: unidade kg/lb e descanso padrão.
- [ ] Regra de design a manter nos componentes novos: não usar o amarelo `--chalk` como **cor de texto** sobre fundo claro; no escuro usar `--chalk-text`, e `--text` para números de destaque (como foi feito em `.agua-total`).

### Ordem sugerida

1. Carga da última vez, botões `−`/`+` e cartão "Continuar treino" (deixam o treino em si mais rápido).
2. Lembrete de backup (protege os dados).
3. Desfazer em vez de confirmar (menos fricção).
4. O resto, conforme a necessidade no uso.
