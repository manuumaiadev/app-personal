import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { TIPOS_PERIOD } from '../../utils/periodizacao';

const PERIOD_DESC = {
  adaptativa:  'Fase inicial para adaptacao ao treino.',
  resistencia: 'Cargas moderadas para resistencia muscular.',
  hipertrofia: 'Volume elevado para maximizar crescimento.',
  forca:       'Cargas pesadas para forca maxima.',
  regenerativa:'Movimentos leves. Corpo descansando.',
  deload:      'Semana de descarga. Volume reduzido.',
};

function semanaAtual(ficha) {
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

function makeStyles(t) {
  return {
    root: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingBottom: 16,
      backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    voltar: { padding: 4 },
    titulo: { fontSize: 22, fontWeight: '800', color: t.textPrimary },
    subtitulo: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
    periodCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      margin: 16, marginBottom: 8, borderRadius: 14, padding: 14, borderWidth: 1,
    },
    periodIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    periodSemana: { fontSize: 11, color: t.textSecondary, fontWeight: '600', marginBottom: 2 },
    periodTipo: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
    periodDetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    periodChip: { backgroundColor: t.elevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    periodChipTexto: { fontSize: 11, fontWeight: '600', color: t.textPrimary },
    diasRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, marginBottom: 8, marginTop: 8,
    },
    diasTexto: { fontSize: 13, color: t.textSecondary, fontWeight: '500' },
    secLabel: {
      fontSize: 10, fontWeight: '700', color: t.textTertiary,
      letterSpacing: 1, paddingHorizontal: 16, marginTop: 8, marginBottom: 10,
    },
    exCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      backgroundColor: t.surface, marginHorizontal: 16, marginBottom: 8,
      borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border,
    },
    exNum: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: t.red,
      justifyContent: 'center', alignItems: 'center', marginTop: 2,
    },
    exNumTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
    exNome: { fontSize: 15, fontWeight: '700', color: t.textPrimary, marginBottom: 2 },
    exGrupo: { fontSize: 12, color: t.textSecondary, marginBottom: 8 },
    exMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: t.elevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    metaTexto: { fontSize: 12, color: t.textSecondary, fontWeight: '500' },
    footer: {
      paddingHorizontal: 16, paddingTop: 12,
      backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border,
    },
    btnIniciar: {
      backgroundColor: t.red, borderRadius: 14, padding: 16,
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    btnIniciarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  };
}

export default function VisualizarTreinoScreen({ route, navigation }) {
  const { treino, ficha } = route.params;
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const semanaIdx = semanaAtual(ficha);
  const period = resolverPeriod(ficha, semanaIdx);
  const [comTimer, setComTimer] = useState(false);
  const [comIntensidade, setComIntensidade] = useState(true);

  const treinoParaExecutar = useMemo(() => {
    if (!period) return treino;
    return {
      ...treino,
      exercicios: (treino.exercicios || []).map(ex => ({
        ...ex,
        series: parseInt(period.series) || ex.series,
        reps: period.reps || ex.reps,
      })),
    };
  }, [treino, period]);

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Ionicons name="arrow-back" size={22} color={theme.red} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>Treino {treino.letra}</Text>
            <Text style={s.subtitulo}>{ficha.nome}</Text>
          </View>
        </View>

        {/* Periodizacao da semana */}
        {period && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            marginHorizontal: 16, marginTop: 12, marginBottom: 4,
            backgroundColor: period.tipo.cor + '12',
            borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
            borderWidth: 1, borderColor: period.tipo.cor + '30',
          }}>
            <View style={{
              width: 34, height: 34, borderRadius: 9,
              backgroundColor: period.tipo.cor + '20',
              justifyContent: 'center', alignItems: 'center', flexShrink: 0,
            }}>
              <Ionicons name={period.tipo.icon} size={17} color={period.tipo.cor} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: period.tipo.cor }}>{period.tipo.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: period.tipo.cor + 'aa' }}>· Semana {semanaIdx + 1}</Text>
              </View>
              {(PERIOD_DESC[period.tipo.id] || period.carga) && (
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  {[
                    PERIOD_DESC[period.tipo.id],
                    period.carga && `${period.carga}% carga`,
                  ].filter(Boolean).join('  ·  ')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Dias da semana */}
        {treino.diasDaSemana?.length > 0 && (
          <View style={s.diasRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
            <Text style={s.diasTexto}>{treino.diasDaSemana.join(' · ')}</Text>
          </View>
        )}

        <Text style={s.secLabel}>EXERCICIOS — {treino.exercicios?.length || 0}</Text>

        {(treino.exercicios || []).map((ex, i) => (
          <View key={ex.id ?? i} style={s.exCard}>
            <View style={s.exNum}>
              <Text style={s.exNumTexto}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.exNome}>{ex.nome}</Text>
              {ex.grupoMuscular && (
                <Text style={s.exGrupo}>{ex.grupoMuscular}</Text>
              )}
              <View style={s.exMeta}>
                {(period?.series || ex.series) && (
                  <View style={[s.metaChip, period?.series && { backgroundColor: period.tipo.cor + '15' }]}>
                    <Ionicons name="repeat-outline" size={12} color={period?.series ? period.tipo.cor : theme.textSecondary} />
                    <Text style={[s.metaTexto, period?.series && { color: period.tipo.cor, fontWeight: '700' }]}>
                      {period?.series || ex.series} series
                    </Text>
                  </View>
                )}
                {(period?.reps || ex.reps) && (
                  <View style={[s.metaChip, period?.reps && { backgroundColor: period.tipo.cor + '15' }]}>
                    <Ionicons name="flash-outline" size={12} color={period?.reps ? period.tipo.cor : theme.textSecondary} />
                    <Text style={[s.metaTexto, period?.reps && { color: period.tipo.cor, fontWeight: '700' }]}>
                      {period?.reps || ex.reps} reps
                    </Text>
                  </View>
                )}
                {ex.descanso && (
                  <View style={s.metaChip}>
                    <Ionicons name="timer-outline" size={12} color={theme.textSecondary} />
                    <Text style={s.metaTexto}>{ex.descanso}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer fixo sem sobreposicao da tab bar */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          marginBottom: 12,
        }}>
          <Ionicons name="stopwatch-outline" size={18} color={comTimer ? '#06b6d4' : theme.textTertiary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>Timer de descanso</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>Cronometro entre series</Text>
          </View>
          <Switch
            value={comTimer}
            onValueChange={setComTimer}
            trackColor={{ false: theme.border, true: '#06b6d4' }}
            thumbColor="#fff"
            ios_backgroundColor={theme.border}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Ionicons name="bar-chart-outline" size={18} color={comIntensidade ? '#06b6d4' : theme.textTertiary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>Classificar intensidade</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>Avaliamos melhor seu indice de rendimento com esses dados</Text>
          </View>
          <Switch
            value={comIntensidade}
            onValueChange={setComIntensidade}
            trackColor={{ false: theme.border, true: '#06b6d4' }}
            thumbColor="#fff"
            ios_backgroundColor={theme.border}
          />
        </View>
        <TouchableOpacity
          style={s.btnIniciar}
          onPress={() => navigation.replace('ExecutarTreino', { treino: treinoParaExecutar, ficha, comTimer, comIntensidade })}
        >
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={s.btnIniciarTexto}>Iniciar treino</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
