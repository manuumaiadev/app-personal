import { useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { listarHistoricoAluno } from '../../services/execucoes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ESFORCO_VALOR = { facil: 33, moderado: 66, dificil: 100 };
const ESFORCO_COR = { facil: '#22c55e', moderado: '#f59e0b', dificil: '#ef4444' };
const CHART_BAR_HEIGHT = 80;

function calcularIntensidade(item) {
  const exs = item.exercicios || [];
  const todas = exs.flatMap(ex => (ex.esforco || []).filter(Boolean));
  if (todas.length === 0) return null;
  return Math.round(todas.reduce((a, e) => a + (ESFORCO_VALOR[e] || 0), 0) / todas.length);
}

function intensidadeCor(v) {
  if (v === null) return '#9ca3af';
  if (v <= 40) return '#22c55e';
  if (v <= 70) return '#f59e0b';
  return '#ef4444';
}

function intensidadeLabel(v) {
  if (v === null) return '—';
  if (v <= 40) return 'Leve';
  if (v <= 70) return 'Moderada';
  return 'Intensa';
}

// ── Evolution chart component ────────────────────────────────────────────────
function GraficoEvolucao({ historico, theme: t }) {
  const sessoes = [...historico]
    .slice(0, 10)
    .reverse()
    .map(item => {
      const intensidade = calcularIntensidade(item);
      const data = item.dataHora?.toDate();
      return {
        id: item.id,
        letra: item.letra || '?',
        intensidade,
        cor: intensidadeCor(intensidade),
        dia: data ? data.getDate() : '—',
        mesAbrev: data ? data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : '',
      };
    });

  if (sessoes.length === 0) return null;
  const algumComDados = sessoes.some(s => s.intensidade !== null);
  if (!algumComDados) return null;

  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 16 }}>
        EVOLUCAO DA INTENSIDADE
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Y axis */}
        <View style={{ width: 30, height: CHART_BAR_HEIGHT, justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 0 }}>
          <Text style={{ fontSize: 9, color: t.textTertiary }}>100%</Text>
          <Text style={{ fontSize: 9, color: t.textTertiary }}>50%</Text>
          <Text style={{ fontSize: 9, color: t.textTertiary }}>0%</Text>
        </View>

        {/* Bars */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: CHART_BAR_HEIGHT + 42 }}>
            {sessoes.map(s => {
              const barH = s.intensidade !== null
                ? Math.max(4, (s.intensidade / 100) * CHART_BAR_HEIGHT)
                : 4;
              return (
                <View key={s.id} style={{ alignItems: 'center', width: 28 }}>
                  {s.intensidade !== null && (
                    <Text style={{ fontSize: 9, fontWeight: '700', color: s.cor, marginBottom: 3 }}>
                      {s.intensidade}%
                    </Text>
                  )}
                  <View style={{ height: CHART_BAR_HEIGHT, justifyContent: 'flex-end' }}>
                    <View style={{ width: 18, height: barH, backgroundColor: s.cor, borderRadius: 4 }} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: t.textSecondary, marginTop: 5 }}>
                    {s.letra}
                  </Text>
                  <Text style={{ fontSize: 9, color: t.textTertiary, marginTop: 1 }}>
                    {s.dia}/{s.mesAbrev}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
        {[['#22c55e', 'Leve'], ['#f59e0b', 'Moderada'], ['#ef4444', 'Intensa']].map(([cor, label]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cor }} />
            <Text style={{ fontSize: 11, color: t.textSecondary }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg },
    scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 32 },
    titulo: { fontSize: 26, fontWeight: '800', color: t.textPrimary, marginBottom: 20 },
    card: { backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    letraBox: { width: 42, height: 42, borderRadius: 11, backgroundColor: t.red + '18', justifyContent: 'center', alignItems: 'center' },
    letraTexto: { color: t.red, fontWeight: '700', fontSize: 18 },
    data: { fontWeight: '600', color: t.textPrimary, textTransform: 'capitalize', fontSize: 14 },
    qtd: { color: t.textSecondary, fontSize: 12, marginTop: 1 },
    intensBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    intensBadgeTexto: { fontSize: 11, fontWeight: '700' },
    detalhes: { marginTop: 12, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10, gap: 8 },
    exRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    exNome: { flex: 1, color: t.textPrimary, fontWeight: '500', fontSize: 13 },
    exCargas: { color: t.textSecondary, fontSize: 12 },
    exEsforco: { fontSize: 11, fontWeight: '700' },
    duracao: { fontSize: 11, color: t.textTertiary, marginTop: 8, textAlign: 'right' },
    vazio: { textAlign: 'center', color: t.textTertiary, marginTop: 40, fontSize: 14 },
  };
}

export default function HistoricoScreen() {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        const data = await listarHistoricoAluno(usuario.uid);
        setHistorico(data);
        setCarregando(false);
      }
      carregar();
    }, [])
  );

  function formatDuracao(secs) {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}min ${s > 0 ? s + 's' : ''}`.trim() : `${s}s`;
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.red} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={s.scrollContent}
      data={historico}
      keyExtractor={i => i.id}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <>
          <Text style={s.titulo}>Historico</Text>
          <GraficoEvolucao historico={historico} theme={theme} />
        </>
      }
      ListEmptyComponent={
        <Text style={s.vazio}>Nenhum treino registrado ainda.</Text>
      }
      renderItem={({ item }) => {
        const intensidade = calcularIntensidade(item);
        const cor = intensidadeCor(intensidade);
        const label = intensidadeLabel(intensidade);
        const aberto = expandido === item.id;

        return (
          <TouchableOpacity
            style={s.card}
            onPress={() => setExpandido(aberto ? null : item.id)}
            activeOpacity={0.8}
          >
            <View style={s.cardHeader}>
              <View style={s.letraBox}>
                <Text style={s.letraTexto}>{item.letra || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.data}>
                  {item.dataHora?.toDate().toLocaleDateString('pt-BR', {
                    weekday: 'short', day: '2-digit', month: 'short',
                  })}
                </Text>
                <Text style={s.qtd}>{item.exercicios?.length || 0} exercicios</Text>
              </View>
              {intensidade !== null && (
                <View style={[s.intensBadge, { backgroundColor: cor + '18' }]}>
                  <Text style={[s.intensBadgeTexto, { color: cor }]}>{label}</Text>
                </View>
              )}
              <Ionicons
                name={aberto ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.textTertiary}
              />
            </View>

            {aberto && (
              <View style={s.detalhes}>
                {item.exercicios?.map((ex, i) => {
                  const esforcosSerie = (ex.esforco || []).filter(Boolean);
                  const esforcoMedio = esforcosSerie.length > 0
                    ? esforcosSerie.reduce((a, e) => a + (ESFORCO_VALOR[e] || 0), 0) / esforcosSerie.length
                    : null;
                  const exCor = esforcoMedio !== null ? intensidadeCor(Math.round(esforcoMedio)) : null;
                  const exLabel = esforcoMedio !== null ? intensidadeLabel(Math.round(esforcoMedio)) : null;

                  return (
                    <View key={i} style={s.exRow}>
                      <Text style={s.exNome} numberOfLines={1}>{ex.nome}</Text>
                      {ex.cargas?.filter(Boolean).length > 0 && (
                        <Text style={s.exCargas}>
                          {ex.cargas.filter(Boolean).join(' | ')} kg
                        </Text>
                      )}
                      {exLabel && (
                        <Text style={[s.exEsforco, { color: exCor }]}>{exLabel}</Text>
                      )}
                    </View>
                  );
                })}
                {item.duracaoSegundos > 0 && (
                  <Text style={s.duracao}>{formatDuracao(item.duracaoSegundos)}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}
