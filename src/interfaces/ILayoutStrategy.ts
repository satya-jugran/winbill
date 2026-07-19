import { GeneratorOptions } from "../models/types";
import type PDFDocument from "pdfkit";

export interface ILayoutStrategy<TLayoutData = any> {
  draw(doc: PDFKit.PDFDocument, data: TLayoutData, options?: GeneratorOptions): void;
}
