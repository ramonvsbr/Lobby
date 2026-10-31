/* LOBBY — hub. Para adicionar um app: pasta em apps/ + um item em APPS. */
(function(){
'use strict';
var $ = function(id){ return document.getElementById(id); };
var pad = function(n){ return n < 10 ? '0'+n : ''+n; };
var iso = function(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
var J = function(k, def){ try{ var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; }catch(e){ return def; } };
var money = function(c){ return 'R$ ' + (c/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
var XP = { treino:50, recorde:15, meta:20, agua:5, refeicao:10, gasto:10 };
var CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/* ---------- dados e pontuação (tudo calculado do que já está salvo) ---------- */
function stats(){
  var today = iso(new Date()), days = {};
  var D = function(k){ return days[k] || (days[k] = { t:0, rec:0, ml:0, diet:0, gasto:0 }); };
  var hist = J('maromba_historico', []), agua = J('maromba_agua', []), dieta = J('maromba_dieta', []);
  var meta = (J('maromba_agua_config', {}) || {}).metaMl || 2000;
  var s = J('saldo-dados', {}), ent = (s.daily && s.daily.entries) || [];
  hist.forEach(function(r){ if(r.data){ var d = D(r.data); d.t++; if(r.recordes && r.recordes.length) d.rec++; } });
  agua.forEach(function(r){ if(r.data) D(r.data).ml += r.ml || 0; });
  dieta.forEach(function(r){ if(r.data) D(r.data).diet++; });
  var gastoHojeC = 0, gastoMesC = 0, mk = today.slice(0,7), nGastos = 0;
  /* gastos lançados no Mensal (cada item novo guarda a data de criação em `criado`) */
  (s.expenses || []).forEach(function(r){
    if(!r.criado) return;
    var v = (r.values && (r.values[r.criado.slice(0,7)] || r.values[r.instStart])) || 0;
    nGastos++;
    D(r.criado).gasto++;
    if(r.criado.slice(0,7) === mk){ gastoMesC += v; if(r.criado === today) gastoHojeC += v; }
  });
  /* lançamentos antigos do Diário (a tela foi removida, mas o histórico continua valendo) */
  ent.forEach(function(e){
    if(e.type === 'income' || !(e.amount > 0) || !e.monthKey) return;
    nGastos++;
    D(e.monthKey+'-'+pad(e.day)).gasto++;
    if(e.monthKey === mk){ gastoMesC += e.amount; if(e.day === +today.slice(8)) gastoHojeC += e.amount; }
  });
  var xp = 0, diasMeta = 0, ativos = [];
  Object.keys(days).forEach(function(k){
    var d = days[k], pts = d.t*XP.treino + d.rec*XP.recorde + (d.diet ? XP.refeicao : 0) + (d.gasto ? XP.gasto : 0);
    if(d.ml >= meta){ pts += XP.meta; diasMeta++; } else if(d.ml > 0) pts += XP.agua;
    xp += pts;
    if(pts > 0) ativos.push(k);
  });
  ativos.sort();
  var set = {}; ativos.forEach(function(k){ set[k] = 1; });
  var cur = 0, c = new Date(); if(!set[iso(c)]) c.setDate(c.getDate()-1);
  while(set[iso(c)]){ cur++; c.setDate(c.getDate()-1); }
  var best = 0, run = 0, prev = null;
  ativos.forEach(function(k){
    var t = Date.UTC(+k.slice(0,4), +k.slice(5,7)-1, +k.slice(8));
    run = (prev !== null && t - prev === 864e5) ? run+1 : 1; prev = t; if(run > best) best = run;
  });
  var hoje = days[today] || { t:0, ml:0, gasto:0 };
  var lvl = Math.floor(Math.sqrt(xp/50)) + 1, base = 50*(lvl-1)*(lvl-1), next = 50*lvl*lvl;
  var mon = new Date(); mon.setDate(mon.getDate() - ((mon.getDay()+6)%7));
  var semana = [], treinosSemana = 0;
  for(var i = 0; i < 7; i++){ var k = iso(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()+i)); semana.push({ k:k, on:!!set[k] }); if(days[k]) treinosSemana += days[k].t; }
  return { today:today, xp:xp, lvl:lvl, base:base, next:next, streak:cur, best:best, semana:semana, treinosSemana:treinosSemana,
    totalTreinos:hist.length, refeicoesHoje:(hoje.diet || 0), diasMeta:diasMeta, nGastos:nGastos, meta:meta, ml:hoje.ml, treinou:hoje.t>0, gastou:hoje.gasto>0,
    gastoHojeC:gastoHojeC, gastoMesC:gastoMesC, emAndamento:!!J('maromba_sessao_ativa', null) };
}
var TITULOS = ['Iniciante','Aprendiz','Constante','Focado','Disciplinado','Imparável','Lenda'];
var titulo = function(l){ return TITULOS[Math.min(6, Math.floor((l - 1) / 2))]; };
/* conquistas: n = nome, d = descrição, ok(s) = conquistada?, p(s) = [atual, meta] */
var BADGES = [
  { n:'Primeiro treino', d:'1 treino',                ok:function(s){ return s.totalTreinos >= 1; },  p:function(s){ return [s.totalTreinos, 1]; } },
  { n:'Rotina',          d:'10 treinos',              ok:function(s){ return s.totalTreinos >= 10; }, p:function(s){ return [s.totalTreinos, 10]; } },
  { n:'Semana firme',    d:'7 dias seguidos',         ok:function(s){ return s.best >= 7; },          p:function(s){ return [s.best, 7]; } },
  { n:'Mês de ferro',    d:'30 dias seguidos',        ok:function(s){ return s.best >= 30; },         p:function(s){ return [s.best, 30]; } },
  { n:'Hidratado',       d:'7 dias na meta de água',  ok:function(s){ return s.diasMeta >= 7; },      p:function(s){ return [s.diasMeta, 7]; } },
  { n:'No controle',     d:'30 gastos lançados',      ok:function(s){ return s.nGastos >= 30; },      p:function(s){ return [s.nGastos, 30]; } }
];
var cnt = function(b, s){ var p = b.p(s); return Math.min(p[0], p[1]) + '/' + p[1]; };

/* ---------- apps (registro) ---------- */
var I_DUMB = '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>';
var I_WALLET = '<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1"/></svg>';
var I_DROP = '<svg viewBox="0 0 24 24"><path d="M12 2.5c2.8 3.6 7 9.4 7 13a7 7 0 1 1-14 0c0-3.6 4.2-9.4 7-13z"/></svg>';
var I_FLAME = '<svg viewBox="0 0 24 24"><path d="M12 2s5.2 4.3 5.2 9.6a5.2 5.2 0 0 1-10.4 0c0-1.8.8-3.2 1.9-4.3.2 1.3.9 2.1 1.8 2.4C10.2 6.9 10.7 4.3 12 2z"/></svg>';
var I_HELP = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/></svg>';
var I_CHEV = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
var APPS = [
  { id:'maromba', nome:'Maromba', icone:I_DUMB, url:'apps/maromba/index.html',
    resumo:function(s){ return s.emAndamento ? 'Treino em andamento' : s.treinosSemana + (s.treinosSemana === 1 ? ' treino' : ' treinos') + ' na semana'; },
    aba:function(s){ return s.emAndamento ? 'sessao' : null; } },
  { id:'saldo', nome:'Saldo', icone:I_WALLET, url:'apps/saldo/index.html',
    resumo:function(s){ return s.gastoHojeC ? 'Hoje: ' + money(s.gastoHojeC) : 'Nada gasto hoje'; } },
  { id:'nutri', nome:'Nutri', icone:I_DROP, url:'apps/nutri/index.html',
    resumo:function(s){ return s.ml + '/' + s.meta + ' ml · ' + s.refeicoesHoje + ' ref.'; },
    aba:function(s){ return s.ml < s.meta ? 'agua' : 'dieta'; } }
];

/* ---------- ações ---------- */
function abrir(id, aba, ev){
  var a = APPS.filter(function(x){ return x.id === id; })[0]; if(!a) return;
  if(id === 'maromba' && aba){ try{ sessionStorage.setItem('maromba_aba_atual', aba); }catch(e){} }
  if(id === 'nutri' && aba){ try{ sessionStorage.setItem('nutri_aba_atual', aba); }catch(e){} }
  /* portal: círculo da cor do app a partir do toque (shared/bridge.js); sem ele, navega direto */
  if(window.LobbyPortal) LobbyPortal.sair(id, ev, function(){ location.href = a.url; });
  else location.href = a.url;
}
var toastT;
function toast(msg, undo){
  var el = $('toast'); el.innerHTML = '<span></span>'; el.firstChild.textContent = msg;
  if(undo){ var b = document.createElement('button'); b.textContent = 'Desfazer'; b.onclick = function(){ undo(); el.classList.remove('on'); }; el.appendChild(b); }
  el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function(){ el.classList.remove('on'); }, undo ? 4500 : 2800);
}
function addAgua(){
  var arr = J('maromba_agua', []), d = new Date(), id = 'c' + Date.now().toString(36);
  arr.push({ id:id, data:iso(d), horario:pad(d.getHours())+':'+pad(d.getMinutes()), ml:250 });
  localStorage.setItem('maromba_agua', JSON.stringify(arr)); render();
  toast('+250 ml', function(){ localStorage.setItem('maromba_agua', JSON.stringify(J('maromba_agua', []).filter(function(r){ return r.id !== id; }))); render(); });
}
/* tema escuro: ícones da barra de status CLAROS (estilo 'DARK' do SystemBars) */
function barras(){ try{ var SB = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.SystemBars; if(SB && SB.setStyle){ var r = SB.setStyle({ style:'DARK' }); if(r && r.catch) r.catch(function(){}); } }catch(e){} }

function ajudaHTML(s){
  var item = function(em, t, d, dir){ return '<div class="li">' + (em ? '<span class="em">' + em + '</span>' : '') + '<div class="tx"><b>' + t + '</b>' + (d ? '<span>' + d + '</span>' : '') + '</div>' + (dir || '') + '</div>'; };
  var sec = function(titulo, corpo){ return '<section class="sec"><h3>' + titulo + '</h3><div class="sb">' + corpo + '</div></section>'; };
  var pct = Math.min(100, Math.round((s.xp - s.base) / (s.next - s.base) * 100));
  var xp = [['Treino concluído',XP.treino],['Recorde batido (extra)',XP.recorde],['Meta de água batida',XP.meta],['Bebeu água, abaixo da meta',XP.agua],['Refeição registrada no dia',XP.refeicao],['Gasto lançado no dia',XP.gasto]];
  var ini = Math.max(1, s.lvl - 1), niveis = '';
  for(var l = ini; l < ini + 5; l++){
    niveis += '<div class="li' + (l === s.lvl ? ' cur' : '') + '"><span class="em">' + l + '</span><div class="tx"><b>' + titulo(l) + '</b>' + (l === s.lvl ? '<span>Você está aqui</span>' : '') + '</div><span class="pill">' + (50 * (l - 1) * (l - 1)) + ' XP</span></div>';
  }
  return '<header class="ah"><div><button class="back" data-fechar>‹ Lobby</button><h2>Como funciona</h2></div></header><div class="ac">' +
    '<section class="sec"><div class="sb"><div class="hs3"><div class="st"><b>' + s.xp + '</b><span>XP</span></div><div class="st"><b>' + s.lvl + '</b><span>Nível</span></div><div class="st"><b>' + s.streak + '</b><span>' + (s.streak === 1 ? 'dia seguido' : 'dias seguidos') + '</span></div></div>' +
    '<div class="mini big"><i style="width:' + pct + '%"></i></div><p class="nt">Faltam ' + (s.next - s.xp) + ' XP para o nível ' + (s.lvl + 1) + '. Melhor sequência: ' + s.best + '.</p></div></section>' +
    sec('Como ganhar XP', xp.map(function(r){ return item('', r[0], '', '<span class="pill">+' + r[1] + ' XP</span>'); }).join('') + '<p class="nt">Refeição e gasto contam uma vez por dia. Receitas não contam.</p>') +
    sec('Níveis', niveis + '<p class="nt">Cada nível pede mais XP que o anterior. O título muda a cada 2 níveis.</p>') +
    sec('Missões do dia', item('', 'Treinar hoje', 'Conclua um treino hoje.') + item('', 'Meta de água', 'Chegue à meta do dia. O +250 registra direto.') + item('', 'Lançar um gasto', 'Lance um gasto no Saldo hoje.') + '<p class="nt">Reiniciam à meia-noite. O XP vem das próprias ações.</p>') +
    sec('Sequência', '<p class="tp">Dias seguidos com qualquer atividade, até só beber água. Se hoje ainda está vazio, a conta parte de ontem. Ela quebra quando passa um dia inteiro sem registro.</p>') +
    sec('Conquistas', BADGES.map(function(b){
      var p = b.p(s), ok = b.ok(s), w = Math.round(Math.min(p[0], p[1]) / p[1] * 100);
      return '<div class="li"><div class="tx"><b>' + b.n + '</b><span>' + b.d + '</span><div class="mini"><i style="width:' + w + '%"></i></div></div><span class="pill' + (ok ? ' ok' : '') + '">' + (ok ? 'Concluída' : cnt(b, s)) + '</span></div>';
    }).join('')) +
    '<p class="nt">O XP é calculado do que você registrou nos apps: apagar registros também reduz o XP.</p></div>';
}
function ajuda(on){
  var el = $('ajuda');
  if(on){ el.innerHTML = ajudaHTML(stats()); el.scrollTop = 0; }
  el.classList.toggle('on', !!on);
  document.body.style.overflow = on ? 'hidden' : '';
}
function sheet(modo){
  if(modo){
    var s = stats();
    $('sheet-body').innerHTML = '<h2 class="hh">Conquistas</h2>' + BADGES.map(function(b){
      var ok = b.ok(s);
      return '<div class="bl' + (ok ? ' ok' : '') + '"><span class="mk"></span><div class="tx"><b>' + b.n + '</b><span>' + b.d + '</span></div><span class="pill' + (ok ? ' ok' : '') + '">' + (ok ? 'Concluída' : cnt(b, s)) + '</span></div>';
    }).join('');
  }
  $('sheet').classList.toggle('on', !!modo);
}

/* ---------- tela ---------- */
function render(){
  var s = stats();
  var pct = Math.min(1, (s.xp - s.base) / (s.next - s.base));
  var feitas = BADGES.filter(function(b){ return b.ok(s); }).length;
  var L = ['S','T','Q','Q','S','S','D'];
  var tarefas = [
    { ok:s.treinou, t:'Treinar hoje', d:s.treinou ? 'Treino concluído' : (s.emAndamento ? 'Você tem um treino em andamento' : 'Abra o Maromba e comece'), xp:XP.treino,
      btn: s.treinou ? '' : '<button class="act" data-go="maromba" data-aba="' + (s.emAndamento ? 'sessao' : 'meus-treinos') + '">' + (s.emAndamento ? 'Continuar' : 'Treinar') + '</button>' },
    { ok:s.ml >= s.meta, t:'Meta de água', d:s.ml + ' de ' + s.meta + ' ml', xp:XP.meta,
      btn: s.ml >= s.meta ? '' : '<button class="act" data-agua>+250</button>' },
    { ok:s.gastou, t:'Lançar um gasto', d:s.gastou ? 'Dia registrado' : 'Registre no Saldo', xp:XP.gasto,
      btn: s.gastou ? '' : '<button class="act" data-go="saldo">Abrir</button>' }
  ];
  var nFeitas = tarefas.filter(function(q){ return q.ok; }).length, todas = nFeitas === tarefas.length;
  /* conquista mais próxima de sair: a pendente com maior andamento */
  var pend = BADGES.filter(function(b){ return !b.ok(s); }).map(function(b){ var p = b.p(s); return { b:b, p:p, r:Math.min(p[0], p[1]) / p[1] }; })
    .sort(function(x, y){ return y.r - x.r; })[0];
  var conquista = pend
    ? '<button class="ach" data-badges><span class="tx"><b>' + pend.b.n + '<span>' + Math.min(pend.p[0], pend.p[1]) + '/' + pend.p[1] + '</span></b><small>' + pend.b.d + '</small><span class="mini"><i style="width:' + Math.round(pend.r * 100) + '%"></i></span></span><span class="go">' + I_CHEV + '</span></button>'
    : '<button class="ach" data-badges><span class="tx"><b>Tudo conquistado</b><small>Ver conquistas</small></span><span class="go">' + I_CHEV + '</span></button>';
  $('hub').innerHTML =
    '<div class="hud-wrap"><div class="hud">' +
      '<div class="hud-main"><div class="hud-kicker">Nível ' + s.lvl + '</div><div class="hud-title">' + titulo(s.lvl) + '</div><div class="xpbar"><i data-w="' + Math.round(pct * 100) + '"></i></div><div class="hud-sub">' + (s.xp - s.base) + ' / ' + (s.next - s.base) + ' XP</div></div>' +
      '<div class="hud-right"><span class="chip" aria-label="' + s.streak + (s.streak === 1 ? ' dia seguido' : ' dias seguidos') + '">' + I_FLAME + s.streak + '</span><button class="ibtn" data-info aria-label="Como funciona"><span class="ico">' + I_HELP + '</span></button></div></div></div>' +
    '<section class="sect"><h2>Missões de hoje<span class="tag' + (todas ? ' hot' : '') + '">' + nFeitas + '/' + tarefas.length + '</span></h2>' + tarefas.map(function(q){
      return '<div class="q' + (q.ok ? ' done' : '') + '"><div class="chk">' + (q.ok ? CHECK : '') + '</div><div class="t"><b><em>' + q.t + '</em><i class="xp">+' + q.xp + ' XP</i></b><span>' + q.d + '</span></div>' + (q.btn || '') + '</div>';
    }).join('') + (todas ? '<div class="all">Dia completo</div>' : '') + '</section>' +
    '<section class="sect"><h2>Apps</h2>' + APPS.map(function(a){
      return '<button class="dept" data-go="' + a.id + '" data-aba="' + (a.aba && a.aba(s) || '') + '"><span class="ico">' + a.icone + '</span><span class="tx"><b>' + a.nome + '</b><span>' + a.resumo(s) + '</span></span><span class="go">' + I_CHEV + '</span></button>';
    }).join('') + '</section>' +
    '<section class="sect"><h2>Semana<span class="tag' + (s.streak > 0 ? ' hot' : '') + '">' + s.streak + (s.streak === 1 ? ' dia seguido' : ' dias seguidos') + '</span></h2><div class="week">' +
      s.semana.map(function(d, i){ return '<div class="day"><div class="dot' + (d.on ? ' on' : '') + (d.k === s.today ? ' today' : '') + '">' + (d.on ? CHECK : '') + '</div>' + L[i] + '</div>'; }).join('') + '</div></section>' +
    '<section class="sect"><h2>Conquistas<span class="tag">' + feitas + '/' + BADGES.length + '</span></h2>' + conquista + '</section>';
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ var f = document.querySelector('.xpbar i'); if(f) f.style.width = f.getAttribute('data-w') + '%'; }); });
  var visto = parseInt(localStorage.getItem('lobby_nivel_visto'), 10);
  if(visto && s.lvl > visto) toast('Nível ' + s.lvl + ' alcançado');
  try{ localStorage.setItem('lobby_nivel_visto', s.lvl); }catch(e){}
}

document.addEventListener('click', function(e){
  var t = e.target.closest('[data-go],[data-agua],[data-badges],[data-info],[data-fechar]'); if(!t) return;
  if(t.hasAttribute('data-go')) abrir(t.getAttribute('data-go'), t.getAttribute('data-aba') || null, e);
  else if(t.hasAttribute('data-agua')) addAgua();
  else if(t.hasAttribute('data-info')) ajuda(true);
  else if(t.hasAttribute('data-fechar')) ajuda(false);
  else sheet('badges');
});
$('sheet').addEventListener('click', function(e){ if(e.target === $('sheet')) sheet(false); });
window.addEventListener('pageshow', function(){ document.body.style.opacity = ''; render(); });
document.addEventListener('visibilitychange', function(){ if(!document.hidden) render(); });
try{
  var A = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
  if(A && A.addListener) A.addListener('backButton', function(){ if($('ajuda').classList.contains('on')) ajuda(false); else if($('sheet').classList.contains('on')) sheet(false); else if(A.exitApp) A.exitApp(); });
}catch(e){}
barras();
render();
})();
