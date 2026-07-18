# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-07-18

### Added
- **Multiple Discounts Feature**: Added support for an array of stacked discounts (`discounts` field in `InvoiceData`).
- Discounts can now be mixed between percentages and flat amounts seamlessly.
- Discounts are processed sequentially against a running subtotal. 
- Added an optional `sequenceNumber` field to `InvoiceDiscount` to give developers explicit, deterministic control over the calculation order.

