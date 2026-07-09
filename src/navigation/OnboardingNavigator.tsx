import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CurrencyScreen } from '../screens/onboarding/CurrencyScreen';
import { LanguageScreen } from '../screens/onboarding/LanguageScreen';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Currency" component={CurrencyScreen} />
    </Stack.Navigator>
  );
}
