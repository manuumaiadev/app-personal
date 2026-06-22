import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../../services/auth';
import { auth } from '../../services/firebase';
import { LIGHT } from '../../context/ThemeContext';

function makeStyles(t) {
  return {
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, backgroundColor: t.bg },
    logoContainer: { alignItems: 'center', marginTop: -100, marginBottom: -100, pointerEvents: 'none' },
    logo: { width: '120%', height: 500 },
    subtitulo: { fontSize: 15, color: t.textSecondary, textAlign: 'center', marginBottom: 16 },
    erroBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
    erroTexto: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
    input: {
      backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder,
      borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary, marginBottom: 14,
    },
    esqueceu: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -6 },
    esqueceuTexto: { color: t.red, fontSize: 13 },
    botao: { backgroundColor: t.red, borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 20 },
    botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
    link: { color: t.red, textAlign: 'center', fontSize: 14 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 28 },
    modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 28, width: '100%', alignItems: 'center' },
    modalTitulo: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 8, textAlign: 'center' },
    modalDesc: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    modalInput: {
      backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder,
      borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary,
      marginBottom: 14, width: '100%',
    },
    linkCancelar: { color: t.textSecondary, marginTop: 14, fontSize: 14 },
  };
}

export default function LoginScreen({ navigation }) {
  const theme = LIGHT;
  const s = useMemo(() => makeStyles(LIGHT), []);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [modalReset, setModalReset] = useState(false);
  const [emailReset, setEmailReset] = useState('');
  const [resetOk, setResetOk] = useState(false);
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [erroReset, setErroReset] = useState('');

  async function handleLogin() {
    setErro('');
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return; }
    setCarregando(true);
    try {
      await login(email.trim(), senha);
    } catch (e) {
      const cod = e.code || '';
      if (cod.includes('user-not-found') || cod.includes('invalid-credential') || cod.includes('wrong-password')) {
        setErro('E-mail ou senha incorretos.');
      } else if (cod.includes('too-many-requests')) {
        setErro('Muitas tentativas. Aguarde alguns minutos.');
      } else {
        setErro('Erro ao entrar. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  }

  async function handleResetSenha() {
    setErroReset('');
    if (!emailReset.trim()) { setErroReset('Informe o e-mail.'); return; }
    setEnviandoReset(true);
    try {
      await sendPasswordResetEmail(auth, emailReset.trim());
      setResetOk(true);
    } catch {
      setErroReset('E-mail nao encontrado ou invalido.');
    } finally {
      setEnviandoReset(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Modal visible={modalReset} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            {!resetOk ? (
              <>
                <Text style={s.modalTitulo}>Redefinir senha</Text>
                <Text style={s.modalDesc}>Informe seu e-mail e enviaremos um link para redefinir a senha.</Text>
                {!!erroReset && <Text style={[s.erroTexto, { marginBottom: 10 }]}>{erroReset}</Text>}
                <TextInput
                  style={s.modalInput}
                  placeholder="Seu e-mail"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={emailReset}
                  onChangeText={setEmailReset}
                />
                <TouchableOpacity style={[s.botao, { width: '100%', marginBottom: 0 }]} onPress={handleResetSenha} disabled={enviandoReset}>
                  {enviandoReset
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.botaoTexto}>Enviar link</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setModalReset(false); setEmailReset(''); setErroReset(''); }}>
                  <Text style={s.linkCancelar}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="mail-outline" size={48} color={theme.red} style={{ marginBottom: 12 }} />
                <Text style={s.modalTitulo}>E-mail enviado!</Text>
                <Text style={s.modalDesc}>Verifique sua caixa de entrada e siga as instrucoes para redefinir a senha.</Text>
                <TouchableOpacity style={[s.botao, { width: '100%', marginBottom: 0 }]} onPress={() => { setModalReset(false); setResetOk(false); setEmailReset(''); }}>
                  <Text style={s.botaoTexto}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <View style={s.logoContainer}>
        <Image source={require('../../../assets/logo.png')} style={s.logo} resizeMode="contain" />
      </View>

      <Text style={s.subtitulo}>Faca login para continuar</Text>

      {!!erro && (
        <View style={s.erroBox}>
          <Text style={s.erroTexto}>{erro}</Text>
        </View>
      )}

      <TextInput
        style={s.input}
        placeholder="E-mail"
        placeholderTextColor={theme.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={v => { setEmail(v); setErro(''); }}
      />
      <TextInput
        style={s.input}
        placeholder="Senha"
        placeholderTextColor={theme.placeholder}
        secureTextEntry
        value={senha}
        onChangeText={v => { setSenha(v); setErro(''); }}
      />

      <TouchableOpacity style={s.esqueceu} onPress={() => { setEmailReset(email); setModalReset(true); }}>
        <Text style={s.esqueceuTexto}>Esqueci minha senha</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.botao} onPress={handleLogin} disabled={carregando}>
        {carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>Entrar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
        <Text style={s.link}>Nao tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
