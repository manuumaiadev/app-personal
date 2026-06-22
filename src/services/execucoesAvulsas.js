import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function registrarExercicioAvulso(dados) {
  return addDoc(collection(db, 'execucoes_avulsas'), {
    ...dados,
    dataHora: Timestamp.now(),
  });
}

export async function listarExerciciosAvulsos(alunoId) {
  const snap = await getDocs(query(
    collection(db, 'execucoes_avulsas'),
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
