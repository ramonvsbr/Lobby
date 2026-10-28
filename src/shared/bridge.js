/* Ponte entre os apps e a Lobby: tema único (claro), "mundo" de cada app e o PORTAL (transição hub <-> app).
   Carregado no hub (index.html) e em todos os apps. */
(function(){
  var R = document.documentElement;
  function force(){ if(R.getAttribute('data-theme') !== 'light') R.setAttribute('data-theme','light'); }
  try{ ['maromba_tema','saldo_theme','lobby_tema'].forEach(function(k){ localStorage.setItem(k,'light'); }); }catch(e){}
  force();
  new MutationObserver(force).observe(R, { attributes:true, attributeFilter:['data-theme'] });

  /* Pré-carrega as fontes do tema assim que a página começa, para o texto não "trocar de fonte" depois.
     O caminho sai do próprio src deste script (.../shared/bridge.js -> .../fonts/). */
  try{
    var me = document.currentScript, base = me && me.src ? me.src.replace(/shared\/bridge\.js.*$/, 'fonts/') : '';
    if(base) ['Fredoka.ttf','PlusJakartaSans.ttf'].forEach(function(f){
      var l = document.createElement('link');
      l.rel = 'preload'; l.as = 'font'; l.type = 'font/ttf'; l.crossOrigin = 'anonymous'; l.href = base + f;
      document.head.appendChild(l);
    });
  }catch(e){}

  /* Mundo do app: o theme.css usa [data-world] para escolher o cenário do topo.
     Definido já no <html> (antes de o body existir) para o cenário não "piscar". Vazio no hub. */
  var p = location.pathname;
  var mundo = p.indexOf('/maromba/') > -1 ? 'maromba' : p.indexOf('/saldo/') > -1 ? 'saldo' : p.indexOf('/nutri/') > -1 ? 'nutri' : '';
  if(mundo) R.setAttribute('data-world', mundo);

  /* ---------- PORTAL ---------- */
  var KEY = 'lobby_portal', busy = false, calmo = false;
  try{ calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  function guardar(w){ try{ sessionStorage.setItem(KEY, JSON.stringify({ w:w, t:Date.now() })); }catch(e){} }

  /* Chegada: se a página anterior deixou um recado recente, abre já coberta pela cor do app
     e só revela quando fontes e imagens terminarem de carregar (mínimo de 200 ms, para o ícone aparecer). */
  var P = null;
  try{ var raw = sessionStorage.getItem(KEY); if(raw){ sessionStorage.removeItem(KEY); P = JSON.parse(raw); } }catch(e){}
  if(!calmo && P && P.w && Date.now() - P.t < 8000){
    R.setAttribute('data-portal', P.w);
    var t0 = Date.now(), aberto = false;
    var revelar = function(){
      if(aberto) return; aberto = true;
      setTimeout(function(){
        R.classList.add('portal-go');
        setTimeout(function(){ R.removeAttribute('data-portal'); R.classList.remove('portal-go'); }, 560);
      }, Math.max(0, 200 - (Date.now() - t0)));
    };
    var pronto = function(){
      var f = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      f.then(function(){ requestAnimationFrame(function(){ requestAnimationFrame(revelar); }); });
    };
    if(document.readyState === 'complete') pronto(); else window.addEventListener('load', pronto);
    setTimeout(revelar, 2500);   /* segurança: nunca deixa a tela coberta */
  }

  /* Saída: círculo da cor do app cresce a partir do toque e depois chama go() (que navega). */
  window.LobbyPortal = { sair: function(mundoAlvo, ev, go){
    if(busy) return; busy = true;
    if(calmo){ go(); return; }
    var x = ev && ev.clientX ? ev.clientX : window.innerWidth / 2;
    var y = ev && ev.clientY ? ev.clientY : window.innerHeight / 2;
    var d = document.createElement('div');
    d.className = 'portal-exit'; d.setAttribute('data-w', mundoAlvo || '');
    d.style.setProperty('--px', x + 'px'); d.style.setProperty('--py', y + 'px');
    (document.body || R).appendChild(d);
    guardar(mundoAlvo);
    setTimeout(go, 380);
  } };

  /* Nos apps: ao sair por QUALQUER caminho (botão ‹ Lobby ou voltar do Android), deixa o recado
     para o hub abrir com a cor do app e revelar a tela. */
  if(mundo) window.addEventListener('pagehide', function(){ guardar(mundo); });
  window.addEventListener('pageshow', function(e){
    busy = false;
    if(e.persisted){ var x = document.querySelector('.portal-exit'); if(x && x.parentNode) x.parentNode.removeChild(x); }
  });

  /* Botão "‹ Lobby" (só nos apps) */
  if(mundo) document.addEventListener('DOMContentLoaded', function(){
    var a = document.createElement('a'); a.className = 'lobby-back'; a.href = '../../index.html'; a.textContent = '‹ Lobby';
    a.addEventListener('click', function(ev){ ev.preventDefault(); window.LobbyPortal.sair(mundo, ev, function(){ location.href = a.href; }); });
    document.body.appendChild(a);
  });
})();