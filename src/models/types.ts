import { z } from "zod";

export const TaxSchema = z.object({
  name: z.string().min(1, "Tax name is required"),
  rate: z.number().min(0, "Tax rate must be a non-negative number")
});
export type Tax = z.infer<typeof TaxSchema>;

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

export const BillingItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be a non-negative number"),
  unitPrice: z.number().min(0, "Unit price must be a non-negative number"),
  taxRate: z.number().min(0).optional(),
  isTaxExempt: z.boolean().optional(),
  discount: BillingDiscountSchema.optional()
});
export type BillingItem = z.infer<typeof BillingItemSchema>;

export const BillingCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  items: z.array(BillingItemSchema).min(1, "At least one item is required in a category"),
  taxes: z.array(TaxSchema).optional(),
  discounts: z.array(BillingDiscountSchema).optional()
});
export type BillingCategory = z.infer<typeof BillingCategorySchema>;

export const ReceiptSettingsSchema = z.object({
  paymentDate: z.date().optional(),
  paymentMethod: z.string().optional(),
  addWatermark: z.boolean().optional(),
});
export type ReceiptSettings = z.infer<typeof ReceiptSettingsSchema>;

const BaseBillingDataSchema = z.object({
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
  
  taxes: z.array(TaxSchema).optional(),
  discounts: z.array(BillingDiscountSchema).optional(),
  
  logoPath: z.string().regex(/\.(png|jpg|jpeg)$/i, "Logo must be a PNG or JPEG image").optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  
  paymentUrl: z.string().url().optional(),
  qrCodeUrl: z.string().url().optional(),
  
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalCost: z.number().optional(),
  
  receipt: ReceiptSettingsSchema.optional(),
  
  items: z.array(BillingItemSchema).optional(),
  categories: z.array(BillingCategorySchema).optional(),
});

export const BillingDataSchema = BaseBillingDataSchema.superRefine((data, ctx) => {
  if (data.items && data.categories) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "You cannot provide both 'items' and 'categories'. Choose one format.",
      path: ["categories"]
    });
  }
  
  if (!data.items && !data.categories) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "You must provide either a flat 'items' array or grouped 'categories'.",
      path: ["items"]
    });
  }

  // A receipt should not have payment links or payment QR codes
  if (data.receipt) {
    if (data.paymentUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "paymentUrl cannot be provided when generating a receipt.",
        path: ["paymentUrl"]
      });
    }
    if (data.qrCodeUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "qrCodeUrl cannot be provided when generating a receipt.",
        path: ["qrCodeUrl"]
      });
    }
  }
});

type InternalBillingData = z.infer<typeof BaseBillingDataSchema>;
export type BillingData = Omit<InternalBillingData, 'items' | 'categories'> & (
  | { items: BillingItem[]; categories?: never }
  | { categories: BillingCategory[]; items?: never }
);

export type LayoutType = 'DEFAULT' | 'MINIMAL' | 'THERMAL' | 'MODERN';

export interface GeneratorOptions {
  filePath?: string;
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
    customFontPath?: { regular: string; bold: string };
    translations?: Record<string, string>;
  };
  layout?: LayoutType;
}

export interface AppliedDiscount {
  amount: number;
  description: string;
  isPercent: boolean;
  originalValue: number;
}

export interface ProcessedItem extends BillingItem {
  calculatedDiscountAmount: number;
  calculatedTaxAmount: number;
  calculatedTotal: number;
}

export interface ProcessedCategory {
  name: string;
  items: ProcessedItem[];
  calculatedSubTotal: number;
  calculatedTaxAmount: number;
  calculatedDiscountAmount: number;
  calculatedTotal: number;
  appliedDiscounts: AppliedDiscount[];
  appliedTaxes: { name: string; amount: number; rate: number }[];
}

export interface ProcessedBillData extends Omit<InternalBillingData, 'items' | 'categories'> {
  categories: ProcessedCategory[];
  calculatedSubTotal: number;
  calculatedTaxAmount: number;
  calculatedTotalCost: number;
  appliedDiscounts: AppliedDiscount[];
  appliedTaxes: { name: string; amount: number; rate: number }[];
  qrCodeBuffer?: Buffer;
}
