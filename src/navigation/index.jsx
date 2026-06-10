import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import LoginScreen from '../screens/auth/LoginScreen';
import CadastroScreen from '../screens/auth/CadastroScreen';
import AnamneseScreen from '../screens/auth/AnamneseScreen';
import PersonalTabs from './PersonalTabs';
import AlunoTabs from './AlunoTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { usuario, carregando } = useAuth();
  const { theme } = useTheme();

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.red} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!usuario ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Cadastro" component={CadastroScreen} />
          <Stack.Screen name="Anamnese" component={AnamneseScreen} />
        </>
      ) : usuario.perfil === 'personal' ? (
        <Stack.Screen name="PersonalTabs" component={PersonalTabs} />
      ) : (
        <Stack.Screen name="AlunoTabs" component={AlunoTabs} />
      )}
    </Stack.Navigator>
  );
}
