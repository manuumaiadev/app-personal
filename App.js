import { useEffect, useRef } from 'react';
import { NavigationContainer, CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation';

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
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
          <AuthRedirector />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
