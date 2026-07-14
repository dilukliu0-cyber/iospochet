export type UserSettings = {
  user_id: string;
  language: string;
  currency: string;
  region: string | null;
  notifications_enabled: boolean;
  ai_tips_enabled: boolean;
  theme: string;
  onboarding_completed: boolean;
  nickname: string | null;
  avatar_path: string | null;
  chart_style: 'donut' | 'bars';
  home_chart: 'line' | 'daily';
  translate_items: boolean;
  created_at: string;
  updated_at: string;
};
