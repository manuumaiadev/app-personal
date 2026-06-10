import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Clipboard, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

function makeStyles(t) {
  return {
    container: { flex: 1, backgroundColor: t.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
    titulo: { fontSize: 24, fontWeight: '700', color: t.textPrimary, alignSelf: 'flex-start', marginBottom: 28 },
    avatarBox: { alignItems: 'center', marginBottom: 28 },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: t.red, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarLetra: { color: '#fff', fontWeight: '700', fontSize: 36 },
    nome: { fontSize: 22, fontWeight: '700', color: t.textPrimary },
    email: { color: t.textSecondary, marginTop: 4, fontSize: 14 },
    perfilBadge: { marginTop: 8, backgroundColor: t.red + '18', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
    perfilBadgeTexto: { color: t.red, fontWeight: '700', fontSize: 13 },
    card: { backgroundColor: t.surface, borderRadius: 14, padding: 18, width: '100%', marginBottom: 16, borderWidth: 1, borderColor: t.border },
    codigoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    codigoTitulo: { fontWeight: '700', color: t.textPrimary, fontSize: 15 },
    codigoDesc: { color: t.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 14 },
    codigoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.elevated, borderRadius: 10, borderWidth: 1, borderColor: t.border, padding: 12, gap: 10 },
    codigoTexto: { flex: 1, fontSize: 12, color: t.textPrimary, fontFamily: 'monospace' },
    copiarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    copiarTexto: { color: t.red, fontWeight: '600', fontSize: 13 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleTexto: { fontSize: 15, fontWeight: '600', color: t.textPrimary },
    toggleSub: { fontSize: 12, color: t.textSecondary, marginTop: 1 },
    botaoSair: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5, borderColor: '#fecaca', backgroundColor: t.surface, width: '100%', justifyContent: 'center' },
    botaoSairTexto: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
  };
}

export default function PerfilPersonalScreen() {
  const { usuario, logout } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [copiado, setCopiado] = useState(false);

  const codigo = usuario?.uid || '';

  function handleCopiar() {
    Clipboard.setString(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.titulo}>Perfil</Text>

      <View style={s.avatarBox}>
        <View style={s.avatar}>
          <Text style={s.avatarLetra}>{usuario?.nome?.[0]?.toUpperCase()}</Text>
        </View>
        <Text style={s.nome}>{usuario?.nome}</Text>
        <Text style={s.email}>{usuario?.email}</Text>
        <View style={s.perfilBadge}>
          <Text style={s.perfilBadgeTexto}>Personal Trainer</Text>
        </View>
      </View>

      {/* Codigo de vinculo */}
      <View style={s.card}>
        <View style={s.codigoHeader}>
          <Ionicons name="qr-code-outline" size={18} color={theme.red} />
          <Text style={s.codigoTitulo}>Seu codigo de vinculo</Text>
        </View>
        <Text style={s.codigoDesc}>
          Compartilhe este codigo com seus alunos para que eles possam solicitar vinculo com voce.
        </Text>
        <View style={s.codigoBox}>
          <Text style={s.codigoTexto} selectable numberOfLines={1}>
            {codigo}
          </Text>
          <TouchableOpacity style={s.copiarBtn} onPress={handleCopiar}>
            <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={18} color={copiado ? '#16a34a' : theme.red} />
            <Text style={[s.copiarTexto, copiado && { color: '#16a34a' }]}>
              {copiado ? 'Copiado!' : 'Copiar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Aparencia */}
      <View style={s.card}>
        <View style={s.toggleRow}>
          <View style={s.toggleLeft}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={theme.textSecondary} />
            <View>
              <Text style={s.toggleTexto}>Modo escuro</Text>
              <Text style={s.toggleSub}>{isDark ? 'Interface escura ativa' : 'Interface clara ativa'}</Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.red + '80' }}
            thumbColor={isDark ? theme.red : theme.textSecondary}
          />
        </View>
      </View>

      {/* Sair */}
      <TouchableOpacity style={s.botaoSair} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={s.botaoSairTexto}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
