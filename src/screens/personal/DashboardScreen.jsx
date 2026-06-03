import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import { listarExecucoesRecentes, listarExecucoesHoje } from '../../services/execucoes';
import { limparDadosFicticios } from '../../utils/seed';
import { PERSONAL_ADMIN_ID } from '../../config/admin';
import StatusBadge from '../../components/StatusBadge';

const CORES_AVATAR = ['#E31E24', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
function avatarCor(nome) {
  return CORES_AVATAR[(nome?.charCodeAt(0) || 0) % CORES_AVATAR.length];
}

function tempoAtras(date) {
  if (!date) return null;
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 2) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  if (h < 24) return `há ${h}h`;
  if (d === 1) return 'ontem';
  return `há ${d} dias`;
}

const FILTROS = ['Todas', 'Ativas', 'A vencer', 'Vencidas'];
const FILTRO_KEY = { 'Ativas': 'ativa', 'A vencer': 'a_vencer', 'Vencidas': 'vencida' };

export default function DashboardScreen({ navigation }) {
  const { usuario } = useAuth();
  const [todasFichas, setTodasFichas] = useState([]);
  const [alunosMap, setAlunosMap] = useState({});
  const [treinosHoje, setTreinosHoje] = useState(0);
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('Todas');
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setTodasFichas([]);
        setCarregando(true);
        try {
          const [snapAlunos, snapFichas] = await Promise.all([
            getDocs(query(collection(db, 'users'), where('perfil', '==', 'aluno'))),
            getDocs(query(collection(db, 'fichas'), where('personalId', 'in', [...new Set([usuario.uid, PERSONAL_ADMIN_ID])]))),
          ]);

          const alunosList = snapAlunos.docs.map(d => ({ id: d.id, ...d.data() }));
          const fichasList = snapFichas.docs.map(d => ({ id: d.id, ...d.data() }));

          const map = {};
          alunosList.forEach(a => { map[a.id] = a; });
          setAlunosMap(map);

          // Alunos ativos
          const fichasPorAluno = {};
          fichasList.forEach(f => {
            if (!fichasPorAluno[f.alunoId]) fichasPorAluno[f.alunoId] = [];
            fichasPorAluno[f.alunoId].push(f);
          });
          const ativos = alunosList.filter(a =>
            (fichasPorAluno[a.id] || []).some(f =>
              f.dataVencimento && calcularStatusFicha(f.dataVencimento) !== 'vencida'
            )
          );
          setAlunosAtivos(ativos.length);

          // Execuções
          let execRecentes = [];
          let execHoje = [];
          if (alunosList.length > 0) {
            const ids = alunosList.map(a => a.id);
            [execRecentes, execHoje] = await Promise.all([
              listarExecucoesRecentes(ids),
              listarExecucoesHoje(ids),
            ]);
          }
          setTreinosHoje(execHoje.length);

          // Última execução por ficha
          const ultimaExecPorFicha = {};
          execRecentes.forEach(e => {
            if (!e.fichaId) return;
            const atual = ultimaExecPorFicha[e.fichaId];
            const dataE = e.dataHora?.toDate?.() || new Date(0);
            if (!atual || dataE > (atual._data || new Date(0))) {
              ultimaExecPorFicha[e.fichaId] = { ...e, _data: dataE };
            }
          });

          const alunosHoje = new Set(execHoje.map(e => e.alunoId));

          // Todas as fichas com dados extras, ordenadas por execução mais recente
          const fichasComDados = fichasList
            .filter(f => f.dataVencimento && map[f.alunoId])
            .map(f => ({
              ...f,
              status: calcularStatusFicha(f.dataVencimento),
              ultimaExec: ultimaExecPorFicha[f.id] || null,
              fezHoje: alunosHoje.has(f.alunoId),
            }))
            .sort((a, b) => {
              const da = a.ultimaExec?._data || new Date(0);
              const db2 = b.ultimaExec?._data || new Date(0);
              return db2 - da;
            });

          setTodasFichas(fichasComDados);
        } catch (e) {
          console.error(e);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, [refreshKey])
  );

  const counts = {
    ativa: todasFichas.filter(f => f.status === 'ativa').length,
    a_vencer: todasFichas.filter(f => f.status === 'a_vencer').length,
    vencida: todasFichas.filter(f => f.status === 'vencida').length,
  };

  const fichasFiltradas = filtro === 'Todas'
    ? todasFichas
    : todasFichas.filter(f => f.status === FILTRO_KEY[filtro]);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Chips de status fichas */}
      <View style={styles.chipsRow}>
        <StatChip label="Ativas" valor={counts.ativa} cor={CORES_STATUS.ativa} />
        <StatChip label="A vencer" valor={counts.a_vencer} cor={CORES_STATUS.a_vencer} />
        <StatChip label="Vencidas" valor={counts.vencida} cor={CORES_STATUS.vencida} />
      </View>

      {/* Filtros */}
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

      {/* Lista de fichas */}
      {carregando ? (
        <ActivityIndicator color="#E31E24" style={{ marginTop: 20 }} />
      ) : fichasFiltradas.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma ficha encontrada.</Text>
      ) : (
        fichasFiltradas.map(ficha => {
          const aluno = alunosMap[ficha.alunoId];
          const { pct, diasRestantes } = ficha.criadoEm
            ? calcularProgresso(ficha.criadoEm, ficha.dataVencimento)
            : { pct: 0, diasRestantes: 0 };
          const cor = CORES_STATUS[ficha.status];
          const ultimaData = ficha.ultimaExec?._data;

          return (
            <TouchableOpacity
              key={ficha.id}
              style={styles.fichaCard}
              onPress={() => aluno && navigation.navigate('Alunos', {
                screen: 'PerfilAluno',
                params: { aluno },
              })}
              activeOpacity={0.7}
            >
              <View style={styles.cardTopo}>
                <View style={[styles.avatar, { backgroundColor: avatarCor(aluno?.nome) }]}>
                  <Text style={styles.avatarLetra}>{aluno?.nome?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alunoNome}>{aluno?.nome || 'Aluno'}</Text>
                  <Text style={styles.fichaNome}>{ficha.nome}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: cor + '20' }]}>
                  <Text style={[styles.badgeTexto, { color: cor }]}>{LABELS_STATUS[ficha.status]}</Text>
                </View>
              </View>

              {/* Info: início / duração / vence em */}
              <View style={styles.infoRow}>
                <InfoItem label="Início" valor={ficha.criadoEm?.toDate
                  ? ficha.criadoEm.toDate().toLocaleDateString('pt-BR') : '—'} />
                <InfoItem label="Duração" valor={ficha.semanas ? `${ficha.semanas * 7} dias` : '—'} />
                <InfoItem label="Vence em" valor={ficha.dataVencimento?.toDate
                  ? ficha.dataVencimento.toDate().toLocaleDateString('pt-BR') : '—'} />
              </View>

              {/* Barra de progresso */}
              <View style={styles.progressoBg}>
                <View style={[styles.progressoBar, { width: `${pct}%`, backgroundColor: cor }]} />
              </View>
              <View style={styles.cardRodape}>
                {ficha.fezHoje ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                    <Text style={[styles.ultimoTreino, { color: '#16a34a', fontWeight: '600' }]}>
                      Treinou hoje
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.ultimoTreino}>
                    {ultimaData ? `Último treino ${tempoAtras(ultimaData)}` : 'Nenhum treino ainda'}
                  </Text>
                )}
                <Text style={styles.diasRestantes}>
                  {ficha.status === 'vencida' ? 'Vencida' : `${diasRestantes}d restantes`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <LimparDemoBtn personalId={usuario.uid} onDone={() => setRefreshKey(k => k + 1)} />
    </ScrollView>
  );
}

function LimparDemoBtn({ personalId, onDone }) {
  const [limpando, setLimpando] = useState(false);
  const [ok, setOk] = useState(false);

  if (ok) return null;

  return (
    <TouchableOpacity
      style={styles.btnLimparDemo}
      onPress={async () => {
        setLimpando(true);
        try {
          await limparDadosFicticios(personalId);
          setOk(true);
          onDone();
        } catch (e) {
          console.error(e);
        } finally {
          setLimpando(false);
        }
      }}
      disabled={limpando}
    >
      {limpando
        ? <><ActivityIndicator color="#9ca3af" size="small" /><Text style={[styles.btnLimparDemoTexto, { marginLeft: 8 }]}>Removendo...</Text></>
        : <Text style={styles.btnLimparDemoTexto}>Remover alunos de demonstração</Text>
      }
    </TouchableOpacity>
  );
}

function StatChip({ label, valor, cor }) {
  return (
    <View style={[styles.chip, { borderColor: cor }]}>
      <Text style={[styles.chipValor, { color: cor }]}>{valor}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: '100%', marginBottom: -200 , marginTop: -200 },
  saudacao: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'right' },
  subtitulo: { color: '#6b7280', fontSize: 13, marginTop: 2, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValor: { fontSize: 32, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  chipsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: '#fff' },
  chipValor: { fontSize: 20, fontWeight: '700' },
  chipLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  filtrosRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filtroBotao: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filtroAtivo: { backgroundColor: '#E31E24', borderColor: '#E31E24' },
  filtroTexto: { fontSize: 13, color: '#374151', fontWeight: '500' },
  filtroTextoAtivo: { color: '#fff', fontWeight: '600' },
  fichaCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 18 },
  alunoNome: { fontWeight: '700', color: '#111827', fontSize: 15 },
  fichaNome: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginBottom: 10 },
  progressoBg: { height: 7, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressoBar: { height: 7, borderRadius: 4 },
  cardRodape: { flexDirection: 'row', justifyContent: 'space-between' },
  ultimoTreino: { fontSize: 12, color: '#6b7280' },
  diasRestantes: { fontSize: 12, color: '#9ca3af' },
  vazio: { color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  btnLimparDemo: { marginTop: 32, marginBottom: 40, alignItems: 'center', padding: 12 },
  btnLimparDemoTexto: { color: '#d1d5db', fontSize: 12, flexDirection: 'row', alignItems: 'center' },
});
