import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { criarFicha } from '../../services/fichas';
import { criarTreino } from '../../services/treinos';
import { listarExercicios } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function MontarTreinoScreen({ route, navigation }) {
  const { aluno } = route.params;
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [nomeFicha, setNomeFicha] = useState('');
  const [semanas, setSemanas] = useState('4');
  const [treinos, setTreinos] = useState([{ letra: 'A', diasDaSemana: [], exercicios: [] }]);
  const [exerciciosBanco, setExerciciosBanco] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [treinoSelecionado, setTreinoSelecionado] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    listarExercicios(usuario.uid).then(setExerciciosBanco);
  }, []);

  function toggleDia(ti, dia) {
    setTreinos(prev => {
      const novo = [...prev];
      const dias = novo[ti].diasDaSemana || [];
      novo[ti] = {
        ...novo[ti],
        diasDaSemana: dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia],
      };
      return novo;
    });
  }

  function adicionarTreino() {
    if (treinos.length >= LETRAS.length) return;
    setTreinos(prev => [...prev, { letra: LETRAS[prev.length], diasDaSemana: [], exercicios: [] }]);
  }

  function selecionarExercicio(exercicio) {
    setTreinos(prev => {
      const novo = [...prev];
      const existe = novo[treinoSelecionado].exercicios.find(e => e.id === exercicio.id);
      if (!existe) {
        novo[treinoSelecionado].exercicios.push({ ...exercicio, series: 3, reps: '12', descanso: '60s' });
      }
      return novo;
    });
    setModalAberto(false);
  }

  function atualizarExercicio(ti, ei, campo, valor) {
    setTreinos(prev => {
      const novo = [...prev];
      novo[ti].exercicios[ei][campo] = valor;
      return novo;
    });
  }

  function removerExercicio(ti, ei) {
    setTreinos(prev => {
      const novo = [...prev];
      novo[ti].exercicios = novo[ti].exercicios.filter((_, i) => i !== ei);
      return novo;
    });
  }

  async function salvar() {
    if (!nomeFicha) { Alert.alert('Atenção', 'Dê um nome à ficha.'); return; }
    setCarregando(true);
    try {
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + parseInt(semanas) * 7);
      const ficha = await criarFicha({
        nome: nomeFicha,
        alunoId: aluno.id,
        personalId: usuario.uid,
        semanas: parseInt(semanas),
        dataVencimento: Timestamp.fromDate(vencimento),
      });
      for (const treino of treinos) {
        await criarTreino({
          fichaId: ficha.id,
          letra: treino.letra,
          diasDaSemana: treino.diasDaSemana,
          exercicios: treino.exercicios,
        });
      }
      setSucesso(true);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a ficha.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Modal visible={sucesso} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalSucesso}>
            <Text style={s.modalIcone}>OK</Text>
            <Text style={s.modalTitulo}>Ficha criada!</Text>
            <Text style={s.modalTexto}>A ficha foi salva com sucesso para {aluno.nome}.</Text>
            <TouchableOpacity style={s.modalBotao} onPress={() => { setSucesso(false); navigation.goBack(); }}>
              <Text style={s.modalBotaoTexto}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Ionicons name="arrow-back" size={22} color={theme.red} />
            <Text style={s.voltarTexto}>Voltar</Text>
          </TouchableOpacity>
          <Text style={s.navTitulo}>Montar ficha</Text>
          <TouchableOpacity onPress={salvar} disabled={carregando}>
            {carregando ? <ActivityIndicator color={theme.red} size="small" /> : <Ionicons name="checkmark" size={26} color={theme.red} />}
          </TouchableOpacity>
        </View>

        <Text style={s.subtitulo}>Para: {aluno.nome}</Text>

        <Text style={s.label}>Nome da ficha</Text>
        <TextInput style={s.input} placeholder="Ex: Hipertrofia A/B/C" placeholderTextColor={theme.placeholder}
          value={nomeFicha} onChangeText={setNomeFicha} />

        <Text style={s.label}>Duração (semanas)</Text>
        <TextInput style={s.input} keyboardType="numeric" value={semanas} onChangeText={setSemanas} />

        {treinos.map((treino, ti) => (
          <View key={ti} style={s.treinoCard}>
            <Text style={s.treinoTitulo}>Treino {treino.letra}</Text>

            <Text style={s.labelSmall}>Dias da semana</Text>
            <View style={s.diasRow}>
              {DIAS.map(dia => (
                <TouchableOpacity
                  key={dia}
                  style={[s.diaChip, treino.diasDaSemana.includes(dia) && s.diaAtivo]}
                  onPress={() => toggleDia(ti, dia)}
                >
                  <Text style={[s.diaTexto, treino.diasDaSemana.includes(dia) && s.diaTextoAtivo]}>
                    {dia}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.labelSmall, { marginTop: 12 }]}>EXERCÍCIOS</Text>
            {treino.exercicios.map((ex, ei) => (
              <View key={ex.id} style={s.exRow}>
                <View style={s.exNumero}>
                  <Text style={s.exNumeroTexto}>{ei + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.exNome}>{ex.nome}</Text>
                  <View style={s.exInputs}>
                    <TextInput style={s.miniInput} placeholder="Séries" keyboardType="numeric"
                      value={String(ex.series)} onChangeText={v => atualizarExercicio(ti, ei, 'series', v)} />
                    <Text style={s.x}>×</Text>
                    <TextInput style={s.miniInput} placeholder="Reps"
                      value={ex.reps} onChangeText={v => atualizarExercicio(ti, ei, 'reps', v)} />
                    <Text style={s.x}>·</Text>
                    <TextInput style={[s.miniInput, { width: 52 }]} placeholder="60s"
                      value={ex.descanso} onChangeText={v => atualizarExercicio(ti, ei, 'descanso', v)} />
                  </View>
                </View>
                <TouchableOpacity onPress={() => removerExercicio(ti, ei)}>
                  <Ionicons name="close-circle" size={20} color={theme.border} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={s.botaoAdd} onPress={() => { setTreinoSelecionado(ti); setModalAberto(true); }}>
              <Ionicons name="add-circle-outline" size={18} color={theme.red} />
              <Text style={s.botaoAddTexto}>+ Adicionar exercício</Text>
            </TouchableOpacity>
          </View>
        ))}

        {treinos.length < LETRAS.length && (
          <TouchableOpacity style={s.botaoTreino} onPress={adicionarTreino}>
            <Text style={s.botaoTreinoTexto}>+ Adicionar treino {LETRAS[treinos.length]}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={modalAberto} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalEx}>
          <Text style={s.modalExTitulo}>Escolher exercício</Text>
          <FlatList
            data={exerciciosBanco}
            keyExtractor={i => i.id}
            ListEmptyComponent={<Text style={s.vazio}>Nenhum exercício cadastrado.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.modalExItem} onPress={() => selecionarExercicio(item)}>
                <Text style={s.modalExNome}>{item.nome}</Text>
                <Text style={s.modalExGrupo}>{item.grupoMuscular}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={s.botaoFechar} onPress={() => setModalAberto(false)}>
            <Text style={s.botaoFecharTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, marginBottom: 4 },
    voltar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    voltarTexto: { color: t.red, fontSize: 15 },
    navTitulo: { fontWeight: '700', fontSize: 17, color: t.textPrimary },
    subtitulo: { color: t.textSecondary, marginBottom: 20, fontSize: 14 },
    label: { color: t.textPrimary, fontWeight: '600', marginBottom: 6 },
    labelSmall: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 8 },
    input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary, marginBottom: 16 },
    treinoCard: { backgroundColor: t.surface, borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    treinoTitulo: { fontWeight: '700', fontSize: 16, color: t.textPrimary, marginBottom: 12 },
    diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    diaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.elevated },
    diaAtivo: { backgroundColor: t.red, borderColor: t.red },
    diaTexto: { fontSize: 12, color: t.textPrimary, fontWeight: '500' },
    diaTextoAtivo: { color: '#fff' },
    exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: t.border },
    exNumero: { width: 26, height: 26, borderRadius: 13, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center' },
    exNumeroTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
    exNome: { fontWeight: '600', color: t.textPrimary, marginBottom: 6 },
    exInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    miniInput: { backgroundColor: t.elevated, borderRadius: 8, padding: 6, width: 44, textAlign: 'center', fontSize: 13, color: t.textPrimary },
    x: { color: t.textTertiary, fontSize: 13 },
    botaoAdd: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
    botaoAddTexto: { color: t.red, fontWeight: '600' },
    botaoTreino: { borderWidth: 1.5, borderColor: t.red, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 14 },
    botaoTreinoTexto: { color: t.red, fontWeight: '600' },
    modalEx: { flex: 1, padding: 20, backgroundColor: t.bg },
    modalExTitulo: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 16, marginTop: 20 },
    modalExItem: { backgroundColor: t.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
    modalExNome: { fontWeight: '600', color: t.textPrimary },
    modalExGrupo: { color: t.textSecondary, fontSize: 13 },
    botaoFechar: { backgroundColor: t.elevated, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10, marginBottom: 30 },
    botaoFecharTexto: { fontWeight: '600', color: t.textPrimary },
    vazio: { textAlign: 'center', color: t.textTertiary, marginTop: 40 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalSucesso: { backgroundColor: t.surface, borderRadius: 16, padding: 32, alignItems: 'center', width: '100%' },
    modalIcone: { fontSize: 48, marginBottom: 12 },
    modalTitulo: { fontSize: 22, fontWeight: '700', color: t.textPrimary, marginBottom: 8 },
    modalTexto: { fontSize: 14, color: t.textSecondary, textAlign: 'center', marginBottom: 24 },
    modalBotao: { backgroundColor: t.red, borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
    modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  };
}
