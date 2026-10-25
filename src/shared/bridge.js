/* Ponte entre os apps e a Lobby: tema único (claro). */
(function(){
  var R = document.documentElement;
  function force(){ if(R.getAttribute('data-theme') !== 'light') R.setAttribute('data-theme','light'); }
  try{ ['maromba_tema','saldo_theme','lobby_tema'].forEach(function(k){ localStorage.setItem(k,'light'); }); }catch(e){}
  force();
  new MutationObserver(force).observe(R, { attributes:true, attributeFilter:['data-theme'] });
})();
document.addEventListener('DOMContentLoaded', function(){
  var a = document.createElement('a'); a.className = 'lobby-back'; a.href = '../../index.html'; a.textContent = '‹ Lobby';
  document.body.appendChild(a);
});
