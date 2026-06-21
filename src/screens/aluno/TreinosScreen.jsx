import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { listarFichasAluno } from '../../services/fichas';
import { listarTreinosFicha } from '../../services/treinos';
import { listarHistoricoAluno } from '../../services/execucoes';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import { TIPOS_PERIOD } from '../../utils/periodizacao';

function semanaAtualDaFicha(ficha) {
  const inicio = ficha.criadoEm?.toDate?.();
  if (!inicio) return 0;
  const diff = Date.now() - inicio.getTime();
  const idx = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, Math.min(idx, (ficha.semanas || 1) - 1));
}

function periodDaSemana(treinos, semanaIdx) {
  for (const t of treinos) {
    const item = (t.periodizacao || [])[semanaIdx];
    if (!item) continue;
    const tipoId = typeof item === 'string' ? item : item.tipo;
    const tipo = TIPOS_PERIOD.find(p => p.id === tipoId);
    if (tipo) return { tipo, series: item.series, reps: item.reps, carga: item.carga };
  }
  return null;
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg },
    scroll: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
    titulo: { fontSize: 26, fontWeight: '800', color: t.textPrimary, marginBottom: 20 },
    secaoTitulo: { fontSize: 18, fontWeight: '700', color: t.textPrimary, marginTop: 8, marginBottom: 14 },
    vazio: { alignItems: 'center', paddingTop: 40, gap: 8, marginBottom: 20 },
    vazioTexto: { fontSize: 16, fontWeight: '600', color: t.textSecondary },
    vazioSub: { color: t.textTertiary, textAlign: 'center' },
    fichaCard: { backgroundColor: t.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border },
    fichaHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    fichaNome: { fontSize: 16, fontWeight: '700', color: t.textPrimary },
    fichaSemana: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeTexto: { fontSize: 11, fontWeight: '700' },
    progressoBg: { height: 6, backgroundColor: t.elevated, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    progressoBar: { height: 6, borderRadius: 3 },
    progressoPct: { fontSize: 11, color: t.textSecondary, marginBottom: 12 },
    periodBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 14 },
    periodLabel: { fontSize: 12, fontWeight: '700' },
    periodDetalhe: { fontSize: 11, color: t.textSecondary, marginTop: 1 },
    treinosLabel: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 1, marginBottom: 10 },
    semTreino: { fontSize: 13, color: t.textSecondary, textAlign: 'center', paddingVertical: 10 },
    treinoBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.elevated, borderRadius: 12, padding: 12, marginBottom: 8 },
    treinoLetra: { width: 42, height: 42, borderRadius: 11, backgroundColor: t.red + '20', justifyContent: 'center', alignItems: 'center' },
    treinoLetraTexto: { color: t.red, fontWeight: '800', fontSize: 18 },
    treinoNome: { fontSize: 14, fontWeight: '600', color: t.textPrimary },
    treinoDias: { fontSize: 12, color: t.textSecondary, marginTop: 1 },
    treinoExs: { fontSize: 11, color: t.textTertiary, marginTop: 1 },
    playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center' },
    histCard: { backgroundColor: t.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border },
    histHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    letraBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: t.red + '20', justifyContent: 'center', alignItems: 'center' },
    letraTexto: { color: t.red, fontWeight: '700', fontSize: 18 },
    histData: { fontWeight: '600', color: t.textPrimary, textTransform: 'capitalize' },
    histQtd: { color: t.textSecondary, fontSize: 13 },
    histDetalhes: { marginTop: 12, gap: 6, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10 },
    exRow: { flexDirection: 'row', justifyContent: 'space-between' },
    exNome: { color: t.textPrimary, fontWeight: '500' },
    exCargas: { color: t.textSecondary, fontSize: 13 },
    expandBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 12, marginTop: 4,
    },
    expandTexto: { fontSize: 13, fontWeight: '600', color: t.red },
  };
}

export default function TreinosScreen({ navigation }) {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [fichas, setFichas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [histExpandido, setHistExpandido] = useState(false);

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
          const { pct } = ficha.criadoEm
            ? calcularProgresso(ficha.criadoEm, ficha.dataVencimento)
            : { pct: 0 };
          const semanaIdx = semanaAtualDaFicha(ficha);
          const period = periodDaSemana(ficha.treinos, semanaIdx);
          const cor = CORES_STATUS[status];

          return (
            <View key={ficha.id} style={s.fichaCard}>
              <View style={s.fichaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fichaNome}>{ficha.nome}</Text>
                  <Text style={s.fichaSemana}>Semana {semanaIdx + 1} de {ficha.semanas || '—'}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: cor + '20' }]}>
                  <Text style={[s.badgeTexto, { color: cor }]}>{LABELS_STATUS[status]}</Text>
                </View>
              </View>

              <View style={s.progressoBg}>
                <View style={[s.progressoBar, { width: `${pct}%`, backgroundColor: cor }]} />
              </View>
              <Text style={s.progressoPct}>{pct}% concluido</Text>

              {period && (
                <View style={[s.periodBanner, { backgroundColor: period.tipo.cor + '12', borderColor: period.tipo.cor + '40' }]}>
                  <Ionicons name={period.tipo.icon} size={14} color={period.tipo.cor} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.periodLabel, { color: period.tipo.cor }]}>
                      {period.tipo.label} esta semana
                    </Text>
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

              {ficha.treinos.length === 0 ? (
                <Text style={s.semTreino}>Nenhum treino cadastrado ainda.</Text>
              ) : (
                <>
                  <Text style={s.treinosLabel}>TREINOS</Text>
                  {ficha.treinos.map(treino => (
                    <TouchableOpacity
                      key={treino.id}
                      style={s.treinoBtn}
                      onPress={() => navigation.navigate('VisualizarTreino', { treino, ficha })}
                      activeOpacity={0.75}
                    >
                      <View style={s.treinoLetra}>
                        <Text style={s.treinoLetraTexto}>{treino.letra}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.treinoNome}>Treino {treino.letra}</Text>
                        {treino.diasDaSemana?.length > 0 && (
                          <Text style={s.treinoDias}>{treino.diasDaSemana.join(' · ')}</Text>
                        )}
                        <Text style={s.treinoExs}>{treino.exercicios?.length || 0} exercicios</Text>
                      </View>
                      <View style={s.playBtn}>
                        <Ionicons name="play" size={14} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          );
        })
      )}

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
              onPress={() => setExpandido(expandido === item.id ? null : item.id)}
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
                <Ionicons name={expandido === item.id ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
              </View>

              {expandido === item.id && (
                <View style={s.histDetalhes}>
                  {item.exercicios?.map((ex, i) => (
                    <View key={i} style={s.exRow}>
                      <Text style={s.exNome}>{ex.nome}</Text>
                      <Text style={s.exCargas}>{ex.cargas?.filter(Boolean).join(' | ') || '—'} kg</Text>
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
