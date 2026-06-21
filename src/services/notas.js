import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

function notaDocId(personalId, alunoId) {
  return `${personalId}_${alunoId}`;
}

export async function salvarNotas(personalId, alunoId, texto) {
  await setDoc(doc(db, 'notasPersonal', notaDocId(personalId, alunoId)), {
    personalId, alunoId, texto, atualizadoEm: serverTimestamp(),
  });
}

export async function buscarNotas(personalId, alunoId) {
  const snap = await getDoc(doc(db, 'notasPersonal', notaDocId(personalId, alunoId)));
  return snap.exists() ? (snap.data().texto || '') : '';
}
