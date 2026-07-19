import { Winbill, BillingData, GeneratorOptions } from "../src/index";
import * as path from "path";

async function runDemo() {
  const winbill = new Winbill();

  const billingData: BillingData = {
    companyName: "Acme Corp",
    companyAddress: ["123 Business Rd.", "Tech City, CA 90210"],
    clientName: "Globex Corporation",
    clientAddress: ["456 Enterprise Way", "Springfield, IL 62704"],
    invoiceNumber: winbill.generateBillNumber("INV-"),
    purchaseOrderNumber: "PO-987654321",
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    currency: "USD",
    locale: "en-US",
    taxRate: 0.15,
    logoPath: path.join(process.cwd(), "test", "demo-logo.png"),
    notes: "Thank you for your business. Please make payment within 30 days.",
    discounts: [
      { sequenceNumber: 1, isPercent: false, value: 500, description: "Loyalty Bonus Discount" },
      { sequenceNumber: 2, isPercent: true, value: 10, description: "Early Payment Discount" }
    ],
    items: [
      {
        description: "Web Development Services",
        quantity: 40,
        unitPrice: 150.0,
      },
      {
        description: "Server Hosting (1 Year)",
        quantity: 1,
        unitPrice: 1200.0,
      },
      {
        description: "SSL Certificate",
        quantity: 1,
        unitPrice: 200.0,
      },
    ],
  };

  const options: GeneratorOptions = {
    filePath: path.join(process.cwd(), "test", "demo-invoice.pdf"),
    theme: {
      primaryColor: "#005b96",
      fontFamily: "Roboto"
    }
  };

  try {
    console.log(`Generating bill with number: ${billingData.invoiceNumber}`);
    
    // 1. Generate an Invoice
    await winbill.generateBill(billingData, options);
    console.log(`Invoice successfully generated at: ${options.filePath}`);

    // 2. Generate a Receipt (same data, just add receipt settings)
    const receiptData = { 
      ...billingData, 
      notes: "Thank you for your business.",
      receipt: {
        paymentDate: new Date(),
        paymentMethod: "Credit Card ending in 4242",
        addWatermark: true
      } 
    };
    
    const receiptOptions = { 
      ...options, 
      filePath: path.join(process.cwd(), "test", "demo-receipt.pdf")
    };
    
    await winbill.generateBill(receiptData, receiptOptions);
    console.log(`Receipt successfully generated at: ${receiptOptions.filePath}`);

  } catch (error) {
    console.error("Error generating documents:", error);
  }
}

runDemo();
