/* =========================================================
   MAROMBA — mapa corporal (SVG esquemático, frente + costas)
   Cada forma tem data-muscle=<id>. applyBodyHighlight() liga/
   desliga as classes m-primary / m-secondary conforme a lista
   de músculos passada.
   ========================================================= */

const BODY_MAP_SVG = `
<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" class="bodymap-svg">

  <!-- ===== FRENTE ===== -->
  <g class="bm-outline">
    <circle cx="55" cy="38" r="17"/>
    <rect x="48" y="53" width="14" height="9"/>
    <path d="M30 62 Q55 50 80 62 L86 150 Q55 160 24 150 Z"/>
    <rect x="12" y="62" width="15" height="46" rx="6"/>
    <rect x="83" y="62" width="15" height="46" rx="6"/>
    <rect x="10" y="106" width="13" height="38" rx="5"/>
    <rect x="87" y="106" width="13" height="38" rx="5"/>
    <rect x="30" y="150" width="20" height="62" rx="6"/>
    <rect x="60" y="150" width="20" height="62" rx="6"/>
  </g>
  <ellipse data-muscle="ombro" cx="27" cy="66" rx="13" ry="10" class="muscle"><title>Ombro</title></ellipse>
  <ellipse data-muscle="ombro" cx="83" cy="66" rx="13" ry="10" class="muscle"><title>Ombro</title></ellipse>
  <path data-muscle="peito" d="M33 63 Q55 55 77 63 L74 96 Q55 104 36 96 Z" class="muscle"><title>Peito</title></path>
  <rect data-muscle="abdomen" x="39" y="98" width="32" height="42" rx="5" class="muscle"><title>Abdômen</title></rect>
  <rect data-muscle="biceps" x="13" y="64" width="13" height="34" rx="5" class="muscle"><title>Bíceps</title></rect>
  <rect data-muscle="biceps" x="84" y="64" width="13" height="34" rx="5" class="muscle"><title>Bíceps</title></rect>
  <rect data-muscle="antebraco" x="11" y="107" width="11" height="34" rx="5" class="muscle"><title>Antebraço</title></rect>
  <rect data-muscle="antebraco" x="88" y="107" width="11" height="34" rx="5" class="muscle"><title>Antebraço</title></rect>
  <rect data-muscle="quadriceps" x="30" y="152" width="17" height="56" rx="6" class="muscle"><title>Quadríceps</title></rect>
  <rect data-muscle="quadriceps" x="63" y="152" width="17" height="56" rx="6" class="muscle"><title>Quadríceps</title></rect>
  <rect data-muscle="adutores" x="47" y="158" width="7" height="34" class="muscle"><title>Adutores</title></rect>
  <rect data-muscle="adutores" x="56" y="158" width="7" height="34" class="muscle"><title>Adutores</title></rect>
  <circle data-muscle="abdutores" cx="27" cy="156" r="8" class="muscle"><title>Abdutores</title></circle>
  <circle data-muscle="abdutores" cx="83" cy="156" r="8" class="muscle"><title>Abdutores</title></circle>

  <!-- ===== COSTAS ===== -->
  <g class="bm-outline">
    <circle cx="185" cy="38" r="17"/>
    <rect x="178" y="53" width="14" height="9"/>
    <path d="M160 62 Q185 50 210 62 L216 150 Q185 160 154 150 Z"/>
    <rect x="142" y="62" width="15" height="46" rx="6"/>
    <rect x="213" y="62" width="15" height="46" rx="6"/>
    <rect x="140" y="106" width="13" height="38" rx="5"/>
    <rect x="217" y="106" width="13" height="38" rx="5"/>
    <rect x="160" y="150" width="20" height="62" rx="6"/>
    <rect x="190" y="150" width="20" height="62" rx="6"/>
  </g>
  <path data-muscle="trapezio" d="M163 60 Q185 52 207 60 L200 78 Q185 84 170 78 Z" class="muscle"><title>Trapézio</title></path>
  <ellipse data-muscle="ombro" cx="157" cy="66" rx="12" ry="9" class="muscle"><title>Ombro</title></ellipse>
  <ellipse data-muscle="ombro" cx="213" cy="66" rx="12" ry="9" class="muscle"><title>Ombro</title></ellipse>
  <path data-muscle="costas" d="M166 80 Q185 76 204 80 L201 122 Q185 128 169 122 Z" class="muscle"><title>Costas</title></path>
  <rect data-muscle="lombar" x="170" y="124" width="30" height="18" rx="4" class="muscle"><title>Lombar</title></rect>
  <rect data-muscle="triceps" x="143" y="64" width="13" height="34" rx="5" class="muscle"><title>Tríceps</title></rect>
  <rect data-muscle="triceps" x="214" y="64" width="13" height="34" rx="5" class="muscle"><title>Tríceps</title></rect>
  <rect data-muscle="antebraco" x="141" y="107" width="11" height="34" rx="5" class="muscle"><title>Antebraço</title></rect>
  <rect data-muscle="antebraco" x="218" y="107" width="11" height="34" rx="5" class="muscle"><title>Antebraço</title></rect>
  <rect data-muscle="gluteos" x="162" y="144" width="46" height="24" rx="9" class="muscle"><title>Glúteos</title></rect>
  <rect data-muscle="posterior_coxa" x="161" y="170" width="19" height="44" rx="6" class="muscle"><title>Posterior de coxa</title></rect>
  <rect data-muscle="posterior_coxa" x="190" y="170" width="19" height="44" rx="6" class="muscle"><title>Posterior de coxa</title></rect>
  <rect data-muscle="panturrilha" x="162" y="216" width="17" height="30" rx="6" class="muscle"><title>Panturrilha</title></rect>
  <rect data-muscle="panturrilha" x="191" y="216" width="17" height="30" rx="6" class="muscle"><title>Panturrilha</title></rect>
</svg>
`;

/**
 * Insere o mapa corporal num container e destaca os músculos.
 * @param {HTMLElement} container
 * @param {string[]} primarios
 * @param {string[]} secundarios
 */
function renderBodyMap(container, primarios = [], secundarios = []) {
  container.innerHTML = BODY_MAP_SVG;
  const svg = container.querySelector('svg');
  svg.querySelectorAll('[data-muscle]').forEach(el => {
    const m = el.getAttribute('data-muscle');
    el.classList.remove('m-primary', 'm-secondary');
    if (primarios.includes(m)) el.classList.add('m-primary');
    else if (secundarios.includes(m)) el.classList.add('m-secondary');
  });
}