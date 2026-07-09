import { StatusBar } from 'expo-status-bar';
import { Fragment } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from './src/components/ui/Toast';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/themeStore';
import { getCurrentTheme } from './src/theme/colors';

export default function App() {
  const themeVersion = useThemeStore((state) => state.version);
  return (
    <SafeAreaProvider>
      {/* key: смена темы полностью пересоздаёт дерево — themedStyles пересчитаются */}
      <Fragment key={themeVersion}>
        <StatusBar style={getCurrentTheme() === 'light' ? 'dark' : 'light'} />
        <RootNavigator />
        <Toast />
      </Fragment>
    </SafeAreaProvider>
  );
}
