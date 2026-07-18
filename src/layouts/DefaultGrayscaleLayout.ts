import { injectable } from "inversify";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { InvoiceData } from "../models/types";
import * as fs from "fs";
import type PDFDocument from "pdfkit";

@injectable()
export class DefaultGrayscaleLayout implements ILayoutStrategy {
  
  public draw(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const startX = 50;
    let currentY = 50;

    // --- Watermark Section ---
    if (data.paid && data.addWatermark) {
      doc.save();
      doc.fillColor("#e0e0e0"); 
      doc.fillOpacity(0.3); 
      doc.fontSize(120);
      doc.font("Helvetica-Bold");
      
      doc.translate(300, 400); 
      doc.rotate(-45);
      doc.text("PAID", -200, -50, { align: "center", width: 400 });
      
      doc.restore(); 
    }

    // --- Header Section ---
    
    // Add Logo if provided
    if (data.logoPath && fs.existsSync(data.logoPath)) {
      doc.image(data.logoPath, startX, currentY, { width: 100 });
      // We don't advance currentY immediately, to allow the title to sit on the right
    }

    // Title & Invoice/Receipt Info
    const documentTitle = data.paid ? "RECEIPT" : "INVOICE";
    doc.fillColor("#333333")
       .fontSize(28)
       .text(documentTitle, 350, currentY, { width: 200, align: "right" });
       
    currentY += 40;
    
    doc.fontSize(10)
       .fillColor("#666666")
       .text(`Invoice Number: ${data.invoiceNumber}`, 350, currentY, { width: 200, align: "right" })
       .text(`Date: ${data.date.toLocaleDateString()}`, 350, currentY + 15, { width: 200, align: "right" });
       
    if (!data.paid && data.dueDate) {
      doc.text(`Due Date: ${data.dueDate.toLocaleDateString()}`, 350, currentY + 30, { width: 200, align: "right" });
    }
       
    currentY = 150; // Move below header

    // --- Company & Client Info ---
    doc.fontSize(12).fillColor("#333333").font("Helvetica-Bold").text("From:", startX, currentY);
    doc.font("Helvetica").text(data.companyName, startX, currentY + 15);
    
    doc.font("Helvetica-Bold").text("Bill To:", 300, currentY);
    doc.font("Helvetica").text(data.clientName, 300, currentY + 15);
    
    currentY += 60;

    // --- Items Table ---
    const tableTop = currentY;
    const colDesc = startX;
    const colQty = 300;
    const colUnit = 380;
    const colTotal = 470;

    doc.font("Helvetica-Bold");
    this.generateTableRow(doc, tableTop, "Description", "Quantity", "Unit Price", "Total", colDesc, colQty, colUnit, colTotal);
    this.generateHr(doc, tableTop + 20);
    doc.font("Helvetica");

    let itemY = tableTop + 30;
    let subTotalCalculated = 0;

    data.items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subTotalCalculated += lineTotal;
      
      this.generateTableRow(
        doc,
        itemY,
        item.description,
        item.quantity.toString(),
        `${data.currencyType}${item.unitPrice.toFixed(2)}`,
        `${data.currencyType}${lineTotal.toFixed(2)}`,
        colDesc, colQty, colUnit, colTotal
      );
      this.generateHr(doc, itemY + 20);
      itemY += 30;
    });

    // --- Summary Section ---
    const subTotal = data.subTotal ?? subTotalCalculated;
    
    let runningSubtotal = subTotal;
    const discounts = (data.discounts || []).sort((a, b) => (a.sequenceNumber ?? -1) - (b.sequenceNumber ?? -1));
    const appliedDiscounts: { amount: number, label: string }[] = [];
    
    discounts.forEach(discount => {
      const amount = discount.isPercent 
        ? runningSubtotal * (discount.value / 100) 
        : discount.value;
        
      runningSubtotal -= amount;
      
      const label = discount.isPercent
        ? `${discount.description} (${discount.value}%):`
        : `${discount.description}:`;
        
      appliedDiscounts.push({ amount, label });
    });

    const taxAmount = data.taxAmount ?? (runningSubtotal * data.taxRate);
    const totalCost = data.totalCost ?? (runningSubtotal + taxAmount);
    
    let summaryY = itemY + 10;
    doc.font("Helvetica-Bold");
    doc.text("Subtotal:", 350, summaryY, { align: "left" });
    doc.text(`${data.currencyType}${subTotal.toFixed(2)}`, 450, summaryY, { width: 100, align: "right" });
    
    appliedDiscounts.forEach(d => {
      if (d.amount > 0) {
        summaryY += 20;
        doc.text(d.label, 350, summaryY, { align: "left" });
        doc.text(`-${data.currencyType}${d.amount.toFixed(2)}`, 450, summaryY, { width: 100, align: "right" });
      }
    });

    summaryY += 20;
    doc.text(`Tax (${(data.taxRate * 100).toFixed(0)}%):`, 350, summaryY, { align: "left" });
    doc.text(`${data.currencyType}${taxAmount.toFixed(2)}`, 450, summaryY, { width: 100, align: "right" });
    
    this.generateHr(doc, summaryY + 20);
    
    doc.fontSize(14).fillColor("#000000");
    summaryY += 40;
    doc.text("Total:", 350, summaryY, { align: "left" });
    doc.text(`${data.currencyType}${totalCost.toFixed(2)}`, 450, summaryY, { width: 100, align: "right" });
    
    // --- Payment Acknowledgement (Receipt Mode) ---
    if (data.paid) {
      const pDate = data.paymentDate ? data.paymentDate.toLocaleDateString() : new Date().toLocaleDateString();
      const pMethod = data.paymentMethod ? ` via ${data.paymentMethod}` : "";
      
      const receiptStartY = summaryY + 40;
      
      doc.fontSize(10).fillColor("#4CAF50").font("Helvetica-Bold"); // Green color for payment success
      doc.text("PAID IN FULL", 50, receiptStartY);
      
      doc.fillColor("#666666").font("Helvetica");
      doc.text(`Payment of ${data.currencyType}${totalCost.toFixed(2)} received on ${pDate}${pMethod}.`, 50, receiptStartY + 15);
      doc.text("Thank you for your business!", 50, receiptStartY + 30);
    }
  }

  private generateTableRow(doc: PDFKit.PDFDocument, y: number, item: string, qty: string, unit: string, total: string, colDesc: number, colQty: number, colUnit: number, colTotal: number) {
    doc.fontSize(10).fillColor("#333333")
       .text(item, colDesc, y, { width: 200 })
       .text(qty, colQty, y, { width: 50, align: "right" })
       .text(unit, colUnit, y, { width: 70, align: "right" })
       .text(total, colTotal, y, { width: 80, align: "right" });
  }

  private generateHr(doc: PDFKit.PDFDocument, y: number) {
    doc.strokeColor("#cccccc")
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(550, y)
       .stroke();
  }
}
