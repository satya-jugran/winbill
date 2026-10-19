import * as fs from "fs";
import * as path from "path";
import { BillingData, GeneratorOptions, LayoutType } from "../models/types";

export interface CliFlags {
  input?: string;
  output?: string;
  config?: string;
  layout?: string;
  color?: string;
  font?: string;
  fontRegular?: string;
  fontBold?: string;
  watermark?: string;
  watermarkColor?: string;
  watermarkOpacity?: string;
  watermarkSize?: string;
  receipt?: boolean;
  paymentMethod?: string;
  currency?: string;
  locale?: string;
  logo?: string;
  translations?: string;
  quiet?: boolean;
  validateOnly?: boolean;
  open?: boolean;
}

export interface LoadedPayload {
  data: BillingData;
  options: GeneratorOptions;
  outputPath: string;
}

/**
 * Reads all content from STDIN asynchronously.
 */
export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let content = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      content += chunk;
    });
    process.stdin.on("end", () => {
      resolve(content);
    });
    process.stdin.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Coerces date string properties in a raw JSON object into JavaScript Date instances.
 */
export function coerceDates(obj: any): any {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const result = { ...obj };

  if (typeof result.date === "string") {
    result.date = new Date(result.date);
  }

  if (typeof result.dueDate === "string") {
    result.dueDate = new Date(result.dueDate);
  }

  if (result.receipt && typeof result.receipt === "object") {
    result.receipt = { ...result.receipt };
    if (typeof result.receipt.paymentDate === "string") {
      result.receipt.paymentDate = new Date(result.receipt.paymentDate);
    }
  }

  return result;
}

/**
 * Loads, parses, normalizes, and merges input data and options with CLI flags.
 */
export async function loadPayload(flags: CliFlags): Promise<LoadedPayload> {
  let rawJson = "";
  let baseDir = process.cwd();

  if (flags.input === "-" || (!flags.input && !process.stdin.isTTY)) {
    rawJson = await readStdin();
    if (!rawJson.trim()) {
      throw new Error("Input received from STDIN was empty.");
    }
  } else if (flags.input) {
    const inputPath = path.resolve(process.cwd(), flags.input);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input JSON file not found: ${inputPath}`);
    }
    rawJson = fs.readFileSync(inputPath, "utf-8");
    baseDir = path.dirname(inputPath);
  } else {
    throw new Error("No input file provided. Use -i <path> or pipe JSON into STDIN.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: any) {
    throw new Error(`Invalid JSON in input: ${err.message}`);
  }

  // Determine if input is an envelope { data, options } or raw BillingData
  let rawData: any = {};
  let rawOptions: GeneratorOptions = {};

  if (parsed && typeof parsed === "object" && parsed.data && typeof parsed.data === "object") {
    rawData = parsed.data;
    if (parsed.options && typeof parsed.options === "object") {
      rawOptions = parsed.options;
    }
  } else {
    rawData = parsed;
  }

  // Load external configuration / presets if provided
  let configOptions: GeneratorOptions = {};
  if (flags.config) {
    const configPath = path.resolve(process.cwd(), flags.config);
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    try {
      const configJson = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (configJson.options && typeof configJson.options === "object") {
        configOptions = configJson.options;
      } else {
        configOptions = configJson;
      }
      // If the config also has default company info, merge it as fallback
      if (configJson.data && typeof configJson.data === "object") {
        rawData = { ...configJson.data, ...rawData };
      }
    } catch (err: any) {
      throw new Error(`Invalid JSON in configuration file: ${err.message}`);
    }
  }

  // Coerce date strings to Date objects
  const data = coerceDates(rawData);

  // Merge options: CLI flags > configOptions > rawOptions
  const options: GeneratorOptions = {
    ...rawOptions,
    ...configOptions,
    theme: {
      ...rawOptions.theme,
      ...configOptions.theme,
    },
  };

  // Apply CLI flag overrides to options
  if (flags.layout) {
    const upperLayout = flags.layout.toUpperCase() as LayoutType;
    if (!["DEFAULT", "MINIMAL", "THERMAL", "MODERN"].includes(upperLayout)) {
      throw new Error(`Invalid layout '${flags.layout}'. Allowed values: DEFAULT, MODERN, MINIMAL, THERMAL`);
    }
    options.layout = upperLayout;
  }

  if (flags.color) {
    options.theme = options.theme || {};
    options.theme.primaryColor = flags.color;
  }

  if (flags.font) {
    options.theme = options.theme || {};
    options.theme.fontFamily = flags.font;
  }

  if (flags.fontRegular && flags.fontBold) {
    options.theme = options.theme || {};
    options.theme.customFontPath = {
      regular: path.resolve(process.cwd(), flags.fontRegular),
      bold: path.resolve(process.cwd(), flags.fontBold),
    };
  }

  if (flags.translations) {
    const transPath = path.resolve(process.cwd(), flags.translations);
    if (!fs.existsSync(transPath)) {
      throw new Error(`Translations file not found: ${transPath}`);
    }
    try {
      options.theme = options.theme || {};
      options.theme.translations = JSON.parse(fs.readFileSync(transPath, "utf-8"));
    } catch (err: any) {
      throw new Error(`Invalid JSON in translations file: ${err.message}`);
    }
  }

  // Apply CLI overrides to data
  if (flags.currency) {
    data.currency = flags.currency;
  }

  if (flags.locale) {
    data.locale = flags.locale;
  }

  if (flags.logo) {
    data.logoPath = path.resolve(process.cwd(), flags.logo);
  } else if (data.logoPath && !path.isAbsolute(data.logoPath)) {
    // Resolve relative logo path against the JSON file's directory
    data.logoPath = path.resolve(baseDir, data.logoPath);
  }

  // Watermark overrides
  if (flags.watermark) {
    data.watermark = data.watermark || { text: flags.watermark };
    data.watermark.text = flags.watermark;
  }
  if (flags.watermarkColor) {
    data.watermark = data.watermark || { text: "" };
    data.watermark.color = flags.watermarkColor;
  }
  if (flags.watermarkOpacity !== undefined) {
    const opacity = parseFloat(flags.watermarkOpacity);
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      throw new Error("Watermark opacity must be a number between 0 and 1");
    }
    data.watermark = data.watermark || { text: "" };
    data.watermark.opacity = opacity;
  }
  if (flags.watermarkSize) {
    const size = flags.watermarkSize.toLowerCase();
    if (!["xsmall", "small", "medium", "large", "xlarge"].includes(size)) {
      throw new Error(`Invalid watermark size '${flags.watermarkSize}'. Allowed: xsmall, small, medium, large, xlarge`);
    }
    data.watermark = data.watermark || { text: "" };
    data.watermark.fontSize = size as any;
  }

  // Receipt mode
  if (flags.receipt || flags.paymentMethod) {
    data.receipt = data.receipt || {};
    if (flags.paymentMethod) {
      data.receipt.paymentMethod = flags.paymentMethod;
    }
    if (!data.receipt.paymentDate) {
      data.receipt.paymentDate = new Date();
    }
  }

  // Determine output path
  let outputPath: string;
  if (flags.output) {
    outputPath = path.resolve(process.cwd(), flags.output);
  } else if (options.filePath) {
    outputPath = path.isAbsolute(options.filePath)
      ? options.filePath
      : path.resolve(process.cwd(), options.filePath);
  } else {
    const safeNum = (data.invoiceNumber || "invoice").replace(/[^a-zA-Z0-9_-]/g, "_");
    outputPath = path.resolve(process.cwd(), `${safeNum}.pdf`);
  }

  options.filePath = outputPath;

  return { data, options, outputPath };
}
