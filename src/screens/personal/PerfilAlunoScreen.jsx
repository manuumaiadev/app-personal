import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { listarFichasAluno } from '../../services/fichas';
import { listarTreinosFicha } from '../../services/treinos';
import { listarHistoricoAluno } from '../../services/execucoes';
import { buscarNotas, salvarNotas } from '../../services/notas';
import { calcularStatusFicha, calcularProgresso, CORES_STATUS, LABELS_STATUS } from '../../utils/fichaStatus';
import { TIPOS_PERIOD } from '../../utils/periodizacao';

const TABS = ['Fichas', 'Anamnese', 'Historico'];

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
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const scrollRef = useRef(null);

  const [aba, setAba] = useState('Fichas');
  const [fichas, setFichas] = useState([]);
  const [fichaAtivaId, setFichaAtivaId] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [histExpandido, setHistExpandido] = useState(false);

  const [notas, setNotas] = useState('');
  const [notasSalvas, setNotasSalvas] = useState('');
  const [salvandoNotas, setSalvandoNotas] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        try {
          const [fs, hist, texto] = await Promise.all([
            listarFichasAluno(aluno.id),
            listarHistoricoAluno(aluno.id),
            buscarNotas(usuario.uid, aluno.id),
          ]);
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
          setHistorico(hist);
          setNotas(texto);
          setNotasSalvas(texto);
        } catch (e) {
          console.error(e);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, [aluno.id])
  );

  async function handleSalvarNotas() {
    setSalvandoNotas(true);
    try {
      await salvarNotas(usuario.uid, aluno.id, notas);
      setNotasSalvas(notas);
    } catch (e) {
      console.error(e);
    } finally {
      setSalvandoNotas(false);
    }
  }

  function irParaNotas() {
    setAba('Anamnese');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }

  const iniciais = aluno.nome?.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <View style={s.container}>
      {/* NavBar */}
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => navigation.navigate('AlunosList')} style={s.voltar}>
          <Ionicons name="arrow-back" size={22} color={theme.red} />
          <Text style={s.voltarTexto}>Alunos</Text>
        </TouchableOpacity>
        <Text style={s.navTitulo}>
          {aluno.nome?.split(' ')[0]} {aluno.nome?.split(' ').slice(-1)[0]}
        </Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { personalId: usuario.uid, alunoId: aluno.id, nomeOutro: aluno.nome })}>
            <Ionicons name="chatbubble-outline" size={22} color={theme.red} />
          </TouchableOpacity>
          <TouchableOpacity onPress={irParaNotas}>
            <Ionicons name="document-text-outline" size={22} color={theme.red} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Header aluno */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarLetra}>{iniciais}</Text>
        </View>
        <Text style={s.nome}>{aluno.nome}</Text>
        {aluno.anamnese && (
          <Text style={s.dadosResumo}>
            {aluno.anamnese.idade} anos · {aluno.anamnese.altura && `${aluno.anamnese.altura}m`} · {aluno.anamnese.peso && `${aluno.anamnese.peso}kg`}
          </Text>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, aba === t && s.tabAtiva]} onPress={() => setAba(t)}>
            <Text style={[s.tabTexto, aba === t && s.tabTextoAtivo]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {carregando ? (
        <ActivityIndicator color="#E31E24" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* FICHAS */}
          {aba === 'Fichas' && (
            fichas.length === 0 ? (
              <Text style={s.vazio}>Nenhuma ficha cadastrada.</Text>
            ) : (
              <>
                {fichas.map(ficha => (
                  <FichaCard
                    key={ficha.id}
                    ficha={ficha}
                    aluno={aluno}
                    isAtiva={ficha.id === fichaAtivaId}
                    navigation={navigation}
                    theme={theme}
                  />
                ))}
                <TouchableOpacity
                  style={s.botaoNovaFicha}
                  onPress={() => navigation.navigate('MontarTreino', { aluno })}
                >
                  <Ionicons name="add" size={18} color={theme.red} />
                  <Text style={s.botaoNovaFichaTexto}>+ Nova ficha</Text>
                </TouchableOpacity>
              </>
            )
          )}

          {/* ANAMNESE */}
          {aba === 'Anamnese' && (
            <View>
              {aluno.anamnese ? (
                <View>
                  <SecaoAnamnese titulo="DADOS PESSOAIS" theme={theme}>
                    <View style={s.anamneseGrid}>
                      <DadoItem label="Idade" valor={`${aluno.anamnese.idade} anos`} theme={theme} />
                      <DadoItem label="Peso" valor={`${aluno.anamnese.peso} kg`} theme={theme} />
                      <DadoItem label="Altura" valor={`${aluno.anamnese.altura} m`} theme={theme} />
                      {aluno.anamnese.profissao && <DadoItem label="Profissao" valor={aluno.anamnese.profissao} theme={theme} />}
                    </View>
                  </SecaoAnamnese>
                  <SecaoAnamnese titulo="OBJETIVOS" theme={theme}>
                    {aluno.anamnese.objetivo && <InfoLinha label="Objetivo principal" valor={aluno.anamnese.objetivo} theme={theme} />}
                    {aluno.anamnese.enfaseCorporal && <InfoLinha label="Enfase corporal" valor={aluno.anamnese.enfaseCorporal} theme={theme} />}
                  </SecaoAnamnese>
                  <SecaoAnamnese titulo="SAUDE" theme={theme}>
                    {aluno.anamnese.restricoes && <InfoLinha label="Restricoes / lesoes" valor={aluno.anamnese.restricoes} theme={theme} />}
                    {aluno.anamnese.medicamentos && <InfoLinha label="Medicamentos" valor={aluno.anamnese.medicamentos} theme={theme} />}
                  </SecaoAnamnese>
                </View>
              ) : (
                <Text style={[s.vazio, { marginBottom: 20 }]}>Anamnese nao preenchida.</Text>
              )}

              {/* Bloco de Notas - somente personal */}
              <View style={s.notasContainer}>
                <View style={s.notasHeader}>
                  <Ionicons name="lock-closed" size={12} color={theme.textTertiary} />
                  <Text style={s.notasTitulo}>NOTAS DO PERSONAL</Text>
                </View>
                <TextInput
                  style={s.notasInput}
                  multiline
                  placeholder="Anotacoes privadas sobre este aluno..."
                  placeholderTextColor={theme.placeholder}
                  value={notas}
                  onChangeText={setNotas}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[s.btnSalvarNotas, (notas === notasSalvas || salvandoNotas) && s.btnSalvarNotasDisabled]}
                  onPress={handleSalvarNotas}
                  disabled={notas === notasSalvas || salvandoNotas}
                >
                  {salvandoNotas
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.btnSalvarNotasTexto}>
                        {notas === notasSalvas ? 'Salvo' : 'Salvar notas'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* HISTORICO */}
          {aba === 'Historico' && (
            historico.length === 0 ? (
              <Text style={s.vazio}>Nenhum treino registrado ainda.</Text>
            ) : (
              <>
                {(histExpandido ? historico : historico.slice(0, 1)).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.histCard}
                    onPress={() => setExpandido(expandido === item.id ? null : item.id)}
                  >
                    <View style={s.histHeader}>
                      <View style={[s.letraBadge, { backgroundColor: '#fde8e9' }]}>
                        <Text style={[s.letraTexto, { color: theme.red }]}>{item.letra}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.histData}>
                          {item.dataHora?.toDate().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </Text>
                        <Text style={s.histQtd}>{item.exercicios?.length || 0} exercicios</Text>
                      </View>
                      <Ionicons name={expandido === item.id ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} />
                    </View>
                    {expandido === item.id && item.exercicios?.map((ex, i) => (
                      <View key={i} style={s.exRow}>
                        <Text style={s.exNome}>{ex.nome}</Text>
                        <Text style={s.exCargas}>{ex.cargas?.filter(Boolean).join(' | ')} kg</Text>
                      </View>
                    ))}
                  </TouchableOpacity>
                ))}

                {historico.length > 1 && (
                  <TouchableOpacity style={s.expandBtn} onPress={() => setHistExpandido(!histExpandido)}>
                    <Text style={s.expandTexto}>
                      {histExpandido ? 'Ver menos' : `Ver historico completo (${historico.length})`}
                    </Text>
                    <Ionicons name={histExpandido ? 'chevron-up' : 'chevron-down'} size={14} color={theme.red} />
                  </TouchableOpacity>
                )}
              </>
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

// FichaCard
function FichaCard({ ficha, aluno, isAtiva, navigation, theme }) {
  const fc = useMemo(() => makeFcStyles(theme), [theme]);
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
    <View style={[fc.card, isAtiva && fc.cardAtivo]}>
      <TouchableOpacity style={fc.cabecalho} onPress={toggleAbrir} activeOpacity={0.7}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={fc.nome}>{ficha.nome}</Text>
            <View style={[fc.badge, { backgroundColor: cor + '20' }]}>
              <Text style={[fc.badgeTexto, { color: cor }]}>{LABELS_STATUS[status]}</Text>
            </View>
          </View>
          <Text style={fc.datas}>
            {ficha.criadoEm?.toDate?.().toLocaleDateString('pt-BR') || '—'}
            {' -> '}
            {ficha.dataVencimento?.toDate?.().toLocaleDateString('pt-BR') || '—'}
            {'  ·  '}{ficha.semanas} sem
          </Text>
        </View>
        <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} />
      </TouchableOpacity>

      <View style={fc.progressoBg}>
        <View style={[fc.progressoBar, { width: `${pct}%`, backgroundColor: cor }]} />
      </View>

      {aberta && (
        <View style={fc.treinosArea}>
          {carregando ? (
            <ActivityIndicator color="#E31E24" size="small" style={{ marginVertical: 14 }} />
          ) : treinos.length === 0 ? (
            <Text style={fc.vazio}>Nenhum treino nesta ficha.</Text>
          ) : (
            treinos.map(treino => {
              const periodoAtual = normalizarPeriodo((treino.periodizacao || [])[semanaAtual]);
              const tipoAtual = periodoAtual ? TIPOS_PERIOD.find(t => t.id === periodoAtual.tipo) : null;
              return (
                <TouchableOpacity
                  key={treino.id}
                  style={fc.treinoCard}
                  onPress={() => navigation.navigate('EditarTreino', {
                    treino, aluno, semanas: ficha.semanas || 4,
                  })}
                  activeOpacity={0.7}
                >
                  <View style={fc.treinoHeader}>
                    <View style={fc.letraBadge}>
                      <Text style={fc.letraTexto}>{treino.letra}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={fc.treinoNome}>Treino {treino.letra}</Text>
                      {treino.diasDaSemana?.length > 0 && (
                        <Text style={fc.treinoDias}>{treino.diasDaSemana.join(' · ')}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                  </View>

                  {tipoAtual && (
                    <View style={[fc.periodBadge, { backgroundColor: tipoAtual.cor + '18', borderColor: tipoAtual.cor }]}>
                      <Ionicons name={tipoAtual.icon} size={12} color={tipoAtual.cor} />
                      <Text style={[fc.periodTexto, { color: tipoAtual.cor }]}>
                        Semana {semanaAtual + 1} · {tipoAtual.label} · {periodoAtual.series}×{periodoAtual.reps} · {periodoAtual.carga}%
                      </Text>
                    </View>
                  )}

                  {treino.exercicios?.map((ex, i) => (
                    <Text key={i} style={fc.exItem}>• {ex.nome} — {ex.series}×{ex.reps}</Text>
                  ))}
                </TouchableOpacity>
              );
            })
          )}

          {status !== 'ativa' && (
            <TouchableOpacity
              style={fc.btnRenovar}
              onPress={() => navigation.navigate('RenovarFicha', { ficha, aluno })}
            >
              <Ionicons name="refresh-outline" size={14} color={theme.red} />
              <Text style={fc.btnRenovarTexto}>Renovar ficha</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// Helpers
function SecaoAnamnese({ titulo, children, theme }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textTertiary, letterSpacing: 1, marginBottom: 10 }}>{titulo}</Text>
      <View style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
        {children}
      </View>
    </View>
  );
}

function DadoItem({ label, valor, theme }) {
  return (
    <View style={{ width: '48%', marginBottom: 10 }}>
      <Text style={{ fontSize: 11, color: theme.textTertiary, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{valor}</Text>
    </View>
  );
}

function InfoLinha({ label, valor, theme }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 11, color: theme.textTertiary, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontWeight: '600', color: theme.textPrimary, lineHeight: 20 }}>{valor}</Text>
    </View>
  );
}

// Estilos
function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
    voltar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    voltarTexto: { color: t.red, fontSize: 15 },
    navTitulo: { fontWeight: '700', fontSize: 16, color: t.textPrimary },
    header: { alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: t.border },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 26 },
    nome: { fontSize: 20, fontWeight: '700', color: t.textPrimary },
    dadosResumo: { color: t.textSecondary, fontSize: 13, marginTop: 4 },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabAtiva: { borderBottomWidth: 2, borderBottomColor: t.red },
    tabTexto: { fontSize: 13, color: t.textSecondary, fontWeight: '500' },
    tabTextoAtivo: { color: t.red, fontWeight: '700' },
    anamneseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    histCard: { backgroundColor: t.surface, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    histHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    histData: { fontWeight: '600', color: t.textPrimary, textTransform: 'capitalize' },
    histQtd: { color: t.textSecondary, fontSize: 13 },
    letraBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center' },
    letraTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
    exRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: t.border },
    exNome: { color: t.textPrimary, fontWeight: '500' },
    exCargas: { color: t.textSecondary, fontSize: 13 },
    vazio: { textAlign: 'center', color: t.textTertiary, marginTop: 20 },
    botaoNovaFicha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderWidth: 1.5, borderColor: t.red, borderRadius: 10, marginTop: 4 },
    botaoNovaFichaTexto: { color: t.red, fontWeight: '600', fontSize: 15 },
    expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
    expandTexto: { fontSize: 13, fontWeight: '600', color: t.red },
    // Bloco de notas
    notasContainer: { marginBottom: 8 },
    notasHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
    notasTitulo: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 1 },
    notasInput: {
      backgroundColor: t.surface, borderRadius: 12, padding: 14,
      fontSize: 14, color: t.textPrimary, borderWidth: 1, borderColor: t.inputBorder,
      minHeight: 140, textAlignVertical: 'top', lineHeight: 22,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
      marginBottom: 12,
    },
    btnSalvarNotas: {
      backgroundColor: t.red, borderRadius: 10, paddingVertical: 12,
      alignItems: 'center',
    },
    btnSalvarNotasDisabled: { backgroundColor: t.textTertiary },
    btnSalvarNotasTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  };
}

function makeFcStyles(t) {
  return {
    card: { backgroundColor: t.surface, borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    cardAtivo: { borderWidth: 1.5, borderColor: t.red },
    cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    nome: { fontWeight: '700', fontSize: 15, color: t.textPrimary },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    badgeTexto: { fontSize: 11, fontWeight: '700' },
    datas: { fontSize: 12, color: t.textSecondary },
    progressoBg: { height: 5, backgroundColor: t.elevated, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    progressoBar: { height: 5, borderRadius: 3 },
    treinosArea: { marginTop: 10, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10, gap: 10 },
    treinoCard: { backgroundColor: t.elevated, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
    treinoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    letraBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center' },
    letraTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
    treinoNome: { fontWeight: '700', color: t.textPrimary, fontSize: 15 },
    treinoDias: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
    exItem: { color: t.textPrimary, fontSize: 13, marginTop: 4, paddingLeft: 2 },
    periodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
    periodTexto: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
    vazio: { color: t.textTertiary, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
    btnRenovar: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: t.red, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
    btnRenovarTexto: { color: t.red, fontWeight: '600', fontSize: 13 },
  };
}
