import { View, Text, StyleSheet } from 'react-native';

export default function ExercicioItem({ exercicio }) {
  return (
    <View style={styles.container}>
      <Text style={styles.nome}>{exercicio.nome}</Text>
      <Text style={styles.info}>
        {exercicio.series} séries × {exercicio.reps} reps
      </Text>
      {exercicio.grupoMuscular && (
        <Text style={styles.grupo}>{exercicio.grupoMuscular}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  nome: { fontWeight: '600', color: '#111827', fontSize: 15 },
  info: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  grupo: { color: '#E31E24', fontSize: 12, fontWeight: '500', marginTop: 2 },
});
