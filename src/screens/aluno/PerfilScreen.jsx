import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal, Switch,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { criarSolicitacao, verificarSolicitacaoExistente } from '../../services/solicitacoes';
import { reautenticar, alterarEmail, alterarSenha, excluirConta } from '../../services/auth';
import { escolherFoto, uploadFotoPerfil } from '../../services/fotoService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const CORES_AVATAR = ['#E31E24', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#059669'];

function makeStyles(t) {
  return {
    scroll: { flex: 1, backgroundColor: t.bg },
    container: { paddingTop: 80, paddingHorizontal: 16, paddingBottom: 50 },
    avatarSection: { alignItems: 'center', marginBottom: 24 },
    avatar: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarLetra: { color: '#fff', fontWeight: '800', fontSize: 34 },
    avatarEdit: { position: 'absolute', bottom: 8, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: t.elevated, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: t.bg },
    nome: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 2 },
    email: { fontSize: 13, color: t.textSecondary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: t.border },
    modalTitulo: { fontSize: 16, fontWeight: '700', color: t.textPrimary, marginBottom: 16 },
    coresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    corBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    corBtnAtivo: { borderWidth: 3, borderColor: t.textPrimary },
    secao: { backgroundColor: t.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: t.border },
    secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    secaoTitulo: { fontSize: 15, fontWeight: '700', color: t.textPrimary },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.red + '18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    editBtnTexto: { fontSize: 13, fontWeight: '600', color: t.red },
    acoesBtns: { flexDirection: 'row', gap: 8 },
    cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: t.border },
    cancelBtnTexto: { fontSize: 13, color: t.textSecondary, fontWeight: '500' },
    salvarBtn: { backgroundColor: t.red, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    salvarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
    linha: { flexDirection: 'row', gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: t.border },
    infoLabel: { fontSize: 13, color: t.textSecondary, width: 80 },
    infoValor: { fontSize: 13, color: t.textPrimary, fontWeight: '500', flex: 1 },
    anamneseGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, marginBottom: 8 },
    statItem: { alignItems: 'center' },
    statValor: { fontSize: 20, fontWeight: '800', color: t.red },
    statLabel: { fontSize: 11, color: t.textSecondary, marginTop: 2 },
    semDados: { fontSize: 13, color: t.textSecondary, textAlign: 'center', paddingVertical: 8 },
    vinculoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: t.border, marginTop: 4 },
    vinculoIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#22c55e18', justifyContent: 'center', alignItems: 'center' },
    vinculoNome: { fontSize: 14, fontWeight: '600', color: t.textPrimary },
    vinculoSubtitulo: { fontSize: 12, color: '#22c55e', fontWeight: '500', marginTop: 1 },
    vinculoDesc: { fontSize: 13, color: t.textSecondary, marginBottom: 12, marginTop: 8 },
    vinculoInput: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 12, fontSize: 14, color: t.textPrimary, marginBottom: 10 },
    cancelarVinculoBtn: { paddingTop: 4, paddingBottom: 2, alignSelf: 'flex-end' },
    cancelarVinculoTexto: { fontSize: 12, color: t.textTertiary, textDecorationLine: 'underline' },
    msg: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10, marginBottom: 10 },
    msgTexto: { fontSize: 13, fontWeight: '500', flex: 1 },
    modalSheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: t.border },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 20 },
    acessoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    acessoLabel: { fontSize: 11, color: t.textSecondary, fontWeight: '600' },
    acessoValor: { fontSize: 14, color: t.textPrimary, fontWeight: '500', marginTop: 1 },
    acessoDivisor: { height: 1, backgroundColor: t.border },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: '100%', marginBottom: 4 },
    logoutBtn: { padding: 6 },
    botaoExcluir: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
    botaoExcluirTexto: { color: t.textTertiary, fontSize: 13, textDecorationLine: 'underline' },
    modalOverlay2: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox2: { backgroundColor: t.surface, borderRadius: 16, padding: 24, width: '100%' },
    modalTitulo2: { fontSize: 17, fontWeight: '700', color: t.textPrimary, marginBottom: 6 },
    modalDesc2: { fontSize: 13, color: t.textSecondary, marginBottom: 16, lineHeight: 18 },
    modalInput2: { backgroundColor: t.elevated, borderRadius: 10, borderWidth: 1, borderColor: t.inputBorder, padding: 12, fontSize: 15, color: t.textPrimary, marginBottom: 20 },
    modalBotoes2: { flexDirection: 'row', gap: 12 },
    modalCancelar2: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, alignItems: 'center' },
    modalCancelarTexto2: { color: t.textSecondary, fontWeight: '600' },
    modalConfirmar2: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center' },
    modalConfirmarTexto2: { color: '#fff', fontWeight: '700' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleTexto: { fontSize: 15, fontWeight: '600', color: t.textPrimary },
    toggleSub: { fontSize: 12, color: t.textSecondary, marginTop: 1 },
    campoWrap: { marginBottom: 12 },
    campoLabel: { fontSize: 11, fontWeight: '700', color: t.textSecondary, marginBottom: 5, letterSpacing: 0.3 },
    campoInput: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 11, fontSize: 14, color: t.textPrimary },
  };
}

function Campo({ label, value, onChangeText, placeholder, keyboardType, multiline, s }) {
  return (
    <View style={s.campoWrap}>
      <Text style={s.campoLabel}>{label}</Text>
      <TextInput
        style={[s.campoInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor="#636366"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
      />
    </View>
  );
}

export default function PerfilScreen({ navigation }) {
  const { usuario, logout, atualizarUsuario } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const anamnese = usuario?.anamnese || {};

  const [nome, setNome] = useState(usuario?.nome || '');
  const [telefone, setTelefone] = useState(usuario?.telefone || '');
  const [endereco, setEndereco] = useState(usuario?.endereco || '');
  const [cidade, setCidade] = useState(usuario?.cidade || '');
  const [corAvatar, setCorAvatar] = useState(usuario?.corAvatar || CORES_AVATAR[0]);

  const [idade, setIdade] = useState(anamnese.idade || '');
  const [peso, setPeso] = useState(anamnese.peso || '');
  const [altura, setAltura] = useState(anamnese.altura || '');
  const [profissao, setProfissao] = useState(anamnese.profissao || '');
  const [objetivo, setObjetivo] = useState(anamnese.objetivo || '');
  const [enfaseCorporal, setEnfaseCorporal] = useState(anamnese.enfaseCorporal || '');
  const [restricoes, setRestricoes] = useState(anamnese.restricoes || '');
  const [medicamentos, setMedicamentos] = useState(anamnese.medicamentos || '');

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [editandoAnamnese, setEditandoAnamnese] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalCor, setModalCor] = useState(false);

  const [modalAcesso, setModalAcesso] = useState(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [confirmarValor, setConfirmarValor] = useState('');
  const [erroAcesso, setErroAcesso] = useState('');
  const [salvandoAcesso, setSalvandoAcesso] = useState(false);

  const [codigoPersonal, setCodigoPersonal] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msgVinculo, setMsgVinculo] = useState(null);

  const [excluindo, setExcluindo] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState('');

  const [modalCancelarVinculo, setModalCancelarVinculo] = useState(false);
  const [cancelandoVinculo, setCancelandoVinculo] = useState(false);

  const [nomePersonal, setNomePersonal] = useState('');
  const [uploadandoFoto, setUploadandoFoto] = useState(false);

  useEffect(() => {
    if (!usuario?.personalId) { setNomePersonal(''); return; }
    getDoc(doc(db, 'users', usuario.personalId))
      .then(snap => {
        const d = snap.data() || {};
        const nome = [d.nome, d.sobrenome].filter(Boolean).join(' ');
        setNomePersonal(nome);
      })
      .catch(() => {});
  }, [usuario?.personalId]);

  async function salvarPerfil() {
    if (!nome.trim()) { Alert.alert('Atencao', 'O nome nao pode ficar vazio.'); return; }
    setSalvando(true);
    try {
      await atualizarUsuario({ nome: nome.trim(), telefone, endereco, cidade, corAvatar });
      setEditandoPerfil(false);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAnamnese() {
    setSalvando(true);
    try {
      await atualizarUsuario({
        anamnese: { idade, peso, altura, profissao, objetivo, enfaseCorporal, restricoes, medicamentos },
      });
      setEditandoAnamnese(false);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar. Tente novamente.');
    } finally {
      setSalvando(false);
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

  async function handleSolicitarVinculo() {
    if (!codigoPersonal.trim()) return;
    setEnviando(true);
    setMsgVinculo(null);
    try {
      const snap = await getDoc(doc(db, 'users', codigoPersonal.trim()));
      if (!snap.exists() || snap.data().perfil !== 'personal') {
        setMsgVinculo({ tipo: 'erro', texto: 'Codigo invalido. Verifique com seu personal.' });
        return;
      }
      const jaExiste = await verificarSolicitacaoExistente(usuario.uid, codigoPersonal.trim());
      if (jaExiste) {
        setMsgVinculo({ tipo: 'erro', texto: 'Voce ja enviou uma solicitacao para este personal.' });
        return;
      }
      await criarSolicitacao(usuario.uid, usuario.nome, usuario.email, codigoPersonal.trim());
      setCodigoPersonal('');
      setMsgVinculo({ tipo: 'sucesso', texto: 'Solicitacao enviada! Aguarde a aprovacao.' });
    } catch {
      setMsgVinculo({ tipo: 'erro', texto: 'Erro ao enviar. Tente novamente.' });
    } finally {
      setEnviando(false);
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

  async function handleCancelarVinculo() {
    setCancelandoVinculo(true);
    try {
      await updateDoc(doc(db, 'users', usuario.uid), { personalId: null });
      await atualizarUsuario({ personalId: null });
      setNomePersonal('');
      setModalCancelarVinculo(false);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel cancelar o vinculo. Tente novamente.');
    } finally {
      setCancelandoVinculo(false);
    }
  }

  function handleExcluirConta() {
    setSenhaExcluir('');
    setModalExcluir(true);
  }

  async function confirmarExclusao() {
    if (!senhaExcluir) return;
    setExcluindo(true);
    setModalExcluir(false);
    try {
      await reautenticar(senhaExcluir);
      await excluirConta();
    } catch (e) {
      setExcluindo(false);
      Alert.alert('Erro', e.code === 'auth/wrong-password' ? 'Senha incorreta.' : 'Nao foi possivel excluir a conta. Tente novamente.');
    }
  }

  const avatarCor = usuario?.corAvatar || CORES_AVATAR[0];

  return (
    <View style={s.scroll}>
    <ScrollView contentContainerStyle={s.container}>

      {/* Logout topo */}
      <View style={s.topRow}>
        <TouchableOpacity onPress={logout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={theme.red} />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={s.avatarSection}>
        <TouchableOpacity onPress={handleAlterarFoto} activeOpacity={0.8} disabled={uploadandoFoto}>
          {usuario?.fotoUrl ? (
            <Image source={{ uri: usuario.fotoUrl }} style={[s.avatar, { backgroundColor: avatarCor }]} />
          ) : (
            <View style={[s.avatar, { backgroundColor: avatarCor }]}>
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
      </View>

      {/* Modal cor */}
      <Modal visible={modalCor} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} onPress={() => setModalCor(false)} activeOpacity={1}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>Cor do avatar</Text>
            <View style={s.coresGrid}>
              {CORES_AVATAR.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.corBtn, { backgroundColor: c }, corAvatar === c && s.corBtnAtivo]}
                  onPress={() => { setCorAvatar(c); setModalCor(false); }}
                >
                  {corAvatar === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Dados pessoais */}
      <View style={s.secao}>
        <View style={s.secaoHeader}>
          <Text style={s.secaoTitulo}>Dados pessoais</Text>
          {!editandoPerfil ? (
            <TouchableOpacity onPress={() => setEditandoPerfil(true)} style={s.editBtn}>
              <Ionicons name="pencil-outline" size={15} color={theme.red} />
              <Text style={s.editBtnTexto}>Editar</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.acoesBtns}>
              <TouchableOpacity onPress={() => setEditandoPerfil(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={salvarPerfil} style={s.salvarBtn} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.salvarBtnTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {editandoPerfil ? (
          <>
            <Campo label="Nome completo" value={nome} onChangeText={setNome} s={s} />
            <Campo label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" s={s} />
            <Campo label="Endereco" value={endereco} onChangeText={setEndereco} s={s} />
            <Campo label="Cidade" value={cidade} onChangeText={setCidade} s={s} />
          </>
        ) : (
          <>
            <InfoRow icon="person-outline" label="Nome" valor={usuario?.nome} s={s} />
            <InfoRow icon="call-outline" label="Telefone" valor={usuario?.telefone} s={s} />
            <InfoRow icon="location-outline" label="Endereco" valor={usuario?.endereco} s={s} />
            <InfoRow icon="business-outline" label="Cidade" valor={usuario?.cidade} s={s} />
          </>
        )}
      </View>

      {/* Anamnese */}
      <View style={s.secao}>
        <View style={s.secaoHeader}>
          <Text style={s.secaoTitulo}>Anamnese</Text>
          {!editandoAnamnese ? (
            <TouchableOpacity onPress={() => setEditandoAnamnese(true)} style={s.editBtn}>
              <Ionicons name="pencil-outline" size={15} color={theme.red} />
              <Text style={s.editBtnTexto}>{anamnese.idade ? 'Editar' : 'Preencher'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.acoesBtns}>
              <TouchableOpacity onPress={() => setEditandoAnamnese(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={salvarAnamnese} style={s.salvarBtn} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.salvarBtnTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {editandoAnamnese ? (
          <>
            <View style={s.linha}>
              <View style={{ flex: 1 }}><Campo label="Idade" value={idade} onChangeText={setIdade} keyboardType="numeric" s={s} /></View>
              <View style={{ flex: 1 }}><Campo label="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" s={s} /></View>
              <View style={{ flex: 1 }}><Campo label="Altura (m)" value={altura} onChangeText={setAltura} keyboardType="decimal-pad" s={s} /></View>
            </View>
            <Campo label="Profissao" value={profissao} onChangeText={setProfissao} s={s} />
            <Campo label="Objetivo principal" value={objetivo} onChangeText={setObjetivo} s={s} />
            <Campo label="Enfase corporal" value={enfaseCorporal} onChangeText={setEnfaseCorporal} placeholder="Ex: Dorsal, gluteos" s={s} />
            <Campo label="Lesoes / restricoes" value={restricoes} onChangeText={setRestricoes} multiline s={s} />
            <Campo label="Medicamentos" value={medicamentos} onChangeText={setMedicamentos} s={s} />
          </>
        ) : anamnese.idade ? (
          <>
            <View style={s.anamneseGrid}>
              <StatItem label="Idade" valor={`${anamnese.idade} anos`} s={s} />
              <StatItem label="Peso" valor={`${anamnese.peso} kg`} s={s} />
              <StatItem label="Altura" valor={`${anamnese.altura} m`} s={s} />
            </View>
            {anamnese.objetivo && <InfoRow icon="flag-outline" label="Objetivo" valor={anamnese.objetivo} s={s} />}
            {anamnese.profissao && <InfoRow icon="briefcase-outline" label="Profissao" valor={anamnese.profissao} s={s} />}
            {anamnese.enfaseCorporal && <InfoRow icon="body-outline" label="Enfase" valor={anamnese.enfaseCorporal} s={s} />}
            {anamnese.restricoes && <InfoRow icon="warning-outline" label="Restricoes" valor={anamnese.restricoes} s={s} />}
            {anamnese.medicamentos && <InfoRow icon="medical-outline" label="Medicamentos" valor={anamnese.medicamentos} s={s} />}
          </>
        ) : (
          <Text style={s.semDados}>Nenhuma informacao preenchida ainda.</Text>
        )}
      </View>

      {/* Aparencia */}
      <View style={s.secao}>
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

      {/* Modal email/senha */}
      <Modal visible={!!modalAcesso} transparent animationType="slide">
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

            <Text style={s.campoLabel}>
              {modalAcesso === 'email' ? 'Novo e-mail' : 'Nova senha'}
            </Text>
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
              <View style={[s.msg, { backgroundColor: '#fee2e2', marginTop: 12 }]}>
                <Ionicons name="alert-circle" size={15} color="#dc2626" />
                <Text style={[s.msgTexto, { color: '#dc2626' }]}>{erroAcesso}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.salvarBtn, { borderRadius: 12, padding: 14, marginTop: 16 }]}
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

      {/* Acesso */}
      <View style={s.secao}>
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

      {/* Vinculo */}
      <View style={s.secao}>
        <Text style={s.secaoTitulo}>Personal trainer</Text>
        {usuario?.personalId ? (
          <>
            <View style={s.vinculoRow}>
              <View style={s.vinculoIconBox}>
                <Ionicons name="person-outline" size={18} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.vinculoNome}>{nomePersonal || 'Personal vinculado'}</Text>
                <Text style={s.vinculoSubtitulo}>Vinculado</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </View>
            <TouchableOpacity
              style={s.cancelarVinculoBtn}
              onPress={() => setModalCancelarVinculo(true)}
            >
              <Text style={s.cancelarVinculoTexto}>Cancelar vinculo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.vinculoDesc}>Informe o codigo do seu personal trainer.</Text>
            <TextInput
              style={s.vinculoInput}
              placeholder="Cole o codigo aqui..."
              placeholderTextColor={theme.placeholder}
              value={codigoPersonal}
              onChangeText={setCodigoPersonal}
              autoCapitalize="none"
            />
            {msgVinculo && (
              <View style={[s.msg, { backgroundColor: msgVinculo.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2' }]}>
                <Ionicons name={msgVinculo.tipo === 'sucesso' ? 'checkmark-circle' : 'alert-circle'} size={15}
                  color={msgVinculo.tipo === 'sucesso' ? '#16a34a' : '#dc2626'} />
                <Text style={[s.msgTexto, { color: msgVinculo.tipo === 'sucesso' ? '#16a34a' : '#dc2626' }]}>
                  {msgVinculo.texto}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[s.salvarBtn, { borderRadius: 10, padding: 13 }, !codigoPersonal.trim() && { opacity: 0.4 }]}
              onPress={handleSolicitarVinculo}
              disabled={enviando || !codigoPersonal.trim()}
            >
              {enviando ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.salvarBtnTexto}>Solicitar vinculo</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Excluir conta */}
      <TouchableOpacity style={s.botaoExcluir} onPress={handleExcluirConta} disabled={excluindo}>
        {excluindo
          ? <ActivityIndicator size="small" color={theme.textTertiary} />
          : <Text style={s.botaoExcluirTexto}>Excluir conta</Text>
        }
      </TouchableOpacity>
    </ScrollView>

    {/* Modal cancelar vinculo */}
    <Modal visible={modalCancelarVinculo} transparent animationType="fade" onRequestClose={() => setModalCancelarVinculo(false)}>
      <View style={s.modalOverlay2}>
        <View style={s.modalBox2}>
          <Text style={s.modalTitulo2}>Cancelar vinculo</Text>
          <Text style={s.modalDesc2}>
            Tem certeza que deseja cancelar o vinculo com {nomePersonal || 'seu personal'}? Voce podera solicitar um novo vinculo depois.
          </Text>
          <View style={s.modalBotoes2}>
            <TouchableOpacity style={s.modalCancelar2} onPress={() => setModalCancelarVinculo(false)}>
              <Text style={s.modalCancelarTexto2}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalConfirmar2, cancelandoVinculo && { opacity: 0.6 }]}
              onPress={handleCancelarVinculo}
              disabled={cancelandoVinculo}
            >
              {cancelandoVinculo
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.modalConfirmarTexto2}>Cancelar vinculo</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal excluir conta */}
    <Modal visible={modalExcluir} transparent animationType="fade" onRequestClose={() => setModalExcluir(false)}>
      <KeyboardAvoidingView style={s.modalOverlay2} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalBox2}>
          <Text style={s.modalTitulo2}>Excluir conta</Text>
          <Text style={s.modalDesc2}>Esta acao e irreversivel. Digite sua senha para confirmar.</Text>
          <TextInput
            style={s.modalInput2}
            secureTextEntry
            placeholder="Senha"
            placeholderTextColor={theme.placeholder}
            value={senhaExcluir}
            onChangeText={setSenhaExcluir}
            autoFocus
          />
          <View style={s.modalBotoes2}>
            <TouchableOpacity style={s.modalCancelar2} onPress={() => setModalExcluir(false)}>
              <Text style={s.modalCancelarTexto2}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modalConfirmar2, !senhaExcluir && { opacity: 0.4 }]} onPress={confirmarExclusao} disabled={!senhaExcluir}>
              <Text style={s.modalConfirmarTexto2}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </View>
  );
}

function InfoRow({ icon, label, valor, s }) {
  if (!valor) return null;
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={16} color="#9ca3af" style={{ width: 20 }} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValor} numberOfLines={2}>{valor}</Text>
    </View>
  );
}

function StatItem({ label, valor, s }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValor}>{valor}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
