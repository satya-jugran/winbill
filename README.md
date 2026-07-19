# winbill

Effortlessly generate professional, beautiful PDF invoices and receipts for your Node.js applications.

`winbill` allows you to dynamically generate beautiful, customizable PDFs with zero design headaches. Perfect for e-commerce backends, SaaS billing, and freelancer tooling!

## Previews

<table>
  <tr>
    <td align="center"><b>Invoice Mode (Default)</b></td>
    <td align="center"><b>Receipt Mode (Default)</b></td>
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
- **Advanced Output:** Generate directly to a disk file or directly to a memory `Buffer` for modern web streaming (Express, NestJS, Next.js).
- **Tax & Discount Engine:** Supports stacked global taxes and discounts, categorized product/service groupings, and line-item exemptions. 
- **Interactive Elements:** Automatically renders clickable payment links and embeds QR codes.
- **Strictly Typed & Validated:** Full TypeScript support with robust `zod` validation. Invalid payloads throw immediately!
- **Internationalization & i18n:** Native `Intl.NumberFormat` support for all ISO currency codes, plus a full `translations` dictionary to localize static PDF labels.
- **Theming & Custom Fonts:** Inject your own custom `.ttf` font paths and define strict brand colors.
- **Multiple Layouts:** Comes out-of-the-box with `DEFAULT`, `MODERN`, `MINIMAL`, and `THERMAL` (80mm POS) templates. 
- **Extensible Architecture:** Need a bespoke design? Implement `ILayoutStrategy` and inject your own completely custom layout!

## Quick Start

```typescript
import { Winbill, BillingData, GeneratorOptions } from "winbill";
import * as path from "path";

async function run() {
  const winbill = new Winbill();

  // Generate a random bill number
  const invoiceNumber = winbill.generateBillNumber("INV-");

  const data: BillingData = {
    companyName: "Acme Corp",
    companyAddress: ["123 Business Rd.", "Tech City, CA 90210"],
    clientName: "Globex Corporation",
    clientAddress: "456 Enterprise Way\nSpringfield, IL 62704",
    invoiceNumber: invoiceNumber,
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
    currency: "USD",
    locale: "en-US",
    
    // Global Taxes
    taxes: [{ name: "State Tax", rate: 0.08 }],
    
    // Item Groupings
    categories: [
      {
        name: "Web Services",
        items: [
          { description: "Development", quantity: 40, unitPrice: 150.0 },
          { description: "Hosting (Tax Exempt)", quantity: 1, unitPrice: 50.0, isTaxExempt: true }
        ],
        // Category-specific taxes
        taxes: [{ name: "Digital Services Tax", rate: 0.05 }]
      }
    ],

    paymentUrl: "https://stripe.com/pay/xyz", // Generates clickable link!
    qrCodeUrl: "https://stripe.com/pay/xyz",  // Automatically renders QR code!
    
    termsAndConditions: "1. All sales are final.\n2. Payment is due within 30 days." // Spawns an appendix page!
  };

  const options: GeneratorOptions = {
    filePath: path.join(__dirname, "invoice.pdf"),
    layout: 'DEFAULT',
    theme: { 
      primaryColor: "#005b96",
      translations: { invoice: "FACTURE" } // i18n example
    }
  };

  // Generate a PDF File
  await winbill.generateBill(data, options);

  // Or generate a memory Buffer to stream directly to web clients!
  // const pdfBuffer = await winbill.generateBuffer(data, options);
}

run();
```

## API Reference

### `Winbill` Class Methods

- **`generateBill(data: BillingData, options: GeneratorOptions): Promise<void>`**
  Generates and saves the PDF file to disk (requires `options.filePath`).
- **`generateBuffer(data: BillingData, options: GeneratorOptions): Promise<Buffer>`**
  Generates the PDF in memory and returns a Buffer (perfect for web servers).
- **`generateBillNumber(prefix?: string): string`**
  Helper method to generate a randomized, alphanumeric bill number.

### Interfaces

#### `BillingData`
```typescript
interface BillingData {
  companyName: string;
  companyAddress?: string | string[]; 
  clientName: string;
  clientAddress?: string | string[];
  
  invoiceNumber: string;
  purchaseOrderNumber?: string;
  date: Date;
  dueDate?: Date;
  
  currency: string;
  locale?: string;
  
  // Categorized Items
  categories?: BillingCategory[];
  // Legacy / Flat Items
  items?: BillingItem[];
  
  // Global Modifiers
  taxes?: BillingTax[];
  discounts?: BillingDiscount[];
  
  logoPath?: string;
  notes?: string;
  termsAndConditions?: string;
  
  // Interactive Elements (Not allowed on Receipts)
  paymentUrl?: string; 
  qrCodeUrl?: string;  
  
  // Convert document into a Receipt
  receipt?: ReceiptSettings;   
}
```

#### `GeneratorOptions`
```typescript
interface GeneratorOptions {
  filePath?: string; // Required for generateBill()
  layout?: 'DEFAULT' | 'MODERN' | 'MINIMAL' | 'THERMAL';
  theme?: {
    primaryColor?: string;
    customFontPath?: { regular: string, bold: string }; // Use absolute paths to .ttf
    translations?: {
      invoice?: string;
      receipt?: string;
      invoiceNumber?: string;
      poNumber?: string;
      date?: string;
      dueDate?: string;
      from?: string;
      billTo?: string;
      description?: string;
      qty?: string;
      unitPrice?: string;
      total?: string;
      subtotal?: string;
    };
  };
}
```

## License
Licensed under **GPL-3.0**.
