import { injectable } from "inversify";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { ProcessedBillData, GeneratorOptions } from "../models/types";
import { DefaultLayoutData } from "../transformers/DefaultLayoutTransformer";
import * as fs from "fs";
import * as path from "path";
import type PDFDocument from "pdfkit";

@injectable()
export class MinimalLayout implements ILayoutStrategy<{ processed: ProcessedBillData, layout: DefaultLayoutData }> {
  
  public draw(doc: PDFKit.PDFDocument, data: { processed: ProcessedBillData, layout: DefaultLayoutData }, options?: GeneratorOptions): void {
    const startX = 50;
    let currentY = 50;
    const { processed, layout } = data;
    const { labels } = layout;
    let { fontFamily, fontBold } = layout; // ignore primaryColor, minimal uses black/gray

    if (options?.theme?.customFontPath) {
      const { regular, bold } = options.theme.customFontPath;
      if (fs.existsSync(regular) && fs.existsSync(bold)) {
        doc.registerFont("CustomFont", regular);
        doc.registerFont("CustomFont-Bold", bold);
        fontFamily = "CustomFont";
        fontBold = "CustomFont-Bold";
      }
    } else {
        fontFamily = "Helvetica";
        fontBold = "Helvetica-Bold";
    }

    doc.fillColor("#000000");

    // Title & Logo
    if (processed.logoPath && fs.existsSync(processed.logoPath)) {
      doc.image(processed.logoPath, startX, currentY - 5, { width: 40 });
      doc.fontSize(24).font(fontBold).text(layout.documentTitle.toUpperCase(), startX + 50, currentY);
    } else {
      doc.fontSize(24).font(fontBold).text(layout.documentTitle.toUpperCase(), startX, currentY);
    }
    currentY += 40;

    // Meta details
    doc.fontSize(10).font(fontFamily);
    doc.text(`${labels.invoiceNumber} ${processed.invoiceNumber}`, startX, currentY);
    doc.text(`${labels.date} ${layout.formattedDate}`, startX, currentY + 15);
    
    if (!processed.receipt && layout.formattedDueDate) {
      doc.text(`${labels.dueDate} ${layout.formattedDueDate}`, startX, currentY + 30);
    }
    
    currentY += 60;

    // From / To
    doc.font(fontBold).text(labels.from, startX, currentY);
    doc.font(fontFamily).text(processed.companyName, startX, currentY + 15);
    let addressY = currentY + 30;
    if (processed.companyAddress) {
      const cAddr = Array.isArray(processed.companyAddress) ? processed.companyAddress : [processed.companyAddress];
      cAddr.forEach(line => {
        doc.text(line, startX, addressY);
        addressY += 15;
      });
    }

    doc.font(fontBold).text(labels.billTo, 300, currentY);
    doc.font(fontFamily).text(processed.clientName, 300, currentY + 15);
    let clientAddressY = currentY + 30;
    if (processed.clientAddress) {
      const clAddr = Array.isArray(processed.clientAddress) ? processed.clientAddress : [processed.clientAddress];
      clAddr.forEach(line => {
        doc.text(line, 300, clientAddressY);
        clientAddressY += 15;
      });
    }
    
    currentY = Math.max(addressY, clientAddressY) + 40;

    // Items
    const colDesc = startX;
    const colTotal = 470;

    const drawHeader = (y: number) => {
      doc.font(fontBold).text(labels.description, colDesc, y).text(labels.total, colTotal, y, { width: 80, align: "right" });
      this.generateHr(doc, y + 15);
    };

    drawHeader(currentY);
    let itemY = currentY + 25;

    const checkPageBreak = (spaceNeeded: number, includeHeader = false) => {
      if (itemY + spaceNeeded > 700) {
        doc.addPage();
        itemY = 50;
        if (includeHeader) {
          drawHeader(itemY);
          itemY += 25;
        }
      }
    };

    layout.presentationCategories.forEach(category => {
      if (category.name) {
        checkPageBreak(30, true);
        doc.font(fontBold).text(category.name.toUpperCase(), colDesc, itemY);
        itemY += 20;
      }

      doc.font(fontFamily);
      category.items.forEach(item => {
        // Minimal layout combines qty/unit into description
        const descText = `${item.description} (${item.qty} x ${item.unitPrice})`;
        const rowHeight = doc.heightOfString(descText, { width: 350 });
        const cellHeight = Math.max(rowHeight, 15);
        checkPageBreak(cellHeight + 5, true);
        
        doc.text(descText, colDesc, itemY, { width: 350 });
        doc.text(item.total, colTotal, itemY, { width: 80, align: "right" });
        itemY += cellHeight + 5;
      });

      if (category.name || category.hasCategoryCalculations) {
        checkPageBreak(20 + (category.presentationDiscounts.length * 15) + (category.presentationTaxes.length * 15) + 30, false);
        this.generateHr(doc, itemY);
        itemY += 10;
        doc.text(`${labels.subtotal}`, 350, itemY, { align: "left" }).text(category.subTotal, colTotal, itemY, { width: 80, align: "right" });
        itemY += 15;
        
        category.presentationDiscounts.forEach(d => {
          doc.text(d.label, 350, itemY, { align: "left" }).text(d.formattedAmount, colTotal, itemY, { width: 80, align: "right" });
          itemY += 15;
        });

        category.presentationTaxes.forEach(t => {
          doc.text(t.label, 350, itemY, { align: "left" }).text(t.formattedAmount, colTotal, itemY, { width: 80, align: "right" });
          itemY += 15;
        });
        
        if (category.hasCategoryCalculations) {
           doc.font(fontBold).text(`${labels.total}`, 350, itemY, { align: "left" }).text(category.total, colTotal, itemY, { width: 80, align: "right" }).font(fontFamily);
           itemY += 20;
        }
        itemY += 15;
      }
    });

    // Summary
    checkPageBreak(120);
    this.generateHr(doc, itemY);
    itemY += 15;
    
    doc.text(labels.subtotal, 350, itemY).text(layout.formattedSubTotal, colTotal, itemY, { width: 80, align: "right" });
    itemY += 15;

    layout.presentationGlobalDiscounts.forEach(d => {
      doc.text(d.label, 350, itemY).text(d.formattedAmount, colTotal, itemY, { width: 80, align: "right" });
      itemY += 15;
    });

    layout.presentationGlobalTaxes.forEach(t => {
      doc.text(t.label, 350, itemY).text(t.formattedAmount, colTotal, itemY, { width: 80, align: "right" });
      itemY += 15;
    });

    this.generateHr(doc, itemY + 10);
    itemY += 25;
    
    doc.font(fontBold).fontSize(12).text(labels.total.toUpperCase(), 350, itemY).text(layout.formattedTotal, colTotal, itemY, { width: 80, align: "right" });
    itemY += 30;

    doc.font(fontFamily).fontSize(10);
    if (processed.paymentUrl && !processed.receipt) {
      doc.text("Pay Now", startX, itemY, { link: processed.paymentUrl, underline: true });
    }
    
    if (processed.qrCodeBuffer && !processed.receipt) {
      doc.image(processed.qrCodeBuffer, startX, itemY + 20, { width: 80 });
    }

    if (processed.notes) {
      doc.text(processed.notes, startX, 700, { width: 500, align: "center" });
    }

    if (processed.termsAndConditions) {
      doc.addPage();
      doc.font(fontBold).text("Terms & Conditions", startX, 50);
      doc.font(fontFamily).text(processed.termsAndConditions, startX, 80);
    }
  }

  private generateHr(doc: PDFKit.PDFDocument, y: number) {
    doc.strokeColor("#000000")
       .lineWidth(0.5)
       .moveTo(50, y)
       .lineTo(550, y)
       .stroke();
  }
}
