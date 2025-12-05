export enum EntryType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum PaymentMode {
  CASH = 'Cash',
  ONLINE = 'Online',
  UPI = 'UPI',
  CHEQUE = 'Cheque',
}

export interface Entry {
  id: string;
  cashbookId: string;
  type: EntryType;
  amount: number;
  remarks: string;
  category: string;
  paymentMode: PaymentMode;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  balanceAfter: number;
  createdAt: number;
}

export interface EntryChangeLog {
  id: string;
  entryId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

export interface Cashbook {
  id: string;
  name: string;
  createdAt: number;
  lastUpdated: number;
}

export interface UserProfile {
  name: string;
  avatarUri: string | null;
}

export interface AppTheme {
  primaryColor: string; // 'orange' | 'blue' | 'green' | etc
  intensity: number;
}

export interface AppSettings {
  profile: UserProfile;
  theme: AppTheme;
}

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  CashbookDetail: { id: string };
  EntryForm: { cashbookId: string; entryId?: string }; // entryId present = edit mode
  EntryDetail: { entryId: string };
  ImportExport: undefined;
};