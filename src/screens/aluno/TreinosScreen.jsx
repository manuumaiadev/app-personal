import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { listarFichasAluno } from '../../services/fichas';
import { listarTreinosFicha } from '../../services/treinos';
import { listarHistoricoAluno } from '../../services/execucoes';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import { TIPOS_PERIOD } from '../../utils/periodizacao';

const PERIOD_DESC = {
  adaptativa: 'Fase inicial para adaptacao ao treino.',
  resistencia: 'Cargas moderadas para resistencia muscular.',
  hipertrofia: 'Volume elevado para maximizar crescimento.',
  forca: 'Cargas pesadas para forca maxima.',
  regenerativa: 'Movimentos leves. Corpo descansando.',
  deload: 'Semana de descarga. Volume reduzido.',
};

function semanaAtualDaFicha(ficha) {
  const inicio = ficha.criadoEm?.toDate?.();
  if (!inicio) return 0;
  const diff = Date.now() - inicio.getTime();
  const idx = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, Math.min(idx, (ficha.semanas || 1) - 1));
}

function resolverPeriod(treinos, semanaIdx) {
  for (const t of treinos) {
    const item = (t.periodizacao || [])[semanaIdx];
    if (!item) continue;
    const tipoId = typeof item === 'string' ? item : item.tipo;
    const tipo = TIPOS_PERIOD.find(p => p.id === tipoId);
    if (tipo) return {
      tipo,
      series: (typeof item === 'object' && item.series) || tipo.series,
      reps: (typeof item === 'object' && item.reps) || tipo.reps,
      carga: (typeof item === 'object' && item.carga) || tipo.carga,
    };
  }
  return null;
}

function todasSemanas(treinos, total) {
  return Array.from({ length: total || 0 }, (_, i) => ({
    idx: i,
    semana: i + 1,
    period: resolverPeriod(treinos, i),
  }));
}

const ESFORCO_VALOR_T = { facil: 33, moderado: 66, dificil: 100 };

function calcIntensidadeItem(item) {
  const todas = (item.exercicios || []).flatMap(ex => (ex.esforco || []).filter(Boolean));
  if (!todas.length) return null;
  return Math.round(todas.reduce((a, e) => a + (ESFORCO_VALOR_T[e] || 0), 0) / todas.length);
}

function corIntensidade(v) {
  if (v === null) return '#9ca3af';
  if (v <= 40) return '#22c55e';
  if (v <= 70) return '#f59e0b';
  return '#ef4444';
}

// ── Inline evolution section ─────────────────────────────────────────────────
function SecaoEvolucao({ ficha, semanaAtual, pct, diasRestantes, statusCor, historico, theme: t }) {
  const semanas = todasSemanas(ficha.treinos, ficha.semanas)
    .filter(s => s.period !== null && s.idx !== semanaAtual);

  const letras = new Set(ficha.treinos.map(tr => tr.letra));
  const sessoes = [...historico]
    .filter(item => letras.has(item.letra))
    .slice(0, 8)
    .reverse()
    .map(item => {
      const intens = calcIntensidadeItem(item);
      const data = item.dataHora?.toDate();
      return {
        id: item.id,
        letra: item.letra || '?',
        intens,
        cor: corIntensidade(intens),
        dia: data ? data.getDate() : '-',
      };
    });
  const temIntens = sessoes.some(s => s.intens !== null);

  return (
    <View style={{ marginTop: 4 }}>
      {/* Intensity chart */}
      {temIntens && sessoes.length > 0 && (
        <View style={{ marginBottom: 14, backgroundColor: t.elevated, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 12 }}>
            INTENSIDADE DOS TREINOS
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 68 }}>
            {sessoes.map(s => {
              const barH = s.intens !== null ? Math.max(4, (s.intens / 100) * 50) : 4;
              return (
                <View key={s.id} style={{ flex: 1, alignItems: 'center' }}>
                  {s.intens !== null && (
                    <Text style={{ fontSize: 8, fontWeight: '700', color: s.cor, marginBottom: 2 }}>{s.intens}%</Text>
                  )}
                  <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <View style={{ height: barH, backgroundColor: s.cor, borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: t.textSecondary, marginTop: 5 }}>{s.letra}</Text>
                  <Text style={{ fontSize: 8, color: t.textTertiary }}>{s.dia}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            {[['#22c55e', 'Leve'], ['#f59e0b', 'Moderada'], ['#ef4444', 'Intensa']].map(([cor, label]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cor }} />
                <Text style={{ fontSize: 10, color: t.textSecondary }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Periodization weeks list */}
      {semanas.map(({ idx, semana, period }) => {
        const atual = idx === semanaAtual;
        const passada = idx < semanaAtual;
        const periodCor = period?.tipo?.cor || t.textTertiary;

        return (
          <View
            key={idx}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              padding: 12,
              borderRadius: 12,
              marginBottom: 6,
              backgroundColor: atual ? periodCor + '12' : t.elevated,
              borderWidth: atual ? 1.5 : 1,
              borderColor: atual ? periodCor : t.border,
              opacity: !passada && !atual ? 0.65 : 1,
            }}
          >
            <View style={{
              width: 30, height: 30, borderRadius: 15, marginTop: 1,
              backgroundColor: passada ? '#22c55e20' : atual ? periodCor + '22' : t.surface,
              justifyContent: 'center', alignItems: 'center', flexShrink: 0,
            }}>
              {passada
                ? <Ionicons name="checkmark" size={14} color="#22c55e" />
                : period
                  ? <Ionicons name={period.tipo.icon} size={13} color={atual ? periodCor : t.textTertiary} />
                  : <Text style={{ fontSize: 10, color: t.textTertiary, fontWeight: '700' }}>{semana}</Text>
              }
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: passada ? '#22c55e' : t.textTertiary }}>
                  Semana {semana}
                </Text>
                {atual && (
                  <View style={{ backgroundColor: periodCor + '22', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: periodCor }}>ATUAL</Text>
                  </View>
                )}
              </View>

              <Text style={{
                fontSize: 14, fontWeight: '700', marginBottom: 2,
                color: passada ? t.textSecondary : atual ? periodCor : t.textPrimary,
              }}>
                {period.tipo.label}
              </Text>
              {PERIOD_DESC[period.tipo.id] && !passada && (
                <Text style={{ fontSize: 11, color: t.textSecondary, lineHeight: 16, marginBottom: 3 }}>
                  {PERIOD_DESC[period.tipo.id]}
                </Text>
              )}
              <Text style={{ fontSize: 11, fontWeight: '600', color: passada ? t.textTertiary : t.textSecondary }}>
                {[
                  period.series && `${period.series} series`,
                  period.reps && `${period.reps} reps`,
                  period.carga && `${period.carga}% carga`,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg },
    scroll: { paddingHorizontal: 22, paddingTop: 60, paddingBottom: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
    titulo: { fontSize: 26, fontWeight: '800', color: t.textPrimary, marginBottom: 20 },
    vazio: { alignItems: 'center', paddingTop: 40, gap: 8 },
    vazioTexto: { fontSize: 16, fontWeight: '600', color: t.textSecondary },
    vazioSub: { color: t.textTertiary, textAlign: 'center' },

    fichaCard: { backgroundColor: t.surface, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: t.border },
    fichaTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    fichaNome: { fontSize: 18, fontWeight: '800', color: t.textPrimary, letterSpacing: -0.3 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeTexto: { fontSize: 11, fontWeight: '700' },

    periodBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
    periodLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
    periodDesc: { fontSize: 11, color: t.textSecondary, lineHeight: 15, marginBottom: 3 },
    periodDetalhe: { fontSize: 12, fontWeight: '600', color: t.textSecondary },

    progressoWrap: { marginBottom: 14 },
    progressoNums: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 },
    progressoPct: { fontSize: 13, color: t.textSecondary },
    progressoPctBig: { fontSize: 22, fontWeight: '800', color: t.textPrimary },
    diasRestantes: { fontSize: 13, color: t.textSecondary },
    progressoBg: { height: 12, backgroundColor: t.elevated, borderRadius: 6, overflow: 'hidden' },
    progressoBar: { height: 12, borderRadius: 6 },

    timelineWrap: { marginBottom: 14 },
    timelineLabel: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
    timelineRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    weekDot: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    weekDotLabel: { fontSize: 9, fontWeight: '700', marginTop: 3 },

    evolToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, marginBottom: 4 },
    evolToggleTexto: { fontSize: 13, fontWeight: '700', color: t.red, flex: 1 },
    evolDivider: { height: 1, backgroundColor: t.border, marginBottom: 14 },

    treinosLabel: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 1, marginBottom: 10, marginTop: 4 },
    semTreino: { fontSize: 13, color: t.textSecondary, textAlign: 'center', paddingVertical: 10 },

    treinoCard: { backgroundColor: t.elevated, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
    treinoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    treinoLetra: { width: 44, height: 44, borderRadius: 12, backgroundColor: t.red + '18', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    treinoLetraTexto: { color: t.red, fontWeight: '800', fontSize: 18 },
    treinoNome: { fontSize: 14, fontWeight: '700', color: t.textPrimary },
    treinoDias: { fontSize: 12, color: t.textSecondary, marginTop: 1 },
    treinoExsCount: { fontSize: 11, color: t.textTertiary, marginTop: 1 },
    treinoActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    playBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center' },

    exListWrap: { borderTopWidth: 1, borderTopColor: t.border, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
    exItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.border + '60' },
    exNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    exNumTexto: { fontSize: 10, fontWeight: '700', color: t.textTertiary },
    exNome: { flex: 1, fontSize: 13, fontWeight: '600', color: t.textPrimary },
    exDetalhe: { fontSize: 12, color: t.textSecondary },
    iniciarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, backgroundColor: t.red, borderRadius: 10, padding: 12 },
    iniciarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

    secaoTitulo: { fontSize: 18, fontWeight: '700', color: t.textPrimary, marginTop: 8, marginBottom: 14 },
    histCard: { backgroundColor: t.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border },
    histHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    letraBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: t.red + '20', justifyContent: 'center', alignItems: 'center' },
    letraTexto: { color: t.red, fontWeight: '700', fontSize: 18 },
    histData: { fontWeight: '600', color: t.textPrimary, textTransform: 'capitalize' },
    histQtd: { color: t.textSecondary, fontSize: 13 },
    histDetalhes: { marginTop: 12, gap: 6, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10 },
    histExRow: { flexDirection: 'row', justifyContent: 'space-between' },
    histExNome: { color: t.textPrimary, fontWeight: '500' },
    histExCargas: { color: t.textSecondary, fontSize: 13 },
    expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
    expandTexto: { fontSize: 13, fontWeight: '600', color: t.red },
  };
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function TreinosScreen({ navigation }) {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [fichas, setFichas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [histItemExpandido, setHistItemExpandido] = useState(null);
  const [histExpandido, setHistExpandido] = useState(false);
  const [treinoExpandido, setTreinoExpandido] = useState(null);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        try {
          const [todas, hist] = await Promise.all([
            listarFichasAluno(usuario.uid),
            listarHistoricoAluno(usuario.uid),
          ]);
          setHistorico(hist);
          const ativas = todas.filter(f => f.dataVencimento);
          const comTreinos = await Promise.all(
            ativas.map(async f => ({ ...f, treinos: await listarTreinosFicha(f.id) }))
          );
          comTreinos.sort((a, b) => {
            const ordem = { ativa: 0, a_vencer: 1, vencida: 2 };
            return (ordem[calcularStatusFicha(a.dataVencimento)] ?? 3) -
                   (ordem[calcularStatusFicha(b.dataVencimento)] ?? 3);
          });
          setFichas(comTreinos);
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
    return <View style={s.center}><ActivityIndicator color={theme.red} size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.titulo}>Treinos</Text>

      {fichas.length === 0 ? (
        <View style={s.vazio}>
          <Ionicons name="barbell-outline" size={52} color={theme.textTertiary} />
          <Text style={s.vazioTexto}>Nenhuma ficha ativa.</Text>
          <Text style={s.vazioSub}>Aguarde seu personal criar sua ficha.</Text>
        </View>
      ) : (
        fichas.map(ficha => {
          const status = calcularStatusFicha(ficha.dataVencimento);
          const { pct, diasRestantes } = ficha.criadoEm
            ? calcularProgresso(ficha.criadoEm, ficha.dataVencimento)
            : { pct: 0, diasRestantes: 0 };
          const semanaIdx = semanaAtualDaFicha(ficha);
          const period = resolverPeriod(ficha.treinos, semanaIdx);
          const statusCor = CORES_STATUS[status];
          const semanas = todasSemanas(ficha.treinos, ficha.semanas);
          const temPeriodizacao = semanas.some(s => s.period !== null);
          return (
            <View key={ficha.id} style={s.fichaCard}>

              {/* Header */}
              <View style={s.fichaTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fichaNome}>{ficha.nome}</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Semana {semanaIdx + 1} de {ficha.semanas || '—'}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: statusCor + '20' }]}>
                  <Text style={[s.badgeTexto, { color: statusCor }]}>{LABELS_STATUS[status]}</Text>
                </View>
              </View>

              {/* Week timeline dots — CRONOGRAMA above period banner */}
              {temPeriodizacao && semanas.length > 0 && (
                <View style={s.timelineWrap}>
                  <Text style={s.timelineLabel}>CRONOGRAMA</Text>
                  <View style={s.timelineRow}>
                    {semanas.map(({ idx, semana, period: p }) => {
                      const isAtual = idx === semanaIdx;
                      const isPassada = idx < semanaIdx;
                      const dotCor = p?.tipo?.cor || theme.border;
                      return (
                        <View key={idx} style={{ alignItems: 'center', gap: 3 }}>
                          <View style={[s.weekDot, {
                            backgroundColor: isPassada ? dotCor + '30' : isAtual ? dotCor + '25' : dotCor + '14',
                            borderWidth: isAtual ? 2 : 0,
                            borderColor: dotCor,
                          }]}>
                            {isPassada
                              ? <Ionicons name="checkmark" size={12} color={dotCor} />
                              : <View style={{ width: isAtual ? 8 : 6, height: isAtual ? 8 : 6, borderRadius: 4, backgroundColor: dotCor + (isAtual ? 'ff' : '80') }} />
                            }
                          </View>
                          <Text style={[s.weekDotLabel, { color: isAtual ? dotCor : theme.textTertiary }]}>
                            {semana}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Periodization banner — current week */}
              {period && (
                <View style={[s.periodBanner, { backgroundColor: period.tipo.cor + '12', borderColor: period.tipo.cor + '40' }]}>
                  <Ionicons name={period.tipo.icon} size={18} color={period.tipo.cor} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.periodLabel, { color: period.tipo.cor }]}>
                      {period.tipo.label} esta semana
                    </Text>
                    {PERIOD_DESC[period.tipo.id] && (
                      <Text style={s.periodDesc}>{PERIOD_DESC[period.tipo.id]}</Text>
                    )}
                    {(period.series || period.reps) && (
                      <Text style={s.periodDetalhe}>
                        {[
                          period.series && `${period.series} series`,
                          period.reps && `${period.reps} reps`,
                          period.carga && `${period.carga}% carga`,
                        ].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Progress */}
              <View style={{ backgroundColor: theme.elevated, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Text style={{ fontSize: 40, fontWeight: '900', color: theme.textPrimary, letterSpacing: -2, lineHeight: 44 }}>{pct}</Text>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: statusCor }}>%</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>concluido</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Text style={{ fontSize: 28, fontWeight: '800', color: theme.textPrimary, letterSpacing: -1 }}>
                        {status === 'vencida' ? '—' : diasRestantes}
                      </Text>
                      {status !== 'vencida' && (
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSecondary }}>d</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 1 }}>
                      {status === 'vencida' ? 'Vencida' : 'restantes'}
                    </Text>
                  </View>
                </View>
                <View style={{ height: 10, backgroundColor: theme.surface, borderRadius: 5, overflow: 'hidden' }}>
                  <View style={{ height: 10, width: `${pct}%`, backgroundColor: statusCor, borderRadius: 5 }} />
                </View>
              </View>

              {/* Evolution section — always visible */}
              {temPeriodizacao && (
                <>
                  <SecaoEvolucao
                    ficha={ficha}
                    semanaAtual={semanaIdx}
                    pct={pct}
                    diasRestantes={diasRestantes}
                    statusCor={statusCor}
                    historico={historico}
                    theme={theme}
                  />
                  <View style={[s.evolDivider, { marginTop: 14, marginBottom: 14 }]} />
                </>
              )}

              {/* Treinos */}
              {ficha.treinos.length === 0 ? (
                <Text style={s.semTreino}>Nenhum treino cadastrado ainda.</Text>
              ) : (
                <>
                  <Text style={s.treinosLabel}>TREINOS</Text>
                  {ficha.treinos.map(treino => {
                    const expanded = treinoExpandido === treino.id;
                    return (
                      <View key={treino.id} style={s.treinoCard}>
                        <TouchableOpacity
                          style={s.treinoHeader}
                          onPress={() => setTreinoExpandido(expanded ? null : treino.id)}
                          activeOpacity={0.8}
                        >
                          <View style={s.treinoLetra}>
                            <Text style={s.treinoLetraTexto}>{treino.letra}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.treinoNome}>Treino {treino.letra}</Text>
                            {treino.diasDaSemana?.length > 0 && (
                              <Text style={s.treinoDias}>{treino.diasDaSemana.join(' · ')}</Text>
                            )}
                            <Text style={s.treinoExsCount}>
                              {treino.exercicios?.length || 0} exercicios
                            </Text>
                          </View>
                          <View style={s.treinoActions}>
                            <Ionicons
                              name={expanded ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={theme.textTertiary}
                            />
                            <TouchableOpacity
                              style={s.playBtn}
                              onPress={() => navigation.navigate('VisualizarTreino', { treino, ficha })}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="play" size={14} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        {expanded && (
                          <View style={s.exListWrap}>
                            {(treino.exercicios || []).map((ex, i) => (
                              <View
                                key={ex.id ?? i}
                                style={[s.exItem, i === (treino.exercicios.length - 1) && { borderBottomWidth: 0 }]}
                              >
                                <View style={s.exNum}>
                                  <Text style={s.exNumTexto}>{i + 1}</Text>
                                </View>
                                <Text style={s.exNome} numberOfLines={1}>{ex.nome}</Text>
                                <Text style={s.exDetalhe}>
                                  {[
                                    ex.series && ex.reps && `${ex.series}×${ex.reps}`,
                                    ex.descanso,
                                  ].filter(Boolean).join('  ')}
                                </Text>
                              </View>
                            ))}
                            <TouchableOpacity
                              style={s.iniciarBtn}
                              onPress={() => navigation.navigate('VisualizarTreino', { treino, ficha })}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="play" size={16} color="#fff" />
                              <Text style={s.iniciarBtnTexto}>Iniciar treino</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          );
        })
      )}

      {/* Historico */}
      <Text style={s.secaoTitulo}>Historico</Text>

      {historico.length === 0 ? (
        <View style={[s.vazio, { paddingTop: 20 }]}>
          <Ionicons name="time-outline" size={40} color={theme.textTertiary} />
          <Text style={s.vazioSub}>Nenhum treino registrado ainda.</Text>
        </View>
      ) : (
        <>
          {(histExpandido ? historico : historico.slice(0, 1)).map(item => (
            <TouchableOpacity
              key={item.id}
              style={s.histCard}
              onPress={() => setHistItemExpandido(histItemExpandido === item.id ? null : item.id)}
              activeOpacity={0.8}
            >
              <View style={s.histHeader}>
                <View style={s.letraBox}>
                  <Text style={s.letraTexto}>{item.letra || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.histData}>
                    {item.dataHora?.toDate().toLocaleDateString('pt-BR', {
                      weekday: 'short', day: '2-digit', month: 'short',
                    })}
                  </Text>
                  <Text style={s.histQtd}>{item.exercicios?.length || 0} exercicios</Text>
                </View>
                <Ionicons
                  name={histItemExpandido === item.id ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.textSecondary}
                />
              </View>

              {histItemExpandido === item.id && (
                <View style={s.histDetalhes}>
                  {item.exercicios?.map((ex, i) => (
                    <View key={i} style={s.histExRow}>
                      <Text style={s.histExNome}>{ex.nome}</Text>
                      <Text style={s.histExCargas}>{ex.cargas?.filter(Boolean).join(' | ') || '—'} kg</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}

          {historico.length > 1 && (
            <TouchableOpacity style={s.expandBtn} onPress={() => setHistExpandido(!histExpandido)}>
              <Text style={s.expandTexto}>
                {histExpandido ? 'Ver menos' : `Ver historico completo (${historico.length})`}
              </Text>
              <Ionicons name={histExpandido ? 'chevron-up' : 'chevron-down'} size={14} color={theme.red} />
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}
