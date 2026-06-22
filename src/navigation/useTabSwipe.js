import { useRef } from 'react';
import { PanResponder } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';

export default function useTabSwipe(routes) {
  const navigation = useNavigation();
  const idxRef = useRef(0);

  useNavigationState(state => {
    idxRef.current = state.index;
  });

  return useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 2,
      onPanResponderRelease: (_, { dx }) => {
        const i = idxRef.current;
        if (dx < -50 && i < routes.length - 1) navigation.navigate(routes[i + 1]);
        else if (dx > 50 && i > 0) navigation.navigate(routes[i - 1]);
      },
    })
  ).current;
}
