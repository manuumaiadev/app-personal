import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { listarFichasAluno } from '../../services/fichas';
import { listarTreinosFicha } from '../../services/treinos';
import { listarHistoricoAluno } from '../../services/execucoes';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import { TIPOS_PERIOD } from '../../utils/periodizacao';

const TABS = ['Fichas', 'Anamnese', 'Histórico'];

function calcularSemanaAtual(ficha) {
  const inicio = ficha.criadoEm?.toDate?.();
  if (!inicio) return 0;
  const diff = Date.now() - inicio.getTime();
  const idx = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  return Math.max(0, Math.min(idx, (ficha.semanas || 1) - 1));
}

function normalizarPeriodo(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    const t = TIPOS_PERIOD.find(t => t.id === item);
    return t ? { tipo: t.id, series: t.series, reps: t.reps, carga: t.carga } : null;
  }
  return item;
}

export default function PerfilAlunoScreen({ route, navigation }) {
  const { aluno } = route.params;
  const { usuario } = useAuth();
  const [aba, setAba] = useState('Fichas');
  const [fichas, setFichas] = useState([]);
  const [fichaAtivaId, setFichaAtivaId] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        try {
          const fs = await listarFichasAluno(aluno.id);
          const sorted = [...fs].sort((a, b) => {
            const da = a.criadoEm?.toDate?.() || new Date(0);
            const db = b.criadoEm?.toDate?.() || new Date(0);
            return db - da;
          });
          setFichas(sorted);
          const ativa = sorted.find(
            f => f.dataVencimento && calcularStatusFicha(f.dataVencimento) !== 'vencida'
          );
          setFichaAtivaId(ativa?.id || null);
          const hist = await listarHistoricoAluno(aluno.id);
          setHistorico(hist);
        } catch (e) {
          console.error(e);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, [aluno.id])
  );

  const iniciais = aluno.nome?.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <View style={styles.container}>
      {/* NavBar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.navigate('AlunosList')} style={styles.voltar}>
          <Ionicons name="arrow-back" size={22} color="#E31E24" />
          <Text style={styles.voltarTexto}>Alunos</Text>
        </TouchableOpacity>
        <Text style={styles.navTitulo}>
          {aluno.nome?.split(' ')[0]} {aluno.nome?.split(' ').slice(-1)[0]}
        </Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { personalId: usuario.uid, alunoId: aluno.id, nomeOutro: aluno.nome })}>
            <Ionicons name="chatbubble-outline" size={22} color="#E31E24" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('MontarTreino', { aluno })}>
            <Ionicons name="create-outline" size={22} color="#E31E24" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Header aluno */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetra}>{iniciais}</Text>
        </View>
        <Text style={styles.nome}>{aluno.nome}</Text>
        {aluno.anamnese && (
          <Text style={styles.dadosResumo}>
            {aluno.anamnese.idade} anos · {aluno.anamnese.altura && `${aluno.anamnese.altura}m`} · {aluno.anamnese.peso && `${aluno.anamnese.peso}kg`}
          </Text>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[styles.tab, aba === t && styles.tabAtiva]} onPress={() => setAba(t)}>
            <Text style={[styles.tabTexto, aba === t && styles.tabTextoAtivo]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator color="#E31E24" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* ── FICHAS ── */}
          {aba === 'Fichas' && (
            fichas.length === 0 ? (
              <Text style={styles.vazio}>Nenhuma ficha cadastrada.</Text>
            ) : (
              <>
                {fichas.map(ficha => (
                  <FichaCard
                    key={ficha.id}
                    ficha={ficha}
                    aluno={aluno}
                    isAtiva={ficha.id === fichaAtivaId}
                    navigation={navigation}
                  />
                ))}
                <TouchableOpacity
                  style={styles.botaoNovaFicha}
                  onPress={() => navigation.navigate('MontarTreino', { aluno })}
                >
                  <Ionicons name="add" size={18} color="#E31E24" />
                  <Text style={styles.botaoNovaFichaTexto}>+ Nova ficha</Text>
                </TouchableOpacity>
              </>
            )
          )}

          {/* ── ANAMNESE ── */}
          {aba === 'Anamnese' && (
            aluno.anamnese ? (
              <View>
                <SecaoAnamnese titulo="DADOS PESSOAIS">
                  <View style={styles.anamneseGrid}>
                    <DadoItem label="Idade" valor={`${aluno.anamnese.idade} anos`} />
                    <DadoItem label="Peso" valor={`${aluno.anamnese.peso} kg`} />
                    <DadoItem label="Altura" valor={`${aluno.anamnese.altura} m`} />
                    {aluno.anamnese.profissao && <DadoItem label="Profissão" valor={aluno.anamnese.profissao} />}
                  </View>
                </SecaoAnamnese>
                <SecaoAnamnese titulo="OBJETIVOS">
                  {aluno.anamnese.objetivo && <InfoLinha label="Objetivo principal" valor={aluno.anamnese.objetivo} />}
                  {aluno.anamnese.enfaseCorporal && <InfoLinha label="Ênfase corporal" valor={aluno.anamnese.enfaseCorporal} />}
                </SecaoAnamnese>
                <SecaoAnamnese titulo="SAÚDE">
                  {aluno.anamnese.restricoes && <InfoLinha label="Restrições / lesões" valor={aluno.anamnese.restricoes} />}
                  {aluno.anamnese.medicamentos && <InfoLinha label="Medicamentos" valor={aluno.anamnese.medicamentos} />}
                </SecaoAnamnese>
              </View>
            ) : (
              <Text style={styles.vazio}>Anamnese não preenchida.</Text>
            )
          )}

          {/* ── HISTÓRICO ── */}
          {aba === 'Histórico' && (
            historico.length === 0 ? (
              <Text style={styles.vazio}>Nenhum treino registrado ainda.</Text>
            ) : (
              historico.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.histCard}
                  onPress={() => setExpandido(expandido === item.id ? null : item.id)}
                >
                  <View style={styles.histHeader}>
                    <View style={[styles.letraBadge, { backgroundColor: '#fde8e9' }]}>
                      <Text style={[styles.letraTexto, { color: '#E31E24' }]}>{item.letra}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histData}>
                        {item.dataHora?.toDate().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </Text>
                      <Text style={styles.histQtd}>{item.exercicios?.length || 0} exercícios</Text>
                    </View>
                    <Ionicons name={expandido === item.id ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
                  </View>
                  {expandido === item.id && item.exercicios?.map((ex, i) => (
                    <View key={i} style={styles.exRow}>
                      <Text style={styles.exNome}>{ex.nome}</Text>
                      <Text style={styles.exCargas}>{ex.cargas?.filter(Boolean).join(' | ')} kg</Text>
                    </View>
                  ))}
                </TouchableOpacity>
              ))
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── FichaCard ────────────────────────────────────────────────────────────────

function FichaCard({ ficha, aluno, isAtiva, navigation }) {
  const [aberta, setAberta] = useState(isAtiva);
  const [treinos, setTreinos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [jaCarregou, setJaCarregou] = useState(false);

  const semanaAtual = calcularSemanaAtual(ficha);
  const status = ficha.dataVencimento ? calcularStatusFicha(ficha.dataVencimento) : 'vencida';
  const cor = CORES_STATUS[status];
  const { pct } = ficha.criadoEm
    ? calcularProgresso(ficha.criadoEm, ficha.dataVencimento)
    : { pct: 0 };

  useEffect(() => {
    if (isAtiva) carregarTreinos();
  }, []);

  async function carregarTreinos() {
    if (jaCarregou) return;
    setCarregando(true);
    try {
      const ts = await listarTreinosFicha(ficha.id);
      setTreinos(ts);
      setJaCarregou(true);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }

  async function toggleAbrir() {
    setAberta(prev => !prev);
    if (!aberta && !jaCarregou) await carregarTreinos();
  }

  return (
    <View style={[fcStyles.card, isAtiva && fcStyles.cardAtivo]}>
      <TouchableOpacity style={fcStyles.cabecalho} onPress={toggleAbrir} activeOpacity={0.7}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={fcStyles.nome}>{ficha.nome}</Text>
            <View style={[fcStyles.badge, { backgroundColor: cor + '20' }]}>
              <Text style={[fcStyles.badgeTexto, { color: cor }]}>{LABELS_STATUS[status]}</Text>
            </View>
          </View>
          <Text style={fcStyles.datas}>
            {ficha.criadoEm?.toDate?.().toLocaleDateString('pt-BR') || '—'}
            {' → '}
            {ficha.dataVencimento?.toDate?.().toLocaleDateString('pt-BR') || '—'}
            {'  ·  '}{ficha.semanas} sem
          </Text>
        </View>
        <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
      </TouchableOpacity>

      <View style={fcStyles.progressoBg}>
        <View style={[fcStyles.progressoBar, { width: `${pct}%`, backgroundColor: cor }]} />
      </View>

      {aberta && (
        <View style={fcStyles.treinosArea}>
          {carregando ? (
            <ActivityIndicator color="#E31E24" size="small" style={{ marginVertical: 14 }} />
          ) : treinos.length === 0 ? (
            <Text style={fcStyles.vazio}>Nenhum treino nesta ficha.</Text>
          ) : (
            treinos.map(treino => {
              const periodoAtual = normalizarPeriodo((treino.periodizacao || [])[semanaAtual]);
              const tipoAtual = periodoAtual ? TIPOS_PERIOD.find(t => t.id === periodoAtual.tipo) : null;
              return (
                <TouchableOpacity
                  key={treino.id}
                  style={fcStyles.treinoCard}
                  onPress={() => navigation.navigate('EditarTreino', {
                    treino, aluno, semanas: ficha.semanas || 4,
                  })}
                  activeOpacity={0.7}
                >
                  <View style={fcStyles.treinoHeader}>
                    <View style={fcStyles.letraBadge}>
                      <Text style={fcStyles.letraTexto}>{treino.letra}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={fcStyles.treinoNome}>Treino {treino.letra}</Text>
                      {treino.diasDaSemana?.length > 0 && (
                        <Text style={fcStyles.treinoDias}>{treino.diasDaSemana.join(' · ')}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                  </View>

                  {/* Badge de periodização da semana atual */}
                  {tipoAtual && (
                    <View style={[fcStyles.periodBadge, { backgroundColor: tipoAtual.cor + '18', borderColor: tipoAtual.cor }]}>
                      <Ionicons name={tipoAtual.icon} size={12} color={tipoAtual.cor} />
                      <Text style={[fcStyles.periodTexto, { color: tipoAtual.cor }]}>
                        Semana {semanaAtual + 1} · {tipoAtual.label} · {periodoAtual.series}×{periodoAtual.reps} · {periodoAtual.carga}%
                      </Text>
                    </View>
                  )}

                  {treino.exercicios?.map((ex, i) => (
                    <Text key={i} style={fcStyles.exItem}>• {ex.nome} — {ex.series}×{ex.reps}</Text>
                  ))}
                </TouchableOpacity>
              );
            })
          )}

          {status !== 'ativa' && (
            <TouchableOpacity
              style={fcStyles.btnRenovar}
              onPress={() => navigation.navigate('RenovarFicha', { ficha, aluno })}
            >
              <Ionicons name="refresh-outline" size={14} color="#E31E24" />
              <Text style={fcStyles.btnRenovarTexto}>Renovar ficha</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SecaoAnamnese({ titulo, children }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 10 }}>{titulo}</Text>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
        {children}
      </View>
    </View>
  );
}

function DadoItem({ label, valor }) {
  return (
    <View style={{ width: '48%', marginBottom: 10 }}>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontWeight: '700', color: '#111827' }}>{valor}</Text>
    </View>
  );
}

function InfoLinha({ label, valor }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontWeight: '600', color: '#111827', lineHeight: 20 }}>{valor}</Text>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voltarTexto: { color: '#E31E24', fontSize: 15 },
  navTitulo: { fontWeight: '700', fontSize: 16, color: '#111827' },
  header: { alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E31E24', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 26 },
  nome: { fontSize: 20, fontWeight: '700', color: '#111827' },
  dadosResumo: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabAtiva: { borderBottomWidth: 2, borderBottomColor: '#E31E24' },
  tabTexto: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tabTextoAtivo: { color: '#E31E24', fontWeight: '700' },
  anamneseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  histCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  histHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  histData: { fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  histQtd: { color: '#6b7280', fontSize: 13 },
  letraBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#E31E24', justifyContent: 'center', alignItems: 'center' },
  letraTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  exNome: { color: '#374151', fontWeight: '500' },
  exCargas: { color: '#6b7280', fontSize: 13 },
  vazio: { textAlign: 'center', color: '#9ca3af', marginTop: 20 },
  botaoNovaFicha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderWidth: 1.5, borderColor: '#E31E24', borderRadius: 10, marginTop: 4 },
  botaoNovaFichaTexto: { color: '#E31E24', fontWeight: '600', fontSize: 15 },
});

const fcStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardAtivo: { borderWidth: 1.5, borderColor: '#E31E24' },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  nome: { fontWeight: '700', fontSize: 15, color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  datas: { fontSize: 12, color: '#6b7280' },
  progressoBg: { height: 5, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressoBar: { height: 5, borderRadius: 3 },
  treinosArea: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, gap: 10 },
  treinoCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f3f4f6' },
  treinoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  letraBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#E31E24', justifyContent: 'center', alignItems: 'center' },
  letraTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  treinoNome: { fontWeight: '700', color: '#111827', fontSize: 15 },
  treinoDias: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  exItem: { color: '#374151', fontSize: 13, marginTop: 4, paddingLeft: 2 },
  periodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  periodTexto: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  vazio: { color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  btnRenovar: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: '#E31E24', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  btnRenovarTexto: { color: '#E31E24', fontWeight: '600', fontSize: 13 },
});
