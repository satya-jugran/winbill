import { Winbill, InvoiceData } from "../src/index";
import * as path from "path";

async function run() {
  const winbill = new Winbill();
  const generatedInvoiceNumber = winbill.generateInvoiceNumber("INV-");

  const data: InvoiceData = {
    companyName: "Acme Corporation",
    clientName: "John Doe LLC",
    invoiceNumber: generatedInvoiceNumber,
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    currencyType: "$",
    taxRate: 0.15,
    items: [
      {
        description: "Web Development Services",
        quantity: 1,
        unitPrice: 5000.00
      },
      {
        description: "Server Hosting (Annual)",
        quantity: 1,
        unitPrice: 1200.00
      },
      {
        description: "Maintenance Retainer",
        quantity: 3,
        unitPrice: 200.00
      }
    ]
  };

  const invoicePath = path.join(process.cwd(), "test", "demo-invoice.pdf");
  const receiptPath = path.join(process.cwd(), "test", "demo-receipt.pdf");

  console.log(`Generating invoice with number: ${generatedInvoiceNumber}`);
  try {
    // 1. Generate Standard Invoice
    await winbill.generateInvoice(data, { filePath: invoicePath });
    console.log(`Invoice successfully generated at: ${invoicePath}`);

    // 2. Generate Receipt (Paid Invoice)
    const paidData: InvoiceData = {
      ...data,
      paid: true,
      paymentDate: new Date(),
      paymentMethod: "Credit Card (Ending in 4242)",
      addWatermark: true
    };
    
    await winbill.generateInvoice(paidData, { filePath: receiptPath });
    console.log(`Receipt successfully generated at: ${receiptPath}`);
    
  } catch (err) {
    console.error("Failed to generate documents:", err);
  }
}

run();
