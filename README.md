# Lobby

Central pessoal para Android que reúne meus mini-apps em um só lugar, com visual único e um toque de jogo (nível, XP, sequência e missões diárias).

Hoje o Lobby abriga:

- **Maromba**: treinos, histórico e recordes, água com lembretes e dieta.
- **Saldo**: controle financeiro com Diário e Mensal, saldo atual e projetado.

É feito em HTML, CSS e JavaScript puros, empacotado com [Capacitor](https://capacitorjs.com/). Os dados ficam só no aparelho.

## O que tem no hub

- **Nível e XP**, calculados a partir do que já foi registrado nos apps (nada novo é salvo).
- **Sequência de dias** e a semana em bolinhas.
- **Missões do dia**: treinar, bater a meta de água e lançar um gasto.
- **Ação rápida** de +250 ml de água direto no hub, com "Desfazer".
- **Conquistas** em um painel simples.
- Cada app aparece em um cartão com um resumo (treinos na semana, gasto de hoje).

## Instalar o APK

1. Abra a aba **Releases** deste repositório no celular.
2. Baixe o `.apk` mais recente.
3. Abra o arquivo e permita "instalar apps desconhecidos" quando o Android pedir.

Os APKs são gerados pelo GitHub Actions a cada commit na `main`.

## Gerar o APK pelo GitHub Actions

O workflow `.github/workflows/gerar-apk.yml` instala Node, Java e o Android SDK na nuvem, compila, assina e publica o APK em Releases. Não precisa instalar nada no computador.

**Configuração única** (Settings → Secrets and variables → Actions → *Repository secrets*):

| Segredo | Conteúdo |
| --- | --- |
| `KEYSTORE_BASE64` | a chave de assinatura (`.p12`) codificada em base64 |
| `KEYSTORE_PASSWORD` | a senha da chave (o alias é `lobby`) |

Sem esses segredos o workflow ainda gera um APK de teste (debug), mas com outra assinatura: ele não instala por cima de uma versão assinada com a chave oficial.

**Guarde a chave e a senha fora do repositório.** Sem elas não dá para atualizar o app por cima; seria preciso desinstalar e reinstalar.

Para rodar manualmente: aba **Actions** → *Gerar APK* → *Run workflow*.

### Ícone

Se existir `assets/icon-only.png` (PNG quadrado de 1024×1024), o workflow gera os ícones do Android a partir dele. Opcionalmente, `assets/icon-foreground.png` e `assets/icon-background.png`. Sem a pasta `assets`, vale o ícone que já está em `android/app/src/main/res/mipmap-*`.

## Rodar no computador (opcional)

Precisa de Node 22+, JDK 21 e Android Studio.

```bash
npm install
npm run sync          # copia src/ para www/ e roda o cap sync
npx cap open android  # abre no Android Studio
```

Para ver só o visual no navegador do celular (sem notificações nem botão voltar do Android):

```bash
npx serve src
```

## Estrutura

```
src/
  index.html, hub.js     hub (tela inicial, XP, missões)
  shared/theme.css       tema único (cores, cantos, componentes)
  shared/bridge.js       ponte dos apps com o hub
  fonts/
  apps/
    maromba/             app Maromba
    saldo/               app Saldo
android/                 projeto Android (Capacitor)
docs/                    documentação técnica de cada app
lobby.md                 contexto geral do projeto
```

## Adicionar um app novo

1. Crie `src/apps/<nome>/index.html` (com seu CSS e JS).
2. No `<head>`, depois do seu CSS, inclua:
   ```html
   <link rel="stylesheet" href="../../shared/theme.css">
   <script src="../../shared/bridge.js"></script>
   ```
3. Use um prefixo nas chaves do `localStorage` (por exemplo `meuapp_`).
4. Registre o app no array `APPS` em `src/hub.js`.

Mais detalhes em [`lobby.md`](lobby.md).

## Documentação

- [`lobby.md`](lobby.md): arquitetura, decisões e armadilhas do projeto.
- [`docs/maromba.md`](docs/maromba.md): detalhes do Maromba.
- [`docs/saldo.md`](docs/saldo.md): detalhes do Saldo.
