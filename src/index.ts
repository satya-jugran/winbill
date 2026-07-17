import "reflect-metadata";
import { container } from "./config/inversify.config";
import { TYPES } from "./config/types";
import { InvoiceGenerator } from "./core/InvoiceGenerator";
import { InvoiceData, InvoiceItem, GeneratorOptions } from "./models/types";
import { ILayoutStrategy } from "./interfaces/ILayoutStrategy";

// Export types and interfaces for consumers
export {
  InvoiceData,
  InvoiceItem,
  GeneratorOptions,
  ILayoutStrategy,
  TYPES
};

// Export the IoC container so advanced users can override bindings
export { container, InvoiceGenerator };

/**
 * The main facade for the Winbill package.
 * Consumers instantiate this class to generate PDFs.
 */
export class Winbill {
  private generator: InvoiceGenerator;

  constructor() {
    // Resolve the internal InvoiceGenerator from the DI container
    this.generator = container.get<InvoiceGenerator>(TYPES.InvoiceGenerator);
  }

  public async generateInvoice(data: InvoiceData, options: GeneratorOptions): Promise<void> {
    return this.generator.generate(data, options);
  }

  /**
   * Helper method to generate a random alphanumeric invoice number.
   * @param prefix Optional string to prepend to the generated number (e.g. "INV-")
   * @returns A generated random invoice number.
   */
  public generateInvoiceNumber(prefix?: string): string {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestampPart = Date.now().toString().slice(-4);
    const generatedNumber = `${timestampPart}-${randomPart}`;
    
    return prefix ? `${prefix}${generatedNumber}` : generatedNumber;
  }
}
