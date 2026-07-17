import { InvoiceData } from "../models/types";

// Note: Using `any` for PDFKit document here to avoid importing the whole pdfkit type in the interface if possible,
// but we will import it properly for type safety.
import PDFDocument from "pdfkit";

export interface ILayoutStrategy {
  draw(doc: typeof PDFDocument, data: InvoiceData): void;
}
