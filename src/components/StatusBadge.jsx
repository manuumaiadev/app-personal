import { View, Text, StyleSheet } from 'react-native';
import { CORES_STATUS, LABELS_STATUS } from '../utils/fichaStatus';

export default function StatusBadge({ status }) {
  const cor = CORES_STATUS[status] || '#9ca3af';
  const label = LABELS_STATUS[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor: cor + '20', borderColor: cor }]}>
      <Text style={[styles.texto, { color: cor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  texto: {
    fontSize: 12,
    fontWeight: '600',
  },
});
