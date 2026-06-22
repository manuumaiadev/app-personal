import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deletarExercicio } from '../../services/exercicios';
import { useTheme } from '../../context/ThemeContext';

export default function DetalheExercicioScreen({ route, navigation }) {
  const { exercicio } = route.params;
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [modalUsarTreino, setModalUsarTreino] = useState(false);

  async function handleDeletar() {
    Alert.alert('Confirmar', 'Deletar esse exercício?', [
      { text: 'Cancelar' },
      {
        text: 'Deletar', style: 'destructive', onPress: async () => {
          await deletarExercicio(exercicio.id);
          navigation.goBack();
        }
      },
    ]);
  }

  function handleVideo() {
    if (exercicio.videoUrl) Linking.openURL(exercicio.videoUrl);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={s.container}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Ionicons name="arrow-back" size={22} color={theme.red} />
          </TouchableOpacity>
          <Text style={s.navTitulo} numberOfLines={2}>{exercicio.nome}</Text>
          <TouchableOpacity onPress={handleDeletar} style={s.deletar}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={s.tags}>
          {exercicio.grupoMuscular && (
            <View style={[s.tag, { backgroundColor: '#fde8e9' }]}>
              <Text style={[s.tagTexto, { color: theme.red }]}>{exercicio.grupoMuscular.toLowerCase()}</Text>
            </View>
          )}
          {exercicio.equipamento && (
            <View style={[s.tag, { backgroundColor: theme.elevated }]}>
              <Text style={[s.tagTexto, { color: theme.textPrimary }]}>{exercicio.equipamento.toLowerCase()}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.videoBtn, !exercicio.videoUrl && s.videoBtnDisabled]}
          onPress={handleVideo}
          disabled={!exercicio.videoUrl}
        >
          <Ionicons name="play-circle-outline" size={22} color={exercicio.videoUrl ? theme.red : theme.textTertiary} />
          <Text style={[s.videoBtnTexto, !exercicio.videoUrl && { color: theme.textTertiary }]}>
            {exercicio.videoUrl ? 'Visualizar vídeo' : 'Sem vídeo cadastrado'}
          </Text>
        </TouchableOpacity>

        {exercicio.descricao ? (
          <View style={s.secao}>
            <Text style={s.secaoLabel}>Descrição</Text>
            <Text style={s.secaoTexto}>{exercicio.descricao}</Text>
          </View>
        ) : null}

        {exercicio.equipamento ? (
          <View style={s.secao}>
            <Text style={s.secaoLabel}>Equipamento</Text>
            <Text style={s.secaoTexto}>{exercicio.equipamento}</Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.botao, { backgroundColor: theme.elevated, flex: 1 }]}
          onPress={() => navigation.navigate('NovoExercicio', { exercicio })}
        >
          <Text style={[s.botaoTexto, { color: theme.textPrimary }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.botao, { backgroundColor: theme.surface, flex: 1.2, borderWidth: 1.5, borderColor: theme.border }]}
          onPress={() => setModalUsarTreino(true)}
        >
          <Text style={[s.botaoTexto, { color: theme.textPrimary }]}>Usar no treino</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalUsarTreino} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Ionicons name="barbell-outline" size={40} color={theme.red} style={{ marginBottom: 12 }} />
            <Text style={s.modalTitulo}>Usar no treino</Text>
            <Text style={s.modalTexto}>
              Para usar esse exercício, abra o perfil do aluno e crie ou edite uma ficha.
            </Text>
            <TouchableOpacity style={s.modalBotao} onPress={() => setModalUsarTreino(false)}>
              <Text style={s.modalBotaoTexto}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20 },
    navBar: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 60, paddingBottom: 16, gap: 8 },
    voltar: { paddingTop: 2 },
    navTitulo: { flex: 1, fontWeight: '700', fontSize: 22, color: t.textPrimary, lineHeight: 28 },
    deletar: { paddingTop: 4 },
    tags: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    tag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    tagTexto: { fontSize: 13, fontWeight: '600' },
    videoBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.elevated, borderRadius: 10, padding: 16, marginBottom: 16 },
    videoBtnDisabled: { backgroundColor: t.elevated },
    videoBtnTexto: { color: t.textPrimary, fontWeight: '600', fontSize: 15 },
    secao: { backgroundColor: t.surface, borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    secaoLabel: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 8 },
    secaoTexto: { fontSize: 15, color: t.textPrimary, lineHeight: 22 },
    footer: { flexDirection: 'row', gap: 10, padding: 20, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border },
    botao: { borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
    botaoTexto: { fontWeight: '700', fontSize: 15 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 28, alignItems: 'center', width: '100%' },
    modalTitulo: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 8 },
    modalTexto: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    modalBotao: { backgroundColor: t.red, borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
    modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  };
}
