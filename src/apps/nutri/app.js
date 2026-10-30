/* =========================================================
   NUTRI — app.js  (Dieta + Água, separados do Maromba)
   Toda a lógica roda no navegador, dados salvos no localStorage.
   As chaves continuam com o prefixo "maromba_" de propósito: assim os
   dados que já existiam, o hub (XP, missões) e os backups antigos seguem
   funcionando sem migração.
   ========================================================= */

// ---------- storage ----------
const STORAGE_KEYS = {
  DIETA: 'maromba_dieta',
  CUSTOM_ALIMENTOS: 'maromba_alimentos_personalizados',
  META_DIETA: 'maromba_meta_dieta',
  AGUA: 'maromba_agua',
  AGUA_CONFIG: 'maromba_agua_config',
  ALIMENTOS_FAV: 'maromba_alimentos_favoritos',    // ids de alimentos favoritos
  ULTIMO_BACKUP: 'nutri_ultimo_backup',            // ISO da última exportação (só deste aparelho; não entra no backup)
  BACKUP_ADIADO: 'nutri_backup_aviso_adiado',
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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// minúsculas e sem acento, pra busca de "feijao" achar "Feijão"
function semAcento(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

// Barra de progresso única "atual / meta". Retorna '' se não há meta.
// fina: versão compacta do painel Hoje/Sua semana. aria: rótulo para leitores de tela.
function barraProgressoHTML(atual, meta, { fina = false, aria = '' } = {}) {
  if (!meta || meta <= 0) return '';
  const pct = Math.max(0, Math.min(100, Math.round((atual / meta) * 100)));
  return `<div class="meta-bar-track${fina ? ' today-bar' : ''}" role="progressbar"${aria ? ` aria-label="${aria}"` : ''} aria-valuemin="0" aria-valuemax="${meta}" aria-valuenow="${Math.round(Math.min(atual, meta))}">
    <div class="meta-bar-fill ${atual > meta ? 'over' : ''}" style="width:${pct}%"></div>
  </div>`;
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

// ---------- estado e telas ----------
const APP = document.getElementById('app');
const CONFIG_MOUNT = document.getElementById('config-mount');
const MODAL_CONFIG = document.getElementById('modal-config');
const REFEICAO_MOUNT = document.getElementById('refeicao-mount');
const MODAL_REFEICAO = document.getElementById('modal-refeicao');
const ALIMENTO_CUSTOM_MOUNT = document.getElementById('alimento-custom-mount');
const MODAL_ALIMENTO_CUSTOM = document.getElementById('modal-alimento-custom');
const META_DIETA_MOUNT = document.getElementById('meta-dieta-mount');
const MODAL_META_DIETA = document.getElementById('modal-meta-dieta');
const AGUA_CONFIG_MOUNT = document.getElementById('agua-config-mount');
const MODAL_AGUA_CONFIG = document.getElementById('modal-agua-config');

const COLLATOR_PT = new Intl.Collator('pt-BR');
let currentTab = 'dieta';          // 'dieta' | 'agua'
// Aba atual no sessionStorage: sobrevive ao recarregar, e o hub usa a mesma chave para abrir direto na Água.
const TAB_STORAGE_KEY = 'nutri_aba_atual';
const TABS_VALIDAS = ['dieta', 'agua'];
function loadSavedTab() {
  try { const t = sessionStorage.getItem(TAB_STORAGE_KEY); return TABS_VALIDAS.includes(t) ? t : null; } catch (e) { return null; }
}
function saveCurrentTab() {
  try { sessionStorage.setItem(TAB_STORAGE_KEY, currentTab); } catch (e) { /* sem storage */ }
}
let dietaData = todayISO();       // dia sendo visualizado na aba Dieta
let copiarDiaOrigem = null;       // dia de origem escolhido em "Repetir refeições de outro dia" (null = dia anterior ao aberto)
let copiarDiaAberto = false;      // o painel "Repetir refeições" está expandido?
let refeicaoAberta = null;        // id da refeição expandida na lista do dia
let draftRefeicao = null;         // refeição sendo criada/editada no modal
let buscaAlimentoForm = '';       // termo de busca de alimento dentro do modal de refeição
let draftAlimentoCustom = null;   // alimento personalizado sendo cadastrado
let draftMetaDieta = null;        // meta de calorias/macros sendo editada no modal
let aguaData = todayISO();        // dia sendo visualizado na aba Água
let draftAguaConfig = null;       // config de meta/lembretes de água sendo editada no modal
let aguaChipSel = null;           // chip de ml selecionado: número do preset ou 'outro' (null = ainda não inicializado)
let aguaCustomMl = '';            // texto do campo "Outro" (ml)
const AGUA_PRESETS = [200, 250, 300, 500]; // ml — medidas rápidas padronizadas
const OPCOES_REFEICAO = ['Café da manhã', 'Almoço', 'Janta', 'Ceia', 'Lanche']; // tipos de refeição (seleção única)

function switchTab(id) { currentTab = id; render(); }

// ---------- botão "voltar" do Android ----------
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
// 1) confirmação aberta  2) modal aberto (o do topo)  3) tela anterior  4) início  5) volta ao Lobby
function tratarBotaoVoltar() {
  const modalConfirm = document.getElementById('modal-confirm');
  if (modalConfirm && !modalConfirm.hidden) { document.getElementById('btn-confirm-cancel').click(); return; }
  const modais = [
    [MODAL_ALIMENTO_CUSTOM, closeAlimentoCustom],
    [MODAL_AGUA_CONFIG, closeAguaConfig],
    [MODAL_META_DIETA, closeMetaDieta],
    [MODAL_REFEICAO, closeRefeicao],
    [MODAL_CONFIG, closeConfig],
  ];
  for (const [modal, fechar] of modais) {
    if (!modal.hidden) { fechar(); return; }
  }
  while (pilhaAbas.length) {
    const anterior = pilhaAbas.pop();
    if (anterior !== currentTab) { navegandoVoltar = true; currentTab = anterior; render(); return; }
  }
  if (currentTab !== 'dieta') { navegandoVoltar = true; currentTab = 'dieta'; render(); return; }
  window.location.href = '../../index.html';
}

function render() {
  registrarMudancaDeAba();
  saveCurrentTab();
  document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
  switch (currentTab) {
    case 'agua': renderAgua(); break;
    default: renderDieta();
  }
}

// ================= MODAIS =================
function openConfig() {
  MODAL_CONFIG.hidden = false;
  renderDados();
}
function closeConfig() {
  MODAL_CONFIG.hidden = true;
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
        Hoje: ${getDieta().length} refeição(ões) registrada(s), ${getCustomFoods().length} alimento(s) personalizado(s),
        ${getAgua().length} registro(s) de água.
      </p>
      <p class="hint backup-ultimo ${backupAtrasado ? 'atrasado' : ''}">${textoBackup}</p>
      <div class="backup-actions">
        <button id="btn-exportar-dados" class="btn btn-accent">${ICON_DOWNLOAD}Exportar backup (.json)</button>
        <button id="btn-importar-dados" class="btn btn-ghost">${ICON_UPLOAD}Importar backup (.json)</button>
      </div>
      <p class="hint backup-note">Importar um arquivo <strong>substitui</strong> a dieta, os alimentos personalizados e a água deste aparelho. Treinos e finanças não são tocados. Backups antigos do Maromba também servem: o Nutri aproveita só a parte de dieta e água.</p>
    </section>`;
  document.getElementById('btn-exportar-dados').addEventListener('click', exportarDados);
  document.getElementById('btn-importar-dados').addEventListener('click', () => {
    document.getElementById('input-importar-json').click();
  });
}

function aoConcluirBackup() {
  marcarBackupFeito();
  if (!MODAL_CONFIG.hidden) renderDados();
}

async function exportarDados() {
  const payload = {
    app: 'nutri',
    versao: 1,
    exportadoEm: new Date().toISOString(),
    dados: {
      dieta: getDieta(),
      alimentosPersonalizados: getCustomFoods(),
      metaDieta: getMetaDieta(),
      agua: getAgua(),
      aguaConfig: getAguaConfig(),
      alimentosFavoritos: getFavFoods(),
    },
  };
  const json = JSON.stringify(payload, null, 2);
  const nomeArquivo = `nutri-backup-${todayISO()}.json`;

  // App Android (Capacitor): salva no cache e abre o menu de compartilhar do Android.
  const cap = window.Capacitor;
  const plugins = cap && cap.Plugins;
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && plugins && plugins.Filesystem && plugins.Share) {
    try {
      const r = await plugins.Filesystem.writeFile({ path: nomeArquivo, data: json, directory: 'CACHE', encoding: 'utf8' });
      await plugins.Share.share({ title: 'Backup do Nutri', url: r.uri, dialogTitle: 'Salvar backup' });
      aoConcluirBackup();
    } catch (e) {
      if (/cancel/i.test(String((e && e.message) || e))) return;
      console.warn('Falha ao compartilhar backup', e);
      toast('Não foi possível compartilhar o backup.');
    }
    return;
  }

  // Navegador: baixa o arquivo direto.
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    aoConcluirBackup();
    toast('Backup exportado!');
  } catch (e) {
    console.warn('Falha ao exportar', e);
    toast('Não foi possível gerar o arquivo de backup.');
  }
}

// aceita o formato do botão "Exportar" e também campos que vêm como string JSON
function normalizarCampoImportado(v) {
  if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return null; } }
  return v;
}

function importarDados(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let payload;
    try { payload = JSON.parse(reader.result); } catch (e) { toast('Arquivo inválido: não é um JSON legível.'); return; }
    const bruto = (payload && typeof payload === 'object' && payload.dados) ? payload.dados : payload;
    if (!bruto || typeof bruto !== 'object') { toast('Arquivo não reconhecido como backup.'); return; }
    const dieta = normalizarCampoImportado(bruto.dieta);
    const alimentosPersonalizados = normalizarCampoImportado(bruto.alimentosPersonalizados);
    const agua = normalizarCampoImportado(bruto.agua);
    if (!Array.isArray(dieta) && !Array.isArray(alimentosPersonalizados) && !Array.isArray(agua)) {
      toast('Nenhum dado de dieta ou água nesse arquivo.');
      return;
    }
    showConfirm('Importar vai substituir a dieta, os alimentos personalizados, a água e as metas deste aparelho por este arquivo. Continuar?', () => {
      if (Array.isArray(dieta)) setDieta(dieta);
      if (Array.isArray(alimentosPersonalizados)) setCustomFoods(alimentosPersonalizados);
      if (Array.isArray(agua)) setAgua(agua);
      const metaDieta = normalizarCampoImportado(bruto.metaDieta);
      if (metaDieta && typeof metaDieta === 'object') setMetaDieta(metaDieta);
      const aguaConfig = normalizarCampoImportado(bruto.aguaConfig);
      if (aguaConfig && typeof aguaConfig === 'object') setAguaConfig(aguaConfig);
      const favoritos = normalizarCampoImportado(bruto.alimentosFavoritos);
      if (Array.isArray(favoritos)) setFavFoods(favoritos);
      agendarLembretesAgua(getAguaConfig());
      aguaChipSel = null; // recalcula o chip a partir do ultimoMl do backup
      toast('Dados importados com sucesso!');
      closeConfig();
      render();
    }, { okLabel: 'Importar e substituir' });
  };
  reader.onerror = () => toast('Não foi possível ler o arquivo.');
  reader.readAsText(file);
}

function getLocalNotifications() {
  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
  return (cap.Plugins && cap.Plugins.LocalNotifications) || null;
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
        <button id="btn-editar-meta" class="btn btn-ghost" style="width:100%; margin:0;">Meta e macros</button>
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
            ? (totais.kcal >= meta.kcal ? 'Meta de calorias atingida' : `Faltam ${Math.round(meta.kcal - totais.kcal)} kcal para a meta de ${Math.round(meta.kcal)} kcal`)
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
        title="${fav ? 'Remover dos favoritos' : 'Favoritar'}"><svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5z"/></svg></button>
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
  const secao = titulo => `<p class="hint" style="margin:10px 0 2px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:11px">${titulo}</p>`;
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
    if (favoritos.length) html += secao('Favoritos') + favoritos.map(f => alimentoItemHTML(f, favSet)).join('');
    if (recentes.length) html += secao('Usados recentemente') + recentes.map(f => alimentoItemHTML(f, favSet)).join('');
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
        <button id="btn-agua-config" class="btn btn-ghost" style="width:100%; margin:0;">Meta e lembretes</button>
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
            ? (total >= config.metaMl ? 'Meta de água atingida' : `Faltam ${restante} ml para a meta de ${config.metaMl} ml`)
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
  sincronizarBarrasSistema('dark');

  document.getElementById('btn-config').addEventListener('click', openConfig);
  document.getElementById('btn-close-config').addEventListener('click', closeConfig);
  document.getElementById('btn-close-refeicao').addEventListener('click', closeRefeicao);
  document.getElementById('btn-close-alimento-custom').addEventListener('click', closeAlimentoCustom);
  document.getElementById('btn-close-meta-dieta').addEventListener('click', closeMetaDieta);
  document.getElementById('btn-close-agua-config').addEventListener('click', closeAguaConfig);

  MODAL_CONFIG.addEventListener('click', e => { if (e.target === MODAL_CONFIG) closeConfig(); });
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
    if (!MODAL_CONFIG.hidden) closeConfig();
  });

  document.getElementById('input-importar-json').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) importarDados(file);
  });

  // botão voltar do Android (plugin @capacitor/app)
  try {
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (CapApp && typeof CapApp.addListener === 'function') CapApp.addListener('backButton', tratarBotaoVoltar);
  } catch (e) { /* fora do app nativo: ignora */ }

  syncCustomFoods();
  const abaSalva = loadSavedTab();
  if (abaSalva) currentTab = abaSalva;
  render();

  // Reagenda os lembretes de água conforme a config salva (cobre importação, troca de fuso e atualização do app).
  agendarLembretesAgua(getAguaConfig());
});