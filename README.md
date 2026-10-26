<div align="center">

# Lobby

**Minha central pessoal para Android: treino, dinheiro e rotina em um só app, com nível, XP e missões diárias.**

[![Gerar APK](https://github.com/ramonvsbr/Lobby/actions/workflows/gerar-apk.yml/badge.svg)](https://github.com/ramonvsbr/Lobby/actions/workflows/gerar-apk.yml)
[![Último release](https://img.shields.io/github/v/release/ramonvsbr/Lobby?label=release&color=58825C)](https://github.com/ramonvsbr/Lobby/releases/latest)
![Android](https://img.shields.io/badge/plataforma-Android-3C5C40)
![Capacitor](https://img.shields.io/badge/Capacitor-8-A6B38D)

[Baixar o APK](https://github.com/ramonvsbr/Lobby/releases/latest) · [Como funciona o XP](#o-hub) · [Contexto técnico](lobby.md)

</div>

<!-- Dica: coloque prints em docs/img/ e mostre aqui, por exemplo:
<p align="center">
  <img src="docs/img/hub.png" width="240" alt="Hub">
  <img src="docs/img/maromba.png" width="240" alt="Maromba">
  <img src="docs/img/saldo.png" width="240" alt="Saldo">
</p>
-->

## Sumário

- [Sobre](#sobre)
- [O hub](#o-hub)
- [Os apps](#os-apps)
- [Instalar](#instalar)
- [Dados e backup](#dados-e-backup)
- [Gerar o APK pelo GitHub Actions](#gerar-o-apk-pelo-github-actions)
- [Rodar no computador](#rodar-no-computador)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Adicionar um app novo](#adicionar-um-app-novo)
- [Problemas comuns](#problemas-comuns)
- [Documentação](#documentação)

## Sobre

O Lobby reúne meus mini-apps em um só lugar, com visual único (tema claro, paleta verde-floresta) e um toque de jogo sem poluição: nível, XP, sequência de dias e três missões por dia.

- HTML, CSS e JavaScript puros, sem bundler.
- Empacotado com [Capacitor](https://capacitorjs.com/) para Android.
- **Sem servidor e sem conta:** todos os dados ficam no aparelho.
- O APK é gerado na nuvem pelo GitHub Actions, sem nada instalado no computador.

## O hub

A tela inicial mostra só o que importa do dia:

- **Nível e XP** em um anel, com o título (Iniciante até Lenda).
- **Sequência** de dias seguidos e a semana em bolinhas.
- **Missões do dia:** treinar, bater a meta de água e lançar um gasto.
- **Ação rápida:** +250 ml de água direto do hub, com "Desfazer".
- **Cartões dos apps** com um resumo (treinos na semana, gasto de hoje).
- **Conquistas** com o andamento de cada uma.
- Botão **?** com a tela **Como funciona**: regras de XP, níveis, missões e conquistas.

Tudo é **calculado a cada abertura** a partir do que você registrou nos apps. Nenhum XP é salvo à parte, então os números nunca ficam fora de sincronia (e apagar registros reduz o XP).

| Ação | XP |
| --- | --- |
| Treino concluído | +50 |
| Recorde batido (extra) | +15 |
| Meta de água batida no dia | +20 |
| Bebeu água, abaixo da meta | +5 |
| Refeição registrada no dia | +10 |
| Gasto lançado no dia | +10 |

Refeição e gasto contam uma vez por dia. O nível é `floor(√(XP / 50)) + 1`.

## Os apps

### Maromba

Treino e hábitos do dia a dia.

- Treinos, sessão em andamento, histórico e recordes.
- Mapa muscular.
- Água com meta diária e lembretes.
- Dieta com a tabela TACO.
- Backup em JSON.

### Saldo

Controle financeiro simples.

- **Diário** (gastos e receitas do dia a dia) e **Mensal** (receitas e despesas avulsas, recorrentes e parceladas).
- **Saldo atual:** saldo inicial + tudo o que já aconteceu até hoje.
- **Projetado:** como o mês termina, com todo o Mensal.
- Botão **i** no cartão de saldo mostra a conta, e é possível voltar o saldo ao cálculo automático.
- Lembretes e backup em JSON.

## Instalar

1. No celular, abra a aba [**Releases**](https://github.com/ramonvsbr/Lobby/releases) e baixe o `.apk` mais recente.
2. Abra o arquivo e permita "instalar apps desconhecidos" quando o Android pedir.
3. Permita as notificações para os lembretes funcionarem.

Os APKs saem sozinhos a cada commit na `main` e instalam por cima da versão anterior, desde que a chave de assinatura seja a mesma.

## Dados e backup

- Os dados ficam no `localStorage` do aparelho. Desinstalar o app **apaga tudo**.
- Faça backup pelo **Ajustes** de cada app (exportar JSON) de vez em quando.
- O Lobby tem `appId` próprio e instala **ao lado** do Maromba e do Saldo antigos. Para migrar: exporte o backup nos apps antigos, importe no Lobby e só então desinstale os antigos.

## Gerar o APK pelo GitHub Actions

O workflow [`gerar-apk.yml`](.github/workflows/gerar-apk.yml) instala Node, Java e o Android SDK na nuvem, compila, assina e publica o APK em **Releases** com a tag `v1.0.N`. Ele roda a cada commit na `main` (ignorando `docs/**` e arquivos `.md`) ou manualmente em **Actions → Gerar APK → Run workflow**.

### Chave de assinatura (configuração única)

Em **Settings → Secrets and variables → Actions → Repository secrets**:

| Segredo | Conteúdo |
| --- | --- |
| `KEYSTORE_BASE64` | a chave `.p12` codificada em base64 |
| `KEYSTORE_PASSWORD` | a senha da chave (o alias é `lobby`) |

> **Guarde a chave e a senha fora do repositório.** Sem elas não dá para atualizar o app por cima: seria preciso desinstalar e reinstalar, perdendo os dados que não tiverem backup.

Sem os segredos, o workflow ainda gera um APK de teste (debug), com outra assinatura.

### Ícone

Se existir `assets/icon-only.png` (PNG quadrado de 1024×1024), o workflow gera os ícones do Android a partir dele. Opcionalmente, também `assets/icon-foreground.png` e `assets/icon-background.png`. Sem essa pasta, vale o ícone atual em `android/app/src/main/res/mipmap-*`.

## Rodar no computador

Opcional. Precisa de Node 22+, JDK 21 e Android Studio.

```bash
npm install
npm run sync          # copia src/ para www/ e roda o cap sync
npx cap open android  # abre no Android Studio
```

Para ver só o visual no navegador (sem notificações nem botão voltar do Android):

```bash
npx serve src
```

## Estrutura do projeto

```
src/
  index.html, hub.js      hub: tela inicial, XP, missões, Como funciona
  shared/theme.css        tema único: cores, cantos e componentes
  shared/bridge.js        ponte dos apps com o hub (tema e botão ‹ Lobby)
  fonts/
  apps/
    maromba/              app Maromba
    saldo/                app Saldo
android/                  projeto Android (Capacitor)
.github/workflows/        build e release do APK
docs/                     documentação técnica de cada app
lobby.md                  contexto geral: arquitetura, decisões e armadilhas
```

Cada app é uma **página separada**, e a navegação é por `location.href`. Assim os plugins do Capacitor funcionam como antes, sem alterar o código dos apps.

## Adicionar um app novo

1. Crie `src/apps/<nome>/index.html` com seu CSS e JS.
2. No `<head>`, depois do seu CSS, inclua:
   ```html
   <link rel="stylesheet" href="../../shared/theme.css">
   <script src="../../shared/bridge.js"></script>
   ```
3. Use um prefixo nas chaves do `localStorage` (por exemplo, `meuapp_`).
4. Faça o botão voltar do Android, na tela inicial do app, ir para `../../index.html`.
5. Registre o app no array `APPS` em `src/hub.js`.

Se o app agendar notificações, reserve uma faixa de ids própria. O Maromba usa `900` e `1000–1999`, e o Saldo usa ids por hash. Detalhes em [`lobby.md`](lobby.md).

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| O APK não instala por cima do anterior | Assinado com outra chave (segredos ausentes ou trocados). |
| O workflow não aparece em **Actions** | A pasta `.github` não subiu no envio (pastas ocultas costumam ser ignoradas ao arrastar). |
| O build falha com "Value is null" no `build.gradle` | `versionCode`/`versionName` sem o `=` na linha. |
| Build falha em `MainActivity` | O `namespace` do `build.gradle` e o `package` do `MainActivity.java` precisam ser iguais. |
| Os lembretes não disparam | Falta permissão de notificação ou o Android restringe o app em segundo plano. |

## Documentação

- [`lobby.md`](lobby.md): arquitetura, regras do XP, dados, notificações, build e pendências.
- [`docs/maromba.md`](docs/maromba.md): detalhes do Maromba.
- [`docs/saldo.md`](docs/saldo.md): detalhes do Saldo.