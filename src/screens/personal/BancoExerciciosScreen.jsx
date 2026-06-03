import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { listarExercicios, deletarExercicio } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';

const TODOS = 'Todos os grupos';

export default function BancoExerciciosScreen({ navigation }) {
  const { usuario } = useAuth();
  const [exercicios, setExercicios] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState(TODOS);
  const [carregando, setCarregando] = useState(true);
  const [modalGrupo, setModalGrupo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        try {
          const data = await listarExercicios(usuario.uid);
          setExercicios(data);
        } catch (e) {
          console.error('Erro ao carregar exercícios:', e);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, [])
  );

  const grupos = [TODOS, ...Array.from(new Set(exercicios.map(e => e.grupoMuscular).filter(Boolean))).sort()];

  const filtrados = exercicios.filter(e => {
    const matchTexto = !filtro || e.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
      e.grupoMuscular?.toLowerCase().includes(filtro.toLowerCase());
    const matchGrupo = grupoFiltro === TODOS || e.grupoMuscular === grupoFiltro;
    return matchTexto && matchGrupo;
  });

  async function handleDeletar(id) {
    Alert.alert('Confirmar', 'Deletar esse exercício?', [
      { text: 'Cancelar' },
      { text: 'Deletar', style: 'destructive', onPress: async () => {
        await deletarExercicio(id);
        setExercicios(prev => prev.filter(e => e.id !== id));
      }},
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.titulo}>Exercícios</Text>
        <TouchableOpacity style={styles.botaoNovo} onPress={() => navigation.navigate('NovoExercicio')}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.botaoNovoTexto}>Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buscaContainer}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.buscaInput}
          placeholder="Pesquisar exercício..."
          placeholderTextColor="#9ca3af"
          value={filtro}
          onChangeText={setFiltro}
        />
      </View>

      <TouchableOpacity style={styles.filtroDropdown} onPress={() => setModalGrupo(true)}>
        <Text style={[styles.filtroTexto, grupoFiltro === TODOS && { color: '#9ca3af' }]}>
          {grupoFiltro === TODOS ? 'Filtrar grupo muscular' : grupoFiltro}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9ca3af" />
      </TouchableOpacity>

      <View style={styles.listaHeader}>
        <Text style={styles.listaHeaderNome}>Nome</Text>
        <Text style={styles.listaHeaderTotal}>Total: {filtrados.length}</Text>
      </View>

      {carregando ? (
        <ActivityIndicator color="#E31E24" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum exercício encontrado.</Text>}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('DetalheExercicio', { exercicio: item })}
            >
              <Text style={styles.numero}>{index + 1}</Text>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.grupo}>{item.grupoMuscular}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={modalGrupo} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitulo}>Filtrar grupo muscular</Text>
            <FlatList
              data={grupos}
              keyExtractor={g => g}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => { setGrupoFiltro(item); setModalGrupo(false); }}
                >
                  <Text style={[styles.pickerTexto, grupoFiltro === item && { color: '#E31E24', fontWeight: '700' }]}>
                    {item}
                  </Text>
                  {grupoFiltro === item && <Ionicons name="checkmark" size={16} color="#E31E24" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.pickerFechar} onPress={() => setModalGrupo(false)}>
              <Text style={styles.pickerFecharTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827' },
  botaoNovo: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E31E24', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  botaoNovoTexto: { color: '#fff', fontWeight: '600', fontSize: 14 },
  buscaContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
  buscaInput: { flex: 1, padding: 12, fontSize: 15, color: '#111827' },
  filtroDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14 },
  filtroTexto: { fontSize: 14, color: '#374151', fontWeight: '500' },
  listaHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 },
  listaHeaderNome: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  listaHeaderTotal: { fontSize: 12, color: '#9ca3af' },
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  numero: { width: 28, fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  nome: { flex: 1, fontWeight: '600', color: '#111827', fontSize: 15 },
  grupo: { fontSize: 13, color: '#6b7280' },
  vazio: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerBox: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '65%' },
  pickerTitulo: { fontWeight: '700', fontSize: 16, color: '#111827', marginBottom: 12 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerTexto: { fontSize: 15, color: '#374151' },
  pickerFechar: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10 },
  pickerFecharTexto: { fontWeight: '600', color: '#374151' },
});
