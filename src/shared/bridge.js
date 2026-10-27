/* Ponte entre os apps e a Lobby: tema único (claro) e "mundo" de cada app. */
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
     Definido já no <html> (antes de o body existir) para o cenário não "piscar". */
  var p = location.pathname;
  var mundo = p.indexOf('/maromba/') > -1 ? 'maromba' : p.indexOf('/saldo/') > -1 ? 'saldo' : '';
  if(mundo) R.setAttribute('data-world', mundo);
})();
document.addEventListener('DOMContentLoaded', function(){
  var a = document.createElement('a'); a.className = 'lobby-back'; a.href = '../../index.html'; a.textContent = '‹ Lobby';
  document.body.appendChild(a);
});