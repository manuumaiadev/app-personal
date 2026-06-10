import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import DashboardScreen from '../screens/personal/DashboardScreen';
import AlunosScreen from '../screens/personal/AlunosScreen';
import PerfilAlunoScreen from '../screens/personal/PerfilAlunoScreen';
import MontarTreinoScreen from '../screens/personal/MontarTreinoScreen';
import BancoExerciciosScreen from '../screens/personal/BancoExerciciosScreen';
import NovoExercicioScreen from '../screens/personal/NovoExercicioScreen';
import DetalheExercicioScreen from '../screens/personal/DetalheExercicioScreen';
import FichasScreen from '../screens/personal/FichasScreen';
import RenovarFichaScreen from '../screens/personal/RenovarFichaScreen';
import EditarTreinoScreen from '../screens/personal/EditarTreinoScreen';
import PerfilPersonalScreen from '../screens/personal/PerfilPersonalScreen';
import NovoAlunoScreen from '../screens/personal/NovoAlunoScreen';
import ChatScreen from '../screens/chat/ChatScreen';

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
      <Stack.Screen name="RenovarFicha" component={RenovarFichaScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function ExerciciosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BancoExercicios" component={BancoExerciciosScreen} />
      <Stack.Screen name="NovoExercicio" component={NovoExercicioScreen} />
      <Stack.Screen name="DetalheExercicio" component={DetalheExercicioScreen} />
    </Stack.Navigator>
  );
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
          paddingBottom: 4,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'grid-outline',
            Alunos: 'people-outline',
            Exercicios: 'barbell-outline',
            PerfilPersonal: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Alunos" component={AlunosStack} options={{ tabBarLabel: 'Alunos' }} />
      <Tab.Screen name="Exercicios" component={ExerciciosStack} options={{ tabBarLabel: 'Exercícios' }} />
      <Tab.Screen name="PerfilPersonal" component={PerfilPersonalScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
