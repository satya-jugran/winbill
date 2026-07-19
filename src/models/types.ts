import { z } from "zod";

export const BillingItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be a positive number"),
  unitPrice: z.number().min(0, "Unit price must be a positive number"),
});
export type BillingItem = z.infer<typeof BillingItemSchema>;

export const BillingDiscountSchema = z.object({
  sequenceNumber: z.number().optional(),
  isPercent: z.boolean(),
  value: z.number().min(0, "Discount value must be a non-negative number"),
  description: z.string().min(1, "Description is required"),
}).superRefine((val, ctx) => {
  if (val.isPercent && val.value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Percentage discount cannot exceed 100",
      path: ["value"]
    });
  }
});
export type BillingDiscount = z.infer<typeof BillingDiscountSchema>;

export const ReceiptSettingsSchema = z.object({
  paymentDate: z.date().optional(),
  paymentMethod: z.string().optional(),
  addWatermark: z.boolean().optional(),
});
export type ReceiptSettings = z.infer<typeof ReceiptSettingsSchema>;

export const BillingDataSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.union([z.string(), z.array(z.string())]).optional(),
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.union([z.string(), z.array(z.string())]).optional(),
  
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  purchaseOrderNumber: z.string().optional(),
  date: z.date(),
  dueDate: z.date().optional(),
  
  currency: z.string().length(3, "Currency must be a 3-letter ISO code"),
  locale: z.string().optional(),
  
  items: z.array(BillingItemSchema).min(1, "At least one item is required"),
  taxRate: z.number().min(0, "Tax rate must be a non-negative number"),
  discounts: z.array(BillingDiscountSchema).optional(),
  
  logoPath: z.string().regex(/\.(png|jpg|jpeg)$/i, "Logo must be a PNG or JPEG image").optional(),
  notes: z.string().optional(),
  
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalCost: z.number().optional(),
  
  receipt: ReceiptSettingsSchema.optional(),
});

export type BillingData = z.infer<typeof BillingDataSchema>;

export type LayoutType = 'DEFAULT';

export interface GeneratorOptions {
  filePath: string;
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
  };
  layout?: LayoutType;
}

export interface ProcessedBillData extends BillingData {
  calculatedSubTotal: number;
  calculatedTaxAmount: number;
  calculatedTotalCost: number;
  appliedDiscounts: {
    amount: number;
    description: string;
    isPercent: boolean;
    originalValue: number;
  }[];
}
