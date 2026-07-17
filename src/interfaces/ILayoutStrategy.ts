import { InvoiceData } from "../models/types";

// Note: Using type-only import for PDFKit document here for proper typing
import type PDFDocument from "pdfkit";

export interface ILayoutStrategy {
  draw(doc: PDFKit.PDFDocument, data: InvoiceData): void;
}
