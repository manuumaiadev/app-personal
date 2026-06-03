import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal
} from 'react-native';
import { cadastrar } from '../../services/auth';
import { PERSONAL_ADMIN_ID } from '../../config/admin';

export default function CadastroScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('aluno');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');
  const [novoUid, setNovoUid] = useState(null);

  async function handleCadastro() {
    setErro('');
    if (!nome || !email || !senha) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      setErro('Senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setCarregando(true);
    try {
      const dadosExtras = perfil === 'aluno' ? { personalId: PERSONAL_ADMIN_ID } : {};
      const user = await cadastrar(email.trim(), senha, { nome, perfil, ...dadosExtras });
      setNovoUid(user.uid);
      setSucesso(true);
    } catch (e) {
      setErro(e.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  function handleFecharModal() {
    setSucesso(false);
    if (perfil === 'aluno' && novoUid) {
      navigation.navigate('Anamnese', { uid: novoUid });
    } else {
      navigation.navigate('Login');
    }
  }

  return (
    <>
      <Modal visible={sucesso} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcone}>✅</Text>
            <Text style={styles.modalTitulo}>Cadastro realizado!</Text>
            <Text style={styles.modalTexto}>
              {perfil === 'aluno'
                ? 'Conta criada com sucesso!\nVamos completar seu perfil.'
                : 'Sua conta foi criada com sucesso!'}
            </Text>
            <TouchableOpacity style={styles.modalBotao} onPress={handleFecharModal}>
              <Text style={styles.modalBotaoTexto}>
                {perfil === 'aluno' ? 'Completar perfil' : 'Fazer login'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Text style={styles.voltarTexto}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Criar conta</Text>

        {!!erro && <Text style={styles.erroTexto}>{erro}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          placeholderTextColor="#9ca3af"
          value={nome}
          onChangeText={setNome}
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha (mín. 6 caracteres)"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <Text style={styles.label}>Sou:</Text>
        <View style={styles.perfilRow}>
          {['aluno', 'personal'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.perfilBotao, perfil === p && styles.perfilAtivo]}
              onPress={() => setPerfil(p)}
            >
              <Text style={[styles.perfilTexto, perfil === p && styles.perfilTextoAtivo]}>
                {p === 'aluno' ? 'Aluno' : 'Personal Trainer'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.botao} onPress={handleCadastro} disabled={carregando}>
          {carregando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botaoTexto}>Cadastrar</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, backgroundColor: '#fff' },
  voltar: { marginBottom: 24 },
  voltarTexto: { color: '#E31E24', fontSize: 15 },
  titulo: { fontSize: 26, fontWeight: '700', color: '#111111', marginBottom: 28 },
  erroTexto: { color: '#E31E24', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#111111', marginBottom: 14,
  },
  label: { color: '#374151', fontWeight: '600', marginBottom: 10 },
  perfilRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  perfilBotao: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center',
  },
  perfilAtivo: { backgroundColor: '#E31E24', borderColor: '#E31E24' },
  perfilTexto: { color: '#374151', fontWeight: '500' },
  perfilTextoAtivo: { color: '#fff' },
  botao: {
    backgroundColor: '#E31E24', borderRadius: 10, padding: 15,
    alignItems: 'center', marginBottom: 40,
  },
  botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 360,
  },
  modalIcone: { fontSize: 48, marginBottom: 12 },
  modalTitulo: { fontSize: 22, fontWeight: '700', color: '#111111', marginBottom: 10 },
  modalTexto: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBotao: {
    backgroundColor: '#E31E24', borderRadius: 10, padding: 14,
    alignItems: 'center', width: '100%',
  },
  modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
