import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registrarExecucao } from '../../services/execucoes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const CYAN = '#06b6d4';

function formatTempo(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function parseDescanso(str) {
  if (!str) return 60;
  const s = String(str).toLowerCase().trim();
  const n = parseInt(s.match(/^(\d+)/)?.[1] || '60');
  if (s.includes('min')) return n * 60;
  return n || 60;
}

function makeStyles(t) {
  return {
    root: { flex: 1, backgroundColor: t.bg },
    scrollContent: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    voltar: { padding: 4 },
    titulo: { fontSize: 22, fontWeight: '800', color: t.textPrimary, letterSpacing: -0.3 },
    subtitulo: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
    headerRight: { alignItems: 'flex-end', gap: 2 },
    cronometro: { fontSize: 20, fontWeight: '800', color: t.textPrimary, letterSpacing: 1 },
    headerSeries: { fontSize: 11, color: t.textSecondary, fontWeight: '600' },
    exCard: { backgroundColor: t.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border },
    exHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
    exNome: { fontSize: 15, fontWeight: '700', color: t.textPrimary, flex: 1, marginRight: 8 },
    exMeta: { fontSize: 12, color: t.textSecondary, marginBottom: 4 },
    exObs: { fontSize: 11, color: t.textTertiary, fontStyle: 'italic', marginBottom: 12, lineHeight: 15 },
    exMetaRow: { marginBottom: 12 },
    serieRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
    serieNum: { width: 22, fontSize: 11, fontWeight: '700', color: t.textTertiary, textAlign: 'center' },
    inputKg: {
      flex: 1, backgroundColor: t.elevated, borderRadius: 8, paddingVertical: 8,
      paddingHorizontal: 10, textAlign: 'center', fontWeight: '700', fontSize: 14,
      color: t.textPrimary, borderWidth: 1, borderColor: t.border,
    },
    sep: { fontSize: 12, color: t.textTertiary },
    inputReps: {
      width: 48, backgroundColor: t.elevated, borderRadius: 8, paddingVertical: 8,
      paddingHorizontal: 6, textAlign: 'center', fontWeight: '600', fontSize: 13,
      color: t.textPrimary, borderWidth: 1, borderColor: t.border,
    },
    checkBtn: {
      width: 32, height: 32, borderRadius: 16,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1.5,
    },
    serieRowDone: { opacity: 0.5 },
    timerWrap: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, overflow: 'hidden', backgroundColor: t.surface, borderWidth: 1, borderColor: CYAN + '40' },
    timerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    timerNum: { fontSize: 28, fontWeight: '800', color: CYAN, width: 52 },
    timerLabel: { fontSize: 13, fontWeight: '600', color: t.textPrimary },
    timerSub: { fontSize: 11, color: t.textSecondary, marginTop: 1 },
    timerBarBg: { height: 3, backgroundColor: t.elevated, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
    timerBarFill: { height: 3, borderRadius: 2, backgroundColor: CYAN },
    footer: { padding: 16, paddingBottom: 28, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border },
    btnFinalizar: {
      backgroundColor: t.red, borderRadius: 14, padding: 16,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    btnFinalizarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
    videoBtn: { padding: 4 },
    progresso: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    progressoDot: { width: 6, height: 6, borderRadius: 3 },
  };
}

export default function ExecutarTreinoScreen({ route, navigation }) {
  const { treino, ficha } = route.params;
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [cargas, setCargas] = useState(() => {
    const m = {};
    treino.exercicios?.forEach(ex => {
      m[ex.id] = Array.from({ length: ex.series || 3 }, () => '');
    });
    return m;
  });

  const [repsRealizadas, setRepsRealizadas] = useState(() => {
    const m = {};
    treino.exercicios?.forEach(ex => {
      m[ex.id] = Array.from({ length: ex.series || 3 }, () => String(ex.reps || ''));
    });
    return m;
  });

  const [concluidas, setConcluidas] = useState(() => {
    const m = {};
    treino.exercicios?.forEach(ex => {
      m[ex.id] = Array.from({ length: ex.series || 3 }, () => false);
    });
    return m;
  });

  const [timer, setTimer] = useState(null); // { seconds, total }
  const [salvando, setSalvando] = useState(false);
  const [tempoTreino, setTempoTreino] = useState(0);

  // Cronometro geral do treino
  useEffect(() => {
    const id = setInterval(() => setTempoTreino(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!timer || timer.seconds <= 0) {
      if (timer?.seconds === 0) {
        const id = setTimeout(() => setTimer(null), 1200);
        return () => clearTimeout(id);
      }
      return;
    }
    const id = setTimeout(() => {
      setTimer(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
    }, 1000);
    return () => clearTimeout(id);
  }, [timer]);

  function setCarga(exId, i, v) {
    setCargas(prev => {
      const n = { ...prev, [exId]: [...(prev[exId] || [])] };
      n[exId][i] = v;
      return n;
    });
  }

  function setReps(exId, i, v) {
    setRepsRealizadas(prev => {
      const n = { ...prev, [exId]: [...(prev[exId] || [])] };
      n[exId][i] = v;
      return n;
    });
  }

  function toggleSerie(exId, i, descanso) {
    setConcluidas(prev => {
      const arr = [...(prev[exId] || [])];
      const era = arr[i];
      arr[i] = !era;
      if (!era) {
        const secs = parseDescanso(descanso);
        setTimer({ seconds: secs, total: secs });
      }
      return { ...prev, [exId]: arr };
    });
  }

  const totalSeries = treino.exercicios?.reduce((a, ex) => a + (ex.series || 3), 0) || 0;
  const seriesDone = Object.values(concluidas).flat().filter(Boolean).length;

  async function handleFinalizar() {
    setSalvando(true);
    try {
      await registrarExecucao({
        alunoId: usuario.uid,
        treinoId: treino.id,
        fichaId: ficha.id,
        letra: treino.letra,
        duracaoSegundos: tempoTreino,
        exercicios: treino.exercicios?.map(ex => ({
          id: ex.id,
          nome: ex.nome,
          series: ex.series,
          reps: ex.reps,
          cargas: cargas[ex.id] || [],
          repsRealizadas: repsRealizadas[ex.id] || [],
        })),
      });
      Alert.alert('Treino finalizado!', `Duracao: ${formatTempo(tempoTreino)}`, [
        { text: 'Continuar', onPress: () => navigation.navigate('Treinos') }
      ]);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar o treino.');
    } finally {
      setSalvando(false);
    }
  }

  const pct = totalSeries > 0 ? seriesDone / totalSeries : 0;
  const timerPct = timer ? timer.seconds / timer.total : 0;
  const timerDone = timer?.seconds === 0;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Ionicons name="arrow-back" size={22} color={theme.red} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>Treino {treino.letra}</Text>
            <Text style={s.subtitulo}>{ficha.nome}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.cronometro}>{formatTempo(tempoTreino)}</Text>
            <Text style={s.headerSeries}>{seriesDone}/{totalSeries} series</Text>
          </View>
        </View>

        {/* Progresso geral */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ height: 4, backgroundColor: theme.elevated, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: 4, width: `${pct * 100}%`, backgroundColor: CYAN, borderRadius: 2 }} />
          </View>
        </View>

        {treino.exercicios?.map((ex) => {
          const exConcluidas = concluidas[ex.id] || [];
          const exDone = exConcluidas.filter(Boolean).length;
          const allDone = exDone === (ex.series || 3);

          return (
            <View key={ex.id} style={[s.exCard, allDone && { borderColor: CYAN + '40' }]}>
              <View style={s.exHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.exNome}>{ex.nome}</Text>
                  <Text style={s.exMeta}>
                    {ex.series}×{ex.reps}
                    {ex.descanso ? `  ·  ${ex.descanso} descanso` : ''}
                  </Text>
                </View>
                {allDone && (
                  <Ionicons name="checkmark-circle" size={20} color={CYAN} />
                )}
              </View>

              {ex.grupoMuscular && (
                <Text style={[s.exMeta, { marginBottom: 8, marginTop: -2 }]}>
                  {ex.grupoMuscular}
                </Text>
              )}

              {ex.observacao && (
                <Text style={s.exObs}>{ex.observacao}</Text>
              )}

              {/* Cabecalho colunas */}
              <View style={[s.serieRow, { marginBottom: 4 }]}>
                <Text style={[s.serieNum]} />
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: theme.textTertiary, textAlign: 'center', letterSpacing: 0.5 }}>KG</Text>
                <Text style={{ width: 8 }} />
                <Text style={{ width: 48, fontSize: 10, fontWeight: '700', color: theme.textTertiary, textAlign: 'center', letterSpacing: 0.5 }}>REPS</Text>
                <Text style={{ width: 32 }} />
              </View>

              {Array.from({ length: ex.series || 3 }).map((_, i) => {
                const done = exConcluidas[i];
                return (
                  <View key={i} style={[s.serieRow, done && s.serieRowDone]}>
                    <Text style={s.serieNum}>{i + 1}</Text>
                    <TextInput
                      style={[s.inputKg, done && { borderColor: CYAN + '40' }]}
                      placeholder="—"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="decimal-pad"
                      value={cargas[ex.id]?.[i] || ''}
                      onChangeText={v => setCarga(ex.id, i, v)}
                      editable={!done}
                    />
                    <Text style={s.sep}>×</Text>
                    <TextInput
                      style={[s.inputReps, done && { borderColor: CYAN + '40' }]}
                      keyboardType="number-pad"
                      value={repsRealizadas[ex.id]?.[i] || ''}
                      onChangeText={v => setReps(ex.id, i, v)}
                      editable={!done}
                    />
                    <TouchableOpacity
                      style={[
                        s.checkBtn,
                        done
                          ? { backgroundColor: CYAN, borderColor: CYAN }
                          : { backgroundColor: 'transparent', borderColor: theme.border },
                      ]}
                      onPress={() => toggleSerie(ex.id, i, ex.descanso)}
                      activeOpacity={0.7}
                    >
                      {done && <Ionicons name="checkmark" size={15} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* Timer de descanso */}
      {timer !== null && (
        <View style={s.timerWrap}>
          <View style={s.timerInner}>
            <Text style={[s.timerNum, timerDone && { color: CYAN }]}>
              {timerDone ? '00' : String(timer.seconds).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={s.timerLabel}>
                {timerDone ? 'Pronto! Proxima serie.' : 'Descansando'}
              </Text>
              {!timerDone && (
                <View style={s.timerBarBg}>
                  <View style={[s.timerBarFill, { width: `${timerPct * 100}%` }]} />
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setTimer(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.btnFinalizar} onPress={handleFinalizar} disabled={salvando}>
          {salvando
            ? <ActivityIndicator color="#fff" />
            : <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.btnFinalizarTexto}>Finalizar treino</Text>
            </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
