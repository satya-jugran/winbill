import "reflect-metadata";
import { container } from "./config/inversify.config";
import { TYPES } from "./config/types";
import { BillGenerator } from "./core/BillGenerator";
import { BillingData, BillingItem, BillingCategory, BillingDiscount, Tax, GeneratorOptions, LayoutType } from "./models/types";
import { ILayoutStrategy } from "./interfaces/ILayoutStrategy";
import { Readable } from "stream";

// Export types and interfaces for consumers
export {
  BillingData,
  BillingItem,
  BillingCategory,
  BillingDiscount,
  Tax,
  GeneratorOptions,
  LayoutType,
  ILayoutStrategy,
  TYPES
};

// Export the IoC container so advanced users can override bindings
export { container, BillGenerator };

/**
 * The main facade for the Winbill package.
 * Consumers instantiate this class to generate PDFs.
 */
export class Winbill {
  private generator: BillGenerator;

  constructor() {
    this.generator = container.get<BillGenerator>(TYPES.BillGenerator);
  }

  /**
   * Generates a billing document and writes it to the filesystem.
   * @param data The BillingData payload
   * @param options Configuration options for generation (filePath is required here)
   */
  public async generateBill(data: BillingData, options: GeneratorOptions): Promise<void> {
    return this.generator.generate(data, options);
  }

  /**
   * Generates a billing document and returns it as a Node.js Buffer in memory.
   * Useful for serverless functions or immediate HTTP responses.
   * @param data The BillingData payload
   * @param options Configuration options for generation
   */
  public async generateBuffer(data: BillingData, options: GeneratorOptions): Promise<Buffer> {
    return this.generator.generateBuffer(data, options);
  }

  /**
   * Generates a billing document and returns a Readable Stream.
   * The most memory-efficient way to stream PDFs directly to an HTTP response.
   * @param data The BillingData payload
   * @param options Configuration options for generation
   */
  public async generateStream(data: BillingData, options: GeneratorOptions): Promise<Readable> {
    return this.generator.generateStream(data, options);
  }

  /**
   * Helper method to generate a randomized, alphanumeric bill number
   * @param prefix Optional prefix (defaults to "BILL-")
   */
  public generateBillNumber(prefix?: string): string {
    return this.generator.generateBillNumber(prefix);
  }
}
