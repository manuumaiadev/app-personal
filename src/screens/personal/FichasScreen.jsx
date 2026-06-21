import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PERSONAL_ADMIN_ID } from '../../config/admin';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import StatusBadge from '../../components/StatusBadge';

const FILTROS = ['Todas', 'Ativas', 'A vencer', 'Vencidas'];
const FILTRO_KEY = { 'Ativas': 'ativa', 'A vencer': 'a_vencer', 'Vencidas': 'vencida' };

export default function FichasScreen() {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
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
    <View style={s.container}>
      <Text style={s.titulo}>Fichas</Text>

      <View style={s.statsRow}>
        <StatChip label="Ativas" valor={counts.ativa} cor={CORES_STATUS.ativa} theme={theme} />
        <StatChip label="A vencer" valor={counts.a_vencer} cor={CORES_STATUS.a_vencer} theme={theme} />
        <StatChip label="Vencidas" valor={counts.vencida} cor={CORES_STATUS.vencida} theme={theme} />
      </View>

      <View style={s.filtrosRow}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filtroBotao, filtro === f && s.filtroAtivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[s.filtroTexto, filtro === f && s.filtroTextoAtivo]}>{f}</Text>
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
          ListEmptyComponent={<Text style={s.vazio}>Nenhuma ficha encontrada.</Text>}
          renderItem={({ item }) => {
            const aluno = alunosMap[item.alunoId];
            const { pct, diasRestantes } = item.criadoEm
              ? calcularProgresso(item.criadoEm, item.dataVencimento)
              : { pct: 0, diasRestantes: 0 };
            return (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={[s.avatar, { backgroundColor: avatarCor(aluno?.nome) }]}>
                    <Text style={s.avatarLetra}>{aluno?.nome?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alunoNome}>{aluno?.nome || 'Aluno'}</Text>
                    <Text style={s.fichaNome}>{item.nome}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <View style={s.infoRow}>
                  <InfoItem label="Início" valor={item.criadoEm?.toDate
                    ? item.criadoEm.toDate().toLocaleDateString('pt-BR') : '—'} theme={theme} />
                  <InfoItem label="Duração" valor={item.semanas ? `${item.semanas * 7} dias` : '—'} theme={theme} />
                  <InfoItem label="Vence em" valor={item.dataVencimento?.toDate
                    ? item.dataVencimento.toDate().toLocaleDateString('pt-BR') : '—'} theme={theme} />
                </View>

                <View style={s.progressoBg}>
                  <View style={[s.progressoBar, { width: `${pct}%`, backgroundColor: CORES_STATUS[item.status] }]} />
                </View>
                <Text style={s.diasRestantes}>
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

function StatChip({ label, valor, cor, theme }) {
  return (
    <View style={{ flex: 1, borderWidth: 1.5, borderColor: cor, borderRadius: 10, padding: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: cor }}>{valor}</Text>
      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function InfoItem({ label, valor, theme }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 11, color: theme.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>{valor}</Text>
    </View>
  );
}

const CORES_AVATAR = ['#E31E24', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
function avatarCor(nome) {
  return CORES_AVATAR[(nome?.charCodeAt(0) || 0) % CORES_AVATAR.length];
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20, paddingTop: 60 },
    titulo: { fontSize: 24, fontWeight: '700', color: t.textPrimary, marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    filtrosRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    filtroBotao: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border },
    filtroAtivo: { backgroundColor: t.red, borderColor: t.red },
    filtroTexto: { fontSize: 13, color: t.textPrimary, fontWeight: '500' },
    filtroTextoAtivo: { color: '#fff' },
    card: { backgroundColor: t.surface, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 16 },
    alunoNome: { fontWeight: '700', color: t.textPrimary, fontSize: 15 },
    fichaNome: { color: t.textSecondary, fontSize: 13 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border },
    progressoBg: { height: 6, backgroundColor: t.elevated, borderRadius: 3, overflow: 'hidden' },
    progressoBar: { height: 6, borderRadius: 3 },
    diasRestantes: { fontSize: 12, color: t.textSecondary, marginTop: 5, textAlign: 'right' },
    vazio: { textAlign: 'center', color: t.textTertiary, marginTop: 40 },
  };
}
