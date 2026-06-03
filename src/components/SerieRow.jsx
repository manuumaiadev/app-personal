import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function SerieRow({ numero, reps, carga, onCargaChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Série {numero}</Text>
      <TextInput
        style={styles.input}
        placeholder="kg"
        placeholderTextColor="#9ca3af"
        keyboardType="decimal-pad"
        value={carga}
        onChangeText={onCargaChange}
      />
      <Text style={styles.reps}>{reps} reps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  label: { width: 56, color: '#6b7280', fontSize: 13 },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    width: 72,
    textAlign: 'center',
    fontWeight: '600',
    color: '#111827',
  },
  reps: { color: '#374151', fontSize: 13 },
});
