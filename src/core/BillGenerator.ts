import { injectable, inject } from "inversify";
import { TYPES } from "../config/types";
import { LayoutFactory } from "../factories/LayoutFactory";
import { BillingData, BillingDataSchema, GeneratorOptions, ProcessedBillData } from "../models/types";
import { BillProcessor } from "./BillProcessor";
import { Renderer } from "./Renderer";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as QRCode from "qrcode";
import { PassThrough, Readable } from "stream";

@injectable()
export class BillGenerator {
  
  constructor(
    @inject(TYPES.BillProcessor) private billProcessor: BillProcessor,
    @inject(TYPES.Renderer) private renderer: Renderer,
    @inject(TYPES.LayoutFactory) private layoutFactory: LayoutFactory
  ) {}

  public async generate(data: BillingData, options: GeneratorOptions): Promise<void> {
    if (!options.filePath) {
      throw new Error("filePath is required in options when calling generate(). Use generateBuffer() or generateStream() instead.");
    }
    
    return new Promise(async (resolve, reject) => {
      try {
        const { processedData, doc } = await this.prepareDocument(data, options);
        
        const stream = fs.createWriteStream(options.filePath!);
        stream.on("finish", () => resolve());
        stream.on("error", (err) => reject(err));
        doc.on("error", (err) => reject(err));
        
        doc.pipe(stream);
        
        this.renderDocument(doc, processedData, options);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async generateBuffer(data: BillingData, options: GeneratorOptions): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const { processedData, doc } = await this.prepareDocument(data, options);
        
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));
        
        this.renderDocument(doc, processedData, options);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async generateStream(data: BillingData, options: GeneratorOptions): Promise<Readable> {
    const { processedData, doc } = await this.prepareDocument(data, options);
    
    const passThrough = new PassThrough();
    doc.pipe(passThrough);
    
    // We don't await this because we want to return the stream immediately
    // while PDFKit is generating in the background
    process.nextTick(() => {
      try {
        this.renderDocument(doc, processedData, options);
      } catch (error) {
        passThrough.destroy(error instanceof Error ? error : new Error(String(error)));
      }
    });
    
    return passThrough;
  }

  private async prepareDocument(data: BillingData, options: GeneratorOptions): Promise<{ processedData: ProcessedBillData, doc: PDFKit.PDFDocument }> {
    // 1. Validate Data using Zod
    const validatedData = BillingDataSchema.parse(data) as unknown as BillingData;

    // 2. Process Business Logic
    const processedData = this.billProcessor.process(validatedData);

    // 3. Generate QR Code if provided
    if (processedData.qrCodeUrl) {
      try {
        processedData.qrCodeBuffer = await QRCode.toBuffer(processedData.qrCodeUrl, { errorCorrectionLevel: 'H' });
      } catch (err) {
        console.error("Failed to generate QR Code:", err);
      }
    }

    // 4. Setup PDFKit Document
    // Thermal layout needs a different paper size
    const docOptions: PDFKit.PDFDocumentOptions = { margin: 50 };
    if (options.layout === 'THERMAL') {
      docOptions.size = [226, 800]; // 80mm is approx 226 points. Length is arbitrary, could use auto page break
      docOptions.margin = 15;
    }
    
    const doc = new PDFDocument(docOptions);
    return { processedData, doc };
  }

  private renderDocument(doc: PDFKit.PDFDocument, processedData: ProcessedBillData, options: GeneratorOptions): void {
    const [transformer, layout] = this.layoutFactory.getLayout(options.layout);
    this.renderer.render(
      doc, 
      processedData, 
      transformer, 
      layout, 
      options
    );
    
    doc.end();
  }

  public generateBillNumber(prefix: string = "BILL-"): string {
    const randomNum = Math.floor(Math.random() * 100000);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${randomNum}-${randomStr}`;
  }
}
