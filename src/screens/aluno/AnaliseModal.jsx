import { useMemo } from 'react';
import { Modal, SafeAreaView, ScrollView, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ESFORCO_LEGADO = { facil: 33, moderado: 66, dificil: 100 };

function valorEsforco(e) {
  if (typeof e === 'number') return e;
  return ESFORCO_LEGADO[e] ?? null;
}

function calcIntens(item) {
  const todas = (item.exercicios || [])
    .flatMap(ex => (ex.esforco || []).map(valorEsforco).filter(v => v !== null));
  if (!todas.length) return null;
  return Math.round(todas.reduce((a, b) => a + b, 0) / todas.length);
}


export function useMetricas(ficha, historico, cardioLogs) {
  return useMemo(() => {
    const sessoes = (historico || []).filter(s => s.fichaId === ficha?.id);

    const inicio = ficha?.criadoEm?.toDate?.();
    const semanasCorridas = inicio
      ? Math.max(1, Math.floor((Date.now() - inicio.getTime()) / (7 * 24 * 60 * 60 * 1000)))
      : 1;

    const diasPorSemana = ficha?.diasPorSemana
      || Math.max(1, (ficha?.treinos || []).length)
      || 3;
    const sessoesEsperadas = Math.max(1, semanasCorridas * diasPorSemana);
    // Permite bonus acima de 100% para dias extras (cap em 120%)
    const frequencia = Math.min(120, Math.round((sessoes.length / sessoesEsperadas) * 100));

    const intensidades = sessoes.map(calcIntens).filter(v => v !== null);

    const sessoesIntensidade = [...sessoes]
      .reverse()
      .map(s => ({ letra: s.letra || '?', intens: calcIntens(s), data: s.dataHora?.toDate?.() }))
      .filter(s => s.intens !== null);
    const avg = arr => arr.length
      ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      : 0;
    const intensidadeMedia = avg(intensidades);

    // Cardio
    const metaCardioMin = ficha?.metaCardio?.minutosPorSemana || 0;
    let aderenciaCardio = null;
    if (metaCardioMin > 0 && cardioLogs) {
      const inicioSemana = new Date();
      inicioSemana.setHours(0, 0, 0, 0);
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
      const minutosEssaSemana = (cardioLogs || [])
        .filter(l => l.fichaId === ficha?.id && l.dataHora?.toDate?.() >= inicioSemana)
        .reduce((a, l) => a + (l.minutos || 0), 0);
      aderenciaCardio = Math.min(100, Math.round((minutosEssaSemana / metaCardioMin) * 100));
    }

    const rendimentoFinal = aderenciaCardio !== null
      ? Math.round(frequencia * 0.55 + intensidadeMedia * 0.25 + aderenciaCardio * 0.20)
      : Math.round(frequencia * 0.70 + intensidadeMedia * 0.30);

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
      aderenciaCardio,
      metaCardioMin,
      sessoesIntensidade,
      duracaoMedia,
      treinoFreq,
    };
  }, [ficha, historico, cardioLogs]);
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

const SCREEN_W = Dimensions.get('window').width;

function corIntens(v) {
  if (v <= 33) return '#22c55e';
  if (v <= 66) return '#f59e0b';
  return '#ef4444';
}

function GraficoIntensidade({ sessoes, t }) {
  if (!sessoes.length) {
    return (
      <Text style={{ fontSize: 13, color: t.textTertiary }}>
        Nenhuma sessao com esforco registrado.
      </Text>
    );
  }

  const BAR_H = 56;
  const barW = Math.max(24, Math.min(44, Math.floor((SCREEN_W - 80) / sessoes.length) - 6));

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: BAR_H + 46, paddingHorizontal: 4 }}>
          {sessoes.map((s, i) => {
            const cor = corIntens(s.intens);
            const h = Math.max(4, Math.round((s.intens / 100) * BAR_H));
            const dia = s.data ? s.data.getDate() : '';
            const mes = s.data
              ? s.data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
              : '';
            return (
              <View key={i} style={{ width: barW, alignItems: 'center' }}>
                <Text style={{ fontSize: 8, fontWeight: '800', color: cor, marginBottom: 3 }}>{s.intens}</Text>
                <View style={{ width: barW, height: BAR_H, justifyContent: 'flex-end' }}>
                  <View style={{ height: h, backgroundColor: cor, borderRadius: 4 }} />
                </View>
                <Text style={{ fontSize: 9, fontWeight: '700', color: t.textSecondary, marginTop: 5 }}>
                  {s.letra}
                </Text>
                <Text style={{ fontSize: 8, color: t.textTertiary, marginTop: 1 }}>
                  {dia}/{mes}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
        {[['#22c55e', 'Leve (≤33)'], ['#f59e0b', 'Moderada (≤66)'], ['#ef4444', 'Intensa (>66)']].map(([cor, label]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: cor }} />
            <Text style={{ fontSize: 10, color: t.textSecondary }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Conteúdo puro das métricas — pode ser embutido em qualquer tela
export function AnaliseConteudo({ ficha, historico, cardioLogs, theme: t }) {
  const m = useMetricas(ficha, historico, cardioLogs);

  const rend = m.rendimento;
  const corHero = corRendimento(rend);


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
                ].sort((a, b) => a.v - b.v)[0].label;
                return `Melhore sua ${fraco}`;
              })()
          }
        </Text>
        <View style={{ width: '100%', height: 10, backgroundColor: t.elevated, borderRadius: 5, overflow: 'hidden' }}>
          <View style={{ height: 10, width: `${rend}%`, backgroundColor: corHero, borderRadius: 5 }} />
        </View>
        <Text style={{ fontSize: 10, color: t.textTertiary, marginTop: 6, textAlign: 'center' }}>
          {m.aderenciaCardio !== null
            ? 'Frequencia 55% · Intensidade 25% · Cardio 20%'
            : 'Frequencia 70% · Intensidade 30%'}
        </Text>
      </View>

      {/* grid */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <MetricaBox label="Frequencia" valor={m.frequencia} sub="%" cor={corRendimento(m.frequencia)} t={t} />
        <MetricaBox label="Intensidade" valor={m.intensidadeMedia} sub="%" cor={corRendimento(m.intensidadeMedia)} t={t} />
        {m.aderenciaCardio !== null && (
          <MetricaBox label="Cardio" valor={m.aderenciaCardio} sub="%" cor={corRendimento(m.aderenciaCardio)} t={t} />
        )}
      </View>

      {/* Grafico de intensidade por sessao */}
      <View style={{ backgroundColor: t.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 14 }}>
          INTENSIDADE POR SESSAO
        </Text>
        <GraficoIntensidade sessoes={m.sessoesIntensidade} t={t} />
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
export default function AnaliseModal({ visible, ficha, historico, cardioLogs, onClose, theme: t }) {
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
          <AnaliseConteudo ficha={ficha} historico={historico} cardioLogs={cardioLogs} theme={t} />
        </ScrollView>

      </SafeAreaView>
    </Modal>
  );
}
