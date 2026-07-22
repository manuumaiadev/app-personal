import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function registrarCardio({ alunoId, fichaId, minutos }) {
  return addDoc(collection(db, 'cardio_logs'), {
    alunoId,
    fichaId,
    minutos: Number(minutos),
    dataHora: Timestamp.now(),
  });
}

export async function listarCardioAluno(alunoId) {
  const snap = await getDocs(query(
    collection(db, 'cardio_logs'),
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
