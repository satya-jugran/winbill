"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultGrayscaleLayout = void 0;
const inversify_1 = require("inversify");
const fs = __importStar(require("fs"));
let DefaultGrayscaleLayout = class DefaultGrayscaleLayout {
    draw(doc, data) {
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
            this.generateTableRow(doc, itemY, item.description, item.quantity.toString(), `${data.currencyType}${item.unitPrice.toFixed(2)}`, `${data.currencyType}${lineTotal.toFixed(2)}`, colDesc, colQty, colUnit, colTotal);
            this.generateHr(doc, itemY + 20);
            itemY += 30;
        });
        // --- Summary Section ---
        const subTotal = data.subTotal ?? subTotalCalculated;
        const taxAmount = data.taxAmount ?? (subTotal * data.taxRate);
        const totalCost = data.totalCost ?? (subTotal + taxAmount);
        const summaryY = itemY + 10;
        doc.font("Helvetica-Bold");
        doc.text("Subtotal:", 350, summaryY, { align: "left" });
        doc.text(`${data.currencyType}${subTotal.toFixed(2)}`, 450, summaryY, { width: 100, align: "right" });
        doc.text(`Tax (${(data.taxRate * 100).toFixed(0)}%):`, 350, summaryY + 20, { align: "left" });
        doc.text(`${data.currencyType}${taxAmount.toFixed(2)}`, 450, summaryY + 20, { width: 100, align: "right" });
        this.generateHr(doc, summaryY + 40);
        doc.fontSize(14).fillColor("#000000");
        doc.text("Total:", 350, summaryY + 60, { align: "left" });
        doc.text(`${data.currencyType}${totalCost.toFixed(2)}`, 450, summaryY + 60, { width: 100, align: "right" });
        // --- Payment Acknowledgement (Receipt Mode) ---
        if (data.paid) {
            const pDate = data.paymentDate ? data.paymentDate.toLocaleDateString() : new Date().toLocaleDateString();
            const pMethod = data.paymentMethod ? ` via ${data.paymentMethod}` : "";
            const receiptStartY = summaryY + 100;
            doc.fontSize(10).fillColor("#4CAF50").font("Helvetica-Bold"); // Green color for payment success
            doc.text("PAID IN FULL", 50, receiptStartY);
            doc.fillColor("#666666").font("Helvetica");
            doc.text(`Payment of ${data.currencyType}${totalCost.toFixed(2)} received on ${pDate}${pMethod}.`, 50, receiptStartY + 15);
            doc.text("Thank you for your business!", 50, receiptStartY + 30);
        }
    }
    generateTableRow(doc, y, item, qty, unit, total, colDesc, colQty, colUnit, colTotal) {
        doc.fontSize(10).fillColor("#333333")
            .text(item, colDesc, y, { width: 200 })
            .text(qty, colQty, y, { width: 50, align: "right" })
            .text(unit, colUnit, y, { width: 70, align: "right" })
            .text(total, colTotal, y, { width: 80, align: "right" });
    }
    generateHr(doc, y) {
        doc.strokeColor("#cccccc")
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(550, y)
            .stroke();
    }
};
exports.DefaultGrayscaleLayout = DefaultGrayscaleLayout;
exports.DefaultGrayscaleLayout = DefaultGrayscaleLayout = __decorate([
    (0, inversify_1.injectable)()
], DefaultGrayscaleLayout);
