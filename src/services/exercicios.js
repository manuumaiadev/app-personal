import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { PERSONAL_ADMIN_ID } from '../config/admin';

export async function criarExercicio(personalId, dados) {
  return addDoc(collection(db, 'exercicios'), {
    ...dados,
    personalId,
    criadoEm: Timestamp.now(),
  });
}

export async function listarExercicios(personalId) {
  const ids = personalId === PERSONAL_ADMIN_ID
    ? [personalId]
    : [...new Set([personalId, PERSONAL_ADMIN_ID])];

  const q = query(
    collection(db, 'exercicios'),
    where('personalId', 'in', ids)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
}

export async function buscarExercicio(id) {
  const snap = await getDoc(doc(db, 'exercicios', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function atualizarExercicio(id, dados) {
  await updateDoc(doc(db, 'exercicios', id), dados);
}

export async function deletarExercicio(id) {
  await deleteDoc(doc(db, 'exercicios', id));
}
