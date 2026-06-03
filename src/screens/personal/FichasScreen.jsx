import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { PERSONAL_ADMIN_ID } from '../../config/admin';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import StatusBadge from '../../components/StatusBadge';

const FILTROS = ['Todas', 'Ativas', 'A vencer', 'Vencidas'];
const FILTRO_KEY = { 'Ativas': 'ativa', 'A vencer': 'a_vencer', 'Vencidas': 'vencida' };

export default function FichasScreen() {
  const { usuario } = useAuth();
  const [fichas, setFichas] = useState([]);
  const [alunosMap, setAlunosMap] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('Todas');

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        try {
          const [snapFichas, snapAlunos] = await Promise.all([
            getDocs(query(collection(db, 'fichas'), where('personalId', 'in', [...new Set([usuario.uid, PERSONAL_ADMIN_ID])]))),
            getDocs(query(collection(db, 'users'), where('perfil', '==', 'aluno'))),
          ]);
          const map = {};
          snapAlunos.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
          setAlunosMap(map);
          setFichas(snapFichas.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error(e);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, [])
  );

  const comStatus = fichas.filter(f => f.dataVencimento).map(f => ({
    ...f,
    status: calcularStatusFicha(f.dataVencimento),
  }));

  const counts = {
    ativa: comStatus.filter(f => f.status === 'ativa').length,
    a_vencer: comStatus.filter(f => f.status === 'a_vencer').length,
    vencida: comStatus.filter(f => f.status === 'vencida').length,
  };

  const filtradas = filtro === 'Todas'
    ? comStatus
    : comStatus.filter(f => f.status === FILTRO_KEY[filtro]);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Fichas</Text>

      <View style={styles.statsRow}>
        <StatChip label="Ativas" valor={counts.ativa} cor={CORES_STATUS.ativa} />
        <StatChip label="A vencer" valor={counts.a_vencer} cor={CORES_STATUS.a_vencer} />
        <StatChip label="Vencidas" valor={counts.vencida} cor={CORES_STATUS.vencida} />
      </View>

      <View style={styles.filtrosRow}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBotao, filtro === f && styles.filtroAtivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filtroTexto, filtro === f && styles.filtroTextoAtivo]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator color="#E31E24" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={i => i.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhuma ficha encontrada.</Text>}
          renderItem={({ item }) => {
            const aluno = alunosMap[item.alunoId];
            const { pct, diasRestantes } = item.criadoEm
              ? calcularProgresso(item.criadoEm, item.dataVencimento)
              : { pct: 0, diasRestantes: 0 };
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: avatarCor(aluno?.nome) }]}>
                    <Text style={styles.avatarLetra}>{aluno?.nome?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alunoNome}>{aluno?.nome || 'Aluno'}</Text>
                    <Text style={styles.fichaNome}>{item.nome}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <View style={styles.infoRow}>
                  <InfoItem label="Início" valor={item.criadoEm?.toDate
                    ? item.criadoEm.toDate().toLocaleDateString('pt-BR') : '—'} />
                  <InfoItem label="Duração" valor={item.semanas ? `${item.semanas * 7} dias` : '—'} />
                  <InfoItem label="Vence em" valor={item.dataVencimento?.toDate
                    ? item.dataVencimento.toDate().toLocaleDateString('pt-BR') : '—'} />
                </View>

                <View style={styles.progressoBg}>
                  <View style={[styles.progressoBar, { width: `${pct}%`, backgroundColor: CORES_STATUS[item.status] }]} />
                </View>
                <Text style={styles.diasRestantes}>
                  {item.status === 'vencida'
                    ? 'Ficha vencida'
                    : `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function StatChip({ label, valor, cor }) {
  return (
    <View style={[styles.statChip, { borderColor: cor }]}>
      <Text style={[styles.statNum, { color: cor }]}>{valor}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoItem({ label, valor }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 11, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{valor}</Text>
    </View>
  );
}

const CORES_AVATAR = ['#E31E24', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
function avatarCor(nome) {
  return CORES_AVATAR[(nome?.charCodeAt(0) || 0) % CORES_AVATAR.length];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20, paddingTop: 60 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statChip: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 10, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  filtrosRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filtroBotao: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filtroAtivo: { backgroundColor: '#E31E24', borderColor: '#E31E24' },
  filtroTexto: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filtroTextoAtivo: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 16 },
  alunoNome: { fontWeight: '700', color: '#111827', fontSize: 15 },
  fichaNome: { color: '#6b7280', fontSize: 13 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  progressoBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressoBar: { height: 6, borderRadius: 3 },
  diasRestantes: { fontSize: 12, color: '#6b7280', marginTop: 5, textAlign: 'right' },
  vazio: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
