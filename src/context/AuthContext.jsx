import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { PERSONAL_ADMIN_ID } from '../config/admin';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const ref = doc(db, 'users', user.uid);
          const snap = await getDoc(ref);
          const dados = snap.data() || {};

          const isAdmin = user.uid === PERSONAL_ADMIN_ID;
          if (isAdmin) {
            dados.perfil = 'personal';
            delete dados.personalId;
            updateDoc(ref, { perfil: 'personal', personalId: deleteField() }).catch(() => {});
          }

          setUsuario({ uid: user.uid, ...dados });
        } catch (e) {
          setUsuario({ uid: user.uid });
        }
      } else {
        setUsuario(null);
      }
      setCarregando(false);
    });
    return unsub;
  }, []);

  async function atualizarUsuario(dados) {
    if (!usuario?.uid) return;
    await updateDoc(doc(db, 'users', usuario.uid), dados);
    setUsuario(prev => ({ ...prev, ...dados }));
  }

  function logout() {
    setUsuario(null);
    signOut(auth).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, logout, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
