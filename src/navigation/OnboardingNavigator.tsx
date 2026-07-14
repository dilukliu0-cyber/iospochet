import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CurrencyScreen } from '../screens/onboarding/CurrencyScreen';
import { IntroScreen } from '../screens/onboarding/IntroScreen';
import { LanguageScreen } from '../screens/onboarding/LanguageScreen';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Intro" component={IntroScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Currency" component={CurrencyScreen} />
    </Stack.Navigator>
  );
}
