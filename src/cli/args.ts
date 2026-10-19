import { parseArgs } from "node:util";
import { CliFlags } from "./loader";

export const VERSION = "2.2.0";

export const HELP_TEXT = `
winbill v${VERSION}
Effortlessly generate professional, beautiful PDF invoices and receipts.

Usage:
  winbill [inputFile] [options]
  winbill -i <path> -o <path> [options]

Arguments:
  inputFile                        Input JSON file path (positional)

Options:
  -i, --input <path>               Path to input JSON file, or '-' for STDIN
  -o, --output <path>              Destination PDF file path (default: ./[invoiceNumber].pdf)
  -c, --config <path>              Path to a reusable corporate branding/preset JSON file
  -l, --layout <type>              Layout template: DEFAULT, MODERN, MINIMAL, or THERMAL
  --color <hex>                    Primary brand / accent color (e.g. #005b96)
  --font <name>                    Built-in font family: Roboto, Helvetica, Times-Roman, Courier
  --font-regular <path>            Path to custom regular TTF font file
  --font-bold <path>               Path to custom bold TTF font file
  -w, --watermark <text>           Document watermark text (e.g. PAID, DRAFT, VOID)
  --watermark-color <hex>          Watermark text color (default: #e0e0e0)
  --watermark-opacity <number>     Watermark opacity from 0.0 to 1.0 (default: 0.3)
  --watermark-size <size>          Watermark font size: xsmall, small, medium, large, xlarge
  --receipt                        Generate a payment receipt instead of an invoice
  --payment-method <string>        Payment method used (e.g. 'Credit Card ending 4242')
  --currency <ISO>                 Override currency code (e.g. USD, EUR, INR)
  --locale <string>                Override locale formatting (e.g. en-US, en-IN, de-DE)
  --logo <path>                    Override company logo path (PNG or JPEG)
  --translations <path>            Path to custom label translations JSON
  --validate-only                  Validate input JSON against schema without generating PDF
  --open                           Open the generated PDF in the default viewer
  -q, --quiet                      Suppress informational console output
  -v, --version                    Display Winbill version
  -h, --help                       Display this help message

Examples:
  winbill invoice.json -o out.pdf
  winbill -i invoice.json --layout MODERN --color "#2563EB"
  winbill -i invoice.json --receipt --payment-method "Stripe" -o receipt.pdf
  winbill -i invoice.json --watermark "PAID" -c branding.json
  type invoice.json | winbill -o streamed.pdf
`;

export function parseCliFlags(argv: string[] = process.argv): {
  flags: CliFlags;
  positionalInput?: string;
  showHelp?: boolean;
  showVersion?: boolean;
} {
  // Slice out node and script name if argv is process.argv
  const rawArgs = argv[0]?.endsWith("node") || argv[0]?.endsWith("node.exe") || argv[1]?.includes("cli")
    ? argv.slice(2)
    : argv;

  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      input: { type: "string", short: "i" },
      output: { type: "string", short: "o" },
      config: { type: "string", short: "c" },
      layout: { type: "string", short: "l" },
      color: { type: "string" },
      font: { type: "string" },
      "font-regular": { type: "string" },
      "font-bold": { type: "string" },
      watermark: { type: "string", short: "w" },
      "watermark-color": { type: "string" },
      "watermark-opacity": { type: "string" },
      "watermark-size": { type: "string" },
      receipt: { type: "boolean" },
      "payment-method": { type: "string" },
      currency: { type: "string" },
      locale: { type: "string" },
      logo: { type: "string" },
      translations: { type: "string" },
      "validate-only": { type: "boolean" },
      open: { type: "boolean" },
      quiet: { type: "boolean", short: "q" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) {
    return { flags: {}, showHelp: true };
  }

  if (values.version) {
    return { flags: {}, showVersion: true };
  }

  const positionalInput = positionals[0];

  const flags: CliFlags = {
    input: (values.input as string) || positionalInput,
    output: values.output as string,
    config: values.config as string,
    layout: values.layout as string,
    color: values.color as string,
    font: values.font as string,
    fontRegular: values["font-regular"] as string,
    fontBold: values["font-bold"] as string,
    watermark: values.watermark as string,
    watermarkColor: values["watermark-color"] as string,
    watermarkOpacity: values["watermark-opacity"] as string,
    watermarkSize: values["watermark-size"] as string,
    receipt: values.receipt as boolean,
    paymentMethod: values["payment-method"] as string,
    currency: values.currency as string,
    locale: values.locale as string,
    logo: values.logo as string,
    translations: values.translations as string,
    validateOnly: values["validate-only"] as boolean,
    open: values.open as boolean,
    quiet: values.quiet as boolean,
  };

  return { flags, positionalInput };
}
