import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  getAuth,
} from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db } from './firebase';
import { firebaseConfig } from './firebase';

export async function cadastrar(email, senha, dados) {
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    ...dados,
    criadoEm: new Date(),
  });
  return cred.user;
}

export async function login(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

// Cria conta de aluno sem deslogar o personal — usa app secundário
// O setDoc usa o Firestore da instância secundária (autenticada como o aluno)
// para garantir que as regras de segurança do Firestore sejam satisfeitas
export async function criarContaAluno(email, senha, dados) {
  const appSecundario = initializeApp(firebaseConfig, `aluno_${Date.now()}`);
  const authSecundario = getAuth(appSecundario);
  const dbSecundario = getFirestore(appSecundario);
  try {
    const cred = await createUserWithEmailAndPassword(authSecundario, email, senha);
    await setDoc(doc(dbSecundario, 'users', cred.user.uid), {
      email,
      perfil: 'aluno',
      ...dados,
      criadoEm: new Date(),
    });
    return cred.user.uid;
  } finally {
    await signOut(authSecundario);
    await deleteApp(appSecundario);
  }
}
