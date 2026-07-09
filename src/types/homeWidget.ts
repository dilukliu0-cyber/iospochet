export type HomeWidgetType = 'category_chart' | 'pinned_limit';

export type HomeWidget = {
  id: string;
  user_id: string;
  type: HomeWidgetType;
  config: { limitId?: string };
  created_at: string;
};
