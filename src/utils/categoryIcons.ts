import {
  Baby,
  Bike,
  BookOpen,
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Cookie,
  CupSoda,
  Droplet,
  Ellipsis,
  Gamepad2,
  Gift,
  HeartPulse,
  Home,
  type LucideIcon,
  Music,
  PawPrint,
  Plane,
  Shirt,
  ShoppingCart,
  Star,
  Utensils,
  Wrench,
} from 'lucide-react-native';

const iconMap: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  cookie: Cookie,
  'cup-soda': CupSoda,
  coffee: Coffee,
  utensils: Utensils,
  bike: Bike,
  car: Car,
  home: Home,
  droplet: Droplet,
  shirt: Shirt,
  'credit-card': CreditCard,
  'gamepad-2': Gamepad2,
  'heart-pulse': HeartPulse,
  'paw-print': PawPrint,
  ellipsis: Ellipsis,
  baby: Baby,
  'book-open': BookOpen,
  briefcase: Briefcase,
  gift: Gift,
  music: Music,
  plane: Plane,
  star: Star,
  wrench: Wrench,
};

export const SELECTABLE_ICON_NAMES = Object.keys(iconMap);

export function getCategoryIcon(iconName: string): LucideIcon {
  return iconMap[iconName] ?? Ellipsis;
}
