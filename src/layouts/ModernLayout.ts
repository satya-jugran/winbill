import { injectable } from "inversify";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { ProcessedBillData, GeneratorOptions } from "../models/types";
import { DefaultLayoutData } from "../transformers/DefaultLayoutTransformer";
import * as fs from "fs";
import * as path from "path";
import type PDFDocument from "pdfkit";

@injectable()
export class ModernLayout implements ILayoutStrategy<{ processed: ProcessedBillData, layout: DefaultLayoutData }> {
  
  public draw(doc: PDFKit.PDFDocument, data: { processed: ProcessedBillData, layout: DefaultLayoutData }, options?: GeneratorOptions): void {
    const { processed, layout } = data;
    const { labels, primaryColor } = layout;
    let { fontFamily, fontBold } = layout;

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

    // --- Header Background ---
    doc.fillColor(primaryColor);
    doc.polygon([0, 0], [612, 0], [612, 120], [180, 120], [220, 40], [0, 40]);
    doc.fill();
    
    doc.polygon([175, 130], [612, 130], [612, 140], [170, 140]);
    doc.fill();

    // --- Title (White text on blue) ---
    doc.fillColor("#FFFFFF").fontSize(40).font(fontBold).text(layout.documentTitle, 250, 45, { width: 320, align: "right" });

    // --- Company / Logo (Top Left over white) ---
    doc.fillColor(primaryColor);
    if (processed.logoPath && fs.existsSync(processed.logoPath)) {
      doc.image(processed.logoPath, 40, 55, { width: 100 });
    } else {
      doc.fontSize(16).font(fontBold).text(processed.companyName, 40, 50, { width: 150 });
    }
    
    // --- Meta Info & Bill To ---
    let currentY = 180;
    
    // Bill To
    doc.fillColor("#333333").fontSize(10).font(fontFamily);
    doc.text(labels.billTo, 40, currentY);
    doc.fillColor(primaryColor).fontSize(16).font(fontBold).text(processed.clientName, 40, currentY + 15);
    doc.fillColor("#666666").fontSize(9).font(fontFamily);
    let addressY = currentY + 35;
    if (processed.clientAddress) {
      const clAddr = Array.isArray(processed.clientAddress) ? processed.clientAddress : [processed.clientAddress];
      clAddr.forEach(line => {
        doc.text(line, 40, addressY);
        addressY += 12;
      });
    }

    // Invoice details blocks (Right side)
    const blockX = 320;
    const drawBlock = (label: string, value: string, y: number) => {
      doc.fillColor(primaryColor);
      doc.rect(blockX, y, 70, 20).fill();
      doc.fillColor("#FFFFFF").font(fontFamily).fontSize(10).text(label, blockX, y + 5, { width: 70, align: "center" });
      
      doc.fillColor("#cccccc");
      doc.rect(blockX + 75, y, 177, 20).fill();
      doc.fillColor("#333333").font(fontFamily).fontSize(10).text(value, blockX + 75, y + 5, { width: 167, align: "right" });
    };

    drawBlock(labels.invoiceNumber, processed.invoiceNumber, currentY);
    drawBlock(labels.date, layout.formattedDate, currentY + 25);
    if (!processed.receipt && layout.formattedDueDate) {
      drawBlock(labels.dueDate, layout.formattedDueDate, currentY + 50);
    }
    
    currentY = Math.max(addressY, currentY + 80) + 30;

    // --- Items Table ---
    const drawTableHeader = (y: number) => {
      doc.fillColor(primaryColor);
      doc.rect(40, y, 532, 25).fill();
      doc.fillColor("#FFFFFF").font(fontFamily).fontSize(10);
      doc.text("Sl No", 50, y + 7, { width: 30 });
      doc.text(labels.description, 90, y + 7, { width: 220 });
      doc.text(labels.unitPrice, 320, y + 7, { width: 80, align: "right" });
      doc.text(labels.qty, 410, y + 7, { width: 50, align: "center" });
      doc.text(labels.total, 470, y + 7, { width: 90, align: "right" });
    };

    drawTableHeader(currentY);
    currentY += 25;
    
    let isEvenRow = false;
    let slNo = 1;

    const checkPageBreak = (spaceNeeded: number, includeHeader = false) => {
      if (currentY + spaceNeeded > 700) {
        doc.addPage();
        currentY = 50;
        if (includeHeader) {
          drawTableHeader(currentY);
          currentY += 25;
          isEvenRow = false; // Reset striping
        }
      }
    };
    
    // --- Footer Graphic Engine ---
    const drawFooter = () => {
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      
      doc.fillColor(primaryColor);
      doc.polygon([0, 752], [612, 752], [612, 792], [0, 792]);
      doc.fill();
      
      doc.polygon([400, 742], [612, 742], [612, 752], [390, 752]);
      doc.fill();
      
      doc.fillColor("#FFFFFF").fontSize(10).font(fontFamily).text("Get in Touch", 80, 760, { lineBreak: false });
      doc.fontSize(14).font(fontBold).text(processed.companyName, 80, 772, { lineBreak: false });
      
      doc.page.margins.bottom = bottomMargin;
      
      // Reset color for body content
      doc.fillColor("#333333");
    };
    
    // Bind footer to all pages (and draw on the first one immediately)
    doc.on('pageAdded', drawFooter);
    drawFooter();

    layout.presentationCategories.forEach(category => {
      if (category.name) {
        checkPageBreak(30, true);
        doc.fillColor("#e0e0e0").rect(40, currentY, 532, 20).fill();
        doc.fillColor(primaryColor).font(fontBold).fontSize(10).text(category.name, 50, currentY + 5);
        currentY += 20;
        isEvenRow = false;
      }

      doc.font(fontFamily).fontSize(9);
      category.items.forEach(item => {
        const rowHeight = doc.heightOfString(item.description, { width: 220 });
        const cellHeight = Math.max(rowHeight, 15);
        checkPageBreak(cellHeight + 10, true);
        
        if (isEvenRow) {
          doc.fillColor("#f2f2f2").rect(40, currentY, 532, cellHeight + 10).fill();
        } else {
          doc.fillColor("#e6e6e6").rect(40, currentY, 532, cellHeight + 10).fill(); // slightly darker gray as per reference
        }
        
        doc.fillColor("#333333");
        doc.text(slNo.toString(), 50, currentY + 7, { width: 30 });
        doc.text(item.description, 90, currentY + 7, { width: 220 });
        doc.text(item.unitPrice, 320, currentY + 7, { width: 80, align: "right" });
        doc.text(item.qty, 410, currentY + 7, { width: 50, align: "center" });
        doc.text(item.total, 470, currentY + 7, { width: 90, align: "right" });
        
        currentY += cellHeight + 10;
        isEvenRow = !isEvenRow;
        slNo++;
      });
      
      if (category.name || category.hasCategoryCalculations) {
        checkPageBreak(20 + (category.presentationDiscounts.length * 15) + (category.presentationTaxes.length * 15) + 30, false);
        
        doc.fillColor("#333333").font(fontBold).fontSize(9);
        doc.text(`${category.name ? category.name + ' ' : ''}${labels.subtotal}`, 350, currentY, { align: "right", width: 100 });
        doc.text(category.subTotal, 470, currentY, { align: "right", width: 100 });
        currentY += 15;

        doc.font(fontFamily);
        category.presentationDiscounts.forEach(d => {
          doc.text(d.label, 350, currentY, { align: "right", width: 100 });
          doc.text(d.formattedAmount, 470, currentY, { align: "right", width: 100 });
          currentY += 15;
        });

        category.presentationTaxes.forEach(t => {
          doc.text(t.label, 350, currentY, { align: "right", width: 100 });
          doc.text(t.formattedAmount, 470, currentY, { align: "right", width: 100 });
          currentY += 15;
        });

        if (category.hasCategoryCalculations) {
          doc.font(fontBold);
          doc.text(`${category.name ? category.name + ' ' : ''}${labels.total}:`, 350, currentY, { align: "right", width: 100 });
          doc.text(category.total, 470, currentY, { align: "right", width: 100 });
          currentY += 15;
        }
        currentY += 15;
      }
    });

    // --- Global Summary ---
    checkPageBreak(120);
    currentY += 20;

    const summaryX = 350;
    const summaryValX = 470;
    
    doc.fillColor("#333333").font(fontFamily).fontSize(10);
    doc.text(labels.subtotal, summaryX, currentY, { align: "right", width: 100 });
    doc.text(layout.formattedSubTotal, summaryValX, currentY, { align: "right", width: 100 });
    currentY += 20;

    layout.presentationGlobalDiscounts.forEach(d => {
      doc.text(d.label, summaryX, currentY, { align: "right", width: 100 });
      doc.text(d.formattedAmount, summaryValX, currentY, { align: "right", width: 100 });
      currentY += 20;
    });

    layout.presentationGlobalTaxes.forEach(t => {
      doc.text(t.label, summaryX, currentY, { align: "right", width: 100 });
      doc.text(t.formattedAmount, summaryValX, currentY, { align: "right", width: 100 });
      currentY += 20;
    });

    // Total block
    doc.fillColor(primaryColor);
    doc.rect(350, currentY, 222, 25).fill();
    doc.fillColor("#FFFFFF").font(fontFamily);
    doc.text(`${labels.total}:`, summaryX, currentY + 7, { align: "right", width: 100 });
    doc.text(layout.formattedTotal, summaryValX, currentY + 7, { align: "right", width: 100 });
    currentY += 45;

    // --- Terms and Notes (Bottom Left) ---
    if (processed.notes) {
      doc.fillColor(primaryColor).font(fontBold).fontSize(10).text("Notes", 40, currentY - 50);
      doc.fillColor("#666666").font(fontFamily).fontSize(8).text(processed.notes, 40, currentY - 35, { width: 250 });
    }
    
    // --- Receipt Acknowledgement ---
    if (layout.receiptAcknowledgement) {
      doc.fillColor(primaryColor).font(fontBold).fontSize(14).text(layout.receiptAcknowledgement.title, 40, currentY - 10);
      doc.fillColor("#333333").font(fontFamily).fontSize(10).text(layout.receiptAcknowledgement.description, 40, currentY + 5, { width: 250 });
      currentY += 40;
    }

    // Payment Link & QR
    if (processed.paymentUrl && !processed.receipt) {
      doc.fontSize(10).fillColor("#0000EE").font(fontFamily);
      doc.text("Pay Now", 40, currentY, { link: processed.paymentUrl, underline: true });
    }
    
    if (processed.qrCodeBuffer && !processed.receipt) {
      doc.image(processed.qrCodeBuffer, 40, currentY + 15, { width: 60 });
      currentY += 80;
    }

    // --- Receipt Watermark / Stamp ---
    if (processed.receipt && processed.receipt.addWatermark) {
      doc.save();
      const stampX = 420;
      const stampY = currentY - 20; // Exactly in the empty space on the bottom right
      
      doc.fillOpacity(0.4);
      doc.strokeOpacity(0.4);
      
      // Rotate for the stamp effect
      doc.rotate(-15, { origin: [stampX + 50, stampY + 15] });
      
      doc.lineWidth(3);
      doc.strokeColor(primaryColor);
      doc.rect(stampX, stampY, 100, 30).stroke();
      
      doc.fillColor(primaryColor).fontSize(22).font(fontBold).text("PAID", stampX, stampY + 5, { width: 100, align: "center" });
      
      doc.restore();
    }

    // --- Terms & Conditions ---
    if (processed.termsAndConditions) {
      currentY += 30;
      checkPageBreak(100);
      doc.fillColor(primaryColor).fontSize(12).font(fontBold).text("Terms & Conditions", 40, currentY);
      doc.fillColor("#333333").fontSize(9).font(fontFamily).text(processed.termsAndConditions, 40, currentY + 15, { width: 532, align: "justify" });
    }
  }
}
