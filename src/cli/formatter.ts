import { ZodError } from "zod";

/**
 * Formats validation and runtime errors for clean CLI presentation.
 */
export function formatError(error: unknown): string {
  if (error instanceof ZodError) {
    const lines = ["Validation Errors in billing data:"];
    for (const issue of error.issues) {
      const field = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      lines.push(`  • ${field}: ${issue.message}`);
    }
    return lines.join("\n");
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Error: ${String(error)}`;
}
