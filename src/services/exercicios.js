import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export async function criarExercicio(personalId, dados) {
  return addDoc(collection(db, 'exercicios'), {
    ...dados,
    personalId,
    criadoEm: Timestamp.now(),
  });
}

export async function listarExercicios(personalId) {
  const q = query(
    collection(db, 'exercicios'),
    where('personalId', '==', personalId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
}

export async function atualizarExercicio(id, dados) {
  await updateDoc(doc(db, 'exercicios', id), dados);
}

export async function deletarExercicio(id) {
  await deleteDoc(doc(db, 'exercicios', id));
}
