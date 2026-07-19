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
  });

  describe("BillProcessor Discount Math Validation", () => {
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
      
      const processed = processor.process(data);
      expect(processed.calculatedTotalCost).toBe(0); // 0 + (0 * 0.1)
    });
  });
});
