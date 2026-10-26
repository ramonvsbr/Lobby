# Melhorias futuras — Lobby

Lista do que ficou para depois, em ordem de prioridade. Marque `[x]` ao concluir.

## Prioridade: grande impacto, pouco esforço

- [ ] **Ícone próprio do Lobby.** Hoje ainda é o do Maromba. O workflow já está pronto: basta subir `assets/icon-only.png` (PNG quadrado de 1024×1024) no repositório. Opcional: `icon-foreground.png` e `icon-background.png`.
- [ ] **Backup geral no hub.** Um botão que exporta num só arquivo JSON os dados do Maromba, do Saldo e do hub, e outro que importa de volta. Os plugins de compartilhar e de arquivos já estão instalados, e os backups de cada app continuam funcionando.
- [ ] **Lembrete de backup** (depende do backup geral). O hub guarda a data do último backup e mostra um aviso discreto após, por exemplo, 14 dias.
- [ ] **Ícone das notificações** (`smallIcon` em `capacitor.config.json`). Hoje os lembretes usam o ícone padrão do Android. Precisa de um desenho simples em silhueta.

## Em seguida

- [ ] **Testar no aparelho:** lembretes com o app fechado, comportamento após reiniciar o celular e o saldo atual com dados reais.
- [ ] **Marcar cada item do Mensal como "pago/recebido"** em vez de depender do dia (mais preciso para salário atrasado). Mexe no cálculo do Saldo.
- [ ] **Redesenhar as telas internas** do Maromba e do Saldo com a mesma cara do hub. Hoje só o tema e o acabamento são compartilhados, e elementos com cor fixa no CSS original podem destoar.
- [ ] **Saldo no cartão do hub**, além do gasto de hoje.

## Gamificação (sem poluir)

- [ ] **Regras editáveis dentro do app** (adiado a pedido): XP por ação, metas das conquistas, quantidade do botão de água rápida e ligar ou desligar cada missão. Os valores ficariam em `lobby_config`, com "Restaurar padrão". Atenção: mudar os pontos altera retroativamente o nível, porque o XP é recalculado a cada abertura.
- [ ] **Resumo semanal** no domingo: treinos, água na meta e gastos da semana.
- [ ] **Mais conquistas**, ligadas a recordes e a meses completos.
- [ ] **Insights cruzados** no hub, como "gastou R$ X com suplementos este mês".
- [ ] **Criar missões e conquistas pelo app** (escolher métrica, meta e ícone). Mais trabalho, só vale se a mudança for frequente.

## Mais adiante

- [ ] **Widget na tela inicial do Android** (exige código nativo em Kotlin).
- [ ] **Backup na nuvem** pelo compartilhamento do Android, como cópia para o Drive.
- [ ] **Limpar releases antigos** no GitHub (cada commit na `main` gera um novo).
- [ ] **Escolher nome e `appId` definitivos**, se um dia for publicar fora do uso pessoal.
