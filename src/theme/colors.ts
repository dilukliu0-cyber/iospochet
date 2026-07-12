export type ThemeName = 'dark' | 'light';

const darkPalette = {
  // Глубокий сине-чёрный фон вместо плоского серого — карточки «подсвечиваются».
  background: '#07090E',
  surface: '#12151C',
  surfaceElevated: '#1B1F29',
  border: '#242A37',
  // Тонкая рамка-волосок для карточек (едва заметный контур).
  cardBorder: 'rgba(148,163,184,0.10)',
  accent: '#34D399',
  // Пара к акценту для градиентов (кнопки, hero-карточки).
  accentAlt: '#22D3EE',
  accentSoft: 'rgba(52,211,153,0.14)',
  heroFrom: 'rgba(52,211,153,0.16)',
  heroTo: 'rgba(34,211,238,0.04)',
  warning: '#F59E0B',
  error: '#EF4444',
  success: '#22C55E',
  textPrimary: '#F6F7F9',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
};

const lightPalette: typeof darkPalette = {
  background: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceElevated: '#EDF0F4',
  border: '#E2E5EB',
  cardBorder: 'rgba(15,23,42,0.08)',
  accent: '#0EA870',
  accentAlt: '#0891B2',
  accentSoft: 'rgba(14,168,112,0.12)',
  heroFrom: 'rgba(14,168,112,0.14)',
  heroTo: 'rgba(8,145,178,0.04)',
  warning: '#D97706',
  error: '#DC2626',
  success: '#16A34A',
  textPrimary: '#101319',
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

// Фирменный цвет каждой категории — приглушённая, «взрослая» палитра одного
// семейства (близкая насыщенность/светлота, только тон разный), как в
// premium-финансовых приложениях, а не радужный набор ярких крайонов.
// Одинаков в обеих темах (используется в иконках, диаграмме, легенде).
export const CATEGORY_COLOR_BY_NAME: Record<string, string> = {
  'Продукты': '#7FAE86',
  'Снеки': '#C9986A',
  'Напитки': '#C98BA0',
  'Кофе': '#A9835F',
  'Кафе и рестораны': '#CB8571',
  'Доставка еды': '#C9A24A',
  'Транспорт': '#7B93B5',
  'Дом': '#6FA592',
  'Гигиена': '#7FAEB0',
  'Одежда': '#A788B5',
  'Подписки': '#7C82B0',
  'Развлечения': '#AD82AE',
  'Здоровье': '#C17E7E',
  'Питомцы': '#C0A876',
  'Другое': '#9A9490',
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
