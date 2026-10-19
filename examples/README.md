# Winbill CLI Examples

This folder contains complete, ready-to-run examples demonstrating invoice generation, logo embedding, and corporate branding presets with `winbill.exe`.

---

## Files in this Folder

| File | Description |
| :--- | :--- |
| **`invoice.json`** | Complete invoice payload with items, stacked discounts, taxes, wire transfer bank details, payment URL, and a relative logo path (`./logo.png`). |
| **`branding.json`** | Reusable corporate preset configuring the `MODERN` template layout, corporate Pantone blue accent color (`#0F4C81`), `Roboto` font, and custom label translations. |
| **`logo.png`** | Sample company logo embedded into the header of the generated PDF. |

---

## Example Commands

### 1. Basic Invoice Generation
Uses the default template and embeds `./logo.png`:
```powershell
.\dist\winbill.exe -i examples/invoice.json -o invoice.pdf
```

### 2. Branded Invoice using `branding.json`
Merges the corporate branding preset with the invoice data:
```powershell
.\dist\winbill.exe -i examples/invoice.json -c examples/branding.json -o branded-invoice.pdf
```

### 3. Overriding Layout and Watermark via CLI Flags
CLI flags take highest priority and override preset values:
```powershell
.\dist\winbill.exe -i examples/invoice.json -c examples/branding.json --layout DEFAULT --watermark "PAID" -o paid-invoice.pdf
```

### 4. Receipt Mode
Converts the document into a paid receipt:
```powershell
.\dist\winbill.exe -i examples/invoice.json --receipt --payment-method "Stripe" -o receipt.pdf
```

### 5. Validate Payload (Dry Run)
Validates the JSON schema without writing to disk:
```powershell
.\dist\winbill.exe -i examples/invoice.json --validate-only
```
