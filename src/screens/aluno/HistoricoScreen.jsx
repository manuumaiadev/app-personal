import { useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { listarHistoricoAluno } from '../../services/execucoes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function HistoricoScreen() {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        const data = await listarHistoricoAluno(usuario.uid);
        setHistorico(data);
        setCarregando(false);
      }
      carregar();
    }, [])
  );

  return (
    <View style={s.container}>
      <Text style={s.titulo}>Histórico</Text>

      {carregando
        ? <ActivityIndicator color="#E31E24" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={historico}
            keyExtractor={i => i.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            ListEmptyComponent={<Text style={s.vazio}>Nenhum treino registrado ainda.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.card}
                onPress={() => setExpandido(expandido === item.id ? null : item.id)}
              >
                <View style={s.cardHeader}>
                  <View style={s.letraBox}>
                    <Text style={s.letraTexto}>{item.letra}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.data}>
                      {item.dataHora?.toDate().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </Text>
                    <Text style={s.qtd}>{item.exercicios?.length || 0} exercícios</Text>
                  </View>
                  <Ionicons name={expandido === item.id ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} />
                </View>

                {expandido === item.id && (
                  <View style={s.detalhes}>
                    {item.exercicios?.map((ex, i) => (
                      <View key={i} style={s.exRow}>
                        <Text style={s.exNome}>{ex.nome}</Text>
                        <Text style={s.exCargas}>
                          {ex.cargas?.filter(Boolean).join(' | ')} kg
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )
      }
    </View>
  );
}

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 20, paddingTop: 60 },
    titulo: { fontSize: 24, fontWeight: '700', color: t.textPrimary, marginBottom: 16 },
    card: { backgroundColor: t.surface, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    letraBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fde8e9', justifyContent: 'center', alignItems: 'center' },
    letraTexto: { color: '#E31E24', fontWeight: '700', fontSize: 18 },
    data: { fontWeight: '600', color: t.textPrimary, textTransform: 'capitalize' },
    qtd: { color: t.textSecondary, fontSize: 13 },
    detalhes: { marginTop: 12, gap: 6, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10 },
    exRow: { flexDirection: 'row', justifyContent: 'space-between' },
    exNome: { color: t.textPrimary, fontWeight: '500' },
    exCargas: { color: t.textSecondary, fontSize: 13 },
    vazio: { textAlign: 'center', color: t.textTertiary, marginTop: 40 },
  };
}
