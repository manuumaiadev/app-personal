import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import InicioScreen from '../screens/aluno/InicioScreen';
import ExecutarTreinoScreen from '../screens/aluno/ExecutarTreinoScreen';
import HistoricoScreen from '../screens/aluno/HistoricoScreen';
import PerfilScreen from '../screens/aluno/PerfilScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InicioStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InicioAluno" component={InicioScreen} />
      <Stack.Screen name="ExecutarTreino" component={ExecutarTreinoScreen} />
    </Stack.Navigator>
  );
}

export default function AlunoTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#E31E24',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4 },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Inicio: 'home-outline',
            Historico: 'time-outline',
            Perfil: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={InicioStack} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Historico" component={HistoricoScreen} options={{ tabBarLabel: 'Histórico' }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
