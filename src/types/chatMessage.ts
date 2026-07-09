export type ChatMessage = {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  receipt_id: string | null;
  receipt_label: string | null;
};
