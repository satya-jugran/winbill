import { injectable } from "inversify";
import { IRenderTransformer } from "../interfaces/IRenderTransformer";
import { ProcessedBillData, GeneratorOptions } from "../models/types";

export interface DefaultLayoutData {
  primaryColor: string;
  fontFamily: string;
  fontBold: string;
  documentTitle: string;
  
  formattedDate: string;
  formattedDueDate?: string;
  
  presentationItems: { description: string, qty: string, unitPrice: string, total: string }[];
  presentationDiscounts: { label: string, formattedAmount: string }[];
  
  formattedSubTotal: string;
  formattedTaxAmount: string;
  formattedTotal: string;
  taxRatePercent: string;
  
  receiptAcknowledgement?: {
    title: string;
    description: string;
  };
}

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
    
    const documentTitle = data.receipt ? "RECEIPT" : "INVOICE";
    
    const formattedDate = data.date.toLocaleDateString(locale);
    const formattedDueDate = data.dueDate ? data.dueDate.toLocaleDateString(locale) : undefined;
    
    const presentationItems = data.items.map(item => ({
      description: item.description,
      qty: item.quantity.toString(),
      unitPrice: formatCurrency(item.unitPrice),
      total: formatCurrency(item.quantity * item.unitPrice)
    }));

    const presentationDiscounts = data.appliedDiscounts.map(d => ({
      label: d.isPercent ? `${d.description} (${d.originalValue}%):` : `${d.description}:`,
      formattedAmount: `-${formatCurrency(d.amount)}`
    }));
    
    let receiptAcknowledgement = undefined;
    if (data.receipt) {
      const pDate = data.receipt.paymentDate ? data.receipt.paymentDate.toLocaleDateString(locale) : new Date().toLocaleDateString(locale);
      const pMethod = data.receipt.paymentMethod ? ` via ${data.receipt.paymentMethod}` : "";
      
      receiptAcknowledgement = {
        title: "PAID IN FULL",
        description: `Payment of ${formatCurrency(data.calculatedTotalCost)} received on ${pDate}${pMethod}.`
      };
    }

    return {
      primaryColor,
      fontFamily,
      fontBold: `${fontFamily}-Bold`,
      documentTitle,
      formattedDate,
      formattedDueDate,
      presentationItems,
      presentationDiscounts,
      formattedSubTotal: formatCurrency(data.calculatedSubTotal),
      formattedTaxAmount: formatCurrency(data.calculatedTaxAmount),
      formattedTotal: formatCurrency(data.calculatedTotalCost),
      taxRatePercent: (data.taxRate * 100).toFixed(0),
      receiptAcknowledgement
    };
  }
}
