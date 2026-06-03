import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { criarFicha } from '../../services/fichas';
import { listarTreinosFicha, criarTreino } from '../../services/treinos';
import { useAuth } from '../../context/AuthContext';

export default function RenovarFichaScreen({ route, navigation }) {
  const { ficha, aluno } = route.params;
  const { usuario } = useAuth();
  const [nome, setNome] = useState(ficha.nome);
  const [semanas, setSemanas] = useState(String(ficha.semanas || 4));
  const [carregando, setCarregando] = useState(false);

  const novaData = (() => {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(semanas || '0') * 7);
    return d;
  })();

  async function handleRenovar() {
    const s = parseInt(semanas);
    if (!s || s < 1) { Alert.alert('Atenção', 'Informe um número válido de semanas.'); return; }
    if (!nome.trim()) { Alert.alert('Atenção', 'Dê um nome à nova ficha.'); return; }
    setCarregando(true);
    try {
      // 1. Cria nova ficha — a antiga continua intacta no histórico
      const novaFicha = await criarFicha({
        nome: nome.trim(),
        alunoId: ficha.alunoId,
        personalId: usuario.uid,
        semanas: s,
        dataVencimento: Timestamp.fromDate(novaData),
      });

      // 2. Copia os treinos da ficha anterior para a nova
      const treinosAntigos = await listarTreinosFicha(ficha.id);
      await Promise.all(
        treinosAntigos.map(t =>
          criarTreino({
            fichaId: novaFicha.id,
            letra: t.letra,
            diasDaSemana: t.diasDaSemana || [],
            exercicios: t.exercicios || [],
            periodizacao: Array.from({ length: s }, () => null),
          })
        )
      );

      Alert.alert('Ficha renovada!', 'A ficha anterior foi mantida no histórico.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível renovar a ficha.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
        <Ionicons name="arrow-back" size={22} color="#E31E24" />
        <Text style={styles.voltarTexto}>Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Renovar Ficha</Text>
      {aluno && <Text style={styles.subtitulo}>{aluno.nome}</Text>}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
        <Text style={styles.infoTexto}>
          Uma nova ficha será criada com os mesmos treinos. A ficha anterior fica salva no histórico.
        </Text>
      </View>

      <Text style={styles.label}>Nome da nova ficha</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: Hipertrofia A/B/C — Ciclo 2"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>Duração (semanas)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={semanas}
        onChangeText={setSemanas}
        placeholder="Ex: 4"
        placeholderTextColor="#9ca3af"
      />

      {parseInt(semanas) > 0 && (
        <View style={styles.preview}>
          <Ionicons name="calendar-outline" size={18} color="#E31E24" />
          <Text style={styles.previewTexto}>
            Vencimento: {novaData.toLocaleDateString('pt-BR')}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.botao} onPress={handleRenovar} disabled={carregando}>
        {carregando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.botaoTexto}>Criar nova ficha</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 60, marginBottom: 24 },
  voltarTexto: { color: '#E31E24', fontSize: 15 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitulo: { color: '#6b7280', fontSize: 14, marginBottom: 20 },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f3f4f6', borderRadius: 10, padding: 12, marginBottom: 24, alignItems: 'flex-start' },
  infoTexto: { flex: 1, color: '#6b7280', fontSize: 13, lineHeight: 18 },
  label: { color: '#374151', fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 15, color: '#111827', marginBottom: 16 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fde8e9', borderRadius: 10, padding: 12, marginBottom: 24 },
  previewTexto: { color: '#c01018', fontWeight: '500' },
  botao: { backgroundColor: '#E31E24', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 40 },
  botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
