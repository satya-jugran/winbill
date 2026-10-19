import * as path from "path";
import * as fs from "fs";
import { runCli } from "../src/cli";

describe("Winbill CLI", () => {
  const fixturesDir = path.join(__dirname, "fixtures");
  const outputDir = path.join(__dirname, "..", ".demo-out", "cli-tests");

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup generated test files
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("validates valid input JSON without generating a PDF (--validate-only)", async () => {
    const inputPath = path.join(fixturesDir, "sample-invoice.json");
    const code = await runCli([
      "node",
      "winbill",
      "-i",
      inputPath,
      "--validate-only",
      "-q",
    ]);

    expect(code).toBe(0);
  });

  it("fails validation on invalid input JSON", async () => {
    const tempInvalid = path.join(outputDir, "invalid.json");
    fs.writeFileSync(tempInvalid, JSON.stringify({ companyName: "" })); // missing clientName, items, etc.

    const code = await runCli([
      "node",
      "winbill",
      "-i",
      tempInvalid,
      "--validate-only",
      "-q",
    ]);

    expect(code).toBe(1);
  });

  it("generates an invoice PDF from JSON input", async () => {
    const inputPath = path.join(fixturesDir, "sample-invoice.json");
    const outputPath = path.join(outputDir, "test-invoice.pdf");

    const code = await runCli([
      "node",
      "winbill",
      "-i",
      inputPath,
      "-o",
      outputPath,
      "-q",
    ]);

    expect(code).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(1000);
  });

  it("generates a receipt PDF from JSON input", async () => {
    const inputPath = path.join(fixturesDir, "sample-receipt.json");
    const outputPath = path.join(outputDir, "test-receipt.pdf");

    const code = await runCli([
      "node",
      "winbill",
      "-i",
      inputPath,
      "-o",
      outputPath,
      "--receipt",
      "-q",
    ]);

    expect(code).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(1000);
  });

  it("applies layout and branding overrides from CLI flags and config", async () => {
    const inputPath = path.join(fixturesDir, "sample-invoice.json");
    const configPath = path.join(fixturesDir, "sample-branding.json");
    const outputPath = path.join(outputDir, "test-custom-modern.pdf");

    const code = await runCli([
      "node",
      "winbill",
      "-i",
      inputPath,
      "-o",
      outputPath,
      "--config",
      configPath,
      "--layout",
      "MODERN",
      "--color",
      "#2563EB",
      "--watermark",
      "DRAFT",
      "-q",
    ]);

    expect(code).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(1000);
  });

  it("supports combined envelope JSON format ({ data, options })", async () => {
    const envelopePath = path.join(outputDir, "envelope.json");
    const invoiceData = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, "sample-invoice.json"), "utf-8")
    );
    fs.writeFileSync(
      envelopePath,
      JSON.stringify({
        data: invoiceData,
        options: {
          layout: "MINIMAL",
        },
      })
    );

    const outputPath = path.join(outputDir, "test-envelope.pdf");
    const code = await runCli([
      "node",
      "winbill",
      "-i",
      envelopePath,
      "-o",
      outputPath,
      "-q",
    ]);

    expect(code).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(1000);
  });
});
