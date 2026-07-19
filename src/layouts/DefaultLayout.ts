import { injectable } from "inversify";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { ProcessedBillData, GeneratorOptions } from "../models/types";
import { DefaultLayoutData } from "../transformers/DefaultLayoutTransformer";
import * as fs from "fs";
import * as path from "path";
import type PDFDocument from "pdfkit";

@injectable()
export class DefaultLayout implements ILayoutStrategy<{ processed: ProcessedBillData, layout: DefaultLayoutData }> {
  
  public draw(doc: PDFKit.PDFDocument, data: { processed: ProcessedBillData, layout: DefaultLayoutData }, options?: GeneratorOptions): void {
    const startX = 50;
    let currentY = 50;
    const { processed, layout } = data;
    const { primaryColor, fontFamily, fontBold } = layout;

    // Dynamically register Roboto if it's being used
    if (fontFamily === "Roboto") {
      const searchPaths = [
        path.join(__dirname, "..", "assets", "fonts"), 
        path.join(__dirname, "..", "..", "src", "assets", "fonts"),
        path.join(process.cwd(), "src", "assets", "fonts")
      ];
      
      const foundPath = searchPaths.find(p => fs.existsSync(path.join(p, "Roboto-Regular.ttf")));
      if (foundPath) {
        doc.registerFont("Roboto", path.join(foundPath, "Roboto-Regular.ttf"));
        doc.registerFont("Roboto-Bold", path.join(foundPath, "Roboto-Bold.ttf"));
      }
    }

    // --- Watermark Section ---
    if (processed.receipt && processed.receipt.addWatermark) {
      doc.save();
      doc.fillColor("#e0e0e0"); 
      doc.fillOpacity(0.3); 
      doc.fontSize(120);
      doc.font(fontBold);
      
      doc.translate(300, 400); 
      doc.rotate(-45);
      doc.text("PAID", -200, -50, { align: "center", width: 400 });
      
      doc.restore(); 
    }

    // --- Header Section ---
    if (processed.logoPath && fs.existsSync(processed.logoPath)) {
      doc.image(processed.logoPath, startX, currentY, { width: 100 });
    }

    doc.fillColor(primaryColor)
       .fontSize(28)
       .font(fontBold)
       .text(layout.documentTitle, 350, currentY, { width: 200, align: "right" });
       
    currentY += 40;
    
    doc.fontSize(10)
       .fillColor("#666666")
       .font(fontFamily)
       .text(`Invoice Number: ${processed.invoiceNumber}`, 350, currentY, { width: 200, align: "right" });
       
    if (processed.purchaseOrderNumber) {
      currentY += 15;
      doc.text(`PO Number: ${processed.purchaseOrderNumber}`, 350, currentY, { width: 200, align: "right" });
    }
    
    currentY += 15;
    doc.text(`Date: ${layout.formattedDate}`, 350, currentY, { width: 200, align: "right" });
       
    if (!processed.receipt && layout.formattedDueDate) {
      currentY += 15;
      doc.text(`Due Date: ${layout.formattedDueDate}`, 350, currentY, { width: 200, align: "right" });
    }
       
    currentY = 150;

    // --- Company & Client Info ---
    doc.fontSize(12).fillColor(primaryColor).font(fontBold).text("From:", startX, currentY);
    doc.font(fontFamily).text(processed.companyName, startX, currentY + 15);
    
    let addressY = currentY + 30;
    if (processed.companyAddress) {
      const cAddr = Array.isArray(processed.companyAddress) ? processed.companyAddress : [processed.companyAddress];
      cAddr.forEach(line => {
        doc.text(line, startX, addressY);
        addressY += 15;
      });
    }

    doc.font(fontBold).text("Bill To:", 300, currentY);
    doc.font(fontFamily).text(processed.clientName, 300, currentY + 15);
    
    let clientAddressY = currentY + 30;
    if (processed.clientAddress) {
      const clAddr = Array.isArray(processed.clientAddress) ? processed.clientAddress : [processed.clientAddress];
      clAddr.forEach(line => {
        doc.text(line, 300, clientAddressY);
        clientAddressY += 15;
      });
    }
    
    currentY = Math.max(addressY, clientAddressY) + 30;

    // --- Items Table ---
    const colDesc = startX;
    const colQty = 300;
    const colUnit = 380;
    const colTotal = 470;

    const drawTableHeader = (y: number) => {
      doc.font(fontBold).fillColor(primaryColor);
      this.generateTableRow(doc, y, "Description", "Quantity", "Unit Price", "Total", colDesc, colQty, colUnit, colTotal);
      this.generateHr(doc, y + 20);
      doc.font(fontFamily).fillColor("#333333");
    };

    drawTableHeader(currentY);
    let itemY = currentY + 30;

    layout.presentationItems.forEach((item) => {
      if (itemY > 700) {
        doc.addPage();
        itemY = 50;
        drawTableHeader(itemY);
        itemY += 30;
      }
      
      this.generateTableRow(
        doc,
        itemY,
        item.description,
        item.qty,
        item.unitPrice,
        item.total,
        colDesc, colQty, colUnit, colTotal
      );
      this.generateHr(doc, itemY + 20);
      itemY += 30;
    });

    // --- Summary Section ---
    const checkSummaryPageBreak = (spaceNeeded: number) => {
      if (itemY + spaceNeeded > 750) {
        doc.addPage();
        itemY = 50;
      }
    };
    
    checkSummaryPageBreak(100 + (layout.presentationDiscounts.length * 20));
    
    let summaryY = itemY + 10;
    doc.font(fontBold);
    doc.text("Subtotal:", 350, summaryY, { align: "left" });
    doc.text(layout.formattedSubTotal, 450, summaryY, { width: 100, align: "right" });
    
    layout.presentationDiscounts.forEach(d => {
      summaryY += 20;
      doc.text(d.label, 350, summaryY, { align: "left" });
      doc.text(d.formattedAmount, 450, summaryY, { width: 100, align: "right" });
    });

    summaryY += 20;
    doc.text(`Tax (${layout.taxRatePercent}%):`, 350, summaryY, { align: "left" });
    doc.text(layout.formattedTaxAmount, 450, summaryY, { width: 100, align: "right" });
    
    this.generateHr(doc, summaryY + 20);
    
    doc.fontSize(14).fillColor(primaryColor);
    summaryY += 40;
    doc.text("Total:", 350, summaryY, { align: "left" });
    doc.text(layout.formattedTotal, 450, summaryY, { width: 100, align: "right" });
    
    // --- Payment Acknowledgement (Receipt Mode) ---
    if (layout.receiptAcknowledgement) {
      checkSummaryPageBreak(80);
      const receiptStartY = summaryY + 40;
      
      doc.fontSize(10).fillColor("#4CAF50").font(fontBold);
      doc.text(layout.receiptAcknowledgement.title, 50, receiptStartY);
      
      doc.fillColor("#666666").font(fontFamily);
      doc.text(layout.receiptAcknowledgement.description, 50, receiptStartY + 15);
    }

    // --- Notes Section ---
    if (processed.notes) {
      checkSummaryPageBreak(50);
      doc.fontSize(10).fillColor("#666666").font(fontFamily);
      doc.text(processed.notes, 50, summaryY + 100, { width: 500, align: "center" });
    }
  }

  private generateTableRow(doc: PDFKit.PDFDocument, y: number, item: string, qty: string, unit: string, total: string, colDesc: number, colQty: number, colUnit: number, colTotal: number) {
    doc.fontSize(10)
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
