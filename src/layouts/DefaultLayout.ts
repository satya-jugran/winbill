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
    const { labels } = layout;
    let { primaryColor, fontFamily, fontBold } = layout;

    // --- Custom Font Registration ---
    if (options?.theme?.customFontPath) {
      const { regular, bold } = options.theme.customFontPath;
      if (fs.existsSync(regular) && fs.existsSync(bold)) {
        doc.registerFont("CustomFont", regular);
        doc.registerFont("CustomFont-Bold", bold);
        fontFamily = "CustomFont";
        fontBold = "CustomFont-Bold";
      }
    } else if (fontFamily === "Roboto") {
      const searchPaths = [
        path.join(__dirname, "..", "assets", "fonts"), 
        path.join(__dirname, "..", "..", "src", "assets", "fonts"),
        path.join(process.cwd(), "src", "assets", "fonts")
      ];
      
      const foundPath = searchPaths.find(p => fs.existsSync(path.join(p, "Roboto-Regular.ttf")));
      if (foundPath) {
        doc.registerFont("Roboto", path.join(foundPath, "Roboto-Regular.ttf"));
        doc.registerFont("Roboto-Bold", path.join(foundPath, "Roboto-Bold.ttf"));
      } else {
        fontFamily = "Helvetica";
        fontBold = "Helvetica-Bold";
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
    } else if (processed.qrCodeBuffer) {
      // If no logo but we have a QR code, put QR code here as a fallback design choice, or just leave it.
      // Usually QR code goes at the bottom, we'll put it at the bottom.
    }

    doc.fillColor(primaryColor)
       .fontSize(28)
       .font(fontBold)
       .text(layout.documentTitle, 350, currentY, { width: 200, align: "right" });
       
    currentY += 40;
    
    doc.fontSize(10)
       .fillColor("#666666")
       .font(fontFamily)
       .text(`${labels.invoiceNumber} ${processed.invoiceNumber}`, 350, currentY, { width: 200, align: "right" });
       
    if (processed.purchaseOrderNumber) {
      currentY += 15;
      doc.text(`${labels.poNumber} ${processed.purchaseOrderNumber}`, 350, currentY, { width: 200, align: "right" });
    }
    
    currentY += 15;
    doc.text(`${labels.date} ${layout.formattedDate}`, 350, currentY, { width: 200, align: "right" });
       
    if (!processed.receipt && layout.formattedDueDate) {
      currentY += 15;
      doc.text(`${labels.dueDate} ${layout.formattedDueDate}`, 350, currentY, { width: 200, align: "right" });
    }
       
    currentY = 150;

    // --- Company & Client Info ---
    doc.fontSize(12).fillColor(primaryColor).font(fontBold).text(labels.from, startX, currentY);
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
    
    currentY = Math.max(addressY, clientAddressY) + 30;

    // --- Items Table ---
    const colDesc = startX;
    const colQty = 300;
    const colUnit = 380;
    const colTotal = 470;

    const drawTableHeader = (y: number) => {
      doc.font(fontBold).fillColor(primaryColor);
      this.generateTableRow(doc, y, labels.description, labels.qty, labels.unitPrice, labels.total, colDesc, colQty, colUnit, colTotal);
      this.generateHr(doc, y + 20);
      doc.font(fontFamily).fillColor("#333333");
    };

    drawTableHeader(currentY);
    let itemY = currentY + 30;

    const checkPageBreak = (spaceNeeded: number, includeHeader = false) => {
      if (itemY + spaceNeeded > 700) {
        doc.addPage();
        itemY = 50;
        if (includeHeader) {
          drawTableHeader(itemY);
          itemY += 30;
        }
      }
    };

    layout.presentationCategories.forEach(category => {
      // If it's a named category, print the category header
      if (category.name) {
        checkPageBreak(30, true);
        doc.font(fontBold).fillColor(primaryColor).fontSize(11).text(category.name, colDesc, itemY);
        itemY += 20;
      }

      doc.font(fontFamily).fillColor("#333333").fontSize(10);
      category.items.forEach(item => {
        const rowHeight = doc.heightOfString(item.description, { width: 230 });
        const cellHeight = Math.max(rowHeight, 15);
        checkPageBreak(cellHeight + 15, true);
        this.generateTableRow(
          doc,
          itemY,
          item.description,
          item.qty,
          item.unitPrice,
          item.total,
          colDesc, colQty, colUnit, colTotal
        );
        this.generateHr(doc, itemY + cellHeight + 5);
        itemY += cellHeight + 15;
      });

      if (category.name || category.hasCategoryCalculations) {
        checkPageBreak(20 + (category.presentationDiscounts.length * 15) + (category.presentationTaxes.length * 15) + 30, false);
        
        doc.font(fontBold);
        doc.text(`${category.name ? category.name + ' ' : ''}Subtotal:`, 350, itemY, { align: "left" });
        doc.text(category.subTotal, 450, itemY, { width: 100, align: "right" });
        itemY += 20;

        doc.font(fontFamily);
        category.presentationDiscounts.forEach(d => {
          doc.text(d.label, 350, itemY, { align: "left" });
          doc.text(d.formattedAmount, 450, itemY, { width: 100, align: "right" });
          itemY += 15;
        });

        category.presentationTaxes.forEach(t => {
          doc.text(t.label, 350, itemY, { align: "left" });
          doc.text(t.formattedAmount, 450, itemY, { width: 100, align: "right" });
          itemY += 15;
        });

        if (category.hasCategoryCalculations) {
          doc.font(fontBold);
          doc.text(`${category.name ? category.name + ' ' : ''}Total:`, 350, itemY, { align: "left" });
          doc.text(category.total, 450, itemY, { width: 100, align: "right" });
          itemY += 20;
        }
        itemY += 10;
      }
    });

    // --- Global Summary Section ---
    checkPageBreak(100 + (layout.presentationGlobalDiscounts.length * 20) + (layout.presentationGlobalTaxes.length * 20));
    
    let summaryY = itemY + 10;
    doc.font(fontBold).fontSize(10);
    doc.text(labels.subtotal, 350, summaryY, { align: "left" });
    doc.text(layout.formattedSubTotal, 450, summaryY, { width: 100, align: "right" });
    
    doc.font(fontFamily);
    layout.presentationGlobalDiscounts.forEach(d => {
      summaryY += 20;
      doc.text(d.label, 350, summaryY, { align: "left" });
      doc.text(d.formattedAmount, 450, summaryY, { width: 100, align: "right" });
    });

    layout.presentationGlobalTaxes.forEach(t => {
      summaryY += 20;
      doc.text(t.label, 350, summaryY, { align: "left" });
      doc.text(t.formattedAmount, 450, summaryY, { width: 100, align: "right" });
    });
    
    this.generateHr(doc, summaryY + 20);
    
    doc.fontSize(14).fillColor(primaryColor).font(fontBold);
    summaryY += 40;
    doc.text(`${labels.total}:`, 350, summaryY, { align: "left" });
    doc.text(layout.formattedTotal, 450, summaryY, { width: 100, align: "right" });
    
    // Payment Link
    if (processed.paymentUrl && !processed.receipt) {
      summaryY += 30;
      doc.fontSize(12).fillColor("#0000EE").font(fontFamily);
      doc.text("Pay Now", 450, summaryY, { width: 100, align: "right", link: processed.paymentUrl, underline: true });
    }

    // QR Code
    if (processed.qrCodeBuffer && !processed.receipt) {
      // Put QR code at the bottom left of the summary
      doc.image(processed.qrCodeBuffer, startX, summaryY - 30, { width: 80 });
    }

    // Helper for bottom sections
    const checkBottomPageBreak = (spaceNeeded: number) => {
      if (summaryY + spaceNeeded > 700) {
        doc.addPage();
        summaryY = 50;
      }
    };

    summaryY += 30;

    // --- Payment Acknowledgement (Receipt Mode) ---
    if (layout.receiptAcknowledgement) {
      checkBottomPageBreak(60);
      
      doc.fontSize(10).fillColor("#4CAF50").font(fontBold);
      doc.text(layout.receiptAcknowledgement.title, 50, summaryY);
      
      doc.fillColor("#666666").font(fontFamily);
      doc.text(layout.receiptAcknowledgement.description, 50, summaryY + 15);
      summaryY += 45;
    }

    // --- Notes Section ---
    if (processed.notes) {
      checkBottomPageBreak(40);
      doc.fontSize(10).fillColor("#666666").font(fontFamily);
      doc.text(processed.notes, 50, summaryY, { width: 500, align: "center" });
      summaryY += 40;
    }

    // --- Terms and Conditions ---
    if (processed.termsAndConditions) {
      checkBottomPageBreak(100);
      doc.fillColor(primaryColor).fontSize(16).font(fontBold).text("Terms & Conditions", 50, summaryY);
      doc.fillColor("#333333").fontSize(10).font(fontFamily).text(processed.termsAndConditions, 50, summaryY + 30, { width: 500, align: "justify" });
    }
  }

  private generateTableRow(doc: PDFKit.PDFDocument, y: number, item: string, qty: string, unit: string, total: string, colDesc: number, colQty: number, colUnit: number, colTotal: number) {
    doc.text(item, colDesc, y, { width: 230 })
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
