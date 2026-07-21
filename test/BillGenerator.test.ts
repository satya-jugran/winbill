import "reflect-metadata";
import { BillGenerator } from "../src/core/BillGenerator";
import { BillProcessor } from "../src/core/BillProcessor";
import { Renderer } from "../src/core/Renderer";
import { BillingData } from "../src/models/types";
import { ILayoutStrategy } from "../src/interfaces/ILayoutStrategy";
import { IRenderTransformer } from "../src/interfaces/IRenderTransformer";
import { LayoutFactory } from "../src/factories/LayoutFactory";

// Mock PDFKit and fs
jest.mock("pdfkit");
jest.mock("fs", () => ({
  createWriteStream: jest.fn(() => ({
    on: jest.fn((event, callback) => {
      if (event === "finish") callback();
    }),
  })),
}));

class MockLayoutStrategy implements ILayoutStrategy<any> {
  draw(doc: PDFKit.PDFDocument, data: any): void {}
}

class MockTransformer implements IRenderTransformer<any> {
  transform(data: any): any { return {}; }
}

describe("BillGenerator & BillProcessor", () => {
  let generator: BillGenerator;
  let processor: BillProcessor;

  beforeEach(() => {
    const mockLayoutFactory = {
      getLayout: jest.fn().mockReturnValue([new MockTransformer(), new MockLayoutStrategy()])
    } as unknown as LayoutFactory;

    processor = new BillProcessor();
    generator = new BillGenerator(
      processor,
      new Renderer(),
      mockLayoutFactory
    );
  });

  const getValidData = (): BillingData => ({
    companyName: "Test Company",
    clientName: "Test Client",
    invoiceNumber: "123",
    date: new Date(),
    currency: "USD",
    locale: "en-US",
    taxes: [{ name: "VAT", rate: 0.15 }],
    logoPath: "test/demo-logo.png",
    items: [{ description: "Item 1", quantity: 2, unitPrice: 50 }],
  });

  describe("Zod Validation", () => {
    it("should throw if percentage discount is > 100", async () => {
      const data = getValidData();
      data.discounts = [{ isPercent: true, value: 105, description: "Test" }];
      await expect(generator.generate(data, { filePath: "test.pdf" })).rejects.toThrow('Percentage discount cannot exceed 100');
    });

    it("should throw if percentage discount is < 0", async () => {
      const data = getValidData();
      data.discounts = [{ isPercent: true, value: -5, description: "Test" }];
      await expect(generator.generate(data, { filePath: "test.pdf" })).rejects.toThrow();
    });

    it("should throw if tax rate is < 0 or > 1", async () => {
      const data = getValidData();
      data.taxes = [{ name: "Invalid Tax", rate: 1.5 }];
      await expect(generator.generate(data, { filePath: "test.pdf" })).rejects.toThrow();
      
      data.taxes = [{ name: "Invalid Tax", rate: -0.1 }];
      await expect(generator.generate(data, { filePath: "test.pdf" })).rejects.toThrow();
    });

    it("should throw if unit price is negative", async () => {
      const data = getValidData();
      data.items = [{ description: "Item 1", quantity: 2, unitPrice: -50 }];
      await expect(generator.generate(data, { filePath: "test.pdf" })).rejects.toThrow();
    });

    it("should throw if both items and categories are provided", async () => {
      const data = getValidData() as any;
      data.categories = [{ name: "Cat 1", items: [{ description: "Item 2", quantity: 1, unitPrice: 10 }] }];
      await expect(generator.generate(data, { filePath: "test.pdf" })).rejects.toThrow("You cannot provide both 'items' and 'categories'");
    });

    it("should throw if neither items nor categories are provided", async () => {
      const data = getValidData() as any;
      delete data.items;
      await expect(generator.generate(data, { filePath: "test.pdf" })).rejects.toThrow("You must provide either a flat 'items' array or grouped 'categories'");
    });

    it("should throw if paymentUrl is provided for a receipt", async () => {
      const data = getValidData();
      data.receipt = {};
      data.paymentDetails = { paymentUrl: "http://example.com" };
      await expect(generator.generate(data, { filePath: "test.pdf" })).rejects.toThrow("paymentUrl cannot be provided when generating a receipt.");
    });
  });

  describe("BillProcessor Math Validation", () => {
    it("should process item-level discounts and taxes correctly", () => {
      const data = getValidData();
      data.items = [
        {
          description: "Item 1",
          quantity: 2,
          unitPrice: 50, // total 100
          discount: { isPercent: true, value: 10, description: "10% off" }, // -10 -> 90
          taxRate: 0.1, // +9 -> 99
          isTaxExempt: false
        }
      ];
      data.taxes = []; // remove global tax

      const processed = processor.process(data);
      expect(processed.categories[0].items[0].calculatedTotal).toBe(99);
      expect(processed.calculatedSubTotal).toBe(99);
      expect(processed.calculatedTotalCost).toBe(99);
      expect(processed.calculatedTaxAmount).toBe(9);
    });

    it("should process category-level discounts and taxes correctly", () => {
      const data = getValidData();
      data.items = undefined as any;
      data.categories = [
        {
          name: "Category 1",
          items: [{ description: "Item 1", quantity: 2, unitPrice: 50 }], // total 100
          discounts: [{ isPercent: false, value: 20, description: "$20 off" }], // -20 -> 80
          taxes: [{ name: "Cat Tax", rate: 0.05 }] // +4 -> 84
        }
      ];
      data.taxes = []; // remove global tax

      const processed = processor.process(data);
      expect(processed.categories[0].calculatedTotal).toBe(84);
      expect(processed.calculatedSubTotal).toBe(100);
      expect(processed.calculatedTotalCost).toBe(84);
      expect(processed.calculatedTaxAmount).toBe(4);
    });

    it("should process global-level taxes correctly", () => {
      const data = getValidData();
      data.items = [{ description: "Item 1", quantity: 1, unitPrice: 100 }];
      data.taxes = [
        { name: "State Tax", rate: 0.1 }, // 100 * 0.1 = 10 -> 110
        { name: "City Tax", rate: 0.05 } // 110 * 0.05 = 5.5 -> 115.5
      ];
      
      const processed = processor.process(data);
      expect(processed.calculatedSubTotal).toBe(100);
      expect(processed.calculatedTotalCost).toBe(115.5);
      expect(processed.calculatedTaxAmount).toBe(15.5); // globalTotalTaxAmount
    });

    it("should process sequential discounts correctly and throw if it goes below 0", () => {
      const data = getValidData(); // items total 100
      data.discounts = [
        { sequenceNumber: 1, isPercent: true, value: 50, description: "50% Off" }, // Reduces to 50
        { sequenceNumber: 2, isPercent: false, value: 60, description: "$60 Off" }, // Reduces to -10 (should throw)
      ];
      
      expect(() => processor.process(data)).toThrow('Discount "$60 Off" reduces the subtotal below zero');
    });
    
    it("should process sequential discounts correctly and pass if >= 0", () => {
      const data = getValidData(); // items total 100
      data.discounts = [
        { sequenceNumber: 1, isPercent: true, value: 50, description: "50% Off" }, // Reduces to 50
        { sequenceNumber: 2, isPercent: false, value: 50, description: "$50 Off" }, // Reduces to 0 (should pass)
      ];
      // Note: Data has a global tax of 0.15
      
      const processed = processor.process(data);
      expect(processed.calculatedSubTotal).toBe(100);
      expect(processed.calculatedTotalCost).toBe(0); // 0 + (0 * 0.15)
    });
  });
});
