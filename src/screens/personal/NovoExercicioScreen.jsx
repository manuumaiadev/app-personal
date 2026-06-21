import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { criarExercicio } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const GRUPOS = ['Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps', 'Abdômen', 'Glúteo', 'Quadríceps', 'Posterior', 'Panturrilha', 'Funcional'];
const EQUIPAMENTOS = ['Barra', 'Halteres', 'Máquina', 'Cabo / Polia', 'Peso corporal', 'Elástico', 'Kettlebell', 'Smith'];

export default function NovoExercicioScreen({ navigation }) {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [equipamento, setEquipamento] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalEquip, setModalEquip] = useState(false);

  async function handleSalvar() {
    setErro('');
    if (!nome || !grupo) { setErro('Preencha nome e grupo muscular.'); return; }
    setCarregando(true);
    try {
      await criarExercicio(usuario.uid, { nome, grupoMuscular: grupo, descricao, videoUrl, equipamento });
      setSucesso(true);
    } catch (e) {
      setErro('Não foi possível salvar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Modal visible={sucesso} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>Exercício salvo!</Text>
            <TouchableOpacity style={s.modalBotao} onPress={() => { setSucesso(false); navigation.goBack(); }}>
              <Text style={s.modalBotaoTexto}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
          <Ionicons name="arrow-back" size={22} color={theme.red} />
          <Text style={s.voltarTexto}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Novo Exercício</Text>

        {!!erro && <Text style={s.erro}>{erro}</Text>}

        <Text style={s.label}>Grupo muscular *</Text>
        <TouchableOpacity style={s.dropdown} onPress={() => setModalGrupo(true)}>
          <Text style={[s.dropdownTexto, !grupo && { color: theme.placeholder }]}>
            {grupo || 'Selecionar...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.placeholder} />
        </TouchableOpacity>

        <Text style={s.label}>Nome do exercício *</Text>
        <TextInput style={s.input} placeholder="Ex: Supino reto com barra" placeholderTextColor={theme.placeholder}
          value={nome} onChangeText={setNome} />

        <Text style={s.label}>Descrição / instrução</Text>
        <TextInput style={[s.input, { height: 90, textAlignVertical: 'top' }]}
          placeholder="Dicas de execução..." placeholderTextColor={theme.placeholder}
          multiline value={descricao} onChangeText={setDescricao} />

        <Text style={s.label}>URL do vídeo (YouTube)</Text>
        <View style={s.urlRow}>
          <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="https://youtube.com/..." placeholderTextColor={theme.placeholder}
            value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" />
          <TouchableOpacity
            style={s.urlPreview}
            onPress={() => videoUrl && require('react-native').Linking.openURL(videoUrl)}
            disabled={!videoUrl}
          >
            <Ionicons name="play-circle-outline" size={22} color={videoUrl ? theme.red : theme.textTertiary} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 16 }} />

        <Text style={s.label}>Aparelhos / equipamento</Text>
        <TouchableOpacity style={s.dropdown} onPress={() => setModalEquip(true)}>
          <Text style={[s.dropdownTexto, !equipamento && { color: theme.placeholder }]}>
            {equipamento || 'Selecionar...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.placeholder} />
        </TouchableOpacity>

        <TouchableOpacity style={s.botao} onPress={handleSalvar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>Salvar exercício</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalGrupo} transparent animationType="slide">
        <View style={s.pickerOverlay}>
          <View style={s.pickerBox}>
            <Text style={s.pickerTitulo}>Grupo muscular</Text>
            {GRUPOS.map(g => (
              <TouchableOpacity key={g} style={s.pickerItem} onPress={() => { setGrupo(g); setModalGrupo(false); }}>
                <Text style={[s.pickerTexto, grupo === g && { color: theme.red, fontWeight: '700' }]}>{g}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.pickerFechar} onPress={() => setModalGrupo(false)}>
              <Text style={s.pickerFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalEquip} transparent animationType="slide">
        <View style={s.pickerOverlay}>
          <View style={s.pickerBox}>
            <Text style={s.pickerTitulo}>Equipamento</Text>
            {EQUIPAMENTOS.map(e => (
              <TouchableOpacity key={e} style={s.pickerItem} onPress={() => { setEquipamento(e); setModalEquip(false); }}>
                <Text style={[s.pickerTexto, equipamento === e && { color: theme.red, fontWeight: '700' }]}>{e}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.pickerFechar} onPress={() => setModalEquip(false)}>
              <Text style={s.pickerFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20 },
    voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 60, marginBottom: 16 },
    voltarTexto: { color: t.red, fontSize: 15 },
    titulo: { fontSize: 24, fontWeight: '700', color: t.textPrimary, marginBottom: 24 },
    erro: { color: t.red, fontSize: 14, marginBottom: 12 },
    label: { color: t.textPrimary, fontWeight: '600', marginBottom: 6 },
    input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary, marginBottom: 16 },
    dropdown: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    urlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
    urlPreview: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 13 },
    dropdownTexto: { fontSize: 15, color: t.textPrimary },
    botao: { backgroundColor: t.red, borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 40, marginTop: 8 },
    botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 32, alignItems: 'center', width: '100%' },
    modalTitulo: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 20 },
    modalBotao: { backgroundColor: t.red, borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
    modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    pickerBox: { backgroundColor: t.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '60%' },
    pickerTitulo: { fontWeight: '700', fontSize: 16, color: t.textPrimary, marginBottom: 12 },
    pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border },
    pickerTexto: { fontSize: 15, color: t.textPrimary },
    pickerFechar: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: t.elevated, borderRadius: 10 },
    pickerFecharTexto: { fontWeight: '600', color: t.textPrimary },
  };
}
