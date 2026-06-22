import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cadastrar } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';

function makeStyles(t) {
  return {
    container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, backgroundColor: t.bg },
    voltar: { marginBottom: 24 },
    voltarTexto: { color: t.red, fontSize: 15 },
    titulo: { fontSize: 26, fontWeight: '700', color: t.textPrimary, marginBottom: 28 },
    erroTexto: { color: t.red, fontSize: 14, marginBottom: 12, textAlign: 'center' },
    input: {
      backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder,
      borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary, marginBottom: 14,
    },
    label: { color: t.textSecondary, fontWeight: '600', marginBottom: 10 },
    perfilRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    perfilBotao: {
      flex: 1, padding: 12, borderRadius: 10, borderWidth: 1,
      borderColor: t.border, backgroundColor: t.surface, alignItems: 'center',
    },
    perfilAtivo: { backgroundColor: t.red, borderColor: t.red },
    perfilTexto: { color: t.textSecondary, fontWeight: '500' },
    perfilTextoAtivo: { color: '#fff' },
    botao: {
      backgroundColor: t.red, borderRadius: 10, padding: 15,
      alignItems: 'center', marginBottom: 40,
    },
    botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
    overlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center', padding: 32,
    },
    modalBox: {
      backgroundColor: t.surface, borderRadius: 16, padding: 32,
      alignItems: 'center', width: '100%', maxWidth: 360,
    },
    modalTitulo: { fontSize: 22, fontWeight: '700', color: t.textPrimary, marginBottom: 10 },
    modalTexto: { fontSize: 15, color: t.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    modalBotao: {
      backgroundColor: t.red, borderRadius: 10, padding: 14,
      alignItems: 'center', width: '100%',
    },
    modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  };
}

export default function CadastroScreen({ navigation }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

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
    if (!nome || !email || !senha) { setErro('Preencha todos os campos.'); return; }
    if (senha.length < 6) { setErro('Senha deve ter no minimo 6 caracteres.'); return; }
    setCarregando(true);
    try {
      const user = await cadastrar(email.trim(), senha, { nome, perfil });
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
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Ionicons name="checkmark-circle" size={52} color={theme.red} style={{ marginBottom: 12 }} />
            <Text style={s.modalTitulo}>Cadastro realizado!</Text>
            <Text style={s.modalTexto}>
              {perfil === 'aluno'
                ? 'Conta criada com sucesso!\nVamos completar seu perfil.'
                : 'Sua conta foi criada com sucesso!'}
            </Text>
            <TouchableOpacity style={s.modalBotao} onPress={handleFecharModal}>
              <Text style={s.modalBotaoTexto}>
                {perfil === 'aluno' ? 'Completar perfil' : 'Fazer login'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
          <Text style={s.voltarTexto}>Voltar</Text>
        </TouchableOpacity>

        <Text style={s.titulo}>Criar conta</Text>

        {!!erro && <Text style={s.erroTexto}>{erro}</Text>}

        <TextInput
          style={s.input}
          placeholder="Nome completo"
          placeholderTextColor={theme.placeholder}
          value={nome}
          onChangeText={setNome}
        />
        <TextInput
          style={s.input}
          placeholder="E-mail"
          placeholderTextColor={theme.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Senha (min. 6 caracteres)"
          placeholderTextColor={theme.placeholder}
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <Text style={s.label}>Sou:</Text>
        <View style={s.perfilRow}>
          {['aluno', 'personal'].map(p => (
            <TouchableOpacity
              key={p}
              style={[s.perfilBotao, perfil === p && s.perfilAtivo]}
              onPress={() => setPerfil(p)}
            >
              <Text style={[s.perfilTexto, perfil === p && s.perfilTextoAtivo]}>
                {p === 'aluno' ? 'Aluno' : 'Personal Trainer'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.botao} onPress={handleCadastro} disabled={carregando}>
          {carregando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.botaoTexto}>Cadastrar</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
