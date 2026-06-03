import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export async function registrarExecucao(dados) {
  return addDoc(collection(db, 'execucoes'), {
    ...dados,
    dataHora: Timestamp.now(),
  });
}

export async function listarHistoricoAluno(alunoId) {
  const snap = await getDocs(query(
    collection(db, 'execucoes'),
    where('alunoId', '==', alunoId)
  ));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const da = a.dataHora?.toDate?.() || new Date(0);
      const db2 = b.dataHora?.toDate?.() || new Date(0);
      return db2 - da;
    });
}

export async function listarExecucoesRecentes(alunoIds) {
  if (!alunoIds.length) return [];
  const results = [];
  for (let i = 0; i < alunoIds.length; i += 30) {
    const chunk = alunoIds.slice(i, i + 30);
    const snap = await getDocs(query(
      collection(db, 'execucoes'),
      where('alunoId', 'in', chunk)
    ));
    results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  // ordena client-side para evitar índice composto no Firestore
  return results.sort((a, b) => {
    const da = a.dataHora?.toDate?.() || new Date(0);
    const db2 = b.dataHora?.toDate?.() || new Date(0);
    return db2 - da;
  });
}

export async function listarExecucoesHoje(alunoIds) {
  if (!alunoIds.length) return [];
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const results = [];
  for (let i = 0; i < alunoIds.length; i += 30) {
    const chunk = alunoIds.slice(i, i + 30);
    const snap = await getDocs(query(
      collection(db, 'execucoes'),
      where('alunoId', 'in', chunk)
    ));
    results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  // filtra client-side para evitar índice composto no Firestore
  return results.filter(e => {
    const data = e.dataHora?.toDate?.();
    return data && data >= inicioHoje;
  });
}

export async function listarExecucoesTreino(alunoId, treinoId) {
  const snap = await getDocs(query(
    collection(db, 'execucoes'),
    where('alunoId', '==', alunoId),
    where('treinoId', '==', treinoId)
  ));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const da = a.dataHora?.toDate?.() || new Date(0);
      const db2 = b.dataHora?.toDate?.() || new Date(0);
      return db2 - da;
    });
}
