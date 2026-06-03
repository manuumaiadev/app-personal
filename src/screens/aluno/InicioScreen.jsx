import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { listarFichasAluno } from '../../services/fichas';
import { listarTreinosFicha } from '../../services/treinos';
import { listarHistoricoAluno } from '../../services/execucoes';
import { useAuth } from '../../context/AuthContext';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';

export default function InicioScreen({ navigation }) {
  const { usuario } = useAuth();
  const [fichasComTreinos, setFichasComTreinos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        try {
          const fichas = await listarFichasAluno(usuario.uid);
          const historico = await listarHistoricoAluno(usuario.uid);

          // Última execução por ficha
          const ultimaExecPorFicha = {};
          const execPorFicha = {};
          historico.forEach(e => {
            if (!execPorFicha[e.fichaId]) execPorFicha[e.fichaId] = [];
            execPorFicha[e.fichaId].push(e);
            const atual = ultimaExecPorFicha[e.fichaId];
            const dataE = e.dataHora?.toDate?.() || new Date(0);
            if (!atual || dataE > (atual.dataHora?.toDate?.() || new Date(0))) {
              ultimaExecPorFicha[e.fichaId] = e;
            }
          });

          // Carrega treinos de cada ficha ativa
          const fichasAtivas = fichas.filter(f => f.dataVencimento);
          const comTreinos = await Promise.all(
            fichasAtivas.map(async f => {
              const treinos = await listarTreinosFicha(f.id);
              return {
                ...f,
                treinos,
                ultimaExec: ultimaExecPorFicha[f.id] || null,
                totalExecs: execPorFicha[f.id]?.length || 0,
              };
            })
          );

          // Ordena: fichas com execução recente primeiro, depois por status
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
    return <View style={styles.center}><ActivityIndicator color="#E31E24" size="large" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.saudacao}>Olá, {usuario?.nome?.split(' ')[0]} 💪</Text>
      </View>

      {fichasComTreinos.length === 0 ? (
        <View style={styles.semFicha}>
          <Ionicons name="document-text-outline" size={56} color="#d1d5db" />
          <Text style={styles.semFichaTexto}>Nenhuma ficha ativa.</Text>
          <Text style={styles.semFichaSubtitulo}>Aguarde seu personal trainer criar sua ficha.</Text>
        </View>
      ) : (
        fichasComTreinos.map(ficha => {
          const status = calcularStatusFicha(ficha.dataVencimento);
          const { pct, diasRestantes } = ficha.criadoEm
            ? calcularProgresso(ficha.criadoEm, ficha.dataVencimento)
            : { pct: 0, diasRestantes: 0 };

          const ultimaExecTexto = ficha.ultimaExec?.dataHora
            ? `Último treino: ${ficha.ultimaExec.dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
            : 'Nenhum treino feito ainda';

          return (
            <View key={ficha.id} style={styles.fichaCard}>
              {/* Header */}
              <View style={styles.fichaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fichaNome}>{ficha.nome}</Text>
                  <Text style={styles.fichaUltima}>{ultimaExecTexto}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: CORES_STATUS[status] + '22' }]}>
                  <Text style={[styles.statusTexto, { color: CORES_STATUS[status] }]}>
                    {LABELS_STATUS[status]}
                  </Text>
                </View>
              </View>

              {/* Progresso */}
              <View style={styles.progressoBg}>
                <View style={[styles.progressoBar, {
                  width: `${pct}%`,
                  backgroundColor: CORES_STATUS[status],
                }]} />
              </View>
              <View style={styles.progressoInfo}>
                <Text style={styles.progressoPct}>{pct}% concluído</Text>
                <Text style={styles.diasRestantes}>
                  {status === 'vencida'
                    ? 'Vencida'
                    : `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`}
                </Text>
              </View>

              {/* Treinos */}
              {ficha.treinos.length > 0 && (
                <>
                  <View style={styles.divisor} />
                  <Text style={styles.treinosLabel}>Selecione o treino:</Text>
                  <View style={styles.treinosRow}>
                    {ficha.treinos.map(treino => (
                      <TouchableOpacity
                        key={treino.id}
                        style={styles.treinoBtn}
                        onPress={() => navigation.navigate('ExecutarTreino', { treino, ficha })}
                      >
                        <View style={styles.treinoLetra}>
                          <Text style={styles.treinoLetraTexto}>{treino.letra}</Text>
                        </View>
                        <View>
                          <Text style={styles.treinoNome}>Treino {treino.letra}</Text>
                          {treino.diasDaSemana?.length > 0 && (
                            <Text style={styles.treinoDias}>{treino.diasDaSemana.join(' · ')}</Text>
                          )}
                          <Text style={styles.treinoExs}>{treino.exercicios?.length || 0} exercícios</Text>
                        </View>
                        <Ionicons name="play-circle-outline" size={26} color="#E31E24" style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logo: { width: 80, height: 40 },
  saudacao: { fontSize: 22, fontWeight: '700', color: '#111827', flex: 1 },
  semFicha: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 10 },
  semFichaTexto: { fontSize: 16, color: '#374151', fontWeight: '600', textAlign: 'center' },
  semFichaSubtitulo: { color: '#9ca3af', textAlign: 'center' },

  fichaCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  fichaHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  fichaNome: { fontWeight: '700', fontSize: 16, color: '#111827' },
  fichaUltima: { color: '#9ca3af', fontSize: 12, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusTexto: { fontSize: 12, fontWeight: '600' },

  progressoBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  progressoBar: { height: 8, borderRadius: 4 },
  progressoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 },
  progressoPct: { fontSize: 12, color: '#6b7280' },
  diasRestantes: { fontSize: 12, color: '#6b7280' },

  divisor: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  treinosLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 10 },
  treinosRow: { gap: 8 },
  treinoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 12,
  },
  treinoLetra: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fde8e9', justifyContent: 'center', alignItems: 'center' },
  treinoLetraTexto: { color: '#E31E24', fontWeight: '700', fontSize: 17 },
  treinoNome: { fontWeight: '600', color: '#111827', fontSize: 14 },
  treinoDias: { color: '#6b7280', fontSize: 12 },
  treinoExs: { color: '#9ca3af', fontSize: 12 },
});
