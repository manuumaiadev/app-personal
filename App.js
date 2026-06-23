import { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer, CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Image, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

const ASSETS = [
  require('./assets/logo.png'),
  require('./assets/minilogo.png'),
];

async function precarregarAssets() {
  await Font.loadAsync(Ionicons.font);
  // Safari ignora o FontFaceObserver, entao forcamos o download aqui
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try { await document.fonts.load('1em ionicons'); } catch (_) {}
  }
  const loaded = await Promise.all(
    ASSETS.map(m => Asset.fromModule(m).downloadAsync())
  );
  await Promise.all(
    loaded.map(a => {
      const uri = a.localUri || a.uri;
      return uri ? Image.prefetch(uri) : Promise.resolve();
    })
  );
}

export const navigationRef = createNavigationContainerRef();

function AuthRedirector() {
  const { usuario } = useAuth();
  const prevUsuario = useRef(usuario);

  useEffect(() => {
    const eraLogado = prevUsuario.current !== null;
    const estahDeslogado = usuario === null;

    if (eraLogado && estahDeslogado && navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
      );
    }

    prevUsuario.current = usuario;
  }, [usuario]);

  return null;
}

export default function App() {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    precarregarAssets()
      .catch(() => {})
      .finally(() => setPronto(true));
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (pronto) await SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
            <AuthRedirector />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
