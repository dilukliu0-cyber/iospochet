import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddExpenseScreen } from '../screens/addExpense/AddExpenseScreen';
import { CalendarScreen } from '../screens/calendar';
import { CategoryDetailScreen } from '../screens/category/CategoryDetailScreen';
import { CategoriesScreen } from '../screens/categories/CategoriesScreen';
import { FamilyScreen } from '../screens/family/FamilyScreen';
import { NewTemplateScreen } from '../screens/shopping/NewTemplateScreen';
import { AddIncomeScreen } from '../screens/income/AddIncomeScreen';
import { IntroPreviewScreen } from '../screens/onboarding/IntroScreen';
import { LimitsScreen } from '../screens/limits/LimitsScreen';
import { ProductScreen } from '../screens/product/ProductScreen';
import { ReceiptDetailScreen } from '../screens/receiptDetail/ReceiptDetailScreen';
import { ReceiptReviewScreen } from '../screens/receiptReview/ReceiptReviewScreen';
import { ScanScreen } from '../screens/scan/ScanScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { MainTabs } from './MainTabs';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Scan" component={ScanScreen} />
      <Stack.Screen name="ReceiptReview" component={ReceiptReviewScreen} />
      <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
      <Stack.Screen name="Limits" component={LimitsScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Product" component={ProductScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Category" component={CategoryDetailScreen} />
      <Stack.Screen name="Family" component={FamilyScreen} />
      <Stack.Screen name="NewTemplate" component={NewTemplateScreen} />
      <Stack.Screen name="AddIncome" component={AddIncomeScreen} />
      <Stack.Screen name="IntroPreview" component={IntroPreviewScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}
