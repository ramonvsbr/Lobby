/* =========================================================
   MAROMBA — app.js
   Toda a lógica roda no navegador, dados salvos no localStorage.
   ========================================================= */

// ---------- storage ----------
const STORAGE_KEYS = {
  EQUIP: 'maromba_equipamentos',
  TREINOS: 'maromba_treinos',
  HIST: 'maromba_historico',
  ATIVA: 'maromba_sessao_ativa',
  CUSTOM: 'maromba_exercicios_personalizados',
  DIETA: 'maromba_dieta',
  CUSTOM_ALIMENTOS: 'maromba_alimentos_personalizados',
  META_DIETA: 'maromba_meta_dieta',
  AGUA: 'maromba_agua',
  AGUA_CONFIG: 'maromba_agua_config',
  EQUIP_VISTO: 'maromba_equip_visto',
  META_SEMANA: 'maromba_meta_semana',              // dias de treino por semana (0 = automático)
  ALIMENTOS_FAV: 'maromba_alimentos_favoritos',    // ids de alimentos favoritos
  ULTIMO_BACKUP: 'maromba_ultimo_backup',          // ISO da última exportação (só deste aparelho; não entra no backup)
  BACKUP_ADIADO: 'maromba_backup_aviso_adiado',    // timestamp até quando o aviso da home fica quieto
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('Falha ao ler', key, e);
    return fallback;
  }
}
function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Falha ao salvar', key, e);
    toast('Não foi possível salvar (armazenamento local cheio ou bloqueado).');
  }
}
function getEquip() { return loadJSON(STORAGE_KEYS.EQUIP, []); }
function setEquip(arr) { saveJSON(STORAGE_KEYS.EQUIP, arr); }
function getTreinos() { return loadJSON(STORAGE_KEYS.TREINOS, []); }
function setTreinos(arr) { saveJSON(STORAGE_KEYS.TREINOS, arr); }
function getHistorico() { return loadJSON(STORAGE_KEYS.HIST, []); }
function setHistorico(arr) { saveJSON(STORAGE_KEYS.HIST, arr); }
function getSessaoAtiva() { return loadJSON(STORAGE_KEYS.ATIVA, null); }
function setSessaoAtiva(obj) { saveJSON(STORAGE_KEYS.ATIVA, obj); }
function getCustomExercises() { return loadJSON(STORAGE_KEYS.CUSTOM, []); }
function setCustomExercises(arr) { saveJSON(STORAGE_KEYS.CUSTOM, arr); syncCustomExercises(); }
// mantém a variável global CUSTOM_EXERCISES (definida em data.js) em dia
// com o que está salvo, pra exerciseById()/allExercises() sempre enxergarem
// os exercícios personalizados mais recentes.
function syncCustomExercises() { CUSTOM_EXERCISES = getCustomExercises(); }
function getDieta() { return loadJSON(STORAGE_KEYS.DIETA, []); }
function setDieta(arr) { saveJSON(STORAGE_KEYS.DIETA, arr); }
function getCustomFoods() { return loadJSON(STORAGE_KEYS.CUSTOM_ALIMENTOS, []); }
function setCustomFoods(arr) { saveJSON(STORAGE_KEYS.CUSTOM_ALIMENTOS, arr); syncCustomFoods(); }
// mantém a variável global CUSTOM_FOODS (definida em taco.js) em dia com o
// que está salvo, pra foodById()/allFoods() sempre enxergarem os alimentos
// personalizados mais recentes.
function syncCustomFoods() { CUSTOM_FOODS = getCustomFoods(); }
// meta diária de calorias/macros, definida pelo usuário na aba Dieta pra
// comparar com o que foi consumido no dia. Valor 0 (ou ausente) em um campo
// significa "sem meta definida" pra aquele macro específico.
function getMetaDieta() { return loadJSON(STORAGE_KEYS.META_DIETA, { kcal: 0, prot: 0, carb: 0, gord: 0 }); }
function setMetaDieta(obj) { saveJSON(STORAGE_KEYS.META_DIETA, obj); }
// registros de consumo de água: [{ id, data:'AAAA-MM-DD', horario:'HH:MM', ml }]
function getAgua() { return loadJSON(STORAGE_KEYS.AGUA, []); }
function setAgua(arr) { saveJSON(STORAGE_KEYS.AGUA, arr); }
// config de água: meta diária, janela acordado (pra não notificar de madrugada)
// e intervalo dos lembretes (agendados como notificações nativas do Android).
function getAguaConfig() {
  return loadJSON(STORAGE_KEYS.AGUA_CONFIG, {
    metaMl: 2000,
    acordar: '07:00',
    dormir: '23:00',
    intervaloMin: 60,
    notificacoesAtivas: false,
  });
}
function setAguaConfig(obj) { saveJSON(STORAGE_KEYS.AGUA_CONFIG, obj); }

// meta de dias na academia por semana (1 a 7). 0 = automático: usa o nº de treinos montados.
function getMetaSemana() {
  const v = Math.round(Number(loadJSON(STORAGE_KEYS.META_SEMANA, 0)));
  return v >= 1 && v <= 7 ? v : 0;
}
function setMetaSemana(n) { saveJSON(STORAGE_KEYS.META_SEMANA, n); }
// alimentos favoritos (só os ids)
function getFavFoods() { return loadJSON(STORAGE_KEYS.ALIMENTOS_FAV, []); }
function setFavFoods(arr) { saveJSON(STORAGE_KEYS.ALIMENTOS_FAV, arr); }
// últimos alimentos usados, derivados do próprio histórico de refeições
// (mais recentes primeiro, sem repetir). Não precisa de storage extra.
function alimentosRecentesIds(limite = 8) {
  const refeicoes = getDieta().slice().sort((a, b) => (b.data + ' ' + b.horario).localeCompare(a.data + ' ' + a.horario));
  const ids = [];
  for (const r of refeicoes) {
    for (const ing of r.ingredientes) {
      if (ing.alimentoId && !ids.includes(ing.alimentoId)) ids.push(ing.alimentoId);
      if (ids.length >= limite) return ids;
    }
  }
  return ids;
}

// ---------- lembrete de backup ----------
// Usa localStorage direto (sem saveJSON) pra uma falha aqui nunca gerar toast.
const BACKUP_AVISO_DIAS = 14;  // a partir de quantos dias sem backup a home mostra o aviso
const BACKUP_ADIAR_DIAS = 3;   // "Depois" silencia o aviso por esse tempo
function getUltimoBackup() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.ULTIMO_BACKUP);
    const ts = v ? Date.parse(v) : NaN;
    return isNaN(ts) ? null : ts;
  } catch (e) { return null; }
}
function marcarBackupFeito() {
  try {
    localStorage.setItem(STORAGE_KEYS.ULTIMO_BACKUP, new Date().toISOString());
    localStorage.removeItem(STORAGE_KEYS.BACKUP_ADIADO);
  } catch (e) { /* sem storage */ }
}
function adiarAvisoBackup() {
  try { localStorage.setItem(STORAGE_KEYS.BACKUP_ADIADO, String(Date.now() + BACKUP_ADIAR_DIAS * 86400000)); } catch (e) { /* sem storage */ }
}
function textoHaQuantoTempo(ts) {
  const dias = Math.floor((Date.now() - ts) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}
// null = não mostrar aviso; senão { nunca: true } ou { nunca: false, dias }
function avisoBackupPendente() {
  const temDados = getTreinos().length || getHistorico().length || getDieta().length;
  if (!temDados) return null; // app vazio: nada a perder
  try {
    const ate = Number(localStorage.getItem(STORAGE_KEYS.BACKUP_ADIADO));
    if (ate && Date.now() < ate) return null;
  } catch (e) { /* sem storage */ }
  const ts = getUltimoBackup();
  if (ts === null) return { nunca: true };
  const dias = Math.floor((Date.now() - ts) / 86400000);
  return dias >= BACKUP_AVISO_DIAS ? { nunca: false, dias } : null;
}

// ---------- helpers ----------
function uid() { return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function dataLocalISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function todayISO() { return dataLocalISO(new Date()); }
function formatDateBR(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function shiftDateISO(iso, dias) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return dataLocalISO(d);
}
function horaAtualHHMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// Barras nativas do Android (status bar + navigation bar) via plugin
// SystemBars do Capacitor (embutido no @capacitor/core 7.1+).
// Atenção: o nome do estilo é pelo FUNDO, não pelo ícone:
//   'LIGHT' = fundo claro  -> ícones ESCUROS
//   'DARK'  = fundo escuro -> ícones CLAROS
function sincronizarBarrasSistema(tema) {
  try {
    const cap = window.Capacitor;
    const SB = cap && cap.Plugins && cap.Plugins.SystemBars;
    if (SB && typeof SB.setStyle === 'function') {
      const r = SB.setStyle({ style: tema === 'dark' ? 'DARK' : 'LIGHT' });
      if (r && typeof r.catch === 'function') r.catch(() => {});
    }
  } catch (e) { /* fora do app nativo: ignora */ }
}

// tema claro/escuro: aplica no <html> (data-theme), ajusta a cor da barra
// do navegador/Android e sincroniza os ícones das barras nativas.
// A escolha fica salva em 'maromba_tema' (só neste aparelho; não entra no backup).
function aplicarTema(t) {
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#14213D' : '#F6F8FC');
  sincronizarBarrasSistema(t);
}

function formatDuration(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), rm = m % 60;
  return rm ? `${h}h ${rm}min` : `${h}h`;
}
function formatClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// minúsculas e sem acento, pra busca de "feijao" achar "Feijão"
function semAcento(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function exerciseAvailable(ex, equipSet) {
  return ex.equipamento.every(id => equipSet.has(id));
}
// tempo assumido por repetição, usado só pra estimativa (não é cronômetro real)
const SEGUNDOS_POR_REPETICAO = 3;
const SEGUNDOS_TRANSICAO_EXERCICIO = 45;

function estimateExerciseSeconds(cfg) {
  return cfg.series * (cfg.repeticoes * SEGUNDOS_POR_REPETICAO + cfg.pausa);
}
function estimateTreinoSeconds(exercicios) {
  if (!exercicios.length) return 0;
  const soma = exercicios.reduce((acc, e) => acc + estimateExerciseSeconds(e), 0);
  return soma + (exercicios.length - 1) * SEGUNDOS_TRANSICAO_EXERCICIO;
}
function unionMuscles(exercicios, { onlyPrimary = false } = {}) {
  const set = new Set();
  exercicios.forEach(cfg => {
    const ex = exerciseById(cfg.exercicioId);
    if (!ex) return;
    ex.musculos.primarios.forEach(m => set.add(m));
    if (!onlyPrimary) ex.musculos.secundarios.forEach(m => set.add(m));
  });
  return [...set];
}
// toast(msg) simples, ou toast(msg, { acao: { label, fn } }) com um botão
// (usado pelo "Desfazer"). Com ação o aviso fica mais tempo na tela.
function toast(msg, opts = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = '';
  const txt = document.createElement('span');
  txt.textContent = msg;
  el.appendChild(txt);
  const acao = opts.acao;
  el.classList.toggle('com-acao', !!acao);
  if (acao) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-acao';
    b.textContent = acao.label;
    b.addEventListener('click', () => {
      clearTimeout(el._t);
      el.classList.remove('show');
      acao.fn();
    });
    el.appendChild(b);
  }
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), acao ? 5000 : 2200);
}
// apagou algo simples? avise com "Desfazer" em vez de pedir confirmação antes
function desfazivel(msg, fnDesfazer) {
  toast(msg, { acao: { label: 'Desfazer', fn: fnDesfazer } });
}

// ---------- ícones pequenos (usados dentro de botões) ----------
const ICON_PLAY = '<svg class="icon" viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none"/></svg>';
const ICON_EDIT = '<svg class="icon" viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
const ICON_TRASH = '<svg class="icon" viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
const ICON_UP = '<svg class="icon" viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
const ICON_DOWN = '<svg class="icon" viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';
const ICON_DOWNLOAD = '<svg class="icon" viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/></svg>';
const ICON_UPLOAD = '<svg class="icon" viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M4 4h16"/></svg>';
const ICON_COPY = '<svg class="icon" viewBox="0 0 24 24" style="width:13px;height:13px"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';

// ---------- modal de confirmação (substitui confirm() nativo) ----------
function showConfirm(message, onConfirm, opts = {}) {
  const modal = document.getElementById('modal-confirm');
  const msgEl = document.getElementById('confirm-msg');
  const btnOk = document.getElementById('btn-confirm-ok');
  const btnCancel = document.getElementById('btn-confirm-cancel');
  msgEl.textContent = message;
  btnOk.textContent = opts.okLabel || 'Confirmar';
  btnOk.className = 'btn ' + (opts.okClass || 'btn-danger');
  modal.hidden = false;

  function cleanup() {
    modal.hidden = true;
    btnOk.removeEventListener('click', onOk);
    btnCancel.removeEventListener('click', onCancel);
    modal.removeEventListener('click', onOverlay);
  }
  function onOk() { cleanup(); onConfirm(); }
  function onCancel() { cleanup(); }
  function onOverlay(e) { if (e.target === modal) onCancel(); }
  btnOk.addEventListener('click', onOk);
  btnCancel.addEventListener('click', onCancel);
  modal.addEventListener('click', onOverlay);
}

// ---------- áudio do fim de descanso ----------
// O AudioContext precisa nascer dentro de um gesto do usuário pra não ficar
// suspenso; criamos ele uma única vez no primeiro toque/clique na página e
// reaproveitamos depois, mesmo quando o beep dispara de um setInterval.
let audioCtx = null;
function ensureAudioCtx() {
  if (audioCtx) return audioCtx;
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) return null;
  try { audioCtx = new AudioCtxClass(); } catch (e) { audioCtx = null; }
  return audioCtx;
}
document.addEventListener('pointerdown', ensureAudioCtx, { once: true });

function tocarBip(freq, inicioMs, duracaoMs) {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  setTimeout(() => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracaoMs / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duracaoMs / 1000 + 0.02);
    } catch (e) { /* silencioso */ }
  }, inicioMs);
}
function alertaFimDescanso() {
  try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) { /* silencioso */ }
  tocarBip(880, 0, 260);
  tocarBip(1175, 220, 260);
}

// ---------- notificação de fim do descanso ----------
// O setInterval do cronômetro pausa com a tela bloqueada; por isso o fim do
// descanso também vira uma notificação local agendada (ela dispara mesmo com o
// app em segundo plano). Id 900: fora da faixa 1000+ dos lembretes de água.
const DESCANSO_NOTIF_ID = 900;
let descansoNotifNegada = false; // permissão negada nesta abertura: não insiste a cada série
async function agendarNotifDescanso(quandoMs, nomeExercicio) {
  const ln = getLocalNotifications();
  if (!ln || descansoNotifNegada) return;
  try {
    await ln.cancel({ notifications: [{ id: DESCANSO_NOTIF_ID }] });
    let p = await ln.checkPermissions();
    if (p.display !== 'granted') p = await ln.requestPermissions();
    if (p.display !== 'granted') { descansoNotifNegada = true; return; }
    // o descanso pode ter sido pulado/ajustado enquanto esperávamos a permissão
    const s = getSessaoAtiva();
    if (!s || s.pausaAte !== quandoMs || quandoMs <= Date.now()) return;
    await ln.schedule({ notifications: [{
      id: DESCANSO_NOTIF_ID,
      title: '⏱️ Descanso terminou',
      body: nomeExercicio ? `Hora da próxima série de ${nomeExercicio}.` : 'Hora da próxima série.',
      schedule: { at: new Date(quandoMs), allowWhileIdle: true },
    }] });
  } catch (e) {
    console.warn('Falha ao agendar notificação de descanso', e);
  }
}
function cancelarNotifDescanso() {
  const ln = getLocalNotifications();
  if (!ln) return;
  try { Promise.resolve(ln.cancel({ notifications: [{ id: DESCANSO_NOTIF_ID }] })).catch(() => {}); } catch (e) { /* silencioso */ }
}

// ---------- Screen Wake Lock (mantém a tela acesa durante o treino) ----------
let wakeLock = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    wakeLock = null; // ex.: aba em segundo plano — sem problema, tentamos de novo ao voltar
  }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentTab === 'sessao' && getSessaoAtiva()) {
    requestWakeLock();
  }
});

// ---------- estado de navegação ----------
const APP = document.getElementById('app');
const MONTAR_MOUNT = document.getElementById('montar-mount');
const CONFIG_MOUNT = document.getElementById('config-mount');
const MODAL_MONTAR = document.getElementById('modal-montar');
const MODAL_CONFIG = document.getElementById('modal-config');
const EXERCICIO_CUSTOM_MOUNT = document.getElementById('exercicio-custom-mount');
const MODAL_EXERCICIO_CUSTOM = document.getElementById('modal-exercicio-custom');
const REFEICAO_MOUNT = document.getElementById('refeicao-mount');
const MODAL_REFEICAO = document.getElementById('modal-refeicao');
const ALIMENTO_CUSTOM_MOUNT = document.getElementById('alimento-custom-mount');
const MODAL_ALIMENTO_CUSTOM = document.getElementById('modal-alimento-custom');
const META_DIETA_MOUNT = document.getElementById('meta-dieta-mount');
const MODAL_META_DIETA = document.getElementById('modal-meta-dieta');
const AGUA_CONFIG_MOUNT = document.getElementById('agua-config-mount');
const MODAL_AGUA_CONFIG = document.getElementById('modal-agua-config');

const COLLATOR_PT = new Intl.Collator('pt-BR');
let currentTab = 'meus-treinos';          // 'meus-treinos' | 'sessao' | 'historico' | 'exercicios' | 'dieta' | 'agua'
let subAbaExercicios = 'exercicios'; // 'exercicios' | 'equipamentos'
// Aba atual persistida no sessionStorage: sobrevive ao recarregar a página,
// mas uma nova abertura do app começa na tela inicial.
const TAB_STORAGE_KEY = 'maromba_aba_atual';
const TABS_VALIDAS = ['meus-treinos', 'sessao', 'historico', 'exercicios', 'dieta', 'agua'];
function loadSavedTab() {
  try {
    const t = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (t === 'equipamentos') return 'exercicios';
    return TABS_VALIDAS.includes(t) ? t : null;
  } catch (e) { return null; }
}
function saveCurrentTab() {
  try { sessionStorage.setItem(TAB_STORAGE_KEY, currentTab); } catch (e) { /* modo privado/sem storage: ignora */ }
}
let draftTreino = null;                   // treino sendo montado/editado
let musculosAlvoMontagem = new Set();     // grupos musculares marcados na tela "montar treino"
let filtroMusculo = 'todos';
let filtroBusca = '';
let somenteDisponiveis = true;
let exercicioAberto = null;
let buscaMontagem = '';           // busca de exercício na tela "montar treino"
let draftExercicioCustom = null;  // exercício personalizado sendo cadastrado
let sessaoHistAberta = null;
let exercicioGraficoSelecionado = null;
let dietaData = todayISO();       // dia sendo visualizado na aba Dieta
let copiarDiaOrigem = null;       // dia de origem escolhido em "Repetir refeições de outro dia" (null = dia anterior ao aberto)
let copiarDiaAberto = false;      // o painel "Repetir refeições" está expandido?
let refeicaoAberta = null;        // id da refeição expandida na lista do dia
let draftRefeicao = null;         // refeição sendo criada/editada no modal
let buscaAlimentoForm = '';       // termo de busca de alimento dentro do modal de refeição
let draftAlimentoCustom = null;   // alimento personalizado sendo cadastrado
let draftMetaDieta = null;        // meta de calorias/macros sendo editada no modal
let graficoPeriodo = '1m';   // '1m' | '3m' | '6m' | '1a' | 'tudo'
let graficoZoom = null;      // { inicio: 'AAAA-MM-DD', fim: 'AAAA-MM-DD' } | null — recorte extra por arraste no gráfico
let aguaData = todayISO();        // dia sendo visualizado na aba Água
let draftAguaConfig = null;       // config de meta/lembretes de água sendo editada no modal
let aguaChipSel = null;           // chip de ml selecionado na aba Água: número do preset ou 'outro' (null = ainda não inicializado)
let aguaCustomMl = '';            // texto do campo "Outro" (ml)
const AGUA_PRESETS = [200, 250, 300, 500]; // ml — medidas rápidas padronizadas
const OPCOES_REFEICAO = ['Café da manhã', 'Almoço', 'Janta', 'Ceia', 'Lanche']; // tipos de refeição (seleção única)

const PERIODOS_GRAFICO = [
  { id: '1m', label: '1 mês' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '1a', label: '1 ano' },
  { id: 'tudo', label: 'Tudo' },
];

function dataCorteParaPeriodo(periodo) {
  if (periodo === 'tudo') return null;
  const meses = { '1m': 1, '3m': 3, '6m': 6, '1a': 12 }[periodo] || 3;
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().slice(0, 10);
}
const sessaoTimers = { elapsedInt: null, restInt: null, homeInt: null };

function switchTab(id) { currentTab = id; render(); }

// ---------- botão "voltar" do Android ----------
// Pilha de telas visitadas: o render() empilha a aba anterior toda vez que a
// aba muda, e o botão voltar desempilha.
const pilhaAbas = [];
let abaRenderizada = null;
let navegandoVoltar = false;

function registrarMudancaDeAba() {
  if (navegandoVoltar) {
    navegandoVoltar = false;
  } else if (abaRenderizada && abaRenderizada !== currentTab) {
    if (pilhaAbas[pilhaAbas.length - 1] !== abaRenderizada) pilhaAbas.push(abaRenderizada);
    if (pilhaAbas.length > 20) pilhaAbas.shift();
  }
  abaRenderizada = currentTab;
}

// Ordem de prioridade ao apertar voltar:
// 1) confirmação aberta  2) modal aberto (o do topo)
// 3) tela anterior da pilha  4) início  5) sair do app
function tratarBotaoVoltar() {
  const modalConfirm = document.getElementById('modal-confirm');
  if (modalConfirm && !modalConfirm.hidden) {
    document.getElementById('btn-confirm-cancel').click();
    return;
  }

  const modais = [
    [MODAL_ALIMENTO_CUSTOM, closeAlimentoCustom],
    [MODAL_AGUA_CONFIG, closeAguaConfig],
    [MODAL_META_DIETA, closeMetaDieta],
    [MODAL_REFEICAO, closeRefeicao],
    [MODAL_EXERCICIO_CUSTOM, closeExercicioCustom],
    [MODAL_MONTAR, closeMontar],
    [MODAL_CONFIG, closeConfig],
  ];
  for (const [modal, fechar] of modais) {
    if (!modal.hidden) { fechar(); return; }
  }

  while (pilhaAbas.length) {
    const anterior = pilhaAbas.pop();
    if (anterior !== currentTab) {
      navegandoVoltar = true;
      currentTab = anterior;
      render();
      return;
    }
  }

  if (currentTab !== 'meus-treinos') {
    navegandoVoltar = true;
    currentTab = 'meus-treinos';
    render();
    return;
  }

  // já está no início e sem nada aberto: fecha o app
  try {
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    window.location.href = '../../index.html';
  } catch (e) { /* fora do app nativo: ignora */ }
}
function clearSessaoTimers() {
  if (sessaoTimers.elapsedInt) clearInterval(sessaoTimers.elapsedInt);
  if (sessaoTimers.restInt) clearInterval(sessaoTimers.restInt);
  if (sessaoTimers.homeInt) clearInterval(sessaoTimers.homeInt);
  sessaoTimers.elapsedInt = null; sessaoTimers.restInt = null; sessaoTimers.homeInt = null;
}

function render() {
  if (currentTab === 'equipamentos') currentTab = 'exercicios';
  if (currentTab === 'sessao' && !getSessaoAtiva()) currentTab = 'meus-treinos';
  registrarMudancaDeAba();
  if (currentTab !== 'exercicios') voltarParaMontar = false; // saiu da Biblioteca: o botão "Continuar" não vale mais
  saveCurrentTab();
  document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === (currentTab === 'sessao' ? 'meus-treinos' : currentTab)));
  if (currentTab !== 'sessao') { clearSessaoTimers(); releaseWakeLock(); }

  switch (currentTab) {
    case 'meus-treinos': renderMeusTreinos(); break;
    case 'sessao': renderSessao(); break;
    case 'historico': renderHistorico(); break;
    case 'exercicios': renderExercicios(); break;
    case 'dieta': renderDieta(); break;
    case 'agua': renderAgua(); break;
    default: renderMeusTreinos();
  }
}

// ================= MODAIS =================
// Antes de montar o primeiro treino, a pessoa precisa abrir a seção de
// equipamentos na Biblioteca (ela define quais exercícios aparecem no seletor).
// O flag fica salvo só neste aparelho; não entra no backup.
let voltarParaMontar = false; // true = veio redirecionada à Biblioteca para continuar o treino
function equipamentosVistos() {
  try { return localStorage.getItem(STORAGE_KEYS.EQUIP_VISTO) === '1'; } catch (e) { return true; }
}
function marcarEquipamentosVistos() {
  try { localStorage.setItem(STORAGE_KEYS.EQUIP_VISTO, '1'); } catch (e) { /* sem storage */ }
}

function openMontarNovo() {
  if (getTreinos().length === 0 && !equipamentosVistos()) {
    voltarParaMontar = true;
    subAbaExercicios = 'equipamentos';
    currentTab = 'exercicios';
    render();
    toast('Primeiro, marque os equipamentos da sua academia.');
    return;
  }
  draftTreino = { id: null, nome: '', exercicios: [] };
  musculosAlvoMontagem = new Set();
  buscaMontagem = '';
  openMontar();
}
function openMontarEditar(treino) {
  draftTreino = JSON.parse(JSON.stringify(treino));
  musculosAlvoMontagem = new Set();
  buscaMontagem = '';
  openMontar();
}
function openMontar() {
  MODAL_MONTAR.hidden = false;
  renderMontarTreino();
}
function closeMontar() {
  MODAL_MONTAR.hidden = true;
}
function openConfig() {
  MODAL_CONFIG.hidden = false;
  renderDados();
}
function closeConfig() {
  MODAL_CONFIG.hidden = true;
}
function openExercicioCustom() {
  draftExercicioCustom = { nome: '', equipamento: [], primarios: [], secundarios: [] };
  MODAL_EXERCICIO_CUSTOM.hidden = false;
  renderExercicioCustom();
}
function closeExercicioCustom() {
  MODAL_EXERCICIO_CUSTOM.hidden = true;
  draftExercicioCustom = null;
}
function openRefeicaoNova() {
  draftRefeicao = { id: null, data: dietaData, horario: horaAtualHHMM(), nome: '', ingredientes: [] };
  buscaAlimentoForm = '';
  MODAL_REFEICAO.hidden = false;
  renderRefeicaoForm();
}
function openRefeicaoEditar(r) {
  draftRefeicao = JSON.parse(JSON.stringify(r));
  // refeições salvas antes da correção não têm os valores por 100g:
  // reconstrói aqui pra a edição de quantidade nunca zerar o ingrediente
  draftRefeicao.ingredientes.forEach(garantirBase100);
  buscaAlimentoForm = '';
  MODAL_REFEICAO.hidden = false;
  renderRefeicaoForm();
}
function closeRefeicao() {
  MODAL_REFEICAO.hidden = true;
  draftRefeicao = null;
}
function openAlimentoCustom() {
  draftAlimentoCustom = { nome: '', kcal: 0, prot: 0, carb: 0, gord: 0 };
  MODAL_ALIMENTO_CUSTOM.hidden = false;
  renderAlimentoCustom();
}
function openMetaDieta() {
  draftMetaDieta = { ...getMetaDieta() };
  MODAL_META_DIETA.hidden = false;
  renderMetaDietaForm();
}
function closeMetaDieta() {
  MODAL_META_DIETA.hidden = true;
  draftMetaDieta = null;
}
function closeAlimentoCustom() {
  MODAL_ALIMENTO_CUSTOM.hidden = true;
  draftAlimentoCustom = null;
}
function openAguaConfig() {
  draftAguaConfig = { ...getAguaConfig() };
  MODAL_AGUA_CONFIG.hidden = false;
  renderAguaConfigForm();
}
function closeAguaConfig() {
  MODAL_AGUA_CONFIG.hidden = true;
  draftAguaConfig = null;
}

// ================= EQUIPAMENTOS (seção dentro de Exercícios) =================
let equipAberto = false; // a seção "Meus equipamentos" está expandida?

function renderEquipamentosAbaHTML() {
  const selected = new Set(getEquip());
  return `
    <div>
      ${voltarParaMontar ? `
        <div class="actions-row" style="margin-bottom: 16px;">
          <button id="btn-equip-continuar" class="btn btn-accent">Continuar e montar treino →</button>
        </div>` : ''}
      <div class="picker-body" style="padding: 0;">
        <p class="hint">Marque o que você tem disponível na sua academia:</p>
        <div class="actions-row" style="margin: 12px 0;">
          <button id="btn-marcar-todos" class="btn btn-ghost btn-small">Marcar tudo</button>
          <button id="btn-desmarcar-todos" class="btn btn-ghost btn-small">Desmarcar tudo</button>
        </div>
        <div class="equip-grid">
          ${EQUIPMENT.map(eq => `
            <label class="equip-item">
              <input type="checkbox" data-equip="${eq.id}" ${selected.has(eq.id) ? 'checked' : ''}/>
              <span>${eq.nome}</span>
            </label>`).join('')}
        </div>
        <p class="hint" style="margin-top: 12px;">Exercícios que usam só o peso do corpo continuam disponíveis mesmo sem marcar nada.</p>
        <div id="equip-saved" class="saved-flag" hidden>Salvo ✓</div>
      </div>
    </div>`;
}

function renderExerciciosAbaHTML() {
  return `
    <div class="lib-filters">
      <input type="text" id="f-busca" placeholder="Buscar por nome..." value="${escapeHtml(filtroBusca)}"/>
      <select id="f-musculo">
        <option value="todos">Todos os músculos</option>
        ${MUSCLES.map(m => `<option value="${m.id}" ${filtroMusculo === m.id ? 'selected' : ''}>${m.nome}</option>`).join('')}
      </select>
      <label class="lib-filter-check">
        <input type="checkbox" id="f-disp" ${somenteDisponiveis ? 'checked' : ''}/>
        <span>Só o que dá pra fazer com meus equipamentos</span>
      </label>
    </div>
    <div class="exlist" id="exlist"></div>`;
}

function bindEquipamentos(aoMudar) {
  const det = document.getElementById('equip-det');
  if (det) {
    det.addEventListener('toggle', () => {
      equipAberto = det.open;
      if (det.open) marcarEquipamentosVistos();
    });
  }

  APP.querySelectorAll('[data-equip]').forEach(input => {
    input.addEventListener('change', () => {
      const set = new Set(getEquip());
      if (input.checked) set.add(input.dataset.equip); else set.delete(input.dataset.equip);
      setEquip([...set]);
      const cont = document.getElementById('equip-count');
      if (cont) cont.textContent = `${set.size} marcado(s)`;
      const el = document.getElementById('equip-saved');
      if (el) {
        el.hidden = false;
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.hidden = true; }, 1200);
      }
      aoMudar();
    });
  });

  const btnContinuar = document.getElementById('btn-equip-continuar');
  if (btnContinuar) btnContinuar.addEventListener('click', () => {
    voltarParaMontar = false;
    equipAberto = false;
    currentTab = 'meus-treinos';
    render();
    openMontarNovo();
  });

  const btnMarcar = document.getElementById('btn-marcar-todos');
  if (btnMarcar) btnMarcar.addEventListener('click', () => {
    setEquip(EQUIPMENT.map(eq => eq.id));
    renderExercicios();
    toast('Todos marcados');
  });
  const btnDesmarcar = document.getElementById('btn-desmarcar-todos');
  if (btnDesmarcar) btnDesmarcar.addEventListener('click', () => {
    setEquip([]);
    renderExercicios();
    toast('Todos desmarcados');
  });
}

// ================= DADOS / BACKUP (dentro de Ajustes) =================
function renderDados() {
  const tsBackup = getUltimoBackup();
  const backupAtrasado = tsBackup === null || Math.floor((Date.now() - tsBackup) / 86400000) >= BACKUP_AVISO_DIAS;
  const textoBackup = tsBackup === null
    ? 'Nenhum backup feito ainda neste aparelho.'
    : `Último backup: <strong>${textoHaQuantoTempo(tsBackup)}</strong> (${new Date(tsBackup).toLocaleDateString('pt-BR')})`;
  CONFIG_MOUNT.innerHTML = `
    <section>
      <p class="hint">
        Hoje: ${getEquip().length} equipamento(s) marcado(s), ${getTreinos().length} treino(s) montado(s),
        ${getHistorico().length} sessão(ões) no histórico, ${getCustomExercises().length} exercício(s) personalizado(s),
        ${getDieta().length} refeição(ões) registrada(s), ${getCustomFoods().length} alimento(s) personalizado(s),
        ${getAgua().length} registro(s) de água${getSessaoAtiva() ? ', 1 sessão em andamento' : ''}.
      </p>
      <p class="hint backup-ultimo ${backupAtrasado ? 'atrasado' : ''}">${textoBackup}</p>
      <div class="backup-actions">
        <button id="btn-exportar-dados" class="btn btn-accent">${ICON_DOWNLOAD}Exportar backup (.json)</button>
        <button id="btn-importar-dados" class="btn btn-ghost">${ICON_UPLOAD}Importar backup (.json)</button>
      </div>
      <p class="hint backup-note">Importar um arquivo <strong>substitui</strong> todos os dados atuais deste aparelho (equipamentos, treinos, histórico e sessão em andamento).</p>
    </section>`;

  document.getElementById('btn-exportar-dados').addEventListener('click', exportarDados);
  document.getElementById('btn-importar-dados').addEventListener('click', () => {
    document.getElementById('input-importar-json').click();
  });
}

// registra a data do backup e atualiza o que estiver na tela (Ajustes / aviso da home)
function aoConcluirBackup() {
  marcarBackupFeito();
  if (!MODAL_CONFIG.hidden) renderDados();
  if (currentTab === 'meus-treinos') render();
}

async function exportarDados() {
  const payload = {
    app: 'maromba',
    versao: 1,
    exportadoEm: new Date().toISOString(),
    dados: {
      equipamentos: getEquip(),
      treinos: getTreinos(),
      historico: getHistorico(),
      sessaoAtiva: getSessaoAtiva(),
      exerciciosPersonalizados: getCustomExercises(),
      dieta: getDieta(),
      alimentosPersonalizados: getCustomFoods(),
      metaDieta: getMetaDieta(),
      agua: getAgua(),
      aguaConfig: getAguaConfig(),
      metaSemana: getMetaSemana(),
      alimentosFavoritos: getFavFoods(),
    },
  };
  const json = JSON.stringify(payload, null, 2);
  const nomeArquivo = `maromba-backup-${todayISO()}.json`;

  // App Android (Capacitor): salva o arquivo no cache e abre o menu de
  // compartilhar do Android (Drive, WhatsApp, e-mail...). O download por
  // link com Blob não funciona de forma confiável dentro do WebView.
  const cap = window.Capacitor;
  const plugins = cap && cap.Plugins;
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && plugins && plugins.Filesystem && plugins.Share) {
    try {
      const r = await plugins.Filesystem.writeFile({
        path: nomeArquivo,
        data: json,
        directory: 'CACHE',
        encoding: 'utf8',
      });
      await plugins.Share.share({
        title: 'Backup do Maromba',
        url: r.uri,
        dialogTitle: 'Salvar backup',
      });
      aoConcluirBackup();
    } catch (e) {
      // fechar o menu de compartilhar sem escolher nada não é erro
      if (/cancel/i.test(String((e && e.message) || e))) return;
      console.warn('Falha ao compartilhar backup', e);
      toast('Não foi possível compartilhar o backup.');
    }
    return;
  }

  // Navegador (ou plugins ainda não instalados): baixa o arquivo direto.
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    aoConcluirBackup();
    toast('Backup exportado!');
  } catch (e) {
    console.warn('Falha ao exportar', e);
    toast('Não foi possível gerar o arquivo de backup.');
  }
}

// aceita tanto o formato do botão "Exportar" quanto o JSON colado manualmente
// via console (ver README) — nesse caso os campos vêm como string, não array.
function normalizarCampoImportado(v) {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch (e) { return null; }
  }
  return v;
}

function importarDados(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let payload;
    try {
      payload = JSON.parse(reader.result);
    } catch (e) {
      toast('Arquivo inválido: não é um JSON legível.');
      return;
    }
    const bruto = (payload && typeof payload === 'object' && payload.dados) ? payload.dados : payload;
    if (!bruto || typeof bruto !== 'object') {
      toast('Arquivo não reconhecido como backup do Maromba.');
      return;
    }
    const equipamentos = normalizarCampoImportado(bruto.equipamentos);
    const treinos = normalizarCampoImportado(bruto.treinos);
    const historico = normalizarCampoImportado(bruto.historico);
    const exerciciosPersonalizados = normalizarCampoImportado(bruto.exerciciosPersonalizados);
    const dieta = normalizarCampoImportado(bruto.dieta);
    const alimentosPersonalizados = normalizarCampoImportado(bruto.alimentosPersonalizados);
    const agua = normalizarCampoImportado(bruto.agua);
    if (!Array.isArray(equipamentos) && !Array.isArray(treinos) && !Array.isArray(historico) && !Array.isArray(exerciciosPersonalizados)
        && !Array.isArray(dieta) && !Array.isArray(alimentosPersonalizados) && !Array.isArray(agua)) {
      toast('Nenhum dado reconhecido nesse arquivo.');
      return;
    }

    showConfirm('Importar vai substituir todos os dados atuais (equipamentos, treinos, histórico, exercícios personalizados, dieta, alimentos personalizados, água e metas) por este arquivo. Continuar?', () => {
      if (Array.isArray(equipamentos)) setEquip(equipamentos);
      if (Array.isArray(treinos)) setTreinos(treinos);
      if (Array.isArray(historico)) setHistorico(historico);
      if (Array.isArray(exerciciosPersonalizados)) setCustomExercises(exerciciosPersonalizados);
      if (Array.isArray(dieta)) setDieta(dieta);
      if (Array.isArray(alimentosPersonalizados)) setCustomFoods(alimentosPersonalizados);
      if (Array.isArray(agua)) setAgua(agua);
      if ('sessaoAtiva' in bruto) setSessaoAtiva(normalizarCampoImportado(bruto.sessaoAtiva) || bruto.sessaoAtiva || null);
      const metaDieta = normalizarCampoImportado(bruto.metaDieta);
      if (metaDieta && typeof metaDieta === 'object') setMetaDieta(metaDieta);
      const aguaConfig = normalizarCampoImportado(bruto.aguaConfig);
      if (aguaConfig && typeof aguaConfig === 'object') setAguaConfig(aguaConfig);
      const metaSemana = normalizarCampoImportado(bruto.metaSemana);
      if (typeof metaSemana === 'number') setMetaSemana(metaSemana);
      const favoritos = normalizarCampoImportado(bruto.alimentosFavoritos);
      if (Array.isArray(favoritos)) setFavFoods(favoritos);
      agendarLembretesAgua(getAguaConfig());
      aguaChipSel = null; // recalcula o chip a partir do ultimoMl do backup
      toast('Dados importados com sucesso!');
      closeConfig();
      currentTab = 'meus-treinos';
      render();
    }, { okLabel: 'Importar e substituir' });
  };
  reader.onerror = () => toast('Não foi possível ler o arquivo.');
  reader.readAsText(file);
}

// ================= EXERCÍCIOS E EQUIPAMENTOS =================
function renderExercicios() {
  if (subAbaExercicios === 'equipamentos') marcarEquipamentosVistos();
  const equipMarcados = getEquip();
  const equipSet = new Set(equipMarcados);
  const termoBusca = filtroBusca.trim().toLowerCase();
  const quantidadeExercicios = allExercises().filter(ex =>
    (filtroMusculo === 'todos' || ex.musculos.primarios.includes(filtroMusculo) || ex.musculos.secundarios.includes(filtroMusculo))
    && (!somenteDisponiveis || exerciseAvailable(ex, equipSet))
    && (!termoBusca || ex.nome.toLowerCase().includes(termoBusca))
  ).length;
  APP.innerHTML = `
    <section class="panel">
      <div class="section-head">
        <h1>Biblioteca</h1>
        <button id="btn-novo-exercicio-custom" class="btn btn-ghost btn-small" style="margin-top:0; ${subAbaExercicios === 'equipamentos' ? 'visibility: hidden; pointer-events: none;' : ''}">+ Exercício</button>
      </div>

      <div class="lib-tabs">
        <button type="button" class="tab-btn ${subAbaExercicios === 'exercicios' ? 'active' : ''}" id="btn-sub-exercicios">Exercícios (${quantidadeExercicios})</button>
        <button type="button" class="tab-btn ${subAbaExercicios === 'equipamentos' ? 'active' : ''}" id="btn-sub-equipamentos">Equipamentos${equipMarcados.length ? ` (${equipMarcados.length})` : ''}</button>
      </div>

      ${subAbaExercicios === 'exercicios' && !equipMarcados.length ? `
        <div class="info-block-msg lib-equipment-hint">
          ℹ️ <strong>Marque seus equipamentos primeiro:</strong> na aba “Equipamentos”, escolha os aparelhos para filtrar os exercícios disponíveis.
        </div>` : ''}

      ${subAbaExercicios === 'equipamentos' ? renderEquipamentosAbaHTML() : renderExerciciosAbaHTML()}
    </section>`;

  document.getElementById('btn-sub-exercicios').addEventListener('click', () => {
    subAbaExercicios = 'exercicios';
    renderExercicios();
  });
  document.getElementById('btn-sub-equipamentos').addEventListener('click', () => {
    subAbaExercicios = 'equipamentos';
    renderExercicios();
  });

  if (subAbaExercicios === 'equipamentos') {
    bindEquipamentos(() => {});
  } else {
    const btnNovo = document.getElementById('btn-novo-exercicio-custom');
    if (btnNovo) btnNovo.addEventListener('click', openExercicioCustom);
    document.getElementById('f-busca').addEventListener('input', e => { filtroBusca = e.target.value; renderListaExercicios(); });
    document.getElementById('f-musculo').addEventListener('change', e => { filtroMusculo = e.target.value; renderListaExercicios(); });
    document.getElementById('f-disp').addEventListener('change', e => { somenteDisponiveis = e.target.checked; renderListaExercicios(); });
    renderListaExercicios();
  }
}

function renderListaExercicios() {
  const el = document.getElementById('exlist');
  if (!el) return;
  const equipSet = new Set(getEquip());
  let lista = allExercises().filter(ex =>
    filtroMusculo === 'todos' || ex.musculos.primarios.includes(filtroMusculo) || ex.musculos.secundarios.includes(filtroMusculo)
  );
  if (somenteDisponiveis) lista = lista.filter(ex => exerciseAvailable(ex, equipSet));
  const termoBusca = filtroBusca.trim().toLowerCase();
  if (termoBusca) lista = lista.filter(ex => ex.nome.toLowerCase().includes(termoBusca));
  lista = lista.slice().sort((a, b) => COLLATOR_PT.compare(a.nome, b.nome));

  el.innerHTML = lista.length
    ? lista.map(ex => exCardHTML(ex, equipSet)).join('')
    : '<p class="empty">Nenhum exercício encontrado com esse filtro.</p>';
  const tabExercicios = document.getElementById('btn-sub-exercicios');
  if (tabExercicios) tabExercicios.textContent = `Exercícios (${lista.length})`;

  el.querySelectorAll('.ex-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      exercicioAberto = exercicioAberto === id ? null : id;
      renderListaExercicios();
    });
  });
  el.querySelectorAll('[data-del-custom]').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      showConfirm('Excluir este exercício personalizado? Treinos que já o usam vão manter apenas o nome salvo.', () => {
        setCustomExercises(getCustomExercises().filter(e => e.id !== btn.dataset.delCustom));
        exercicioAberto = null;
        renderListaExercicios();
        toast('Exercício personalizado excluído.');
      });
    });
  });
  if (exercicioAberto) {
    const box = document.getElementById('ex-detail-mount');
    const exAtual = exerciseById(exercicioAberto);
    if (box && exAtual) renderBodyMap(box, exAtual.musculos.primarios, exAtual.musculos.secundarios);
  }
}

function exCardHTML(ex, equipSet) {
  const disponivel = exerciseAvailable(ex, equipSet);
  const faltando = ex.equipamento.filter(id => !equipSet.has(id)).map(id => EQUIPMENT.find(e => e.id === id)?.nome);
  const aberto = exercicioAberto === ex.id;
  return `
    <div class="ex-card ex-card-row ${disponivel ? '' : 'ex-indisponivel'} ${aberto ? 'ex-aberto' : ''}" data-id="${ex.id}">
      <div class="ex-card-summary">
        <div class="ex-card-info">
          <div class="ex-card-head">
            <span class="ex-card-title">${escapeHtml(ex.nome)}</span>
            <span class="ex-card-head-right">
          ${ex.personalizado ? '<span class="badge-custom">personalizado</span>' : ''}
          ${disponivel ? '' : '<span class="badge-off">falta equipamento</span>'}
            </span>
          </div>
          <div class="ex-card-tags">
            ${ex.musculos.primarios.map(m => `<span class="tag-subtle">${muscleName(m)}</span>`).join('')}
          </div>
        </div>
        <span class="ex-card-chevron" aria-hidden="true">${aberto ? '⌄' : '›'}</span>
      </div>
      ${aberto ? `
        <div class="ex-detail">
          <div id="ex-detail-mount" class="bodymap-mount small"></div>
          <div class="ex-detail-info">
            <p><strong>Equipamento necessário:</strong> ${ex.equipamento.length ? ex.equipamento.map(id => EQUIPMENT.find(e => e.id === id)?.nome).join(', ') : 'Nenhum (peso do corpo)'}</p>
            ${!disponivel ? `<p class="missing">Falta: ${faltando.join(', ')}</p>` : ''}
            ${historicoResumoExercicio(ex.id)}
            ${ex.personalizado ? `<button class="btn btn-danger btn-small" data-del-custom="${ex.id}">${ICON_TRASH}Excluir exercício personalizado</button>` : ''}
          </div>
        </div>` : ''}
    </div>`;
}

function historicoResumoExercicio(exId) {
  const hist = getHistorico();
  let ultimo = null;
  for (let i = hist.length - 1; i >= 0; i--) {
    const e = hist[i].exercicios.find(x => x.exercicioId === exId);
    if (e && e.sets.length) {
      const maxSet = e.sets.reduce((a, b) => (b.peso > a.peso ? b : a), e.sets[0]);
      ultimo = { data: hist[i].data, peso: maxSet.peso, reps: maxSet.reps };
      break;
    }
  }
  if (!ultimo) return '<p class="hint">Ainda sem histórico para este exercício.</p>';
  return `<p class="hint">Última carga registrada: <strong>${ultimo.peso}kg</strong> × ${ultimo.reps} em ${formatDateBR(ultimo.data)}</p>`;
}

// Carga da última sessão em que o exercício foi feito: a série mais pesada dela.
// Devolve { data, peso, reps } ou null se nunca foi feito.
function ultimaCargaExercicio(exId) {
  let recente = null; // sessão mais recente (empate de data: a gravada depois)
  getHistorico().forEach(s => {
    const e = (s.exercicios || []).find(x => x.exercicioId === exId);
    if (!e || !e.sets || !e.sets.length) return;
    if (!recente || s.data >= recente.data) recente = { data: s.data, sets: e.sets };
  });
  if (!recente) return null;
  const top = recente.sets.reduce((a, b) => (b.peso > a.peso ? b : a), recente.sets[0]);
  return { data: recente.data, peso: top.peso, reps: top.reps };
}

// Maior carga já registrada no histórico para o exercício (null = nunca feito).
function maiorCargaHistorico(exId) {
  let max = null;
  getHistorico().forEach(s => (s.exercicios || []).forEach(e => {
    if (e.exercicioId !== exId) return;
    (e.sets || []).forEach(set => {
      const p = Number(set.peso) || 0;
      if (max === null || p > max) max = p;
    });
  }));
  return max;
}
// Recordes pessoais de uma sessão: exercícios cuja maior carga supera o
// histórico. A primeira vez de um exercício não conta (não há o que bater).
function recordesDaSessao(sessao) {
  const out = [];
  sessao.exercicios.forEach(cfg => {
    if (!cfg.sets.length) return;
    const novo = Math.max(...cfg.sets.map(s => Number(s.peso) || 0));
    if (novo <= 0) return;
    const antes = maiorCargaHistorico(cfg.exercicioId);
    if (antes !== null && novo > antes) out.push({ exercicioId: cfg.exercicioId, peso: novo, anterior: antes });
  });
  return out;
}
// Observação mais recente anotada para o exercício (ex.: "banco no furo 4").
function ultimaObsExercicio(exId) {
  let achada = null;
  getHistorico().forEach(s => {
    const e = (s.exercicios || []).find(x => x.exercicioId === exId);
    if (!e || !e.obs) return;
    if (!achada || s.data >= achada.data) achada = { data: s.data, obs: e.obs };
  });
  return achada;
}
function nomeExercicio(exId) {
  const ex = exerciseById(exId);
  return ex ? ex.nome : exId;
}

// ================= EXERCÍCIO PERSONALIZADO (modal) =================
function ensureDraftExercicioCustom() {
  if (!draftExercicioCustom) draftExercicioCustom = { nome: '', equipamento: [], primarios: [], secundarios: [] };
}

function resetModalCloseButton(mount, buttonId) {
  const button = document.getElementById(buttonId);
  const panel = mount.parentElement;
  if (button && panel && button.parentElement !== panel) panel.insertBefore(button, mount);
}

function attachModalCloseButton(mount, buttonId) {
  const button = document.getElementById(buttonId);
  const header = mount.querySelector('.modal-header');
  if (button && header) header.append(button);
}

function renderExercicioCustom() {
  ensureDraftExercicioCustom();
  const d = draftExercicioCustom;

  resetModalCloseButton(EXERCICIO_CUSTOM_MOUNT, 'btn-close-exercicio-custom');
  EXERCICIO_CUSTOM_MOUNT.innerHTML = `
    <section>
      <div class="modal-header">
        <h1>Novo exercício personalizado</h1>
      </div>
      <div class="modal-body">
        <p class="sub">Cadastre um exercício que não está na biblioteca fixa.</p>

        <div class="field-row">
          <input id="custom-nome" type="text" placeholder="Nome do exercício/aparelho" value="${escapeHtml(d.nome)}"/>
        </div>

        <div class="field-row">
          <label>Músculos primários (obrigatório escolher ao menos 1)</label>
          <div class="selectable-grid">
            ${MUSCLES.map(m => `
            <label class="selectable-card">
              <input type="checkbox" data-custom-primario="${m.id}" ${d.primarios.includes(m.id) ? 'checked' : ''}/>
              <span>${m.nome}</span>
            </label>`).join('')}
          </div>
        </div>

        <div class="field-row">
          <label>Músculos secundários (opcional)</label>
          <div class="selectable-grid">
            ${MUSCLES.map(m => `
            <label class="selectable-card">
              <input type="checkbox" data-custom-secundario="${m.id}" ${d.secundarios.includes(m.id) ? 'checked' : ''}/>
              <span>${m.nome}</span>
            </label>`).join('')}
          </div>
        </div>

        <div class="field-row">
          <label>Equipamento necessário (deixe tudo desmarcado para "peso do corpo")</label>
          <div class="selectable-grid">
            ${EQUIPMENT.map(eq => `
            <label class="selectable-card">
              <input type="checkbox" data-custom-equip="${eq.id}" ${d.equipamento.includes(eq.id) ? 'checked' : ''}/>
              <span>${eq.nome}</span>
            </label>`).join('')}
          </div>
        </div>

        ${getCustomExercises().length ? `
          <h2 class="subtitle">Seus exercícios personalizados</h2>
          <div class="exlist">
            ${getCustomExercises().map(ex => `
              <div class="ex-card">
                <div class="ex-card-head">
                  <span class="ex-nome">${escapeHtml(ex.nome)}</span>
                  <button class="btn-remove" data-del-custom-inline="${ex.id}" title="Excluir">✕</button>
                </div>
                <div class="chip-row">
                  ${ex.musculos.primarios.map(m => `<span class="chip chip-primary">${muscleName(m)}</span>`).join('')}
                  ${ex.musculos.secundarios.map(m => `<span class="chip chip-secondary">${muscleName(m)}</span>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>` : ''}
      </div>
      <div class="modal-footer">
        <div class="actions-row">
          <button id="btn-salvar-exercicio-custom" class="btn btn-accent">Salvar exercício</button>
        </div>
      </div>
    </section>`;
  attachModalCloseButton(EXERCICIO_CUSTOM_MOUNT, 'btn-close-exercicio-custom');

  document.getElementById('custom-nome').addEventListener('input', e => { d.nome = e.target.value; });
  EXERCICIO_CUSTOM_MOUNT.querySelectorAll('[data-custom-primario]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.customPrimario;
      if (input.checked) { d.primarios.push(id); d.secundarios = d.secundarios.filter(m => m !== id); }
      else d.primarios = d.primarios.filter(m => m !== id);
      renderExercicioCustom();
    });
  });
  EXERCICIO_CUSTOM_MOUNT.querySelectorAll('[data-custom-secundario]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.customSecundario;
      if (input.checked) { d.secundarios.push(id); d.primarios = d.primarios.filter(m => m !== id); }
      else d.secundarios = d.secundarios.filter(m => m !== id);
      renderExercicioCustom();
    });
  });
  EXERCICIO_CUSTOM_MOUNT.querySelectorAll('[data-custom-equip]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.customEquip;
      if (input.checked) d.equipamento.push(id); else d.equipamento = d.equipamento.filter(e => e !== id);
    });
  });
  document.getElementById('btn-salvar-exercicio-custom').addEventListener('click', salvarExercicioCustom);
  EXERCICIO_CUSTOM_MOUNT.querySelectorAll('[data-del-custom-inline]').forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirm('Excluir este exercício personalizado?', () => {
        setCustomExercises(getCustomExercises().filter(e => e.id !== btn.dataset.delCustomInline));
        renderExercicioCustom();
        toast('Exercício personalizado excluído.');
      });
    });
  });
}

function salvarExercicioCustom() {
  const d = draftExercicioCustom;
  const nome = d.nome.trim();
  if (!nome) { toast('Dê um nome ao exercício antes de salvar.'); return; }
  if (d.primarios.length === 0) { toast('Escolha ao menos um músculo primário.'); return; }
  const novo = {
    id: 'custom_' + uid(),
    nome,
    equipamento: [...d.equipamento],
    musculos: { primarios: [...d.primarios], secundarios: [...d.secundarios] },
    personalizado: true,
  };
  setCustomExercises([...getCustomExercises(), novo]);
  const viaMontar = !MODAL_MONTAR.hidden && !!draftTreino;
  closeExercicioCustom();
  if (viaMontar) {
    draftTreino.exercicios.push({ exercicioId: novo.id, series: 3, repeticoes: 10, peso: 0, pausa: 60 });
    renderMontarTreino();
    toast('Exercício criado e adicionado ao treino!');
    return;
  }
  currentTab = 'exercicios';
  render();
  toast('Exercício personalizado salvo!');
}

// ================= MONTAR TREINO (modal, aberto pelo botão +) =================
function ensureDraft() {
  if (!draftTreino) draftTreino = { id: null, nome: '', exercicios: [] };
}

function renderMontarTreino() {
  ensureDraft();
  const musculos = unionMuscles(draftTreino.exercicios);
  const estimSec = estimateTreinoSeconds(draftTreino.exercicios);
  const total = draftTreino.exercicios.length;
  const temNome = !!draftTreino.nome.trim();

  resetModalCloseButton(MONTAR_MOUNT, 'btn-close-montar');
  MONTAR_MOUNT.innerHTML = `
    <section>
      <div class="modal-header">
        <h1>${draftTreino.id ? 'Editar treino' : 'Adicionar treino'}</h1>
      </div>
      <div class="modal-body">
        <div class="field-row">
          <label>Nome do treino <span class="req">*</span></label>
          <input id="treino-nome" type="text" placeholder="Ex.: Treino A - Peito e Tríceps" value="${escapeHtml(draftTreino.nome)}"/>
        </div>

        <p class="hint refeicao-bloqueio info-block-msg" id="treino-bloqueio" ${temNome ? 'hidden' : ''}>
          Digite o nome do treino acima para liberar os exercícios.
        </p>

        <div id="treino-exercicios-bloco" ${temNome ? '' : 'hidden'}>
          <div class="montar-sec-head">
            <h2>Exercícios no treino</h2>
            <span class="montar-count">${total}</span>
          </div>
          <div class="draft-list">
            ${total
              ? draftTreino.exercicios.map((cfg, i, arr) => draftRowHTML(cfg, i, arr.length)).join('')
              : '<p class="empty">Nenhum exercício adicionado ainda.</p>'}
          </div>

          <!-- Seletor de Exercícios Simplificado -->
          <div class="muscle-add-box" style="margin-top:20px;">
            <h2 style="font-size:15px; margin-bottom:10px;">+ Adicionar exercícios</h2>
            <div class="filters-row" style="margin-bottom:10px;">
              <input type="text" id="busca-montagem" placeholder="Buscar exercício por nome..." value="${escapeHtml(buscaMontagem)}"/>
              <select id="filtro-musculo-montagem">
                <option value="todos">Todos os músculos</option>
                ${MUSCLES.map(m => `<option value="${m.id}" ${musculosAlvoMontagem.has(m.id) ? 'selected' : ''}>${m.nome}</option>`).join('')}
              </select>
            </div>
            <div class="picker-list" id="picker-list"></div>
            <button type="button" id="btn-novo-exercicio-custom-montar" class="btn btn-ghost btn-small" style="width:100%; margin-top:10px;">+ Criar exercício personalizado</button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="summary-bar summary-compact">
          <div>
            <span class="summary-label">Músculos no treino</span>
            <div class="chip-row">${musculos.length ? musculos.map(m => `<span class="chip chip-primary">${muscleName(m)}</span>`).join('') : '<span class="hint">—</span>'}</div>
          </div>
          <div>
            <span class="summary-label">Tempo estimado</span>
            <div class="summary-value">${formatDuration(estimSec)}</div>
          </div>
        </div>
        <div class="actions-row">
          <button id="btn-salvar-treino" class="btn btn-accent">Salvar treino</button>
          <button id="btn-limpar-treino" class="btn btn-ghost">Limpar</button>
        </div>
      </div>
    </section>`;
  attachModalCloseButton(MONTAR_MOUNT, 'btn-close-montar');

  document.getElementById('treino-nome').addEventListener('input', e => {
    draftTreino.nome = e.target.value;
    const temNome = !!draftTreino.nome.trim();
    const bloco = document.getElementById('treino-exercicios-bloco');
    const bloq = document.getElementById('treino-bloqueio');
    if (bloco) bloco.hidden = !temNome;
    if (bloq) bloq.hidden = temNome;
  });

  const selMusculo = document.getElementById('filtro-musculo-montagem');
  if (selMusculo) {
    selMusculo.addEventListener('change', e => {
      musculosAlvoMontagem.clear();
      if (e.target.value !== 'todos') {
        musculosAlvoMontagem.add(e.target.value);
      }
      renderPickerList();
    });
  }

  document.getElementById('busca-montagem').addEventListener('input', e => {
    buscaMontagem = e.target.value;
    renderPickerList();
  });
  document.getElementById('btn-novo-exercicio-custom-montar').addEventListener('click', openExercicioCustom);
  renderPickerList();

  MONTAR_MOUNT.querySelectorAll('[data-remove-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      draftTreino.exercicios.splice(Number(btn.dataset.removeIdx), 1);
      renderMontarTreino();
    });
  });
  MONTAR_MOUNT.querySelectorAll('[data-move-up]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.moveUp);
      if (idx <= 0) return;
      const arr = draftTreino.exercicios;
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      renderMontarTreino();
    });
  });
  MONTAR_MOUNT.querySelectorAll('[data-move-down]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.moveDown);
      const arr = draftTreino.exercicios;
      if (idx >= arr.length - 1) return;
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      renderMontarTreino();
    });
  });
  MONTAR_MOUNT.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      const idx = Number(input.dataset.idx), field = input.dataset.field;
      let val = Number(input.value);
      if (Number.isNaN(val) || val < 0) val = 0;
      draftTreino.exercicios[idx][field] = val;
      updateResumoInline();
    });
  });

  document.getElementById('btn-salvar-treino').addEventListener('click', salvarTreino);
  document.getElementById('btn-limpar-treino').addEventListener('click', () => {
    draftTreino = { id: null, nome: '', exercicios: [] };
    musculosAlvoMontagem = new Set();
    buscaMontagem = '';
    renderMontarTreino();
  });
}

// lista de exercícios do seletor: só redesenha a lista (não o modal inteiro),
// então digitar na busca não perde o foco
function renderPickerList() {
  const el = document.getElementById('picker-list');
  if (!el) return;
  const equipSet = new Set(getEquip());
  const jaAdicionados = new Set(draftTreino.exercicios.map(e => e.exercicioId));
  const termo = buscaMontagem.trim().toLowerCase();
  const opcoes = allExercises()
    .filter(ex => exerciseAvailable(ex, equipSet) && !jaAdicionados.has(ex.id))
    .filter(ex => musculosAlvoMontagem.size === 0 || ex.musculos.primarios.some(m => musculosAlvoMontagem.has(m)))
    .filter(ex => !termo || ex.nome.toLowerCase().includes(termo))
    .sort((a, b) => COLLATOR_PT.compare(a.nome, b.nome));

  el.innerHTML = opcoes.length
    ? opcoes.map(ex => `
        <button type="button" class="picker-item" data-add-ex="${ex.id}">
          <span class="picker-item-txt">
            <span class="picker-item-name">${escapeHtml(ex.nome)}</span>
            <span class="picker-item-musc">${ex.musculos.primarios.map(m => muscleName(m)).join(', ')}</span>
          </span>
          ${ICO_PLUS}
        </button>`).join('')
    : '<p class="empty">Nenhum exercício disponível com esse filtro.</p>';

  el.querySelectorAll('[data-add-ex]').forEach(btn => {
    btn.addEventListener('click', () => {
      draftTreino.exercicios.push({ exercicioId: btn.dataset.addEx, series: 3, repeticoes: 10, peso: 0, pausa: 60 });
      renderMontarTreino();

      const pickerBox = document.querySelector('.muscle-add-box');
      if (pickerBox) {
        pickerBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
}

function draftRowHTML(cfg, i, total) {
  const ex = exerciseById(cfg.exercicioId) || { nome: cfg.exercicioId, musculos: { primarios: [] } };
  return `
    <div class="draft-row draft-row-reorderable">
      <div class="reorder-btns">
        <button class="btn-reorder" data-move-up="${i}" title="Mover para cima" ${i === 0 ? 'disabled' : ''}>${ICON_UP}</button>
        <button class="btn-reorder" data-move-down="${i}" title="Mover para baixo" ${i === total - 1 ? 'disabled' : ''}>${ICON_DOWN}</button>
      </div>
      <div class="draft-row-body">
        <div class="draft-row-head">
          <span class="ex-nome">${ex.nome}</span>
          <button class="btn-remove" data-remove-idx="${i}" title="Remover">✕</button>
        </div>
        <div class="draft-row-musc">${ex.musculos.primarios.map(m => muscleName(m)).join(' · ')}</div>
        <div class="draft-fields draft-fields-4">
          <label>Séries<input type="number" min="1" data-idx="${i}" data-field="series" value="${cfg.series}"/></label>
          <label>Reps<input type="number" min="1" data-idx="${i}" data-field="repeticoes" value="${cfg.repeticoes}"/></label>
          <label>Kg<input type="number" min="0" step="0.5" data-idx="${i}" data-field="peso" value="${cfg.peso}"/></label>
          <label>Pausa (s)<input type="number" min="0" step="5" data-idx="${i}" data-field="pausa" value="${cfg.pausa}"/></label>
        </div>
      </div>
    </div>`;
}

function updateResumoInline() {
  const musculos = unionMuscles(draftTreino.exercicios);
  const estimSec = estimateTreinoSeconds(draftTreino.exercicios);
  const chipRow = MONTAR_MOUNT.querySelector('.summary-bar .chip-row');
  const val = MONTAR_MOUNT.querySelector('.summary-value');
  if (chipRow) chipRow.innerHTML = musculos.length ? musculos.map(m => `<span class="chip chip-primary">${muscleName(m)}</span>`).join('') : '<span class="hint">—</span>';
  if (val) val.textContent = formatDuration(estimSec);
}

function salvarTreino() {
  const nome = draftTreino.nome.trim();
  if (!nome) { toast('Dê um nome ao treino antes de salvar.'); return; }
  if (draftTreino.exercicios.length === 0) { toast('Adicione ao menos um exercício.'); return; }
  const treinos = getTreinos();
  if (draftTreino.id) {
    const idx = treinos.findIndex(t => t.id === draftTreino.id);
    if (idx >= 0) treinos[idx] = { ...draftTreino, nome };
  } else {
    treinos.push({ ...draftTreino, nome, id: uid(), criadoEm: Date.now() });
  }
  setTreinos(treinos);
  draftTreino = null;
  musculosAlvoMontagem = new Set();
  closeMontar();
  currentTab = 'meus-treinos';
  render();
  toast('Treino salvo!');
}

// ================= MEUS TREINOS (tela principal) =================
// Ícones e modelos usados na tela inicial
const _svg = p => `<svg class="icon" viewBox="0 0 24 24">${p}</svg>`;
const ICO_PLUS = _svg('<path d="M12 5v14M5 12h14"/>');
const ICO_DUMBBELL = _svg('<path d="M2 9v6"/><path d="M22 9v6"/><path d="M4 7v10"/><path d="M20 7v10"/><path d="M7 12h10"/>');
const ICO_CAL = _svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>');
const ICO_CLOCK = _svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const ICO_DROP = _svg('<path d="M12 2.5c2.8 3.6 7 9.4 7 13a7 7 0 1 1-14 0c0-3.6 4.2-9.4 7-13z"/>');
const ICO_FOOD = _svg('<path d="M6 2v6a2 2 0 0 0 4 0V2"/><path d="M8 2v20"/><path d="M18 2c-2.2 0-3.5 2.5-3.5 6.5S15.8 15 18 15"/><path d="M18 2v20"/>');

function emptyStateHTML({ icon, title, message }) {
  return `
    <div class="empty-state-card">
      <div class="empty-state-ico">${icon}</div>
      <strong class="empty-state-title">${escapeHtml(title)}</strong>
      <p class="empty-state-msg">${escapeHtml(message)}</p>
    </div>`;
}

// Cartão do topo da home quando há treino em andamento.
function continuarTreinoHTML(sessao) {
  if (!sessao) return '';
  const total = sessao.exercicios.length;
  const idx = sessao.exercicioAtualIdx;
  let detalhe;
  if (idx >= total) {
    detalhe = 'Todos os exercícios feitos — falta salvar no histórico';
  } else {
    const cfg = sessao.exercicios[idx];
    const ex = exerciseById(cfg.exercicioId);
    const serie = cfg.sets.length >= cfg.seriesAlvo ? 'séries concluídas' : `série ${cfg.sets.length + 1}/${cfg.seriesAlvo}`;
    detalhe = `${escapeHtml(ex ? ex.nome : 'Exercício')} · ${serie} · exercício ${idx + 1} de ${total}`;
  }
  return `
    <div class="continuar-card" role="region" aria-label="Treino em andamento">
      <div class="continuar-info">
        <span class="continuar-tag"><span class="live-dot"></span>Treino em andamento</span>
        <strong class="continuar-nome">${escapeHtml(sessao.treinoNome)}</strong>
        <span class="continuar-det">${detalhe}</span>
        <span class="continuar-tempo mono" id="continuar-tempo"></span>
      </div>
      <button class="btn btn-accent" data-continuar>Continuar treino</button>
    </div>`;
}

function iniciarTempoCartaoContinuar(sessao) {
  if (sessaoTimers.homeInt) clearInterval(sessaoTimers.homeInt);
  sessaoTimers.homeInt = null;
  const el = document.getElementById('continuar-tempo');
  if (!el) return;
  const tick = () => {
    if (!el.isConnected) { clearInterval(sessaoTimers.homeInt); sessaoTimers.homeInt = null; return; }
    el.textContent = 'Tempo: ' + formatClock((Date.now() - sessao.iniciadoEm) / 1000);
  };
  tick();
  sessaoTimers.homeInt = setInterval(tick, 1000);
}

// Aviso suave de backup na home (ver avisoBackupPendente).
function avisoBackupHTML() {
  const aviso = avisoBackupPendente();
  if (!aviso) return '';
  const texto = aviso.nunca
    ? 'Você ainda não fez nenhum backup. Seus dados ficam só neste aparelho: se o app for desinstalado ou o celular trocado, tudo se perde.'
    : `Último backup: ${textoHaQuantoTempo(getUltimoBackup())}. Seus dados ficam só neste aparelho; um backup recente evita perder tudo.`;
  return `
    <div class="aviso-backup" role="note">
      <div class="aviso-texto">
        <strong>Que tal fazer um backup?</strong>
        <span>${texto}</span>
      </div>
      <div class="aviso-acoes">
        <button class="btn btn-accent" data-backup-agora>Fazer backup</button>
        <button class="btn btn-ghost" data-backup-depois>Depois</button>
      </div>
    </div>`;
}

// Barra de progresso única "atual / meta". Retorna '' se não há meta.
// fina: versão compacta do painel Hoje/Sua semana. aria: rótulo para leitores de tela.
function barraProgressoHTML(atual, meta, { fina = false, aria = '' } = {}) {
  if (!meta || meta <= 0) return '';
  const pct = Math.max(0, Math.min(100, Math.round((atual / meta) * 100)));
  return `<div class="meta-bar-track${fina ? ' today-bar' : ''}" role="progressbar"${aria ? ` aria-label="${aria}"` : ''} aria-valuemin="0" aria-valuemax="${meta}" aria-valuenow="${Math.round(Math.min(atual, meta))}">
    <div class="meta-bar-fill ${atual > meta ? 'over' : ''}" style="width:${pct}%"></div>
  </div>`;
}

// Painel "Sua semana": dias de treino da semana (segunda a domingo) em relação
// à meta de dias, bolinhas dos dias e sequência de dias seguidos.
// A meta vem da configuração (1 a 7 dias por semana); no modo "Automático" é o
// número de treinos montados (limitado a 7): com Treino A/B/C/D montados, a
// meta da semana é 4. Conta dias distintos treinados (duas sessões no mesmo
// dia contam como 1).
const SEQUENCIA_DESCANSO_MAX = 1; // dias de descanso seguidos que ainda não quebram a sequência
function resumoSemanaHTML(treinos, hist, hoje) {
  if (!treinos.length && !hist.length) return ''; // app vazio: o estado vazio já convida a começar
  const dow = new Date(hoje + 'T12:00:00').getDay();           // 0 = domingo
  const inicio = shiftDateISO(hoje, -((dow + 6) % 7));         // segunda-feira desta semana
  const dias = Array.from({ length: 7 }, (_, i) => shiftDateISO(inicio, i));
  const treinou = new Set(hist.map(h => h.data));
  const feitos = new Set(hist.filter(h => h.data >= dias[0] && h.data <= dias[6]).map(h => h.data)).size;
  const metaManual = getMetaSemana();
  const meta = metaManual > 0 ? metaManual : Math.min(7, treinos.length);

  let titulo;
  if (meta > 0 && feitos < meta) titulo = `${feitos} de ${meta} dias de treino esta semana`;
  else if (meta > 0) titulo = `${feitos} ${feitos === 1 ? 'dia' : 'dias'} de treino esta semana · meta batida 🎉`;
  else titulo = `${feitos} ${feitos === 1 ? 'dia' : 'dias'} de treino esta semana`;

  // sequência: dias de treino encadeados, tolerando até SEQUENCIA_DESCANSO_MAX
  // dias de descanso entre dois treinos (com 1, treinar segunda e quarta
  // mantém a sequência). Ela segue viva enquanto o último treino tiver no
  // máximo SEQUENCIA_DESCANSO_MAX + 1 dias: dá tempo de treinar hoje.
  const maxSalto = SEQUENCIA_DESCANSO_MAX + 1;
  const diaAnterior = (de) => {
    for (let j = 1; j <= maxSalto; j++) {
      const d = shiftDateISO(de, -j);
      if (treinou.has(d)) return d;
    }
    return null;
  };
  let diasDesdeUltimo = null;
  for (let i = 0; i <= maxSalto; i++) {
    if (treinou.has(shiftDateISO(hoje, -i))) { diasDesdeUltimo = i; break; }
  }
  let seq = 0;
  if (diasDesdeUltimo !== null) {
    let cursor = shiftDateISO(hoje, -diasDesdeUltimo);
    while (cursor && seq < 400) { seq++; cursor = diaAnterior(cursor); }
  }
  let textoSeq;
  if (seq === 0) {
    textoSeq = 'Sem sequência ativa. Treine hoje para começar uma.';
  } else {
    const aviso = diasDesdeUltimo === 0 ? ''
      : diasDesdeUltimo >= maxSalto ? ' · treine hoje para manter'
      : ' · hoje pode descansar';
    textoSeq = `🔥 ${seq} ${seq === 1 ? 'dia' : 'dias'} de treino na sequência${aviso}`;
  }

  const letras = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const nomes = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  const metaTexto = metaManual > 0 ? `${metaManual}x/sem` : `Auto (${treinos.length}x)`;

  return `
    <div class="side-card home-semana">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <h2>Sua semana</h2>
        <button type="button" class="btn-icon" data-editar-meta-semana style="min-height:30px; padding:0 10px; font-size:12px; font-weight:600;" title="Alterar meta de dias">
          ✏️ ${metaTexto}
        </button>
      </div>
      <div class="semana-titulo">${titulo}</div>
      ${barraProgressoHTML(Math.min(feitos, meta), meta, { fina: true, aria: 'Dias de treino da semana' })}
      <div class="semana-dias">
        ${dias.map((d, i) => `<span class="semana-dia ${treinou.has(d) ? 'feito' : ''} ${d === hoje ? 'hoje' : ''}" title="${nomes[i]}${treinou.has(d) ? ': treinou' : ''}" aria-label="${nomes[i]}${treinou.has(d) ? ': treinou' : ''}">${letras[i]}</span>`).join('')}
      </div>
      <p class="hint semana-seq">${textoSeq}</p>
    </div>`;
}

function openMetaSemanaModal() {
  const metaAtual = getMetaSemana();
  const modal = document.createElement('div');
  const botaoAbrir = APP.querySelector('[data-editar-meta-semana]');
  modal.className = 'modal-overlay';
  modal.id = 'modal-meta-semana';
  modal.setAttribute('role', 'presentation');
  modal.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-meta-semana">
      <div class="modal-header">
        <h2 id="titulo-meta-semana">Meta de dias por semana</h2>
        <button type="button" class="modal-close" id="close-meta-modal" aria-label="Fechar">✕</button>
      </div>
      <div class="modal-body">
        <p class="hint" style="margin-bottom:16px;">Quantos dias na semana você pretende treinar?</p>
        <div class="field-row">
          <select id="sel-meta-semana-input" style="width:100%; min-height:48px; font-size:15px; font-weight:600;">
            <option value="0" ${metaAtual === 0 ? 'selected' : ''}>Automático (conforme número de treinos)</option>
            ${[1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}" ${metaAtual === n ? 'selected' : ''}>${n} ${n === 1 ? 'dia' : 'dias'} por semana</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <div class="actions-row">
          <button type="button" id="btn-salvar-meta-semana" class="btn btn-accent">Salvar meta</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const fechar = () => {
    modal.remove();
    document.removeEventListener('keydown', fecharComEscape);
    if (botaoAbrir && botaoAbrir.isConnected) botaoAbrir.focus();
  };
  const fecharComEscape = e => {
    if (e.key === 'Escape') fechar();
  };
  modal.querySelector('#close-meta-modal').addEventListener('click', fechar);
  modal.addEventListener('click', e => {
    if (e.target === modal) fechar();
  });
  document.addEventListener('keydown', fecharComEscape);
  modal.querySelector('#btn-salvar-meta-semana').addEventListener('click', () => {
    const val = Number(modal.querySelector('#sel-meta-semana-input').value);
    setMetaSemana(val);
    fechar();
    render();
    toast('Meta da semana atualizada!');
  });
  modal.querySelector('#sel-meta-semana-input').focus();
}

function renderMeusTreinos() {
  const sessaoAtiva = getSessaoAtiva();
  const treinos = getTreinos();
  const hist = getHistorico();
  const ultimaSessao = hist
    .filter(h => h && (h.treinoNome || h.nome))
    .slice()
    .sort((a, b) => {
      const keyA = String(a.fimISO || a.dataHora || `${a.data || ''}${a.horario || ''}`);
      const keyB = String(b.fimISO || b.dataHora || `${b.data || ''}${b.horario || ''}`);
      if (keyA !== keyB) return keyB.localeCompare(keyA);
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    })[0];
  const nomeUltimoTreino = ultimaSessao ? (ultimaSessao.treinoNome || ultimaSessao.nome) : '';

  const hoje = todayISO();
  const aguaHoje = totalAguaDia(hoje);
  const configAgua = getAguaConfig();
  const metaAgua = configAgua.metaMl;
  const mlRapido = Number(configAgua.ultimoMl) || 250; // atalho "+" usa o último valor registrado na aba Água
  const refeicoesDoDia = getDieta().filter(r => r.data === hoje);
  const refeicoesHoje = refeicoesDoDia.length;
  const kcalHoje = calcTotaisRefeicoes(refeicoesDoDia).kcal;
  const metaKcal = Number(getMetaDieta().kcal) || 0;
  const fmtKcal = n => Math.round(n).toLocaleString('pt-BR');
  const textoAguaHoje = metaAgua > 0 ? `${aguaHoje} / ${metaAgua} ml` : `${aguaHoje} ml`;
  const textoDietaHoje = metaKcal > 0
    ? `${fmtKcal(kcalHoje)} / ${fmtKcal(metaKcal)} kcal`
    : `${fmtKcal(kcalHoje)} kcal · ${refeicoesHoje} ref.`;

  APP.innerHTML = `
    <section class="panel panel-home">
      <div class="home-header">
        ${ultimaSessao ? `
          <div class="last-workout-badge" title="Realizado em ${formatDateBR(ultimaSessao.data)}">
            <span>Último:</span>
            <strong>${escapeHtml(nomeUltimoTreino)}</strong>
          </div>` : ''}
      </div>

      ${continuarTreinoHTML(sessaoAtiva)}
      ${avisoBackupHTML()}

      ${resumoSemanaHTML(treinos, hist, hoje)}

      <div class="side-card home-today">
        <h2>Hoje</h2>
        <div class="today-rows">
          <div class="today-row">
            <span class="today-ico">${ICO_DROP}</span>
            <div class="today-txt">Água<small>${textoAguaHoje}</small>${barraProgressoHTML(aguaHoje, metaAgua, { fina: true })}</div>
            <button class="today-btn" data-agua-quick aria-label="Registrar ${mlRapido} ml de água" title="+${mlRapido} ml">${ICO_PLUS}</button>
          </div>
          <div class="today-row">
            <span class="today-ico">${ICO_FOOD}</span>
            <div class="today-txt">Dieta<small>${textoDietaHoje}</small>${barraProgressoHTML(kcalHoje, metaKcal, { fina: true })}</div>
            <button class="today-btn" data-refeicao-quick aria-label="Registrar refeição" title="Registrar refeição">${ICO_PLUS}</button>
          </div>
        </div>
      </div>

      <!-- Título e botão de adicionar alinhados na mesma linha -->
      <div class="section-head" style="margin-top: 24px;">
        <h2>Meus treinos</h2>
        <button class="btn btn-ghost btn-small" data-montar style="margin:0">+ Adicionar treino</button>
      </div>

      ${treinos.length ? `
        <div class="treino-grid">
          ${treinos.map(t => treinoCardHTML(t)).join('')}
        </div>` : `
        <div class="empty-state">
          <div class="empty-ico">${ICO_DUMBBELL}</div>
          <div>
            <strong>Você ainda não tem nenhum treino montado.</strong>
          </div>
        </div>`}
    </section>`;

  APP.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => iniciarSessao(b.dataset.start)));
  APP.querySelectorAll('[data-montar]').forEach(b => b.addEventListener('click', openMontarNovo));
  const btnAguaQuick = APP.querySelector('[data-agua-quick]');
  if (btnAguaQuick) btnAguaQuick.addEventListener('click', () => {
    const arr = getAgua();
    const novo = { id: uid(), data: todayISO(), horario: horaAtualHHMM(), ml: mlRapido };
    arr.push(novo);
    setAgua(arr);
    render();
    desfazivel(`+${mlRapido} ml registrado!`, () => {
      setAgua(getAgua().filter(r => r.id !== novo.id));
      if (currentTab === 'meus-treinos') render();
    });
  });
  const btnMetaSemana = APP.querySelector('[data-editar-meta-semana]');
  if (btnMetaSemana) btnMetaSemana.addEventListener('click', openMetaSemanaModal);
  if (sessaoAtiva) iniciarTempoCartaoContinuar(sessaoAtiva);
  const btnContinuar = APP.querySelector('[data-continuar]');
  if (btnContinuar) btnContinuar.addEventListener('click', () => switchTab('sessao'));
  const btnBackupAgora = APP.querySelector('[data-backup-agora]');
  if (btnBackupAgora) btnBackupAgora.addEventListener('click', () => exportarDados());
  const btnBackupDepois = APP.querySelector('[data-backup-depois]');
  if (btnBackupDepois) btnBackupDepois.addEventListener('click', () => { adiarAvisoBackup(); render(); });
  const btnRefeicaoQuick = APP.querySelector('[data-refeicao-quick]');
  if (btnRefeicaoQuick) btnRefeicaoQuick.addEventListener('click', () => { dietaData = todayISO(); openRefeicaoNova(); });
  APP.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
    const t = treinos.find(x => x.id === b.dataset.edit);
    if (t) openMontarEditar(t);
  }));
  APP.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    showConfirm('Excluir este treino?', () => {
      setTreinos(getTreinos().filter(x => x.id !== b.dataset.del));
      render();
      toast('Treino excluído.');
    });
  }));
}

function treinoCardHTML(t) {
  const exercicios = t.exercicios || [];
  const musculos = unionMuscles(exercicios);
  const estimSec = estimateTreinoSeconds(exercicios);
  const qtdEx = exercicios.length;
  return `
    <div class="treino-card">
      <div class="treino-card-head">
        <div class="treino-card-info">
          <h3 class="treino-card-title">${escapeHtml(t.nome)}</h3>
          <span class="treino-card-meta">${qtdEx} ${qtdEx === 1 ? 'exercício' : 'exercícios'} · ~${formatDuration(estimSec)}</span>
        </div>
        <div class="treino-card-actions-top">
          <button type="button" class="btn-icon-subtle" data-edit="${t.id}" title="Editar treino" aria-label="Editar ${escapeHtml(t.nome)}">✏️</button>
          <button type="button" class="btn-icon-subtle danger" data-del="${t.id}" title="Excluir treino" aria-label="Excluir ${escapeHtml(t.nome)}">🗑️</button>
        </div>
      </div>

      ${musculos.length ? `
        <div class="chip-row">
          ${musculos.map(m => `<span class="chip-subtle">${muscleName(m)}</span>`).join('')}
        </div>` : ''}

      <button type="button" class="btn-iniciar-treino" data-start="${t.id}">
        <span>▶</span> Iniciar treino
      </button>
    </div>`;
}

// ================= SESSÃO ATIVA =================
function iniciarSessao(treinoId) {
  const disparar = () => {
    const t = getTreinos().find(x => x.id === treinoId);
    if (!t) return;
    const sessao = {
      id: uid(),
      treinoId: t.id,
      treinoNome: t.nome,
      data: todayISO(),
      iniciadoEm: Date.now(),
      exercicioAtualIdx: 0,
      exercicios: t.exercicios.map(cfg => ({
        exercicioId: cfg.exercicioId,
        seriesAlvo: cfg.series,
        repeticoesAlvo: cfg.repeticoes,
        pesoAlvo: cfg.peso,
        pausa: cfg.pausa,
        sets: [],
      })),
      estimadoSegundos: estimateTreinoSeconds(t.exercicios),
      pausaAte: null,
    };
    setSessaoAtiva(sessao);
    currentTab = 'sessao';
    render();
  };
  if (getSessaoAtiva()) {
    showConfirm('Já existe um treino em andamento. Descartar e iniciar um novo?', disparar);
  } else {
    disparar();
  }
}

function renderSessao() {
  clearSessaoTimers();
  const sessao = getSessaoAtiva();
  if (!sessao) {
    releaseWakeLock();
    APP.innerHTML = `<section class="panel"><h1>Treino ativo</h1><p class="empty">Nenhum treino em andamento. Vá em "Meus treinos" e clique em Iniciar.</p></section>`;
    return;
  }
  requestWakeLock();
  const idx = sessao.exercicioAtualIdx;
  if (idx >= sessao.exercicios.length) { renderSessaoResumoFinal(sessao); return; }

  const cfg = sessao.exercicios[idx];
  const ex = exerciseById(cfg.exercicioId);
  const serieAtual = cfg.sets.length + 1;
  const emDescanso = !!(sessao.pausaAte && sessao.pausaAte > Date.now());

  // Valor que já vem preenchido na série atual: a série anterior desta sessão;
  // na primeira série, a carga da última vez que o exercício foi feito; sem
  // histórico, o alvo do treino.
  const ultima = ultimaCargaExercicio(cfg.exercicioId);
  const serieAnterior = cfg.sets.length ? cfg.sets[cfg.sets.length - 1] : null;
  const base = serieAnterior || ultima || { peso: cfg.pesoAlvo, reps: cfg.repeticoesAlvo };
  const pesoInicial = Number(base.peso) || 0;
  const repsInicial = Number(base.reps) || 0;
  const refUltima = ultima
    ? `Última vez: <strong>${ultima.peso} kg × ${ultima.reps}</strong> · ${formatDateBR(ultima.data)}`
    : 'Primeira vez neste exercício';
  const obsAnterior = ultimaObsExercicio(cfg.exercicioId);

  // barra de progresso: um segmento por exercício (o atual enche conforme as séries)
  const segsHTML = sessao.exercicios.map((c, i) => {
    const frac = i < idx ? (c.sets.length ? 1 : 0) : i === idx ? Math.min(c.sets.length / (c.seriesAlvo || 1), 1) : 0;
    return `<span class="prog-seg ${i === idx ? 'atual' : ''}"><i style="width:${Math.round(frac * 100)}%"></i></span>`;
  }).join('');

  APP.innerHTML = `
    <section class="panel">
      <div class="sessao-top">
        <h1>${escapeHtml(sessao.treinoNome)}</h1>
        <div class="sessao-meta">
          <span>Exercício ${idx + 1} de ${sessao.exercicios.length}</span>
          <span id="tempo-decorrido" class="mono"></span>
        </div>
      </div>
      <div class="progresso-treino" role="progressbar" aria-label="Progresso do treino" aria-valuemin="1" aria-valuemax="${sessao.exercicios.length}" aria-valuenow="${idx + 1}">${segsHTML}</div>

      <div class="sessao-grid">
        <div class="bodymap-mount" id="sessao-bodymap"></div>
        <div class="sessao-info">
          <h2>${ex.nome}</h2>
          <div class="chip-row">
            ${ex.musculos.primarios.map(m => `<span class="chip chip-primary">${muscleName(m)}</span>`).join('')}
            ${ex.musculos.secundarios.map(m => `<span class="chip chip-secondary">${muscleName(m)}</span>`).join('')}
          </div>

          <div class="sets-log">
            ${cfg.sets.map((s, i) => `
              <div class="set-line done">
                <span>Série ${i + 1}: ${s.peso}kg × ${s.reps}</span>
                <button class="btn-remove set-del" data-del-set="${i}" title="Excluir série" aria-label="Excluir série ${i + 1}">✕</button>
              </div>`).join('')}
            ${(!emDescanso && serieAtual <= cfg.seriesAlvo) ? `
              <div class="set-line atual">
                <span class="set-titulo">Série ${serieAtual}/${cfg.seriesAlvo}</span>
                <span class="hint set-ref">${refUltima} · Meta: ${cfg.seriesAlvo}×${cfg.repeticoesAlvo}${cfg.pesoAlvo ? ` · ${cfg.pesoAlvo} kg` : ''}</span>
                <div class="step-field">
                  <span class="step-label">Carga (kg)</span>
                  <div class="stepper">
                    <button type="button" class="step-btn" data-step="peso" data-delta="-1" aria-label="Diminuir 1 kg">−</button>
                    <input id="input-peso" type="number" inputmode="decimal" step="0.5" min="0" value="${pesoInicial}" aria-label="Carga em kg"/>
                    <button type="button" class="step-btn" data-step="peso" data-delta="1" aria-label="Aumentar 1 kg">+</button>
                  </div>
                </div>
                <div class="step-field">
                  <span class="step-label">Repetições</span>
                  <div class="stepper">
                    <button type="button" class="step-btn" data-step="reps" data-delta="-1" aria-label="Diminuir 1 repetição">−</button>
                    <input id="input-reps" type="number" inputmode="numeric" step="1" min="0" value="${repsInicial}" aria-label="Repetições"/>
                    <button type="button" class="step-btn" data-step="reps" data-delta="1" aria-label="Aumentar 1 repetição">+</button>
                  </div>
                </div>
                <button id="btn-registrar-serie" class="btn btn-accent">Registrar série</button>
                ${serieAnterior ? `<button id="btn-repetir-serie" class="btn btn-ghost">Repetir última série · ${serieAnterior.peso} kg × ${serieAnterior.reps}</button>` : ''}
              </div>` : ''}
          </div>

          ${emDescanso ? `
            <div class="descanso-box">
              <span>Descansando…</span>
              <span id="pausa-countdown" class="mono big"></span>
              <div class="descanso-ajuste">
                <button id="btn-descanso-menos" class="btn btn-ghost" aria-label="Diminuir descanso em 15 segundos">−15 s</button>
                <button id="btn-descanso-mais" class="btn btn-ghost" aria-label="Aumentar descanso em 15 segundos">+15 s</button>
              </div>
              <button id="btn-pular-descanso" class="btn btn-ghost">Pular descanso</button>
            </div>` : ''}

          ${(!emDescanso && serieAtual > cfg.seriesAlvo) ? `
            <button id="btn-prox-exercicio" class="btn btn-accent">
              ${idx + 1 < sessao.exercicios.length ? 'Próximo exercício →' : 'Finalizar treino'}
            </button>` : ''}

          <details class="obs-box" ${cfg.obs ? 'open' : ''}>
            <summary>📝 Observação${cfg.obs ? ' ✓' : ''}</summary>
            ${obsAnterior ? `<p class="hint obs-anterior">Da última vez (${formatDateBR(obsAnterior.data)}): ${escapeHtml(obsAnterior.obs)}</p>` : ''}
            <textarea id="input-obs" rows="2" maxlength="300" placeholder="Ex.: banco no furo 4, ombro incomodando">${escapeHtml(cfg.obs || '')}</textarea>
          </details>

        </div>
      </div>

      <div class="sessao-acoes-fim">
        <button id="btn-pular-exercicio" class="btn btn-ghost btn-small">Pular exercício</button>
        <button id="btn-abandonar" class="btn btn-danger btn-small">Abandonar sessão</button>
      </div>
    </section>`;

  renderBodyMap(document.getElementById('sessao-bodymap'), ex.musculos.primarios, ex.musculos.secundarios);

  const atualizaTempo = () => {
    const el = document.getElementById('tempo-decorrido');
    if (el) el.textContent = 'Tempo: ' + formatClock((Date.now() - sessao.iniciadoEm) / 1000);
  };
  atualizaTempo();
  sessaoTimers.elapsedInt = setInterval(atualizaTempo, 1000);

  if (emDescanso) {
    const atualizaPausa = () => {
      const rest = Math.max(0, Math.round((sessao.pausaAte - Date.now()) / 1000));
      const el = document.getElementById('pausa-countdown');
      if (el) el.textContent = rest + 's';
      // app aberto e visível: o bip/vibração daqui já avisa, então tira a
      // notificação do ar um instante antes pra não avisar duas vezes
      if (rest <= 1 && !document.hidden) cancelarNotifDescanso();
      if (rest <= 0) {
        sessao.pausaAte = null;
        setSessaoAtiva(sessao);
        alertaFimDescanso();
        render();
      }
    };
    atualizaPausa();
    sessaoTimers.restInt = setInterval(atualizaPausa, 1000);
  }

  const registrarSerie = (peso, reps) => {
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) { /* silencioso */ }
    cfg.sets.push({ peso, reps });
    const vaiDescansar = cfg.sets.length < cfg.seriesAlvo && cfg.pausa > 0;
    if (vaiDescansar) sessao.pausaAte = Date.now() + cfg.pausa * 1000;
    setSessaoAtiva(sessao);
    if (vaiDescansar) agendarNotifDescanso(sessao.pausaAte, ex.nome);
    render();
  };

  const btnReg = document.getElementById('btn-registrar-serie');
  if (btnReg) btnReg.addEventListener('click', () => {
    const peso = Number(String(document.getElementById('input-peso').value).replace(',', '.')) || 0;
    const reps = Number(document.getElementById('input-reps').value) || 0;
    registrarSerie(peso, reps);
  });

  // "Repetir última série": registra de uma vez a série anterior, sem mexer nos campos
  const btnRepetir = document.getElementById('btn-repetir-serie');
  if (btnRepetir && serieAnterior) btnRepetir.addEventListener('click', () => registrarSerie(serieAnterior.peso, serieAnterior.reps));

  // botões − e + ao lado de kg (passo 2,5) e reps (passo 1)
  APP.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
    const input = document.getElementById(b.dataset.step === 'peso' ? 'input-peso' : 'input-reps');
    if (!input) return;
    const atual = Number(String(input.value).replace(',', '.')) || 0;
    input.value = Math.max(0, Math.round((atual + Number(b.dataset.delta)) * 100) / 100);
  }));
  // tocar no campo seleciona o valor: dá pra digitar por cima sem apagar
  ['input-peso', 'input-reps'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('focus', () => input.select());
  });

  // excluir uma série já registrada (com "Desfazer")
  APP.querySelectorAll('[data-del-set]').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.delSet);
    const removida = cfg.sets.splice(i, 1)[0];
    if (!removida) return;
    setSessaoAtiva(sessao);
    render();
    desfazivel(`Série ${i + 1} excluída`, () => {
      const s = getSessaoAtiva();
      if (!s || s.id !== sessao.id || !s.exercicios[idx]) return;
      s.exercicios[idx].sets.splice(i, 0, removida);
      setSessaoAtiva(s);
      if (currentTab === 'sessao') render();
    });
  }));

  const btnPularDescanso = document.getElementById('btn-pular-descanso');
  if (btnPularDescanso) btnPularDescanso.addEventListener('click', () => {
    sessao.pausaAte = null;
    setSessaoAtiva(sessao);
    cancelarNotifDescanso();
    render();
  });

  // −15 s / +15 s no descanso (se zerar, o descanso termina)
  const ajustarDescanso = delta => {
    const novo = sessao.pausaAte + delta * 1000;
    if (novo <= Date.now() + 1000) {
      sessao.pausaAte = null;
      setSessaoAtiva(sessao);
      cancelarNotifDescanso();
    } else {
      sessao.pausaAte = novo;
      setSessaoAtiva(sessao);
      agendarNotifDescanso(novo, ex.nome);
    }
    render();
  };
  const btnDescansoMenos = document.getElementById('btn-descanso-menos');
  if (btnDescansoMenos) btnDescansoMenos.addEventListener('click', () => ajustarDescanso(-15));
  const btnDescansoMais = document.getElementById('btn-descanso-mais');
  if (btnDescansoMais) btnDescansoMais.addEventListener('click', () => ajustarDescanso(15));

  // observação do exercício: salva a cada tecla, sem redesenhar (senão o teclado fecharia)
  const inputObs = document.getElementById('input-obs');
  if (inputObs) inputObs.addEventListener('input', () => {
    cfg.obs = inputObs.value;
    setSessaoAtiva(sessao);
  });

  const btnProx = document.getElementById('btn-prox-exercicio');
  if (btnProx) btnProx.addEventListener('click', () => {
    sessao.exercicioAtualIdx += 1;
    setSessaoAtiva(sessao);
    render();
  });

  document.getElementById('btn-pular-exercicio').addEventListener('click', () => {
    showConfirm('Pular este exercício sem completar todas as séries?', () => {
      sessao.exercicioAtualIdx += 1;
      sessao.pausaAte = null;
      setSessaoAtiva(sessao);
      cancelarNotifDescanso();
      render();
    });
  });

  document.getElementById('btn-abandonar').addEventListener('click', () => {
    showConfirm('Abandonar a sessão atual? O progresso não será salvo no histórico.', () => {
      clearSessaoTimers();
      releaseWakeLock();
      setSessaoAtiva(null);
      cancelarNotifDescanso();
      render();
    });
  });
}

function renderSessaoResumoFinal(sessao) {
  const musculos = unionMuscles(sessao.exercicios);
  const duracaoReal = Math.floor((Date.now() - sessao.iniciadoEm) / 1000);
  const recordes = recordesDaSessao(sessao); // calculado antes de gravar, contra o histórico atual
  APP.innerHTML = `
    <section class="panel">
      <h1>Treino concluído</h1>
      <p class="hint">${escapeHtml(sessao.treinoNome)} — ${formatDateBR(sessao.data)}</p>
      <div class="summary-bar">
        <div>
          <span class="summary-label">Músculos trabalhados</span>
          <div class="chip-row">${musculos.map(m => `<span class="chip chip-primary">${muscleName(m)}</span>`).join('')}</div>
        </div>
        <div>
          <span class="summary-label">Duração real</span>
          <div class="summary-value">${formatClock(duracaoReal)}</div>
        </div>
      </div>
      ${recordes.length ? `
        <div class="recorde-box" role="status">
          <strong>🏆 ${recordes.length === 1 ? 'Novo recorde!' : `${recordes.length} novos recordes!`}</strong>
          ${recordes.map(r => `<span>${escapeHtml(nomeExercicio(r.exercicioId))}: <b>${r.peso} kg</b> (antes ${r.anterior} kg)</span>`).join('')}
        </div>` : ''}
      <div class="draft-list">
        ${sessao.exercicios.map(cfg => {
          const rec = recordes.find(r => r.exercicioId === cfg.exercicioId);
          return `<div class="draft-row">
            <div class="draft-row-head"><span class="ex-nome">${escapeHtml(nomeExercicio(cfg.exercicioId))}</span>${rec ? `<span class="badge-pr">🏆 ${rec.peso} kg</span>` : ''}</div>
            ${cfg.sets.length ? cfg.sets.map((s, i) => `<div class="set-line done">Série ${i + 1}: ${s.peso}kg × ${s.reps}</div>`).join('') : '<p class="hint">Nenhuma série registrada.</p>'}
            ${cfg.obs && cfg.obs.trim() ? `<p class="hint obs-line">📝 ${escapeHtml(cfg.obs.trim())}</p>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="actions-row">
        <button id="btn-salvar-historico" class="btn btn-accent">Salvar no histórico</button>
        <button id="btn-descartar-sessao" class="btn btn-ghost">Descartar</button>
      </div>
    </section>`;

  document.getElementById('btn-salvar-historico').addEventListener('click', () => {
    const registro = {
      id: uid(),
      treinoId: sessao.treinoId,
      treinoNome: sessao.treinoNome,
      data: sessao.data,
      duracaoSegundos: duracaoReal,
      estimadoSegundos: sessao.estimadoSegundos,
      musculos,
      exercicios: sessao.exercicios.map(cfg => {
        const item = { exercicioId: cfg.exercicioId, sets: cfg.sets };
        if (cfg.obs && cfg.obs.trim()) item.obs = cfg.obs.trim();
        return item;
      }),
    };
    if (recordes.length) registro.recordes = recordes;
    const hist = getHistorico();
    hist.push(registro);
    setHistorico(hist);
    setSessaoAtiva(null);
    cancelarNotifDescanso();
    currentTab = 'historico';
    render();
    toast(recordes.length
      ? `Treino salvo! 🏆 ${recordes.length === 1 ? 'Novo recorde' : `${recordes.length} novos recordes`}`
      : 'Treino salvo no histórico!');
  });
  document.getElementById('btn-descartar-sessao').addEventListener('click', () => {
    showConfirm('Descartar esta sessão sem salvar no histórico?', () => {
      setSessaoAtiva(null);
      cancelarNotifDescanso();
      currentTab = 'meus-treinos';
      render();
    });
  });
}

// ================= HISTÓRICO =================
function renderHistorico() {
  const hist = getHistorico().slice().sort((a, b) => b.data.localeCompare(a.data));
  const idsComHistorico = [...new Set(getHistorico().flatMap(s => s.exercicios.filter(e => e.sets.length).map(e => e.exercicioId)))];
  if ((!exercicioGraficoSelecionado || !idsComHistorico.includes(exercicioGraficoSelecionado)) && idsComHistorico.length) {
    exercicioGraficoSelecionado = idsComHistorico[0];
  }

  const totalTreinos = hist.length;
  const totalSegundos = hist.reduce((acc, s) => acc + (s.duracaoSegundos || 0), 0);
  const totalRecordes = hist.reduce((acc, s) => acc + (s.recordes ? s.recordes.length : 0), 0);

  APP.innerHTML = `
    <section class="panel">
      <h1>Histórico</h1>

      <div class="stat-strip">
        <div class="stat-card">
          <span class="stat-label">Treinos totais</span>
          <span class="stat-value">${totalTreinos}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Tempo total</span>
          <span class="stat-value small">${formatDuration(totalSegundos)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Recordes</span>
          <span class="stat-value">${totalRecordes}</span>
        </div>
      </div>

      <div class="field-row">
        <label>Evolução de carga por exercício</label>
        <select id="sel-grafico" ${idsComHistorico.length === 0 ? 'disabled' : ''}>
          ${idsComHistorico.length
            ? idsComHistorico.map(id => `<option value="${id}" ${exercicioGraficoSelecionado === id ? 'selected' : ''}>${exerciseById(id)?.nome || id}</option>`).join('')
            : '<option>Sem dados ainda</option>'}
        </select>
      </div>
      <div class="periodo-tabs" id="seg-periodo" role="group" aria-label="Período do gráfico">
        ${PERIODOS_GRAFICO.map(p => `<button type="button" class="tab-btn ${graficoPeriodo === p.id ? 'active' : ''}" data-periodo="${p.id}">${p.label}</button>`).join('')}
      </div>
      <div class="chart-toolbar">
        <button type="button" id="btn-reset-zoom" class="btn-link" ${graficoZoom ? '' : 'hidden'}>↺ Ver período inteiro</button>
      </div>
      <div class="chart-box">
        <canvas id="chart-canvas" width="640" height="220"></canvas>
        <p id="chart-empty" class="empty" hidden>Registre séries em pelo menos 2 sessões dentro do período selecionado para ver a evolução deste exercício.</p>
        <p class="hint chart-zoom-hint">Arraste sobre o gráfico pra dar zoom num trecho.</p>
      </div>

      <h2 class="subtitle">Sessões registradas</h2>
      ${hist.length ? '' : '<p class="empty">Nenhum treino salvo ainda. Finalize um treino em "Treino ativo".</p>'}
      <div class="hist-list sessoes-list">${hist.map(s => histCardHTML(s)).join('')}</div>
    </section>`;

  const sel = document.getElementById('sel-grafico');
  if (sel) sel.addEventListener('change', e => {
    exercicioGraficoSelecionado = e.target.value;
    graficoZoom = null;
    render();
  });
  APP.querySelectorAll('#seg-periodo [data-periodo]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.periodo === graficoPeriodo) return;
      graficoPeriodo = btn.dataset.periodo;
      graficoZoom = null;
      render();
    });
  });
  const btnResetZoom = document.getElementById('btn-reset-zoom');
  if (btnResetZoom) btnResetZoom.addEventListener('click', () => {
    graficoZoom = null;
    render();
  });
  if (exercicioGraficoSelecionado) desenharGrafico(exercicioGraficoSelecionado);

  APP.querySelectorAll('[data-hist-toggle]').forEach(card => {
    card.addEventListener('click', () => {
      sessaoHistAberta = sessaoHistAberta === card.dataset.histToggle ? null : card.dataset.histToggle;
      render();
    });
  });
  APP.querySelectorAll('[data-del-hist]').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      showConfirm('Excluir este registro do histórico?', () => {
        setHistorico(getHistorico().filter(s => s.id !== btn.dataset.delHist));
        render();
      });
    });
  });
}

function histCardHTML(s) {
  const aberto = sessaoHistAberta === s.id;
  const musculos = unionMuscles(s.exercicios || []);
  const duracao = s.duracaoSegundos ? formatDuration(s.duracaoSegundos) : '--';
  return `
    <div class="sessao-card ${aberto ? 'ex-aberto' : ''}" data-hist-toggle="${s.id}">
      <div class="sessao-card-head">
        <div>
          <h3 class="sessao-card-title">${escapeHtml(s.treinoNome || 'Treino')}</h3>
          <span class="sessao-card-meta">${formatDateBR(s.data)} · ${duracao}</span>
        </div>
        <button type="button" class="btn-icon-subtle danger" data-del-hist="${s.id}" title="Excluir registro" aria-label="Excluir registro">🗑️</button>
      </div>
      ${s.recordes && s.recordes.length ? `<span class="badge-pr" title="Recordes de carga nesta sessão">🏆 ${s.recordes.length}</span>` : ''}
      ${musculos.length ? `<div class="chip-row">${musculos.map(m => `<span class="chip-subtle">${muscleName(m)}</span>`).join('')}</div>` : ''}
      ${aberto ? `
        <div class="draft-list">
          ${(s.exercicios || []).map(cfg => {
            const ex = exerciseById(cfg.exercicioId);
            const rec = (s.recordes || []).find(r => r.exercicioId === cfg.exercicioId);
            return `<div class="draft-row">
              <div class="draft-row-head"><span class="ex-nome">${ex ? ex.nome : cfg.exercicioId}</span>${rec ? `<span class="badge-pr">🏆 ${rec.peso} kg</span>` : ''}</div>
              ${cfg.sets.length ? cfg.sets.map((set, i) => `<div class="set-line done">Série ${i + 1}: ${set.peso}kg × ${set.reps}</div>`).join('') : '<p class="hint">Sem séries registradas.</p>'}
              ${cfg.obs ? `<p class="hint obs-line">📝 ${escapeHtml(cfg.obs)}</p>` : ''}
            </div>`;
          }).join('')}
        </div>` : ''}
    </div>`;
}

function desenharGrafico(exId) {
  const canvas = document.getElementById('chart-canvas');
  if (!canvas) return;
  // Ajusta o canvas à largura real do container (1 px do canvas = 1 px da tela),
  // senão no celular o gráfico de 640px é reduzido e o texto fica minúsculo.
  const caixa = canvas.parentElement;
  const estiloCaixa = getComputedStyle(caixa);
  const largUtil = Math.floor(caixa.clientWidth - parseFloat(estiloCaixa.paddingLeft) - parseFloat(estiloCaixa.paddingRight));
  if (largUtil > 0) {
    canvas.width = Math.max(260, Math.min(largUtil, 900));
    canvas.height = largUtil < 480 ? 240 : 220;
  }
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const hist = getHistorico().slice().sort((a, b) => a.data.localeCompare(b.data));
  const todosPontos = [];
  hist.forEach(s => {
    const cfg = s.exercicios.find(e => e.exercicioId === exId);
    if (cfg && cfg.sets.length) todosPontos.push({ data: s.data, peso: Math.max(...cfg.sets.map(x => x.peso)) });
  });

  // filtro por período (segmentado acima do gráfico)
  const dataCorte = dataCorteParaPeriodo(graficoPeriodo);
  let pontos = dataCorte ? todosPontos.filter(p => p.data >= dataCorte) : todosPontos;

  // recorte extra por zoom (arraste do usuário), guardado como datas pra
  // não bagunçar ao reaplicar sobre um `pontos` que já mudou de tamanho
  if (graficoZoom) {
    pontos = pontos.filter(p => p.data >= graficoZoom.inicio && p.data <= graficoZoom.fim);
  }

  const emptyMsg = document.getElementById('chart-empty');
  if (pontos.length < 2) {
    if (emptyMsg) emptyMsg.hidden = false;
    canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = canvas.onpointercancel = null;
    return;
  }
  if (emptyMsg) emptyMsg.hidden = true;

  const padL = 46, padR = 16, padT = 16, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const pesos = pontos.map(p => p.peso);
  let min = Math.min(...pesos), max = Math.max(...pesos);
  if (min === max) { min -= 1; max += 1; }
  const margem = (max - min) * 0.15;
  min -= margem; max += margem;
  if (min < 0) min = 0;

  const styles = getComputedStyle(document.documentElement);
  const corLinha = styles.getPropertyValue('--chalk').trim() || '#E9BD4A';
  const corGrid = styles.getPropertyValue('--line').trim() || '#34373c';
  const corTexto = styles.getPropertyValue('--text-muted').trim() || '#8b8d94';

  ctx.strokeStyle = corGrid; ctx.lineWidth = 1;
  ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = corTexto;
  const linhas = 4;
  for (let i = 0; i <= linhas; i++) {
    const y = padT + plotH - (i / linhas) * plotH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillText((min + (i / linhas) * (max - min)).toFixed(1) + 'kg', 2, y + 4);
  }

  const xFor = i => padL + (pontos.length === 1 ? plotW / 2 : (i / (pontos.length - 1)) * plotW);
  const yFor = v => padT + plotH - ((v - min) / (max - min)) * plotH;

  ctx.strokeStyle = corLinha; ctx.lineWidth = 2.5;
  ctx.beginPath();
  pontos.forEach((p, i) => { const x = xFor(i), y = yFor(p.peso); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();

  ctx.fillStyle = corLinha;
  pontos.forEach((p, i) => { const x = xFor(i), y = yFor(p.peso); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); });

  ctx.fillStyle = corTexto; ctx.textAlign = 'center';
  const passo = Math.max(1, Math.ceil(pontos.length / 6));
  pontos.forEach((p, i) => {
    if (i % passo !== 0 && i !== pontos.length - 1) return;
    ctx.fillText(formatDateBR(p.data).slice(0, 5), xFor(i), H - 8);
  });
  ctx.textAlign = 'left';

  // snapshot do gráfico "limpo", pra redesenhar rápido durante o arraste
  // de seleção sem ter que rodar tudo isso nesse ponto de novo
  const snapshot = ctx.getImageData(0, 0, W, H);
  configurarZoomArrasteCanvas(canvas, ctx, snapshot, pontos, padL, plotW, (inicio, fim) => {
    graficoZoom = { inicio, fim };
    render();
  });
}

let _larguraGraficoAnterior = 0;
window.addEventListener('resize', () => {
  const canvas = document.getElementById('chart-canvas');
  if (!canvas || !exercicioGraficoSelecionado) return;
  const larg = canvas.parentElement.clientWidth;
  if (larg === _larguraGraficoAnterior) return; // ignora resize só de altura (barra do navegador)
  _larguraGraficoAnterior = larg;
  desenharGrafico(exercicioGraficoSelecionado);
});

/**
 * Liga o arraste de mouse/toque sobre o canvas do gráfico pra selecionar um
 * trecho e dar zoom nele. `pontos` já é a lista filtrada/atualmente visível;
 * `onSelecionar(dataInicio, dataFim)` é chamado com as datas do início e do
 * fim do trecho arrastado (não os índices), pra o zoom não ficar bagunçado
 * quando o usuário arrastar de novo em cima de um recorte já zoomado.
 */
function configurarZoomArrasteCanvas(canvas, ctx, snapshot, pontos, padL, plotW, onSelecionar) {
  const W = canvas.width, H = canvas.height;
  const podeZoom = pontos.length >= 3;
  canvas.style.cursor = podeZoom ? 'crosshair' : 'default';
  canvas.style.touchAction = 'none';

  if (!podeZoom) {
    canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = canvas.onpointercancel = null;
    return;
  }

  let arrastando = false;
  let startX = 0;

  function posPixel(ev) {
    const rect = canvas.getBoundingClientRect();
    const escala = canvas.width / rect.width;
    const x = (ev.clientX - rect.left) * escala;
    return Math.max(padL, Math.min(padL + plotW, x));
  }
  function pixelParaIndice(x) {
    const rel = (x - padL) / plotW;
    return Math.max(0, Math.min(pontos.length - 1, Math.round(rel * (pontos.length - 1))));
  }
  function desenharSelecao(x0, x1) {
    ctx.putImageData(snapshot, 0, 0);
    ctx.fillStyle = 'rgba(233,189,74,0.16)';
    ctx.fillRect(x0, 0, x1 - x0, H);
    ctx.strokeStyle = 'rgba(233,189,74,0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, 0.5, Math.max(0, x1 - x0 - 1), H - 1);
  }

  function onDown(ev) {
    arrastando = true;
    startX = posPixel(ev);
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignora */ }
  }
  function onMove(ev) {
    if (!arrastando) return;
    const x = posPixel(ev);
    desenharSelecao(Math.min(startX, x), Math.max(startX, x));
  }
  function onUp(ev) {
    if (!arrastando) return;
    arrastando = false;
    const x = posPixel(ev);
    ctx.putImageData(snapshot, 0, 0);
    if (Math.abs(x - startX) < 8) return; // arraste curto demais: ignora (foi só um clique)
    const i0 = pixelParaIndice(Math.min(startX, x));
    const i1 = pixelParaIndice(Math.max(startX, x));
    if (i1 <= i0) return;
    onSelecionar(pontos[i0].data, pontos[i1].data);
  }
  function onCancel() {
    arrastando = false;
    ctx.putImageData(snapshot, 0, 0);
  }

  canvas.onpointerdown = onDown;
  canvas.onpointermove = onMove;
  canvas.onpointerup = onUp;
  canvas.onpointercancel = onCancel;
}

// ================= DIETA =================
function calcTotaisIngredientes(ingredientes) {
  return ingredientes.reduce((acc, ing) => {
    acc.kcal += ing.kcal; acc.prot += ing.prot; acc.carb += ing.carb; acc.gord += ing.gord;
    return acc;
  }, { kcal: 0, prot: 0, carb: 0, gord: 0 });
}
function calcTotaisRefeicoes(lista) {
  return lista.reduce((acc, r) => {
    const t = calcTotaisIngredientes(r.ingredientes);
    acc.kcal += t.kcal; acc.prot += t.prot; acc.carb += t.carb; acc.gord += t.gord;
    return acc;
  }, { kcal: 0, prot: 0, carb: 0, gord: 0 });
}
// O ingrediente guarda, além dos valores da quantidade atual (kcal/prot/carb/gord),
// os valores por 100g (kcal100/prot100/carb100/gord100). Mudar a quantidade
// sempre recalcula a partir dos valores por 100g, então apagar o campo (0) e
// digitar outro número nunca perde os dados do alimento.
function ingredienteFromFood(food, qtd) {
  const fator = qtd / 100;
  return {
    alimentoId: food.id,
    nome: food.nome,
    quantidade: qtd,
    kcal100: food.kcal,
    prot100: food.prot,
    carb100: food.carb,
    gord100: food.gord,
    kcal: food.kcal * fator,
    prot: food.prot * fator,
    carb: food.carb * fator,
    gord: food.gord * fator,
  };
}
// garante os valores por 100g em ingredientes salvos antes dessa mudança.
// Tenta derivar da quantidade atual; se não der (quantidade 0 ou valores
// zerados por causa do bug antigo), busca o alimento de origem.
function garantirBase100(ing) {
  if (typeof ing.kcal100 === 'number') return ing;
  const somaAtual = (ing.kcal || 0) + (ing.prot || 0) + (ing.carb || 0) + (ing.gord || 0);
  if (ing.quantidade > 0 && somaAtual > 0) {
    const f = 100 / ing.quantidade;
    ing.kcal100 = ing.kcal * f;
    ing.prot100 = ing.prot * f;
    ing.carb100 = ing.carb * f;
    ing.gord100 = ing.gord * f;
    return ing;
  }
  const food = ing.alimentoId ? foodById(ing.alimentoId) : null;
  ing.kcal100 = food ? food.kcal : 0;
  ing.prot100 = food ? food.prot : 0;
  ing.carb100 = food ? food.carb : 0;
  ing.gord100 = food ? food.gord : 0;
  return ing;
}
// reescala um ingrediente já adicionado pra uma nova quantidade em gramas,
// sempre a partir dos valores por 100g
function recalcularIngredienteQtd(ing, novaQtd) {
  garantirBase100(ing);
  const f = novaQtd / 100;
  ing.quantidade = novaQtd;
  ing.kcal = ing.kcal100 * f;
  ing.prot = ing.prot100 * f;
  ing.carb = ing.carb100 * f;
  ing.gord = ing.gord100 * f;
}
function macroChipsHTML(t) {
  return `
    <span class="macro-badge macro-kcal">${Math.round(t.kcal)} kcal</span>
    <span class="macro-badge">P ${t.prot.toFixed(1)}g</span>
    <span class="macro-badge">C ${t.carb.toFixed(1)}g</span>
    <span class="macro-badge">G ${t.gord.toFixed(1)}g</span>`;
}

// ---------- meta diária de calorias/macros ----------
function metaDefinida(meta) {
  return !!meta && (meta.kcal > 0 || meta.prot > 0 || meta.carb > 0 || meta.gord > 0);
}
// uma linha de progresso "consumido / meta" com barra; retorna '' se essa
// meta específica não foi definida (0 ou vazio), pra não mostrar barra zerada
function metaBarraHTML(label, atual, meta, casasDecimais, unidade) {
  if (!meta || meta <= 0) return '';
  const estourou = atual > meta;
  const fmt = n => casasDecimais ? n.toFixed(casasDecimais) : Math.round(n);
  return `
    <div class="meta-row">
      <div class="meta-row-head">
        <span class="meta-row-label">${label}</span>
        <span class="meta-row-value ${estourou ? 'over' : ''}">${fmt(atual)} / ${fmt(meta)}${unidade}</span>
      </div>
      ${barraProgressoHTML(atual, meta, { aria: label })}
    </div>`;
}
function metaProgressoHTML(totais, meta) {
  return [
    metaBarraHTML('Calorias', totais.kcal, meta.kcal, 0, ' kcal'),
    metaBarraHTML('Proteínas', totais.prot, meta.prot, 1, 'g'),
    metaBarraHTML('Carboidratos', totais.carb, meta.carb, 1, 'g'),
    metaBarraHTML('Gorduras', totais.gord, meta.gord, 1, 'g'),
  ].join('');
}

// copia refeições (com todos os ingredientes) para outro dia, com "Desfazer"
function repetirRefeicoes(refeicoes, dataDestino) {
  if (!refeicoes.length) return;
  const copias = refeicoes.map(r => {
    const c = JSON.parse(JSON.stringify(r));
    c.id = uid();
    c.data = dataDestino;
    return c;
  });
  setDieta([...getDieta(), ...copias]);
  refeicaoAberta = null;
  if (currentTab === 'dieta') renderDieta();
  const ids = new Set(copias.map(c => c.id));
  desfazivel(copias.length === 1 ? 'Refeição repetida' : `${copias.length} refeições repetidas`, () => {
    setDieta(getDieta().filter(r => !ids.has(r.id)));
    if (currentTab === 'dieta') renderDieta();
  });
}

// painel recolhível "Repetir refeições de outro dia"
function copiarRefeicoesHTML() {
  const origem = copiarDiaOrigem || shiftDateISO(dietaData, -1);
  const refs = origem === dietaData
    ? []
    : getDieta().filter(r => r.data === origem).sort((a, b) => a.horario.localeCompare(b.horario));
  let corpo;
  if (origem === dietaData) {
    corpo = '<p class="empty">Escolha um dia diferente do que está aberto.</p>';
  } else if (!refs.length) {
    corpo = '<p class="empty">Nenhuma refeição registrada nesse dia.</p>';
  } else {
    corpo = `
      <div class="picker-list">
        ${refs.map(r => {
          const t = calcTotaisIngredientes(r.ingredientes);
          return `
            <button type="button" class="picker-item" data-repetir-refeicao="${r.id}">
              <span class="picker-item-txt">
                <span class="picker-item-name">${escapeHtml(r.nome)} · ${r.horario}</span>
                <span class="picker-item-musc">${Math.round(t.kcal)} kcal · ${r.ingredientes.length} ingrediente(s)</span>
              </span>
              ${ICO_PLUS}
            </button>`;
        }).join('')}
      </div>
      <button id="btn-repetir-dia" class="btn btn-ghost btn-small">Copiar o dia todo (${refs.length})</button>`;
  }
  return `
    <details class="picker" id="copiar-dia" ${copiarDiaAberto ? 'open' : ''}>
      <summary>${ICON_COPY}Repetir refeições de outro dia</summary>
      <div class="picker-body">
        <div class="field-row-inline">
          <label>Copiar de<input type="date" id="copiar-origem" value="${origem}"/></label>
        </div>
        <p class="hint">As refeições são copiadas para ${formatDateBR(dietaData)}, que é o dia aberto agora.</p>
        ${corpo}
      </div>
    </details>`;
}

function renderDieta() {
  const doDia = getDieta().filter(r => r.data === dietaData).sort((a, b) => a.horario.localeCompare(b.horario));
  const totais = calcTotaisRefeicoes(doDia);
  const meta = getMetaDieta() || {};

  APP.innerHTML = `
    <section class="panel">
      <div class="section-head">
        <h1>Dieta</h1>
        <button id="btn-editar-meta" class="btn btn-ghost btn-small" style="margin-top:0">Meta e macros</button>
      </div>

      <div class="date-nav">
        <div class="date-picker-pill">
          <button id="btn-dia-anterior" class="btn-icon" title="Dia anterior">‹</button>
          <input type="date" id="dieta-data-input" value="${dietaData}"/>
          <button id="btn-dia-proximo" class="btn-icon" title="Próximo dia">›</button>
        </div>
        <button id="btn-dia-hoje" class="btn-hoje ${dietaData === todayISO() ? 'is-hoje' : ''}">Hoje</button>
      </div>

      <div class="card-metas-hoje">
        <div class="card-metas-top">
          <span class="card-metas-val">${Math.round(totais.kcal)} <small>kcal</small></span>
          <span class="card-metas-badge">${meta.kcal > 0 ? Math.min(100, Math.round((totais.kcal / meta.kcal) * 100)) : 0}%</span>
        </div>

        <p class="card-metas-sub">
          ${meta.kcal > 0
            ? (totais.kcal >= meta.kcal ? 'Meta de calorias atingida! 🎉' : `Faltam ${Math.round(meta.kcal - totais.kcal)} kcal para a meta de ${Math.round(meta.kcal)} kcal`)
            : 'Nenhuma meta definida.'}
        </p>

        ${barraProgressoHTML(totais.kcal, meta.kcal, { fina: true, aria: 'Calorias' })}

        <div class="card-metas-macros">
          <span>Prot: <strong>${totais.prot.toFixed(1)}g</strong></span>
          <span>Carb: <strong>${totais.carb.toFixed(1)}g</strong></span>
          <span>Gord: <strong>${totais.gord.toFixed(1)}g</strong></span>
        </div>
      </div>

      <div class="actions-row">
        <button id="btn-nova-refeicao" class="btn btn-accent">Adicionar refeição</button>
      </div>

      ${copiarRefeicoesHTML()}

      <h2 class="subtitle">Refeições do dia</h2>
      ${doDia.length
        ? `<div class="hist-list">${doDia.map(r => refeicaoCardHTML(r)).join('')}</div>`
        : emptyStateHTML({
            icon: ICO_FOOD,
            title: 'Nenhuma refeição registrada',
            message: 'Toque em "Adicionar refeição" para registrar seus alimentos hoje.'
          })}
    </section>`;

  const irParaDia = data => {
    dietaData = data || todayISO();
    refeicaoAberta = null;
    copiarDiaOrigem = null; // volta a sugerir o dia anterior ao novo dia aberto
    render();
  };

  document.getElementById('btn-nova-refeicao').addEventListener('click', openRefeicaoNova);
  document.getElementById('btn-editar-meta').addEventListener('click', openMetaDieta);
  document.getElementById('dieta-data-input').addEventListener('change', e => irParaDia(e.target.value));
  document.getElementById('btn-dia-hoje').addEventListener('click', () => irParaDia(todayISO()));
  document.getElementById('btn-dia-anterior').addEventListener('click', () => irParaDia(shiftDateISO(dietaData, -1)));
  document.getElementById('btn-dia-proximo').addEventListener('click', () => irParaDia(shiftDateISO(dietaData, 1)));

  // repetir refeições de outro dia
  const detCopiar = document.getElementById('copiar-dia');
  if (detCopiar) detCopiar.addEventListener('toggle', () => { copiarDiaAberto = detCopiar.open; });
  const inputOrigem = document.getElementById('copiar-origem');
  if (inputOrigem) inputOrigem.addEventListener('change', e => {
    copiarDiaOrigem = e.target.value || null;
    copiarDiaAberto = true;
    renderDieta();
  });
  APP.querySelectorAll('[data-repetir-refeicao]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = getDieta().find(x => x.id === btn.dataset.repetirRefeicao);
      if (r) repetirRefeicoes([r], dietaData);
    });
  });
  const btnRepetirDia = document.getElementById('btn-repetir-dia');
  if (btnRepetirDia) btnRepetirDia.addEventListener('click', () => {
    const origem = copiarDiaOrigem || shiftDateISO(dietaData, -1);
    repetirRefeicoes(getDieta().filter(r => r.data === origem), dietaData);
  });

  APP.querySelectorAll('[data-refeicao-toggle]').forEach(card => {
    card.addEventListener('click', () => {
      refeicaoAberta = refeicaoAberta === card.dataset.refeicaoToggle ? null : card.dataset.refeicaoToggle;
      renderDieta();
    });
  });
  APP.querySelectorAll('[data-edit-refeicao]').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const r = getDieta().find(x => x.id === btn.dataset.editRefeicao);
      if (r) openRefeicaoEditar(r);
    });
  });
  APP.querySelectorAll('[data-del-refeicao]').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const id = btn.dataset.delRefeicao;
      const lista = getDieta();
      const pos = lista.findIndex(x => x.id === id);
      if (pos < 0) return;
      const removida = lista[pos];
      setDieta(lista.filter(x => x.id !== id));
      refeicaoAberta = null;
      renderDieta();
      desfazivel('Refeição excluída', () => {
        const atual = getDieta();
        if (atual.some(x => x.id === removida.id)) return;
        atual.splice(Math.min(pos, atual.length), 0, removida);
        setDieta(atual);
        if (currentTab === 'dieta') renderDieta();
      });
    });
  });
}

function refeicaoCardHTML(r) {
  const aberto = refeicaoAberta === r.id;
  const t = calcTotaisIngredientes(r.ingredientes);
  return `
    <div class="hist-card refeicao-card ${aberto ? 'ex-aberto' : ''}" data-refeicao-toggle="${r.id}">
      <div class="hist-card-head">
        <div><strong>${escapeHtml(r.nome)}</strong><span class="hint mono"> — ${r.horario}</span></div>
        <div class="hist-card-meta">
          <button class="btn-remove" data-edit-refeicao="${r.id}" title="Editar">${ICON_EDIT}</button>
          <button class="btn-remove" data-del-refeicao="${r.id}" title="Excluir">✕</button>
        </div>
      </div>
      <div class="macro-row">${macroChipsHTML(t)}</div>
      ${aberto ? `
        <div class="draft-list">
          ${r.ingredientes.length ? r.ingredientes.map(ing => `
            <div class="draft-row">
              <div class="draft-row-head">
                <span class="ex-nome">${escapeHtml(ing.nome)}</span>
                <span class="hint mono">${ing.quantidade}g</span>
              </div>
              <p class="hint">${Math.round(ing.kcal)} kcal · P ${ing.prot.toFixed(1)}g · C ${ing.carb.toFixed(1)}g · G ${ing.gord.toFixed(1)}g</p>
            </div>`).join('') : '<p class="hint">Nenhum ingrediente adicionado.</p>'}
        </div>` : ''}
    </div>`;
}

// ---------- formulário de refeição (modal) ----------
// quantos alimentos aparecem de uma vez na lista de busca (a TACO tem centenas)
const MAX_ALIMENTOS_LISTA = 50;

function renderRefeicaoForm() {
  const d = draftRefeicao;

  // refeições antigas com nome livre (ex.: "Pré-treino") continuam aparecendo
  // como um chip extra, pra não perder o nome ao editar
  const nomeAtual = d.nome.trim();
  const chipsNome = (!nomeAtual || OPCOES_REFEICAO.includes(nomeAtual))
    ? OPCOES_REFEICAO
    : [...OPCOES_REFEICAO, nomeAtual];

  resetModalCloseButton(REFEICAO_MOUNT, 'btn-close-refeicao');
  REFEICAO_MOUNT.innerHTML = `
    <section>
      <div class="modal-header">
        <h1>${d.id ? 'Editar refeição' : 'Adicionar refeição'}</h1>
      </div>
      <div class="modal-body">

        <div class="field-row-inline">
          <label>Data<input type="date" id="refeicao-data" value="${d.data}"/></label>
          <label>Horário<input type="time" id="refeicao-horario" value="${d.horario}"/></label>
        </div>
        <div class="field-row">
          <label>Refeição <span class="req" title="Obrigatório">*</span> <span class="hint">(obrigatório)</span></label>
          <div class="chip-filter" id="refeicao-tipo">
            ${chipsNome.map(n => `<button type="button" class="chip-toggle ${nomeAtual === n ? 'active' : ''}" data-refeicao-tipo="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join('')}
          </div>
        </div>

        <p class="hint refeicao-bloqueio info-block-msg" id="refeicao-bloqueio" ${nomeAtual ? 'hidden' : ''}>
          Escolha o tipo da refeição acima para liberar os ingredientes.
        </p>

        <div id="refeicao-ingredientes-bloco" ${nomeAtual ? '' : 'hidden'}>
          <h2 class="subtitle">Ingredientes</h2>
          <div class="muscle-add-box">
            <input type="text" class="input-busca-musculo" id="busca-alimento" placeholder="Buscar alimento na Tabela TACO..." value="${escapeHtml(buscaAlimentoForm)}" autocomplete="off"/>
            <div class="qtd-row">
              <label class="qtd-label" for="qtd-alimento-g">Quantidade</label>
              <div class="qtd-field">
                <input type="number" id="qtd-alimento-g" min="1" step="1" value="100" inputmode="decimal"/>
                <span>g</span>
              </div>
              <span class="hint qtd-hint">Toque num alimento para adicionar</span>
            </div>
            <div class="picker-list" id="alimento-list"></div>
            <button id="btn-novo-alimento-custom" class="btn btn-ghost btn-small">+ Cadastrar alimento personalizado</button>
          </div>

          <div class="draft-list" id="ingredientes-list"></div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="refeicao-totais">
          <div><span class="summary-label">Calorias</span><div class="summary-value" id="ref-tot-kcal">0 kcal</div></div>
          <div><span class="summary-label">Prot.</span><div class="summary-value small" id="ref-tot-prot">0.0g</div></div>
          <div><span class="summary-label">Carb.</span><div class="summary-value small" id="ref-tot-carb">0.0g</div></div>
          <div><span class="summary-label">Gord.</span><div class="summary-value small" id="ref-tot-gord">0.0g</div></div>
        </div>
        <div class="actions-row">
          <button id="btn-salvar-refeicao" class="btn btn-accent">Salvar refeição</button>
        </div>
      </div>
    </section>`;
  attachModalCloseButton(REFEICAO_MOUNT, 'btn-close-refeicao');

  document.getElementById('refeicao-data').addEventListener('input', e => { d.data = e.target.value; });
  document.getElementById('refeicao-horario').addEventListener('input', e => { d.horario = e.target.value; });
  REFEICAO_MOUNT.querySelectorAll('[data-refeicao-tipo]').forEach(btn => {
    btn.addEventListener('click', () => {
      d.nome = btn.dataset.refeicaoTipo; // seleção única: o último clique vence
      REFEICAO_MOUNT.querySelectorAll('[data-refeicao-tipo]').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      document.getElementById('refeicao-ingredientes-bloco').hidden = false;
      document.getElementById('refeicao-bloqueio').hidden = true;
      document.getElementById('refeicao-tipo').classList.remove('campo-erro');
    });
  });

  // a busca só redesenha a lista de alimentos (não o formulário inteiro),
  // então o foco do campo nunca se perde
  document.getElementById('busca-alimento').addEventListener('input', e => {
    buscaAlimentoForm = e.target.value;
    renderListaAlimentos();
  });
  document.getElementById('btn-novo-alimento-custom').addEventListener('click', openAlimentoCustom);
  document.getElementById('btn-salvar-refeicao').addEventListener('click', salvarRefeicao);

  renderListaAlimentos();
  renderIngredientesRefeicao();
  atualizarTotaisRefeicao();
}

// item tocável da lista de alimentos: botão de adicionar + estrela de favorito
function alimentoItemHTML(f, favSet) {
  const fav = favSet.has(f.id);
  return `
    <div style="display:flex;align-items:stretch;gap:4px">
      <button type="button" class="picker-item" style="flex:1" data-add-food="${f.id}">
        <span class="picker-item-txt">
          <span class="picker-item-name">${escapeHtml(f.nome)}</span>
          <span class="picker-item-musc">${f.kcal} kcal/100g</span>
        </span>
        ${ICO_PLUS}
      </button>
      <button type="button" class="btn-icon" data-fav-food="${f.id}" aria-pressed="${fav}"
        aria-label="${fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
        title="${fav ? 'Remover dos favoritos' : 'Favoritar'}">${fav ? '★' : '☆'}</button>
    </div>`;
}

// lista tocável de alimentos. Sem busca: favoritos e recentes no topo, depois
// todos. Com busca: só os que combinam (favoritos primeiro), sem diferenciar acento.
function renderListaAlimentos() {
  const el = document.getElementById('alimento-list');
  if (!el) return;
  const termo = semAcento(buscaAlimentoForm.trim());
  const favIds = getFavFoods();
  const favSet = new Set(favIds);
  const todos = allFoods().slice().sort((a, b) => COLLATOR_PT.compare(a.nome, b.nome));
  const secao = titulo => `<p class="hint" style="margin:8px 0 2px">${titulo}</p>`;
  let html = '';

  if (termo) {
    const opcoes = todos.filter(f => semAcento(f.nome).includes(termo));
    opcoes.sort((a, b) => (favSet.has(b.id) ? 1 : 0) - (favSet.has(a.id) ? 1 : 0)); // estável: mantém a ordem alfabética dentro de cada grupo
    const visiveis = opcoes.slice(0, MAX_ALIMENTOS_LISTA);
    html = visiveis.length
      ? visiveis.map(f => alimentoItemHTML(f, favSet)).join('')
      : '<p class="empty">Nenhum alimento encontrado com essa busca.</p>';
    if (opcoes.length > MAX_ALIMENTOS_LISTA) {
      html += `<p class="hint">Mostrando ${MAX_ALIMENTOS_LISTA} de ${opcoes.length}. Refine a busca para ver mais.</p>`;
    }
  } else {
    const favoritos = favIds.map(id => foodById(id)).filter(Boolean);
    const recentes = alimentosRecentesIds().filter(id => !favSet.has(id)).map(id => foodById(id)).filter(Boolean);
    if (favoritos.length) html += secao('⭐ Favoritos') + favoritos.map(f => alimentoItemHTML(f, favSet)).join('');
    if (recentes.length) html += secao('🕘 Usados recentemente') + recentes.map(f => alimentoItemHTML(f, favSet)).join('');
    if (favoritos.length || recentes.length) html += secao('Todos os alimentos');
    html += todos.slice(0, MAX_ALIMENTOS_LISTA).map(f => alimentoItemHTML(f, favSet)).join('');
    if (todos.length > MAX_ALIMENTOS_LISTA) {
      html += `<p class="hint">Mostrando ${MAX_ALIMENTOS_LISTA} de ${todos.length}. Use a busca para ver mais.</p>`;
    }
  }
  el.innerHTML = html;

  el.querySelectorAll('[data-add-food]').forEach(btn => {
    btn.addEventListener('click', () => adicionarAlimentoRefeicao(btn.dataset.addFood));
  });
  el.querySelectorAll('[data-fav-food]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.favFood;
      const atual = getFavFoods();
      setFavFoods(atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id]);
      const rolagem = el.scrollTop;
      renderListaAlimentos();
      el.scrollTop = rolagem;
    });
  });
}

function adicionarAlimentoRefeicao(foodId) {
  if (!draftRefeicao) return;
  const food = foodById(foodId);
  if (!food) return;
  const qtdInput = document.getElementById('qtd-alimento-g');
  let qtd = Number(qtdInput.value);
  if (!qtd || qtd <= 0) qtd = 100;
  draftRefeicao.ingredientes.push(ingredienteFromFood(food, qtd));

  // limpa a busca e volta a gramatura pro padrão, pra já ficar pronto
  // pra adicionar o próximo ingrediente
  buscaAlimentoForm = '';
  const busca = document.getElementById('busca-alimento');
  busca.value = '';
  qtdInput.value = 100;
  const lista = document.getElementById('alimento-list');
  renderListaAlimentos();
  if (lista) lista.scrollTop = 0;
  renderIngredientesRefeicao();
  atualizarTotaisRefeicao();
  toast(`${food.nome} adicionado`);
  try { busca.focus({ preventScroll: true }); } catch (e) { busca.focus(); }
}

function ingredienteRowHTML(ing, i) {
  return `
    <div class="draft-row">
      <div class="draft-row-head">
        <span class="ex-nome">${escapeHtml(ing.nome)}</span>
        <button class="btn-remove" data-remove-ingrediente="${i}" title="Remover">✕</button>
      </div>
      <div class="draft-fields">
        <label>Quantidade (g)<input type="number" min="0" step="1" inputmode="decimal" data-idx-ingrediente="${i}" value="${ing.quantidade}"/></label>
      </div>
      <p class="hint" data-ing-info="${i}">${textoMacrosIngrediente(ing)}</p>
    </div>`;
}
function textoMacrosIngrediente(ing) {
  return `${Math.round(ing.kcal)} kcal · P ${ing.prot.toFixed(1)}g · C ${ing.carb.toFixed(1)}g · G ${ing.gord.toFixed(1)}g`;
}

// redesenha só a lista de ingredientes (usado ao adicionar/remover)
function renderIngredientesRefeicao() {
  const el = document.getElementById('ingredientes-list');
  if (!el || !draftRefeicao) return;
  const d = draftRefeicao;

  el.innerHTML = d.ingredientes.length
    ? d.ingredientes.map((ing, i) => ingredienteRowHTML(ing, i)).join('')
    : '<p class="empty">Nenhum ingrediente adicionado ainda.</p>';

  el.querySelectorAll('[data-remove-ingrediente]').forEach(btn => {
    btn.addEventListener('click', () => {
      d.ingredientes.splice(Number(btn.dataset.removeIngrediente), 1);
      renderIngredientesRefeicao();
      atualizarTotaisRefeicao();
    });
  });
  // editar a quantidade NÃO redesenha nada: atualiza só o texto de macros
  // daquele ingrediente e os totais do rodapé (o campo mantém foco e cursor)
  el.querySelectorAll('[data-idx-ingrediente]').forEach(input => {
    input.addEventListener('input', () => {
      const i = Number(input.dataset.idxIngrediente);
      let novaQtd = Number(input.value);
      if (Number.isNaN(novaQtd) || novaQtd < 0) novaQtd = 0;
      const ing = d.ingredientes[i];
      recalcularIngredienteQtd(ing, novaQtd);
      const info = el.querySelector(`[data-ing-info="${i}"]`);
      if (info) info.textContent = textoMacrosIngrediente(ing);
      atualizarTotaisRefeicao();
    });
  });
}

function atualizarTotaisRefeicao() {
  if (!draftRefeicao) return;
  const t = calcTotaisIngredientes(draftRefeicao.ingredientes);
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('ref-tot-kcal', `${Math.round(t.kcal)} kcal`);
  set('ref-tot-prot', `${t.prot.toFixed(1)}g`);
  set('ref-tot-carb', `${t.carb.toFixed(1)}g`);
  set('ref-tot-gord', `${t.gord.toFixed(1)}g`);
}

function salvarRefeicao() {
  const d = draftRefeicao;
  const nome = d.nome.trim();
  if (!nome) {
    toast('Escolha o tipo da refeição antes de salvar.');
    const tipo = document.getElementById('refeicao-tipo');
    if (tipo) { tipo.classList.add('campo-erro'); tipo.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return;
  }
  if (!d.data) { toast('Informe a data da refeição.'); return; }
  if (!d.horario) { toast('Informe o horário da refeição.'); return; }
  if (d.ingredientes.length === 0) { toast('Adicione ao menos um ingrediente.'); return; }
  if (d.ingredientes.some(ing => !(ing.quantidade > 0))) { toast('Há ingrediente com quantidade zero.'); return; }

  const lista = getDieta();
  if (d.id) {
    const idx = lista.findIndex(r => r.id === d.id);
    if (idx >= 0) lista[idx] = { ...d, nome };
  } else {
    lista.push({ ...d, nome, id: uid() });
  }
  setDieta(lista);
  dietaData = d.data;
  draftRefeicao = null;
  closeRefeicao();
  currentTab = 'dieta';
  render();
  toast('Refeição salva!');
}

// ---------- alimento personalizado (modal, aberto de dentro da refeição) ----------
function renderAlimentoCustom() {
  const a = draftAlimentoCustom;
  resetModalCloseButton(ALIMENTO_CUSTOM_MOUNT, 'btn-close-alimento-custom');
  ALIMENTO_CUSTOM_MOUNT.innerHTML = `
    <section>
      <div class="modal-header">
        <h1>Novo alimento personalizado</h1>
      </div>
      <div class="modal-body">
        <p class="sub">Cadastre um alimento que não está na Tabela TACO, informando os valores nutricionais por 100g (rótulo da embalagem, por exemplo).</p>

        <div class="field-row">
          <label>Nome do alimento</label>
          <input id="alimento-nome" type="text" placeholder="Ex.: Barra de proteína XYZ" value="${escapeHtml(a.nome)}"/>
        </div>
        <div class="draft-fields">
          <label>Calorias (kcal/100g)<input type="number" min="0" step="1" id="alimento-kcal" value="${a.kcal}"/></label>
          <label>Proteínas (g/100g)<input type="number" min="0" step="0.1" id="alimento-prot" value="${a.prot}"/></label>
          <label>Carboidratos (g/100g)<input type="number" min="0" step="0.1" id="alimento-carb" value="${a.carb}"/></label>
          <label>Gorduras (g/100g)<input type="number" min="0" step="0.1" id="alimento-gord" value="${a.gord}"/></label>
        </div>

        ${getCustomFoods().length ? `
          <h2 class="subtitle">Seus alimentos personalizados</h2>
          <div class="exlist">
            ${getCustomFoods().map(f => `
              <div class="ex-card">
                <div class="ex-card-head">
                  <span class="ex-nome">${escapeHtml(f.nome)}</span>
                  <button class="btn-remove" data-del-alimento-custom="${f.id}" title="Excluir">✕</button>
                </div>
                <p class="hint">${f.kcal} kcal · P ${f.prot}g · C ${f.carb}g · G ${f.gord}g (por 100g)</p>
              </div>
            `).join('')}
          </div>` : ''}
      </div>
      <div class="modal-footer">
        <div class="actions-row">
          <button id="btn-salvar-alimento-custom" class="btn btn-accent">Salvar alimento</button>
        </div>
      </div>
    </section>`;
  attachModalCloseButton(ALIMENTO_CUSTOM_MOUNT, 'btn-close-alimento-custom');

  document.getElementById('alimento-nome').addEventListener('input', e => { a.nome = e.target.value; });
  document.getElementById('alimento-kcal').addEventListener('input', e => { a.kcal = Number(e.target.value) || 0; });
  document.getElementById('alimento-prot').addEventListener('input', e => { a.prot = Number(e.target.value) || 0; });
  document.getElementById('alimento-carb').addEventListener('input', e => { a.carb = Number(e.target.value) || 0; });
  document.getElementById('alimento-gord').addEventListener('input', e => { a.gord = Number(e.target.value) || 0; });
  document.getElementById('btn-salvar-alimento-custom').addEventListener('click', salvarAlimentoCustom);
  ALIMENTO_CUSTOM_MOUNT.querySelectorAll('[data-del-alimento-custom]').forEach(btn => {
    btn.addEventListener('click', () => {
      showConfirm('Excluir este alimento personalizado?', () => {
        setCustomFoods(getCustomFoods().filter(f => f.id !== btn.dataset.delAlimentoCustom));
        renderAlimentoCustom();
        if (draftRefeicao) renderListaAlimentos(); // tira o alimento excluído da lista do formulário aberto
        toast('Alimento personalizado excluído.');
      });
    });
  });
}

function salvarAlimentoCustom() {
  const a = draftAlimentoCustom;
  const nome = a.nome.trim();
  if (!nome) { toast('Dê um nome ao alimento antes de salvar.'); return; }
  const foods = getCustomFoods();
  foods.push({ id: uid(), nome, kcal: a.kcal, prot: a.prot, carb: a.carb, gord: a.gord, personalizado: true });
  setCustomFoods(foods);
  closeAlimentoCustom();
  if (draftRefeicao) {
    // deixa o alimento recém-criado já filtrado na busca, pronto pra tocar e adicionar
    buscaAlimentoForm = nome;
    renderRefeicaoForm();
  }
  toast('Alimento personalizado salvo!');
}

// ---------- meta de dieta (modal) ----------
function renderMetaDietaForm() {
  const m = draftMetaDieta;
  resetModalCloseButton(META_DIETA_MOUNT, 'btn-close-meta-dieta');
  META_DIETA_MOUNT.innerHTML = `
    <section>
      <div class="modal-header">
        <h1>Meta diária</h1>
      </div>
      <div class="modal-body">
        <div class="draft-fields">
          <label>Calorias (kcal/dia)<input type="number" min="0" step="1" id="meta-kcal" value="${m.kcal}"/></label>
          <label>Proteínas (g/dia)<input type="number" min="0" step="1" id="meta-prot" value="${m.prot}"/></label>
          <label>Carboidratos (g/dia)<input type="number" min="0" step="1" id="meta-carb" value="${m.carb}"/></label>
          <label>Gorduras (g/dia)<input type="number" min="0" step="1" id="meta-gord" value="${m.gord}"/></label>
        </div>
      </div>
      <div class="modal-footer">
        <div class="actions-row">
          <button id="btn-salvar-meta" class="btn btn-accent">Salvar meta</button>
          ${metaDefinida(m) ? '<button id="btn-limpar-meta" class="btn btn-ghost">Remover meta</button>' : ''}
        </div>
      </div>
    </section>`;
  attachModalCloseButton(META_DIETA_MOUNT, 'btn-close-meta-dieta');

  document.getElementById('meta-kcal').addEventListener('input', e => { m.kcal = Number(e.target.value) || 0; });
  document.getElementById('meta-prot').addEventListener('input', e => { m.prot = Number(e.target.value) || 0; });
  document.getElementById('meta-carb').addEventListener('input', e => { m.carb = Number(e.target.value) || 0; });
  document.getElementById('meta-gord').addEventListener('input', e => { m.gord = Number(e.target.value) || 0; });
  document.getElementById('btn-salvar-meta').addEventListener('click', salvarMetaDieta);
  const btnLimpar = document.getElementById('btn-limpar-meta');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      showConfirm('Remover a meta diária de calorias e macros?', () => {
        setMetaDieta({ kcal: 0, prot: 0, carb: 0, gord: 0 });
        closeMetaDieta();
        if (currentTab === 'dieta') renderDieta();
        toast('Meta removida.');
      });
    });
  }
}
function salvarMetaDieta() {
  setMetaDieta({ ...draftMetaDieta });
  closeMetaDieta();
  if (currentTab === 'dieta') renderDieta();
  toast('Meta salva!');
}

// ================= ÁGUA =================
function totalAguaDia(data) {
  return getAgua().filter(r => r.data === data).reduce((soma, r) => soma + r.ml, 0);
}

function adicionarAgua(ml) {
  ml = Math.round(Number(ml));
  if (!ml || ml <= 0) { toast('Informe uma quantidade de água válida.'); return; }
  const arr = getAgua();
  const novo = { id: uid(), data: aguaData, horario: horaAtualHHMM(), ml };
  arr.push(novo);
  setAgua(arr);
  // lembra o último valor registrado: já vem marcado na próxima vez e é
  // o valor usado pelo atalho "+" da tela inicial
  setAguaConfig({ ...getAguaConfig(), ultimoMl: ml });
  if (AGUA_PRESETS.includes(ml)) {
    aguaChipSel = ml;
  } else {
    aguaChipSel = 'outro';
    aguaCustomMl = String(ml);
  }
  renderAgua();
  desfazivel(`+${ml} ml registrado!`, () => {
    setAgua(getAgua().filter(r => r.id !== novo.id));
    if (currentTab === 'agua') renderAgua();
  });
}

// define o chip inicial a partir do último valor registrado (padrão 250 ml);
// valor fora dos presets cai em "Outro" já preenchido
function aguaEstadoInicial() {
  if (aguaChipSel !== null) return;
  const ultimo = Number(getAguaConfig().ultimoMl) || 250;
  if (AGUA_PRESETS.includes(ultimo)) {
    aguaChipSel = ultimo;
  } else {
    aguaChipSel = 'outro';
    aguaCustomMl = String(ultimo);
  }
}
// ml que o botão "Adicionar" vai registrar agora (0 se o campo "Outro" estiver vazio/inválido)
function aguaMlSelecionado() {
  if (aguaChipSel === 'outro') {
    const input = document.getElementById('agua-custom-ml');
    return Math.round(Number(input ? input.value : aguaCustomMl)) || 0;
  }
  return aguaChipSel;
}
function atualizarBotaoAddAgua() {
  const btn = document.getElementById('btn-agua-add');
  if (!btn) return;
  btn.disabled = !(aguaMlSelecionado() > 0);
}

function renderAgua() {
  aguaEstadoInicial();
  const config = getAguaConfig();
  const doDia = getAgua().filter(r => r.data === aguaData).sort((a, b) => a.horario.localeCompare(b.horario));
  const total = doDia.reduce((s, r) => s + r.ml, 0);
  const temMeta = config.metaMl > 0;
  const pct = temMeta ? Math.max(0, Math.min(100, Math.round((total / config.metaMl) * 100))) : 0;
  const restante = temMeta ? Math.max(0, config.metaMl - total) : 0;

  APP.innerHTML = `
    <section class="panel">
      <div class="section-head">
        <h1>Água</h1>
        <button id="btn-agua-config" class="btn btn-ghost btn-small" style="margin-top:0">Meta e lembretes</button>
      </div>

      <div class="date-nav">
        <div class="date-picker-pill">
          <button id="btn-agua-dia-anterior" class="btn-icon" title="Dia anterior">‹</button>
          <input type="date" id="agua-data-input" value="${aguaData}"/>
          <button id="btn-agua-dia-proximo" class="btn-icon" title="Próximo dia">›</button>
        </div>
        <button id="btn-agua-dia-hoje" class="btn-hoje ${aguaData === todayISO() ? 'is-hoje' : ''}">Hoje</button>
      </div>

      <div class="card-metas-hoje">
        <div class="card-metas-top">
          <span class="card-metas-val">${total} <small>ml</small></span>
          <span class="card-metas-badge">${temMeta ? pct : 0}%</span>
        </div>
        <p class="card-metas-sub">
          ${temMeta
            ? (total >= config.metaMl ? 'Meta de água atingida! 🎉' : `Faltam ${restante} ml para a meta de ${config.metaMl} ml`)
            : 'Nenhuma meta definida.'}
        </p>
        ${barraProgressoHTML(total, config.metaMl, { fina: true, aria: 'Progresso da meta de água' })}
      </div>

      <div class="chip-filter agua-chips" id="agua-chips">
        ${AGUA_PRESETS.map(ml => `<button type="button" class="chip-toggle ${aguaChipSel === ml ? 'active' : ''}" data-agua-chip="${ml}">${ml} ml</button>`).join('')}
        <button type="button" class="chip-toggle ${aguaChipSel === 'outro' ? 'active' : ''}" data-agua-chip="outro">Outro</button>
      </div>
      <div class="agua-add-row">
        <div class="field-row agua-outro" id="agua-outro-wrap" ${aguaChipSel === 'outro' ? '' : 'hidden'}>
          <input type="number" min="1" step="1" inputmode="numeric" id="agua-custom-ml" placeholder="Quantia em ml" value="${escapeHtml(aguaCustomMl)}"/>
        </div>
        <button id="btn-agua-add" class="btn btn-accent agua-add-btn">Adicionar</button>
      </div>

      <h2 class="subtitle">Registros do dia</h2>
      ${doDia.length ? `
        <div class="hist-list">
          ${doDia.map(r => `
            <div class="hist-card agua-card">
              <div class="hist-card-head">
                <div><strong>${r.ml} ml</strong><span class="hint mono"> — ${r.horario}</span></div>
                <button class="btn-remove" data-del-agua="${r.id}" title="Excluir">✕</button>
              </div>
            </div>`).join('')}
        </div>` : emptyStateHTML({
          icon: ICO_DROP,
          title: 'Nenhum registro de água',
          message: 'Escolha uma quantidade acima e toque em "Adicionar".'
        })}
    </section>`;

  document.getElementById('btn-agua-config').addEventListener('click', openAguaConfig);
  document.getElementById('agua-data-input').addEventListener('change', e => {
    aguaData = e.target.value || todayISO();
    render();
  });
  document.getElementById('btn-agua-dia-hoje').addEventListener('click', () => { aguaData = todayISO(); render(); });
  document.getElementById('btn-agua-dia-anterior').addEventListener('click', () => { aguaData = shiftDateISO(aguaData, -1); render(); });
  document.getElementById('btn-agua-dia-proximo').addEventListener('click', () => { aguaData = shiftDateISO(aguaData, 1); render(); });

  const wrapOutro = document.getElementById('agua-outro-wrap');
  const inputCustom = document.getElementById('agua-custom-ml');
  APP.querySelectorAll('[data-agua-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.aguaChip;
      aguaChipSel = v === 'outro' ? 'outro' : Number(v);
      APP.querySelectorAll('[data-agua-chip]').forEach(b => b.classList.toggle('active', b === btn));
      wrapOutro.hidden = aguaChipSel !== 'outro';
      if (aguaChipSel === 'outro') inputCustom.focus();
      atualizarBotaoAddAgua();
    });
  });
  inputCustom.addEventListener('input', () => {
    aguaCustomMl = inputCustom.value;
    atualizarBotaoAddAgua();
  });
  inputCustom.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); adicionarAgua(aguaMlSelecionado()); }
  });
  document.getElementById('btn-agua-add').addEventListener('click', () => adicionarAgua(aguaMlSelecionado()));
  atualizarBotaoAddAgua();

  APP.querySelectorAll('[data-del-agua]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delAgua;
      const lista = getAgua();
      const pos = lista.findIndex(r => r.id === id);
      if (pos < 0) return;
      const removido = lista[pos];
      setAgua(lista.filter(r => r.id !== id));
      renderAgua();
      desfazivel('Registro excluído', () => {
        const atual = getAgua();
        if (atual.some(r => r.id === removido.id)) return;
        atual.splice(Math.min(pos, atual.length), 0, removido);
        setAgua(atual);
        if (currentTab === 'agua') renderAgua();
      });
    });
  });
}

// ---------- config de meta e lembretes (modal) ----------
function renderAguaConfigForm() {
  const c = draftAguaConfig;
  const suportaNotificacao = !!getLocalNotifications();

  resetModalCloseButton(AGUA_CONFIG_MOUNT, 'btn-close-agua-config');
  AGUA_CONFIG_MOUNT.innerHTML = `
    <section>
      <div class="modal-header">
        <h1>Meta e lembretes de água</h1>
      </div>
      <div class="modal-body">

        <div class="draft-fields">
          <label>Meta diária (ml)<input type="number" min="0" step="50" id="agua-cfg-meta" value="${c.metaMl}"/></label>
          <label>Acordar<input type="time" id="agua-cfg-acordar" value="${c.acordar}"/></label>
          <label>Dormir<input type="time" id="agua-cfg-dormir" value="${c.dormir}"/></label>
          <label>Lembrar a cada (min)<input type="number" min="15" step="5" id="agua-cfg-intervalo" value="${c.intervaloMin}"/></label>
        </div>
        <p class="hint">Os lembretes só disparam entre o horário de acordar e o de dormir.</p>

        <h2 class="subtitle">Notificações</h2>
        <label class="chk-inline">
          <input type="checkbox" id="agua-cfg-notif" ${c.notificacoesAtivas ? 'checked' : ''} ${!suportaNotificacao ? 'disabled' : ''}/>
          <span>Ativar lembretes por notificação</span>
        </label>
      </div>

      <div class="modal-footer">
        <div class="actions-row">
          <button id="btn-salvar-agua-cfg" class="btn btn-accent">Salvar</button>
        </div>
      </div>
    </section>`;
  attachModalCloseButton(AGUA_CONFIG_MOUNT, 'btn-close-agua-config');

  document.getElementById('agua-cfg-meta').addEventListener('input', e => { c.metaMl = Math.max(0, Number(e.target.value) || 0); });
  document.getElementById('agua-cfg-acordar').addEventListener('input', e => { c.acordar = e.target.value || c.acordar; });
  document.getElementById('agua-cfg-dormir').addEventListener('input', e => { c.dormir = e.target.value || c.dormir; });
  document.getElementById('agua-cfg-intervalo').addEventListener('input', e => { c.intervaloMin = Math.max(15, Number(e.target.value) || 60); });

  const chkNotif = document.getElementById('agua-cfg-notif');
  chkNotif.addEventListener('change', async () => {
    if (!chkNotif.checked) { c.notificacoesAtivas = false; return; }
    if (!suportaNotificacao) { toast('Os lembretes só funcionam no app Android.'); chkNotif.checked = false; return; }
    const ok = await pedirPermissaoNotificacao();
    if (ok) { c.notificacoesAtivas = true; toast('Notificações ativadas!'); }
    else {
      c.notificacoesAtivas = false;
      chkNotif.checked = false;
      toast('Permissão negada. Libere as notificações do Maromba nas configurações do Android.');
    }
  });

  document.getElementById('btn-salvar-agua-cfg').addEventListener('click', salvarAguaConfig);
}

function salvarAguaConfig() {
  const nova = { ...draftAguaConfig };
  delete nova.ultimaNotificacaoTs; // campo antigo, não é mais usado
  setAguaConfig(nova);
  agendarLembretesAgua(nova);
  closeAguaConfig();
  if (currentTab === 'agua') renderAgua();
  toast('Configurações de água salvas!');
}

// ---------- lembretes periódicos (notificações nativas do Android) ----------
// Os lembretes são agendados no sistema (@capacitor/local-notifications) como
// notificações diárias repetidas, uma por horário dentro da janela acordado.
// Por isso funcionam com o app fechado e sobrevivem a reiniciar o celular.
// Como o texto é fixo, não mostra o total bebido no dia.
const AGUA_NOTIF_ID_BASE = 1000; // ids 1000+ reservados para os lembretes de água

function getLocalNotifications() {
  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
  return (cap.Plugins && cap.Plugins.LocalNotifications) || null;
}

// true se a permissão de notificação está concedida (pede ao usuário se ainda não foi)
async function pedirPermissaoNotificacao() {
  const ln = getLocalNotifications();
  if (!ln) return false;
  try {
    let p = await ln.checkPermissions();
    if (p.display !== 'granted') p = await ln.requestPermissions();
    return p.display === 'granted';
  } catch (e) {
    console.warn('Falha ao pedir permissão de notificação', e);
    return false;
  }
}

// horários (hora/minuto) dos lembretes: de "acordar" até antes de "dormir",
// a cada intervaloMin. Trata janela que passa da meia-noite (ex.: 22:00–06:00).
function horariosLembreteAgua(config) {
  const [ah, am] = config.acordar.split(':').map(Number);
  const [dh, dm] = config.dormir.split(':').map(Number);
  const inicio = ah * 60 + am;
  let janela = ((dh * 60 + dm) - inicio + 1440) % 1440;
  if (janela === 0) janela = 1440; // horários iguais = dia todo
  const passo = Math.max(15, Number(config.intervaloMin) || 60);
  const horarios = [];
  for (let off = 0; off < janela; off += passo) {
    const m = (inicio + off) % 1440;
    horarios.push({ hour: Math.floor(m / 60), minute: m % 60 });
  }
  return horarios;
}

// cancela os lembretes antigos e agenda de novo conforme a config atual
async function agendarLembretesAgua(config) {
  const ln = getLocalNotifications();
  if (!ln) return;
  try {
    const pend = await ln.getPending();
    const antigos = (pend.notifications || []).filter(n => n.id >= AGUA_NOTIF_ID_BASE && n.id < AGUA_NOTIF_ID_BASE + 1000);
    if (antigos.length) await ln.cancel({ notifications: antigos.map(n => ({ id: n.id })) });
    if (!config.notificacoesAtivas) return;
    const p = await ln.checkPermissions();
    if (p.display !== 'granted') return;
    const corpo = config.metaMl > 0
      ? `Bora beber mais um pouco? Meta de hoje: ${config.metaMl} ml.`
      : 'Bora beber mais um pouco?';
    const notifications = horariosLembreteAgua(config).map((h, i) => ({
      id: AGUA_NOTIF_ID_BASE + i,
      title: '💧 Hora de beber água',
      body: corpo,
      schedule: { on: { hour: h.hour, minute: h.minute }, allowWhileIdle: true },
    }));
    await ln.schedule({ notifications });
  } catch (e) {
    console.warn('Falha ao agendar lembretes de água', e);
    toast('Não foi possível agendar os lembretes de água.');
  }
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // tema claro/escuro: o <head> já aplicou o tema salvo (ou o do aparelho);
  // aqui sincronizamos a cor da barra do navegador, os ícones das barras
  // nativas do Android (aplicarTema -> SystemBars) e ligamos o botão
  aplicarTema(document.documentElement.dataset.theme || 'light');
  document.getElementById('btn-tema').addEventListener('click', () => {
    const novo = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    aplicarTema(novo);
    try { localStorage.setItem('maromba_tema', novo); } catch (e) { /* sem storage */ }
    if (currentTab === 'historico') render(); // redesenha o gráfico com as cores novas
  });

  document.getElementById('btn-close-montar').addEventListener('click', closeMontar);
  document.getElementById('btn-config').addEventListener('click', openConfig);
  document.getElementById('btn-close-config').addEventListener('click', closeConfig);
  document.getElementById('btn-close-exercicio-custom').addEventListener('click', closeExercicioCustom);
  document.getElementById('btn-close-refeicao').addEventListener('click', closeRefeicao);
  document.getElementById('btn-close-alimento-custom').addEventListener('click', closeAlimentoCustom);
  document.getElementById('btn-close-meta-dieta').addEventListener('click', closeMetaDieta);
  document.getElementById('btn-close-agua-config').addEventListener('click', closeAguaConfig);

  MODAL_MONTAR.addEventListener('click', e => { if (e.target === MODAL_MONTAR) closeMontar(); });
  MODAL_CONFIG.addEventListener('click', e => { if (e.target === MODAL_CONFIG) closeConfig(); });
  MODAL_EXERCICIO_CUSTOM.addEventListener('click', e => { if (e.target === MODAL_EXERCICIO_CUSTOM) closeExercicioCustom(); });
  MODAL_REFEICAO.addEventListener('click', e => { if (e.target === MODAL_REFEICAO) closeRefeicao(); });
  MODAL_ALIMENTO_CUSTOM.addEventListener('click', e => { if (e.target === MODAL_ALIMENTO_CUSTOM) closeAlimentoCustom(); });
  MODAL_META_DIETA.addEventListener('click', e => { if (e.target === MODAL_META_DIETA) closeMetaDieta(); });
  MODAL_AGUA_CONFIG.addEventListener('click', e => { if (e.target === MODAL_AGUA_CONFIG) closeAguaConfig(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const modalConfirm = document.getElementById('modal-confirm');
    if (!modalConfirm.hidden) { document.getElementById('btn-confirm-cancel').click(); return; }
    if (!MODAL_ALIMENTO_CUSTOM.hidden) { closeAlimentoCustom(); return; }
    if (!MODAL_AGUA_CONFIG.hidden) { closeAguaConfig(); return; }
    if (!MODAL_META_DIETA.hidden) { closeMetaDieta(); return; }
    if (!MODAL_REFEICAO.hidden) { closeRefeicao(); return; }
    if (!MODAL_MONTAR.hidden) closeMontar();
    if (!MODAL_CONFIG.hidden) closeConfig();
    if (!MODAL_EXERCICIO_CUSTOM.hidden) closeExercicioCustom();
  });

  document.getElementById('input-importar-json').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = ''; // permite importar o mesmo arquivo de novo depois
    if (file) importarDados(file);
  });

  // botão voltar do Android (plugin @capacitor/app)
  try {
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (CapApp && typeof CapApp.addListener === 'function') {
      CapApp.addListener('backButton', tratarBotaoVoltar);
    }
  } catch (e) { /* fora do app nativo: ignora */ }

  syncCustomExercises();
  syncCustomFoods();
  const abaSalva = loadSavedTab();
  if (abaSalva) currentTab = abaSalva;
  render();

  // ---------- lembretes de água ----------
  // Reagenda as notificações nativas conforme a config salva (cobre importação
  // de backup, troca de fuso e atualização do app).
  agendarLembretesAgua(getAguaConfig());
});