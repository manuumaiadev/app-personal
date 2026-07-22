import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { atualizarFicha } from '../../services/fichas';
import { criarTreino, deletarTreino, listarTreinosFicha } from '../../services/treinos';
import { TIPOS_PERIOD } from '../../utils/periodizacao';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

const CARGA_NIVEIS = [
  { nivel: 1, label: 'Muito Leve', range: [0,  45] },
  { nivel: 2, label: 'Leve',       range: [46, 59] },
  { nivel: 3, label: 'Moderada',   range: [60, 72] },
  { nivel: 4, label: 'Alta',       range: [73, 84] },
  { nivel: 5, label: 'Maxima',     range: [85, 100] },
];

function cargaParaNivel(carga) {
  return CARGA_NIVEIS.find(n => carga >= n.range[0] && carga <= n.range[1])?.nivel || 0;
}
function nivelParaCarga(nivel) {
  return { 1: 40, 2: 55, 3: 65, 4: 78, 5: 88 }[nivel] || 60;
}
function tipoById(id) {
  return TIPOS_PERIOD.find(t => t.id === id) || null;
}
function normalizarItem(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const t = tipoById(item);
    return t ? { tipo: t.id, series: t.series, reps: t.reps, carga: t.carga } : null;
  }
  return item;
}

function BarraCarga({ carga, cor }) {
  const nivel = cargaParaNivel(carga);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={{
          width: 8, height: i <= nivel ? 10 + i * 2 : 6,
          borderRadius: 3,
          backgroundColor: i <= nivel ? (cor || '#E31E24') : '#e5e7eb',
        }} />
      ))}
      <Text style={{ fontSize: 10, color: cor || '#9ca3af', fontWeight: '700', marginLeft: 2 }}>
        {carga}%
      </Text>
    </View>
  );
}

export default function EditarFichaScreen({ route, navigation }) {
  const { ficha, aluno } = route.params;
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [nome, setNome] = useState(ficha.nome || '');
  const [semanas, setSemanas] = useState(String(ficha.semanas || 4));
  const [diasPorSemana, setDiasPorSemana] = useState(String(ficha.diasPorSemana || ''));
  const [periodizacao, setPeriodizacao] = useState(() =>
    Array.from({ length: ficha.semanas || 4 }, (_, i) =>
      normalizarItem((ficha.periodizacao || [])[i])
    )
  );
  const [treinos, setTreinos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [semanaSelecionada, setSemanaSelecionada] = useState(null);
  const [editTipo, setEditTipo] = useState(null);
  const [editSeries, setEditSeries] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editCarga, setEditCarga] = useState(60);
  const [editObs, setEditObs] = useState('');

  useFocusEffect(
    useCallback(() => {
      listarTreinosFicha(ficha.id)
        .then(setTreinos)
        .catch(console.error)
        .finally(() => setCarregando(false));
    }, [ficha.id])
  );

  function abrirSemana(idx) {
    const item = periodizacao[idx];
    setEditTipo(item?.tipo || null);
    setEditSeries(item?.series || '');
    setEditReps(item?.reps || '');
    setEditCarga(item?.carga ?? 60);
    setEditObs(item?.obs || '');
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
    novo[semanaSelecionada] = { tipo: editTipo, series: editSeries, reps: editReps, carga: editCarga, obs: editObs };
    setPeriodizacao(novo);
    setSemanaSelecionada(null);
  }

  function limparSemana() {
    const novo = [...periodizacao];
    novo[semanaSelecionada] = null;
    setPeriodizacao(novo);
    setSemanaSelecionada(null);
  }

  async function salvar() {
    if (!nome.trim()) { Alert.alert('Atenção', 'Dê um nome à ficha.'); return; }
    setSalvando(true);
    try {
      const semanasNum = parseInt(semanas) || 4;
      const vencimento = new Date(ficha.criadoEm?.toDate?.() || new Date());
      vencimento.setDate(vencimento.getDate() + semanasNum * 7);
      await atualizarFicha(ficha.id, {
        nome: nome.trim(),
        semanas: semanasNum,
        diasPorSemana: parseInt(diasPorSemana) || null,
        dataVencimento: Timestamp.fromDate(vencimento),
        periodizacao,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Nao foi possivel salvar.');
    } finally {
      setSalvando(false);
    }
  }

  function handleDeletarTreino(treino) {
    Alert.alert(
      'Excluir treino',
      `Excluir Treino ${treino.letra}? Essa acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            try {
              await deletarTreino(treino.id);
              setTreinos(prev => prev.filter(t => t.id !== treino.id));
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  }

  async function novoTreino() {
    const proximaLetra = LETRAS[treinos.length];
    if (!proximaLetra) return;
    try {
      const ref = await criarTreino({
        fichaId: ficha.id,
        letra: proximaLetra,
        diasDaSemana: [],
        exercicios: [],
        metodosEspeciais: [],
      });
      navigation.navigate('EditarTreino', {
        treino: { id: ref.id, letra: proximaLetra, diasDaSemana: [], exercicios: [], metodosEspeciais: [] },
        aluno,
        semanas: parseInt(semanas) || 4,
      });
    } catch (e) {
      console.error(e);
    }
  }

  const tipoAtual = tipoById(editTipo);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">

        <View style={s.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Ionicons name="arrow-back" size={22} color={theme.red} />
            <Text style={s.voltarTexto}>Voltar</Text>
          </TouchableOpacity>
          <Text style={s.navTitulo}>Editar ficha</Text>
          <TouchableOpacity onPress={salvar} disabled={salvando}>
            {salvando
              ? <ActivityIndicator color={theme.red} size="small" />
              : <Ionicons name="checkmark" size={26} color={theme.red} />}
          </TouchableOpacity>
        </View>

        <Text style={s.subtitulo}>{aluno.nome}</Text>

        <Text style={s.secLabel}>NOME DA FICHA</Text>
        <TextInput
          style={s.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Hipertrofia A/B/C"
          placeholderTextColor={theme.placeholder}
        />

        <Text style={s.secLabel}>DURACAO (SEMANAS)</Text>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          value={semanas}
          onChangeText={v => {
            setSemanas(v);
            const n = parseInt(v) || 0;
            if (n > 0 && n <= 52) {
              setPeriodizacao(prev =>
                Array.from({ length: n }, (_, i) => prev[i] ?? null)
              );
            }
          }}
        />

        <Text style={[s.secLabel, { marginTop: 20 }]}>META DE FREQUENCIA</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            keyboardType="numeric"
            value={diasPorSemana}
            onChangeText={v => setDiasPorSemana(v.replace(/[^0-9]/g, ''))}
            placeholder="Ex: 4"
            placeholderTextColor={theme.placeholder}
            maxLength={1}
          />
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>dias por semana</Text>
        </View>

        <Text style={[s.secLabel, { marginTop: 4 }]}>PERIODIZACAO — MICROCICLOS</Text>
        <Text style={s.secDesc}>Configure o tipo de treino para cada semana do plano.</Text>

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
                    <Text style={s.semanaReps}>{item.series}×{item.reps}</Text>
                    <BarraCarga carga={item.carga} cor={tipo.cor} />
                    {item.obs ? (
                      <Text style={[s.semanaObs, { color: tipo.cor }]} numberOfLines={1}>{item.obs}</Text>
                    ) : null}
                  </>
                ) : (
                  <Ionicons name="add-outline" size={22} color={theme.textTertiary} style={{ marginTop: 6 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.secLabel, { marginTop: 32 }]}>TREINOS</Text>

        {carregando ? (
          <ActivityIndicator color={theme.red} style={{ marginVertical: 20 }} />
        ) : (
          <View style={s.treinosGrid}>
            {treinos.map(treino => {
              const qtd = treino.exercicios?.length || 0;
              return (
                <TouchableOpacity
                  key={treino.id}
                  style={s.treinoTile}
                  onPress={() => navigation.navigate('EditarTreino', {
                    treino, aluno, semanas: parseInt(semanas) || 4,
                  })}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    style={s.treinoTileDelete}
                    onPress={() => handleDeletarTreino(treino)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={13} color={theme.textTertiary} />
                  </TouchableOpacity>
                  <View style={s.treinoTileBadge}>
                    <Text style={s.treinoTileLetra}>{treino.letra}</Text>
                  </View>
                  {treino.diasDaSemana?.length > 0 ? (
                    <Text style={s.treinoTileDias} numberOfLines={2}>
                      {treino.diasDaSemana.join(' · ')}
                    </Text>
                  ) : (
                    <Text style={s.treinoTileDiasVazio}>Sem dias</Text>
                  )}
                  <Text style={s.treinoTileQtd}>
                    {qtd} ex{qtd !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {treinos.length < LETRAS.length && (
              <TouchableOpacity style={[s.treinoTile, s.treinoTileAdd]} onPress={novoTreino} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={28} color={theme.textTertiary} />
                <Text style={s.treinoTileAddTexto}>Novo {LETRAS[treinos.length]}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

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
              Semana {semanaSelecionada !== null ? semanaSelecionada + 1 : ''}
            </Text>

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

            <View style={s.inputRow}>
              <View style={s.inputGroup}>
                <Text style={s.sheetSec}>SERIES</Text>
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
                <Text style={s.sheetSec}>REPETICOES</Text>
                <TextInput
                  style={s.sheetInput}
                  value={editReps}
                  onChangeText={setEditReps}
                  placeholder="Ex: 8-12"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
            </View>

            <Text style={s.sheetSec}>NIVEL DE CARGA</Text>
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

            <Text style={s.sheetSec}>OBSERVACAO</Text>
            <TextInput
              style={s.obsInput}
              placeholder="Instrucoes ou dicas para esta semana..."
              placeholderTextColor={theme.placeholder}
              value={editObs}
              onChangeText={setEditObs}
              multiline
              textAlignVertical="top"
            />

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
    secLabel: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 8 },
    secDesc: { color: t.textSecondary, fontSize: 13, marginBottom: 14, marginTop: -4 },
    input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary, marginBottom: 16 },

    semanasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    semanaCard: { width: '47%', minHeight: 110, borderRadius: 14, backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center', padding: 10, gap: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    semanaVazia: { borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed' },
    semanaNum: { fontSize: 11, fontWeight: '700', color: t.textTertiary },
    semanaLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
    semanaReps: { fontSize: 11, color: t.textPrimary, fontWeight: '500' },
    semanaObs: { fontSize: 10, fontStyle: 'italic', textAlign: 'center', marginTop: 2 },

    treinosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    treinoTile: {
      width: '47%', backgroundColor: t.surface, borderRadius: 16,
      padding: 14, borderWidth: 1, borderColor: t.border,
      alignItems: 'center', gap: 6, minHeight: 120,
      position: 'relative',
    },
    treinoTileDelete: { position: 'absolute', top: 10, right: 10 },
    treinoTileBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
    treinoTileLetra: { color: '#fff', fontWeight: '900', fontSize: 22 },
    treinoTileDias: { fontSize: 11, color: t.textSecondary, textAlign: 'center', lineHeight: 15 },
    treinoTileDiasVazio: { fontSize: 11, color: t.textTertiary, fontStyle: 'italic' },
    treinoTileQtd: { fontSize: 12, color: t.textTertiary, fontWeight: '600' },
    treinoTileAdd: { borderStyle: 'dashed', justifyContent: 'center', borderWidth: 1.5 },
    treinoTileAddTexto: { color: t.textTertiary, fontSize: 13, fontWeight: '600', marginTop: 4 },

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
    obsInput: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 10, fontSize: 13, color: t.textPrimary, minHeight: 64, marginBottom: 16 },
    btnConfirmar: { backgroundColor: t.red, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
    btnConfirmarTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnLimpar: { paddingVertical: 10, alignItems: 'center' },
    btnLimparTexto: { color: t.textTertiary, fontWeight: '600', fontSize: 13 },
  };
}
