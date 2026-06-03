import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deletarExercicio } from '../../services/exercicios';

export default function DetalheExercicioScreen({ route, navigation }) {
  const { exercicio } = route.params;
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
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltar}>
            <Ionicons name="arrow-back" size={22} color="#E31E24" />
          </TouchableOpacity>
          <Text style={styles.navTitulo} numberOfLines={2}>{exercicio.nome}</Text>
          <TouchableOpacity onPress={handleDeletar} style={styles.deletar}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.tags}>
          {exercicio.grupoMuscular && (
            <View style={[styles.tag, { backgroundColor: '#fde8e9' }]}>
              <Text style={[styles.tagTexto, { color: '#E31E24' }]}>{exercicio.grupoMuscular.toLowerCase()}</Text>
            </View>
          )}
          {exercicio.equipamento && (
            <View style={[styles.tag, { backgroundColor: '#1f2937' }]}>
              <Text style={[styles.tagTexto, { color: '#fff' }]}>{exercicio.equipamento.toLowerCase()}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.videoBtn, !exercicio.videoUrl && styles.videoBtnDisabled]}
          onPress={handleVideo}
          disabled={!exercicio.videoUrl}
        >
          <Ionicons name="play-circle-outline" size={22} color={exercicio.videoUrl ? '#E31E24' : '#9ca3af'} />
          <Text style={[styles.videoBtnTexto, !exercicio.videoUrl && { color: '#9ca3af' }]}>
            {exercicio.videoUrl ? 'Visualizar vídeo' : 'Sem vídeo cadastrado'}
          </Text>
        </TouchableOpacity>

        {exercicio.descricao ? (
          <View style={styles.secao}>
            <Text style={styles.secaoLabel}>Descrição</Text>
            <Text style={styles.secaoTexto}>{exercicio.descricao}</Text>
          </View>
        ) : null}

        {exercicio.equipamento ? (
          <View style={styles.secao}>
            <Text style={styles.secaoLabel}>Equipamento</Text>
            <Text style={styles.secaoTexto}>{exercicio.equipamento}</Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.botao, { backgroundColor: '#1f2937', flex: 1 }]}
          onPress={() => navigation.navigate('NovoExercicio')}
        >
          <Text style={[styles.botaoTexto, { color: '#fff' }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.botao, { backgroundColor: '#fff', flex: 1.2, borderWidth: 1.5, borderColor: '#e5e7eb' }]}
          onPress={() => setModalUsarTreino(true)}
        >
          <Text style={[styles.botaoTexto, { color: '#111827' }]}>Usar no treino</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalUsarTreino} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons name="barbell-outline" size={40} color="#E31E24" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitulo}>Usar no treino</Text>
            <Text style={styles.modalTexto}>
              Para usar esse exercício, abra o perfil do aluno e crie ou edite uma ficha.
            </Text>
            <TouchableOpacity style={styles.modalBotao} onPress={() => setModalUsarTreino(false)}>
              <Text style={styles.modalBotaoTexto}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20 },
  navBar: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 60, paddingBottom: 16, gap: 8 },
  voltar: { paddingTop: 2 },
  navTitulo: { flex: 1, fontWeight: '700', fontSize: 22, color: '#111827', lineHeight: 28 },
  deletar: { paddingTop: 4 },
  tags: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tagTexto: { fontSize: 13, fontWeight: '600' },
  videoBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1f2937', borderRadius: 10, padding: 16, marginBottom: 16 },
  videoBtnDisabled: { backgroundColor: '#f3f4f6' },
  videoBtnTexto: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secao: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  secaoLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 8 },
  secaoTexto: { fontSize: 15, color: '#374151', lineHeight: 22 },
  footer: { flexDirection: 'row', gap: 10, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  botao: { borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', width: '100%' },
  modalTitulo: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalTexto: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalBotao: { backgroundColor: '#E31E24', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
  modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
