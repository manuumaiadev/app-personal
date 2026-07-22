import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { buildExMetodoMap } from '../../utils/metodosEspeciais';
import { registrarExecucao, listarExecucoesTreino } from '../../services/execucoes';
import { enviarMensagem } from '../../services/chat';
import { listarExercicios } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const BEEP = require('../../../assets/beep.wav');

const CYAN = '#06b6d4';

function lerpColor(hex1, hex2, t) {
  const p = (h, s, e) => Math.round(parseInt(h.slice(s, e), 16) + (parseInt(hex2.slice(s, e), 16) - parseInt(h.slice(s, e), 16)) * t);
  return `rgb(${p(hex1,1,3)},${p(hex1,3,5)},${p(hex1,5,7)})`;
}
function interpolarCor(v) {
  if (v <= 50) return lerpColor('#22c55e', '#f59e0b', v / 50);
  return lerpColor('#f59e0b', '#ef4444', (v - 50) / 50);
}

const ESFORCO_LABELS = [
  { pct: 0,   label: 'Leve' },
  { pct: 50,  label: 'Moderado' },
  { pct: 100, label: 'Intenso' },
];

function EsforcoSlider({ value, onChange, onSave, onDismiss, t }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const cor = interpolarCor(value);
  const pct = Math.max(0, Math.min(100, value));

  const label = value <= 33 ? 'Leve' : value <= 66 ? 'Moderado' : 'Intenso';

  function calcVal(locationX) {
    if (!trackWidth) return value;
    return Math.round(Math.max(0, Math.min(100, (locationX / trackWidth) * 100)));
  }

  return (
    <View style={{
      marginTop: 10, marginBottom: 4,
      backgroundColor: t.elevated, borderRadius: 14,
      paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
      borderLeftWidth: 3, borderLeftColor: cor,
      borderTopWidth: 1, borderTopColor: t.border,
      borderRightWidth: 1, borderRightColor: t.border,
      borderBottomWidth: 1, borderBottomColor: t.border,
    }}>
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8 }}>
          ESFORCO
        </Text>
        <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: cor, letterSpacing: -1 }}>{value}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: cor }}>{label}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.6}
        >
          <Ionicons name="close" size={18} color={t.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Track — confirma ao soltar */}
      <View
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={e => onChange(calcVal(e.nativeEvent.locationX))}
        onResponderMove={e => onChange(calcVal(e.nativeEvent.locationX))}
        onResponderRelease={e => {
          const v = calcVal(e.nativeEvent.locationX);
          onChange(v);
          onSave(v);
        }}
        style={{ height: 44, justifyContent: 'center' }}
      >
        <View style={{ height: 5, backgroundColor: t.bg, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 5, width: `${pct}%`, backgroundColor: cor, borderRadius: 3 }} />
        </View>
        <View style={{
          position: 'absolute', left: `${pct}%`, marginLeft: -14,
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: cor,
          borderWidth: 3, borderColor: t.elevated,
          elevation: 6, shadowColor: cor, shadowOpacity: 0.5,
          shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
          justifyContent: 'center', alignItems: 'center',
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' }} />
        </View>
      </View>

      {/* Scale labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {ESFORCO_LABELS.map(({ label: l }) => (
          <Text key={l} style={{ fontSize: 10, fontWeight: '600', color: t.textTertiary }}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

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
      width: 24, height: 24, borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center', alignItems: 'center',
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
  const { treino, ficha, comTimer = true, comIntensidade = true } = route.params;
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

  const [comentariosEx, setComentariosEx] = useState({});
  const [focusedComentario, setFocusedComentario] = useState(null);

  // Qual serie aguarda seleção de esforco: { exId, serieIdx } | null
  const [esforcoPrompt, setEsforcoPrompt] = useState(null);
  const [esforcoSliderValue, setEsforcoSliderValue] = useState(50);
  const [quickCompleteEx, setQuickCompleteEx] = useState(null);
  const [quickCompletePeso, setQuickCompletePeso] = useState('');
  const [quickCompleteGroup, setQuickCompleteGroup] = useState(null);
  const [quickCompleteGroupPesos, setQuickCompleteGroupPesos] = useState({});

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
  const backgroundAtRef = useRef(null);

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
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundAtRef.current = Date.now();
      } else if (nextState === 'active' && backgroundAtRef.current) {
        const elapsed = Math.floor((Date.now() - backgroundAtRef.current) / 1000);
        setTempoTreino(t => t + elapsed);
        backgroundAtRef.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    listarExercicios(usuario.uid).then(setBanco).catch(() => {});
  }, []);

  useEffect(() => {
    listarExecucoesTreino(usuario.uid, treino.id)
      .then(execs => {
        if (!execs.length) return;
        const ultima = execs[0];
        setCargas(prev => {
          const next = { ...prev };
          treino.exercicios?.forEach(ex => {
            const exData = ultima.exercicios?.find(e => e.id === ex.id);
            if (!exData?.cargas?.length) return;
            const numSeries = ex.series || 3;
            next[ex.id] = Array.from({ length: numSeries }, (_, i) =>
              exData.cargas[i] ?? exData.cargas[exData.cargas.length - 1] ?? ''
            );
          });
          return next;
        });
      })
      .catch(() => {});
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
        // Auto-preenche series vazias seguintes com o peso desta serie
        const pesoAtual = cargas[exId]?.[i];
        if (pesoAtual && String(pesoAtual).trim()) {
          setCargas(prev => {
            const exCargas = [...(prev[exId] || [])];
            for (let j = i + 1; j < exCargas.length; j++) {
              if (!exCargas[j] || !String(exCargas[j]).trim()) {
                exCargas[j] = pesoAtual;
              }
            }
            return { ...prev, [exId]: exCargas };
          });
        }

        // Inicia descanso apenas se for standalone ou último do grupo
        const groupInfo = exGroupMap[exId];
        const deveIniciarDescanso = !groupInfo || groupInfo.isLastInGroup;
        if (comTimer && deveIniciarDescanso) {
          const secs = groupInfo?.descansoPorRodada
            ? groupInfo.descansoPorRodada
            : parseDescanso(descanso);
          setTimer({ seconds: secs, total: secs });
          setTimerPausado(false);
          agendarNotifDescanso(secs);
        }
        // Pede seleção de esforço (apenas se ativado)
        if (comIntensidade) {
          setEsforcoPrompt({ exId, serieIdx: i });
          setEsforcoSliderValue(50);
        }
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

  function salvarEsforco(valor) {
    if (!esforcoPrompt) return;
    const { exId, serieIdx } = esforcoPrompt;
    setEsforco(prev => {
      const arr = [...(prev[exId] || [])];
      arr[serieIdx] = valor;
      return { ...prev, [exId]: arr };
    });
  }

  function registrarEsforco(valor) {
    salvarEsforco(valor);
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

  function completarExercicio(exId, ex, peso) {
    const numSeries = ex.series || 3;
    const repsBase = String(ex.reps || '').replace(/[^0-9].*/, '') || '12';
    if (peso) {
      const pesoStr = String(peso);
      setCargas(prev => ({ ...prev, [exId]: Array(numSeries).fill(pesoStr) }));
      setRepsRealizadas(prev => ({ ...prev, [exId]: Array(numSeries).fill(repsBase) }));
    }
    setConcluidas(prev => ({ ...prev, [exId]: Array(numSeries).fill(true) }));
    setEsforcoPrompt(null);
    const idx = allExercicios.findIndex(e => e.id === exId);
    const proximo = allExercicios[idx + 1];
    setExpandido(proximo ? proximo.id : null);
  }

  function handleQuickComplete(ex) {
    const exId = ex.id;
    const jaConcluido = (concluidas[exId] || []).every(v => v === true)
      && (concluidas[exId] || []).length === (ex.series || 3);
    if (jaConcluido) {
      setConcluidas(prev => ({ ...prev, [exId]: Array(ex.series || 3).fill(false) }));
      return;
    }
    const temPeso = (cargas[exId] || []).some(c => c && String(c).trim());
    if (temPeso) {
      completarExercicio(exId, ex, null);
    } else {
      setQuickCompleteEx(ex);
      setQuickCompletePeso('');
    }
  }

  function completarGrupo(groupExs, pesos) {
    groupExs.forEach(ex => {
      const numSeries = ex.series || 3;
      const repsBase = String(ex.reps || '').replace(/[^0-9].*/, '') || '12';
      const peso = pesos?.[ex.id];
      if (peso && String(peso).trim()) {
        setCargas(prev => ({ ...prev, [ex.id]: Array(numSeries).fill(String(peso)) }));
        setRepsRealizadas(prev => ({ ...prev, [ex.id]: Array(numSeries).fill(repsBase) }));
      }
      setConcluidas(prev => ({ ...prev, [ex.id]: Array(numSeries).fill(true) }));
    });
    setEsforcoPrompt(null);
    setExpandido(null);
  }

  function handleQuickCompleteGroup(item) {
    const { grupoId, groupExs } = item;
    const allGroupDone = groupExs.every(ex =>
      (concluidas[ex.id] || []).filter(Boolean).length === (ex.series || 3)
    );
    if (allGroupDone) {
      groupExs.forEach(ex => {
        setConcluidas(prev => ({ ...prev, [ex.id]: Array(ex.series || 3).fill(false) }));
      });
      return;
    }
    const todosTemPeso = groupExs.every(ex =>
      (cargas[ex.id] || []).some(c => c && String(c).trim())
    );
    if (todosTemPeso) {
      completarGrupo(groupExs, {});
    } else {
      const pesosIniciais = {};
      groupExs.forEach(ex => {
        const existente = (cargas[ex.id] || []).find(c => c && String(c).trim());
        pesosIniciais[ex.id] = existente ? String(existente) : '';
      });
      setQuickCompleteGroup(item);
      setQuickCompleteGroupPesos(pesosIniciais);
    }
  }
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
          ...(comentariosEx[ex.id]?.trim() ? { comentario: comentariosEx[ex.id].trim() } : {}),
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

  const renderItems = useMemo(() => {
    const processed = new Set();
    const items = [];
    for (const ex of allExercicios) {
      if (processed.has(ex.id)) continue;
      const gi = exGroupMap[ex.id];
      if (gi) {
        if (gi.isFirstInGroup) {
          const grupo = (treino.metodosEspeciais || []).find(g => g.id === gi.grupoId);
          const groupExIds = grupo?.exercicioIds || [];
          const groupExs = groupExIds.map(id => allExercicios.find(e => e.id === id)).filter(Boolean);
          groupExs.forEach(e => processed.add(e.id));
          items.push({ type: 'group', grupoId: gi.grupoId, def: gi.def, descansoPorRodada: gi.descansoPorRodada, groupExs });
        }
      } else {
        processed.add(ex.id);
        items.push({ type: 'single', ex });
      }
    }
    return items;
  }, [allExercicios, exGroupMap, treino.metodosEspeciais]);

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

        {renderItems.map((item) => {
          if (item.type === 'group') {
            const { grupoId, def, groupExs } = item;
            const isOpen = expandido === grupoId;
            const maxSeries = Math.max(...groupExs.map(ex => ex.series || 3));
            const allGroupDone = groupExs.every(ex =>
              (concluidas[ex.id] || []).filter(Boolean).length === (ex.series || 3)
            );
            const doneRounds = Array.from({ length: maxSeries }).filter((_, ri) =>
              groupExs.every(ex => concluidas[ex.id]?.[ri])
            ).length;
            const dotColor = allGroupDone ? CYAN : isOpen ? def.cor : theme.border;

            return (
              <View key={grupoId}>
                <View style={[s.exCard, allGroupDone && s.exCardDone, { borderColor: def.cor + '50' }]}>

                  {/* Colored header strip */}
                  <TouchableOpacity
                    onPress={() => toggleExpandido(grupoId)}
                    activeOpacity={0.85}
                    style={{ backgroundColor: def.cor + '18', padding: 14, borderBottomWidth: 1, borderBottomColor: def.cor + '25' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: def.cor, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="flash" size={13} color="#fff" />
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: def.cor, letterSpacing: 0.2 }}>
                            {def.label.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: def.cor + 'cc', fontWeight: '500' }}>
                          {def.descricao}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={{ backgroundColor: allGroupDone ? CYAN + '25' : def.cor + '25', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: allGroupDone ? CYAN : def.cor }}>
                            {allGroupDone ? 'Concluido' : doneRounds > 0 ? `${doneRounds}/${maxSeries} rodadas` : `${maxSeries} rodadas`}
                          </Text>
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={def.cor + 'aa'} />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Exercise list (collapsed view) */}
                  <TouchableOpacity
                    onPress={() => toggleExpandido(grupoId)}
                    activeOpacity={0.75}
                    style={{ padding: 14, paddingBottom: isOpen ? 6 : 14 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <TouchableOpacity
                        style={[s.exStatusDot, { backgroundColor: allGroupDone ? CYAN : 'transparent', borderColor: dotColor, marginTop: 2 }]}
                        onPress={() => handleQuickCompleteGroup(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        {allGroupDone && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </TouchableOpacity>
                      <View style={{ flex: 1, gap: 6 }}>
                        {groupExs.map((ex, ei) => (
                          <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: def.cor + '20', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: def.cor }}>{ei + 1}</Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary, flex: 1 }} numberOfLines={1}>
                              {ex.nome}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.textTertiary }}>{ex.series}x{ex.reps}</Text>
                          </View>
                        ))}
                      </View>
                      {allGroupDone && <Ionicons name="checkmark-circle" size={20} color={CYAN} style={{ marginTop: 2 }} />}
                    </View>
                  </TouchableOpacity>

                  {/* Comments per exercise when all done */}
                  {allGroupDone && groupExs.map(ex => {
                    const texto = comentariosEx[ex.id];
                    const aberto = focusedComentario === ex.id;
                    return (
                      <View key={ex.id} style={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textTertiary, marginBottom: 4, letterSpacing: 0.4 }}>
                          {ex.nome.toUpperCase()}
                        </Text>
                        {aberto ? (
                          <TextInput
                            autoFocus
                            style={{ backgroundColor: theme.elevated, borderRadius: 8, borderWidth: 1, borderColor: theme.border, padding: 10, fontSize: 13, color: theme.textPrimary, minHeight: 48, textAlignVertical: 'top' }}
                            placeholder="Observacao sobre este exercicio..."
                            placeholderTextColor={theme.placeholder}
                            value={texto || ''}
                            onChangeText={v => setComentariosEx(prev => ({ ...prev, [ex.id]: v }))}
                            onBlur={() => {
                              setFocusedComentario(null);
                              if (!comentariosEx[ex.id]?.trim()) {
                                setComentariosEx(prev => { const next = { ...prev }; delete next[ex.id]; return next; });
                              }
                            }}
                            multiline
                          />
                        ) : texto?.trim() ? (
                          <TouchableOpacity onPress={() => setFocusedComentario(ex.id)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }} activeOpacity={0.7}>
                            <Ionicons name="chatbubble" size={13} color={CYAN} style={{ marginTop: 2 }} />
                            <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={2}>{texto}</Text>
                            <Ionicons name="pencil-outline" size={13} color={theme.textTertiary} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => { setComentariosEx(prev => ({ ...prev, [ex.id]: '' })); setFocusedComentario(ex.id); }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="chatbubble-outline" size={14} color={theme.textTertiary} />
                            <Text style={{ fontSize: 13, color: theme.textTertiary, fontWeight: '500' }}>Adicionar observacao</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}

                  {/* Body: rounds staggered */}
                  {isOpen && (
                    <View style={[s.exBody, { paddingTop: 4 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 4 }}>
                        <View style={{ flex: 1 }} />
                        <Text style={s.serieHeaderKg}>KG</Text>
                        <View style={{ width: 8 }} />
                        <Text style={s.serieHeaderReps}>REPS</Text>
                        <View style={{ width: 32 }} />
                      </View>

                      {Array.from({ length: maxSeries }).map((_, roundIdx) => {
                        const roundDone = groupExs.every(ex => concluidas[ex.id]?.[roundIdx]);
                        return (
                          <View key={roundIdx} style={{ marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <View style={{ height: 1, flex: 1, backgroundColor: theme.border }} />
                              <Text style={{ fontSize: 10, fontWeight: '700', color: roundDone ? CYAN : theme.textTertiary, letterSpacing: 0.6 }}>
                                RODADA {roundIdx + 1}
                              </Text>
                              <View style={{ height: 1, flex: 1, backgroundColor: theme.border }} />
                            </View>

                            {groupExs.map(ex => {
                              const done = !!concluidas[ex.id]?.[roundIdx];
                              const mostrarEsforco = esforcoPrompt?.exId === ex.id && esforcoPrompt?.serieIdx === roundIdx;
                              const eforcoDaSerie = esforco[ex.id]?.[roundIdx];
                              return (
                                <View key={ex.id} style={{ marginBottom: 8 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: done ? CYAN : theme.textSecondary, marginBottom: 3, paddingLeft: 2 }}>
                                    {ex.nome}
                                  </Text>
                                  <View style={[s.serieRow, done && s.serieRowDone]}>
                                    <View style={{ flex: 1 }} />
                                    <TextInput
                                      style={[s.inputKg, done && { borderColor: CYAN + '40' }]}
                                      placeholder="—"
                                      placeholderTextColor={theme.textTertiary}
                                      keyboardType="decimal-pad"
                                      value={cargas[ex.id]?.[roundIdx] || ''}
                                      onChangeText={v => setCarga(ex.id, roundIdx, v)}
                                      editable={!done}
                                    />
                                    <Text style={s.sep}>×</Text>
                                    <TextInput
                                      style={[s.inputReps, done && { borderColor: CYAN + '40' }]}
                                      keyboardType="number-pad"
                                      value={repsRealizadas[ex.id]?.[roundIdx] || ''}
                                      onChangeText={v => setReps(ex.id, roundIdx, v)}
                                      editable={!done}
                                    />
                                    <TouchableOpacity
                                      style={[s.checkBtn, done ? { backgroundColor: CYAN, borderColor: CYAN } : { backgroundColor: 'transparent', borderColor: theme.border }]}
                                      onPress={() => toggleSerie(ex.id, roundIdx, ex.descanso)}
                                      activeOpacity={0.7}
                                    >
                                      {done && <Ionicons name="checkmark" size={15} color="#fff" />}
                                    </TouchableOpacity>
                                  </View>
                                  {mostrarEsforco && (
                                    <EsforcoSlider value={esforcoSliderValue} onChange={setEsforcoSliderValue} onSave={salvarEsforco} onDismiss={() => setEsforcoPrompt(null)} t={theme} />
                                  )}
                                  {done && !mostrarEsforco && eforcoDaSerie != null && (() => {
                                    const v = typeof eforcoDaSerie === 'number' ? eforcoDaSerie : { facil: 33, moderado: 66, dificil: 100 }[eforcoDaSerie] ?? null;
                                    if (v === null) return null;
                                    const cor = interpolarCor(v);
                                    return (
                                      <View style={{ alignItems: 'flex-end', marginTop: -2, marginBottom: 2 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: cor + '15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: cor }} />
                                          <Text style={{ fontSize: 10, fontWeight: '800', color: cor }}>{v}</Text>
                                          <Text style={{ fontSize: 9, fontWeight: '600', color: cor + 'aa' }}>/100</Text>
                                        </View>
                                      </View>
                                    );
                                  })()}
                                </View>
                              );
                            })}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            );
          }

          // Single exercise card
          const ex = item.ex;
          const exConcluidas = concluidas[ex.id] || [];
          const exDone = exConcluidas.filter(Boolean).length;
          const allDone = exDone === (ex.series || 3);
          const isOpen = expandido === ex.id;
          const dotColor = allDone ? CYAN : isOpen ? theme.red : theme.border;

          return (
            <View key={ex.id}>
              <View style={[s.exCard, allDone && s.exCardDone]}>
                {/* Accordion header */}
                <TouchableOpacity style={s.exCardHeader} onPress={() => toggleExpandido(ex.id)} activeOpacity={0.75}>
                  <TouchableOpacity
                    style={[s.exStatusDot, { backgroundColor: allDone ? CYAN : 'transparent', borderColor: dotColor }]}
                    onPress={() => handleQuickComplete(ex)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    {allDone && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
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
                    ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {comentariosEx[ex.id]?.trim() ? (
                          <Ionicons name="chatbubble" size={14} color={CYAN} />
                        ) : null}
                        <Ionicons name="checkmark-circle" size={20} color={CYAN} />
                      </View>
                    : <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} style={s.exChevron} />
                  }
                </TouchableOpacity>

                {/* Comentario — visivel sempre que concluido */}
                {allDone && (() => {
                  const texto = comentariosEx[ex.id];
                  const aberto = focusedComentario === ex.id;
                  return (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }}>
                      {aberto ? (
                        <TextInput
                          autoFocus
                          style={{ backgroundColor: theme.elevated, borderRadius: 8, borderWidth: 1, borderColor: theme.border, padding: 10, fontSize: 13, color: theme.textPrimary, minHeight: 56, textAlignVertical: 'top' }}
                          placeholder="Observacao sobre este exercicio..."
                          placeholderTextColor={theme.placeholder}
                          value={texto || ''}
                          onChangeText={v => setComentariosEx(prev => ({ ...prev, [ex.id]: v }))}
                          onBlur={() => {
                            setFocusedComentario(null);
                            if (!comentariosEx[ex.id]?.trim()) {
                              setComentariosEx(prev => { const next = { ...prev }; delete next[ex.id]; return next; });
                            }
                          }}
                          multiline
                        />
                      ) : texto?.trim() ? (
                        <TouchableOpacity onPress={() => setFocusedComentario(ex.id)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }} activeOpacity={0.7}>
                          <Ionicons name="chatbubble" size={13} color={CYAN} style={{ marginTop: 2 }} />
                          <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1 }} numberOfLines={2}>{texto}</Text>
                          <Ionicons name="pencil-outline" size={13} color={theme.textTertiary} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => { setComentariosEx(prev => ({ ...prev, [ex.id]: '' })); setFocusedComentario(ex.id); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="chatbubble-outline" size={14} color={theme.textTertiary} />
                          <Text style={{ fontSize: 13, color: theme.textTertiary, fontWeight: '500' }}>Adicionar observacao</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}

                {/* Accordion body — series */}
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
                              style={[s.checkBtn, done ? { backgroundColor: CYAN, borderColor: CYAN } : { backgroundColor: 'transparent', borderColor: theme.border }]}
                              onPress={() => toggleSerie(ex.id, i, ex.descanso)}
                              activeOpacity={0.7}
                            >
                              {done && <Ionicons name="checkmark" size={15} color="#fff" />}
                            </TouchableOpacity>
                          </View>
                          {mostrarEsforco && (
                            <EsforcoSlider value={esforcoSliderValue} onChange={setEsforcoSliderValue} onSave={salvarEsforco} onDismiss={() => setEsforcoPrompt(null)} t={theme} />
                          )}
                          {done && !mostrarEsforco && eforcoDaSerie != null && (() => {
                            const v = typeof eforcoDaSerie === 'number' ? eforcoDaSerie : { facil: 33, moderado: 66, dificil: 100 }[eforcoDaSerie] ?? null;
                            if (v === null) return null;
                            const cor = interpolarCor(v);
                            return (
                              <View style={{ alignItems: 'flex-end', marginTop: -2, marginBottom: 2 }}>
                                <Text style={{ fontSize: 10, color: cor, fontWeight: '700' }}>Esforco {v}/100</Text>
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

      {/* Modal — concluir grupo rapidamente */}
      <Modal
        visible={quickCompleteGroup !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickCompleteGroup(null)}
      >
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={[s.extraSheet, { maxHeight: '80%' }]} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={s.extraHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: (quickCompleteGroup?.def.cor || '#8b5cf6') + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Ionicons name="flash" size={11} color={quickCompleteGroup?.def.cor || '#8b5cf6'} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: quickCompleteGroup?.def.cor || '#8b5cf6' }}>
                  {quickCompleteGroup?.def.label}
                </Text>
              </View>
            </View>
            <Text style={[s.extraTitulo, { marginBottom: 16 }]}>Qual foi o peso usado?</Text>

            {(quickCompleteGroup?.groupExs || []).map(ex => (
              <View key={ex.id} style={{ marginBottom: 14 }}>
                <Text style={s.extraLabel}>{ex.nome.toUpperCase()}</Text>
                <TextInput
                  style={s.extraInput}
                  placeholder="Ex: 20 kg"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="decimal-pad"
                  value={quickCompleteGroupPesos[ex.id] || ''}
                  onChangeText={v => setQuickCompleteGroupPesos(prev => ({ ...prev, [ex.id]: v }))}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[s.btnConcluir, { marginBottom: 10, marginTop: 4 }]}
              onPress={() => {
                completarGrupo(quickCompleteGroup.groupExs, quickCompleteGroupPesos);
                setQuickCompleteGroup(null);
              }}
            >
              <Text style={s.btnConcluirTexto}>Concluir exercicios</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnPular, { marginBottom: 16 }]}
              onPress={() => {
                completarGrupo(quickCompleteGroup.groupExs, {});
                setQuickCompleteGroup(null);
              }}
            >
              <Text style={s.btnPularTexto}>Concluir sem informar pesos</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal — concluir exercicio rapidamente */}
      <Modal
        visible={quickCompleteEx !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickCompleteEx(null)}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[s.extraSheet, { paddingBottom: 32 }]}>
            <View style={s.extraHandle} />
            <Text style={[s.extraTitulo, { marginBottom: 4 }]}>
              {quickCompleteEx?.nome}
            </Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 20 }}>
              {quickCompleteEx?.series || 3} series x {quickCompleteEx?.reps || '12'} reps
            </Text>

            <Text style={s.extraLabel}>QUAL FOI O PESO USADO? (kg)</Text>
            <TextInput
              style={[s.extraInput, { marginBottom: 16 }]}
              placeholder="Ex: 20"
              placeholderTextColor={theme.placeholder}
              keyboardType="decimal-pad"
              value={quickCompletePeso}
              onChangeText={setQuickCompletePeso}
              autoFocus
            />

            <TouchableOpacity
              style={[s.btnConcluir, { marginBottom: 10 }]}
              onPress={() => {
                completarExercicio(quickCompleteEx.id, quickCompleteEx, quickCompletePeso);
                setQuickCompleteEx(null);
              }}
              disabled={!quickCompletePeso.trim()}
            >
              <Text style={s.btnConcluirTexto}>Concluir exercicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.btnPular}
              onPress={() => {
                completarExercicio(quickCompleteEx.id, quickCompleteEx, null);
                setQuickCompleteEx(null);
              }}
            >
              <Text style={s.btnPularTexto}>Concluir sem informar peso</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
