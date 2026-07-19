import { injectable } from "inversify";
import { BillingData, ProcessedBillData, ProcessedCategory, ProcessedItem, AppliedDiscount, BillingDiscount, Tax } from "../models/types";

@injectable()
export class BillProcessor {
  public process(data: BillingData): ProcessedBillData {
    // 1. Normalize categories (wrap flat items into a default category if needed)
    const workingCategories = data.categories 
      ? data.categories 
      : (data.items ? [{ name: "", items: data.items }] : []);

    const processedCategories: ProcessedCategory[] = [];
    let grandSubTotal = 0;

    // 2. Process Item Level & Category Level
    for (const category of workingCategories) {
      let categorySubTotal = 0;
      const processedItems: ProcessedItem[] = [];

      // A. Item Level
      for (const item of category.items) {
        let itemRunningTotal = item.unitPrice * item.quantity;
        
        // Item Discount
        let calculatedDiscountAmount = 0;
        if (item.discount) {
          calculatedDiscountAmount = item.discount.isPercent
            ? itemRunningTotal * (item.discount.value / 100)
            : item.discount.value;
          itemRunningTotal -= calculatedDiscountAmount;
        }
        
        // Item Tax
        let calculatedTaxAmount = 0;
        if (!item.isTaxExempt && item.taxRate) {
          calculatedTaxAmount = itemRunningTotal * item.taxRate;
          itemRunningTotal += calculatedTaxAmount;
        }

        processedItems.push({
          ...item,
          calculatedDiscountAmount,
          calculatedTaxAmount,
          calculatedTotal: itemRunningTotal
        });

        categorySubTotal += itemRunningTotal;
      }

      // B. Category Level
      let categoryRunningTotal = categorySubTotal;
      const categoryAppliedDiscounts: AppliedDiscount[] = [];
      const categoryAppliedTaxes: { name: string; amount: number; rate: number }[] = [];
      let categoryTotalDiscountAmount = 0;
      let categoryTotalTaxAmount = 0;

      // Category Discounts
      const catDiscounts = [...(category.discounts || [])].sort((a, b) => (a.sequenceNumber ?? -1) - (b.sequenceNumber ?? -1));
      for (const discount of catDiscounts) {
        const amount = discount.isPercent 
          ? categoryRunningTotal * (discount.value / 100) 
          : discount.value;
          
        categoryRunningTotal -= amount;
        categoryTotalDiscountAmount += amount;
        
        categoryAppliedDiscounts.push({
          amount,
          description: discount.description,
          isPercent: discount.isPercent,
          originalValue: discount.value
        });
      }

      // Category Taxes
      for (const tax of category.taxes || []) {
        const taxAmount = categoryRunningTotal * tax.rate;
        categoryRunningTotal += taxAmount;
        categoryTotalTaxAmount += taxAmount;
        
        categoryAppliedTaxes.push({
          name: tax.name,
          amount: taxAmount,
          rate: tax.rate
        });
      }

      processedCategories.push({
        name: category.name,
        items: processedItems,
        calculatedSubTotal: categorySubTotal,
        calculatedDiscountAmount: categoryTotalDiscountAmount,
        calculatedTaxAmount: categoryTotalTaxAmount,
        calculatedTotal: categoryRunningTotal,
        appliedDiscounts: categoryAppliedDiscounts,
        appliedTaxes: categoryAppliedTaxes
      });

      grandSubTotal += categoryRunningTotal;
    }

    // 3. Global Level
    // If user provided a manual subTotal, use it. Otherwise use the calculated one.
    const subTotal = data.subTotal ?? grandSubTotal;
    let runningGrandTotal = subTotal;
    
    const globalAppliedDiscounts: AppliedDiscount[] = [];
    const globalAppliedTaxes: { name: string; amount: number; rate: number }[] = [];
    let globalTotalTaxAmount = 0;

    // Global Discounts
    const globalDiscounts = [...(data.discounts || [])].sort((a, b) => (a.sequenceNumber ?? -1) - (b.sequenceNumber ?? -1));
    for (const discount of globalDiscounts) {
      const amount = discount.isPercent 
        ? runningGrandTotal * (discount.value / 100) 
        : discount.value;
        
      runningGrandTotal -= amount;
      
      if (runningGrandTotal < 0) {
        throw new Error(`Discount "${discount.description}" reduces the subtotal below zero`);
      }
      
      globalAppliedDiscounts.push({
        amount,
        description: discount.description,
        isPercent: discount.isPercent,
        originalValue: discount.value
      });
    }

    // Global Taxes
    for (const tax of data.taxes || []) {
      const taxAmount = runningGrandTotal * tax.rate;
      runningGrandTotal += taxAmount;
      globalTotalTaxAmount += taxAmount;
      
      globalAppliedTaxes.push({
        name: tax.name,
        amount: taxAmount,
        rate: tax.rate
      });
    }

    const taxAmount = data.taxAmount ?? globalTotalTaxAmount;
    const totalCost = data.totalCost ?? runningGrandTotal;

    return {
      ...data,
      categories: processedCategories,
      calculatedSubTotal: subTotal,
      calculatedTaxAmount: taxAmount,
      calculatedTotalCost: totalCost,
      appliedDiscounts: globalAppliedDiscounts,
      appliedTaxes: globalAppliedTaxes
    };
  }
}
