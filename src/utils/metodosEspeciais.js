export const METODOS_ESPECIAIS = [
  {
    id: 'biset',
    label: 'Bi-set',
    descricao: '2 exercicios seguidos sem descanso entre eles',
    minEx: 2,
    maxEx: 2,
    cor: '#8b5cf6',
  },
  {
    id: 'triset',
    label: 'Tri-set',
    descricao: '3 exercicios seguidos sem descanso',
    minEx: 3,
    maxEx: 3,
    cor: '#06b6d4',
  },
  {
    id: 'circuito',
    label: 'Circuito',
    descricao: '4+ exercicios em sequencia, descanso so no final da rodada',
    minEx: 4,
    maxEx: 99,
    cor: '#f59e0b',
  },
  {
    id: 'cluster',
    label: 'Cluster',
    descricao: 'Series com micro-pausas dentro da propria serie (ex: 4+4+4)',
    minEx: 1,
    maxEx: 1,
    cor: '#ef4444',
  },
  {
    id: 'dropset',
    label: 'Drop-set',
    descricao: 'Reduz a carga a cada serie sem descanso',
    minEx: 1,
    maxEx: 1,
    cor: '#ec4899',
  },
  {
    id: 'restpause',
    label: 'Rest-pause',
    descricao: 'Executa ate a falha, pausa curta, continua ate a falha',
    minEx: 1,
    maxEx: 1,
    cor: '#10b981',
  },
];

export function metodoById(id) {
  return METODOS_ESPECIAIS.find(m => m.id === id) || null;
}

// Returns { [exId]: metodoDef } for quick lookup
export function buildExMetodoMap(metodosEspeciais) {
  const map = {};
  if (!metodosEspeciais) return map;
  for (const grupo of metodosEspeciais) {
    const def = metodoById(grupo.metodo);
    if (!def) continue;
    const ids = grupo.exercicioIds || [];
    for (let i = 0; i < ids.length; i++) {
      map[ids[i]] = {
        def,
        grupoId: grupo.id,
        descansoPorRodada: grupo.descansoPorRodada ?? 60,
        isLastInGroup: i === ids.length - 1,
        isFirstInGroup: i === 0,
        indexInGroup: i,
        totalInGroup: ids.length,
      };
    }
  }
  return map;
}
