# Changelog

All notable changes to this project will be documented in this file.

## [2.1.1] - 2026-07-21

### Added
- **Watermark Sizing**: Added `fontSize` property (`xsmall`, `small`, `medium`, `large`, `xlarge`) to `WatermarkSchema` to give finer control over the watermark's dimensions across templates.

### Fixed
- **Watermark Alignment**: Fixed critical watermark rotation and alignment math in `DefaultLayout` and `ModernLayout`, dynamically recalculating bounds to perfectly center large text sizes without overlapping or breaking out of bounds.

### Changed
- **Project Structure Refactor**: Refactored `src/layouts` and `src/transformers` so that both layout definitions and transformers are co-located under feature-grouped folders (`default/`, `modern/`, `minimal/`, `thermal/`) for better maintainability.

## [2.1.0] - 2026-07-21

### Added
- **Banking Details**: Added `bankDetails` to `paymentDetails` which automatically renders a "How to Pay" block containing Bank, Account Name, Account Number, IBAN, SWIFT, and Routing Number.
- **Customizable Watermark**: Migrated the legacy `addWatermark` boolean on receipts to a powerful, fully customizable `watermark` object at the `BillingData` root. Now you can stamp any text (e.g. "DRAFT", "VOID", "OVERDUE", "PAID"), with customizable color and opacity. The bounding box dynamically adjusts to text width in Modern layouts.

### Fixed
- Fixed critical bugs related to layout rendering overlaps and PDF formatting overlaps (e.g., overlapping notes in receipts lacking "How to Pay" blocks).

## [2.0.0] - 2026-07-18
### Breaking Changes
- **Architecture Overhaul**: `InvoiceGenerator` is now `BillGenerator`, and `InvoiceData` is now `BillingData` to support generic billing documents (invoices, receipts, etc.).
- **Zod Validation Runtime Validation**: The library now rigorously validates user payload using Zod. Invalid input immediately throws descriptive, strict errors instead of failing silently inside PDFKit.
- **Renderer Decoupling**: Business logic (math, calculations, sequenced discounts) has been cleanly decoupled into `BillProcessor`, while rendering orchestration has been moved to `Renderer`.
- **Layout Factory**: `BillGenerator` now takes a `layout` enum string in `GeneratorOptions` which is resolved by an Inversify-powered `LayoutFactory`. This perfectly matches layout logic with string transformers!

### Added
- **Global Currency Support (Roboto)**: Replaced default Helvetica font with Roboto TTFs directly bundled inside `winbill`. This immediately adds native unicode support for hundreds of global currencies, including the Indian Rupee (`₹`).
- **Receipt Note Fix**: Receipts no longer automatically clone the invoice `notes` field at the bottom of the document to avoid duplication with the "PAID IN FULL" block.
- **Advanced Output Methods**: Added `generateBuffer()` on the `Winbill` class to generate PDFs as a memory `Buffer` for web streaming.
- **Enhanced Tax & Discount Engines**: Introduced categorized line-items (`categories`) with their own isolated taxes/discounts, and added an `isTaxExempt` flag on individual line items.
- **New Layout Templates**: Added `MODERN` (premium geometric theme), `MINIMAL` (sleek, ink-saving), and `THERMAL` (80mm POS receipt printer) layout formats.
- **Full Localization (i18n)**: Added `theme.translations` parameter to customize static PDF labels natively.
- **Interactive Links & Elements**: `paymentUrl` creates clickable hyperlink "Pay Now" actions, and `qrCodeUrl` automatically renders an embedded QR code!
- **Attachments & Appendices**: Added a `termsAndConditions` field to automatically spawn a Terms & Conditions appendix page at the end of the PDF.
- **Custom Fonts**: Added `theme.customFontPath` configuration to ingest external `.ttf` paths.
- **License**: Re-licensed under `GPL-3.0`.

## [1.1.0] - 2026-07-18

### Added
- **Multiple Discounts Feature**: Added support for an array of stacked discounts (`discounts` field in `InvoiceData`).
- Discounts can now be mixed between percentages and flat amounts seamlessly.
- Discounts are processed sequentially against a running subtotal. 
- Added an optional `sequenceNumber` field to `InvoiceDiscount` to give developers explicit, deterministic control over the calculation order.

