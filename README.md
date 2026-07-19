# winbill

Effortlessly generate professional, beautiful PDF invoices and receipts for your Node.js applications.

`winbill` allows you to dynamically generate beautiful, customizable PDFs with zero design headaches. Perfect for e-commerce backends, SaaS billing, and freelancer tooling!

## Previews

<table>
  <tr>
    <td align="center"><b>Invoice Mode</b></td>
    <td align="center"><b>Receipt Mode (Paid)</b></td>
  </tr>
  <tr>
    <td><img src="https://unpkg.com/winbill@latest/assets/invoice.png" alt="Invoice Preview" width="100%" /></td>
    <td><img src="https://unpkg.com/winbill@latest/assets/receipt.png" alt="Receipt Preview" width="100%" /></td>
  </tr>
</table>

## Installation

```bash
npm install winbill
```

## Features
- **Strictly Typed & Validated:** Full TypeScript support with `zod` validation guaranteeing your data is clean before a PDF is ever rendered.
- **Enterprise Architecture:** Perfectly isolates business logic (Math) from presentation logic (Layouts & Transformers).
- **Auto-Calculations:** Automatically calculates subtotals, complex stacked discounts, and taxes.
- **Pagination:** Automatically adds new pages for large item tables.
- **Internationalization:** Native `Intl.NumberFormat` support using ISO currency codes and locales.
- **Theming:** Customize colors and typography.
- **Smart Formatting:** Elegant default layout, with automatic toggling between "INVOICE" and "RECEIPT" modes.

## Quick Start

```typescript
import { Winbill, BillingData, GeneratorOptions } from "winbill";
import * as path from "path";

async function run() {
  const winbill = new Winbill();

  // 1. Generate a random bill number (e.g., BILL-8911-WWA93V)
  const invoiceNumber = winbill.generateBillNumber("INV-");

  const data: BillingData = {
    companyName: "Acme Corp",
    companyAddress: ["123 Business Rd.", "Tech City, CA 90210"],
    clientName: "Globex Corporation",
    clientAddress: "456 Enterprise Way\nSpringfield, IL 62704",
    invoiceNumber: invoiceNumber,
    purchaseOrderNumber: "PO-987654321",
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    currency: "USD",
    locale: "en-US",
    taxRate: 0.15, // 15% Tax
    notes: "Thank you for your business. Please make payment within 30 days.",
    
    // Stacked Discounts processed sequentially
    discounts: [
      { sequenceNumber: 1, isPercent: false, value: 50, description: "Loyalty Bonus" },
      { sequenceNumber: 2, isPercent: true, value: 10, description: "Early Payment" }
    ],
    
    items: [
      { description: "Web Development", quantity: 40, unitPrice: 150.0 },
      { description: "Server Hosting", quantity: 1, unitPrice: 1200.0 },
    ],
  };

  const options: GeneratorOptions = {
    filePath: path.join(__dirname, "invoice.pdf"),
    theme: { primaryColor: "#005b96" }
  };

  // Generate the Invoice
  await winbill.generateBill(data, options);

  // Turn it into a Receipt!
  data.notes = "Thank you for your business.";
  data.receipt = {
    paymentDate: new Date(),
    paymentMethod: "Credit Card",
    addWatermark: true
  };
  
  options.filePath = path.join(__dirname, "receipt.pdf");

  await winbill.generateBill(data, options);
}

run();
```

## API Reference

### `Winbill` Class Methods

- **`generateBill(data: BillingData, options: GeneratorOptions): Promise<void>`**
  Validates data using Zod, processes math calculations, and generates the PDF file.
- **`generateBillNumber(prefix?: string): string`**
  Helper method to generate a randomized, alphanumeric bill number.

### Interfaces

#### `BillingData`
```typescript
interface BillingData {
  companyName: string;         // E.g., "Acme Corp"
  companyAddress?: string | string[]; // Multiline support
  clientName: string;          // E.g., "John Doe"
  clientAddress?: string | string[];  // Multiline support
  
  invoiceNumber: string;       // E.g., "INV-001"
  purchaseOrderNumber?: string;
  date: Date;                  // Invoice issue date
  dueDate?: Date;              // Optional: When the invoice is due
  
  currency: string;            // Standard 3-letter ISO code (e.g., "USD", "EUR")
  locale?: string;             // Optional: Formatting locale (e.g., "en-US", "de-DE")
  
  items: BillingItem[];        // Array of line items
  taxRate: number;             // Tax rate (e.g., 0.15 for 15%)
  discounts?: BillingDiscount[]; // Optional array of stacked discounts
  
  logoPath?: string;           // Optional: Absolute path to a logo image file
  notes?: string;              // Optional: Footer notes
  
  // Overrides (if omitted, they are calculated automatically)
  subTotal?: number;
  taxAmount?: number;
  totalCost?: number;
  
  // If present, converts the document into a Receipt
  receipt?: ReceiptSettings;   
}
```

#### `ReceiptSettings`
```typescript
interface ReceiptSettings {
  paymentDate?: Date;          // Date the payment was received
  paymentMethod?: string;      // Method (e.g., "Credit Card", "Wire Transfer")
  addWatermark?: boolean;      // If true, stamps a large "PAID" watermark diagonally
}
```

#### `BillingItem`
```typescript
interface BillingItem {
  description: string;
  quantity: number;
  unitPrice: number;
}
```

#### `BillingDiscount`
```typescript
interface BillingDiscount {
  sequenceNumber?: number;     // Optional: Dictates calculation order (lowest first)
  isPercent: boolean;          // If true, value is a % (0-100). If false, flat amount
  value: number;               // The discount amount
  description: string;         // E.g., "Loyalty Bonus", "Holiday Sale"
}
```

#### `GeneratorOptions`
```typescript
interface GeneratorOptions {
  filePath: string;            // Absolute path to save the PDF to
  theme?: {
    primaryColor?: string;     // Color for headers and titles
    fontFamily?: string;       // Custom font family name
  };
}
```

## How It Works

By default, the engine uses a clean Grayscale layout strategy.
- If the `receipt` object is omitted, the document acts as an **Invoice** (request for payment).
- If the `receipt` object is passed, the layout engine seamlessly transforms the document into a **Receipt** (proof of payment), altering the main title, hiding the due date, appending a "PAID IN FULL" acknowledgement at the bottom, and optionally stamping a watermark across the page.
