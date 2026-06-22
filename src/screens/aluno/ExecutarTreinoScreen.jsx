import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { buildExMetodoMap } from '../../utils/metodosEspeciais';
import { registrarExecucao } from '../../services/execucoes';
import { enviarMensagem } from '../../services/chat';
import { listarExercicios } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const BEEP = require('../../../assets/beep.wav');

const CYAN = '#06b6d4';

const ESFORCO_OPTS = [
  { id: 'facil',    label: 'Facil',    color: '#22c55e' },
  { id: 'moderado', label: 'Moderado', color: '#f59e0b' },
  { id: 'dificil',  label: 'Dificil',  color: '#ef4444' },
];

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

    // Accordion card
    exCard: {
      backgroundColor: t.surface, borderRadius: 16,
      marginBottom: 10, borderWidth: 1, borderColor: t.border,
      overflow: 'hidden',
    },
    exCardDone: { borderColor: CYAN + '60' },
    exCardHeader: {
      flexDirection: 'row', alignItems: 'center',
      padding: 16, gap: 12,
    },
    exStatusDot: {
      width: 10, height: 10, borderRadius: 5,
      borderWidth: 1.5,
    },
    exNome: { fontSize: 15, fontWeight: '700', color: t.textPrimary, flex: 1 },
    exMeta: { fontSize: 12, color: t.textSecondary },
    exChevron: { marginLeft: 4 },
    exBody: { paddingHorizontal: 16, paddingBottom: 16 },

    serieHeaderRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingBottom: 6, marginBottom: 4,
      borderBottomWidth: 1, borderBottomColor: t.border,
    },
    serieHeaderNum: { width: 22 },
    serieHeaderKg: { flex: 1, fontSize: 10, fontWeight: '700', color: t.textTertiary, textAlign: 'center', letterSpacing: 0.5 },
    serieHeaderReps: { width: 48, fontSize: 10, fontWeight: '700', color: t.textTertiary, textAlign: 'center', letterSpacing: 0.5 },
    serieHeaderCheck: { width: 32 },

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
    serieRowDone: { opacity: 0.55 },

    // Esforco selector
    esforcoRow: {
      flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 2,
      paddingTop: 8, borderTopWidth: 1, borderTopColor: t.border,
    },
    esforcoLabel: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
    esforcoBtn: {
      flex: 1, paddingVertical: 7, borderRadius: 10,
      alignItems: 'center', borderWidth: 1.5,
    },
    esforcoTexto: { fontSize: 11, fontWeight: '700' },

    // Observation line
    exObs: { fontSize: 11, color: t.textTertiary, fontStyle: 'italic', marginBottom: 12, lineHeight: 15 },
    // Method group header
    grupoHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 10, marginBottom: 4, marginTop: 8,
    },
    grupoHeaderTexto: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    grupoHeaderSub: { fontSize: 10, fontWeight: '500' },

    // Timer bottom sheet modal
    timerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    timerSheet: {
      backgroundColor: t.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32,
      paddingHorizontal: 28, paddingTop: 20, paddingBottom: 44, alignItems: 'center',
    },
    timerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, marginBottom: 20 },
    timerContext: { fontSize: 13, color: t.textSecondary, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
    timerCountdown: { fontSize: 88, fontWeight: '900', letterSpacing: -2, textAlign: 'center', lineHeight: 96 },
    timerCountdownDone: { color: CYAN },
    timerBarBg: { width: '100%', height: 6, backgroundColor: t.elevated, borderRadius: 3, overflow: 'hidden', marginTop: 20, marginBottom: 32 },
    timerBarFill: { height: 6, borderRadius: 3, backgroundColor: CYAN },
    timerActions: { flexDirection: 'row', gap: 12, width: '100%' },
    timerActionBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: t.border, backgroundColor: t.elevated,
      flexDirection: 'row', gap: 6,
    },
    timerActionBtnPrimary: { backgroundColor: CYAN, borderColor: CYAN },
    timerActionTexto: { fontSize: 14, fontWeight: '700', color: t.textPrimary },
    timerActionTextoPrimary: { color: '#fff' },

    footer: { padding: 16, paddingBottom: 28, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border },
    btnFinalizar: {
      backgroundColor: t.red, borderRadius: 14, padding: 16,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    btnFinalizarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: t.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 28, paddingBottom: 40,
    },
    modalIconRow: { alignItems: 'center', marginBottom: 16 },
    modalTitulo: { fontSize: 22, fontWeight: '800', color: t.textPrimary, textAlign: 'center', marginBottom: 4 },
    modalDuracao: { fontSize: 40, fontWeight: '900', color: CYAN, textAlign: 'center', letterSpacing: 2, marginBottom: 24 },
    modalLabel: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 8 },
    modalInput: {
      backgroundColor: t.elevated, borderRadius: 14, padding: 14,
      fontSize: 14, color: t.textPrimary, borderWidth: 1, borderColor: t.border,
      minHeight: 84, textAlignVertical: 'top', marginBottom: 18,
    },
    btnConcluir: {
      backgroundColor: t.red, borderRadius: 14, padding: 16,
      alignItems: 'center', marginBottom: 10,
    },
    btnConcluirTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
    btnPular: { padding: 12, alignItems: 'center' },
    btnPularTexto: { color: t.textSecondary, fontWeight: '600', fontSize: 14 },

    btnAddExtra: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed',
      borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 8,
    },
    btnAddExtraTexto: { color: t.textSecondary, fontWeight: '600', fontSize: 14 },

    extraSheet: {
      backgroundColor: t.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: 40,
    },
    extraHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 20 },
    extraTitulo: { fontSize: 18, fontWeight: '800', color: t.textPrimary, marginBottom: 16 },
    extraLabel: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.5, marginBottom: 8 },
    extraInput: {
      backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border,
      borderRadius: 10, padding: 12, fontSize: 15, color: t.textPrimary, marginBottom: 14,
    },
    extraBuscaBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border,
      borderRadius: 10, paddingHorizontal: 12, marginBottom: 8,
    },
    extraBuscaInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: t.textPrimary },
    extraBancoItem: {
      backgroundColor: t.elevated, borderRadius: 10, padding: 12, marginBottom: 6,
    },
    extraBancoItemNome: { fontWeight: '600', color: t.textPrimary, fontSize: 14 },
    extraBancoItemGrupo: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
    extraSelecionado: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.elevated, borderRadius: 10, padding: 12,
      borderWidth: 1.5, borderColor: t.red + '40', gap: 8, marginBottom: 14,
    },
    extraSelecionadoNome: { flex: 1, fontWeight: '700', color: t.textPrimary },
    extraNumRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    extraNumGroup: { flex: 1 },
    extraNumInput: {
      backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border,
      borderRadius: 10, padding: 12, fontSize: 16, fontWeight: '700',
      color: t.textPrimary, textAlign: 'center',
    },
    extraBtnConfirmar: {
      backgroundColor: t.red, borderRadius: 12, padding: 14, alignItems: 'center',
    },
    extraBtnConfirmarTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
    extraBtnCancelar: { padding: 12, alignItems: 'center', marginTop: 4 },
    extraBtnCancelarTexto: { color: t.textTertiary, fontWeight: '600', fontSize: 14 },
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
      const repsBase = String(ex.reps || '').replace(/[^0-9].*/, '');
      m[ex.id] = Array.from({ length: ex.series || 3 }, () => repsBase);
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

  // RPE: esforco por serie. Key: exId, value: array de 'facil'|'moderado'|'dificil'|null
  const [esforco, setEsforco] = useState(() => {
    const m = {};
    treino.exercicios?.forEach(ex => {
      m[ex.id] = Array.from({ length: ex.series || 3 }, () => null);
    });
    return m;
  });

  // Qual serie aguarda seleção de esforco: { exId, serieIdx } | null
  const [esforcoPrompt, setEsforcoPrompt] = useState(null);

  // Accordion: qual exercício está expandido
  const [expandido, setExpandido] = useState(() => {
    const primeiro = treino.exercicios?.[0]?.id;
    return primeiro ?? null;
  });

  const [timer, setTimer] = useState(null);
  const [timerPausado, setTimerPausado] = useState(false);
  const beepPlayer = useAudioPlayer(BEEP);
  const notifIdRef = useRef(null);
  const [salvando, setSalvando] = useState(false);
  const [tempoTreino, setTempoTreino] = useState(0);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [comentario, setComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const timerRef = useRef(null);

  const [extrasExercicios, setExtrasExercicios] = useState([]);
  const [banco, setBanco] = useState([]);
  const [modalExtra, setModalExtra] = useState(false);
  const [extraBusca, setExtraBusca] = useState('');
  const [extraSelecionado, setExtraSelecionado] = useState(null);
  const [extraNome, setExtraNome] = useState('');
  const [extraSeries, setExtraSeries] = useState('3');
  const [extraReps, setExtraReps] = useState('12');

  useEffect(() => {
    timerRef.current = setInterval(() => setTempoTreino(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    listarExercicios(usuario.uid).then(setBanco).catch(() => {});
  }, []);

  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  async function agendarNotifDescanso(seconds) {
    try {
      await cancelarNotifDescanso();
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hora de continuar!',
          body: 'Seu descanso acabou. Proxima serie!',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
      notifIdRef.current = id;
    } catch {}
  }

  async function cancelarNotifDescanso() {
    if (notifIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      } catch {}
      notifIdRef.current = null;
    }
  }

  useEffect(() => {
    if (!timer || timerPausado) return;
    if (timer.seconds <= 0) {
      beepPlayer.play();
      cancelarNotifDescanso();
      return;
    }
    const id = setTimeout(() => {
      setTimer(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
    }, 1000);
    return () => clearTimeout(id);
  }, [timer, timerPausado]);

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
      const eraConcluida = arr[i];
      arr[i] = !eraConcluida;

      if (!eraConcluida) {
        // Inicia descanso apenas se for standalone ou último do grupo
        const groupInfo = exGroupMap[exId];
        const deveIniciarDescanso = !groupInfo || groupInfo.isLastInGroup;
        if (deveIniciarDescanso) {
          const secs = groupInfo?.descansoPorRodada
            ? groupInfo.descansoPorRodada
            : parseDescanso(descanso);
          setTimer({ seconds: secs, total: secs });
          setTimerPausado(false);
          agendarNotifDescanso(secs);
        }
        // Pede seleção de esforço
        setEsforcoPrompt({ exId, serieIdx: i });
      } else {
        // Desmarcou — remove esforço registrado
        setEsforco(prev2 => {
          const arr2 = [...(prev2[exId] || [])];
          arr2[i] = null;
          return { ...prev2, [exId]: arr2 };
        });
        setEsforcoPrompt(null);
      }

      return { ...prev, [exId]: arr };
    });
  }

  function registrarEsforco(nivel) {
    if (!esforcoPrompt) return;
    const { exId, serieIdx } = esforcoPrompt;
    setEsforco(prev => {
      const arr = [...(prev[exId] || [])];
      arr[serieIdx] = nivel;
      return { ...prev, [exId]: arr };
    });
    setEsforcoPrompt(null);

    // Auto-colapsa se todas as séries do exercício estão concluídas
    setConcluidas(prev => {
      const arr = prev[exId] || [];
      const allDone = arr.every(Boolean);
      if (allDone) {
        const idx = allExercicios.findIndex(e => e.id === exId);
        const proximo = allExercicios[idx + 1];
        setExpandido(proximo ? proximo.id : null);
      }
      return prev;
    });
  }

  function toggleExpandido(exId) {
    setExpandido(prev => prev === exId ? null : exId);
    setEsforcoPrompt(null);
  }

  function confirmarExtra() {
    const nome = extraSelecionado?.nome || extraNome.trim();
    if (!nome) return;
    const id = 'extra_' + Date.now();
    const series = parseInt(extraSeries) || 3;
    const reps = extraReps || '12';
    const novoEx = { id, nome, series, reps, descanso: '60s', isExtra: true };
    setExtrasExercicios(prev => [...prev, novoEx]);
    setCargas(prev => ({ ...prev, [id]: Array.from({ length: series }, () => '') }));
    setRepsRealizadas(prev => ({ ...prev, [id]: Array.from({ length: series }, () => reps) }));
    setConcluidas(prev => ({ ...prev, [id]: Array.from({ length: series }, () => false) }));
    setEsforco(prev => ({ ...prev, [id]: Array.from({ length: series }, () => null) }));
    setExpandido(id);
    setModalExtra(false);
    setExtraBusca('');
    setExtraSelecionado(null);
    setExtraNome('');
    setExtraSeries('3');
    setExtraReps('12');
  }

  const allExercicios = [...(treino.exercicios || []), ...extrasExercicios];
  const totalSeries = allExercicios.reduce((a, ex) => a + (ex.series || 3), 0);
  const seriesDone = Object.values(concluidas).flat().filter(Boolean).length;

  async function handleFinalizar() {
    setSalvando(true);
    try {
      clearInterval(timerRef.current);
      await registrarExecucao({
        alunoId: usuario.uid,
        treinoId: treino.id,
        fichaId: ficha.id,
        letra: treino.letra,
        duracaoSegundos: tempoTreino,
        exercicios: allExercicios.map(ex => ({
          id: ex.id,
          nome: ex.nome,
          series: ex.series,
          reps: ex.reps,
          cargas: cargas[ex.id] || [],
          repsRealizadas: repsRealizadas[ex.id] || [],
          esforco: esforco[ex.id] || [],
          ...(ex.isExtra ? { isExtra: true } : {}),
        })),
      });
      setModalVisivel(true);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar o treino.');
    } finally {
      setSalvando(false);
    }
  }

  async function fecharModal(enviar) {
    const texto = comentario.trim();
    if (enviar && texto && usuario.personalId) {
      setEnviandoComentario(true);
      try {
        await enviarMensagem(
          usuario.personalId, usuario.uid, usuario.uid,
          `[Treino ${treino.letra}] ${texto}`,
        );
      } catch {}
      setEnviandoComentario(false);
    }
    setModalVisivel(false);
    navigation.getParent()?.navigate('Treinos', { screen: 'TreinosList' });
  }

  const exGroupMap = useMemo(
    () => buildExMetodoMap(treino.metodosEspeciais),
    [treino.metodosEspeciais]
  );

  const pct = totalSeries > 0 ? seriesDone / totalSeries : 0;
  const timerPct = timer ? timer.seconds / timer.total : 0;
  const timerDone = timer?.seconds === 0;
  const temComentario = comentario.trim().length > 0;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

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

        <View style={{ marginBottom: 20 }}>
          <View style={{ height: 4, backgroundColor: theme.elevated, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: 4, width: `${pct * 100}%`, backgroundColor: CYAN, borderRadius: 2 }} />
          </View>
        </View>

        {allExercicios.map((ex) => {
          const exConcluidas = concluidas[ex.id] || [];
          const exDone = exConcluidas.filter(Boolean).length;
          const allDone = exDone === (ex.series || 3);
          const isOpen = expandido === ex.id;
          const dotColor = allDone ? CYAN : isOpen ? theme.red : theme.border;
          const groupInfo = exGroupMap[ex.id];

          return (
            <View key={ex.id}>
              {/* Cabeçalho de grupo — exibido apenas no primeiro exercício */}
              {groupInfo?.isFirstInGroup && (
                <View style={[s.grupoHeader, { backgroundColor: groupInfo.def.cor + '18' }]}>
                  <Ionicons name="flash" size={12} color={groupInfo.def.cor} />
                  <Text style={[s.grupoHeaderTexto, { color: groupInfo.def.cor }]}>
                    {groupInfo.def.label}
                  </Text>
                  <Text style={[s.grupoHeaderSub, { color: groupInfo.def.cor + 'aa' }]}>
                    · Descanso so apos a rodada completa
                  </Text>
                </View>
              )}
            <View style={[s.exCard, allDone && s.exCardDone, groupInfo && { borderColor: groupInfo.def.cor + '40' }]}>
              {/* Accordion header */}
              <TouchableOpacity
                style={s.exCardHeader}
                onPress={() => toggleExpandido(ex.id)}
                activeOpacity={0.75}
              >
                <View style={[s.exStatusDot, { backgroundColor: allDone ? CYAN : 'transparent', borderColor: dotColor }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.exNome}>{ex.nome}</Text>
                    {ex.isExtra && (
                      <View style={{ backgroundColor: theme.elevated, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textTertiary, letterSpacing: 0.3 }}>EXTRA</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={s.exMeta}>
                      {ex.series} series · {ex.reps} reps
                      {allDone ? '  — concluido' : isOpen ? '  — em andamento' : ''}
                    </Text>
                    {ex.observacao ? (
                      <Ionicons name="chatbubble-ellipses-outline" size={12} color={theme.textTertiary} />
                    ) : null}
                  </View>
                </View>
                {allDone
                  ? <Ionicons name="checkmark-circle" size={20} color={CYAN} />
                  : <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.textTertiary}
                      style={s.exChevron}
                    />
                }
              </TouchableOpacity>

              {/* Accordion body */}
              {isOpen && (
                <View style={s.exBody}>
                  {ex.observacao ? <Text style={s.exObs}>{ex.observacao}</Text> : null}

                  <View style={s.serieHeaderRow}>
                    <Text style={s.serieHeaderNum} />
                    <Text style={s.serieHeaderKg}>KG</Text>
                    <Text style={[s.serieHeaderKg, { width: 8 }]} />
                    <Text style={s.serieHeaderReps}>REPS</Text>
                    <View style={{ width: 32 }} />
                  </View>

                  {Array.from({ length: ex.series || 3 }).map((_, i) => {
                    const done = exConcluidas[i];
                    const mostrarEsforco = esforcoPrompt?.exId === ex.id && esforcoPrompt?.serieIdx === i;
                    const eforcoDaSerie = esforco[ex.id]?.[i];

                    return (
                      <View key={i}>
                        <View style={[s.serieRow, done && s.serieRowDone]}>
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

                        {/* Seletor de esforco — aparece logo apos marcar como concluida */}
                        {mostrarEsforco && (
                          <View style={s.esforcoRow}>
                            {ESFORCO_OPTS.map(opt => (
                              <TouchableOpacity
                                key={opt.id}
                                style={[s.esforcoBtn, { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
                                onPress={() => registrarEsforco(opt.id)}
                                activeOpacity={0.7}
                              >
                                <Text style={[s.esforcoTexto, { color: opt.color }]}>{opt.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Badge de esforco registrado (serie concluida e sem prompt aberto) */}
                        {done && !mostrarEsforco && eforcoDaSerie && (() => {
                          const opt = ESFORCO_OPTS.find(o => o.id === eforcoDaSerie);
                          return (
                            <View style={{ alignItems: 'flex-end', marginTop: -2, marginBottom: 2 }}>
                              <Text style={{ fontSize: 10, color: opt.color, fontWeight: '700' }}>
                                {opt.label}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            </View>
          );
        })}
        <TouchableOpacity style={s.btnAddExtra} onPress={() => setModalExtra(true)} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={20} color={theme.textSecondary} />
          <Text style={s.btnAddExtraTexto}>Adicionar exercicio extra</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={timer !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTimer(null)}
      >
        <TouchableOpacity style={s.timerOverlay} activeOpacity={1} onPress={() => {}}>
          <View style={s.timerSheet}>
            <View style={s.timerHandle} />
            <Text style={s.timerContext}>
              {timerDone ? 'Pronto! Proxima serie.' : 'Tempo de descanso'}
            </Text>
            <Text style={[s.timerCountdown, { color: timerDone ? CYAN : theme.textPrimary }]}>
              {formatTempo(timer?.seconds ?? 0)}
            </Text>
            <View style={s.timerBarBg}>
              <View style={[s.timerBarFill, { width: `${timerPct * 100}%` }]} />
            </View>
            <View style={s.timerActions}>
              <TouchableOpacity
                style={s.timerActionBtn}
                onPress={() => setTimerPausado(p => !p)}
              >
                <Ionicons
                  name={timerPausado ? 'play' : 'pause'}
                  size={16}
                  color={theme.textPrimary}
                />
                <Text style={s.timerActionTexto}>
                  {timerPausado ? 'Continuar' : 'Pausar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.timerActionBtn}
                onPress={() => {
                  setTimer(prev => ({ seconds: prev.total, total: prev.total }));
                  setTimerPausado(false);
                }}
              >
                <Ionicons name="refresh" size={16} color={theme.textPrimary} />
                <Text style={s.timerActionTexto}>Reiniciar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.timerActionBtn, s.timerActionBtnPrimary]}
                onPress={() => { cancelarNotifDescanso(); setTimer(null); setTimerPausado(false); }}
              >
                <Ionicons name="play-skip-forward" size={16} color="#fff" />
                <Text style={s.timerActionTextoPrimary}>Pular</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* Modal — adicionar exercicio extra */}
      <Modal visible={modalExtra} transparent animationType="slide" onRequestClose={() => setModalExtra(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.extraSheet} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={s.extraHandle} />
            <Text style={s.extraTitulo}>Exercicio extra</Text>

            <Text style={s.extraLabel}>EXERCICIO</Text>
            {extraSelecionado ? (
              <View style={s.extraSelecionado}>
                <Text style={s.extraSelecionadoNome}>{extraSelecionado.nome}</Text>
                <TouchableOpacity onPress={() => setExtraSelecionado(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.extraBuscaBox}>
                  <Ionicons name="search-outline" size={15} color={theme.placeholder} />
                  <TextInput
                    style={s.extraBuscaInput}
                    placeholder="Buscar na biblioteca..."
                    placeholderTextColor={theme.placeholder}
                    value={extraBusca}
                    onChangeText={setExtraBusca}
                    autoCapitalize="none"
                  />
                  {extraBusca.length > 0 && (
                    <TouchableOpacity onPress={() => setExtraBusca('')}>
                      <Ionicons name="close-circle" size={15} color={theme.placeholder} />
                    </TouchableOpacity>
                  )}
                </View>
                {extraBusca.length > 0 && banco
                  .filter(e =>
                    e.nome?.toLowerCase().includes(extraBusca.toLowerCase()) ||
                    e.grupoMuscular?.toLowerCase().includes(extraBusca.toLowerCase())
                  )
                  .slice(0, 5)
                  .map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.extraBancoItem}
                      onPress={() => { setExtraSelecionado(item); setExtraBusca(''); setExtraNome(''); }}
                    >
                      <Text style={s.extraBancoItemNome}>{item.nome}</Text>
                      {item.grupoMuscular ? <Text style={s.extraBancoItemGrupo}>{item.grupoMuscular}</Text> : null}
                    </TouchableOpacity>
                  ))
                }
                {extraBusca.length === 0 && (
                  <TextInput
                    style={s.extraInput}
                    placeholder="Ou descreva livremente..."
                    placeholderTextColor={theme.placeholder}
                    value={extraNome}
                    onChangeText={setExtraNome}
                  />
                )}
              </>
            )}

            <View style={s.extraNumRow}>
              <View style={s.extraNumGroup}>
                <Text style={s.extraLabel}>SERIES</Text>
                <TextInput
                  style={s.extraNumInput}
                  keyboardType="number-pad"
                  value={extraSeries}
                  onChangeText={v => setExtraSeries(v.replace(/[^0-9]/g, ''))}
                  placeholder="3"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
              <View style={s.extraNumGroup}>
                <Text style={s.extraLabel}>REPS</Text>
                <TextInput
                  style={s.extraNumInput}
                  value={extraReps}
                  onChangeText={setExtraReps}
                  placeholder="12"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.extraBtnConfirmar, !(extraSelecionado?.nome || extraNome.trim()) && { opacity: 0.4 }]}
              onPress={confirmarExtra}
              disabled={!(extraSelecionado?.nome || extraNome.trim())}
            >
              <Text style={s.extraBtnConfirmarTexto}>Adicionar ao treino</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.extraBtnCancelar}
              onPress={() => { setModalExtra(false); setExtraBusca(''); setExtraSelecionado(null); setExtraNome(''); }}
            >
              <Text style={s.extraBtnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => fecharModal(false)}>
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalCard}>
            <View style={s.modalIconRow}>
              <Ionicons name="checkmark-circle" size={52} color={CYAN} />
            </View>
            <Text style={s.modalTitulo}>Treino concluido!</Text>
            <Text style={s.modalDuracao}>{formatTempo(tempoTreino)}</Text>

            {usuario.personalId && (
              <>
                <Text style={s.modalLabel}>COMENTARIO PARA O PERSONAL (opcional)</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="Como foi o treino? Alguma dificuldade?"
                  placeholderTextColor={theme.placeholder}
                  multiline
                  value={comentario}
                  onChangeText={setComentario}
                />
              </>
            )}

            <TouchableOpacity
              style={s.btnConcluir}
              onPress={() => fecharModal(temComentario)}
              disabled={enviandoComentario}
            >
              {enviandoComentario
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnConcluirTexto}>
                    {temComentario ? 'Enviar e fechar' : 'Concluir'}
                  </Text>
              }
            </TouchableOpacity>

            {temComentario && (
              <TouchableOpacity style={s.btnPular} onPress={() => fecharModal(false)}>
                <Text style={s.btnPularTexto}>Fechar sem comentar</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
