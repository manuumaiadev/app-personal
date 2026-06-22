import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Clipboard, Switch, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { excluirConta, reautenticar, alterarEmail, alterarSenha } from '../../services/auth';
import { escolherFoto, uploadFotoPerfil } from '../../services/fotoService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
    titulo: { fontSize: 24, fontWeight: '700', color: t.textPrimary },
    avatarBox: { alignItems: 'center', marginBottom: 28 },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 36 },
    avatarEdit: { position: 'absolute', bottom: 12, right: 0, backgroundColor: t.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: t.border },
    nome: { fontSize: 22, fontWeight: '700', color: t.textPrimary },
    email: { color: t.textSecondary, marginTop: 4, fontSize: 14 },
    perfilBadge: { marginTop: 8, backgroundColor: t.red + '18', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
    perfilBadgeTexto: { color: t.red, fontWeight: '700', fontSize: 13 },
    card: { backgroundColor: t.surface, borderRadius: 14, padding: 18, width: '100%', marginBottom: 16, borderWidth: 1, borderColor: t.border },
    codigoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    codigoTitulo: { fontWeight: '700', color: t.textPrimary, fontSize: 15 },
    codigoDesc: { color: t.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 14 },
    codigoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.elevated, borderRadius: 10, borderWidth: 1, borderColor: t.border, padding: 12, gap: 10 },
    codigoTexto: { flex: 1, fontSize: 12, color: t.textPrimary, fontFamily: 'monospace' },
    copiarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    copiarTexto: { color: t.red, fontWeight: '600', fontSize: 13 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleTexto: { fontSize: 15, fontWeight: '600', color: t.textPrimary },
    toggleSub: { fontSize: 12, color: t.textSecondary, marginTop: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 28 },
    logoutBtn: { padding: 6 },
    botaoExcluir: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
    botaoExcluirTexto: { color: t.textTertiary, fontSize: 13, textDecorationLine: 'underline' },
    secaoTitulo: { fontSize: 15, fontWeight: '700', color: t.textPrimary, marginBottom: 12 },
    acessoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    acessoLabel: { fontSize: 11, color: t.textSecondary, fontWeight: '600' },
    acessoValor: { fontSize: 14, color: t.textPrimary, fontWeight: '500', marginTop: 1 },
    acessoDivisor: { height: 1, backgroundColor: t.border },
    modalSheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: t.border, position: 'absolute', bottom: 0, left: 0, right: 0 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 20 },
    campoLabel: { fontSize: 11, fontWeight: '700', color: t.textSecondary, marginBottom: 5, letterSpacing: 0.3 },
    campoInput: { backgroundColor: t.inputBg || t.elevated, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 11, fontSize: 14, color: t.textPrimary },
    msgErro: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginTop: 12 },
    msgErroTexto: { fontSize: 13, fontWeight: '500', flex: 1, color: '#dc2626' },
    salvarBtn: { backgroundColor: t.red, borderRadius: 12, padding: 14, alignItems: 'center' },
    salvarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    excluirOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 24, width: '100%' },
    modalTitulo: { fontSize: 17, fontWeight: '700', color: t.textPrimary, marginBottom: 6 },
    modalDesc: { fontSize: 13, color: t.textSecondary, marginBottom: 16, lineHeight: 18 },
    modalInput: { backgroundColor: t.elevated, borderRadius: 10, borderWidth: 1, borderColor: t.inputBorder, padding: 12, fontSize: 15, color: t.textPrimary, marginBottom: 20 },
    modalBotoes: { flexDirection: 'row', gap: 12 },
    modalCancelar: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, alignItems: 'center' },
    modalCancelarTexto: { color: t.textSecondary, fontWeight: '600' },
    modalConfirmar: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center' },
    modalConfirmarTexto: { color: '#fff', fontWeight: '700' },
  };
}

export default function PerfilPersonalScreen() {
  const { usuario, logout, atualizarUsuario } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [copiado, setCopiado] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [senhaConfirm, setSenhaConfirm] = useState('');

  const [modalAcesso, setModalAcesso] = useState(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [confirmarValor, setConfirmarValor] = useState('');
  const [erroAcesso, setErroAcesso] = useState('');
  const [salvandoAcesso, setSalvandoAcesso] = useState(false);

  const codigo = usuario?.uid || '';

  function handleExcluirConta() {
    setSenhaConfirm('');
    setModalVisivel(true);
  }

  async function confirmarExclusao() {
    if (!senhaConfirm) return;
    setExcluindo(true);
    setModalVisivel(false);
    try {
      await reautenticar(senhaConfirm);
      await excluirConta();
    } catch (e) {
      setExcluindo(false);
      Alert.alert('Erro', e.code === 'auth/wrong-password' ? 'Senha incorreta.' : 'Nao foi possivel excluir a conta. Tente novamente.');
    }
  }

  function abrirModalAcesso(tipo) {
    setSenhaAtual(''); setNovoValor(''); setConfirmarValor(''); setErroAcesso('');
    setModalAcesso(tipo);
  }

  async function salvarAcesso() {
    setErroAcesso('');
    if (!senhaAtual) { setErroAcesso('Informe sua senha atual.'); return; }
    if (!novoValor) { setErroAcesso(`Informe o novo ${modalAcesso === 'email' ? 'e-mail' : 'senha'}.`); return; }
    if (modalAcesso === 'senha' && novoValor !== confirmarValor) { setErroAcesso('As senhas nao coincidem.'); return; }
    if (modalAcesso === 'senha' && novoValor.length < 6) { setErroAcesso('A senha deve ter no minimo 6 caracteres.'); return; }
    setSalvandoAcesso(true);
    try {
      await reautenticar(senhaAtual);
      if (modalAcesso === 'email') {
        await alterarEmail(novoValor.trim());
        await updateDoc(doc(db, 'users', usuario.uid), { email: novoValor.trim() });
        await atualizarUsuario({ email: novoValor.trim() });
      } else {
        await alterarSenha(novoValor);
      }
      setModalAcesso(null);
      Alert.alert('Sucesso', `${modalAcesso === 'email' ? 'E-mail' : 'Senha'} atualizado com sucesso.`);
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setErroAcesso('Senha atual incorreta.');
      } else if (e.code === 'auth/email-already-in-use') {
        setErroAcesso('Este e-mail ja esta em uso.');
      } else if (e.code === 'auth/invalid-email') {
        setErroAcesso('E-mail invalido.');
      } else {
        setErroAcesso('Erro ao atualizar. Tente novamente.');
      }
    } finally {
      setSalvandoAcesso(false);
    }
  }

  async function handleAlterarFoto() {
    try {
      const uri = await escolherFoto();
      if (!uri) return;
      setUploadandoFoto(true);
      const url = await uploadFotoPerfil(usuario.uid, uri);
      await atualizarUsuario({ fotoUrl: url });
    } catch (e) {
      if (e.message !== 'permissao_negada') Alert.alert('Erro', 'Nao foi possivel atualizar a foto.');
    } finally {
      setUploadandoFoto(false);
    }
  }

  function handleCopiar() {
    Clipboard.setString(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.topRow}>
          <Text style={s.titulo}>Perfil</Text>
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={theme.red} />
          </TouchableOpacity>
        </View>

        <View style={s.avatarBox}>
          <TouchableOpacity onPress={handleAlterarFoto} activeOpacity={0.8} disabled={uploadandoFoto}>
            {usuario?.fotoUrl ? (
              <Image source={{ uri: usuario.fotoUrl }} style={[s.avatar, { marginBottom: 12 }]} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarLetra}>{usuario?.nome?.[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={s.avatarEdit}>
              {uploadandoFoto
                ? <ActivityIndicator size="small" color={theme.textPrimary} />
                : <Ionicons name="camera-outline" size={13} color={theme.textPrimary} />
              }
            </View>
          </TouchableOpacity>
          <Text style={s.nome}>{usuario?.nome}</Text>
          <Text style={s.email}>{usuario?.email}</Text>
          <View style={s.perfilBadge}>
            <Text style={s.perfilBadgeTexto}>Personal Trainer</Text>
          </View>
        </View>

        {/* Codigo de vinculo */}
        <View style={s.card}>
          <View style={s.codigoHeader}>
            <Ionicons name="qr-code-outline" size={18} color={theme.red} />
            <Text style={s.codigoTitulo}>Seu codigo de vinculo</Text>
          </View>
          <Text style={s.codigoDesc}>
            Compartilhe este codigo com seus alunos para que eles possam solicitar vinculo com voce.
          </Text>
          <View style={s.codigoBox}>
            <Text style={s.codigoTexto} selectable numberOfLines={1}>
              {codigo}
            </Text>
            <TouchableOpacity style={s.copiarBtn} onPress={handleCopiar}>
              <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={18} color={copiado ? '#16a34a' : theme.red} />
              <Text style={[s.copiarTexto, copiado && { color: '#16a34a' }]}>
                {copiado ? 'Copiado!' : 'Copiar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Aparencia */}
        <View style={s.card}>
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={theme.textSecondary} />
              <View>
                <Text style={s.toggleTexto}>{isDark ? 'Modo escuro' : 'Modo claro'}</Text>
                <Text style={s.toggleSub}>{isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.red + '80' }}
              thumbColor={isDark ? theme.red : theme.textSecondary}
            />
          </View>
        </View>

        {/* Acesso */}
        <View style={s.card}>
          <Text style={s.secaoTitulo}>Acesso</Text>
          <TouchableOpacity style={s.acessoRow} onPress={() => abrirModalAcesso('email')}>
            <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={s.acessoLabel}>E-mail</Text>
              <Text style={s.acessoValor}>{usuario?.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </TouchableOpacity>
          <View style={s.acessoDivisor} />
          <TouchableOpacity style={s.acessoRow} onPress={() => abrirModalAcesso('senha')}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={s.acessoLabel}>Senha</Text>
              <Text style={s.acessoValor}>••••••••</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Excluir conta */}
        <TouchableOpacity style={s.botaoExcluir} onPress={handleExcluirConta} disabled={excluindo}>
          {excluindo
            ? <ActivityIndicator size="small" color={theme.textTertiary} />
            : <Text style={s.botaoExcluirTexto}>Excluir conta</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Modal acesso email/senha */}
      <Modal visible={!!modalAcesso} transparent animationType="slide" onRequestClose={() => setModalAcesso(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setModalAcesso(null)}>
          <View style={s.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.modalTitulo}>
              {modalAcesso === 'email' ? 'Alterar e-mail' : 'Alterar senha'}
            </Text>

            <Text style={s.campoLabel}>Senha atual</Text>
            <TextInput
              style={[s.campoInput, { marginBottom: 16 }]}
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              placeholder="Digite sua senha atual"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
            />

            <Text style={s.campoLabel}>{modalAcesso === 'email' ? 'Novo e-mail' : 'Nova senha'}</Text>
            <TextInput
              style={[s.campoInput, { marginBottom: modalAcesso === 'senha' ? 12 : 0 }]}
              value={novoValor}
              onChangeText={setNovoValor}
              placeholder={modalAcesso === 'email' ? 'novo@email.com' : 'Minimo 6 caracteres'}
              placeholderTextColor={theme.placeholder}
              secureTextEntry={modalAcesso === 'senha'}
              keyboardType={modalAcesso === 'email' ? 'email-address' : 'default'}
              autoCapitalize="none"
            />

            {modalAcesso === 'senha' && (
              <>
                <Text style={s.campoLabel}>Confirmar nova senha</Text>
                <TextInput
                  style={s.campoInput}
                  value={confirmarValor}
                  onChangeText={setConfirmarValor}
                  placeholder="Repita a nova senha"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry
                />
              </>
            )}

            {!!erroAcesso && (
              <View style={s.msgErro}>
                <Ionicons name="alert-circle" size={15} color="#dc2626" />
                <Text style={s.msgErroTexto}>{erroAcesso}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.salvarBtn, { marginTop: 16 }]}
              onPress={salvarAcesso}
              disabled={salvandoAcesso}
            >
              {salvandoAcesso
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.salvarBtnTexto}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal excluir conta */}
      <Modal visible={modalVisivel} transparent animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <KeyboardAvoidingView style={s.excluirOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>Excluir conta</Text>
            <Text style={s.modalDesc}>Esta acao e irreversivel. Digite sua senha para confirmar.</Text>
            <TextInput
              style={s.modalInput}
              secureTextEntry
              placeholder="Senha"
              placeholderTextColor={theme.placeholder}
              value={senhaConfirm}
              onChangeText={setSenhaConfirm}
              autoFocus
            />
            <View style={s.modalBotoes}>
              <TouchableOpacity style={s.modalCancelar} onPress={() => setModalVisivel(false)}>
                <Text style={s.modalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirmar, !senhaConfirm && { opacity: 0.4 }]} onPress={confirmarExclusao} disabled={!senhaConfirm}>
                <Text style={s.modalConfirmarTexto}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
