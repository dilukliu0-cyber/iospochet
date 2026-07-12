import { Platform } from 'react-native';
import { ExtensionStorage } from '@bacons/apple-targets';
import type { CategoryBreakdownEntry } from '../analytics/categoryBreakdown';
import { getCategoryColor } from '../../theme/colors';

// Тот же App Group, что в app.json (ios.entitlements) и в
// targets/expenses-widget/expo-target.config.js.
const APP_GROUP = 'group.com.dilukliu0.iospochet';
const STORAGE_KEY = 'expenses_widget_data';
const MAX_ROWS = 6;

const storage = Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null;

// Пишем актуальную разбивку по категориям в общий App Group, чтобы
// виджет на главном экране iPhone мог её прочитать без сети и авторизации.
// Вызывается из ExpensesScreen при каждой загрузке/обновлении категорий.
export function updateExpensesWidget(
  entries: CategoryBreakdownEntry[],
  currency: string,
  periodLabel: string,
): void {
  if (!storage) return;

  const total = entries.reduce((sum, e) => sum + e.total, 0);
  const payload = {
    total,
    currency,
    periodLabel,
    categories: entries.slice(0, MAX_ROWS).map((e) => ({
      name: e.categoryName,
      amount: e.total,
      percent: e.percent,
      color: getCategoryColor(e.categoryName),
    })),
  };

  storage.set(STORAGE_KEY, JSON.stringify(payload));
  ExtensionStorage.reloadWidget();
}
