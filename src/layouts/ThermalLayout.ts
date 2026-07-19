import { injectable } from "inversify";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { ProcessedBillData, GeneratorOptions } from "../models/types";
import { DefaultLayoutData } from "../transformers/DefaultLayoutTransformer";
import * as fs from "fs";
import * as path from "path";
import type PDFDocument from "pdfkit";

@injectable()
export class ThermalLayout implements ILayoutStrategy<{ processed: ProcessedBillData, layout: DefaultLayoutData }> {
  
  public draw(doc: PDFKit.PDFDocument, data: { processed: ProcessedBillData, layout: DefaultLayoutData }, options?: GeneratorOptions): void {
    // Thermal layout targets 80mm width (~226 points) with 15pt margins
    const margin = 15;
    const contentWidth = 226 - (margin * 2); 
    const alignCenter = { width: contentWidth, align: "center" as const };
    const alignRight = { width: contentWidth, align: "right" as const };
    
    let currentY = margin;
    const { processed, layout } = data;
    const { labels } = layout;
    let { fontFamily, fontBold } = layout;

    if (options?.theme?.customFontPath) {
      const { regular, bold } = options.theme.customFontPath;
      if (fs.existsSync(regular) && fs.existsSync(bold)) {
        doc.registerFont("CustomFont", regular);
        doc.registerFont("CustomFont-Bold", bold);
        fontFamily = "CustomFont";
        fontBold = "CustomFont-Bold";
      }
    } else {
        // Typically POS printers use monospace, let's stick to Helvetica for consistency but use smaller sizes
        fontFamily = "Helvetica";
        fontBold = "Helvetica-Bold";
    }

    doc.fillColor("#000000");

    // Header
    if (processed.logoPath && fs.existsSync(processed.logoPath)) {
      doc.image(processed.logoPath, margin + (contentWidth / 2) - 30, currentY, { width: 60 });
      currentY += 60; // Approximate logo height
    }
    
    doc.fontSize(14).font(fontBold).text(processed.companyName, margin, currentY, alignCenter);
    currentY += 20;

    doc.fontSize(8).font(fontFamily);
    if (processed.companyAddress) {
      const cAddr = Array.isArray(processed.companyAddress) ? processed.companyAddress : [processed.companyAddress];
      cAddr.forEach(line => {
        doc.text(line, margin, currentY, alignCenter);
        currentY += 12;
      });
    }

    this.generateHr(doc, currentY);
    currentY += 10;
    
    doc.text(`${layout.documentTitle.toUpperCase()}`, margin, currentY, alignCenter);
    currentY += 15;

    // Meta details
    doc.text(`${labels.invoiceNumber} ${processed.invoiceNumber}`, margin, currentY);
    currentY += 12;
    doc.text(`${labels.date} ${layout.formattedDate}`, margin, currentY);
    currentY += 12;
    if (processed.clientName) {
      doc.text(`${labels.billTo} ${processed.clientName}`, margin, currentY);
      currentY += 12;
    }
    
    this.generateHr(doc, currentY);
    currentY += 10;

    // Items
    layout.presentationCategories.forEach(category => {
      if (category.name) {
        doc.font(fontBold).text(category.name.toUpperCase(), margin, currentY);
        currentY += 12;
      }
      
      doc.font(fontFamily);
      category.items.forEach(item => {
        // Item Name
        doc.text(item.description, margin, currentY, { width: contentWidth });
        currentY += 10;
        
        // Qty x UnitPrice = Total
        const qtyStr = `${item.qty} x ${item.unitPrice}`;
        doc.text(qtyStr, margin, currentY);
        doc.text(item.total, margin, currentY, alignRight);
        currentY += 12;
      });

      if (category.hasCategoryCalculations) {
        currentY += 5;
        doc.text(labels.subtotal, margin, currentY).text(category.subTotal, margin, currentY, alignRight);
        currentY += 10;
        
        category.presentationDiscounts.forEach(d => {
          doc.text(d.label, margin, currentY).text(d.formattedAmount, margin, currentY, alignRight);
          currentY += 10;
        });

        category.presentationTaxes.forEach(t => {
          doc.text(t.label, margin, currentY).text(t.formattedAmount, margin, currentY, alignRight);
          currentY += 10;
        });
        
        doc.font(fontBold).text(`Total`, margin, currentY).text(category.total, margin, currentY, alignRight).font(fontFamily);
        currentY += 12;
      }
      
      currentY += 5;
    });

    this.generateHr(doc, currentY);
    currentY += 10;
    
    // Global Summary
    doc.text(labels.subtotal, margin, currentY).text(layout.formattedSubTotal, margin, currentY, alignRight);
    currentY += 12;

    layout.presentationGlobalDiscounts.forEach(d => {
      doc.text(d.label, margin, currentY).text(d.formattedAmount, margin, currentY, alignRight);
      currentY += 12;
    });

    layout.presentationGlobalTaxes.forEach(t => {
      doc.text(t.label, margin, currentY).text(t.formattedAmount, margin, currentY, alignRight);
      currentY += 12;
    });

    this.generateHr(doc, currentY);
    currentY += 10;
    
    doc.fontSize(12).font(fontBold);
    doc.text(labels.total.toUpperCase(), margin, currentY).text(layout.formattedTotal, margin, currentY, alignRight);
    currentY += 20;
    
    doc.fontSize(8).font(fontFamily);

    // QR Code
    if (processed.qrCodeBuffer && !processed.receipt) {
      doc.image(processed.qrCodeBuffer, margin + (contentWidth / 2) - 40, currentY, { width: 80 });
      currentY += 90;
    }

    if (processed.notes) {
      currentY += 10;
      doc.text(processed.notes, margin, currentY, alignCenter);
      currentY += 20;
    }
    
    // Thermal receipts often end with a thank you or divider
    doc.text("*** THANK YOU ***", margin, currentY, alignCenter);
  }

  private generateHr(doc: PDFKit.PDFDocument, y: number) {
    doc.strokeColor("#000000")
       .lineWidth(1)
       // PDFKit dash doesn't always render perfectly across all viewers, but for thermal it simulates the dotted look well
       .dash(2, { space: 2 })
       .moveTo(15, y)
       .lineTo(211, y)
       .stroke()
       .undash();
  }
}
