import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { criarFicha } from '../../services/fichas';
import { criarTreino } from '../../services/treinos';
import { listarExercicios } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { METODOS_ESPECIAIS, metodoById } from '../../utils/metodosEspeciais';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function treinoVazio(letra) {
  return { letra, diasDaSemana: [], exercicios: [], metodosEspeciais: [] };
}

export default function MontarTreinoScreen({ route, navigation }) {
  const { aluno } = route.params;
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [nomeFicha, setNomeFicha] = useState('');
  const [semanas, setSemanas] = useState('4');
  const [treinos, setTreinos] = useState([treinoVazio('A')]);
  const [exerciciosBanco, setExerciciosBanco] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [treinoSelecionado, setTreinoSelecionado] = useState(0);
  const [buscaEx, setBuscaEx] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroBanco, setErroBanco] = useState(false);

  // --- Método especial modal ---
  const [metodoModal, setMetodoModal] = useState(false);
  const [obsAbertas, setObsAbertas] = useState({});
  const [treinoMetodoIdx, setTreinoMetodoIdx] = useState(0);
  const [metodoEscolhido, setMetodoEscolhido] = useState(null);
  const [metodoExIds, setMetodoExIds] = useState([]);
  const [metodoDescanso, setMetodoDescanso] = useState('60');

  useFocusEffect(
    useCallback(() => {
      listarExercicios(usuario.uid)
        .then(setExerciciosBanco)
        .catch(() => setErroBanco(true));
    }, [usuario.uid])
  );

  // ── Treino helpers ──────────────────────────────────────────────────
  function toggleDia(ti, dia) {
    setTreinos(prev => {
      const novo = [...prev];
      const dias = novo[ti].diasDaSemana || [];
      novo[ti] = {
        ...novo[ti],
        diasDaSemana: dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia],
      };
      return novo;
    });
  }

  function adicionarTreino() {
    if (treinos.length >= LETRAS.length) return;
    setTreinos(prev => [...prev, treinoVazio(LETRAS[prev.length])]);
  }

  function selecionarExercicio(exercicio) {
    setTreinos(prev => {
      const novo = [...prev];
      const existe = novo[treinoSelecionado].exercicios.find(e => e.id === exercicio.id);
      if (!existe) {
        novo[treinoSelecionado].exercicios.push({
          ...exercicio, series: 3, reps: '12', descanso: '60s', observacao: '',
        });
      }
      return novo;
    });
    setModalAberto(false);
  }

  function atualizarExercicio(ti, ei, campo, valor) {
    setTreinos(prev => {
      const novo = [...prev];
      novo[ti] = { ...novo[ti], exercicios: [...novo[ti].exercicios] };
      novo[ti].exercicios[ei] = { ...novo[ti].exercicios[ei], [campo]: valor };
      return novo;
    });
  }

  function removerExercicio(ti, ei) {
    setTreinos(prev => {
      const novo = [...prev];
      const exId = novo[ti].exercicios[ei]?.id;
      novo[ti] = {
        ...novo[ti],
        exercicios: novo[ti].exercicios.filter((_, i) => i !== ei),
        // remove from any method group that referenced this exercise
        metodosEspeciais: (novo[ti].metodosEspeciais || [])
          .map(g => ({ ...g, exercicioIds: g.exercicioIds.filter(id => id !== exId) }))
          .filter(g => g.exercicioIds.length > 0),
      };
      return novo;
    });
  }

  // ── Método especial helpers ─────────────────────────────────────────
  function abrirMetodoModal(ti) {
    setTreinoMetodoIdx(ti);
    setMetodoEscolhido(null);
    setMetodoExIds([]);
    setMetodoDescanso('60');
    setMetodoModal(true);
  }

  function toggleMetodoEx(exId) {
    setMetodoExIds(prev =>
      prev.includes(exId) ? prev.filter(id => id !== exId) : [...prev, exId]
    );
  }

  function confirmarMetodo() {
    const def = metodoById(metodoEscolhido);
    if (!def) return;
    const n = metodoExIds.length;
    if (n < def.minEx) {
      Alert.alert('Selecione mais exercicios', `${def.label} precisa de pelo menos ${def.minEx} exercicio(s).`);
      return;
    }
    if (n > def.maxEx) {
      Alert.alert('Muitos exercicios', `${def.label} aceita no maximo ${def.maxEx} exercicio(s).`);
      return;
    }
    setTreinos(prev => {
      const novo = [...prev];
      const grupos = [...(novo[treinoMetodoIdx].metodosEspeciais || [])];
      grupos.push({
        id: Date.now().toString(),
        metodo: metodoEscolhido,
        exercicioIds: [...metodoExIds],
        descansoPorRodada: parseInt(metodoDescanso) || 60,
      });
      novo[treinoMetodoIdx] = { ...novo[treinoMetodoIdx], metodosEspeciais: grupos };
      return novo;
    });
    setMetodoModal(false);
  }

  function removerMetodo(ti, grupoId) {
    setTreinos(prev => {
      const novo = [...prev];
      novo[ti] = {
        ...novo[ti],
        metodosEspeciais: (novo[ti].metodosEspeciais || []).filter(g => g.id !== grupoId),
      };
      return novo;
    });
  }

  // ── Save ────────────────────────────────────────────────────────────
  async function salvar() {
    if (!nomeFicha) { Alert.alert('Atenção', 'Dê um nome à ficha.'); return; }
    setCarregando(true);
    try {
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + parseInt(semanas) * 7);
      const ficha = await criarFicha({
        nome: nomeFicha,
        alunoId: aluno.id,
        personalId: usuario.uid,
        semanas: parseInt(semanas),
        dataVencimento: Timestamp.fromDate(vencimento),
      });
      for (const treino of treinos) {
        await criarTreino({
          fichaId: ficha.id,
          letra: treino.letra,
          diasDaSemana: treino.diasDaSemana,
          exercicios: treino.exercicios,
          metodosEspeciais: treino.metodosEspeciais || [],
        });
      }
      setSucesso(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a ficha.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Success modal */}
      <Modal visible={sucesso} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalSucesso}>
            <Text style={s.modalTitulo}>Ficha criada!</Text>
            <Text style={s.modalTexto}>A ficha foi salva com sucesso para {aluno.nome}.</Text>
            <TouchableOpacity style={s.modalBotao} onPress={() => { setSucesso(false); navigation.goBack(); }}>
              <Text style={s.modalBotaoTexto}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Ionicons name="arrow-back" size={22} color={theme.red} />
            <Text style={s.voltarTexto}>Voltar</Text>
          </TouchableOpacity>
          <Text style={s.navTitulo}>Montar ficha</Text>
          <TouchableOpacity onPress={salvar} disabled={carregando}>
            {carregando
              ? <ActivityIndicator color={theme.red} size="small" />
              : <Ionicons name="checkmark" size={26} color={theme.red} />}
          </TouchableOpacity>
        </View>

        <Text style={s.subtitulo}>Para: {aluno.nome}</Text>

        <Text style={s.label}>Nome da ficha</Text>
        <TextInput style={s.input} placeholder="Ex: Hipertrofia A/B/C"
          placeholderTextColor={theme.placeholder} value={nomeFicha} onChangeText={setNomeFicha} />

        <Text style={s.label}>Duração (semanas)</Text>
        <TextInput style={s.input} keyboardType="numeric" value={semanas} onChangeText={setSemanas} />

        {treinos.map((treino, ti) => {
          // Build exId → methodDef for this treino
          const exMetodoMap = {};
          (treino.metodosEspeciais || []).forEach(g => {
            const def = metodoById(g.metodo);
            if (def) g.exercicioIds.forEach(id => { exMetodoMap[id] = def; });
          });

          return (
            <View key={ti} style={s.treinoCard}>
              <Text style={s.treinoTitulo}>Treino {treino.letra}</Text>

              <Text style={s.labelSmall}>Dias da semana</Text>
              <View style={s.diasRow}>
                {DIAS.map(dia => (
                  <TouchableOpacity
                    key={dia}
                    style={[s.diaChip, treino.diasDaSemana.includes(dia) && s.diaAtivo]}
                    onPress={() => toggleDia(ti, dia)}
                  >
                    <Text style={[s.diaTexto, treino.diasDaSemana.includes(dia) && s.diaTextoAtivo]}>
                      {dia}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.labelSmall, { marginTop: 12 }]}>EXERCÍCIOS</Text>
              {treino.exercicios.map((ex, ei) => {
                const metodo = exMetodoMap[ex.id];
                return (
                  <View key={ex.id} style={s.exRow}>
                    <View style={s.exRowTopo}>
                      <View style={[s.exNumero, metodo && { backgroundColor: metodo.cor }]}>
                        <Text style={s.exNumeroTexto}>{ei + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.exNome}>{ex.nome}</Text>
                        {metodo && (
                          <View style={[s.metodoBadge, { backgroundColor: metodo.cor + '20', borderColor: metodo.cor + '60', marginTop: 4 }]}>
                            <Text style={[s.metodoBadgeTexto, { color: metodo.cor }]}>{metodo.label}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={s.exEditBtn}
                        onPress={() => navigation.navigate('NovoExercicio', { exercicio: ex })}
                      >
                        <Ionicons name="pencil-outline" size={15} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <View style={[s.exInputs, { marginTop: 12 }]}>
                      <TextInput style={s.miniInput} placeholder="Séries" keyboardType="numeric"
                        value={String(ex.series)} onChangeText={v => atualizarExercicio(ti, ei, 'series', v)} />
                      <Text style={s.x}>×</Text>
                      <TextInput style={s.miniInput} placeholder="Reps" keyboardType="numeric"
                        value={ex.reps} onChangeText={v => atualizarExercicio(ti, ei, 'reps', v.replace(/[^0-9]/g, ''))} />
                      <Text style={s.x}>·</Text>
                      <TextInput style={[s.miniInput, { width: 52 }]} placeholder="60s"
                        value={ex.descanso} onChangeText={v => atualizarExercicio(ti, ei, 'descanso', v)} />
                    </View>

                    {(obsAbertas[`${ti}_${ei}`] || ex.observacao) && (
                      <TextInput
                        style={s.obsInput}
                        placeholder="Observacao..."
                        placeholderTextColor={theme.placeholder}
                        value={ex.observacao || ''}
                        onChangeText={v => atualizarExercicio(ti, ei, 'observacao', v)}
                        multiline
                        autoFocus={obsAbertas[`${ti}_${ei}`] && !ex.observacao}
                        onBlur={() => {
                          if (!ex.observacao) setObsAbertas(prev => ({ ...prev, [`${ti}_${ei}`]: false }));
                        }}
                      />
                    )}

                    <View style={s.exCardRodape}>
                      {!(obsAbertas[`${ti}_${ei}`] || ex.observacao) && (
                        <TouchableOpacity
                          style={s.obsToggle}
                          onPress={() => setObsAbertas(prev => ({ ...prev, [`${ti}_${ei}`]: true }))}
                        >
                          <Ionicons name="chatbubble-outline" size={13} color={theme.textTertiary} />
                          <Text style={s.obsToggleTexto}>Adicionar comentario</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={s.exDeleteBtn}
                        onPress={() => removerExercicio(ti, ei)}
                      >
                        <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        <Text style={s.exDeleteTexto}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              <View style={s.addBotoesRow}>
                <TouchableOpacity style={s.botaoAdd} onPress={() => { setTreinoSelecionado(ti); setModalAberto(true); }}>
                  <Ionicons name="add-circle-outline" size={18} color={theme.red} />
                  <Text style={s.botaoAddTexto}>+ Exercício</Text>
                </TouchableOpacity>
                {treino.exercicios.length >= 2 && (
                  <TouchableOpacity style={s.botaoMetodo} onPress={() => abrirMetodoModal(ti)}>
                    <Ionicons name="flash-outline" size={16} color="#8b5cf6" />
                    <Text style={s.botaoMetodoTexto}>+ Série especial</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Grupos de método especial configurados */}
              {(treino.metodosEspeciais || []).length > 0 && (
                <View style={s.gruposSection}>
                  <Text style={s.labelSmall}>MÉTODOS ESPECIAIS</Text>
                  {(treino.metodosEspeciais || []).map(grupo => {
                    const def = metodoById(grupo.metodo);
                    if (!def) return null;
                    const nomes = grupo.exercicioIds
                      .map(id => treino.exercicios.find(e => e.id === id)?.nome || '?')
                      .join(' + ');
                    return (
                      <View key={grupo.id} style={[s.grupoChip, { borderColor: def.cor + '50' }]}>
                        <View style={[s.grupoCorDot, { backgroundColor: def.cor }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.grupoLabel, { color: def.cor }]}>{def.label}</Text>
                          <Text style={s.grupoNomes} numberOfLines={1}>{nomes}</Text>
                          <Text style={s.grupoDescanso}>Descanso: {grupo.descansoPorRodada}s por rodada</Text>
                        </View>
                        <TouchableOpacity onPress={() => removerMetodo(ti, grupo.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle-outline" size={18} color={theme.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {treinos.length < LETRAS.length && (
          <TouchableOpacity style={s.botaoTreino} onPress={adicionarTreino}>
            <Text style={s.botaoTreinoTexto}>+ Adicionar treino {LETRAS[treinos.length]}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal — banco de exercícios */}
      <Modal visible={modalAberto} animationType="slide" transparent={false}>
        <View style={s.modalEx}>
          <Text style={s.modalExTitulo}>Escolher exercício</Text>
          <View style={s.buscaBox}>
            <Ionicons name="search-outline" size={16} color={theme.placeholder} />
            <TextInput
              style={s.buscaInput}
              placeholder="Pesquisar..."
              placeholderTextColor={theme.placeholder}
              value={buscaEx}
              onChangeText={setBuscaEx}
              autoCapitalize="none"
            />
            {buscaEx.length > 0 && (
              <TouchableOpacity onPress={() => setBuscaEx('')}>
                <Ionicons name="close-circle" size={16} color={theme.placeholder} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={exerciciosBanco.filter(e =>
              !buscaEx || e.nome?.toLowerCase().includes(buscaEx.toLowerCase()) ||
              e.grupoMuscular?.toLowerCase().includes(buscaEx.toLowerCase())
            )}
            keyExtractor={i => i.id}
            ListEmptyComponent={
              <View style={s.vazioWrap}>
                <Ionicons name="barbell-outline" size={40} color={theme.textTertiary} />
                <Text style={s.vazio}>
                  {erroBanco ? 'Erro ao carregar exercícios.' : 'Nenhum exercício cadastrado.'}
                </Text>
                <Text style={s.vazioSub}>Cadastre exercícios no banco antes de montar a ficha.</Text>
                <TouchableOpacity
                  style={s.botaoIrBanco}
                  onPress={() => { setModalAberto(false); navigation.navigate('BancoExercicios'); }}
                >
                  <Text style={s.botaoIrBancoTexto}>Ir para o banco de exercícios</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[s.modalExItem, { flexDirection: 'row', alignItems: 'center' }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => selecionarExercicio(item)} activeOpacity={0.7}>
                  <Text style={s.modalExNome}>{item.nome}</Text>
                  <Text style={s.modalExGrupo}>{item.grupoMuscular}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setModalAberto(false); setBuscaEx(''); navigation.navigate('NovoExercicio', { exercicio: item }); }}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={18} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          />
          <TouchableOpacity style={s.botaoFechar} onPress={() => { setModalAberto(false); setBuscaEx(''); }}>
            <Text style={s.botaoFecharTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal — método especial */}
      <Modal visible={metodoModal} animationType="slide" transparent={false}>
        <ScrollView style={s.modalEx} keyboardShouldPersistTaps="handled">
          <Text style={s.modalExTitulo}>Série especial</Text>

          <Text style={s.modalSecLabel}>MÉTODO</Text>
          {METODOS_ESPECIAIS.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[
                s.metodoOpcao,
                metodoEscolhido === m.id && { borderColor: m.cor, backgroundColor: m.cor + '10' },
              ]}
              onPress={() => { setMetodoEscolhido(m.id); setMetodoExIds([]); }}
              activeOpacity={0.75}
            >
              <View style={[s.metodoRadio, metodoEscolhido === m.id && { backgroundColor: m.cor, borderColor: m.cor }]}>
                {metodoEscolhido === m.id && <View style={s.metodoRadioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.metodoOpcaoLabel, metodoEscolhido === m.id && { color: m.cor }]}>{m.label}</Text>
                <Text style={s.metodoOpcaoDesc}>{m.descricao}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {metodoEscolhido && (() => {
            const def = metodoById(metodoEscolhido);
            const exs = treinos[treinoMetodoIdx]?.exercicios || [];
            const minLabel = def.minEx === def.maxEx
              ? `Selecione exatamente ${def.minEx}`
              : def.maxEx === 99
                ? `Selecione no minimo ${def.minEx}`
                : `Selecione de ${def.minEx} a ${def.maxEx}`;

            return (
              <>
                <Text style={[s.modalSecLabel, { marginTop: 20 }]}>EXERCÍCIOS ({minLabel})</Text>
                {exs.map(ex => {
                  const selecionado = metodoExIds.includes(ex.id);
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={[s.exCheckItem, selecionado && { borderColor: def.cor, backgroundColor: def.cor + '10' }]}
                      onPress={() => toggleMetodoEx(ex.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.checkbox, selecionado && { backgroundColor: def.cor, borderColor: def.cor }]}>
                        {selecionado && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                      <Text style={[s.exCheckNome, selecionado && { color: def.cor }]}>{ex.nome}</Text>
                    </TouchableOpacity>
                  );
                })}

                <Text style={[s.modalSecLabel, { marginTop: 20 }]}>DESCANSO POR RODADA (segundos)</Text>
                <TextInput
                  style={s.metodoDescansoInput}
                  keyboardType="numeric"
                  value={metodoDescanso}
                  onChangeText={v => setMetodoDescanso(v.replace(/[^0-9]/g, ''))}
                  placeholder="60"
                  placeholderTextColor={theme.placeholder}
                />
              </>
            );
          })()}

          <TouchableOpacity
            style={[s.btnConfirmarMetodo, !metodoEscolhido && { opacity: 0.4 }]}
            onPress={confirmarMetodo}
            disabled={!metodoEscolhido}
          >
            <Text style={s.btnConfirmarMetodoTexto}>Confirmar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.botaoFechar} onPress={() => setMetodoModal(false)}>
            <Text style={s.botaoFecharTexto}>Cancelar</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, marginBottom: 4 },
    voltar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    voltarTexto: { color: t.red, fontSize: 15 },
    navTitulo: { fontWeight: '700', fontSize: 17, color: t.textPrimary },
    subtitulo: { color: t.textSecondary, marginBottom: 20, fontSize: 14 },
    label: { color: t.textPrimary, fontWeight: '600', marginBottom: 6 },
    labelSmall: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 8 },
    input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 14, fontSize: 15, color: t.textPrimary, marginBottom: 16 },
    treinoCard: { backgroundColor: t.surface, borderRadius: 12, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    treinoTitulo: { fontWeight: '700', fontSize: 16, color: t.textPrimary, marginBottom: 12 },
    diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    diaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.elevated },
    diaAtivo: { backgroundColor: t.red, borderColor: t.red },
    diaTexto: { fontSize: 12, color: t.textPrimary, fontWeight: '500' },
    diaTextoAtivo: { color: '#fff' },
    exRow: { marginBottom: 10, backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
    exRowTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    exNumero: { width: 26, height: 26, borderRadius: 13, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    exNumeroTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
    exNome: { fontWeight: '700', color: t.textPrimary, fontSize: 14 },
    exEditBtn: { padding: 6 },
    metodoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    metodoBadgeTexto: { fontSize: 10, fontWeight: '700' },
    exInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    miniInput: { backgroundColor: t.elevated, borderRadius: 8, padding: 6, width: 44, textAlign: 'center', fontSize: 13, color: t.textPrimary },
    obsInput: { backgroundColor: t.elevated, borderRadius: 8, padding: 9, fontSize: 12, color: t.textPrimary, borderWidth: 1, borderColor: t.border, marginTop: 14, minHeight: 56 },
    obsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: t.border },
    obsToggleTexto: { fontSize: 12, color: t.textTertiary },
    exCardRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    exDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#ef444412' },
    exDeleteTexto: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
    x: { color: t.textTertiary, fontSize: 13 },
    addBotoesRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 4 },
    botaoAdd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    botaoAddTexto: { color: t.red, fontWeight: '600' },
    botaoMetodo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    botaoMetodoTexto: { color: '#8b5cf6', fontWeight: '600', fontSize: 13 },
    gruposSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
    grupoChip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: t.elevated },
    grupoCorDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
    grupoLabel: { fontWeight: '700', fontSize: 12 },
    grupoNomes: { fontSize: 12, color: t.textPrimary, marginTop: 1 },
    grupoDescanso: { fontSize: 11, color: t.textTertiary, marginTop: 2 },
    botaoTreino: { borderWidth: 1.5, borderColor: t.red, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 14 },
    botaoTreinoTexto: { color: t.red, fontWeight: '600' },
    // Modal exercicios
    modalEx: { flex: 1, padding: 20, backgroundColor: t.bg },
    modalExTitulo: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 12, marginTop: 20 },
    buscaBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
    buscaInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: t.textPrimary },
    modalExItem: { backgroundColor: t.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
    modalExNome: { fontWeight: '600', color: t.textPrimary },
    modalExGrupo: { color: t.textSecondary, fontSize: 13 },
    botaoFechar: { backgroundColor: t.elevated, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10, marginBottom: 8 },
    botaoFecharTexto: { fontWeight: '600', color: t.textPrimary },
    vazioWrap: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
    vazio: { textAlign: 'center', color: t.textTertiary, fontWeight: '600', fontSize: 15 },
    vazioSub: { textAlign: 'center', color: t.textTertiary, fontSize: 13, lineHeight: 18 },
    botaoIrBanco: { marginTop: 8, backgroundColor: t.red, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
    botaoIrBancoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
    // Modal sucesso
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    modalSucesso: { backgroundColor: t.surface, borderRadius: 16, padding: 32, alignItems: 'center', width: '100%' },
    modalTitulo: { fontSize: 22, fontWeight: '700', color: t.textPrimary, marginBottom: 8 },
    modalTexto: { fontSize: 14, color: t.textSecondary, textAlign: 'center', marginBottom: 24 },
    modalBotao: { backgroundColor: t.red, borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
    modalBotaoTexto: { color: '#fff', fontWeight: '600', fontSize: 16 },
    // Modal método especial
    modalSecLabel: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
    metodoOpcao: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, marginBottom: 8, backgroundColor: t.surface },
    metodoRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: t.border, justifyContent: 'center', alignItems: 'center' },
    metodoRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
    metodoOpcaoLabel: { fontWeight: '700', fontSize: 14, color: t.textPrimary },
    metodoOpcaoDesc: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
    exCheckItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, marginBottom: 6, backgroundColor: t.surface },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: t.border, justifyContent: 'center', alignItems: 'center' },
    exCheckNome: { flex: 1, fontWeight: '600', color: t.textPrimary, fontSize: 14 },
    metodoDescansoInput: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, padding: 12, fontSize: 16, color: t.textPrimary, textAlign: 'center', marginBottom: 4 },
    btnConfirmarMetodo: { backgroundColor: t.red, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 8 },
    btnConfirmarMetodoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  };
}
