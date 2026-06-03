import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { login } from '../../services/auth';
import { auth } from '../../services/firebase';
import { colors } from '../../utils/theme';

export default function LoginScreen({ navigation }) {
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
    } catch (e) {
      setErroReset('E-mail não encontrado ou inválido.');
    } finally {
      setEnviandoReset(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Modal esqueci senha */}
      <Modal visible={modalReset} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            {!resetOk ? (
              <>
                <Text style={styles.modalTitulo}>Redefinir senha</Text>
                <Text style={styles.modalDesc}>Informe seu e-mail e enviaremos um link para redefinir a senha.</Text>
                {!!erroReset && <Text style={styles.erroTexto}>{erroReset}</Text>}
                <TextInput
                  style={styles.input}
                  placeholder="Seu e-mail"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={emailReset}
                  onChangeText={setEmailReset}
                />
                <TouchableOpacity style={styles.botao} onPress={handleResetSenha} disabled={enviandoReset}>
                  {enviandoReset
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.botaoTexto}>Enviar link</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setModalReset(false); setEmailReset(''); setErroReset(''); }}>
                  <Text style={styles.linkCancelar}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📧</Text>
                <Text style={styles.modalTitulo}>E-mail enviado!</Text>
                <Text style={styles.modalDesc}>Verifique sua caixa de entrada e siga as instruções para redefinir a senha.</Text>
                <TouchableOpacity style={styles.botao} onPress={() => { setModalReset(false); setResetOk(false); setEmailReset(''); }}>
                  <Text style={styles.botaoTexto}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.logoContainer}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={styles.subtitulo}>Faça login para continuar</Text>

      {!!erro && (
        <View style={styles.erroBox}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#9ca3af"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={v => { setEmail(v); setErro(''); }}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={senha}
        onChangeText={v => { setSenha(v); setErro(''); }}
      />

      <TouchableOpacity
        style={styles.esqueceu}
        onPress={() => { setEmailReset(email); setModalReset(true); }}
      >
        <Text style={styles.esqueceuTexto}>Esqueci minha senha</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botao} onPress={handleLogin} disabled={carregando}>
        {carregando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.botaoTexto}>Entrar</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
        <Text style={styles.link}>Não tem conta? Cadastre-se</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', paddingHorizontal: 28,
    backgroundColor: colors.white,
  },
  logoContainer: {
    alignItems: 'center', marginTop: -100, marginBottom: -100,
    pointerEvents: 'none',
  },
  logo: { width: '120%', height: 500 },
  subtitulo: { fontSize: 15, color: colors.gray, textAlign: 'center', marginBottom: 16 },
  erroBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  erroTexto: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 14, fontSize: 15, color: colors.black, marginBottom: 14,
  },
  esqueceu: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -6 },
  esqueceuTexto: { color: colors.primary, fontSize: 13 },
  botao: {
    backgroundColor: colors.primary, borderRadius: 10, padding: 15,
    alignItems: 'center', marginBottom: 20,
  },
  botaoTexto: { color: colors.white, fontWeight: '600', fontSize: 16 },
  link: { color: colors.primary, textAlign: 'center', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '100%', alignItems: 'center' },
  modalTitulo: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  linkCancelar: { color: '#6b7280', marginTop: 14, fontSize: 14 },
});
