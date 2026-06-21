import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';

export default function AnamneseScreen({ route }) {
  const { uid } = route.params;
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
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
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>Perfil salvo!</Text>
            <Text style={s.modalTexto}>Seu perfil foi preenchido. Aguarde seu personal ativar seu acesso.</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.titulo}>Anamnese</Text>
        <Text style={s.subtitulo}>Essas informações ajudam seu personal a montar seus treinos.</Text>

        {!!erro && <Text style={s.erroTexto}>{erro}</Text>}

        <Text style={s.secao}>DADOS PESSOAIS</Text>
        <View style={s.linha}>
          <View style={s.metade}>
            <Text style={s.label}>Idade *</Text>
            <TextInput style={s.input} placeholder="Ex: 25" placeholderTextColor={theme.placeholder}
              keyboardType="numeric" value={idade} onChangeText={setIdade} />
          </View>
          <View style={s.metade}>
            <Text style={s.label}>Peso (kg) *</Text>
            <TextInput style={s.input} placeholder="Ex: 70" placeholderTextColor={theme.placeholder}
              keyboardType="decimal-pad" value={peso} onChangeText={setPeso} />
          </View>
        </View>
        <View style={s.linha}>
          <View style={s.metade}>
            <Text style={s.label}>Altura (m) *</Text>
            <TextInput style={s.input} placeholder="Ex: 1.70" placeholderTextColor={theme.placeholder}
              keyboardType="decimal-pad" value={altura} onChangeText={setAltura} />
          </View>
          <View style={s.metade}>
            <Text style={s.label}>Profissão</Text>
            <TextInput style={s.input} placeholder="Ex: Médica" placeholderTextColor={theme.placeholder}
              value={profissao} onChangeText={setProfissao} />
          </View>
        </View>

        <Text style={s.secao}>OBJETIVOS</Text>
        <Text style={s.label}>Objetivo principal *</Text>
        <TextInput style={s.input} placeholder="Ex: Emagrecimento · Ganho de força"
          placeholderTextColor={theme.placeholder} value={objetivo} onChangeText={setObjetivo} />
        <Text style={s.label}>Ênfase corporal</Text>
        <TextInput style={s.input} placeholder="Ex: Dorsal, braços, glúteos"
          placeholderTextColor={theme.placeholder} value={enfaseCorporal} onChangeText={setEnfaseCorporal} />

        <Text style={s.secao}>SAÚDE</Text>
        <Text style={s.label}>Lesões / restrições</Text>
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Ex: Protusão discal C6-C7" placeholderTextColor={theme.placeholder}
          multiline value={restricoes} onChangeText={setRestricoes} />
        <Text style={s.label}>Medicamentos</Text>
        <TextInput style={s.input} placeholder="Ex: Losartana 50mg"
          placeholderTextColor={theme.placeholder} value={medicamentos} onChangeText={setMedicamentos} />

        <TouchableOpacity style={s.botao} onPress={handleSalvar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>Salvar e continuar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

function makeStyles(t) {
  return {
    container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, backgroundColor: t.bg, paddingBottom: 40 },
    titulo: { fontSize: 26, fontWeight: '700', color: t.textPrimary, marginBottom: 6 },
    subtitulo: { color: t.textSecondary, marginBottom: 24, lineHeight: 20 },
    erroTexto: { color: t.red, fontSize: 14, marginBottom: 12 },
    secao: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    linha: { flexDirection: 'row', gap: 12 },
    metade: { flex: 1 },
    label: { color: t.textPrimary, fontWeight: '600', marginBottom: 6, fontSize: 13 },
    input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 12, fontSize: 15, color: t.textPrimary, marginBottom: 14 },
    botao: { backgroundColor: t.red, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
    botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalBox: { backgroundColor: t.surface, borderRadius: 16, padding: 32, alignItems: 'center', width: '100%' },
    modalTitulo: { fontSize: 22, fontWeight: '700', color: t.textPrimary, marginBottom: 8 },
    modalTexto: { fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 20 },
  };
}
