export type RecognizedItem = {
  rawName: string;
  cleanedName: string;
  brand: string | null;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  weightValue: number | null;
  weightUnit: string | null;
  unitPrice: number | null;
  confidence: number;
  needsReview: boolean;
};

export type RecognizedReceipt = {
  storeName: string;
  storeAddress: string | null;
  purchaseDate: string | null;
  purchaseTime: string | null;
  currency: string;
  totalAmount: number;
  paymentMethod: string | null;
  items: RecognizedItem[];
  warnings: string[];
};
