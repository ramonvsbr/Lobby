/* Ponte entre os apps e a Lobby: tema único (claro) e "mundo" de cada app. */
(function(){
  var R = document.documentElement;
  function force(){ if(R.getAttribute('data-theme') !== 'light') R.setAttribute('data-theme','light'); }
  try{ ['maromba_tema','saldo_theme','lobby_tema'].forEach(function(k){ localStorage.setItem(k,'light'); }); }catch(e){}
  force();
  new MutationObserver(force).observe(R, { attributes:true, attributeFilter:['data-theme'] });

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