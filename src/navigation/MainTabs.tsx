import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Sparkles, ShoppingCart, User, Wallet } from 'lucide-react-native';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { ExpensesScreen } from '../screens/expenses/ExpensesScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ShoppingScreen } from '../screens/shopping/ShoppingScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Главная', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{ title: 'Расходы', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'ИИ-чат', tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingScreen}
        options={{ title: 'Покупки', tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Профиль', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
