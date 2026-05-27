export interface BankData {
  id: number;
  Date: number; 
  Domain: string;
  Location: string;
  Value: number;
  Transaction_count: number;
  order: number;
  parsedDate?: Date;
  timestamp?: number;
}

export interface Filters {
  fromDate: string;
  toDate: string;
  minValue: number | null;
  maxValue: number | null;
}