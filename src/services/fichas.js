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

export async function criarFicha(dados) {
  return addDoc(collection(db, 'fichas'), {
    ...dados,
    criadoEm: Timestamp.now(),
  });
}

export async function listarFichasAluno(alunoId) {
  const q = query(
    collection(db, 'fichas'),
    where('alunoId', '==', alunoId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listarFichasPersonal(personalId) {
  const q = query(
    collection(db, 'fichas'),
    where('personalId', '==', personalId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarFicha(id, dados) {
  await updateDoc(doc(db, 'fichas', id), dados);
}

export async function deletarFicha(id) {
  await deleteDoc(doc(db, 'fichas', id));
}
