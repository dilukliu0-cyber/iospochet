import type { RecognizedReceipt } from '../types/receipt';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type OnboardingStackParamList = {
  Language: undefined;
  Currency: { language: string };
};

export type QueuedPhoto = { uri: string; base64: string };

export type AppStackParamList = {
  Tabs: undefined;
  Scan: undefined;
  ReceiptReview: {
    imageBase64: string;
    imageUri: string;
    recognized: RecognizedReceipt;
    queuedPhotos?: QueuedPhoto[];
  };
  ReceiptDetail: { receiptId: string };
  Limits: undefined;
  Categories: undefined;
  AddExpense: undefined;
  Settings: undefined;
  Product: { productName: string };
  Calendar: undefined;
  Search: undefined;
  Category: { categoryName: string };
  Family: undefined;
  NewTemplate: undefined;
};
