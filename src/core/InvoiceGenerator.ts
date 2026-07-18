import { injectable, inject } from "inversify";
import { TYPES } from "../config/types";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { InvoiceData, GeneratorOptions } from "../models/types";
import PDFDocument from "pdfkit";
import * as fs from "fs";

@injectable()
export class InvoiceGenerator {
  
  constructor(
    @inject(TYPES.LayoutStrategy) private layoutStrategy: ILayoutStrategy
  ) {}

  public async generate(data: InvoiceData, options: GeneratorOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (data.discounts && data.discounts.length > 0) {
          const subTotal = data.subTotal ?? data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
          let runningSubtotal = subTotal;
          
          const discounts = [...data.discounts].sort((a, b) => (a.sequenceNumber ?? -1) - (b.sequenceNumber ?? -1));

          discounts.forEach(discount => {
            if (discount.isPercent && (discount.value < 0 || discount.value > 100)) {
              throw new Error(`Discount "${discount.description}" is a percentage and must be between 0 and 100`);
            }
            if (!discount.isPercent && discount.value < 0) {
              throw new Error(`Discount "${discount.description}" must be a non-negative value`);
            }
            
            const amount = discount.isPercent 
              ? runningSubtotal * (discount.value / 100) 
              : discount.value;
              
            runningSubtotal -= amount;
            
            if (runningSubtotal < 0) {
              throw new Error(`Discount "${discount.description}" reduces the subtotal below zero`);
            }
          });
        }

        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(options.filePath);
        
        // Attach error and finish handlers immediately to avoid missing events
        writeStream.on("finish", () => {
          resolve();
        });
        
        writeStream.on("error", (error) => {
          reject(error);
        });

        doc.on("error", (error) => {
          reject(error);
        });

        doc.pipe(writeStream);
        
        // Delegate drawing logic to the layout strategy
        const strategyToUse = (options.layout && options.layout !== 'default') 
          ? options.layout 
          : this.layoutStrategy;

        strategyToUse.draw(doc, data);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
