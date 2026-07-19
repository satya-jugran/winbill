import { Winbill, BillingData, GeneratorOptions } from "../dist/index";
import * as path from "path";
import * as fs from "fs";

async function run() {
  const winbill = new Winbill();

  // Create an output directory for demo files
  const outDir = path.join(process.cwd(), ".demo-out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const invoiceNumber = winbill.generateBillNumber("INV-");

  const data: BillingData = {
    companyName: "Acme Corp (Advanced)",
    companyAddress: ["123 Business Rd.", "Tech City, CA 90210"],
    clientName: "Globex Corporation",
    clientAddress: "456 Enterprise Way\nSpringfield, IL 62704",
    invoiceNumber: invoiceNumber,
    purchaseOrderNumber: "PO-987654321",
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    currency: "USD",
    locale: "en-US",
    logoPath: path.join(process.cwd(), "test", "demo-logo.png"),
    
    // Global Taxes & Discounts
    taxes: [{ name: "State VAT", rate: 0.10 }], // 10%
    discounts: [
      { sequenceNumber: 1, isPercent: false, value: 50, description: "Loyalty Bonus" }
    ],
    
    notes: "Thank you for your business. Please make payment within 30 days.",
    termsAndConditions: "1. All sales are final.\n2. Payment is due within 30 days.\n3. Late payments will incur a 1.5% monthly fee.",
    
    paymentUrl: "https://stripe.com/pay/test1234",
    qrCodeUrl: "https://stripe.com/pay/test1234",
    
    // Grouped Categories
    categories: [
      {
        name: "Services",
        items: [
          { description: "Web Development", quantity: 40, unitPrice: 150.0 },
          { description: "Server Setup", quantity: 1, unitPrice: 500.0, discount: { isPercent: true, value: 10, description: "10% off" } }
        ],
        taxes: [{ name: "Service Tax", rate: 0.05 }],
      },
      {
        name: "Software Licenses",
        items: [
          { description: "Acme DB License (Yearly)", quantity: 2, unitPrice: 1200.0, isTaxExempt: true }
        ]
      }
    ]
  };

  console.log("Generating Default Layout Invoice...");
  const defaultOptions: GeneratorOptions = {
    filePath: path.join(outDir, "invoice_default.pdf"),
    theme: { 
      primaryColor: "#005b96"
    },
    layout: 'DEFAULT'
  };
  await winbill.generateBill(data, defaultOptions);

  console.log("Generating Default Layout Receipt...");
  const { paymentUrl, qrCodeUrl, ...baseReceiptData } = data;
  const receiptData: BillingData = { 
    ...baseReceiptData, 
    notes: "Thank you for your business.",
    receipt: { paymentDate: new Date(), paymentMethod: "Credit Card", addWatermark: true } 
  };
  const defaultReceiptOptions: GeneratorOptions = {
    ...defaultOptions,
    filePath: path.join(outDir, "receipt_default.pdf")
  };
  await winbill.generateBill(receiptData, defaultReceiptOptions);

  console.log("Generating Minimal Layout Receipt...");
  const minimalOptions: GeneratorOptions = {
    filePath: path.join(outDir, "receipt_minimal.pdf"),
    layout: 'MINIMAL'
  };
  await winbill.generateBill(receiptData, minimalOptions);

  console.log("Generating Thermal Layout Receipt...");
  const thermalOptions: GeneratorOptions = {
    filePath: path.join(outDir, "receipt_thermal.pdf"),
    layout: 'THERMAL'
  };
  await winbill.generateBill(receiptData, thermalOptions);

  console.log("Generating Modern Layout Invoice...");
  const modernOptions: GeneratorOptions = {
    filePath: path.join(outDir, "invoice_modern.pdf"),
    layout: 'MODERN',
    theme: { primaryColor: "#1f5b8b" }
  };
  await winbill.generateBill(data, modernOptions);

  console.log("Generating Modern Layout Receipt...");
  const modernReceiptOptions: GeneratorOptions = {
    filePath: path.join(outDir, "receipt_modern.pdf"),
    layout: 'MODERN',
    theme: { primaryColor: "#1f5b8b" }
  };
  await winbill.generateBill(receiptData, modernReceiptOptions);

  console.log("Generating Buffer Output (No Disk Write)...");
  const bufferOptions: GeneratorOptions = { layout: 'DEFAULT' };
  const buffer = await winbill.generateBuffer(data, bufferOptions);
  console.log(`Buffer created successfully! Size: ${buffer.length} bytes.`);
  
  console.log(`Demo completed! Files saved in ${outDir}`);
}

run().catch(console.error);
