import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { listarFichasAluno } from '../../services/fichas';
import { listarTreinosFicha } from '../../services/treinos';
import { listarHistoricoAluno } from '../../services/execucoes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import { TIPOS_PERIOD } from '../../utils/periodizacao';

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const PERIOD_DESC = {
  adaptativa: 'Fase inicial para o corpo se adaptar ao treino.',
  resistencia: 'Cargas moderadas para desenvolver resistencia muscular.',
  hipertrofia: 'Volume e carga elevados para maximizar crescimento.',
  forca: 'Poucos reps com cargas pesadas para forca maxima.',
  regenerativa: 'Movimentos leves. Deixe o corpo descansar.',
  deload: 'Semana de descarga. Volume e carga reduzidos.',
};

function semanaAtualDaFicha(ficha) {
  const inicio = ficha.criadoEm?.toDate?.();
  if (!inicio) return 0;
  const diff = Date.now() - inicio.getTime();
  const idx = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, Math.min(idx, (ficha.semanas || 1) - 1));
}

function periodizacaoDaSemana(treinos, semanaIdx) {
  for (const t of treinos) {
    const item = (t.periodizacao || [])[semanaIdx];
    if (!item) continue;
    const tipo = typeof item === 'string' ? item : item.tipo;
    const found = TIPOS_PERIOD.find(p => p.id === tipo);
    if (found) return { tipo: found, series: item.series, reps: item.reps, carga: item.carga };
  }
  return null;
}

function calcularStats(historico) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diasUnicos = new Set(
    historico.map(e => e.dataHora?.toDate?.()?.toISOString().split('T')[0]).filter(Boolean)
  );

  const contarStreak = (from) => {
    const d = new Date(from);
    let s = 0;
    while (diasUnicos.has(d.toISOString().split('T')[0])) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  };

  let streak = contarStreak(hoje);
  if (streak === 0) {
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    streak = contarStreak(ontem);
  }

  const domingoSemana = new Date(hoje);
  domingoSemana.setDate(hoje.getDate() - hoje.getDay());

  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingoSemana);
    d.setDate(domingoSemana.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    return {
      label: DIAS_SEMANA[d.getDay()],
      treinou: d <= hoje && diasUnicos.has(iso),
      isHoje: iso === hoje.toISOString().split('T')[0],
      isFuturo: d > hoje,
    };
  });

  const treinosSemana = semana.filter(d => d.treinou).length;

  const treinosMes = historico.filter(e => {
    const d = e.dataHora?.toDate?.();
    return d && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  }).length;

  const ESFORCO_VALOR = { facil: 33, moderado: 66, dificil: 100 };
  let intensidade = 0;
  let mediaCarga = 0;
  if (historico.length > 0) {
    const exs = historico[0].exercicios || [];
    const todasEsforcas = exs.flatMap(ex => (ex.esforco || []).filter(Boolean));
    if (todasEsforcas.length > 0) {
      intensidade = Math.round(
        todasEsforcas.reduce((a, e) => a + (ESFORCO_VALOR[e] || 0), 0) / todasEsforcas.length
      );
    }
    let somaCargas = 0, countCargas = 0;
    exs.forEach(ex => {
      (ex.cargas || []).forEach(c => {
        const v = parseFloat(c);
        if (!isNaN(v) && v > 0) { somaCargas += v; countCargas++; }
      });
    });
    mediaCarga = countCargas > 0 ? Math.round(somaCargas / countCargas) : 0;
  }

  return { streak, semana, treinosSemana, treinosMes, intensidade, mediaCarga };
}

function makeDash(t) {
  return {
    card: { backgroundColor: t.surface, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: t.border },
    body: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    streakCol: { alignItems: 'center', width: 72 },
    streakNum: { fontSize: 42, fontWeight: '800', color: t.textPrimary, letterSpacing: -1, lineHeight: 46 },
    streakLabel: { fontSize: 11, color: t.textSecondary, textAlign: 'center', lineHeight: 15, marginTop: 4 },
    dividerV: { width: 1, height: 72, backgroundColor: t.border },
    weekCol: { flex: 1 },
    weekTitle: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 1, marginBottom: 10 },
    ringRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
    ringCol: { flex: 1, alignItems: 'center', gap: 5 },
    ring: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.elevated, borderWidth: 1.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center' },
    ringActive: { backgroundColor: t.red, borderColor: t.red },
    ringToday: { borderColor: t.red, backgroundColor: 'transparent' },
    ringDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.red },
    ringLabel: { fontSize: 9, fontWeight: '600', color: t.textTertiary },
    ringLabelToday: { color: t.red, fontWeight: '800' },
    weekStat: { fontSize: 13 },
    intensWrap: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border },
    intensHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    intensTitle: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 1 },
    intensBadge: { fontSize: 12, fontWeight: '700' },
    barBg: { height: 6, backgroundColor: t.elevated, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },
    mediaCarga: { fontSize: 11, color: t.textSecondary, marginTop: 6 },
  };
}

function makeScreenStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg },
    content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingBottom: 20, marginBottom: 20,
      borderBottomWidth: 1, borderBottomColor: t.border,
    },
    cumprimento: { fontSize: 13, color: t.textSecondary, marginBottom: 2 },
    nome: { fontSize: 24, fontWeight: '800', color: t.textPrimary, letterSpacing: -0.3 },
    subtitulo: { fontSize: 13, color: t.textSecondary, marginTop: 3 },
    iconBadge: { width: 52, height: 84 },
    semFicha: { alignItems: 'center', paddingTop: 60, gap: 10 },
    semFichaTexto: { fontSize: 16, fontWeight: '600', color: t.textSecondary, textAlign: 'center' },
    semFichaSubtitulo: { fontSize: 13, color: t.textTertiary, textAlign: 'center' },
    fichaCard: { backgroundColor: t.surface, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: t.border },
    fichaTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    fichaNome: { fontSize: 17, fontWeight: '700', color: t.textPrimary, marginBottom: 3 },
    fichaUltima: { fontSize: 12, color: t.textSecondary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginLeft: 10 },
    statusTexto: { fontSize: 11, fontWeight: '600' },
    progressoWrap: { marginBottom: 14 },
    progressoNums: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
    progressoPct: { fontSize: 13, color: t.textSecondary },
    progressoPctBig: { fontSize: 20, fontWeight: '800', color: t.textPrimary },
    diasRestantes: { fontSize: 13, color: t.textSecondary },
    barBg: { height: 6, backgroundColor: t.elevated, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },
    periodChip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14, backgroundColor: t.elevated },
    periodLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
    periodDesc: { fontSize: 11, color: t.textSecondary, lineHeight: 15 },
    periodDetalhe: { fontSize: 12, fontWeight: '700', color: t.textSecondary, marginTop: 2 },
    ctaCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: t.red },
    ctaInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    ctaLeft: { flex: 1 },
    ctaEyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8, marginBottom: 3 },
    ctaNome: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 3 },
    ctaInfo: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    ctaPlay: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    ctaDescanso: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: t.elevated, borderRadius: 12 },
    ctaDescansoText: { fontSize: 14, color: t.textSecondary },
  };
}

function Dashboard({ historico }) {
  const { theme: C } = useTheme();
  const dash = useMemo(() => makeDash(C), [C]);
  const { streak, semana, treinosSemana, treinosMes, intensidade, mediaCarga } = calcularStats(historico);

  const intensidadeCor =
    intensidade === 0 ? C.textTertiary :
    intensidade <= 40 ? '#22c55e' :
    intensidade <= 70 ? '#f59e0b' : C.red;

  const intensidadeLabel =
    intensidade === 0 ? '—' :
    intensidade <= 40 ? 'Leve' :
    intensidade <= 70 ? 'Moderada' : 'Intensa';

  return (
    <View style={dash.card}>
      <View style={dash.body}>
        <View style={dash.weekCol}>
          <Text style={dash.weekTitle}>ESTA SEMANA</Text>
          <View style={dash.ringRow}>
            {semana.map((dia, i) => (
              <View key={i} style={dash.ringCol}>
                <View style={[
                  dash.ring,
                  dia.treinou && dash.ringActive,
                  dia.isHoje && !dia.treinou && dash.ringToday,
                ]}>
                  {dia.treinou
                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                    : dia.isHoje
                      ? <View style={dash.ringDot} />
                      : null
                  }
                </View>
                <Text style={[dash.ringLabel, dia.isHoje && dash.ringLabelToday]}>
                  {dia.label}
                </Text>
              </View>
            ))}
          </View>
          <Text style={dash.weekStat}>
            <Text style={{ color: C.textPrimary, fontWeight: '700' }}>{treinosSemana}</Text>
            <Text style={{ color: C.textSecondary }}>/7 dias  ·  {treinosMes} no mes</Text>
          </Text>
        </View>

        <View style={dash.dividerV} />

        <View style={dash.streakCol}>
          <Text style={dash.streakNum}>{streak}</Text>
          <Text style={dash.streakLabel}>dias{'\n'}seguidos</Text>
          <Ionicons
            name={streak === 0 ? 'flame-outline' : 'flame'}
            size={20}
            color={streak === 0 ? C.textTertiary : C.red}
            style={{ marginTop: 6 }}
          />
        </View>
      </View>

      {historico.length > 0 && (
        <View style={dash.intensWrap}>
          <View style={dash.intensHeader}>
            <Text style={dash.intensTitle}>ULTIMO TREINO</Text>
            <Text style={[dash.intensBadge, { color: intensidadeCor }]}>{intensidadeLabel}</Text>
          </View>
          <View style={dash.barBg}>
            <View style={[dash.barFill, { width: `${intensidade}%`, backgroundColor: intensidadeCor }]} />
          </View>
          {mediaCarga > 0 && (
            <Text style={dash.mediaCarga}>{mediaCarga} kg media de carga</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function InicioScreen({ navigation }) {
  const { usuario } = useAuth();
  const { theme: C } = useTheme();
  const s = useMemo(() => makeScreenStyles(C), [C]);
  const [fichasComTreinos, setFichasComTreinos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        try {
          const fichas = await listarFichasAluno(usuario.uid);
          const hist = await listarHistoricoAluno(usuario.uid);
          setHistorico(hist);

          const ultimaExecPorFicha = {};
          const execPorFicha = {};
          hist.forEach(e => {
            if (!execPorFicha[e.fichaId]) execPorFicha[e.fichaId] = [];
            execPorFicha[e.fichaId].push(e);
            const atual = ultimaExecPorFicha[e.fichaId];
            const dataE = e.dataHora?.toDate?.() || new Date(0);
            if (!atual || dataE > (atual.dataHora?.toDate?.() || new Date(0))) {
              ultimaExecPorFicha[e.fichaId] = e;
            }
          });

          const fichasAtivas = fichas.filter(f => f.dataVencimento);
          const comTreinos = await Promise.all(
            fichasAtivas.map(async f => {
              const treinos = await listarTreinosFicha(f.id);
              return { ...f, treinos, ultimaExec: ultimaExecPorFicha[f.id] || null, totalExecs: execPorFicha[f.id]?.length || 0 };
            })
          );

          comTreinos.sort((a, b) => {
            const da = a.ultimaExec?.dataHora?.toDate?.() || new Date(0);
            const db = b.ultimaExec?.dataHora?.toDate?.() || new Date(0);
            return db - da;
          });

          setFichasComTreinos(comTreinos);
        } catch (e) {
          console.error(e);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, [])
  );

  if (carregando) {
    return <View style={s.center}><ActivityIndicator color={C.red} size="large" /></View>;
  }

  const hora = new Date().getHours();
  const cumprimento = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = usuario?.nome?.split(' ')[0] || '';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.cumprimento}>{cumprimento},</Text>
          <Text style={s.nome}>{primeiroNome}</Text>
          <Text style={s.subtitulo}>Sua ficha ativa</Text>
        </View>
        <Image source={require('../../../assets/minilogo.png')} style={s.iconBadge} resizeMode="contain" />
      </View>

      {fichasComTreinos.length === 0 ? (
        <View style={s.semFicha}>
          <Ionicons name="document-text-outline" size={52} color={C.textTertiary} />
          <Text style={s.semFichaTexto}>Nenhuma ficha ativa.</Text>
          <Text style={s.semFichaSubtitulo}>Aguarde seu personal trainer criar sua ficha.</Text>
        </View>
      ) : (
        fichasComTreinos.map(ficha => {
          const status = calcularStatusFicha(ficha.dataVencimento);
          const { pct, diasRestantes } = ficha.criadoEm
            ? calcularProgresso(ficha.criadoEm, ficha.dataVencimento)
            : { pct: 0, diasRestantes: 0 };

          const ultimaExecTexto = ficha.ultimaExec?.dataHora
            ? `Ultimo treino: ${ficha.ultimaExec.dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
            : 'Nenhum treino ainda';

          const semanaIdx = semanaAtualDaFicha(ficha);
          const period = periodizacaoDaSemana(ficha.treinos, semanaIdx);
          const diaHoje = DIAS_PT[new Date().getDay()];
          const treinoHoje = ficha.treinos.find(t => t.diasDaSemana?.includes(diaHoje));
          const statusCor = CORES_STATUS[status];

          return (
            <View key={ficha.id} style={s.fichaCard}>

              <View style={s.fichaTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fichaNome}>{ficha.nome}</Text>
                  <Text style={s.fichaUltima}>{ultimaExecTexto}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: statusCor + '18', borderColor: statusCor + '35' }]}>
                  <Text style={[s.statusTexto, { color: statusCor }]}>{LABELS_STATUS[status]}</Text>
                </View>
              </View>

              <View style={s.progressoWrap}>
                <View style={s.progressoNums}>
                  <Text style={s.progressoPct}>
                    <Text style={s.progressoPctBig}>{pct}</Text>% concluido
                  </Text>
                  <Text style={s.diasRestantes}>
                    {status === 'vencida' ? 'Vencida' : `${diasRestantes} dias`}
                  </Text>
                </View>
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${pct}%`, backgroundColor: statusCor }]} />
                </View>
              </View>

              {period && (
                <View style={[s.periodChip, { borderColor: period.tipo.cor + '28' }]}>
                  <Ionicons name={period.tipo.icon} size={13} color={period.tipo.cor} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.periodLabel, { color: period.tipo.cor }]}>
                      Semana {semanaIdx + 1} — {period.tipo.label}
                    </Text>
                    {PERIOD_DESC[period.tipo.id] && (
                      <Text style={s.periodDesc}>{PERIOD_DESC[period.tipo.id]}</Text>
                    )}
                  </View>
                  {(period.series || period.reps) && (
                    <Text style={s.periodDetalhe}>
                      {[period.series && `${period.series}x`, period.reps && `${period.reps}`].filter(Boolean).join(' ')}
                    </Text>
                  )}
                </View>
              )}

              {treinoHoje ? (
                <Pressable
                  style={({ pressed }) => [s.ctaCard, pressed && { opacity: 0.88 }]}
                  onPress={() => navigation.navigate('VisualizarTreino', { treino: treinoHoje, ficha })}
                >
                  <View style={s.ctaInner}>
                    <View style={s.ctaLeft}>
                      <Text style={s.ctaEyebrow}>TREINO DE HOJE</Text>
                      <Text style={s.ctaNome}>Treino {treinoHoje.letra}</Text>
                      <Text style={s.ctaInfo}>
                        {treinoHoje.diasDaSemana?.join(' · ')}  ·  {treinoHoje.exercicios?.length || 0} exercicios
                      </Text>
                    </View>
                    <View style={s.ctaPlay}>
                      <Ionicons name="play" size={18} color="#fff" />
                    </View>
                  </View>
                </Pressable>
              ) : (
                <View style={s.ctaDescanso}>
                  <Ionicons name="moon-outline" size={15} color={C.textSecondary} />
                  <Text style={s.ctaDescansoText}>Dia de descanso</Text>
                </View>
              )}

            </View>
          );
        })
      )}

      <Dashboard historico={historico} />

    </ScrollView>
  );
}
