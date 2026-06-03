import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registrarExecucao } from '../../services/execucoes';
import { useAuth } from '../../context/AuthContext';

export default function ExecutarTreinoScreen({ route, navigation }) {
  const { treino, ficha } = route.params;
  const { usuario } = useAuth();

  const [cargas, setCargas] = useState(() => {
    const inicial = {};
    treino.exercicios?.forEach(ex => {
      inicial[ex.id] = Array.from({ length: ex.series || 3 }, () => '');
    });
    return inicial;
  });
  const [salvando, setSalvando] = useState(false);

  function setCarга(exId, serieIdx, valor) {
    setCargas(prev => {
      const novo = { ...prev };
      novo[exId] = [...(novo[exId] || [])];
      novo[exId][serieIdx] = valor;
      return novo;
    });
  }

  async function handleFinalizar() {
    setSalvando(true);
    try {
      await registrarExecucao({
        alunoId: usuario.uid,
        treinoId: treino.id,
        fichaId: ficha.id,
        letra: treino.letra,
        exercicios: treino.exercicios?.map(ex => ({
          id: ex.id,
          nome: ex.nome,
          series: ex.series,
          reps: ex.reps,
          cargas: cargas[ex.id] || [],
        })),
      });
      Alert.alert('Treino finalizado!', 'Ótimo trabalho! 💪', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o treino.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
          <Ionicons name="arrow-back" size={22} color="#E31E24" />
          <Text style={styles.voltarTexto}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Treino {treino.letra}</Text>
        <Text style={styles.subtitulo}>{ficha.nome}</Text>

        {treino.exercicios?.map((ex) => (
          <View key={ex.id} style={styles.exercicioCard}>
            <Text style={styles.exercicioNome}>{ex.nome}</Text>
            <Text style={styles.exercicioInfo}>{ex.series} séries × {ex.reps} reps</Text>

            <View style={styles.seriesContainer}>
              {Array.from({ length: ex.series || 3 }).map((_, i) => (
                <View key={i} style={styles.serieRow}>
                  <Text style={styles.serieLabel}>Série {i + 1}</Text>
                  <TextInput
                    style={styles.cargaInput}
                    placeholder="kg"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={cargas[ex.id]?.[i] || ''}
                    onChangeText={v => setCarга(ex.id, i, v)}
                  />
                  <Text style={styles.repsTexto}>{ex.reps} reps</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.botaoFinalizar} onPress={handleFinalizar} disabled={salvando}>
          {salvando
            ? <ActivityIndicator color="#fff" />
            : <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.botaoFinalizarTexto}>Finalizar treino</Text>
            </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 60, marginBottom: 16 },
  voltarTexto: { color: '#E31E24', fontSize: 15 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitulo: { color: '#6b7280', marginBottom: 20 },
  exercicioCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  exercicioNome: { fontWeight: '700', fontSize: 16, color: '#111827', marginBottom: 2 },
  exercicioInfo: { color: '#6b7280', fontSize: 13, marginBottom: 12 },
  seriesContainer: { gap: 8 },
  serieRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serieLabel: { width: 56, color: '#6b7280', fontSize: 13 },
  cargaInput: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, width: 72, textAlign: 'center', fontWeight: '600', color: '#111827' },
  repsTexto: { color: '#374151', fontSize: 13 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  botaoFinalizar: { backgroundColor: '#E31E24', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  botaoFinalizarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
