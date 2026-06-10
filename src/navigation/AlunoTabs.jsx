import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import InicioScreen from '../screens/aluno/InicioScreen';
import ExecutarTreinoScreen from '../screens/aluno/ExecutarTreinoScreen';
import VisualizarTreinoScreen from '../screens/aluno/VisualizarTreinoScreen';
import TreinosScreen from '../screens/aluno/TreinosScreen';
import PerfilScreen from '../screens/aluno/PerfilScreen';
import AnamneseScreen from '../screens/auth/AnamneseScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ChatAlunoScreen from '../screens/chat/ChatAlunoScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InicioStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InicioAluno" component={InicioScreen} />
      <Stack.Screen name="VisualizarTreino" component={VisualizarTreinoScreen} />
      <Stack.Screen name="ExecutarTreino" component={ExecutarTreinoScreen} />
    </Stack.Navigator>
  );
}

function TreinosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TreinosList" component={TreinosScreen} />
      <Stack.Screen name="VisualizarTreino" component={VisualizarTreinoScreen} />
      <Stack.Screen name="ExecutarTreino" component={ExecutarTreinoScreen} />
    </Stack.Navigator>
  );
}

function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilAluno" component={PerfilScreen} />
      <Stack.Screen name="Anamnese" component={AnamneseScreen} />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatAluno" component={ChatAlunoScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

export default function AlunoTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.red,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: 4,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Inicio: 'home-outline',
            Treinos: 'barbell-outline',
            Chat: 'chatbubble-outline',
            Perfil: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={InicioStack} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Treinos" component={TreinosStack} options={{ tabBarLabel: 'Treinos' }} />
      <Tab.Screen name="Chat" component={ChatStack} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="Perfil" component={PerfilStack} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
