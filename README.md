# winbill

Effortlessly generate professional, beautiful PDF invoices and receipts for your Node.js applications.

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

## Quick Start Example

Generating an invoice or a receipt is incredibly easy. Just instantiate the `Winbill` class, pass in your data, and specify where you want the PDF to be saved!

```typescript
import { Winbill, InvoiceData } from "winbill";

async function run() {
  const winbill = new Winbill();

  // 1. Generate a random invoice number (e.g., INV-8911-WWA93V)
  const invoiceNumber = winbill.generateInvoiceNumber("INV-");

  // 2. Define your invoice data
  const data: InvoiceData = {
    companyName: "Acme Corporation",
    clientName: "John Doe LLC",
    invoiceNumber: invoiceNumber,
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Due in 30 days
    currencyType: "$",
    taxRate: 0.15, // 15% Tax
    items: [
      { description: "Web Development Services", quantity: 1, unitPrice: 5000 },
      { description: "Server Hosting (1 Year)", quantity: 1, unitPrice: 1200 }
    ]
  };

  try {
    // 3. Generate the Invoice PDF
    await winbill.generateInvoice(data, { filePath: "./my-invoice.pdf" });
    console.log("Invoice generated successfully!");

    // 4. Need a Receipt instead? Just toggle the `paid` field!
    const receiptData: InvoiceData = {
      ...data,
      paid: true,
      paymentMethod: "Credit Card",
      paymentDate: new Date(),
      addWatermark: true
    };
    
    await winbill.generateInvoice(receiptData, { filePath: "./my-receipt.pdf" });
    console.log("Receipt generated successfully!");

  } catch (error) {
    console.error("Failed to generate PDF:", error);
  }
}

run();
```

## API Reference

### `Winbill` Class Methods

- **`generateInvoice(data: InvoiceData, options: GeneratorOptions): Promise<void>`**
  Generates and saves the PDF file.
- **`generateInvoiceNumber(prefix?: string): string`**
  Helper method to generate a randomized, alphanumeric invoice number.

### `InvoiceData` Interface

This is the core payload you pass to the generator to define the contents of the document.

```typescript
interface InvoiceData {
  companyName: string;         // Your company's name
  clientName: string;          // The client's name
  invoiceNumber: string;       // Unique identifier
  date: Date;                  // Issue date
  currencyType: string;        // Currency symbol (e.g., "$", "€")
  items: InvoiceItem[];        // Array of line items (Description, Qty, Price)
  taxRate: number;             // Tax rate (e.g., 0.15 for 15%)
  discounts?: InvoiceDiscount[]; // Optional array of stacked discounts
  
  logoPath?: string;           // Optional: Absolute path to a logo image file
  dueDate?: Date;              // Optional: When the invoice is due (hidden if paid)
  
  // --- Overrides (Auto-calculated if omitted) ---
  subTotal?: number; 
  taxAmount?: number; 
  totalCost?: number; 
  
  // --- Receipt Features (Triggers Receipt mode when `paid` is true) ---
  paid?: boolean;              // Changes title to "RECEIPT" and adds acknowledgement
  paymentDate?: Date;          // Date the payment was received
  paymentMethod?: string;      // Method (e.g., "Credit Card", "Wire Transfer")
  addWatermark?: boolean;      // If true, stamps a large "PAID" watermark diagonally
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceDiscount {
  sequenceNumber?: number;     // Optional: Dictates calculation order (lowest first)
  isPercent: boolean;          // If true, value is a % (0-100). If false, flat amount
  value: number;               // The discount amount
  description: string;         // E.g., "Loyalty Bonus", "Holiday Sale"
}
```

## How It Works

By default, the engine uses a clean Grayscale layout strategy.
- If `paid` is omitted or `false`, the document acts as an **Invoice** (request for payment).
- If `paid: true` is passed, the layout engine seamlessly transforms the document into a **Receipt** (proof of payment), altering the main title, hiding the due date, appending a "PAID IN FULL" acknowledgement at the bottom, and optionally stamping a watermark across the page.
