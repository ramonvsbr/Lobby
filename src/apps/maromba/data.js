/* =========================================================
   MAROMBA — base de dados estática
   Equipamentos, músculos e biblioteca de exercícios.
   ========================================================= */

// ---- Grupos musculares -----------------------------------
const MUSCLES = [
  { id: 'peito',           nome: 'Peito' },
  { id: 'costas',          nome: 'Costas' },
  { id: 'ombro',           nome: 'Ombro' },
  { id: 'trapezio',        nome: 'Trapézio' },
  { id: 'biceps',          nome: 'Bíceps' },
  { id: 'triceps',         nome: 'Tríceps' },
  { id: 'antebraco',       nome: 'Antebraço' },
  { id: 'abdomen',         nome: 'Abdômen' },
  { id: 'lombar',          nome: 'Lombar' },
  { id: 'quadriceps',      nome: 'Quadríceps' },
  { id: 'posterior_coxa',  nome: 'Posterior de coxa' },
  { id: 'gluteos',         nome: 'Glúteos' },
  { id: 'adutores',        nome: 'Adutores' },
  { id: 'abdutores',       nome: 'Abdutores' },
  { id: 'panturrilha',     nome: 'Panturrilha' },
];

function muscleName(id) {
  const m = MUSCLES.find(m => m.id === id);
  return m ? m.nome : id;
}

// ---- Equipamentos -----------------------------------------
// 'peso_corpo' nunca aparece na lista de seleção: exercícios que
// dependem só dele ficam sempre disponíveis.
const EQUIPMENT = [
  { id: 'barra',            nome: 'Barra livre + anilhas' },
  { id: 'halteres',         nome: 'Halteres' },
  { id: 'banco_plano',      nome: 'Banco plano' },
  { id: 'banco_inclinado',  nome: 'Banco inclinado' },
  { id: 'banco_declinado',  nome: 'Banco declinado' },
  { id: 'polia_alta',       nome: 'Polia alta / puxador' },
  { id: 'polia_baixa',      nome: 'Polia baixa / remada' },
  { id: 'cross_over',       nome: 'Cross over' },
  { id: 'leg_press',        nome: 'Leg press' },
  { id: 'cadeira_extensora',nome: 'Cadeira extensora' },
  { id: 'mesa_flexora',     nome: 'Mesa flexora' },
  { id: 'cadeira_flexora',  nome: 'Cadeira flexora' },
  { id: 'smith',            nome: 'Smith / multipower' },
  { id: 'banco_scott',      nome: 'Banco Scott' },
  { id: 'cadeira_adutora',  nome: 'Cadeira adutora' },
  { id: 'cadeira_abdutora', nome: 'Cadeira abdutora' },
  { id: 'panturrilheira',   nome: 'Panturrilheira' },
  { id: 'barra_fixa',       nome: 'Barra fixa' },
  { id: 'paralelas',        nome: 'Paralelas' },
  { id: 'kettlebell',       nome: 'Kettlebell' },
  { id: 'elastico',         nome: 'Elástico / faixa' },
  { id: 'bola_suica',       nome: 'Bola suíça' },
  { id: 'banco_romano',     nome: 'Banco romano (hiperextensão)' },
  { id: 'maquina_remada',   nome: 'Remada articulada (máquina)' },
  { id: 'maquina_peck_deck',nome: 'Peck deck / voador' },
  { id: 'maquina_hack',     nome: 'Hack machine' },
];

// ---- Exercícios ---------------------------------------------
// equipamento: [] significa peso do corpo, sempre disponível.
// musculos: { primarios: [...], secundarios: [...] }
const EXERCISES = [
  // PEITO
  { id:'supino_reto_barra', nome:'Supino reto com barra', equipamento:['barra','banco_plano'], musculos:{primarios:['peito'],secundarios:['triceps','ombro']} },
  { id:'supino_inclinado_barra', nome:'Supino inclinado com barra', equipamento:['barra','banco_inclinado'], musculos:{primarios:['peito'],secundarios:['ombro','triceps']} },
  { id:'supino_declinado_barra', nome:'Supino declinado com barra', equipamento:['barra','banco_declinado'], musculos:{primarios:['peito'],secundarios:['triceps']} },
  { id:'supino_reto_halteres', nome:'Supino reto com halteres', equipamento:['halteres','banco_plano'], musculos:{primarios:['peito'],secundarios:['triceps','ombro']} },
  { id:'supino_inclinado_halteres', nome:'Supino inclinado com halteres', equipamento:['halteres','banco_inclinado'], musculos:{primarios:['peito'],secundarios:['ombro','triceps']} },
  { id:'crucifixo_reto', nome:'Crucifixo reto com halteres', equipamento:['halteres','banco_plano'], musculos:{primarios:['peito'],secundarios:[]} },
  { id:'crucifixo_inclinado', nome:'Crucifixo inclinado com halteres', equipamento:['halteres','banco_inclinado'], musculos:{primarios:['peito'],secundarios:['ombro']} },
  { id:'peck_deck', nome:'Peck deck (voador)', equipamento:['maquina_peck_deck'], musculos:{primarios:['peito'],secundarios:[]} },
  { id:'crossover', nome:'Crossover na polia', equipamento:['cross_over'], musculos:{primarios:['peito'],secundarios:['ombro']} },
  { id:'flexao_braco', nome:'Flexão de braço', equipamento:[], musculos:{primarios:['peito'],secundarios:['triceps','ombro','abdomen']} },
  { id:'supino_smith', nome:'Supino reto no Smith', equipamento:['smith','banco_plano'], musculos:{primarios:['peito'],secundarios:['triceps']} },

  // COSTAS
  { id:'puxada_frente', nome:'Puxada pela frente', equipamento:['polia_alta'], musculos:{primarios:['costas'],secundarios:['biceps']} },
  { id:'puxada_atras', nome:'Puxada por trás', equipamento:['polia_alta'], musculos:{primarios:['costas'],secundarios:['biceps','ombro']} },
  { id:'remada_baixa_cabo', nome:'Remada baixa no cabo', equipamento:['polia_baixa'], musculos:{primarios:['costas'],secundarios:['biceps']} },
  { id:'remada_curvada_barra', nome:'Remada curvada com barra', equipamento:['barra'], musculos:{primarios:['costas'],secundarios:['biceps','lombar']} },
  { id:'remada_serrote', nome:'Remada unilateral (serrote)', equipamento:['halteres','banco_plano'], musculos:{primarios:['costas'],secundarios:['biceps']} },
  { id:'barra_fixa_ex', nome:'Barra fixa', equipamento:['barra_fixa'], musculos:{primarios:['costas'],secundarios:['biceps','antebraco']} },
  { id:'remada_maquina', nome:'Remada articulada (máquina)', equipamento:['maquina_remada'], musculos:{primarios:['costas'],secundarios:['biceps']} },
  { id:'pulldown_corda', nome:'Pulldown com corda', equipamento:['polia_alta'], musculos:{primarios:['costas'],secundarios:['triceps']} },
  { id:'levantamento_terra', nome:'Levantamento terra', equipamento:['barra'], musculos:{primarios:['costas','gluteos','posterior_coxa'],secundarios:['lombar','antebraco']} },
  { id:'remada_elastico', nome:'Remada com elástico', equipamento:['elastico'], musculos:{primarios:['costas'],secundarios:['biceps']} },

  // OMBRO
  { id:'desenvolvimento_halteres', nome:'Desenvolvimento com halteres', equipamento:['halteres'], musculos:{primarios:['ombro'],secundarios:['triceps']} },
  { id:'desenvolvimento_barra', nome:'Desenvolvimento com barra', equipamento:['barra'], musculos:{primarios:['ombro'],secundarios:['triceps']} },
  { id:'desenvolvimento_smith', nome:'Desenvolvimento no Smith', equipamento:['smith'], musculos:{primarios:['ombro'],secundarios:['triceps']} },
  { id:'elevacao_lateral', nome:'Elevação lateral', equipamento:['halteres'], musculos:{primarios:['ombro'],secundarios:[]} },
  { id:'elevacao_frontal', nome:'Elevação frontal', equipamento:['halteres'], musculos:{primarios:['ombro'],secundarios:[]} },
  { id:'remada_alta', nome:'Remada alta', equipamento:['barra'], musculos:{primarios:['ombro'],secundarios:['trapezio']} },
  { id:'crucifixo_inverso', nome:'Crucifixo inverso', equipamento:['halteres'], musculos:{primarios:['ombro'],secundarios:['costas']} },
  { id:'encolhimento_ombros', nome:'Encolhimento de ombros', equipamento:['halteres'], musculos:{primarios:['trapezio'],secundarios:[]} },

  // BÍCEPS
  { id:'rosca_direta_barra', nome:'Rosca direta com barra', equipamento:['barra'], musculos:{primarios:['biceps'],secundarios:['antebraco']} },
  { id:'rosca_alternada', nome:'Rosca alternada com halteres', equipamento:['halteres'], musculos:{primarios:['biceps'],secundarios:['antebraco']} },
  { id:'rosca_scott', nome:'Rosca Scott', equipamento:['banco_scott','barra'], musculos:{primarios:['biceps'],secundarios:[]} },
  { id:'rosca_martelo', nome:'Rosca martelo', equipamento:['halteres'], musculos:{primarios:['biceps'],secundarios:['antebraco']} },
  { id:'rosca_cabo', nome:'Rosca no cabo', equipamento:['polia_baixa'], musculos:{primarios:['biceps'],secundarios:[]} },
  { id:'rosca_elastico', nome:'Rosca com elástico', equipamento:['elastico'], musculos:{primarios:['biceps'],secundarios:[]} },

  // TRÍCEPS
  { id:'triceps_pulley_corda', nome:'Tríceps pulley (corda)', equipamento:['polia_alta'], musculos:{primarios:['triceps'],secundarios:[]} },
  { id:'triceps_testa', nome:'Tríceps testa com barra', equipamento:['barra','banco_plano'], musculos:{primarios:['triceps'],secundarios:[]} },
  { id:'triceps_frances', nome:'Tríceps francês com halter', equipamento:['halteres'], musculos:{primarios:['triceps'],secundarios:[]} },
  { id:'mergulho_paralelas', nome:'Mergulho em paralelas', equipamento:['paralelas'], musculos:{primarios:['triceps'],secundarios:['peito','ombro']} },
  { id:'triceps_coice', nome:'Tríceps coice (kickback)', equipamento:['halteres'], musculos:{primarios:['triceps'],secundarios:[]} },

  // PERNAS
  { id:'agachamento_livre', nome:'Agachamento livre com barra', equipamento:['barra'], musculos:{primarios:['quadriceps'],secundarios:['gluteos','posterior_coxa','lombar']} },
  { id:'agachamento_smith', nome:'Agachamento no Smith', equipamento:['smith'], musculos:{primarios:['quadriceps'],secundarios:['gluteos']} },
  { id:'leg_press_ex', nome:'Leg press 45°', equipamento:['leg_press'], musculos:{primarios:['quadriceps'],secundarios:['gluteos']} },
  { id:'cadeira_extensora_ex', nome:'Cadeira extensora', equipamento:['cadeira_extensora'], musculos:{primarios:['quadriceps'],secundarios:[]} },
  { id:'mesa_flexora_ex', nome:'Mesa flexora', equipamento:['mesa_flexora'], musculos:{primarios:['posterior_coxa'],secundarios:[]} },
  { id:'cadeira_flexora_ex', nome:'Cadeira flexora', equipamento:['cadeira_flexora'], musculos:{primarios:['posterior_coxa'],secundarios:[]} },
  { id:'afundo_halteres', nome:'Afundo (passada) com halteres', equipamento:['halteres'], musculos:{primarios:['quadriceps','gluteos'],secundarios:[]} },
  { id:'stiff_barra', nome:'Stiff com barra', equipamento:['barra'], musculos:{primarios:['posterior_coxa'],secundarios:['gluteos','lombar']} },
  { id:'cadeira_adutora_ex', nome:'Cadeira adutora', equipamento:['cadeira_adutora'], musculos:{primarios:['adutores'],secundarios:[]} },
  { id:'cadeira_abdutora_ex', nome:'Cadeira abdutora', equipamento:['cadeira_abdutora'], musculos:{primarios:['abdutores'],secundarios:['gluteos']} },
  { id:'elevacao_pelvica', nome:'Elevação pélvica (hip thrust)', equipamento:['barra','banco_plano'], musculos:{primarios:['gluteos'],secundarios:['posterior_coxa']} },
  { id:'panturrilha_pe', nome:'Panturrilha em pé', equipamento:['panturrilheira'], musculos:{primarios:['panturrilha'],secundarios:[]} },
  { id:'panturrilha_sentado', nome:'Panturrilha sentado', equipamento:['panturrilheira'], musculos:{primarios:['panturrilha'],secundarios:[]} },
  { id:'hack_machine_ex', nome:'Agachamento no hack', equipamento:['maquina_hack'], musculos:{primarios:['quadriceps'],secundarios:['gluteos']} },
  { id:'kettlebell_swing', nome:'Balanço com kettlebell', equipamento:['kettlebell'], musculos:{primarios:['gluteos'],secundarios:['posterior_coxa','lombar']} },

  // ABDÔMEN / LOMBAR
  { id:'abdominal_solo', nome:'Abdominal supra no solo', equipamento:[], musculos:{primarios:['abdomen'],secundarios:[]} },
  { id:'abdominal_bola', nome:'Abdominal na bola suíça', equipamento:['bola_suica'], musculos:{primarios:['abdomen'],secundarios:[]} },
  { id:'prancha', nome:'Prancha isométrica', equipamento:[], musculos:{primarios:['abdomen'],secundarios:['lombar']} },
  { id:'elevacao_pernas_barra', nome:'Elevação de pernas na barra', equipamento:['barra_fixa'], musculos:{primarios:['abdomen'],secundarios:['antebraco']} },
  { id:'hiperextensao', nome:'Hiperextensão (banco romano)', equipamento:['banco_romano'], musculos:{primarios:['lombar'],secundarios:['gluteos','posterior_coxa']} },
  { id:'abdominal_polia', nome:'Abdominal na polia (crunch cabo)', equipamento:['polia_alta'], musculos:{primarios:['abdomen'],secundarios:[]} },
];

// ---- Exercícios personalizados ------------------------------
// Cadastrados pelo usuário quando a biblioteca fixa não cobre um
// equipamento específico da academia dele. Ficam guardados no
// localStorage (ver STORAGE_KEYS.CUSTOM em app.js) e essa variável
// é sincronizada com o que está salvo sempre que a lista muda.
let CUSTOM_EXERCISES = [];

function allExercises() {
  return EXERCISES.concat(CUSTOM_EXERCISES);
}

function exerciseById(id) {
  return allExercises().find(e => e.id === id);
}