import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { atualizarTreino } from '../../services/treinos';
import { listarExercicios } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { TIPOS_PERIOD } from '../../utils/periodizacao';

export { TIPOS_PERIOD };

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const CARGA_NIVEIS = [
  { nivel: 1, label: 'Muito Leve', range: [0,  45] },
  { nivel: 2, label: 'Leve',       range: [46, 59] },
  { nivel: 3, label: 'Moderada',   range: [60, 72] },
  { nivel: 4, label: 'Alta',       range: [73, 84] },
  { nivel: 5, label: 'Máxima',     range: [85, 100]},
];

function cargaParaNivel(carga) {
  const n = CARGA_NIVEIS.find(n => carga >= n.range[0] && carga <= n.range[1]);
  return n?.nivel || 0;
}

function nivelParaCarga(nivel) {
  const map = { 1: 40, 2: 55, 3: 65, 4: 78, 5: 88 };
  return map[nivel] || 60;
}

function tipoById(id) {
  return TIPOS_PERIOD.find(t => t.id === id) || null;
}

// normaliza item de periodização (suporta string legada ou objeto novo)
function normalizarItem(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const t = tipoById(item);
    return t ? { tipo: t.id, series: t.series, reps: t.reps, carga: t.carga } : null;
  }
  return item;
}

// ── Barra de carga visual ────────────────────────────────────────────────────
function BarraCarga({ carga, cor }) {
  const nivel = cargaParaNivel(carga);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View
          key={i}
          style={{
            width: 8, height: i <= nivel ? 10 + i * 2 : 6,
            borderRadius: 3,
            backgroundColor: i <= nivel ? (cor || '#E31E24') : '#e5e7eb',
          }}
        />
      ))}
      <Text style={{ fontSize: 10, color: cor || '#9ca3af', fontWeight: '700', marginLeft: 2 }}>
        {carga}%
      </Text>
    </View>
  );
}

export default function EditarTreinoScreen({ route, navigation }) {
  const { treino, aluno, semanas = 4 } = route.params;
  const { usuario } = useAuth();

  const [diasDaSemana, setDiasDaSemana] = useState(treino.diasDaSemana || []);
  const [exercicios, setExercicios] = useState((treino.exercicios || []).map(e => ({ ...e })));
  const [periodizacao, setPeriodizacao] = useState(() =>
    Array.from({ length: semanas }, (_, i) => normalizarItem((treino.periodizacao || [])[i]))
  );

  const [banco, setBanco] = useState([]);
  const [modalExAberto, setModalExAberto] = useState(false);
  const [semanaSelecionada, setSemanaSelecionada] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // estado do editor de semana no bottom sheet
  const [editTipo, setEditTipo] = useState(null);
  const [editSeries, setEditSeries] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editCarga, setEditCarga] = useState(60);

  useEffect(() => { listarExercicios(usuario.uid).then(setBanco); }, []);

  function abrirSemana(idx) {
    const item = periodizacao[idx];
    setEditTipo(item?.tipo || null);
    setEditSeries(item?.series || '');
    setEditReps(item?.reps || '');
    setEditCarga(item?.carga ?? 60);
    setSemanaSelecionada(idx);
  }

  function selecionarTipo(tipoId) {
    const t = tipoById(tipoId);
    setEditTipo(tipoId);
    // preenche defaults se ainda estiver vazio
    if (!editSeries) setEditSeries(t.series);
    if (!editReps) setEditReps(t.reps);
    if (editCarga === 60 && t.carga !== 60) setEditCarga(t.carga);
  }

  function confirmarSemana() {
    if (!editTipo) return;
    const novo = [...periodizacao];
    novo[semanaSelecionada] = { tipo: editTipo, series: editSeries, reps: editReps, carga: editCarga };
    setPeriodizacao(novo);

    // atualiza exercises com os valores da semana atual (a ativa é a de menor índice sem tipo definido ou a primeira)
    setExercicios(prev =>
      prev.map(ex => ({
        ...ex,
        series: parseInt(editSeries) || ex.series,
        reps: editReps || ex.reps,
      }))
    );

    setSemanaSelecionada(null);
  }

  function limparSemana() {
    const novo = [...periodizacao];
    novo[semanaSelecionada] = null;
    setPeriodizacao(novo);
    setSemanaSelecionada(null);
  }

  function toggleDia(dia) {
    setDiasDaSemana(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
  }

  function atualizarEx(i, campo, valor) {
    setExercicios(prev => { const n = [...prev]; n[i] = { ...n[i], [campo]: valor }; return n; });
  }

  function removerEx(i) {
    setExercicios(prev => prev.filter((_, j) => j !== i));
  }

  function adicionarExercicio(ex) {
    if (!exercicios.find(e => e.id === ex.id)) {
      setExercicios(prev => [...prev, { ...ex, series: 3, reps: '12', descanso: '60s' }]);
    }
    setModalExAberto(false);
  }

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarTreino(treino.id, { diasDaSemana, exercicios, periodizacao });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  const tipoAtual = tipoById(editTipo);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        {/* NavBar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
            <Ionicons name="arrow-back" size={22} color="#E31E24" />
            <Text style={styles.voltarTexto}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.navTitulo}>Treino {treino.letra}</Text>
          <TouchableOpacity onPress={salvar} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#E31E24" size="small" />
              : <Ionicons name="checkmark" size={26} color="#E31E24" />}
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitulo}>{aluno.nome}</Text>

        {/* Dias */}
        <Text style={styles.secTitulo}>DIAS DA SEMANA</Text>
        <View style={styles.diasRow}>
          {DIAS.map(dia => (
            <TouchableOpacity key={dia}
              style={[styles.diaChip, diasDaSemana.includes(dia) && styles.diaAtivo]}
              onPress={() => toggleDia(dia)}>
              <Text style={[styles.diaTexto, diasDaSemana.includes(dia) && styles.diaTextoAtivo]}>{dia}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercícios */}
        <Text style={[styles.secTitulo, { marginTop: 24 }]}>EXERCÍCIOS</Text>
        {exercicios.map((ex, i) => (
          <View key={ex.id ?? i} style={styles.exCard}>
            <View style={styles.exNum}><Text style={styles.exNumTexto}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exNome}>{ex.nome}</Text>
              <View style={styles.exInputs}>
                <TextInput style={styles.miniInput} placeholder="Séries" keyboardType="numeric"
                  value={String(ex.series)} onChangeText={v => atualizarEx(i, 'series', v)} />
                <Text style={styles.x}>×</Text>
                <TextInput style={styles.miniInput} placeholder="Reps"
                  value={ex.reps} onChangeText={v => atualizarEx(i, 'reps', v)} />
                <Text style={styles.x}>·</Text>
                <TextInput style={[styles.miniInput, { width: 52 }]} placeholder="60s"
                  value={ex.descanso} onChangeText={v => atualizarEx(i, 'descanso', v)} />
              </View>
            </View>
            <TouchableOpacity onPress={() => removerEx(i)}>
              <Ionicons name="close-circle" size={20} color="#e5e7eb" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.botaoAddEx} onPress={() => setModalExAberto(true)}>
          <Ionicons name="add-circle-outline" size={18} color="#E31E24" />
          <Text style={styles.botaoAddExTexto}>+ Adicionar exercício</Text>
        </TouchableOpacity>

        {/* Periodização */}
        <View style={{ marginTop: 28 }}>
          <Text style={styles.secTitulo}>PERIODIZAÇÃO — MICROCICLOS</Text>
          <Text style={styles.periodDesc}>
            Configure séries, repetições e carga para cada semana do mesociclo.
          </Text>

          <View style={styles.semanasGrid}>
            {periodizacao.map((item, idx) => {
              const tipo = tipoById(item?.tipo);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.semanaCard,
                    tipo
                      ? { borderColor: tipo.cor, borderWidth: 2, backgroundColor: tipo.cor + '0d' }
                      : styles.semanaVazia,
                  ]}
                  onPress={() => abrirSemana(idx)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.semanaNum, tipo && { color: tipo.cor }]}>S{idx + 1}</Text>
                  {tipo ? (
                    <>
                      <Ionicons name={tipo.icon} size={18} color={tipo.cor} style={{ marginTop: 2 }} />
                      <Text style={[styles.semanaLabel, { color: tipo.cor }]} numberOfLines={1}>
                        {tipo.label}
                      </Text>
                      <Text style={styles.semanaReps}>
                        {item.series}×{item.reps}
                      </Text>
                      <BarraCarga carga={item.carga} cor={tipo.cor} />
                    </>
                  ) : (
                    <Ionicons name="add-outline" size={22} color="#d1d5db" style={{ marginTop: 6 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal banco de exercícios */}
      <Modal visible={modalExAberto} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalEx}>
          <Text style={styles.modalExTitulo}>Escolher exercício</Text>
          <FlatList
            data={banco}
            keyExtractor={i => i.id}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhum exercício cadastrado.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalExItem} onPress={() => adicionarExercicio(item)}>
                <Text style={styles.modalExNome}>{item.nome}</Text>
                <Text style={styles.modalExGrupo}>{item.grupoMuscular}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.botaoFechar} onPress={() => setModalExAberto(false)}>
            <Text style={styles.botaoFecharTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Bottom sheet — editor de semana */}
      <Modal
        visible={semanaSelecionada !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSemanaSelecionada(null)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSemanaSelecionada(null)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitulo}>
              Treino {treino.letra} · Semana {semanaSelecionada !== null ? semanaSelecionada + 1 : ''}
            </Text>

            {/* Tipo */}
            <Text style={styles.sheetSec}>TIPO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TIPOS_PERIOD.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tipoChip, editTipo === t.id && { backgroundColor: t.cor, borderColor: t.cor }]}
                    onPress={() => selecionarTipo(t.id)}
                  >
                    <Ionicons name={t.icon} size={13} color={editTipo === t.id ? '#fff' : t.cor} />
                    <Text style={[styles.tipoChipTexto, { color: editTipo === t.id ? '#fff' : t.cor }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Séries e Repetições */}
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.sheetSec}>SÉRIES</Text>
                <TextInput
                  style={styles.sheetInput}
                  keyboardType="numeric"
                  value={editSeries}
                  onChangeText={setEditSeries}
                  placeholder="Ex: 4"
                  placeholderTextColor="#d1d5db"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.sheetSec}>REPETIÇÕES</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={editReps}
                  onChangeText={setEditReps}
                  placeholder="Ex: 8-12"
                  placeholderTextColor="#d1d5db"
                />
              </View>
            </View>

            {/* Nível de carga */}
            <Text style={styles.sheetSec}>NÍVEL DE CARGA</Text>
            <View style={styles.cargaRow}>
              {CARGA_NIVEIS.map(n => {
                const ativo = cargaParaNivel(editCarga) === n.nivel;
                const cor = tipoAtual?.cor || '#E31E24';
                return (
                  <TouchableOpacity
                    key={n.nivel}
                    style={[styles.cargaBtn, ativo && { backgroundColor: cor, borderColor: cor }]}
                    onPress={() => setEditCarga(nivelParaCarga(n.nivel))}
                  >
                    <Text style={[styles.cargaBtnTexto, ativo && { color: '#fff' }]}>{n.label}</Text>
                    <Text style={[styles.cargaBtnPct, ativo && { color: '#fff' }]}>
                      {nivelParaCarga(n.nivel)}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Carga personalizada */}
            <View style={styles.cargaCustomRow}>
              <Text style={styles.cargaCustomLabel}>Carga personalizada:</Text>
              <TextInput
                style={styles.cargaCustomInput}
                keyboardType="numeric"
                value={String(editCarga)}
                onChangeText={v => setEditCarga(parseInt(v) || 0)}
                maxLength={3}
              />
              <Text style={styles.cargaCustomLabel}>%</Text>
            </View>

            {/* Botões */}
            <TouchableOpacity
              style={[styles.btnConfirmar, !editTipo && { opacity: 0.4 }]}
              onPress={confirmarSemana}
              disabled={!editTipo}
            >
              <Text style={styles.btnConfirmarTexto}>Confirmar</Text>
            </TouchableOpacity>

            {periodizacao[semanaSelecionada] && (
              <TouchableOpacity style={styles.btnLimpar} onPress={limparSemana}>
                <Text style={styles.btnLimparTexto}>Remover semana</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
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
  subtitulo: { color: '#6b7280', fontSize: 14, marginBottom: 20 },
  secTitulo: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 10 },
  periodDesc: { color: '#6b7280', fontSize: 13, marginBottom: 14, marginTop: -6 },

  diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  diaAtivo: { backgroundColor: '#E31E24', borderColor: '#E31E24' },
  diaTexto: { fontSize: 13, color: '#374151', fontWeight: '500' },
  diaTextoAtivo: { color: '#fff' },

  exCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  exNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E31E24', justifyContent: 'center', alignItems: 'center' },
  exNumTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  exNome: { fontWeight: '600', color: '#111827', marginBottom: 6 },
  exInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniInput: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 6, width: 44, textAlign: 'center', fontSize: 13 },
  x: { color: '#9ca3af', fontSize: 13 },
  botaoAddEx: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderWidth: 1.5, borderColor: '#E31E24', borderRadius: 10, marginTop: 4 },
  botaoAddExTexto: { color: '#E31E24', fontWeight: '600' },

  // grade de semanas — 2 colunas
  semanasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  semanaCard: { width: '47%', minHeight: 110, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 10, gap: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  semanaVazia: { borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  semanaNum: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  semanaLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  semanaReps: { fontSize: 11, color: '#374151', fontWeight: '500' },

  // banco de exercícios
  modalEx: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  modalExTitulo: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16, marginTop: 20 },
  modalExItem: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  modalExNome: { fontWeight: '600', color: '#111827' },
  modalExGrupo: { color: '#6b7280', fontSize: 13 },
  botaoFechar: { backgroundColor: '#e5e7eb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  botaoFecharTexto: { fontWeight: '600', color: '#374151' },
  vazio: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },

  // bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  sheetTitulo: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  sheetSec: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 8 },

  tipoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  tipoChipTexto: { fontSize: 12, fontWeight: '600' },

  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup: { flex: 1 },
  sheetInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },

  cargaRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  cargaBtn: { flex: 1, minWidth: '18%', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' },
  cargaBtnTexto: { fontSize: 10, fontWeight: '700', color: '#6b7280' },
  cargaBtnPct: { fontSize: 11, fontWeight: '700', color: '#9ca3af', marginTop: 2 },

  cargaCustomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  cargaCustomLabel: { fontSize: 13, color: '#6b7280' },
  cargaCustomInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, width: 60, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#111827' },

  btnConfirmar: { backgroundColor: '#E31E24', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  btnConfirmarTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnLimpar: { paddingVertical: 10, alignItems: 'center' },
  btnLimparTexto: { color: '#9ca3af', fontWeight: '600', fontSize: 13 },
});
