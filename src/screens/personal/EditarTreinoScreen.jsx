import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { atualizarTreino } from '../../services/treinos';
import { listarExercicios } from '../../services/exercicios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { METODOS_ESPECIAIS, metodoById } from '../../utils/metodosEspeciais';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function EditarTreinoScreen({ route, navigation }) {
  const { treino, aluno, semanas = 4 } = route.params;
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [diasDaSemana, setDiasDaSemana] = useState(treino.diasDaSemana || []);
  const [exercicios, setExercicios] = useState((treino.exercicios || []).map(e => ({ ...e })));
  const [metodosEspeciais, setMetodosEspeciais] = useState(treino.metodosEspeciais || []);
  const [banco, setBanco] = useState([]);
  const [modalExAberto, setModalExAberto] = useState(false);
  const [buscaEx, setBuscaEx] = useState('');
  const [metodoModal, setMetodoModal] = useState(false);
  const [metodoEscolhido, setMetodoEscolhido] = useState(null);
  const [metodoExIds, setMetodoExIds] = useState([]);
  const [metodoDescanso, setMetodoDescanso] = useState('60');
  const [salvando, setSalvando] = useState(false);
  const [obsAbertas, setObsAbertas] = useState({});

  useFocusEffect(
    useCallback(() => { listarExercicios(usuario.uid).then(setBanco); }, [usuario.uid])
  );

  function toggleDia(dia) {
    setDiasDaSemana(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]);
  }

  function atualizarEx(i, campo, valor) {
    setExercicios(prev => { const n = [...prev]; n[i] = { ...n[i], [campo]: valor }; return n; });
  }

  function removerEx(i) {
    const exId = exercicios[i]?.id;
    setExercicios(prev => prev.filter((_, j) => j !== i));
    if (exId) {
      setMetodosEspeciais(prev =>
        prev
          .map(g => ({ ...g, exercicioIds: g.exercicioIds.filter(id => id !== exId) }))
          .filter(g => g.exercicioIds.length > 0)
      );
    }
  }

  function adicionarExercicio(ex) {
    if (!exercicios.find(e => e.id === ex.id)) {
      setExercicios(prev => [...prev, { ...ex, series: 3, reps: '12', descanso: '60s', observacao: '' }]);
    }
    setModalExAberto(false);
  }

  function abrirMetodoModal() {
    setMetodoEscolhido(null);
    setMetodoExIds([]);
    setMetodoDescanso('60');
    setMetodoModal(true);
  }

  function toggleMetodoEx(exId) {
    setMetodoExIds(prev => prev.includes(exId) ? prev.filter(id => id !== exId) : [...prev, exId]);
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
    setMetodosEspeciais(prev => [...prev, {
      id: Date.now().toString(),
      metodo: metodoEscolhido,
      exercicioIds: [...metodoExIds],
      descansoPorRodada: parseInt(metodoDescanso) || 60,
    }]);
    setMetodoModal(false);
  }

  function removerMetodo(grupoId) {
    setMetodosEspeciais(prev => prev.filter(g => g.id !== grupoId));
  }

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarTreino(treino.id, { diasDaSemana, exercicios, metodosEspeciais });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">

        {/* NavBar */}
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
            <Ionicons name="arrow-back" size={22} color={theme.red} />
            <Text style={s.voltarTexto}>Voltar</Text>
          </TouchableOpacity>
          <Text style={s.navTitulo}>Treino {treino.letra}</Text>
          <TouchableOpacity onPress={salvar} disabled={salvando}>
            {salvando ? <ActivityIndicator color={theme.red} size="small" />
              : <Ionicons name="checkmark" size={26} color={theme.red} />}
          </TouchableOpacity>
        </View>
        <Text style={s.subtitulo}>{aluno.nome}</Text>

        {/* Dias */}
        <Text style={s.secTitulo}>DIAS DA SEMANA</Text>
        <View style={s.diasRow}>
          {DIAS.map(dia => (
            <TouchableOpacity key={dia}
              style={[s.diaChip, diasDaSemana.includes(dia) && s.diaAtivo]}
              onPress={() => toggleDia(dia)}>
              <Text style={[s.diaTexto, diasDaSemana.includes(dia) && s.diaTextoAtivo]}>{dia}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercícios */}
        <Text style={[s.secTitulo, { marginTop: 24 }]}>EXERCÍCIOS</Text>
        {(() => {
          const exMetodoMap = {};
          metodosEspeciais.forEach(g => {
            const def = metodoById(g.metodo);
            if (def) g.exercicioIds.forEach(id => { exMetodoMap[id] = def; });
          });
          return exercicios.map((ex, i) => {
            const metodo = exMetodoMap[ex.id];
            return (
              <View key={ex.id ?? i} style={s.exCard}>
                <View style={s.exCardTopo}>
                  <View style={[s.exNum, metodo && { backgroundColor: metodo.cor }]}>
                    <Text style={s.exNumTexto}>{i + 1}</Text>
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
                    value={String(ex.series)} onChangeText={v => atualizarEx(i, 'series', v)} />
                  <Text style={s.x}>×</Text>
                  <TextInput style={s.miniInput} placeholder="Reps" keyboardType="numeric"
                    value={ex.reps} onChangeText={v => atualizarEx(i, 'reps', v.replace(/[^0-9]/g, ''))} />
                  <Text style={s.x}>·</Text>
                  <TextInput style={[s.miniInput, { width: 52 }]} placeholder="60s"
                    value={ex.descanso} onChangeText={v => atualizarEx(i, 'descanso', v)} />
                </View>

                {(obsAbertas[i] || ex.observacao) && (
                  <TextInput
                    style={s.obsInput}
                    placeholder="Observacao..."
                    placeholderTextColor={theme.placeholder}
                    value={ex.observacao || ''}
                    onChangeText={v => atualizarEx(i, 'observacao', v)}
                    multiline
                    autoFocus={obsAbertas[i] && !ex.observacao}
                    onBlur={() => {
                      if (!ex.observacao) setObsAbertas(prev => ({ ...prev, [i]: false }));
                    }}
                  />
                )}

                <View style={s.exCardRodape}>
                  {!(obsAbertas[i] || ex.observacao) && (
                    <TouchableOpacity
                      style={s.obsToggle}
                      onPress={() => setObsAbertas(prev => ({ ...prev, [i]: true }))}
                    >
                      <Ionicons name="chatbubble-outline" size={13} color={theme.textTertiary} />
                      <Text style={s.obsToggleTexto}>Adicionar comentario</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={s.exDeleteBtn}
                    onPress={() => removerEx(i)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    <Text style={s.exDeleteTexto}>Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          });
        })()}

        <View style={s.addBotoesRow}>
          <TouchableOpacity style={s.botaoAddEx} onPress={() => setModalExAberto(true)}>
            <Ionicons name="add-circle-outline" size={18} color={theme.red} />
            <Text style={s.botaoAddExTexto}>+ Exercício</Text>
          </TouchableOpacity>
          {exercicios.length >= 2 && (
            <TouchableOpacity style={s.botaoMetodo} onPress={abrirMetodoModal}>
              <Ionicons name="flash-outline" size={16} color="#8b5cf6" />
              <Text style={s.botaoMetodoTexto}>+ Série especial</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grupos configurados */}
        {metodosEspeciais.length > 0 && (
          <View style={s.gruposSection}>
            <Text style={[s.secTitulo, { marginTop: 4 }]}>MÉTODOS ESPECIAIS</Text>
            {metodosEspeciais.map(grupo => {
              const def = metodoById(grupo.metodo);
              if (!def) return null;
              const nomes = grupo.exercicioIds
                .map(id => exercicios.find(e => e.id === id)?.nome || '?')
                .join(' + ');
              return (
                <View key={grupo.id} style={[s.grupoChip, { borderColor: def.cor + '50' }]}>
                  <View style={[s.grupoCorDot, { backgroundColor: def.cor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.grupoLabel, { color: def.cor }]}>{def.label}</Text>
                    <Text style={s.grupoNomes} numberOfLines={1}>{nomes}</Text>
                    <Text style={s.grupoDescanso}>Descanso: {grupo.descansoPorRodada}s por rodada</Text>
                  </View>
                  <TouchableOpacity onPress={() => removerMetodo(grupo.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle-outline" size={18} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal banco de exercícios */}
      <Modal visible={modalExAberto} animationType="slide" transparent={false}>
        <View style={s.modalEx}>
          <Text style={s.modalExTitulo}>Escolher exercício</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 }}>
            <Ionicons name="search-outline" size={16} color={theme.placeholder} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: theme.textPrimary }}
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
            data={banco.filter(e =>
              !buscaEx || e.nome?.toLowerCase().includes(buscaEx.toLowerCase()) ||
              e.grupoMuscular?.toLowerCase().includes(buscaEx.toLowerCase())
            )}
            keyExtractor={i => i.id}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 }}>
                <Ionicons name="barbell-outline" size={40} color={theme.textTertiary} />
                <Text style={[s.vazio, { fontWeight: '600', fontSize: 15 }]}>Nenhum exercício cadastrado.</Text>
                <Text style={{ textAlign: 'center', color: theme.textTertiary, fontSize: 13, lineHeight: 18 }}>
                  Cadastre exercícios no banco antes de editar a ficha.
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 8, backgroundColor: theme.red, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 }}
                  onPress={() => { setModalExAberto(false); navigation.navigate('BancoExercicios'); }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Ir para o banco de exercícios</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[s.modalExItem, { flexDirection: 'row', alignItems: 'center' }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => adicionarExercicio(item)} activeOpacity={0.7}>
                  <Text style={s.modalExNome}>{item.nome}</Text>
                  <Text style={s.modalExGrupo}>{item.grupoMuscular}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setModalExAberto(false); setBuscaEx(''); navigation.navigate('NovoExercicio', { exercicio: item }); }}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={18} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          />
          <TouchableOpacity style={s.botaoFechar} onPress={() => { setModalExAberto(false); setBuscaEx(''); }}>
            <Text style={s.botaoFecharTexto}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal — método especial */}
      <Modal visible={metodoModal} animationType="slide" transparent={false}>
        <ScrollView style={s.modalEx} keyboardShouldPersistTaps="handled">
          <Text style={s.modalExTitulo}>Série especial</Text>
          <Text style={s.metodoSecLabel}>MÉTODO</Text>
          {METODOS_ESPECIAIS.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[s.metodoOpcao, metodoEscolhido === m.id && { borderColor: m.cor, backgroundColor: m.cor + '10' }]}
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
            const minLabel = def.minEx === def.maxEx
              ? `Selecione exatamente ${def.minEx}`
              : def.maxEx === 99 ? `Minimo ${def.minEx}` : `${def.minEx}–${def.maxEx}`;
            return (
              <>
                <Text style={[s.metodoSecLabel, { marginTop: 20 }]}>EXERCÍCIOS ({minLabel})</Text>
                {exercicios.map(ex => {
                  const sel = metodoExIds.includes(ex.id);
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={[s.exCheckItem, sel && { borderColor: def.cor, backgroundColor: def.cor + '10' }]}
                      onPress={() => toggleMetodoEx(ex.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.checkbox, sel && { backgroundColor: def.cor, borderColor: def.cor }]}>
                        {sel && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                      <Text style={[s.exCheckNome, sel && { color: def.cor }]}>{ex.nome}</Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={[s.metodoSecLabel, { marginTop: 20 }]}>DESCANSO POR RODADA (seg)</Text>
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
    subtitulo: { color: t.textSecondary, fontSize: 14, marginBottom: 20 },
    secTitulo: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
    diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    diaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
    diaAtivo: { backgroundColor: t.red, borderColor: t.red },
    diaTexto: { fontSize: 13, color: t.textPrimary, fontWeight: '500' },
    diaTextoAtivo: { color: '#fff' },

    exCard: { marginBottom: 10, backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
    exCardTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    exNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center' },
    exNumTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
    exNome: { fontWeight: '700', color: t.textPrimary, fontSize: 14 },
    exEditBtn: { padding: 6 },
    exInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    exCardRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    exDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#ef444412' },
    exDeleteTexto: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
    obsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: t.border },
    obsToggleTexto: { fontSize: 12, color: t.textTertiary },
    miniInput: { backgroundColor: t.elevated, borderRadius: 8, padding: 6, width: 44, textAlign: 'center', fontSize: 13, color: t.textPrimary },
    x: { color: t.textTertiary, fontSize: 13 },
    addBotoesRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
    botaoAddEx: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
    botaoAddExTexto: { color: t.red, fontWeight: '600' },
    botaoMetodo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    botaoMetodoTexto: { color: '#8b5cf6', fontWeight: '600', fontSize: 13 },
    obsInput: { backgroundColor: t.elevated, borderRadius: 8, padding: 9, fontSize: 12, color: t.textPrimary, borderWidth: 1, borderColor: t.border, marginTop: 14, minHeight: 56 },
    metodoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    metodoBadgeTexto: { fontSize: 10, fontWeight: '700' },
    gruposSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
    grupoChip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: t.elevated },
    grupoCorDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
    grupoLabel: { fontWeight: '700', fontSize: 12 },
    grupoNomes: { fontSize: 12, color: t.textPrimary, marginTop: 1 },
    grupoDescanso: { fontSize: 11, color: t.textTertiary, marginTop: 2 },
    // Método modal
    metodoSecLabel: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
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

    modalEx: { flex: 1, padding: 20, backgroundColor: t.bg },
    modalExTitulo: { fontSize: 20, fontWeight: '700', color: t.textPrimary, marginBottom: 16, marginTop: 20 },
    modalExItem: { backgroundColor: t.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
    modalExNome: { fontWeight: '600', color: t.textPrimary },
    modalExGrupo: { color: t.textSecondary, fontSize: 13 },
    botaoFechar: { backgroundColor: t.elevated, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10, marginBottom: 30 },
    botaoFecharTexto: { fontWeight: '600', color: t.textPrimary },
    vazio: { textAlign: 'center', color: t.textTertiary, marginTop: 40 },
  };
}
