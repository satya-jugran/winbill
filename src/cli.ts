#!/usr/bin/env node
import "reflect-metadata";
import { Winbill } from "./index";
import { BillingDataSchema } from "./models/types";
import { parseCliFlags, HELP_TEXT, VERSION } from "./cli/args";
import { loadPayload } from "./cli/loader";
import { formatError } from "./cli/formatter";
import { exec } from "child_process";

export async function runCli(argv: string[] = process.argv): Promise<number> {
  const { flags, showHelp, showVersion } = parseCliFlags(argv);

  if (showHelp) {
    console.log(HELP_TEXT);
    return 0;
  }

  if (showVersion) {
    console.log(`winbill v${VERSION}`);
    return 0;
  }

  try {
    const { data, options, outputPath } = await loadPayload(flags);

    // Validate only mode
    if (flags.validateOnly) {
      BillingDataSchema.parse(data);
      if (!flags.quiet) {
        console.log("✓ Validation successful: Input data conforms to Winbill schema.");
      }
      return 0;
    }

    if (!flags.quiet) {
      console.log(`Generating PDF (${options.layout || "DEFAULT"} layout)...`);
    }

    const startTime = Date.now();
    const winbill = new Winbill();
    await winbill.generateBill(data, options);

    if (!flags.quiet) {
      const elapsed = Date.now() - startTime;
      console.log(`✓ PDF successfully generated: ${outputPath} (${elapsed}ms)`);
    }

    if (flags.open) {
      const command =
        process.platform === "win32"
          ? `start "" "${outputPath}"`
          : process.platform === "darwin"
          ? `open "${outputPath}"`
          : `xdg-open "${outputPath}"`;
      exec(command, (err) => {
        if (err && !flags.quiet) {
          console.warn(`Could not open file: ${err.message}`);
        }
      });
    }

    return 0;
  } catch (error: any) {
    console.error(formatError(error));
    return 1;
  }
}

// Only invoke automatically when run directly as CLI
if (require.main === module) {
  runCli().then((code) => {
    if (code !== 0) {
      process.exit(code);
    }
  });
}
