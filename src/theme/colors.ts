export type ThemeName = 'dark' | 'light';

const darkPalette = {
  background: '#0A0A0C',
  surface: '#17171A',
  surfaceElevated: '#212126',
  border: '#2A2A2E',
  accent: '#34D399',
  accentSoft: 'rgba(52,211,153,0.14)',
  warning: '#F59E0B',
  error: '#EF4444',
  success: '#22C55E',
  textPrimary: '#F5F5F5',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
};

const lightPalette: typeof darkPalette = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceElevated: '#ECEEF1',
  border: '#E2E5E9',
  accent: '#0EA870',
  accentSoft: 'rgba(14,168,112,0.12)',
  warning: '#D97706',
  error: '#DC2626',
  success: '#16A34A',
  textPrimary: '#111318',
  textSecondary: '#5B6270',
  textTertiary: '#9AA1AC',
};

// Живой объект: applyTheme мутирует его на месте, чтобы каждый рендер
// (и каждая themedStyles-фабрика) читал актуальную палитру.
export const colors = { ...darkPalette };

let currentTheme: ThemeName = 'dark';

export function applyTheme(theme: ThemeName) {
  currentTheme = theme;
  Object.assign(colors, theme === 'light' ? lightPalette : darkPalette);
}

export function getCurrentTheme(): ThemeName {
  return currentTheme;
}

// Фирменный цвет каждой категории (по макету) — используется в цветных иконках,
// сегментах кольцевой диаграммы и легенде. Одинаков в обеих темах.
export const CATEGORY_COLOR_BY_NAME: Record<string, string> = {
  'Продукты': '#4ADE80',
  'Снеки': '#FB923C',
  'Напитки': '#F472B6',
  'Кофе': '#A78BFA',
  'Кафе и рестораны': '#FB7185',
  'Доставка еды': '#FBBF24',
  'Транспорт': '#60A5FA',
  'Дом': '#34D399',
  'Гигиена': '#22D3EE',
  'Одежда': '#E879F9',
  'Подписки': '#818CF8',
  'Развлечения': '#C084FC',
  'Здоровье': '#F87171',
  'Питомцы': '#FCD34D',
  'Другое': '#94A3B8',
};

export function getCategoryColor(name: string): string {
  return CATEGORY_COLOR_BY_NAME[name] ?? colors.accent;
}

// Цвет прогресс-бара по уровню заполнения (лимиты, дедлайны).
export function progressColor(percent: number): string {
  if (percent >= 100) return colors.error;
  if (percent >= 90) return colors.error;
  if (percent >= 75) return colors.warning;
  return colors.accent;
}
