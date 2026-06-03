import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { criarFicha } from '../../services/fichas';
import { criarTreino } from '../../services/treinos';
import { listarExercicios } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function MontarTreinoScreen({ route, navigation }) {
  const { aluno } = route.params;
  const { usuario } = useAuth();
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
        <View style={styles.overlay}>
          <View style={styles.modalSucesso}>
            <Text style={styles.modalIcone}>✅</Text>
            <Text style={styles.modalTitulo}>Ficha criada!</Text>
            <Text style={styles.modalTexto}>A ficha foi salva com sucesso para {aluno.nome}.</Text>
            <TouchableOpacity style={styles.modalBotao} onPress={() => { setSucesso(false); navigation.goBack(); }}>
              <Text style={styles.modalBotaoTexto}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
            <Ionicons name="arrow-back" size={22} color="#E31E24" />
            <Text style={styles.voltarTexto}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.navTitulo}>Montar ficha</Text>
          <TouchableOpacity onPress={salvar} disabled={carregando}>
            {carregando ? <ActivityIndicator color="#E31E24" size="small" /> : <Ionicons name="checkmark" size={26} color="#E31E24" />}
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitulo}>Para: {aluno.nome}</Text>

        <Text style={styles.label}>Nome da ficha</Text>
        <TextInput style={styles.input} placeholder="Ex: Hipertrofia A/B/C" placeholderTextColor="#9ca3af"
          value={nomeFicha} onChangeText={setNomeFicha} />

        <Text style={styles.label}>Duração (semanas)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={semanas} onChangeText={setSemanas} />

        {treinos.map((treino, ti) => (
          <View key={ti} style={styles.treinoCard}>
            <Text style={styles.treinoTitulo}>Treino {treino.letra}</Text>

            <Text style={styles.labelSmall}>Dias da semana</Text>
            <View style={styles.diasRow}>
              {DIAS.map(dia => (
                <TouchableOpacity
                  key={dia}
                  style={[styles.diaChip, treino.diasDaSemana.includes(dia) && styles.diaAtivo]}
                  onPress={() => toggleDia(ti, dia)}
                >
                  <Text style={[styles.diaTexto, treino.diasDaSemana.includes(dia) && styles.diaTextoAtivo]}>
                    {dia}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.labelSmall, { marginTop: 12 }]}>EXERCÍCIOS</Text>
            {treino.exercicios.map((ex, ei) => (
              <View key={ex.id} style={styles.exRow}>
                <View style={styles.exNumero}>
                  <Text style={styles.exNumeroTexto}>{ei + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exNome}>{ex.nome}</Text>
                  <View style={styles.exInputs}>
                    <TextInput style={styles.miniInput} placeholder="Séries" keyboardType="numeric"
                      value={String(ex.series)} onChangeText={v => atualizarExercicio(ti, ei, 'series', v)} />
                    <Text style={styles.x}>×</Text>
                    <TextInput style={styles.miniInput} placeholder="Reps"
                      value={ex.reps} onChangeText={v => atualizarExercicio(ti, ei, 'reps', v)} />
                    <Text style={styles.x}>·</Text>
                    <TextInput style={[styles.miniInput, { width: 52 }]} placeholder="60s"
                      value={ex.descanso} onChangeText={v => atualizarExercicio(ti, ei, 'descanso', v)} />
                  </View>
                </View>
                <TouchableOpacity onPress={() => removerExercicio(ti, ei)}>
                  <Ionicons name="close-circle" size={20} color="#e5e7eb" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.botaoAdd} onPress={() => { setTreinoSelecionado(ti); setModalAberto(true); }}>
              <Ionicons name="add-circle-outline" size={18} color="#E31E24" />
              <Text style={styles.botaoAddTexto}>+ Adicionar exercício</Text>
            </TouchableOpacity>
          </View>
        ))}

        {treinos.length < LETRAS.length && (
          <TouchableOpacity style={styles.botaoTreino} onPress={adicionarTreino}>
            <Text style={styles.botaoTreinoTexto}>+ Adicionar treino {LETRAS[treinos.length]}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={modalAberto} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalEx}>
          <Text style={styles.modalExTitulo}>Escolher exercício</Text>
          <FlatList
            data={exerciciosBanco}
            keyExtractor={i => i.id}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhum exercício cadastrado.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalExItem} onPress={() => selecionarExercicio(item)}>
                <Text style={styles.modalExNome}>{item.nome}</Text>
                <Text style={styles.modalExGrupo}>{item.grupoMuscular}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.botaoFechar} onPress={() => setModalAberto(false)}>
            <Text style={styles.botaoFecharTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, marginBottom: 4 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voltarTexto: { color: '#E31E24', fontSize: 15 },
  navTitulo: { fontWeight: '700', fontSize: 17, color: '#111827' },
  subtitulo: { color: '#6b7280', marginBottom: 20, fontSize: 14 },
  label: { color: '#374151', fontWeight: '600', marginBottom: 6 },
  labelSmall: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 15, color: '#111827', marginBottom: 16 },
  treinoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  treinoTitulo: { fontWeight: '700', fontSize: 16, color: '#111827', marginBottom: 12 },
  diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  diaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  diaAtivo: { backgroundColor: '#E31E24', borderColor: '#E31E24' },
  diaTexto: { fontSize: 12, color: '#374151', fontWeight: '500' },
  diaTextoAtivo: { color: '#fff' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  exNumero: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E31E24', justifyContent: 'center', alignItems: 'center' },
  exNumeroTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  exNome: { fontWeight: '600', color: '#111827', marginBottom: 6 },
  exInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniInput: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 6, width: 44, textAlign: 'center', fontSize: 13 },
  x: { color: '#9ca3af', fontSize: 13 },
  botaoAdd: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  botaoAddTexto: { color: '#E31E24', fontWeight: '600' },
  botaoTreino: { borderWidth: 1.5, borderColor: '#E31E24', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 14 },
  botaoTreinoTexto: { color: '#E31E24', fontWeight: '600' },
  modalEx: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  modalExTitulo: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16, marginTop: 20 },
  modalExItem: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  modalExNome: { fontWeight: '600', color: '#111827' },
  modalExGrupo: { color: '#6b7280', fontSize: 13 },
  botaoFechar: { backgroundColor: '#e5e7eb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  botaoFecharTexto: { fontWeight: '600', color: '#374151' },
  vazio: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalSucesso: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', width: '100%' },
  modalIcone: { fontSize: 48, marginBottom: 12 },
  modalTitulo: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalTexto: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  modalBotao: { backgroundColor: '#E31E24', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
  modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
