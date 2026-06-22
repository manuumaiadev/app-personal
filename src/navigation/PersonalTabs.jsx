import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import useTabSwipe from './useTabSwipe';

const ROUTES = ['Dashboard', 'Alunos', 'MeuTreino', 'PerfilPersonal'];

import DashboardScreen from '../screens/personal/DashboardScreen';
import AlunosScreen from '../screens/personal/AlunosScreen';
import PerfilAlunoScreen from '../screens/personal/PerfilAlunoScreen';
import MontarTreinoScreen from '../screens/personal/MontarTreinoScreen';
import BancoExerciciosScreen from '../screens/personal/BancoExerciciosScreen';
import NovoExercicioScreen from '../screens/personal/NovoExercicioScreen';
import DetalheExercicioScreen from '../screens/personal/DetalheExercicioScreen';
import RenovarFichaScreen from '../screens/personal/RenovarFichaScreen';
import EditarTreinoScreen from '../screens/personal/EditarTreinoScreen';
import PerfilPersonalScreen from '../screens/personal/PerfilPersonalScreen';
import NovoAlunoScreen from '../screens/personal/NovoAlunoScreen';
import MeuTreinoScreen from '../screens/personal/MeuTreinoScreen';
import VisualizarTreinoScreen from '../screens/aluno/VisualizarTreinoScreen';
import ExecutarTreinoScreen from '../screens/aluno/ExecutarTreinoScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import EditarFichaScreen from '../screens/personal/EditarFichaScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AlunosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AlunosList" component={AlunosScreen} />
      <Stack.Screen name="NovoAluno" component={NovoAlunoScreen} />
      <Stack.Screen name="PerfilAluno" component={PerfilAlunoScreen} />
      <Stack.Screen name="MontarTreino" component={MontarTreinoScreen} />
      <Stack.Screen name="EditarTreino" component={EditarTreinoScreen} />
      <Stack.Screen name="BancoExercicios" component={BancoExerciciosScreen} />
      <Stack.Screen name="NovoExercicio" component={NovoExercicioScreen} />
      <Stack.Screen name="DetalheExercicio" component={DetalheExercicioScreen} />
      <Stack.Screen name="EditarFicha" component={EditarFichaScreen} />
      <Stack.Screen name="RenovarFicha" component={RenovarFichaScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function MeuTreinoStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MeuTreinoInicio" component={MeuTreinoScreen} />
      <Stack.Screen name="MontarTreino" component={MontarTreinoScreen} />
      <Stack.Screen name="EditarTreino" component={EditarTreinoScreen} />
      <Stack.Screen name="BancoExercicios" component={BancoExerciciosScreen} />
      <Stack.Screen name="NovoExercicio" component={NovoExercicioScreen} />
      <Stack.Screen name="DetalheExercicio" component={DetalheExercicioScreen} />
      <Stack.Screen name="EditarFicha" component={EditarFichaScreen} />
      <Stack.Screen name="RenovarFicha" component={RenovarFichaScreen} />
      <Stack.Screen name="VisualizarTreino" component={VisualizarTreinoScreen} />
      <Stack.Screen name="ExecutarTreino" component={ExecutarTreinoScreen} />
    </Stack.Navigator>
  );
}

function SwipeAlunosStack(props) {
  const swipe = useTabSwipe(ROUTES);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}><AlunosStack {...props} /></View>;
}
function SwipeMeuTreinoStack(props) {
  const swipe = useTabSwipe(ROUTES);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}><MeuTreinoStack {...props} /></View>;
}
function SwipeDashboard(props) {
  const swipe = useTabSwipe(ROUTES);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}><DashboardScreen {...props} /></View>;
}
function SwipePerfilPersonal(props) {
  const swipe = useTabSwipe(ROUTES);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}><PerfilPersonalScreen {...props} /></View>;
}

export default function PersonalTabs() {
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
            Dashboard: 'grid-outline',
            Alunos: 'people-outline',
            MeuTreino: 'barbell-outline',
            PerfilPersonal: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={SwipeDashboard} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Alunos" component={SwipeAlunosStack} options={{ tabBarLabel: 'Alunos' }} />
      <Tab.Screen name="MeuTreino" component={SwipeMeuTreinoStack} options={{ tabBarLabel: 'Meu Treino' }} />
      <Tab.Screen name="PerfilPersonal" component={SwipePerfilPersonal} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
