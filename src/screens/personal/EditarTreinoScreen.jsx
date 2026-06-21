import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { atualizarTreino } from '../../services/treinos';
import { listarExercicios } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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

// Barra de carga visual
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
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

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
    if (!editSeries) setEditSeries(t.series);
    if (!editReps) setEditReps(t.reps);
    if (editCarga === 60 && t.carga !== 60) setEditCarga(t.carga);
  }

  function confirmarSemana() {
    if (!editTipo) return;
    const novo = [...periodizacao];
    novo[semanaSelecionada] = { tipo: editTipo, series: editSeries, reps: editReps, carga: editCarga };
    setPeriodizacao(novo);

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
      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">

        {/* NavBar */}
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Ionicons name="arrow-back" size={22} color={theme.red} />
            <Text style={s.voltarTexto}>Voltar</Text>
          </TouchableOpacity>
          <Text style={s.navTitulo}>Treino {treino.letra}</Text>
          <TouchableOpacity onPress={salvar} disabled={salvando}>
            {salvando ? <ActivityIndicator color={theme.red} size="small" />
              : <Ionicons name="checkmark" size={26} color={theme.red} />}
          </TouchableOpacity>
        </View>
        <Text style={s.subtitulo}>{aluno.nome}</Text>

        {/* Dias */}
        <Text style={s.secTitulo}>DIAS DA SEMANA</Text>
        <View style={s.diasRow}>
          {DIAS.map(dia => (
            <TouchableOpacity key={dia}
              style={[s.diaChip, diasDaSemana.includes(dia) && s.diaAtivo]}
              onPress={() => toggleDia(dia)}>
              <Text style={[s.diaTexto, diasDaSemana.includes(dia) && s.diaTextoAtivo]}>{dia}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercícios */}
        <Text style={[s.secTitulo, { marginTop: 24 }]}>EXERCÍCIOS</Text>
        {exercicios.map((ex, i) => (
          <View key={ex.id ?? i} style={s.exCard}>
            <View style={s.exNum}><Text style={s.exNumTexto}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.exNome}>{ex.nome}</Text>
              <View style={s.exInputs}>
                <TextInput style={s.miniInput} placeholder="Séries" keyboardType="numeric"
                  value={String(ex.series)} onChangeText={v => atualizarEx(i, 'series', v)} />
                <Text style={s.x}>×</Text>
                <TextInput style={s.miniInput} placeholder="Reps"
                  value={ex.reps} onChangeText={v => atualizarEx(i, 'reps', v)} />
                <Text style={s.x}>·</Text>
                <TextInput style={[s.miniInput, { width: 52 }]} placeholder="60s"
                  value={ex.descanso} onChangeText={v => atualizarEx(i, 'descanso', v)} />
              </View>
            </View>
            <TouchableOpacity onPress={() => removerEx(i)}>
              <Ionicons name="close-circle" size={20} color={theme.border} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={s.botaoAddEx} onPress={() => setModalExAberto(true)}>
          <Ionicons name="add-circle-outline" size={18} color={theme.red} />
          <Text style={s.botaoAddExTexto}>+ Adicionar exercício</Text>
        </TouchableOpacity>

        {/* Periodização */}
        <View style={{ marginTop: 28 }}>
          <Text style={s.secTitulo}>PERIODIZAÇÃO — MICROCICLOS</Text>
          <Text style={s.periodDesc}>
            Configure séries, repetições e carga para cada semana do mesociclo.
          </Text>

          <View style={s.semanasGrid}>
            {periodizacao.map((item, idx) => {
              const tipo = tipoById(item?.tipo);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    s.semanaCard,
                    tipo
                      ? { borderColor: tipo.cor, borderWidth: 2, backgroundColor: tipo.cor + '0d' }
                      : s.semanaVazia,
                  ]}
                  onPress={() => abrirSemana(idx)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.semanaNum, tipo && { color: tipo.cor }]}>S{idx + 1}</Text>
                  {tipo ? (
                    <>
                      <Ionicons name={tipo.icon} size={18} color={tipo.cor} style={{ marginTop: 2 }} />
                      <Text style={[s.semanaLabel, { color: tipo.cor }]} numberOfLines={1}>
                        {tipo.label}
                      </Text>
                      <Text style={s.semanaReps}>
                        {item.series}×{item.reps}
                      </Text>
                      <BarraCarga carga={item.carga} cor={tipo.cor} />
                    </>
                  ) : (
                    <Ionicons name="add-outline" size={22} color={theme.textTertiary} style={{ marginTop: 6 }} />
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
        <View style={s.modalEx}>
          <Text style={s.modalExTitulo}>Escolher exercício</Text>
          <FlatList
            data={banco}
            keyExtractor={i => i.id}
            ListEmptyComponent={<Text style={s.vazio}>Nenhum exercício cadastrado.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.modalExItem} onPress={() => adicionarExercicio(item)}>
                <Text style={s.modalExNome}>{item.nome}</Text>
                <Text style={s.modalExGrupo}>{item.grupoMuscular}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={s.botaoFechar} onPress={() => setModalExAberto(false)}>
            <Text style={s.botaoFecharTexto}>Fechar</Text>
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
        <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={() => setSemanaSelecionada(null)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitulo}>
              Treino {treino.letra} · Semana {semanaSelecionada !== null ? semanaSelecionada + 1 : ''}
            </Text>

            {/* Tipo */}
            <Text style={s.sheetSec}>TIPO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TIPOS_PERIOD.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.tipoChip, editTipo === t.id && { backgroundColor: t.cor, borderColor: t.cor }]}
                    onPress={() => selecionarTipo(t.id)}
                  >
                    <Ionicons name={t.icon} size={13} color={editTipo === t.id ? '#fff' : t.cor} />
                    <Text style={[s.tipoChipTexto, { color: editTipo === t.id ? '#fff' : t.cor }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Séries e Repetições */}
            <View style={s.inputRow}>
              <View style={s.inputGroup}>
                <Text style={s.sheetSec}>SÉRIES</Text>
                <TextInput
                  style={s.sheetInput}
                  keyboardType="numeric"
                  value={editSeries}
                  onChangeText={setEditSeries}
                  placeholder="Ex: 4"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.sheetSec}>REPETIÇÕES</Text>
                <TextInput
                  style={s.sheetInput}
                  value={editReps}
                  onChangeText={setEditReps}
                  placeholder="Ex: 8-12"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
            </View>

            {/* Nível de carga */}
            <Text style={s.sheetSec}>NÍVEL DE CARGA</Text>
            <View style={s.cargaRow}>
              {CARGA_NIVEIS.map(n => {
                const ativo = cargaParaNivel(editCarga) === n.nivel;
                const cor = tipoAtual?.cor || theme.red;
                return (
                  <TouchableOpacity
                    key={n.nivel}
                    style={[s.cargaBtn, ativo && { backgroundColor: cor, borderColor: cor }]}
                    onPress={() => setEditCarga(nivelParaCarga(n.nivel))}
                  >
                    <Text style={[s.cargaBtnTexto, ativo && { color: '#fff' }]}>{n.label}</Text>
                    <Text style={[s.cargaBtnPct, ativo && { color: '#fff' }]}>
                      {nivelParaCarga(n.nivel)}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Carga personalizada */}
            <View style={s.cargaCustomRow}>
              <Text style={s.cargaCustomLabel}>Carga personalizada:</Text>
              <TextInput
                style={s.cargaCustomInput}
                keyboardType="numeric"
                value={String(editCarga)}
                onChangeText={v => setEditCarga(parseInt(v) || 0)}
                maxLength={3}
              />
              <Text style={s.cargaCustomLabel}>%</Text>
            </View>

            {/* Botões */}
            <TouchableOpacity
              style={[s.btnConfirmar, !editTipo && { opacity: 0.4 }]}
              onPress={confirmarSemana}
              disabled={!editTipo}
            >
              <Text style={s.btnConfirmarTexto}>Confirmar</Text>
            </TouchableOpacity>

            {periodizacao[semanaSelecionada] && (
              <TouchableOpacity style={s.btnLimpar} onPress={limparSemana}>
                <Text style={s.btnLimparTexto}>Remover semana</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
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
    subtitulo: { color: t.textSecondary, fontSize: 14, marginBottom: 20 },
    secTitulo: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
    periodDesc: { color: t.textSecondary, fontSize: 13, marginBottom: 14, marginTop: -6 },

    diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    diaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
    diaAtivo: { backgroundColor: t.red, borderColor: t.red },
    diaTexto: { fontSize: 13, color: t.textPrimary, fontWeight: '500' },
    diaTextoAtivo: { color: '#fff' },

    exCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: t.surface, borderRadius: 10, padding: 12 },
    exNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center' },
    exNumTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
    exNome: { fontWeight: '600', color: t.textPrimary, marginBottom: 6 },
    exInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    miniInput: { backgroundColor: t.elevated, borderRadius: 8, padding: 6, width: 44, textAlign: 'center', fontSize: 13, color: t.textPrimary },
    x: { color: t.textTertiary, fontSize: 13 },
    botaoAddEx: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderWidth: 1.5, borderColor: t.red, borderRadius: 10, marginTop: 4 },
    botaoAddExTexto: { color: t.red, fontWeight: '600' },

    semanasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    semanaCard: { width: '47%', minHeight: 110, borderRadius: 14, backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center', padding: 10, gap: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    semanaVazia: { borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed' },
    semanaNum: { fontSize: 11, fontWeight: '700', color: t.textTertiary },
    semanaLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
    semanaReps: { fontSize: 11, color: t.textPrimary, fontWeight: '500' },

    modalEx: { flex: 1, padding: 20, backgroundColor: t.bg },
    modalExTitulo: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 16, marginTop: 20 },
    modalExItem: { backgroundColor: t.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
    modalExNome: { fontWeight: '600', color: t.textPrimary },
    modalExGrupo: { color: t.textSecondary, fontSize: 13 },
    botaoFechar: { backgroundColor: t.elevated, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10, marginBottom: 30 },
    botaoFecharTexto: { fontWeight: '600', color: t.textPrimary },
    vazio: { textAlign: 'center', color: t.textTertiary, marginTop: 40 },

    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 16 },
    sheetTitulo: { fontSize: 16, fontWeight: '700', color: t.textPrimary, marginBottom: 16 },
    sheetSec: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 8 },

    tipoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
    tipoChipTexto: { fontSize: 12, fontWeight: '600' },

    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputGroup: { flex: 1 },
    sheetInput: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '600', color: t.textPrimary, textAlign: 'center' },

    cargaRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
    cargaBtn: { flex: 1, minWidth: '18%', borderWidth: 1.5, borderColor: t.border, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: t.surface },
    cargaBtnTexto: { fontSize: 10, fontWeight: '700', color: t.textSecondary },
    cargaBtnPct: { fontSize: 11, fontWeight: '700', color: t.textTertiary, marginTop: 2 },

    cargaCustomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    cargaCustomLabel: { fontSize: 13, color: t.textSecondary },
    cargaCustomInput: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 8, padding: 8, width: 60, textAlign: 'center', fontSize: 15, fontWeight: '700', color: t.textPrimary },

    btnConfirmar: { backgroundColor: t.red, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
    btnConfirmarTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnLimpar: { paddingVertical: 10, alignItems: 'center' },
    btnLimparTexto: { color: t.textTertiary, fontWeight: '600', fontSize: 13 },
  };
}
