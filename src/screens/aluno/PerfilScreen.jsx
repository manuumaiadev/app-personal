import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { criarSolicitacao, verificarSolicitacaoExistente } from '../../services/solicitacoes';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function PerfilScreen() {
  const { usuario, logout } = useAuth();
  const [codigoPersonal, setCodigoPersonal] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null); // { tipo: 'sucesso'|'erro', texto }

  async function handleSolicitarVinculo() {
    if (!codigoPersonal.trim()) return;
    setEnviando(true);
    setMensagem(null);
    try {
      // Verifica se o personal existe
      const snap = await getDoc(doc(db, 'users', codigoPersonal.trim()));
      if (!snap.exists() || snap.data().perfil !== 'personal') {
        setMensagem({ tipo: 'erro', texto: 'Código inválido. Verifique com seu personal.' });
        return;
      }
      // Verifica se já existe solicitação pendente
      const jaExiste = await verificarSolicitacaoExistente(usuario.uid, codigoPersonal.trim());
      if (jaExiste) {
        setMensagem({ tipo: 'erro', texto: 'Você já enviou uma solicitação para este personal.' });
        return;
      }
      await criarSolicitacao(usuario.uid, usuario.nome, usuario.email, codigoPersonal.trim());
      setCodigoPersonal('');
      setMensagem({ tipo: 'sucesso', texto: 'Solicitação enviada! Aguarde a aprovação do personal.' });
    } catch (e) {
      console.error(e);
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar. Tente novamente.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLetra}>{usuario?.nome?.[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.nome}>{usuario?.nome}</Text>
      <Text style={styles.email}>{usuario?.email}</Text>

      {usuario?.anamnese && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Dados corporais</Text>
          <View style={styles.dadosGrid}>
            <DadoItem label="Idade" valor={`${usuario.anamnese.idade} anos`} />
            <DadoItem label="Peso" valor={`${usuario.anamnese.peso} kg`} />
            <DadoItem label="Altura" valor={`${usuario.anamnese.altura} m`} />
          </View>
          {usuario.anamnese.objetivo && (
            <Text style={styles.objetivo}>Objetivo: {usuario.anamnese.objetivo}</Text>
          )}
        </View>
      )}

      {/* Vínculo com personal */}
      {!usuario?.personalId ? (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Vincular personal</Text>
          <Text style={styles.vinculoDesc}>
            Informe o código fornecido pelo seu personal trainer para solicitar o vínculo.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Cole o código do personal aqui..."
            placeholderTextColor="#9ca3af"
            value={codigoPersonal}
            onChangeText={setCodigoPersonal}
            autoCapitalize="none"
          />
          {mensagem && (
            <View style={[styles.mensagem, { backgroundColor: mensagem.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2' }]}>
              <Ionicons
                name={mensagem.tipo === 'sucesso' ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={mensagem.tipo === 'sucesso' ? '#16a34a' : '#dc2626'}
              />
              <Text style={[styles.mensagemTexto, { color: mensagem.tipo === 'sucesso' ? '#16a34a' : '#dc2626' }]}>
                {mensagem.texto}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.btnVincular, !codigoPersonal.trim() && { opacity: 0.5 }]}
            onPress={handleSolicitarVinculo}
            disabled={enviando || !codigoPersonal.trim()}
          >
            {enviando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnVincularTexto}>Solicitar vínculo</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.secao, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={{ color: '#374151', fontSize: 14, fontWeight: '500' }}>Vinculado ao seu personal trainer</Text>
        </View>
      )}

      <TouchableOpacity style={styles.botaoSair} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.botaoSairTexto}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DadoItem({ label, valor }) {
  return (
    <View style={styles.dadoItem}>
      <Text style={styles.dadoValor}>{valor}</Text>
      <Text style={styles.dadoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f9fafb' },
  container: { paddingHorizontal: 20, paddingTop: 60, alignItems: 'center', paddingBottom: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fde8e9', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarLetra: { color: '#E31E24', fontWeight: '700', fontSize: 32 },
  nome: { fontSize: 22, fontWeight: '700', color: '#111827' },
  email: { color: '#6b7280', marginTop: 4, marginBottom: 24 },
  secao: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  secaoTitulo: { fontWeight: '700', color: '#111827', fontSize: 15, marginBottom: 12 },
  dadosGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  dadoItem: { alignItems: 'center' },
  dadoValor: { fontWeight: '700', fontSize: 18, color: '#E31E24' },
  dadoLabel: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  objetivo: { color: '#374151', lineHeight: 20, fontSize: 14 },
  vinculoDesc: { color: '#6b7280', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', marginBottom: 10 },
  mensagem: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10, marginBottom: 10 },
  mensagemTexto: { fontSize: 13, fontWeight: '500', flex: 1 },
  btnVincular: { backgroundColor: '#E31E24', borderRadius: 10, padding: 13, alignItems: 'center' },
  btnVincularTexto: { color: '#fff', fontWeight: '600', fontSize: 15 },
  botaoSair: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 14 },
  botaoSairTexto: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
});
