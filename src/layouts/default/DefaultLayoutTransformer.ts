import { injectable } from "inversify";
import { IRenderTransformer } from "../../interfaces/IRenderTransformer";
import { ProcessedBillData, GeneratorOptions } from "../../models/types";

export interface PresentationItem {
  description: string;
  qty: string;
  unitPrice: string;
  total: string;
}

export interface PresentationCategory {
  name: string;
  items: PresentationItem[];
  subTotal: string;
  hasCategoryCalculations: boolean; // True if it has specific discounts or taxes
  presentationDiscounts: { label: string, formattedAmount: string }[];
  presentationTaxes: { label: string, formattedAmount: string }[];
  total: string;
}

export interface DefaultLayoutData {
  primaryColor: string;
  fontFamily: string;
  fontBold: string;
  documentTitle: string;
  
  formattedDate: string;
  formattedDueDate?: string;
  
  presentationCategories: PresentationCategory[];
  
  presentationGlobalDiscounts: { label: string, formattedAmount: string }[];
  presentationGlobalTaxes: { label: string, formattedAmount: string }[];
  
  formattedSubTotal: string;
  formattedTotal: string;
  
  receiptAcknowledgement?: {
    title: string;
    description: string;
  };
  
  labels: Record<string, string>;
}

const DEFAULT_LABELS = {
  invoice: "INVOICE",
  receipt: "RECEIPT",
  invoiceNumber: "Invoice Number:",
  poNumber: "PO Number:",
  date: "Date:",
  dueDate: "Due Date:",
  from: "From:",
  billTo: "Bill To:",
  description: "Description",
  qty: "Quantity",
  unitPrice: "Unit Price",
  total: "Total",
  subtotal: "Subtotal:",
  paidInFull: "PAID IN FULL",
  paymentReceived: "Payment of {amount} received on {date}{method}."
};

@injectable()
export class DefaultLayoutTransformer implements IRenderTransformer<DefaultLayoutData> {
  public transform(data: ProcessedBillData, options?: GeneratorOptions): DefaultLayoutData {
    const locale = data.locale || 'en-US';
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: data.currency,
      }).format(amount);
    };

    const primaryColor = options?.theme?.primaryColor || "#333333";
    const fontFamily = options?.theme?.fontFamily || "Roboto";
    
    const labels = { ...DEFAULT_LABELS, ...(options?.theme?.translations || {}) };
    const documentTitle = data.receipt ? labels.receipt : labels.invoice;
    
    const formattedDate = data.date.toLocaleDateString(locale);
    const formattedDueDate = data.dueDate ? data.dueDate.toLocaleDateString(locale) : undefined;
    
    const presentationCategories: PresentationCategory[] = data.categories.map(cat => {
      const items = cat.items.map(item => {
        let desc = item.description;
        if (item.discount) {
           const val = item.discount.isPercent ? `${item.discount.value}%` : formatCurrency(item.discount.value);
           desc += `\n(Discount: -${val})`;
        }
        if (item.taxRate) {
           desc += `\n(Tax: +${(item.taxRate * 100).toFixed(0)}%)`;
        }
        return {
          description: desc,
          qty: item.quantity.toString(),
          unitPrice: formatCurrency(item.unitPrice),
          total: formatCurrency(item.calculatedTotal)
        };
      });
      
      const presentationDiscounts = cat.appliedDiscounts.map(d => ({
        label: d.isPercent ? `${d.description} (${d.originalValue}%):` : `${d.description}:`,
        formattedAmount: `-${formatCurrency(d.amount)}`
      }));
      
      const presentationTaxes = cat.appliedTaxes.map(t => ({
        label: `${t.name} (${(t.rate * 100).toFixed(0)}%):`,
        formattedAmount: formatCurrency(t.amount)
      }));

      return {
        name: cat.name,
        items,
        subTotal: formatCurrency(cat.calculatedSubTotal),
        hasCategoryCalculations: presentationDiscounts.length > 0 || presentationTaxes.length > 0,
        presentationDiscounts,
        presentationTaxes,
        total: formatCurrency(cat.calculatedTotal)
      };
    });

    const presentationGlobalDiscounts = data.appliedDiscounts.map(d => ({
      label: d.isPercent ? `${d.description} (${d.originalValue}%):` : `${d.description}:`,
      formattedAmount: `-${formatCurrency(d.amount)}`
    }));
    
    const presentationGlobalTaxes = data.appliedTaxes.map(t => ({
      label: `${t.name} (${(t.rate * 100).toFixed(0)}%):`,
      formattedAmount: formatCurrency(t.amount)
    }));
    
    let receiptAcknowledgement = undefined;
    if (data.receipt) {
      const pDate = data.receipt.paymentDate ? data.receipt.paymentDate.toLocaleDateString(locale) : new Date().toLocaleDateString(locale);
      const pMethod = data.receipt.paymentMethod ? ` via ${data.receipt.paymentMethod}` : "";
      
      let desc = labels.paymentReceived.replace("{amount}", formatCurrency(data.calculatedTotalCost));
      desc = desc.replace("{date}", pDate);
      desc = desc.replace("{method}", pMethod);
      
      receiptAcknowledgement = {
        title: labels.paidInFull,
        description: desc
      };
    }

    return {
      primaryColor,
      fontFamily,
      fontBold: `${fontFamily}-Bold`,
      documentTitle,
      formattedDate,
      formattedDueDate,
      presentationCategories,
      presentationGlobalDiscounts,
      presentationGlobalTaxes,
      formattedSubTotal: formatCurrency(data.calculatedSubTotal),
      formattedTotal: formatCurrency(data.calculatedTotalCost),
      receiptAcknowledgement,
      labels
    };
  }
}
