import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { calcularStatusFicha } from '../utils/fichaStatus';
import StatusBadge from './StatusBadge';

export default function FichaCard({ ficha, onPress }) {
  const status = ficha.dataVencimento ? calcularStatusFicha(ficha.dataVencimento) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nome}>{ficha.nome}</Text>
        {ficha.dataVencimento && (
          <Text style={styles.data}>
            Vence: {ficha.dataVencimento.toDate().toLocaleDateString('pt-BR')}
          </Text>
        )}
      </View>
      {status && <StatusBadge status={status} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  nome: { fontWeight: '600', color: '#111827', fontSize: 15 },
  data: { color: '#6b7280', fontSize: 13, marginTop: 2 },
});
