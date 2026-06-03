/**
 * Importa exercícios do banco joao-gugel/exercicios-bd-ptbr para o Firebase.
 *
 * Uso:
 *   node scripts/importExercicios.js <email> <senha>
 *
 * Exemplo:
 *   node scripts/importExercicios.js manuumaia96@gmail.com suasenha
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, Timestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// ── Firebase config (copiada de src/services/firebase.js) ──────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCM8Q9T-UWkLsdzqwfvsLja28xIAIUlD6s",
  authDomain: "app-personal-c5224.firebaseapp.com",
  projectId: "app-personal-c5224",
  storageBucket: "app-personal-c5224.firebasestorage.app",
  messagingSenderId: "450436905374",
  appId: "1:450436905374:web:cd880bef2ba36b5b0ffe8f",
};

// ── Mapeamento grupo muscular → padrão do app ──────────────────────────────
const GRUPO_MAP = {
  'abdominais': 'Abdômen',
  'isquiotibiais': 'Posterior',
  'panturrilhas': 'Panturrilha',
  'peito': 'Peito',
  'costas': 'Costas',
  'ombros': 'Ombro',
  'bíceps': 'Bíceps',
  'tríceps': 'Tríceps',
  'glúteos': 'Glúteo',
  'quadríceps': 'Quadríceps',
  'trapézio': 'Costas',
  'antebraços': 'Bíceps',
  'pescoço': 'Funcional',
  'pernas': 'Quadríceps',
  'adutores': 'Glúteo',
  'abdutores': 'Glúteo',
  'lombar': 'Costas',
  'flexores do quadril': 'Funcional',
};

// ── Mapeamento equipamento → padrão do app ─────────────────────────────────
const EQUIP_MAP = {
  'peso-do-corpo': 'Peso corporal',
  'barra': 'Barra',
  'halteres': 'Halteres',
  'máquina': 'Máquina',
  'cabo': 'Cabo / Polia',
  'barra-ez': 'Barra',
  'kettlebell': 'Kettlebell',
  'medicine-ball': 'Peso corporal',
  'faixas': 'Elástico',
  'elíptico': 'Máquina',
  'bicicleta-ergométrica': 'Máquina',
  'esteira': 'Máquina',
  'smith': 'Smith',
  'outros': '',
};

function mapear(ex) {
  const grupo = ex.primaryMuscles?.[0] || '';
  const equip = ex.equipment || '';
  return {
    nome: ex.name,
    grupoMuscular: GRUPO_MAP[grupo.toLowerCase()] || grupo || 'Funcional',
    equipamento: EQUIP_MAP[equip.toLowerCase()] ?? equip,
    descricao: Array.isArray(ex.instructions) ? ex.instructions.join('\n') : (ex.instructions || ''),
    nivel: ex.level || '',
    videoUrl: '',
    fonte: 'exercicios-bd-ptbr',
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const [,, personalId] = process.argv;
  if (!personalId) {
    console.error('Uso: node scripts/importExercicios.js <PERSONAL_ID>');
    console.error('Exemplo: node scripts/importExercicios.js abc123xyz');
    process.exit(1);
  }

  // 1. Inicializa Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log(`✅ Firebase iniciado. Personal ID: ${personalId}`);

  // 2. Verifica exercícios já importados para não duplicar
  console.log('🔍 Verificando duplicatas...');
  const snapExistentes = await getDocs(
    query(collection(db, 'exercicios'), where('personalId', '==', personalId), where('fonte', '==', 'exercicios-bd-ptbr'))
  );
  if (snapExistentes.size > 0) {
    console.log(`⚠️  Já existem ${snapExistentes.size} exercícios importados deste banco.`);
    console.log('   Deseja continuar e reimportar? (Ctrl+C para cancelar, qualquer tecla para continuar)');
    await new Promise(r => process.stdin.once('data', r));
  }

  // 3. Baixa o JSON do GitHub
  console.log('⬇️  Baixando banco de exercícios...');
  const url = 'https://raw.githubusercontent.com/joao-gugel/exercicios-bd-ptbr/main/exercises/exercises-ptbr-full-translation.json';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Falha ao baixar JSON: ${resp.status}`);
  const dados = await resp.json();

  const exercicios = Array.isArray(dados) ? dados : Object.values(dados);
  console.log(`📦 ${exercicios.length} exercícios encontrados no banco`);

  // 4. Importa em lotes de 50 com pausa para não estourar rate limit
  let importados = 0;
  let erros = 0;
  const LOTE = 50;

  for (let i = 0; i < exercicios.length; i += LOTE) {
    const lote = exercicios.slice(i, i + LOTE);
    await Promise.all(
      lote.map(async ex => {
        try {
          await addDoc(collection(db, 'exercicios'), {
            ...mapear(ex),
            personalId,
            criadoEm: Timestamp.now(),
          });
          importados++;
        } catch (e) {
          erros++;
          console.error(`  ❌ Erro em "${ex.name}": ${e.message}`);
        }
      })
    );
    process.stdout.write(`\r📥 Importando... ${importados}/${exercicios.length}`);
    if (i + LOTE < exercicios.length) await sleep(300);
  }

  console.log(`\n\n✅ Concluído! ${importados} importados, ${erros} erros.`);
  process.exit(0);
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1); });
