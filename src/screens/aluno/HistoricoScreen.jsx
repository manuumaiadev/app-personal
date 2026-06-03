import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { listarHistoricoAluno } from '../../services/execucoes';
import { useAuth } from '../../context/AuthContext';

export default function HistoricoScreen() {
  const { usuario } = useAuth();
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
    <View style={styles.container}>
      <Text style={styles.titulo}>Histórico</Text>

      {carregando
        ? <ActivityIndicator color="#E31E24" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={historico}
            keyExtractor={i => i.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhum treino registrado ainda.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setExpandido(expandido === item.id ? null : item.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.letraBox}>
                    <Text style={styles.letraTexto}>{item.letra}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.data}>
                      {item.dataHora?.toDate().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </Text>
                    <Text style={styles.qtd}>{item.exercicios?.length || 0} exercícios</Text>
                  </View>
                  <Ionicons name={expandido === item.id ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
                </View>

                {expandido === item.id && (
                  <View style={styles.detalhes}>
                    {item.exercicios?.map((ex, i) => (
                      <View key={i} style={styles.exRow}>
                        <Text style={styles.exNome}>{ex.nome}</Text>
                        <Text style={styles.exCargas}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 20, paddingTop: 60 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  letraBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fde8e9', justifyContent: 'center', alignItems: 'center' },
  letraTexto: { color: '#E31E24', fontWeight: '700', fontSize: 18 },
  data: { fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  qtd: { color: '#6b7280', fontSize: 13 },
  detalhes: { marginTop: 12, gap: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between' },
  exNome: { color: '#374151', fontWeight: '500' },
  exCargas: { color: '#6b7280', fontSize: 13 },
  vazio: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
