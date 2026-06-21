import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { criarContaAluno } from '../../services/auth';
import { doc, setDoc, getFirestore, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function NovoAlunoScreen({ navigation }) {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
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
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>Aluno cadastrado!</Text>
            <Text style={s.modalTexto}>
              A conta de <Text style={{ fontWeight: '700' }}>{nome}</Text> foi criada.{'\n'}
              Compartilhe o e-mail e senha com o aluno para ele acessar o app.
            </Text>
            <View style={s.credCard}>
              <Text style={s.credLabel}>E-mail</Text>
              <Text style={s.credValor}>{email}</Text>
              <Text style={[s.credLabel, { marginTop: 8 }]}>Senha</Text>
              <Text style={s.credValor}>{senha}</Text>
            </View>
            <TouchableOpacity style={s.modalBotao} onPress={() => { setSucesso(false); navigation.goBack(); }}>
              <Text style={s.modalBotaoTexto}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
          <Ionicons name="arrow-back" size={22} color={theme.red} />
          <Text style={s.voltarTexto}>Voltar</Text>
        </TouchableOpacity>

        <Text style={s.titulo}>Novo Aluno</Text>
        <Text style={s.subtitulo}>Crie a conta do aluno. Ele poderá acessar o app com as credenciais geradas aqui.</Text>

        {!!erro && <Text style={s.erro}>{erro}</Text>}

        <Text style={s.label}>Nome completo</Text>
        <TextInput style={s.input} placeholder="Ex: João Silva" placeholderTextColor={theme.placeholder}
          value={nome} onChangeText={setNome} />

        <Text style={s.label}>E-mail</Text>
        <TextInput style={s.input} placeholder="email@exemplo.com" placeholderTextColor={theme.placeholder}
          keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

        <Text style={s.label}>Senha provisória</Text>
        <TextInput style={s.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={theme.placeholder}
          value={senha} onChangeText={setSenha} />
        <Text style={s.hint}>O aluno poderá trocar a senha depois.</Text>

        <TouchableOpacity style={s.botao} onPress={handleCriar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>Criar conta do aluno</Text>}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20 },
    voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 60, marginBottom: 20 },
    voltarTexto: { color: t.red, fontSize: 15 },
    titulo: { fontSize: 24, fontWeight: '700', color: t.textPrimary, marginBottom: 6 },
    subtitulo: { color: t.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 24 },
    erro: { color: t.red, fontSize: 14, marginBottom: 12 },
    label: { color: t.textPrimary, fontWeight: '600', marginBottom: 6 },
    input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary, marginBottom: 16 },
    hint: { color: t.textTertiary, fontSize: 12, marginTop: -10, marginBottom: 16 },
    botao: { backgroundColor: t.red, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8, marginBottom: 40 },
    botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 28, alignItems: 'center', width: '100%' },
    modalTitulo: { fontSize: 22, fontWeight: '700', color: t.textPrimary, marginBottom: 8 },
    modalTexto: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    credCard: { backgroundColor: t.elevated, borderRadius: 10, padding: 14, width: '100%', marginBottom: 20 },
    credLabel: { fontSize: 11, color: t.textTertiary, fontWeight: '600' },
    credValor: { fontSize: 15, color: t.textPrimary, fontWeight: '600', marginTop: 2 },
    modalBotao: { backgroundColor: t.red, borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
    modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  };
}
