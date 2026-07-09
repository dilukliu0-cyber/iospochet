export type ShoppingList = {
  id: string;
  user_id: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

export type ShoppingListItem = {
  id: string;
  list_id: string;
  user_id: string;
  text: string;
  checked: boolean;
  created_at: string;
  updated_at: string;
};
