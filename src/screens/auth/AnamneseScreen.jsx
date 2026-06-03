import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function AnamneseScreen({ route }) {
  const { uid } = route.params;
  const [idade, setIdade] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [profissao, setProfissao] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [enfaseCorporal, setEnfaseCorporal] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSalvar() {
    setErro('');
    if (!idade || !peso || !altura || !objetivo) {
      setErro('Preencha os campos obrigatórios (*).');
      return;
    }
    setCarregando(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        anamnese: { idade, peso, altura, profissao, objetivo, enfaseCorporal, restricoes, medicamentos },
      });
      setSucesso(true);
    } catch (e) {
      setErro('Não foi possível salvar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Modal visible={sucesso} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcone}>✅</Text>
            <Text style={styles.modalTitulo}>Perfil salvo!</Text>
            <Text style={styles.modalTexto}>Seu perfil foi preenchido. Aguarde seu personal ativar seu acesso.</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Anamnese</Text>
        <Text style={styles.subtitulo}>Essas informações ajudam seu personal a montar seus treinos.</Text>

        {!!erro && <Text style={styles.erroTexto}>{erro}</Text>}

        <Text style={styles.secao}>DADOS PESSOAIS</Text>
        <View style={styles.linha}>
          <View style={styles.metade}>
            <Text style={styles.label}>Idade *</Text>
            <TextInput style={styles.input} placeholder="Ex: 25" placeholderTextColor="#9ca3af"
              keyboardType="numeric" value={idade} onChangeText={setIdade} />
          </View>
          <View style={styles.metade}>
            <Text style={styles.label}>Peso (kg) *</Text>
            <TextInput style={styles.input} placeholder="Ex: 70" placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad" value={peso} onChangeText={setPeso} />
          </View>
        </View>
        <View style={styles.linha}>
          <View style={styles.metade}>
            <Text style={styles.label}>Altura (m) *</Text>
            <TextInput style={styles.input} placeholder="Ex: 1.70" placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad" value={altura} onChangeText={setAltura} />
          </View>
          <View style={styles.metade}>
            <Text style={styles.label}>Profissão</Text>
            <TextInput style={styles.input} placeholder="Ex: Médica" placeholderTextColor="#9ca3af"
              value={profissao} onChangeText={setProfissao} />
          </View>
        </View>

        <Text style={styles.secao}>OBJETIVOS</Text>
        <Text style={styles.label}>Objetivo principal *</Text>
        <TextInput style={styles.input} placeholder="Ex: Emagrecimento · Ganho de força"
          placeholderTextColor="#9ca3af" value={objetivo} onChangeText={setObjetivo} />
        <Text style={styles.label}>Ênfase corporal</Text>
        <TextInput style={styles.input} placeholder="Ex: Dorsal, braços, glúteos"
          placeholderTextColor="#9ca3af" value={enfaseCorporal} onChangeText={setEnfaseCorporal} />

        <Text style={styles.secao}>SAÚDE</Text>
        <Text style={styles.label}>Lesões / restrições</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Ex: Protusão discal C6-C7" placeholderTextColor="#9ca3af"
          multiline value={restricoes} onChangeText={setRestricoes} />
        <Text style={styles.label}>Medicamentos</Text>
        <TextInput style={styles.input} placeholder="Ex: Losartana 50mg"
          placeholderTextColor="#9ca3af" value={medicamentos} onChangeText={setMedicamentos} />

        <TouchableOpacity style={styles.botao} onPress={handleSalvar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Salvar e continuar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, backgroundColor: '#fff', paddingBottom: 40 },
  titulo: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitulo: { color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  erroTexto: { color: '#E31E24', fontSize: 14, marginBottom: 12 },
  secao: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  linha: { flexDirection: 'row', gap: 12 },
  metade: { flex: 1 },
  label: { color: '#374151', fontWeight: '600', marginBottom: 6, fontSize: 13 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', marginBottom: 14 },
  botao: { backgroundColor: '#E31E24', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', width: '100%' },
  modalIcone: { fontSize: 48, marginBottom: 12 },
  modalTitulo: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalTexto: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});
