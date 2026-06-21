import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { criarFicha } from '../../services/fichas';
import { listarTreinosFicha, criarTreino } from '../../services/treinos';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function RenovarFichaScreen({ route, navigation }) {
  const { ficha, aluno } = route.params;
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
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
      const novaFicha = await criarFicha({
        nome: nome.trim(),
        alunoId: ficha.alunoId,
        personalId: usuario.uid,
        semanas: s,
        dataVencimento: Timestamp.fromDate(novaData),
      });

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
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
        <Ionicons name="arrow-back" size={22} color={theme.red} />
        <Text style={s.voltarTexto}>Voltar</Text>
      </TouchableOpacity>

      <Text style={s.titulo}>Renovar Ficha</Text>
      {aluno && <Text style={s.subtitulo}>{aluno.nome}</Text>}

      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
        <Text style={s.infoTexto}>
          Uma nova ficha será criada com os mesmos treinos. A ficha anterior fica salva no histórico.
        </Text>
      </View>

      <Text style={s.label}>Nome da nova ficha</Text>
      <TextInput
        style={s.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: Hipertrofia A/B/C — Ciclo 2"
        placeholderTextColor={theme.placeholder}
      />

      <Text style={s.label}>Duração (semanas)</Text>
      <TextInput
        style={s.input}
        keyboardType="numeric"
        value={semanas}
        onChangeText={setSemanas}
        placeholder="Ex: 4"
        placeholderTextColor={theme.placeholder}
      />

      {parseInt(semanas) > 0 && (
        <View style={s.preview}>
          <Ionicons name="calendar-outline" size={18} color={theme.red} />
          <Text style={s.previewTexto}>
            Vencimento: {novaData.toLocaleDateString('pt-BR')}
          </Text>
        </View>
      )}

      <TouchableOpacity style={s.botao} onPress={handleRenovar} disabled={carregando}>
        {carregando
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.botaoTexto}>Criar nova ficha</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20 },
    voltar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 60, marginBottom: 24 },
    voltarTexto: { color: t.red, fontSize: 15 },
    titulo: { fontSize: 24, fontWeight: '700', color: t.textPrimary, marginBottom: 4 },
    subtitulo: { color: t.textSecondary, fontSize: 14, marginBottom: 20 },
    infoBox: { flexDirection: 'row', gap: 8, backgroundColor: t.elevated, borderRadius: 10, padding: 12, marginBottom: 24, alignItems: 'flex-start' },
    infoTexto: { flex: 1, color: t.textSecondary, fontSize: 13, lineHeight: 18 },
    label: { color: t.textPrimary, fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary, marginBottom: 16 },
    preview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fde8e9', borderRadius: 10, padding: 12, marginBottom: 24 },
    previewTexto: { color: '#c01018', fontWeight: '500' },
    botao: { backgroundColor: t.red, borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 40 },
    botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  };
}
