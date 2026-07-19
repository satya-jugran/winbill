import "reflect-metadata";
import { container } from "./config/inversify.config";
import { TYPES } from "./config/types";
import { BillGenerator } from "./core/BillGenerator";
import { BillingData, BillingItem, BillingDiscount, GeneratorOptions } from "./models/types";
import { ILayoutStrategy } from "./interfaces/ILayoutStrategy";

// Export types and interfaces for consumers
export {
  BillingData,
  BillingItem,
  BillingDiscount,
  GeneratorOptions,
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
   * Generates a billing document (Invoice/Receipt) based on the provided data and options.
   * @param data The BillingData payload
   * @param options Configuration options for generation
   * @returns A promise that resolves when the PDF is written
   */
  public async generateBill(data: BillingData, options: GeneratorOptions): Promise<void> {
    return this.generator.generate(data, options);
  }

  /**
   * Helper method to generate a randomized, alphanumeric bill number
   * @param prefix Optional prefix (defaults to "BILL-")
   */
  public generateBillNumber(prefix?: string): string {
    return this.generator.generateBillNumber(prefix);
  }
}
