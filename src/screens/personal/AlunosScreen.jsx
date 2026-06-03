import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { listarSolicitacoesPendentes, aprovarSolicitacao, rejeitarSolicitacao } from '../../services/solicitacoes';
import { PERSONAL_ADMIN_ID } from '../../config/admin';

const CORES_AVATAR = ['#E31E24', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
function avatarCor(nome) {
  return CORES_AVATAR[(nome?.charCodeAt(0) || 0) % CORES_AVATAR.length];
}

const ABAS = ['Alunos', 'Solicitações'];

export default function AlunosScreen({ navigation }) {
  const { usuario } = useAuth();
  const [aba, setAba] = useState('Alunos');
  const [alunos, setAlunos] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  async function carregar() {
    setCarregando(true);
    try {
      const [snapAlunos, sols] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('perfil', '==', 'aluno'))),
        listarSolicitacoesPendentes(usuario.uid),
      ]);
      setAlunos(snapAlunos.docs.map(d => ({ id: d.id, ...d.data() })));
      setSolicitacoes(sols);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }

  const filtrados = alunos.filter(a =>
    a.nome?.toLowerCase().includes(filtro.toLowerCase())
  );

  async function handleAprovar(sol) {
    await aprovarSolicitacao(sol.id, sol.alunoId, usuario.uid);
    setSolicitacoes(prev => prev.filter(s => s.id !== sol.id));
    carregar();
  }

  async function handleRejeitar(sol) {
    await rejeitarSolicitacao(sol.id);
    setSolicitacoes(prev => prev.filter(s => s.id !== sol.id));
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titulo}>Meus Alunos</Text>
        <TouchableOpacity style={styles.botaoNovo} onPress={() => navigation.navigate('NovoAluno')}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.botaoNovoTexto}>Novo aluno</Text>
        </TouchableOpacity>
      </View>

      {/* Abas */}
      <View style={styles.tabBar}>
        {ABAS.map(a => (
          <TouchableOpacity key={a} style={[styles.tab, aba === a && styles.tabAtiva]} onPress={() => setAba(a)}>
            <Text style={[styles.tabTexto, aba === a && styles.tabTextoAtivo]}>{a}</Text>
            {a === 'Solicitações' && solicitacoes.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>{solicitacoes.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator color="#E31E24" style={{ marginTop: 40 }} />
      ) : aba === 'Alunos' ? (
        <>
          <TextInput
            style={styles.busca}
            placeholder="Buscar aluno..."
            placeholderTextColor="#9ca3af"
            value={filtro}
            onChangeText={setFiltro}
          />
          <FlatList
            data={filtrados}
            keyExtractor={i => i.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhum aluno cadastrado ainda.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('PerfilAluno', { aluno: item })}
              >
                <View style={[styles.avatar, { backgroundColor: avatarCor(item.nome) }]}>
                  <Text style={styles.avatarLetra}>{item.nome?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nome}>{item.nome}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <FlatList
          data={solicitacoes}
          keyExtractor={i => i.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 20, paddingTop: 8 }}
          ListEmptyComponent={
            <View style={styles.vazioBox}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#d1d5db" />
              <Text style={styles.vazio}>Nenhuma solicitação pendente.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.solCard}>
              <View style={[styles.avatar, { backgroundColor: avatarCor(item.alunoNome) }]}>
                <Text style={styles.avatarLetra}>{item.alunoNome?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{item.alunoNome}</Text>
                <Text style={styles.email}>{item.alunoEmail}</Text>
                <Text style={styles.solData}>
                  {item.criadoEm?.toDate().toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <View style={styles.solBotoes}>
                <TouchableOpacity style={styles.btnAprovar} onPress={() => handleAprovar(item)}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnRejeitar} onPress={() => handleRejeitar(item)}>
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827' },
  botaoNovo: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E31E24', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  botaoNovoTexto: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 14 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  tabAtiva: { borderBottomWidth: 2, borderBottomColor: '#E31E24' },
  tabTexto: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  tabTextoAtivo: { color: '#E31E24', fontWeight: '700' },
  badge: { backgroundColor: '#E31E24', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  busca: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 18 },
  nome: { fontWeight: '600', color: '#111827', fontSize: 15 },
  email: { color: '#6b7280', fontSize: 13, marginTop: 1 },
  vazio: { textAlign: 'center', color: '#9ca3af', marginTop: 16 },
  vazioBox: { alignItems: 'center', marginTop: 40, gap: 10 },
  solCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  solData: { color: '#9ca3af', fontSize: 12, marginTop: 1 },
  solBotoes: { flexDirection: 'row', gap: 8 },
  btnAprovar: { backgroundColor: '#22c55e', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnRejeitar: { backgroundColor: '#ef4444', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});
