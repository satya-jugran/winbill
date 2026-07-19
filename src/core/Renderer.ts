import { injectable } from "inversify";
import { ProcessedBillData, GeneratorOptions } from "../models/types";
import { IRenderTransformer } from "../interfaces/IRenderTransformer";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import PDFDocument from "pdfkit";

@injectable()
export class Renderer {
  public render<TLayoutData>(
    doc: PDFKit.PDFDocument,
    data: ProcessedBillData,
    transformer: IRenderTransformer<TLayoutData> | undefined,
    layout: ILayoutStrategy<TLayoutData>,
    options?: GeneratorOptions
  ): void {
    const layoutData = transformer ? transformer.transform(data, options) : (data as any as TLayoutData);
    
    // Pass both the ProcessedBillData (for raw original values if needed by layout like notes/addresses)
    // and layoutData (the formatted strings)
    layout.draw(doc, { processed: data, layout: layoutData } as unknown as TLayoutData, options);
  }
}
