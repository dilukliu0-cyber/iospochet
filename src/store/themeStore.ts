import { create } from 'zustand';
import { applyTheme, getCurrentTheme, type ThemeName } from '../theme/colors';
import { bumpThemeVersion } from '../theme/themedStyles';

// version участвует в key корневого дерева: смена темы = мутация палитры
// (applyTheme) + сброс кэша themedStyles + полный ремоунт UI.
type ThemeState = {
  version: number;
  setTheme: (theme: ThemeName) => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  version: 0,

  setTheme: (theme) => {
    if (theme === getCurrentTheme()) return;
    applyTheme(theme);
    bumpThemeVersion();
    set({ version: get().version + 1 });
  },
}));
