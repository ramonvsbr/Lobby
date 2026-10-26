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
    totalTreinos:hist.length, diasMeta:diasMeta, nGastos:nGastos, meta:meta, ml:hoje.ml, treinou:hoje.t>0, gastou:hoje.gasto>0,
    gastoHojeC:gastoHojeC, gastoMesC:gastoMesC, emAndamento:!!J('maromba_sessao_ativa', null) };
}
var TITULOS = ['Iniciante','Aprendiz','Constante','Focado','Disciplinado','Imparável','Lenda'];
var BADGES = [
  ['💪','Primeiro treino','1 treino', function(s){ return s.totalTreinos >= 1; }, function(s){ return [s.totalTreinos, 1]; }],
  ['🏋️','Rotina','10 treinos', function(s){ return s.totalTreinos >= 10; }, function(s){ return [s.totalTreinos, 10]; }],
  ['🔥','Semana firme','7 dias seguidos', function(s){ return s.best >= 7; }, function(s){ return [s.best, 7]; }],
  ['⚡','Mês de ferro','30 dias seguidos', function(s){ return s.best >= 30; }, function(s){ return [s.best, 30]; }],
  ['💧','Hidratado','7 dias na meta de água', function(s){ return s.diasMeta >= 7; }, function(s){ return [s.diasMeta, 7]; }],
  ['🧾','No controle','30 gastos lançados', function(s){ return s.nGastos >= 30; }, function(s){ return [s.nGastos, 30]; }]
];

/* ---------- apps (registro) ---------- */
var I_DUMB = '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>';
var I_WALLET = '<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1"/></svg>';
var APPS = [
  { id:'maromba', nome:'Maromba', cor:'var(--tile-yellow)', icone:I_DUMB, url:'apps/maromba/index.html',
    resumo:function(s){ return s.emAndamento ? 'Treino em andamento' : s.treinosSemana + (s.treinosSemana === 1 ? ' treino' : ' treinos') + ' na semana'; },
    aba:function(s){ return s.emAndamento ? 'sessao' : null; } },
  { id:'saldo', nome:'Saldo', cor:'var(--tile-blue)', icone:I_WALLET, url:'apps/saldo/index.html',
    resumo:function(s){ return s.gastoHojeC ? 'Hoje: ' + money(s.gastoHojeC) : 'Nada gasto hoje'; } }
];

/* ---------- ações ---------- */
function abrir(id, aba){
  var a = APPS.filter(function(x){ return x.id === id; })[0]; if(!a) return;
  if(id === 'maromba' && aba){ try{ sessionStorage.setItem('maromba_aba_atual', aba); }catch(e){} }
  document.body.style.transition = 'opacity .15s'; document.body.style.opacity = '0';
  setTimeout(function(){ location.href = a.url; }, 140);
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
function barras(t){ try{ var SB = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.SystemBars; if(SB && SB.setStyle){ var r = SB.setStyle({ style: t === 'dark' ? 'DARK' : 'LIGHT' }); if(r && r.catch) r.catch(function(){}); } }catch(e){} }
function prog(b, s){ var p = b[4](s); return b[3](s) ? '✓ conquistada' : Math.min(p[0], p[1]) + '/' + p[1]; }
function ajudaHTML(s){
  var item = function(em, t, d, dir){ return '<div class="li"><span class="em">' + em + '</span><div class="tx"><b>' + t + '</b>' + (d ? '<span>' + d + '</span>' : '') + '</div>' + (dir || '') + '</div>'; };
  var pct = Math.min(100, Math.round((s.xp - s.base) / (s.next - s.base) * 100));
  var xp = [['💪','Treino concluído',XP.treino],['🏆','Recorde batido (extra)',XP.recorde],['💧','Meta de água batida',XP.meta],['🥤','Bebeu água, abaixo da meta',XP.agua],['🍽️','Refeição registrada no dia',XP.refeicao],['🧾','Gasto lançado no dia',XP.gasto]];
  var ini = Math.max(1, s.lvl - 1), niveis = '';
  for(var l = ini; l < ini + 5; l++){
    niveis += '<div class="li' + (l === s.lvl ? ' cur' : '') + '"><span class="em">' + l + '</span><div class="tx"><b>' + TITULOS[Math.min(6, Math.floor((l - 1) / 2))] + '</b>' + (l === s.lvl ? '<span>Você está aqui</span>' : '') + '</div><span class="pill">' + (50 * (l - 1) * (l - 1)) + ' XP</span></div>';
  }
  return '<header class="ah"><button class="back" data-fechar>‹ Lobby</button><h2>Como funciona</h2></header><div class="ac">' +
    '<section class="sec hero"><div class="hs3"><div class="st"><b>' + s.xp + '</b><span>XP</span></div><div class="st"><b>' + s.lvl + '</b><span>Nível</span></div><div class="st"><b>' + s.streak + '</b><span>' + (s.streak === 1 ? 'dia seguido' : 'dias seguidos') + '</span></div></div>' +
    '<div class="mini big"><i style="width:' + pct + '%"></i></div><p class="nt">Faltam ' + (s.next - s.xp) + ' XP para o nível ' + (s.lvl + 1) + '. Melhor sequência: ' + s.best + '.</p></section>' +
    '<section class="sec"><h3>Como ganhar XP</h3>' + xp.map(function(r){ return item(r[0], r[1], '', '<span class="pill">+' + r[2] + ' XP</span>'); }).join('') +
    '<p class="nt">Refeição e gasto contam uma vez por dia. Receitas não contam.</p></section>' +
    '<section class="sec"><h3>Níveis</h3>' + niveis + '<p class="nt">Cada nível pede mais XP que o anterior. O título muda a cada 2 níveis.</p></section>' +
    '<section class="sec"><h3>Missões do dia</h3>' + item('💪','Treinar hoje','Conclua um treino hoje.') + item('💧','Meta de água','Chegue à meta do dia. O +250 registra direto.') + item('🧾','Lançar um gasto','Registre um gasto no Diário de hoje.') +
    '<p class="nt">Reiniciam à meia-noite. O XP vem das próprias ações.</p></section>' +
    '<section class="sec"><h3>Sequência</h3><p class="tp">Dias seguidos com qualquer atividade, até só beber água. Se hoje ainda está vazio, a conta parte de ontem. Ela quebra quando passa um dia inteiro sem registro.</p></section>' +
    '<section class="sec"><h3>Conquistas</h3>' + BADGES.map(function(b){
      var p = b[4](s), ok = b[3](s), w = Math.round(Math.min(p[0], p[1]) / p[1] * 100);
      return '<div class="li"><span class="em">' + b[0] + '</span><div class="tx"><b>' + b[1] + '</b><span>' + b[2] + '</span><div class="mini"><i style="width:' + w + '%"></i></div></div><span class="pill' + (ok ? ' ok' : '') + '">' + (ok ? '✓' : Math.min(p[0], p[1]) + '/' + p[1]) + '</span></div>';
    }).join('') + '</section>' +
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
    $('sheet-body').innerHTML = '<h2 class="hh">Conquistas</h2><div class="badges">' + BADGES.map(function(b){
      var ok = b[3](s); return '<div class="bd' + (ok ? '' : ' lock') + '"><div class="e">' + b[0] + '</div><b>' + b[1] + '</b><span>' + b[2] + '</span><span>' + prog(b, s) + '</span></div>';
    }).join('') + '</div>';
  }
  $('sheet').classList.toggle('on', !!modo);
}

/* ---------- tela ---------- */
function render(){
  var s = stats(), h = new Date().getHours();
  var sauda = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  var data = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  var C = 2 * Math.PI * 34, pct = Math.min(1, (s.xp - s.base) / (s.next - s.base));
  var feitas = BADGES.filter(function(b){ return b[3](s); }).length;
  var L = ['S','T','Q','Q','S','S','D'];
  var tarefas = [
    { ok:s.treinou, t:'Treinar hoje', d:s.treinou ? 'Treino concluído' : (s.emAndamento ? 'Você tem um treino em andamento' : 'Abra o Maromba e comece'), xp:XP.treino,
      btn: s.treinou ? '' : '<button class="act" data-go="maromba" data-aba="' + (s.emAndamento ? 'sessao' : 'meus-treinos') + '">' + (s.emAndamento ? 'Continuar' : 'Treinar') + '</button>' },
    { ok:s.ml >= s.meta, t:'Meta de água', d:s.ml + ' de ' + s.meta + ' ml', xp:XP.meta,
      btn: s.ml >= s.meta ? '' : '<button class="act" data-agua>+250</button>' },
    { ok:s.gastou, t:'Lançar um gasto', d:s.gastou ? 'Dia registrado' : 'Mantenha o diário em dia', xp:XP.gasto,
      btn: s.gastou ? '' : '<button class="act" data-go="saldo">Abrir</button>' }
  ];
  var todas = tarefas.every(function(q){ return q.ok; });
  $('hub').innerHTML =
    '<div class="top"><div><h1>' + sauda + '</h1><small>' + data + '</small></div><button class="ibtn" data-info aria-label="Como funciona"><span class="ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/></svg></span></button></div>' +
    '<section class="card"><div class="player"><div class="ring"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="34"/><circle class="fg" cx="42" cy="42" r="34" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" data-off="' + (C * (1 - pct)) + '"/></svg><b>' + s.lvl + '</b></div>' +
    '<div><div class="p-title">' + TITULOS[Math.min(6, Math.floor((s.lvl - 1) / 2))] + '</div><div class="p-sub">' + (s.xp - s.base) + ' / ' + (s.next - s.base) + ' XP para o nível ' + (s.lvl + 1) + '</div><div class="bar"><i style="width:' + Math.round(pct * 100) + '%"></i></div></div></div>' +
    '<div class="week">' + s.semana.map(function(d, i){ return '<div class="day"><div class="dot' + (d.on ? ' on' : '') + (d.k === s.today ? ' today' : '') + '">' + (d.on ? CHECK : '') + '</div>' + L[i] + '</div>'; }).join('') + '</div>' +
    '<div class="p-sub" style="margin:12px 0 0;text-align:center"><span class="streak">🔥 ' + s.streak + (s.streak === 1 ? ' dia' : ' dias') + '</span> seguidos</div></section>' +
    '<section class="card"><h2>Missões de hoje</h2>' + tarefas.map(function(q){
      return '<div class="q' + (q.ok ? ' done' : '') + '"><div class="chk">' + (q.ok ? CHECK : '') + '</div><div class="t"><b>' + q.t + '</b><span>' + q.d + '</span></div>' + (q.btn || '<span class="xp">+' + q.xp + ' XP</span>') + '</div>';
    }).join('') + (todas ? '<div class="all">Dia completo ✨</div>' : '') + '</section>' +
    '<section><div class="apps">' + APPS.map(function(a){ return '<button class="app" style="background:' + a.cor + '" data-go="' + a.id + '" data-aba="' + (a.aba && a.aba(s) || '') + '"><span class="ico">' + a.icone + '</span><span><b>' + a.nome + '</b><span>' + a.resumo(s) + '</span></span></button>'; }).join('') + '</div></section>' +
    '<section class="card"><h2>Conquistas <button class="link" data-badges>' + feitas + '/' + BADGES.length + ' · ver</button></h2></section>';
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ var f = document.querySelector('.ring .fg'); if(f) f.setAttribute('stroke-dashoffset', f.getAttribute('data-off')); }); });
  var visto = parseInt(localStorage.getItem('lobby_nivel_visto'), 10);
  if(visto && s.lvl > visto) toast('Nível ' + s.lvl + '! Continue assim 🎉');
  try{ localStorage.setItem('lobby_nivel_visto', s.lvl); }catch(e){}
}

document.addEventListener('click', function(e){
  var t = e.target.closest('[data-go],[data-agua],[data-badges],[data-info],[data-fechar]'); if(!t) return;
  if(t.hasAttribute('data-go')) abrir(t.getAttribute('data-go'), t.getAttribute('data-aba') || null);
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
barras(document.documentElement.getAttribute('data-theme'));
render();
})();