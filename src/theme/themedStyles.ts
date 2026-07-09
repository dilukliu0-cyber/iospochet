// Стили, создаваемые при module-load через StyleSheet.create, замораживают
// цвета навсегда — тема не смогла бы переключаться без перезапуска. Обёртка
// откладывает создание стилей до первого обращения и пересоздаёт их после
// смены темы (bumpThemeVersion + ремоунт дерева в App).

let themeVersion = 0;

export function bumpThemeVersion() {
  themeVersion += 1;
}

export function themedStyles<T extends object>(factory: () => T): T {
  let cached: T | null = null;
  let cachedVersion = -1;
  return new Proxy({} as T, {
    get(_target, prop) {
      if (!cached || cachedVersion !== themeVersion) {
        cached = factory();
        cachedVersion = themeVersion;
      }
      return (cached as Record<PropertyKey, unknown>)[prop];
    },
  });
}
