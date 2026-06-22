import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, FlatList, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listarExercicios } from '../../services/exercicios';
import { registrarExercicioAvulso } from '../../services/execucoesAvulsas';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ExercicioAvulsoScreen({ navigation }) {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [banco, setBanco] = useState([]);
  const [busca, setBusca] = useState('');
  const [modalBanco, setModalBanco] = useState(false);

  // Dados do registro
  const [exercicioSelecionado, setExercicioSelecionado] = useState(null);
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [series, setSeries] = useState('');
  const [reps, setReps] = useState('');
  const [carga, setCarga] = useState('');
  const [observacao, setObservacao] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    listarExercicios(usuario.uid).then(setBanco).catch(() => {});
  }, []);

  const nomeFinal = exercicioSelecionado?.nome || nomeAvulso.trim();

  async function handleSalvar() {
    if (!nomeFinal) {
      Alert.alert('Atenção', 'Informe o nome ou selecione um exercício.');
      return;
    }
    setSalvando(true);
    try {
      await registrarExercicioAvulso({
        alunoId: usuario.uid,
        exercicioId: exercicioSelecionado?.id || null,
        nome: nomeFinal,
        grupoMuscular: exercicioSelecionado?.grupoMuscular || null,
        series: series ? parseInt(series) : null,
        reps: reps ? parseInt(reps) : null,
        carga: carga ? parseFloat(carga) : null,
        observacao: observacao.trim() || null,
      });
      setSucesso(true);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar o exercicio.');
    } finally {
      setSalvando(false);
    }
  }

  function selecionarExercicio(ex) {
    setExercicioSelecionado(ex);
    setNomeAvulso('');
    setModalBanco(false);
    setBusca('');
  }

  function limparSelecao() {
    setExercicioSelecionado(null);
  }

  const bancaFiltrado = busca
    ? banco.filter(e =>
        e.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        e.grupoMuscular?.toLowerCase().includes(busca.toLowerCase())
      )
    : banco;

  if (sucesso) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
        <Ionicons name="checkmark-circle" size={64} color={theme.red} />
        <Text style={s.sucessoTitulo}>Registrado!</Text>
        <Text style={s.sucessoSub}>
          "{nomeFinal}" foi salvo no seu histórico como exercício extra.
        </Text>
        <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.goBack()}>
          <Text style={s.btnPrimaryTexto}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
          <Ionicons name="arrow-back" size={22} color={theme.red} />
          <Text style={s.voltarTexto}>Voltar</Text>
        </TouchableOpacity>

        <Text style={s.titulo}>Exercicio Extra</Text>
        <Text style={s.subtitulo}>Registro fora da ficha prescrita</Text>

        {/* Seletor de exercício */}
        <Text style={s.label}>Exercicio</Text>
        {exercicioSelecionado ? (
          <View style={s.exSelecionado}>
            <View style={{ flex: 1 }}>
              <Text style={s.exSelecionadoNome}>{exercicioSelecionado.nome}</Text>
              {exercicioSelecionado.grupoMuscular ? (
                <Text style={s.exSelecionadoGrupo}>{exercicioSelecionado.grupoMuscular}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={limparSelecao} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.exInputGroup}>
            <TouchableOpacity style={s.btnBanco} onPress={() => setModalBanco(true)}>
              <Ionicons name="search-outline" size={16} color={theme.red} />
              <Text style={s.btnBancoTexto}>Buscar na biblioteca</Text>
            </TouchableOpacity>
            <Text style={s.ouLabel}>ou descreva livremente</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: Remada no cabo, unilateral"
              placeholderTextColor={theme.placeholder}
              value={nomeAvulso}
              onChangeText={setNomeAvulso}
            />
          </View>
        )}

        {/* Detalhes — todos opcionais */}
        <Text style={[s.label, { marginTop: 20 }]}>Detalhes (opcionais)</Text>
        <View style={s.detalhesRow}>
          <View style={s.detalheGroup}>
            <Text style={s.detalheLabel}>SERIES</Text>
            <TextInput
              style={s.detalheInput}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={theme.placeholder}
              value={series}
              onChangeText={v => setSeries(v.replace(/[^0-9]/g, ''))}
            />
          </View>
          <View style={s.detalheGroup}>
            <Text style={s.detalheLabel}>REPS</Text>
            <TextInput
              style={s.detalheInput}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={theme.placeholder}
              value={reps}
              onChangeText={v => setReps(v.replace(/[^0-9]/g, ''))}
            />
          </View>
          <View style={s.detalheGroup}>
            <Text style={s.detalheLabel}>CARGA (kg)</Text>
            <TextInput
              style={s.detalheInput}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={theme.placeholder}
              value={carga}
              onChangeText={setCarga}
            />
          </View>
        </View>

        <Text style={[s.label, { marginTop: 20 }]}>Observacao</Text>
        <TextInput
          style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Algum detalhe sobre a execucao..."
          placeholderTextColor={theme.placeholder}
          multiline
          value={observacao}
          onChangeText={setObservacao}
        />

        <TouchableOpacity
          style={[s.btnPrimary, { marginTop: 28, marginBottom: 48 }]}
          onPress={handleSalvar}
          disabled={salvando}
        >
          {salvando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnPrimaryTexto}>Salvar registro</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de busca na biblioteca */}
      <Modal visible={modalBanco} animationType="slide" transparent={false}>
        <View style={s.modalContainer}>
          <Text style={s.modalTitulo}>Biblioteca de exercicios</Text>
          <View style={s.buscaBox}>
            <Ionicons name="search-outline" size={16} color={theme.placeholder} />
            <TextInput
              style={s.buscaInput}
              placeholder="Pesquisar..."
              placeholderTextColor={theme.placeholder}
              value={busca}
              onChangeText={setBusca}
              autoCapitalize="none"
              autoFocus
            />
            {busca.length > 0 && (
              <TouchableOpacity onPress={() => setBusca('')}>
                <Ionicons name="close-circle" size={16} color={theme.placeholder} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={bancaFiltrado}
            keyExtractor={i => i.id}
            ListEmptyComponent={
              <View style={s.vazioWrap}>
                <Ionicons name="barbell-outline" size={36} color={theme.textTertiary} />
                <Text style={s.vazioTexto}>Nenhum exercicio encontrado.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={s.modalItem} onPress={() => selecionarExercicio(item)}>
                <Text style={s.modalItemNome}>{item.nome}</Text>
                {item.grupoMuscular ? (
                  <Text style={s.modalItemGrupo}>{item.grupoMuscular}</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={s.btnFechar}
            onPress={() => { setModalBanco(false); setBusca(''); }}
          >
            <Text style={s.btnFecharTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20 },
    voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 60, marginBottom: 20 },
    voltarTexto: { color: t.red, fontSize: 15 },
    titulo: { fontSize: 24, fontWeight: '800', color: t.textPrimary, marginBottom: 4 },
    subtitulo: { fontSize: 13, color: t.textSecondary, marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '700', color: t.textPrimary, marginBottom: 8 },
    input: {
      backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder,
      borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary,
    },
    exSelecionado: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.surface, borderRadius: 12, padding: 14,
      borderWidth: 1.5, borderColor: t.red + '40', gap: 10,
    },
    exSelecionadoNome: { fontWeight: '700', color: t.textPrimary, fontSize: 15 },
    exSelecionadoGrupo: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
    exInputGroup: { gap: 10 },
    btnBanco: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.surface, borderRadius: 10, padding: 14,
      borderWidth: 1.5, borderColor: t.red + '50',
    },
    btnBancoTexto: { color: t.red, fontWeight: '700', fontSize: 14 },
    ouLabel: { textAlign: 'center', color: t.textTertiary, fontSize: 12, fontWeight: '600' },
    detalhesRow: { flexDirection: 'row', gap: 10 },
    detalheGroup: { flex: 1 },
    detalheLabel: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.5, marginBottom: 6 },
    detalheInput: {
      backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder,
      borderRadius: 10, padding: 12, fontSize: 15, color: t.textPrimary, textAlign: 'center',
    },
    btnPrimary: {
      backgroundColor: t.red, borderRadius: 12, padding: 16, alignItems: 'center',
    },
    btnPrimaryTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
    // Sucesso
    sucessoTitulo: { fontSize: 26, fontWeight: '800', color: t.textPrimary, marginTop: 20, marginBottom: 8 },
    sucessoSub: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
    // Modal
    modalContainer: { flex: 1, backgroundColor: t.bg, padding: 20 },
    modalTitulo: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 16, marginTop: 20 },
    buscaBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
      borderRadius: 10, paddingHorizontal: 12, marginBottom: 12,
    },
    buscaInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: t.textPrimary },
    modalItem: { backgroundColor: t.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
    modalItemNome: { fontWeight: '600', color: t.textPrimary },
    modalItemGrupo: { color: t.textSecondary, fontSize: 13 },
    btnFechar: { backgroundColor: t.elevated, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 30 },
    btnFecharTexto: { fontWeight: '600', color: t.textPrimary },
    vazioWrap: { alignItems: 'center', paddingTop: 40, gap: 10 },
    vazioTexto: { color: t.textTertiary, fontSize: 14 },
  };
}
