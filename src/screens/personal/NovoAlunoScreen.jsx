import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { criarContaAluno } from '../../services/auth';
import { doc, setDoc, getFirestore, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

export default function NovoAlunoScreen({ navigation }) {
  const { usuario } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  async function handleCriar() {
    setErro('');
    if (!nome || !email || !senha) { setErro('Preencha todos os campos.'); return; }
    if (senha.length < 6) { setErro('Senha deve ter no mínimo 6 caracteres.'); return; }
    setCarregando(true);
    try {
      await criarContaAluno(email.trim(), senha, {
        nome,
        perfil: 'aluno',
        personalId: usuario.uid,
      });
      setSucesso(true);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        // Tenta recuperar: o usuário existe no Auth mas pode não ter documento no Firestore
        await recuperarDocumentoAluno(email.trim(), senha, nome, usuario.uid);
      } else {
        setErro('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  }

  async function recuperarDocumentoAluno(email, senha, nome, personalId) {
    try {
      const appTemp = initializeApp(firebaseConfig, `recover_${Date.now()}`);
      const authTemp = getAuth(appTemp);
      const dbTemp = getFirestore(appTemp);
      const cred = await signInWithEmailAndPassword(authTemp, email, senha);
      const ref = doc(dbTemp, 'users', cred.user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { nome, email, perfil: 'aluno', personalId, criadoEm: new Date() });
        setSucesso(true);
      } else {
        setErro('Este e-mail já está cadastrado e já possui perfil ativo.');
      }
      await fbSignOut(authTemp);
      await deleteApp(appTemp);
    } catch (e) {
      setErro('Este e-mail já está cadastrado.');
    }
  }

  return (
    <>
      <Modal visible={sucesso} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcone}>✅</Text>
            <Text style={styles.modalTitulo}>Aluno cadastrado!</Text>
            <Text style={styles.modalTexto}>
              A conta de <Text style={{ fontWeight: '700' }}>{nome}</Text> foi criada.{'\n'}
              Compartilhe o e-mail e senha com o aluno para ele acessar o app.
            </Text>
            <View style={styles.credCard}>
              <Text style={styles.credLabel}>E-mail</Text>
              <Text style={styles.credValor}>{email}</Text>
              <Text style={[styles.credLabel, { marginTop: 8 }]}>Senha</Text>
              <Text style={styles.credValor}>{senha}</Text>
            </View>
            <TouchableOpacity style={styles.modalBotao} onPress={() => { setSucesso(false); navigation.goBack(); }}>
              <Text style={styles.modalBotaoTexto}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Ionicons name="arrow-back" size={22} color="#E31E24" />
          <Text style={styles.voltarTexto}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Novo Aluno</Text>
        <Text style={styles.subtitulo}>Crie a conta do aluno. Ele poderá acessar o app com as credenciais geradas aqui.</Text>

        {!!erro && <Text style={styles.erro}>{erro}</Text>}

        <Text style={styles.label}>Nome completo</Text>
        <TextInput style={styles.input} placeholder="Ex: João Silva" placeholderTextColor="#9ca3af"
          value={nome} onChangeText={setNome} />

        <Text style={styles.label}>E-mail</Text>
        <TextInput style={styles.input} placeholder="email@exemplo.com" placeholderTextColor="#9ca3af"
          keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

        <Text style={styles.label}>Senha provisória</Text>
        <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#9ca3af"
          value={senha} onChangeText={setSenha} />
        <Text style={styles.hint}>O aluno poderá trocar a senha depois.</Text>

        <TouchableOpacity style={styles.botao} onPress={handleCriar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Criar conta do aluno</Text>}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 60, marginBottom: 20 },
  voltarTexto: { color: '#E31E24', fontSize: 15 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitulo: { color: '#6b7280', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  erro: { color: '#E31E24', fontSize: 14, marginBottom: 12 },
  label: { color: '#374151', fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 15, color: '#111827', marginBottom: 16 },
  hint: { color: '#9ca3af', fontSize: 12, marginTop: -10, marginBottom: 16 },
  botao: { backgroundColor: '#E31E24', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', width: '100%' },
  modalIcone: { fontSize: 44, marginBottom: 12 },
  modalTitulo: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalTexto: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  credCard: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, width: '100%', marginBottom: 20 },
  credLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  credValor: { fontSize: 15, color: '#111827', fontWeight: '600', marginTop: 2 },
  modalBotao: { backgroundColor: '#E31E24', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
  modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
