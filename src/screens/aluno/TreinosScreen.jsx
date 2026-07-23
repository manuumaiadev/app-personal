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
import { calcularStatusFicha, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import { TIPOS_PERIOD } from '../../utils/periodizacao';
import AnaliseModal from './AnaliseModal';

function proximoTreinoLetra(ficha, historico) {
  const letras = (ficha.treinos || []).map(t => t.letra).sort();
  if (!letras.length) return null;
  const ultima = historico.find(h => h.fichaId === ficha.id);
  if (!ultima?.letra) return letras[0];
  const idx = letras.indexOf(ultima.letra);
  return letras[(idx + 1) % letras.length];
}

function inicioSemanaAtual() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

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

function resolverPeriod(ficha, semanaIdx) {
  const item = (ficha.periodizacao || [])[semanaIdx];
  if (!item) return null;
  const tipoId = typeof item === 'string' ? item : item.tipo;
  const tipo = TIPOS_PERIOD.find(p => p.id === tipoId);
  if (!tipo) return null;
  return {
    tipo,
    series: (typeof item === 'object' && item.series) || tipo.series,
    reps: (typeof item === 'object' && item.reps) || tipo.reps,
    carga: (typeof item === 'object' && item.carga) || tipo.carga,
  };
}

function todasSemanas(ficha) {
  return Array.from({ length: ficha.semanas || 0 }, (_, i) => ({
    idx: i,
    semana: i + 1,
    period: resolverPeriod(ficha, i),
  }));
}

function calcularProgressoFrequencia(ficha, historico) {
  const inicio = ficha.criadoEm?.toDate?.();
  const fim = ficha.dataVencimento?.toDate?.();
  if (!inicio || !fim) return { pct: 0, diasRestantes: 0 };

  const hoje = new Date();
  const totalMs = fim - inicio;
  const passadoMs = Math.min(Date.now() - inicio.getTime(), totalMs);
  const semanasPassadas = passadoMs / (7 * 24 * 60 * 60 * 1000);
  const semanasEfetivas = Math.min(ficha.semanas || Math.ceil(totalMs / (7 * 24 * 60 * 60 * 1000)), semanasPassadas);

  const treinosPorSemana = ficha.treinos?.length || 1;
  const sessoesEsperadas = Math.max(1, Math.round(semanasEfetivas * treinosPorSemana));
  const sessoesRealizadas = historico.filter(h => h.fichaId === ficha.id).length;

  const pct = Math.min(100, Math.round((sessoesRealizadas / sessoesEsperadas) * 100));
  const diasRestantes = Math.max(0, Math.ceil((fim - hoje) / 86400000));
  return { pct, diasRestantes };
}

const ESFORCO_LEGADO_T = { facil: 33, moderado: 66, dificil: 100 };

function calcIntensidadeItem(item) {
  const todas = (item.exercicios || [])
    .flatMap(ex => (ex.esforco || []).map(e => typeof e === 'number' ? e : (ESFORCO_LEGADO_T[e] ?? null)).filter(v => v !== null));
  if (!todas.length) return null;
  return Math.round(todas.reduce((a, b) => a + b, 0) / todas.length);
}

function corIntensidade(v) {
  if (v === null) return '#9ca3af';
  if (v <= 40) return '#22c55e';
  if (v <= 70) return '#f59e0b';
  return '#ef4444';
}

// ── Inline evolution section ─────────────────────────────────────────────────
function SecaoEvolucao({ ficha, historico, theme: t }) {
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
    timelineRow: { flexDirection: 'row', gap: 6 },

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
  const [fichaAnalise, setFichaAnalise] = useState(null);
  const [filtro, setFiltro] = useState('ativas');
  const [semanaVistaMap, setSemanaVistaMap] = useState({});

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

  const fichasFiltradas = fichas.filter(f => {
    const st = calcularStatusFicha(f.dataVencimento);
    return filtro === 'ativas' ? st !== 'vencida' : st === 'vencida';
  });

  return (
    <>
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.titulo}>Treinos</Text>

      {/* Filtro */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        {[{ id: 'ativas', label: 'Ativas' }, { id: 'vencidas', label: 'Concluidas' }].map(op => (
          <TouchableOpacity
            key={op.id}
            onPress={() => setFiltro(op.id)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
              backgroundColor: filtro === op.id ? theme.red : theme.elevated,
              borderWidth: 1,
              borderColor: filtro === op.id ? theme.red : theme.border,
            }}
          >
            <Text style={{
              fontSize: 13, fontWeight: '700',
              color: filtro === op.id ? '#fff' : theme.textSecondary,
            }}>
              {op.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {fichasFiltradas.length === 0 ? (
        <View style={s.vazio}>
          <Ionicons name="barbell-outline" size={52} color={theme.textTertiary} />
          <Text style={s.vazioTexto}>{filtro === 'ativas' ? 'Nenhuma ficha ativa.' : 'Nenhuma ficha anterior.'}</Text>
          <Text style={s.vazioSub}>{filtro === 'ativas' ? 'Aguarde seu personal criar sua ficha.' : 'Fichas vencidas aparecem aqui.'}</Text>
        </View>
      ) : (
        fichasFiltradas.map(ficha => {
          const status = calcularStatusFicha(ficha.dataVencimento);
          const { pct, diasRestantes } = calcularProgressoFrequencia(ficha, historico);
          const semanaIdx = semanaAtualDaFicha(ficha);
          const semanaVista = semanaVistaMap[ficha.id] ?? semanaIdx;
          const period = resolverPeriod(ficha, semanaVista);
          const periodAtual = resolverPeriod(ficha, semanaIdx);
          const statusCor = CORES_STATUS[status];
          const semanas = todasSemanas(ficha);
          const temPeriodizacao = semanas.some(s => s.period !== null);
          const setSemanaVista = (idx) => setSemanaVistaMap(prev => ({ ...prev, [ficha.id]: idx }));
          const proximaLetra = proximoTreinoLetra(ficha, historico);
          const metaDias = ficha.diasPorSemana || null;
          const inicioSemana = inicioSemanaAtual();
          const sessoesEstaSemana = historico.filter(
            h => h.fichaId === ficha.id && h.dataHora?.toDate?.() >= inicioSemana
          ).length;
          return (
            <View key={ficha.id} style={s.fichaCard}>

              {/* Header */}
              <View style={s.fichaTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fichaNome}>{ficha.nome}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                      Semana {semanaIdx + 1} de {ficha.semanas || '—'}
                    </Text>
                    {metaDias && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: sessoesEstaSemana >= metaDias
                          ? '#22c55e18' : theme.elevated,
                        borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: sessoesEstaSemana >= metaDias ? '#22c55e40' : theme.border,
                      }}>
                        <Ionicons
                          name="flame-outline"
                          size={11}
                          color={sessoesEstaSemana >= metaDias ? '#22c55e' : theme.textTertiary}
                        />
                        <Text style={{
                          fontSize: 11, fontWeight: '700',
                          color: sessoesEstaSemana >= metaDias ? '#22c55e' : theme.textSecondary,
                        }}>
                          {sessoesEstaSemana}/{metaDias} esta semana
                          {sessoesEstaSemana > metaDias ? ' +bonus' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setFichaAnalise(ficha)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="bar-chart-outline" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <View style={[s.badge, { backgroundColor: statusCor + '20' }]}>
                    <Text style={[s.badgeTexto, { color: statusCor }]}>{LABELS_STATUS[status]}</Text>
                  </View>
                </View>
              </View>

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

              {/* Week timeline dots — CRONOGRAMA */}
              {temPeriodizacao && semanas.length > 0 && (
                <View style={s.timelineWrap}>
                  <Text style={s.timelineLabel}>CRONOGRAMA</Text>
                  <View style={s.timelineRow}>
                    {semanas.map(({ idx, semana, period: p }) => {
                      const isAtual = idx === semanaIdx;
                      const isPassada = idx < semanaIdx;
                      const isSelecionada = idx === semanaVista;
                      const dotCor = p?.tipo?.cor || theme.border;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={{ flex: 1, alignItems: 'center' }}
                          onPress={() => setSemanaVista(idx)}
                          activeOpacity={0.7}
                        >
                          <View style={{
                            width: '100%',
                            borderRadius: 12,
                            paddingVertical: 10,
                            paddingHorizontal: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            backgroundColor: isAtual ? dotCor : isPassada ? dotCor + '18' : dotCor + '10',
                            borderWidth: isSelecionada && !isAtual ? 2 : 1,
                            borderColor: isAtual ? dotCor : isSelecionada ? dotCor : dotCor + '40',
                            opacity: !isPassada && !isAtual && !isSelecionada ? 0.6 : 1,
                            ...(isAtual ? {
                              elevation: 6,
                              shadowColor: dotCor,
                              shadowOffset: { width: 0, height: 3 },
                              shadowOpacity: 0.45,
                              shadowRadius: 6,
                            } : {}),
                          }}>
                            {isPassada
                              ? <Ionicons name="checkmark-circle" size={16} color={isAtual ? '#fff' : dotCor} />
                              : <Text style={{ fontSize: 9, fontWeight: '700', color: isAtual ? '#fff' : dotCor, letterSpacing: 0.5 }}>S{semana}</Text>
                            }
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isAtual ? '#ffffffcc' : isSelecionada ? dotCor : isPassada ? dotCor : theme.textSecondary, textAlign: 'center', lineHeight: 13 }}>
                              {p?.tipo?.label || '—'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Periodization banner — semana selecionada */}
              {period && (
                <View style={[s.periodBanner, { backgroundColor: period.tipo.cor + '12', borderColor: period.tipo.cor + '40' }]}>
                  <Ionicons name={period.tipo.icon} size={18} color={period.tipo.cor} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.periodLabel, { color: period.tipo.cor }]}>
                      {period.tipo.label}
                      <Text style={{ fontWeight: '500', color: period.tipo.cor + 'cc' }}>
                        {semanaVista === semanaIdx
                          ? ' — esta semana'
                          : semanaVista < semanaIdx
                          ? ` — semana ${semanaVista + 1} (concluida)`
                          : ` — semana ${semanaVista + 1} (planejado)`}
                      </Text>
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


              {/* Treinos */}
              {ficha.treinos.length === 0 ? (
                <Text style={s.semTreino}>Nenhum treino cadastrado ainda.</Text>
              ) : (
                <>
                  <Text style={s.treinosLabel}>TREINOS</Text>
                  {ficha.treinos.map(treino => {
                    const expanded = treinoExpandido === treino.id;
                    const ehProximo = treino.letra === proximaLetra;
                    return (
                      <View key={treino.id} style={[s.treinoCard, null]}>
                        <TouchableOpacity
                          style={s.treinoHeader}
                          onPress={() => setTreinoExpandido(expanded ? null : treino.id)}
                          activeOpacity={0.85}
                        >
                          <>
                            <View style={s.treinoLetra}>
                              <Text style={s.treinoLetraTexto}>{treino.letra}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              {ehProximo && (
                                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.red, letterSpacing: 0.8, marginBottom: 2 }}>PROXIMO TREINO</Text>
                              )}
                              <Text style={s.treinoNome}>Treino {treino.letra}</Text>
                              <Text style={s.treinoExsCount}>
                                {treino.exercicios?.length || 0} exercicios
                              </Text>
                              {ehProximo && periodAtual && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
                                  backgroundColor: periodAtual.tipo.cor + '15', borderRadius: 8,
                                  paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
                                  <Ionicons name={periodAtual.tipo.icon} size={11} color={periodAtual.tipo.cor} />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: periodAtual.tipo.cor }}>
                                    {periodAtual.tipo.label}
                                    {(periodAtual.series || periodAtual.reps) && (
                                      <Text style={{ fontWeight: '500' }}>
                                        {'  ·  '}{[
                                          periodAtual.series && `${periodAtual.series} series`,
                                          periodAtual.reps && `${periodAtual.reps} reps`,
                                          periodAtual.carga && `${periodAtual.carga}% carga`,
                                        ].filter(Boolean).join(' · ')}
                                      </Text>
                                    )}
                                  </Text>
                                </View>
                              )}
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
                          </>
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
                                    periodAtual?.series && periodAtual?.reps
                                      ? `${periodAtual.series}×${periodAtual.reps}`
                                      : ex.series && ex.reps
                                      ? `${ex.series}×${ex.reps}`
                                      : null,
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

    <AnaliseModal
      visible={fichaAnalise !== null}
      ficha={fichaAnalise}
      historico={historico}
      onClose={() => setFichaAnalise(null)}
      theme={theme}
    />
    </>
  );
}
