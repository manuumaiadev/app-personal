import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function PerfilPersonalScreen() {
  const { usuario, logout } = useAuth();
  const [copiado, setCopiado] = useState(false);

  const codigo = usuario?.uid || '';

  function handleCopiar() {
    Clipboard.setString(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Perfil</Text>

      {/* Avatar */}
      <View style={styles.avatarBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetra}>{usuario?.nome?.[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.nome}>{usuario?.nome}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
        <View style={styles.perfilBadge}>
          <Text style={styles.perfilBadgeTexto}>Personal Trainer</Text>
        </View>
      </View>

      {/* Código do personal */}
      <View style={styles.codigoCard}>
        <View style={styles.codigoHeader}>
          <Ionicons name="qr-code-outline" size={18} color="#E31E24" />
          <Text style={styles.codigoTitulo}>Seu código de vínculo</Text>
        </View>
        <Text style={styles.codigoDesc}>
          Compartilhe este código com seus alunos para que eles possam solicitar vínculo com você.
        </Text>
        <View style={styles.codigoBox}>
          <Text style={styles.codigoTexto} selectable numberOfLines={1}>
            {codigo}
          </Text>
          <TouchableOpacity style={styles.copiarBtn} onPress={handleCopiar}>
            <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={18} color={copiado ? '#16a34a' : '#E31E24'} />
            <Text style={[styles.copiarTexto, copiado && { color: '#16a34a' }]}>
              {copiado ? 'Copiado!' : 'Copiar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sair */}
      <TouchableOpacity style={styles.botaoSair} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.botaoSairTexto}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  titulo: { fontSize: 24, fontWeight: '700', color: '#111827', alignSelf: 'flex-start', marginBottom: 28 },
  avatarBox: { alignItems: 'center', marginBottom: 28 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E31E24', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 36 },
  nome: { fontSize: 22, fontWeight: '700', color: '#111827' },
  email: { color: '#6b7280', marginTop: 4, fontSize: 14 },
  perfilBadge: { marginTop: 8, backgroundColor: '#fde8e9', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  perfilBadgeTexto: { color: '#E31E24', fontWeight: '700', fontSize: 13 },

  codigoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '100%', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  codigoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  codigoTitulo: { fontWeight: '700', color: '#111827', fontSize: 15 },
  codigoDesc: { color: '#6b7280', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  codigoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, gap: 10 },
  codigoTexto: { flex: 1, fontSize: 12, color: '#374151', fontFamily: 'monospace' },
  copiarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copiarTexto: { color: '#E31E24', fontWeight: '600', fontSize: 13 },

  botaoSair: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5, borderColor: '#fecaca', backgroundColor: '#fff', width: '100%', justifyContent: 'center' },
  botaoSairTexto: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
});
