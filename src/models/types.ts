import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceDiscount {
  sequenceNumber?: number;
  isPercent: boolean;
  value: number;
  description: string;
}

export interface InvoiceData {
  companyName: string;
  logoPath?: string; 
  clientName: string;
  invoiceNumber: string;
  date: Date;
  currencyType: string; 
  items: InvoiceItem[];
  taxRate: number; 
  discounts?: InvoiceDiscount[];
  subTotal?: number; 
  taxAmount?: number; 
  totalCost?: number; 
  paid?: boolean;
  paymentDate?: Date;
  paymentMethod?: string;
  addWatermark?: boolean;
  dueDate?: Date;
}

export interface GeneratorOptions {
  filePath: string;
  layout?: ILayoutStrategy | 'default';
}
