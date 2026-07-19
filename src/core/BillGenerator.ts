import { injectable, inject } from "inversify";
import { TYPES } from "../config/types";
import { LayoutFactory } from "../factories/LayoutFactory";
import { BillingData, BillingDataSchema, GeneratorOptions } from "../models/types";
import { BillProcessor } from "./BillProcessor";
import { Renderer } from "./Renderer";
import PDFDocument from "pdfkit";
import * as fs from "fs";

@injectable()
export class BillGenerator {
  
  constructor(
    @inject(TYPES.BillProcessor) private billProcessor: BillProcessor,
    @inject(TYPES.Renderer) private renderer: Renderer,
    @inject(TYPES.LayoutFactory) private layoutFactory: LayoutFactory
  ) {}

  public async generate(data: BillingData, options: GeneratorOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 1. Validate Data using Zod
        const validatedData = BillingDataSchema.parse(data);

        // 2. Process Business Logic
        const processedData = this.billProcessor.process(validatedData);

        // 3. Setup PDFKit Stream
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(options.filePath);

        stream.on("finish", () => resolve());
        stream.on("error", (err) => reject(err));
        doc.pipe(stream);

        // 4. Render
        const [transformer, layout] = this.layoutFactory.getLayout(options.layout);
        this.renderer.render(
          doc, 
          processedData, 
          transformer, 
          layout, 
          options
        );
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  public generateBillNumber(prefix: string = "BILL-"): string {
    const randomNum = Math.floor(Math.random() * 100000);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${randomNum}-${randomStr}`;
  }
}
