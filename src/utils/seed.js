import {
  collection, addDoc, setDoc, doc, getDocs,
  query, where, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { PERSONAL_ADMIN_ID } from '../config/admin';

// ─── IMPORTAÇÃO DO BANCO EXTERNO ───────────────────────────────────────────

const GRUPO_MAP = {
  'abdominais': 'Abdômen', 'isquiotibiais': 'Posterior', 'panturrilhas': 'Panturrilha',
  'peito': 'Peito', 'costas': 'Costas', 'ombros': 'Ombro', 'bíceps': 'Bíceps',
  'tríceps': 'Tríceps', 'glúteos': 'Glúteo', 'quadríceps': 'Quadríceps',
  'trapézio': 'Costas', 'antebraços': 'Bíceps', 'pescoço': 'Funcional',
  'pernas': 'Quadríceps', 'adutores': 'Glúteo', 'abdutores': 'Glúteo', 'lombar': 'Costas',
  'flexores do quadril': 'Funcional',
};
const EQUIP_MAP = {
  'peso-do-corpo': 'Peso corporal', 'barra': 'Barra', 'halteres': 'Halteres',
  'máquina': 'Máquina', 'cabo': 'Cabo / Polia', 'barra-ez': 'Barra',
  'kettlebell': 'Kettlebell', 'medicine-ball': 'Peso corporal', 'faixas': 'Elástico',
  'smith': 'Smith', 'outros': '',
};

export async function importarExercicios(personalId, onProgress) {
  const url = 'https://raw.githubusercontent.com/joao-gugel/exercicios-bd-ptbr/main/exercises/exercises-ptbr-full-translation.json';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Falha ao baixar exercícios');
  const dados = await resp.json();
  const lista = Array.isArray(dados) ? dados : Object.values(dados);
  let importados = 0;
  for (const ex of lista) {
    const grupo = (ex.primaryMuscles?.[0] || '').toLowerCase();
    const equip = (ex.equipment || '').toLowerCase();
    await addDoc(collection(db, 'exercicios'), {
      nome: ex.name,
      grupoMuscular: GRUPO_MAP[grupo] || 'Funcional',
      equipamento: EQUIP_MAP[equip] ?? ex.equipment ?? '',
      descricao: Array.isArray(ex.instructions) ? ex.instructions.join('\n') : '',
      videoUrl: '',
      fonte: 'exercicios-bd-ptbr',
      personalId,
      criadoEm: new Date(),
    });
    importados++;
    if (onProgress) onProgress(importados, lista.length);
  }
  return importados;
}

// ─── UTILITÁRIOS ───────────────────────────────────────────────────────────

function diasParaTimestamp(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return Timestamp.fromDate(d);
}

function diasAtrasTimestamp(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return Timestamp.fromDate(d);
}

// Exercícios fallback caso o banco ainda não tenha sido importado
const EX_FALLBACK = {
  'Peito':       ['Supino Reto', 'Supino Inclinado', 'Crucifixo'],
  'Costas':      ['Puxada Frontal', 'Remada Curvada', 'Remada Unilateral'],
  'Ombro':       ['Desenvolvimento', 'Elevação Lateral', 'Elevação Frontal'],
  'Bíceps':      ['Rosca Direta', 'Rosca Martelo', 'Rosca Concentrada'],
  'Tríceps':     ['Tríceps Corda', 'Tríceps Testa', 'Tríceps Francês'],
  'Abdômen':     ['Abdominal Crunch', 'Prancha', 'Abdominal Bicicleta'],
  'Glúteo':      ['Hip Thrust', 'Glúteo no Cabo', 'Agachamento Sumô'],
  'Quadríceps':  ['Agachamento Livre', 'Leg Press 45°', 'Cadeira Extensora'],
  'Posterior':   ['Mesa Flexora', 'Stiff', 'Cadeira Flexora'],
  'Panturrilha': ['Panturrilha em Pé', 'Panturrilha Sentado'],
  'Funcional':   ['Prancha', 'Burpee', 'Agachamento Corpo Livre'],
};

async function buscarExercicios(personalId, grupo, limite = 3) {
  try {
    const snap = await getDocs(query(
      collection(db, 'exercicios'),
      where('personalId', '==', personalId),
      where('grupoMuscular', '==', grupo)
    ));
    if (snap.docs.length > 0) {
      return snap.docs.slice(0, limite).map(d => ({
        id: d.id,
        nome: d.data().nome,
        series: 3, reps: '12', descanso: '60s',
      }));
    }
  } catch (_) {}
  // Fallback com exercícios embutidos
  return (EX_FALLBACK[grupo] || ['Exercício Geral']).slice(0, limite).map((nome, i) => ({
    id: `fb_${grupo}_${i}`,
    nome,
    series: 3, reps: '12', descanso: '60s',
  }));
}

async function criarTreinoComExs(fichaId, letra, grupos, personalId, dias = [], series = 3, reps = '12') {
  const exercicios = [];
  for (const grupo of grupos) {
    const exs = await buscarExercicios(personalId, grupo, 3);
    exercicios.push(...exs.map(e => ({ ...e, series, reps })));
  }
  return addDoc(collection(db, 'treinos'), {
    fichaId,
    letra,
    diasDaSemana: dias,
    exercicios,
    criadoEm: Timestamp.now(),
  });
}

async function criarExecucao(alunoId, fichaId, treino, diasAtras = 0) {
  const data = new Date();
  data.setDate(data.getDate() - diasAtras);
  data.setHours(7 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60));
  return addDoc(collection(db, 'execucoes'), {
    alunoId,
    fichaId,
    treinoId: treino.id,
    letra: treino.letra,
    exercicios: treino.exercicios?.map(ex => ({
      id: ex.id,
      nome: ex.nome,
      series: ex.series,
      reps: ex.reps,
      cargas: Array.from({ length: ex.series || 3 }, () =>
        String(10 + Math.floor(Math.random() * 30))
      ),
    })) || [],
    dataHora: Timestamp.fromDate(data),
  });
}

// ─── LIMPEZA ───────────────────────────────────────────────────────────────

export async function limparDadosFicticios(personalId) {
  // 1. Busca todos os alunos reais (IDs Firebase Auth, nunca começam com "demo_")
  const snapTodosAlunos = await getDocs(query(
    collection(db, 'users'),
    where('perfil', '==', 'aluno')
  ));
  const idsReais = new Set(
    snapTodosAlunos.docs.filter(d => !d.id.startsWith('demo_')).map(d => d.id)
  );
  const idsDemo = snapTodosAlunos.docs
    .filter(d => d.id.startsWith('demo_'))
    .map(d => d.id);

  // 2. Fichas a deletar: vinculadas a demo OU órfãs (alunoId não existe mais)
  const snapFichas = await getDocs(query(
    collection(db, 'fichas'),
    where('personalId', '==', personalId)
  ));
  const fichaIds = snapFichas.docs
    .filter(d => {
      const alunoId = d.data().alunoId;
      return alunoId?.startsWith('demo_') || !idsReais.has(alunoId);
    })
    .map(d => d.id);

  // 3. Treinos das fichas a deletar
  const treinoIds = [];
  for (let i = 0; i < fichaIds.length; i += 30) {
    const chunk = fichaIds.slice(i, i + 30);
    if (!chunk.length) continue;
    const snap = await getDocs(query(collection(db, 'treinos'), where('fichaId', 'in', chunk)));
    treinoIds.push(...snap.docs.map(d => d.id));
  }

  // 4. Execuções dos alunos demo
  const execIds = [];
  for (let i = 0; i < idsDemo.length; i += 30) {
    const chunk = idsDemo.slice(i, i + 30);
    if (!chunk.length) continue;
    const snap = await getDocs(query(collection(db, 'execucoes'), where('alunoId', 'in', chunk)));
    execIds.push(...snap.docs.map(d => d.id));
  }

  const todos = [
    ...idsDemo.map(id => doc(db, 'users', id)),
    ...fichaIds.map(id => doc(db, 'fichas', id)),
    ...treinoIds.map(id => doc(db, 'treinos', id)),
    ...execIds.map(id => doc(db, 'execucoes', id)),
  ];

  for (let i = 0; i < todos.length; i += 20) {
    await Promise.all(todos.slice(i, i + 20).map(ref => deleteDoc(ref)));
  }

  return { alunos: idsDemo.length, fichas: fichaIds.length, treinos: treinoIds.length };
}

// ─── TREINOS PARA ALUNOS SEM FICHA ────────────────────────────────────────

// Detecta o plano ideal pelo objetivo da anamnese
function detectarPlano(anamnese) {
  const obj = (anamnese?.objetivo || '').toLowerCase();
  if (obj.includes('emag') || obj.includes('perda') || obj.includes('definição'))
    return 'cutting';
  if (obj.includes('força') || obj.includes('potência'))
    return 'forca';
  if (obj.includes('reab') || obj.includes('core') || obj.includes('lesão') || obj.includes('hérnia'))
    return 'reabilitacao';
  if (obj.includes('saúde') || obj.includes('cardiov') || obj.includes('qualidade'))
    return 'saude';
  return 'hipertrofia'; // padrão
}

const PLANOS = {
  hipertrofia: {
    nome: 'Hipertrofia A/B/C', semanas: 8,
    treinos: [
      { letra: 'A', dias: ['Seg', 'Qui'], grupos: ['Peito', 'Tríceps', 'Ombro'], series: 4, reps: '12' },
      { letra: 'B', dias: ['Ter', 'Sex'], grupos: ['Costas', 'Bíceps'], series: 4, reps: '12' },
      { letra: 'C', dias: ['Qua', 'Sáb'], grupos: ['Glúteo', 'Quadríceps', 'Posterior'], series: 4, reps: '10' },
    ],
  },
  cutting: {
    nome: 'Cutting A/B', semanas: 6,
    treinos: [
      { letra: 'A', dias: ['Seg', 'Qua', 'Sex'], grupos: ['Peito', 'Tríceps', 'Abdômen'], series: 3, reps: '15' },
      { letra: 'B', dias: ['Ter', 'Qui', 'Sáb'], grupos: ['Costas', 'Bíceps', 'Glúteo'], series: 3, reps: '15' },
    ],
  },
  forca: {
    nome: 'Força A/B/C', semanas: 6,
    treinos: [
      { letra: 'A', dias: ['Seg'], grupos: ['Peito', 'Tríceps'], series: 5, reps: '5' },
      { letra: 'B', dias: ['Qua'], grupos: ['Costas', 'Bíceps'], series: 5, reps: '5' },
      { letra: 'C', dias: ['Sex'], grupos: ['Quadríceps', 'Posterior', 'Ombro'], series: 4, reps: '6' },
    ],
  },
  reabilitacao: {
    nome: 'Reabilitação Core', semanas: 6,
    treinos: [
      { letra: 'A', dias: ['Seg', 'Qua', 'Sex'], grupos: ['Abdômen', 'Glúteo', 'Funcional'], series: 3, reps: '10' },
      { letra: 'B', dias: ['Ter', 'Qui'], grupos: ['Posterior', 'Costas', 'Panturrilha'], series: 3, reps: '12' },
    ],
  },
  saude: {
    nome: 'Saúde e Bem-estar A/B', semanas: 4,
    treinos: [
      { letra: 'A', dias: ['Seg', 'Qua', 'Sex'], grupos: ['Funcional', 'Abdômen', 'Panturrilha'], series: 3, reps: '15' },
      { letra: 'B', dias: ['Ter', 'Qui'], grupos: ['Peito', 'Costas', 'Ombro'], series: 3, reps: '12' },
    ],
  },
};

export async function criarFichasParaAlunos(personalId) {
  const personalIds = [...new Set([personalId, PERSONAL_ADMIN_ID])];
  const snapAlunos = await getDocs(query(
    collection(db, 'users'),
    where('personalId', 'in', personalIds)
  ));
  const alunos = snapAlunos.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.perfil === 'aluno');

  // Busca fichas existentes para não duplicar
  const snapFichas = await getDocs(query(collection(db, 'fichas'), where('personalId', '==', personalId)));
  const alunosComFicha = new Set(snapFichas.docs.map(d => d.data().alunoId));

  let criados = 0;

  for (const aluno of alunos) {
    if (alunosComFicha.has(aluno.id)) continue; // já tem ficha

    const plano = PLANOS[detectarPlano(aluno.anamnese)];
    const criadoEm = diasAtrasTimestamp(plano.semanas * 7 - 25);
    const dataVencimento = diasParaTimestamp(25);

    const fichaRef = await addDoc(collection(db, 'fichas'), {
      nome: plano.nome,
      alunoId: aluno.id,
      personalId,
      semanas: plano.semanas,
      criadoEm,
      dataVencimento,
    });

    for (const tc of plano.treinos) {
      await criarTreinoComExs(fichaRef.id, tc.letra, tc.grupos, personalId, tc.dias, tc.series, tc.reps);
    }

    criados++;
  }

  return criados;
}

// ─── SEED COMPLETO ─────────────────────────────────────────────────────────

export async function popularDadosFicticios(personalId) {
  const ts = Date.now();

  const ALUNOS = [
    // 1. Ativa — treinou hoje e ontem → topo do dashboard
    {
      id: `demo_${ts}_1`,
      nome: 'Ana Costa', email: 'ana.costa@demo.com', perfil: 'aluno', personalId,
      anamnese: { idade: '28', peso: '62', altura: '1.65', profissao: 'Designer',
        objetivo: 'Emagrecimento e definição corporal', enfaseCorporal: 'Abdômen e glúteos',
        restricoes: '', medicamentos: '' },
      ficha: { nome: 'Cutting A/B', semanas: 6, venceEm: 38 },
      treinos: [
        { letra: 'A', dias: ['Seg', 'Qua', 'Sex'], grupos: ['Peito', 'Tríceps', 'Ombro'], series: 3, reps: '15' },
        { letra: 'B', dias: ['Ter', 'Qui', 'Sáb'], grupos: ['Costas', 'Bíceps', 'Abdômen'], series: 3, reps: '15' },
      ],
      execucoes: [0, 2, 4], // treinou hoje, 2 e 4 dias atrás
    },
    // 2. Ativa — treinou hoje, iniciante em hipertrofia
    {
      id: `demo_${ts}_2`,
      nome: 'Mariana Silva', email: 'mariana.silva@demo.com', perfil: 'aluno', personalId,
      anamnese: { idade: '22', peso: '55', altura: '1.60', profissao: 'Estudante',
        objetivo: 'Ganho de massa muscular', enfaseCorporal: 'Glúteos e pernas',
        restricoes: '', medicamentos: '' },
      ficha: { nome: 'Hipertrofia A/B/C', semanas: 8, venceEm: 50 },
      treinos: [
        { letra: 'A', dias: ['Seg', 'Qui'], grupos: ['Glúteo', 'Quadríceps', 'Posterior'], series: 4, reps: '12' },
        { letra: 'B', dias: ['Ter', 'Sex'], grupos: ['Peito', 'Tríceps', 'Ombro'], series: 4, reps: '12' },
        { letra: 'C', dias: ['Qua', 'Sáb'], grupos: ['Costas', 'Bíceps', 'Abdômen'], series: 4, reps: '12' },
      ],
      execucoes: [0, 2, 4, 6],
    },
    // 3. Ativa — treinou hoje, foco em força, atleta
    {
      id: `demo_${ts}_3`,
      nome: 'Rafael Oliveira', email: 'rafael.oliveira@demo.com', perfil: 'aluno', personalId,
      anamnese: { idade: '26', peso: '80', altura: '1.76', profissao: 'Bombeiro',
        objetivo: 'Força e potência muscular', enfaseCorporal: 'Membros superiores e core',
        restricoes: '', medicamentos: '' },
      ficha: { nome: 'Força A/B/C/D', semanas: 4, venceEm: 16 },
      treinos: [
        { letra: 'A', dias: ['Seg'], grupos: ['Peito', 'Tríceps'], series: 5, reps: '5' },
        { letra: 'B', dias: ['Ter'], grupos: ['Costas', 'Bíceps'], series: 5, reps: '5' },
        { letra: 'C', dias: ['Qui'], grupos: ['Quadríceps', 'Posterior', 'Panturrilha'], series: 4, reps: '8' },
        { letra: 'D', dias: ['Sex'], grupos: ['Ombro', 'Abdômen', 'Funcional'], series: 4, reps: '10' },
      ],
      execucoes: [0, 1, 2, 4, 5],
    },
    // 4. Ativa — pendente (não treina há 5 dias), lesão no joelho
    {
      id: `demo_${ts}_4`,
      nome: 'Pedro Alves', email: 'pedro.alves@demo.com', perfil: 'aluno', personalId,
      anamnese: { idade: '35', peso: '85', altura: '1.78', profissao: 'Engenheiro',
        objetivo: 'Condicionamento físico e redução de peso', enfaseCorporal: 'Peito, costas e abdômen',
        restricoes: 'Condromalácia patelar no joelho direito — evitar agachamento profundo e leg press com carga alta',
        medicamentos: 'Ibuprofeno 400mg (uso ocasional)' },
      ficha: { nome: 'Condicionamento A/B', semanas: 4, venceEm: 18 },
      treinos: [
        { letra: 'A', dias: ['Seg', 'Qua', 'Sex'], grupos: ['Peito', 'Costas', 'Abdômen'], series: 3, reps: '12' },
        { letra: 'B', dias: ['Ter', 'Qui'], grupos: ['Ombro', 'Bíceps', 'Tríceps'], series: 3, reps: '12' },
      ],
      execucoes: [5, 8, 11], // não treina há 5 dias
    },
    // 5. A vencer — vence em 5 dias, medicação contínua
    {
      id: `demo_${ts}_5`,
      nome: 'Carlos Ferreira', email: 'carlos.ferreira@demo.com', perfil: 'aluno', personalId,
      anamnese: { idade: '45', peso: '92', altura: '1.80', profissao: 'Diretor Comercial',
        objetivo: 'Saúde cardiovascular e qualidade de vida', enfaseCorporal: 'Funcional e cardio',
        restricoes: 'Hipertensão arterial sistêmica controlada — evitar Valsalva e exercícios isométricos prolongados',
        medicamentos: 'Losartana 50mg (diário), AAS 100mg (diário)' },
      ficha: { nome: 'Saúde Ativa A/B', semanas: 4, venceEm: 5 },
      treinos: [
        { letra: 'A', dias: ['Seg', 'Qua', 'Sex'], grupos: ['Funcional', 'Abdômen', 'Panturrilha'], series: 3, reps: '15' },
        { letra: 'B', dias: ['Ter', 'Qui'], grupos: ['Peito', 'Costas', 'Ombro'], series: 3, reps: '12' },
      ],
      execucoes: [3, 6, 9, 12],
    },
    // 6. Vencida — ficha expirou há 12 dias, pós-operatório
    {
      id: `demo_${ts}_6`,
      nome: 'Juliana Ramos', email: 'juliana.ramos@demo.com', perfil: 'aluno', personalId,
      anamnese: { idade: '32', peso: '68', altura: '1.68', profissao: 'Professora',
        objetivo: 'Reabilitação e fortalecimento do core', enfaseCorporal: 'Core, lombar e membros inferiores',
        restricoes: 'Pós-operatório de hérnia discal L4-L5 (cirurgia há 8 meses) — sem flexão de coluna, sem impacto',
        medicamentos: 'Vitamina D3 5000UI, Ômega 3, Colágeno hidrolisado' },
      ficha: { nome: 'Reabilitação Core', semanas: 4, venceEm: -12 },
      treinos: [
        { letra: 'A', dias: ['Seg', 'Qua', 'Sex'], grupos: ['Abdômen', 'Glúteo', 'Funcional'], series: 3, reps: '10' },
        { letra: 'B', dias: ['Ter', 'Qui'], grupos: ['Posterior', 'Costas', 'Panturrilha'], series: 3, reps: '12' },
      ],
      execucoes: [18, 21, 25, 28], // última há 18 dias
    },
  ];

  for (const aluno of ALUNOS) {
    const { id: alunoId, ficha: fichaConfig, treinos: treinosConfig, execucoes: execDias, ...alunoData } = aluno;

    // Cria usuário
    await setDoc(doc(db, 'users', alunoId), { ...alunoData, criadoEm: new Date() });

    // Cria ficha
    const criadoEm = diasAtrasTimestamp(fichaConfig.semanas * 7 - fichaConfig.venceEm);
    const dataVencimento = diasParaTimestamp(fichaConfig.venceEm);
    const fichaRef = await addDoc(collection(db, 'fichas'), {
      nome: fichaConfig.nome,
      alunoId,
      personalId,
      semanas: fichaConfig.semanas,
      criadoEm,
      dataVencimento,
    });

    // Cria treinos
    const treinosCriados = [];
    for (const tc of treinosConfig) {
      const t = await criarTreinoComExs(fichaRef.id, tc.letra, tc.grupos, personalId, tc.dias, tc.series, tc.reps);
      // Busca os exercícios para criar execuções realistas
      const exercicios = [];
      for (const grupo of tc.grupos) {
        const exs = await buscarExercicios(personalId, grupo, 3);
        exercicios.push(...exs.map(e => ({ ...e, series: tc.series, reps: tc.reps })));
      }
      treinosCriados.push({ id: t.id, letra: tc.letra, exercicios });
    }

    // Cria execuções
    for (const diasAtras of execDias) {
      const treinoDoEx = treinosCriados[diasAtras % treinosCriados.length];
      await criarExecucao(alunoId, fichaRef.id, treinoDoEx, diasAtras);
    }
  }
}
