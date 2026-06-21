import { useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { listarExercicios, deletarExercicio } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const TODOS = 'Todos os grupos';

export default function BancoExerciciosScreen({ navigation }) {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
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
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.titulo}>Exercícios</Text>
        <TouchableOpacity style={s.botaoNovo} onPress={() => navigation.navigate('NovoExercicio')}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.botaoNovoTexto}>Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.buscaContainer}>
        <Ionicons name="search-outline" size={16} color={theme.placeholder} style={{ marginRight: 8 }} />
        <TextInput
          style={s.buscaInput}
          placeholder="Pesquisar exercício..."
          placeholderTextColor={theme.placeholder}
          value={filtro}
          onChangeText={setFiltro}
        />
      </View>

      <TouchableOpacity style={s.filtroDropdown} onPress={() => setModalGrupo(true)}>
        <Text style={[s.filtroTexto, grupoFiltro === TODOS && { color: theme.placeholder }]}>
          {grupoFiltro === TODOS ? 'Filtrar grupo muscular' : grupoFiltro}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.placeholder} />
      </TouchableOpacity>

      <View style={s.listaHeader}>
        <Text style={s.listaHeaderNome}>Nome</Text>
        <Text style={s.listaHeaderTotal}>Total: {filtrados.length}</Text>
      </View>

      {carregando ? (
        <ActivityIndicator color="#E31E24" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={s.vazio}>Nenhum exercício encontrado.</Text>}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('DetalheExercicio', { exercicio: item })}
            >
              <Text style={s.numero}>{index + 1}</Text>
              <Text style={s.nome}>{item.nome}</Text>
              <Text style={s.grupo}>{item.grupoMuscular}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={modalGrupo} transparent animationType="slide">
        <View style={s.pickerOverlay}>
          <View style={s.pickerBox}>
            <Text style={s.pickerTitulo}>Filtrar grupo muscular</Text>
            <FlatList
              data={grupos}
              keyExtractor={g => g}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.pickerItem}
                  onPress={() => { setGrupoFiltro(item); setModalGrupo(false); }}
                >
                  <Text style={[s.pickerTexto, grupoFiltro === item && { color: theme.red, fontWeight: '700' }]}>
                    {item}
                  </Text>
                  {grupoFiltro === item && <Ionicons name="checkmark" size={16} color={theme.red} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={s.pickerFechar} onPress={() => setModalGrupo(false)}>
              <Text style={s.pickerFecharTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20, paddingTop: 60 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    titulo: { fontSize: 24, fontWeight: '700', color: t.textPrimary },
    botaoNovo: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    botaoNovoTexto: { color: '#fff', fontWeight: '600', fontSize: 14 },
    buscaContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
    buscaInput: { flex: 1, padding: 12, fontSize: 15, color: t.textPrimary },
    filtroDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, marginBottom: 14 },
    filtroTexto: { fontSize: 14, color: t.textPrimary, fontWeight: '500' },
    listaHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 },
    listaHeaderNome: { fontSize: 12, fontWeight: '600', color: t.textSecondary },
    listaHeaderTotal: { fontSize: 12, color: t.textTertiary },
    card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: t.border },
    numero: { width: 28, fontSize: 13, color: t.textTertiary, fontWeight: '500' },
    nome: { flex: 1, fontWeight: '600', color: t.textPrimary, fontSize: 15 },
    grupo: { fontSize: 13, color: t.textSecondary },
    vazio: { textAlign: 'center', color: t.textTertiary, marginTop: 40 },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    pickerBox: { backgroundColor: t.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '65%' },
    pickerTitulo: { fontWeight: '700', fontSize: 16, color: t.textPrimary, marginBottom: 12 },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: t.border },
    pickerTexto: { fontSize: 15, color: t.textPrimary },
    pickerFechar: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: t.elevated, borderRadius: 10 },
    pickerFecharTexto: { fontWeight: '600', color: t.textPrimary },
  };
}
