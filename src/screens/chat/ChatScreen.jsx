import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { enviarMensagem, escutarMensagens, buscarNomeUsuario } from '../../services/chat';

function formatHora(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatData(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function makeStyles(t) {
  return {
    root: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingBottom: 14,
      backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    voltar: { padding: 4 },
    headerInfo: { flex: 1 },
    headerNome: { fontSize: 16, fontWeight: '700', color: t.textPrimary },
    headerSub: { fontSize: 12, color: t.textSecondary, marginTop: 1 },
    avatar: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: t.red, justifyContent: 'center', alignItems: 'center',
    },
    avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 15 },
    listContent: { paddingHorizontal: 16, paddingVertical: 12 },
    dataSep: {
      alignSelf: 'center', backgroundColor: t.elevated,
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginVertical: 10,
    },
    dataSepTexto: { fontSize: 11, color: t.textSecondary, fontWeight: '600' },
    bolhaWrap: { marginBottom: 4 },
    bolhaMinha: { alignItems: 'flex-end' },
    bolhaDela: { alignItems: 'flex-start' },
    bolha: {
      maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    },
    bolhaMinhaBg: { backgroundColor: t.red, borderBottomRightRadius: 4 },
    bolhaDelaBg: { backgroundColor: t.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: t.border },
    bolhaTexto: { fontSize: 15, lineHeight: 21 },
    bolhaTextoMinha: { color: '#fff' },
    bolhaTextoDela: { color: t.textPrimary },
    bolhaHora: { fontSize: 10, marginTop: 3 },
    bolhaHoraMinha: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
    bolhaHoraDela: { color: t.textTertiary },
    inputWrap: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 10,
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
      backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border,
    },
    input: {
      flex: 1, backgroundColor: t.elevated, borderRadius: 22,
      paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
      color: t.textPrimary, borderWidth: 1, borderColor: t.border,
      maxHeight: 100,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: t.red, justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: t.elevated },
    vazio: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 40 },
    vazioTexto: { fontSize: 15, color: t.textSecondary, textAlign: 'center' },
    vazioSub: { fontSize: 13, color: t.textTertiary, textAlign: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  };
}

export default function ChatScreen({ route, navigation }) {
  const { personalId, alunoId, nomeOutro: nomeParam } = route.params;
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const flatRef = useRef(null);

  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [nomeOutro, setNomeOutro] = useState(nomeParam || '');
  const [carregando, setCarregando] = useState(true);

  // Busca nome do outro lado se nao veio como param
  useEffect(() => {
    if (nomeParam) return;
    const outroId = usuario.uid === personalId ? alunoId : personalId;
    buscarNomeUsuario(outroId).then(n => n && setNomeOutro(n));
  }, []);

  // Escuta mensagens em tempo real
  useEffect(() => {
    const unsub = escutarMensagens(personalId, alunoId, msgs => {
      setMensagens(msgs);
      setCarregando(false);
    });
    return unsub;
  }, [personalId, alunoId]);

  // Rola para o fim ao receber novas mensagens
  useEffect(() => {
    if (mensagens.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [mensagens.length]);

  async function handleEnviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setTexto('');
    setEnviando(true);
    try {
      await enviarMensagem(personalId, alunoId, usuario.uid, t);
    } catch {
      setTexto(t);
    } finally {
      setEnviando(false);
    }
  }

  const primeiraLetra = nomeOutro?.[0]?.toUpperCase() || '?';

  if (carregando) {
    return <View style={s.center}><ActivityIndicator color={theme.red} /></View>;
  }

  // Injeta separadores de data
  const itens = [];
  let ultimaData = '';
  mensagens.forEach(msg => {
    const data = formatData(msg.dataHora);
    if (data !== ultimaData) {
      itens.push({ tipo: 'sep', id: `sep_${data}`, data });
      ultimaData = data;
    }
    itens.push({ tipo: 'msg', ...msg });
  });

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.voltar}>
          <Ionicons name="arrow-back" size={22} color={theme.red} />
        </TouchableOpacity>
        <View style={s.avatar}>
          <Text style={s.avatarLetra}>{primeiraLetra}</Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={s.headerNome}>{nomeOutro || '...'}</Text>
          <Text style={s.headerSub}>
            {usuario.uid === personalId ? 'Aluno' : 'Personal Trainer'}
          </Text>
        </View>
      </View>

      {/* Lista de mensagens */}
      {itens.length === 0 ? (
        <View style={s.vazio}>
          <Ionicons name="chatbubbles-outline" size={52} color={theme.textTertiary} />
          <Text style={s.vazioTexto}>Nenhuma mensagem ainda.</Text>
          <Text style={s.vazioSub}>Comece a conversa abaixo.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={itens}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => {
            if (item.tipo === 'sep') {
              return (
                <View style={s.dataSep}>
                  <Text style={s.dataSepTexto}>{item.data}</Text>
                </View>
              );
            }
            const minha = item.remetenteId === usuario.uid;
            return (
              <View style={[s.bolhaWrap, minha ? s.bolhaMinha : s.bolhaDela]}>
                <View style={[s.bolha, minha ? s.bolhaMinhaBg : s.bolhaDelaBg]}>
                  <Text style={[s.bolhaTexto, minha ? s.bolhaTextoMinha : s.bolhaTextoDela]}>
                    {item.texto}
                  </Text>
                  <Text style={[s.bolhaHora, minha ? s.bolhaHoraMinha : s.bolhaHoraDela]}>
                    {formatHora(item.dataHora)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={[s.inputWrap, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          style={s.input}
          placeholder="Mensagem..."
          placeholderTextColor={theme.placeholder}
          value={texto}
          onChangeText={setTexto}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleEnviar}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!texto.trim() || enviando) && s.sendBtnDisabled]}
          onPress={handleEnviar}
          disabled={!texto.trim() || enviando}
        >
          {enviando
            ? <ActivityIndicator size="small" color={theme.textSecondary} />
            : <Ionicons name="send" size={18} color={texto.trim() ? '#fff' : theme.textTertiary} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
