import { collection, addDoc, updateDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function criarSolicitacao(alunoId, alunoNome, alunoEmail, codigoPersonal) {
  return addDoc(collection(db, 'solicitacoes'), {
    alunoId,
    alunoNome,
    alunoEmail,
    personalId: codigoPersonal,
    status: 'pendente',
    criadoEm: Timestamp.now(),
  });
}

export async function listarSolicitacoesPendentes(personalId) {
  const q = query(
    collection(db, 'solicitacoes'),
    where('personalId', '==', personalId),
    where('status', '==', 'pendente')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function aprovarSolicitacao(solicitacaoId, alunoId, personalId) {
  await Promise.all([
    updateDoc(doc(db, 'solicitacoes', solicitacaoId), { status: 'aprovada' }),
    updateDoc(doc(db, 'users', alunoId), { personalId }),
  ]);
}

export async function rejeitarSolicitacao(solicitacaoId) {
  await updateDoc(doc(db, 'solicitacoes', solicitacaoId), { status: 'rejeitada' });
}

export async function verificarSolicitacaoExistente(alunoId, personalId) {
  const q = query(
    collection(db, 'solicitacoes'),
    where('alunoId', '==', alunoId),
    where('personalId', '==', personalId),
    where('status', '==', 'pendente')
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
