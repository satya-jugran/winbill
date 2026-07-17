import { injectable, inject } from "inversify";
import { TYPES } from "../config/types";
import { ILayoutStrategy } from "../interfaces/ILayoutStrategy";
import { InvoiceData, GeneratorOptions } from "../models/types";
import PDFDocument from "pdfkit";
import * as fs from "fs";

@injectable()
export class InvoiceGenerator {
  
  constructor(
    @inject(TYPES.LayoutStrategy) private layoutStrategy: ILayoutStrategy
  ) {}

  public async generate(data: InvoiceData, options: GeneratorOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        
        const writeStream = fs.createWriteStream(options.filePath);
        doc.pipe(writeStream);
        
        // Delegate drawing logic to the layout strategy
        const strategyToUse = (options.layout && options.layout !== 'default') 
          ? options.layout 
          : this.layoutStrategy;

        strategyToUse.draw(doc, data);
        
        doc.end();
        
        writeStream.on("finish", () => {
          resolve();
        });
        
        writeStream.on("error", (error) => {
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }
}
