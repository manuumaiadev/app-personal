import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import useTabSwipe from './useTabSwipe';

const ROUTES = ['Inicio', 'Treinos', 'Chat', 'Perfil'];

import InicioScreen from '../screens/aluno/InicioScreen';
import ExecutarTreinoScreen from '../screens/aluno/ExecutarTreinoScreen';
import VisualizarTreinoScreen from '../screens/aluno/VisualizarTreinoScreen';
import TreinosScreen from '../screens/aluno/TreinosScreen';
import PerfilScreen from '../screens/aluno/PerfilScreen';
import AnamneseScreen from '../screens/auth/AnamneseScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ChatAlunoScreen from '../screens/chat/ChatAlunoScreen';
import ExercicioAvulsoScreen from '../screens/aluno/ExercicioAvulsoScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InicioStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InicioAluno" component={InicioScreen} />
      <Stack.Screen name="VisualizarTreino" component={VisualizarTreinoScreen} />
      <Stack.Screen name="ExecutarTreino" component={ExecutarTreinoScreen} />
      <Stack.Screen name="ExercicioAvulso" component={ExercicioAvulsoScreen} />
    </Stack.Navigator>
  );
}

function TreinosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TreinosList" component={TreinosScreen} />
      <Stack.Screen name="VisualizarTreino" component={VisualizarTreinoScreen} />
      <Stack.Screen name="ExecutarTreino" component={ExecutarTreinoScreen} />
      <Stack.Screen name="ExercicioAvulso" component={ExercicioAvulsoScreen} />
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

function SwipeInicioStack(props) {
  const swipe = useTabSwipe(ROUTES);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}><InicioStack {...props} /></View>;
}
function SwipeTreinosStack(props) {
  const swipe = useTabSwipe(ROUTES);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}><TreinosStack {...props} /></View>;
}
function SwipeChatStack(props) {
  const swipe = useTabSwipe(ROUTES);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}><ChatStack {...props} /></View>;
}
function SwipePerfilStack(props) {
  const swipe = useTabSwipe(ROUTES);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}><PerfilStack {...props} /></View>;
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
          height: 72,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarShowLabel: false,
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
      <Tab.Screen name="Inicio" component={SwipeInicioStack} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Treinos" component={SwipeTreinosStack} options={{ tabBarLabel: 'Treinos' }} />
      <Tab.Screen name="Chat" component={SwipeChatStack} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="Perfil" component={SwipePerfilStack} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
