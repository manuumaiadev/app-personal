import { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { buscarNomeUsuario } from '../../services/chat';
import ChatScreen from './ChatScreen';

export default function ChatAlunoScreen({ navigation }) {
  const { usuario } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [nomePersonal, setNomePersonal] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!usuario?.personalId) { setCarregando(false); return; }
    buscarNomeUsuario(usuario.personalId)
      .then(n => setNomePersonal(n || 'Personal Trainer'))
      .catch(() => setNomePersonal('Personal Trainer'))
      .finally(() => setCarregando(false));
  }, [usuario?.personalId]);

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.red} />
      </View>
    );
  }

  if (!usuario?.personalId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12, paddingTop: insets.top }}>
        <Ionicons name="chatbubbles-outline" size={56} color={theme.textTertiary} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textSecondary, textAlign: 'center' }}>
          Nenhum personal vinculado.
        </Text>
        <Text style={{ fontSize: 13, color: theme.textTertiary, textAlign: 'center' }}>
          Va em Perfil e solicite vinculo com seu personal para usar o chat.
        </Text>
      </View>
    );
  }

  // Rende ChatScreen diretamente com os params do aluno
  return (
    <ChatScreen
      route={{ params: { personalId: usuario.personalId, alunoId: usuario.uid, nomeOutro: nomePersonal } }}
      navigation={navigation}
    />
  );
}
