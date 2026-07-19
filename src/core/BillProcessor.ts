import { injectable } from "inversify";
import { BillingData, ProcessedBillData } from "../models/types";

@injectable()
export class BillProcessor {
  public process(data: BillingData): ProcessedBillData {
    let subTotalCalculated = 0;
    
    // Calculate subtotal from items
    data.items.forEach(item => {
      subTotalCalculated += (item.quantity * item.unitPrice);
    });

    const subTotal = data.subTotal ?? subTotalCalculated;
    let runningSubtotal = subTotal;
    
    const discounts = [...(data.discounts || [])].sort((a, b) => (a.sequenceNumber ?? -1) - (b.sequenceNumber ?? -1));
    const appliedDiscounts: { amount: number, description: string, isPercent: boolean, originalValue: number }[] = [];
    
    discounts.forEach(discount => {
      const amount = discount.isPercent 
        ? runningSubtotal * (discount.value / 100) 
        : discount.value;
        
      runningSubtotal -= amount;
      
      if (runningSubtotal < 0) {
        throw new Error(`Discount "${discount.description}" reduces the subtotal below zero`);
      }
      
      appliedDiscounts.push({
        amount,
        description: discount.description,
        isPercent: discount.isPercent,
        originalValue: discount.value
      });
    });

    const taxAmount = data.taxAmount ?? (runningSubtotal * data.taxRate);
    const totalCost = data.totalCost ?? (runningSubtotal + taxAmount);

    return {
      ...data,
      calculatedSubTotal: subTotal,
      calculatedTaxAmount: taxAmount,
      calculatedTotalCost: totalCost,
      appliedDiscounts
    };
  }
}
