import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export async function criarTreino(dados) {
  return addDoc(collection(db, 'treinos'), {
    ...dados,
    criadoEm: Timestamp.now(),
  });
}

export async function listarTreinosFicha(fichaId) {
  const snap = await getDocs(query(
    collection(db, 'treinos'),
    where('fichaId', '==', fichaId)
  ));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.letra || '').localeCompare(b.letra || ''));
}

export async function atualizarTreino(id, dados) {
  await updateDoc(doc(db, 'treinos', id), dados);
}

export async function deletarTreino(id) {
  await deleteDoc(doc(db, 'treinos', id));
}
