# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-07-18

### Breaking Changes
- **Architecture Overhaul**: `InvoiceGenerator` is now `BillGenerator`, and `InvoiceData` is now `BillingData` to support generic billing documents (invoices, receipts, etc.).
- **Zod Validation Runtime Validation**: The library now rigorously validates user payload using Zod. Invalid input immediately throws descriptive, strict errors instead of failing silently inside PDFKit.
- **Renderer Decoupling**: Business logic (math, calculations, sequenced discounts) has been cleanly decoupled into `BillProcessor`, while rendering orchestration has been moved to `Renderer`.
- **Layout Factory**: `BillGenerator` now takes a `layout` enum string in `GeneratorOptions` which is resolved by an Inversify-powered `LayoutFactory`. This perfectly matches layout logic with string transformers!

### Added
- **Global Currency Support (Roboto)**: Replaced default Helvetica font with Roboto TTFs directly bundled inside `winbill`. This immediately adds native unicode support for hundreds of global currencies, including the Indian Rupee (`₹`).
- **Receipt Note Fix**: Receipts no longer automatically clone the invoice `notes` field at the bottom of the document to avoid duplication with the "PAID IN FULL" block.

## [1.1.0] - 2026-07-18

### Added
- **Multiple Discounts Feature**: Added support for an array of stacked discounts (`discounts` field in `InvoiceData`).
- Discounts can now be mixed between percentages and flat amounts seamlessly.
- Discounts are processed sequentially against a running subtotal. 
- Added an optional `sequenceNumber` field to `InvoiceDiscount` to give developers explicit, deterministic control over the calculation order.

