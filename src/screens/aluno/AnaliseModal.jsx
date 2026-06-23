import { useMemo } from 'react';
import { Modal, SafeAreaView, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ESFORCO_VALOR = { facil: 33, moderado: 66, dificil: 100 };

function calcIntens(item) {
  const todas = (item.exercicios || []).flatMap(ex => (ex.esforco || []).filter(Boolean));
  if (!todas.length) return null;
  return Math.round(todas.reduce((a, e) => a + (ESFORCO_VALOR[e] || 0), 0) / todas.length);
}

function isoWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-${wn}`;
}

export function useMetricas(ficha, historico) {
  return useMemo(() => {
    const sessoes = (historico || []).filter(s => s.fichaId === ficha?.id);

    const inicio = ficha?.criadoEm?.toDate?.();
    const semanasCorridas = inicio
      ? Math.max(1, Math.floor((Date.now() - inicio.getTime()) / (7 * 24 * 60 * 60 * 1000)))
      : 1;

    const diasPorSemana = (ficha?.treinos || []).reduce(
      (acc, tr) => acc + (tr.diasDaSemana?.length || 0), 0
    );
    const sessoesEsperadas = Math.max(1, semanasCorridas * Math.max(1, diasPorSemana));

    const frequencia = Math.min(100, Math.round((sessoes.length / sessoesEsperadas) * 100));

    const intensidades = sessoes.map(calcIntens).filter(v => v !== null);
    const avg = arr => arr.length
      ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      : 0;
    const intensidadeMedia = avg(intensidades);

    const rendimento = 0; // calculado abaixo após streak

    const semanasComSessao = new Set(
      sessoes.map(s => {
        const d = s.dataHora?.toDate?.();
        return d ? isoWeekKey(d) : null;
      }).filter(Boolean)
    );
    const consistencia = Math.round((semanasComSessao.size / semanasCorridas) * 100);

    const diasComSessao = [
      ...new Set(
        sessoes.map(s => {
          const d = s.dataHora?.toDate?.();
          return d ? d.toISOString().split('T')[0] : null;
        }).filter(Boolean)
      ),
    ].sort();

    let streakMax = diasComSessao.length > 0 ? 1 : 0;
    let streakAtual = 1;
    for (let i = 1; i < diasComSessao.length; i++) {
      const diff = Math.round(
        (new Date(diasComSessao[i]) - new Date(diasComSessao[i - 1])) / 86400000
      );
      if (diff === 1) {
        streakAtual++;
        if (streakAtual > streakMax) streakMax = streakAtual;
      } else {
        streakAtual = 1;
      }
    }

    const streakScore = Math.min(100, Math.round((streakMax / 14) * 100));
    const rendimentoFinal = Math.round(
      frequencia * 0.35 +
      consistencia * 0.30 +
      intensidadeMedia * 0.25 +
      streakScore * 0.10
    );

    let leve = 0, moderada = 0, intensa = 0;
    intensidades.forEach(v => {
      if (v <= 40) leve++;
      else if (v <= 70) moderada++;
      else intensa++;
    });
    const totalInt = intensidades.length || 1;
    const distPct = {
      leve: Math.round((leve / totalInt) * 100),
      moderada: Math.round((moderada / totalInt) * 100),
      intensa: Math.round((intensa / totalInt) * 100),
    };

    const meio = Math.floor(intensidades.length / 2);
    const avgPrimeira = meio > 0 ? avg(intensidades.slice(0, meio)) : null;
    const avgSegunda = meio > 0 ? avg(intensidades.slice(meio)) : null;
    let tendencia = null;
    if (avgPrimeira !== null && avgSegunda !== null && intensidades.length >= 4) {
      const diff = avgSegunda - avgPrimeira;
      tendencia = diff > 5 ? 'subindo' : diff < -5 ? 'caindo' : 'estavel';
    }

    const duracoes = sessoes.map(s => s.duracaoSegundos).filter(v => v > 0);
    const duracaoMedia = duracoes.length
      ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length)
      : null;

    const freqLetra = {};
    sessoes.forEach(s => { if (s.letra) freqLetra[s.letra] = (freqLetra[s.letra] || 0) + 1; });
    const treinoFreq = Object.entries(freqLetra).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      totalSessoes: sessoes.length,
      frequencia,
      intensidadeMedia,
      rendimento: rendimentoFinal,
      consistencia,
      streakMax,
      distPct,
      tendencia,
      avgPrimeira,
      avgSegunda,
      duracaoMedia,
      treinoFreq,
    };
  }, [ficha, historico]);
}

function formatDuracao(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

export function corRendimento(v) {
  if (v >= 70) return '#22c55e';
  if (v >= 40) return '#f59e0b';
  return '#ef4444';
}

function MetricaBox({ label, valor, sub, cor, t }) {
  return (
    <View style={{
      flex: 1, backgroundColor: t.elevated, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: t.border, alignItems: 'center', gap: 2,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={{ fontSize: 30, fontWeight: '900', color: cor || t.textPrimary, letterSpacing: -1 }}>{valor}</Text>
        {sub && <Text style={{ fontSize: 14, fontWeight: '700', color: cor || t.textSecondary }}>{sub}</Text>}
      </View>
      <Text style={{ fontSize: 11, color: t.textTertiary, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function BarraDistribuicao({ label, pct, cor, t }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: t.textPrimary }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: cor }}>{pct}%</Text>
      </View>
      <View style={{ height: 8, backgroundColor: t.surface, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${pct}%`, backgroundColor: cor, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// Conteúdo puro das métricas — pode ser embutido em qualquer tela
export function AnaliseConteudo({ ficha, historico, theme: t }) {
  const m = useMetricas(ficha, historico);

  const rend = m.rendimento;
  const corHero = corRendimento(rend);

  const tendIcon = m.tendencia === 'subindo'
    ? 'trending-up'
    : m.tendencia === 'caindo'
    ? 'trending-down'
    : 'remove';
  const tendCor = m.tendencia === 'subindo'
    ? '#22c55e'
    : m.tendencia === 'caindo'
    ? '#ef4444'
    : '#f59e0b';

  if (m.totalSessoes === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
        <Ionicons name="bar-chart-outline" size={44} color={t.textTertiary} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: t.textSecondary, textAlign: 'center' }}>
          Nenhum treino registrado para esta ficha
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>

      {/* Hero */}
      <View style={{
        backgroundColor: t.surface, borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: t.border, alignItems: 'center',
      }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 10 }}>
          INDICE DE RENDIMENTO
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
          <Text style={{ fontSize: 72, fontWeight: '900', color: corHero, letterSpacing: -4, lineHeight: 76 }}>
            {rend}
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: corHero }}>%</Text>
        </View>
        <Text style={{ fontSize: 12, color: t.textSecondary, marginBottom: 16 }}>
          {rend >= 70
            ? 'Excelente desempenho'
            : rend >= 40
            ? 'Desempenho moderado'
            : (() => {
                const fraco = [
                  { label: 'frequencia', v: m.frequencia },
                  { label: 'intensidade', v: m.intensidadeMedia },
                  { label: 'consistencia', v: m.consistencia },
                ].sort((a, b) => a.v - b.v)[0].label;
                return `Melhore sua ${fraco}`;
              })()
          }
        </Text>
        <View style={{ width: '100%', height: 10, backgroundColor: t.elevated, borderRadius: 5, overflow: 'hidden' }}>
          <View style={{ height: 10, width: `${rend}%`, backgroundColor: corHero, borderRadius: 5 }} />
        </View>
        <Text style={{ fontSize: 10, color: t.textTertiary, marginTop: 6, textAlign: 'center' }}>
          Frequencia 35% · Consistencia 30% · Intensidade 25% · Sequencia 10%
        </Text>
      </View>

      {/* 2x2 grid */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <MetricaBox label="Frequencia" valor={m.frequencia} sub="%" cor={corRendimento(m.frequencia)} t={t} />
        <MetricaBox label="Intensidade" valor={m.intensidadeMedia} sub="%" cor={corRendimento(m.intensidadeMedia)} t={t} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <MetricaBox label="Consistencia" valor={m.consistencia} sub="%" cor={corRendimento(m.consistencia)} t={t} />
        <MetricaBox label="Sequencia max" valor={m.streakMax} sub={m.streakMax === 1 ? 'dia' : 'dias'} t={t} />
      </View>

      {/* Distribuicao */}
      <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 14 }}>
          DISTRIBUICAO DE INTENSIDADE
        </Text>
        <BarraDistribuicao label="Leve" pct={m.distPct.leve} cor="#22c55e" t={t} />
        <BarraDistribuicao label="Moderada" pct={m.distPct.moderada} cor="#f59e0b" t={t} />
        <BarraDistribuicao label="Intensa" pct={m.distPct.intensa} cor="#ef4444" t={t} />
      </View>

      {/* Evolucao */}
      <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 14 }}>
          EVOLUCAO DE INTENSIDADE
        </Text>
        {m.tendencia ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: t.textSecondary }}>Primeiras sessoes</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: t.textPrimary }}>{m.avgPrimeira}%</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, color: t.textSecondary }}>Ultimas sessoes</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: t.textPrimary }}>{m.avgSegunda}%</Text>
              </View>
            </View>
            <View style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: tendCor + '18',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name={tendIcon} size={26} color={tendCor} />
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: t.textTertiary }}>
            Dados insuficientes (minimo 4 sessoes com esforco registrado)
          </Text>
        )}
      </View>

      {/* Volume */}
      <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 14 }}>
          VOLUME
        </Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: t.textSecondary }}>Total de sessoes</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.textPrimary }}>{m.totalSessoes}</Text>
          </View>
          {m.duracaoMedia && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: t.textSecondary }}>Duracao media</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: t.textPrimary }}>{formatDuracao(m.duracaoMedia)}</Text>
            </View>
          )}
          {m.treinoFreq && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: t.textSecondary }}>Treino mais frequente</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: t.textPrimary }}>Treino {m.treinoFreq}</Text>
            </View>
          )}
        </View>
      </View>

    </View>
  );
}

// Modal wrapper — usado na tela do aluno
export default function AnaliseModal({ visible, ficha, historico, onClose, theme: t }) {
  if (!ficha) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>

        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: t.border,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 2 }}>
              ANALISE GERAL
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: t.textPrimary }} numberOfLines={1}>
              {ficha.nome}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginLeft: 12 }}
          >
            <Ionicons name="close" size={24} color={t.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <AnaliseConteudo ficha={ficha} historico={historico} theme={t} />
        </ScrollView>

      </SafeAreaView>
    </Modal>
  );
}
