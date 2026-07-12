// Иконка по названию конкретного товара (а не только по категории) —
// чтобы «Молоко», «Сыр» и «Салями» в одном чеке не выглядели одинаковой
// иконкой корзины. Сопоставление по ключевым словам (рус/англ/чеш —
// чеки часто приходят с оригинальными, непереведёнными названиями).
const RULES: { icon: string; keywords: string[] }[] = [
  { icon: 'glass-water', keywords: ['water', 'вода', 'voda'] },
  { icon: 'cup-soda', keywords: ['cola', 'soda', 'газиров', 'напиток', 'juice', 'сок', 'lemonade', 'limonáda', 'limonada'] },
  { icon: 'coffee', keywords: ['coffee', 'кофе', 'káva', 'kava'] },
  { icon: 'wine', keywords: ['wine', 'вино', 'víno', 'vino'] },
  { icon: 'beer', keywords: ['beer', 'пиво', 'pivo'] },
  {
    icon: 'milk',
    keywords: ['milk', 'молок', 'yogurt', 'yoghurt', 'йогурт', 'cheese', 'сыр', 'сметана', 'творог', 'butter', 'máslo', 'maslo', 'tvaroh', 'jogurt'],
  },
  { icon: 'egg', keywords: ['egg', 'яйц', 'vejce', 'vejc'] },
  {
    icon: 'croissant',
    keywords: ['bread', 'хлеб', 'baguette', 'багет', 'croissant', 'круассан', 'roll', 'булк', 'pečivo', 'pecivo', 'pastry', 'выпечк'],
  },
  { icon: 'wheat', keywords: ['pasta', 'макарон', 'spaghetti', 'rice', 'рис', 'flour', 'мука', 'cereal'] },
  { icon: 'drumstick', keywords: ['chicken', 'куриц', 'курин', 'kuře', 'kure'] },
  {
    icon: 'ham',
    keywords: ['ham', 'salami', 'sausage', 'bacon', 'šunka', 'sunka', 'klobása', 'klobasa', 'колбас', 'ветчин', 'бекон', 'сосиск'],
  },
  { icon: 'beef', keywords: ['beef', 'pork', 'meat', 'говядин', 'свинин', 'мясо', 'hovězí', 'hovezi', 'vepřové', 'veprove'] },
  { icon: 'fish', keywords: ['fish', 'рыба', 'salmon', 'лосос', 'tuna', 'тунец', 'losos'] },
  { icon: 'apple', keywords: ['apple', 'яблок', 'jablko'] },
  { icon: 'banana', keywords: ['banana', 'банан'] },
  { icon: 'citrus', keywords: ['orange', 'lemon', 'lime', 'апельсин', 'лимон', 'citron', 'pomeranč', 'pomeranc'] },
  { icon: 'grape', keywords: ['grape', 'виноград', 'hrozny'] },
  { icon: 'cherry', keywords: ['cherry', 'вишн', 'черешн', 'třešně', 'tresne'] },
  { icon: 'salad', keywords: ['salad', 'lettuce', 'салат', 'zelenina', 'greens'] },
  {
    icon: 'carrot',
    keywords: ['carrot', 'морков', 'tomato', 'помидор', 'potato', 'картоф', 'vegetable', 'овощ', 'brambor', 'mrkev', 'cucumber', 'огурц'],
  },
  { icon: 'cookie', keywords: ['cookie', 'печень', 'biscuit', 'sušenky', 'susenky'] },
  { icon: 'candy', keywords: ['candy', 'sweet', 'конфет', 'chocolate', 'шоколад', 'čokoláda', 'cokolada'] },
  { icon: 'popcorn', keywords: ['popcorn', 'chips', 'crisps', 'чипс', 'brambůrky', 'chipsy'] },
  { icon: 'pizza', keywords: ['pizza', 'пицц'] },
  { icon: 'sandwich', keywords: ['sandwich', 'бургер', 'burger', 'hamburger', 'бутерброд'] },
  { icon: 'soup', keywords: ['soup', 'суп', 'polévka', 'polevka'] },
  { icon: 'ice-cream-cone', keywords: ['ice cream', 'мороженое', 'zmrzlina'] },
];

export function inferItemIconName(itemName: string): string | null {
  const name = itemName.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => name.includes(kw))) return rule.icon;
  }
  return null;
}
