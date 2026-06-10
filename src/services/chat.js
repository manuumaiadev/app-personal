import { db } from './firebase';
import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, doc, setDoc, getDoc,
} from 'firebase/firestore';

export function chatDocId(personalId, alunoId) {
  return `${personalId}_${alunoId}`;
}

export async function enviarMensagem(personalId, alunoId, remetenteId, texto) {
  const id = chatDocId(personalId, alunoId);
  await setDoc(doc(db, 'chats', id), {
    personalId,
    alunoId,
    ultimaMensagem: texto,
    ultimaDataHora: serverTimestamp(),
  }, { merge: true });
  await addDoc(collection(db, 'chats', id, 'mensagens'), {
    texto,
    remetenteId,
    dataHora: serverTimestamp(),
  });
}

export function escutarMensagens(personalId, alunoId, callback) {
  const id = chatDocId(personalId, alunoId);
  const q = query(
    collection(db, 'chats', id, 'mensagens'),
    orderBy('dataHora', 'asc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function buscarNomeUsuario(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data().nome : null;
}
