import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { criarExercicio } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';

const GRUPOS = ['Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps', 'Abdômen', 'Glúteo', 'Quadríceps', 'Posterior', 'Panturrilha', 'Funcional'];
const EQUIPAMENTOS = ['Barra', 'Halteres', 'Máquina', 'Cabo / Polia', 'Peso corporal', 'Elástico', 'Kettlebell', 'Smith'];

export default function NovoExercicioScreen({ navigation }) {
  const { usuario } = useAuth();
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
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcone}>✅</Text>
            <Text style={styles.modalTitulo}>Exercício salvo!</Text>
            <TouchableOpacity style={styles.modalBotao} onPress={() => { setSucesso(false); navigation.goBack(); }}>
              <Text style={styles.modalBotaoTexto}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Ionicons name="arrow-back" size={22} color="#E31E24" />
          <Text style={styles.voltarTexto}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Novo Exercício</Text>

        {!!erro && <Text style={styles.erro}>{erro}</Text>}

        <Text style={styles.label}>Grupo muscular *</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setModalGrupo(true)}>
          <Text style={[styles.dropdownTexto, !grupo && { color: '#9ca3af' }]}>
            {grupo || 'Selecionar...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9ca3af" />
        </TouchableOpacity>

        <Text style={styles.label}>Nome do exercício *</Text>
        <TextInput style={styles.input} placeholder="Ex: Supino reto com barra" placeholderTextColor="#9ca3af"
          value={nome} onChangeText={setNome} />

        <Text style={styles.label}>Descrição / instrução</Text>
        <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
          placeholder="Dicas de execução..." placeholderTextColor="#9ca3af"
          multiline value={descricao} onChangeText={setDescricao} />

        <Text style={styles.label}>URL do vídeo (YouTube)</Text>
        <View style={styles.urlRow}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="https://youtube.com/..." placeholderTextColor="#9ca3af"
            value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" />
          <TouchableOpacity
            style={styles.urlPreview}
            onPress={() => videoUrl && require('react-native').Linking.openURL(videoUrl)}
            disabled={!videoUrl}
          >
            <Ionicons name="play-circle-outline" size={22} color={videoUrl ? '#E31E24' : '#d1d5db'} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 16 }} />

        <Text style={styles.label}>Aparelhos / equipamento</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setModalEquip(true)}>
          <Text style={[styles.dropdownTexto, !equipamento && { color: '#9ca3af' }]}>
            {equipamento || 'Selecionar...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.botao} onPress={handleSalvar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Salvar exercício</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalGrupo} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitulo}>Grupo muscular</Text>
            {GRUPOS.map(g => (
              <TouchableOpacity key={g} style={styles.pickerItem} onPress={() => { setGrupo(g); setModalGrupo(false); }}>
                <Text style={[styles.pickerTexto, grupo === g && { color: '#E31E24', fontWeight: '700' }]}>{g}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickerFechar} onPress={() => setModalGrupo(false)}>
              <Text style={styles.pickerFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalEquip} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitulo}>Equipamento</Text>
            {EQUIPAMENTOS.map(e => (
              <TouchableOpacity key={e} style={styles.pickerItem} onPress={() => { setEquipamento(e); setModalEquip(false); }}>
                <Text style={[styles.pickerTexto, equipamento === e && { color: '#E31E24', fontWeight: '700' }]}>{e}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickerFechar} onPress={() => setModalEquip(false)}>
              <Text style={styles.pickerFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 60, marginBottom: 16 },
  voltarTexto: { color: '#E31E24', fontSize: 15 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 24 },
  erro: { color: '#E31E24', fontSize: 14, marginBottom: 12 },
  label: { color: '#374151', fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 15, color: '#111827', marginBottom: 16 },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  urlPreview: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 13 },
  dropdownTexto: { fontSize: 15, color: '#111827' },
  botao: { backgroundColor: '#E31E24', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 40, marginTop: 8 },
  botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', width: '100%' },
  modalIcone: { fontSize: 48, marginBottom: 12 },
  modalTitulo: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 },
  modalBotao: { backgroundColor: '#E31E24', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
  modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerBox: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '60%' },
  pickerTitulo: { fontWeight: '700', fontSize: 16, color: '#111827', marginBottom: 12 },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerTexto: { fontSize: 15, color: '#374151' },
  pickerFechar: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10 },
  pickerFecharTexto: { fontWeight: '600', color: '#374151' },
});
