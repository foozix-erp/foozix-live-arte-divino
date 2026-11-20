# Local bank statement reader

The reader loads only when a user chooses a statement. Source files are parsed in the browser; they are not sent to an external OCR or parsing service.

Supported formats:

- CIB text PDFs with movement columns, a declared period and printed debit/credit totals.
- QNB Transaction Summary XLS/XLSX/CSV exports with the expected column headers and search-result count.

Unreadable rows or missing boundary balances prevent an incomplete extraction from being saved as complete. Printed balance inconsistencies remain explicit source exceptions. QNB date coverage inferred from movements requires confirmation of the original search range.

Extraction never approves accounting entries, infers a missing payment from a balance gap, or posts a financial transaction.

Vendored libraries are pinned and loaded locally:

- Mozilla PDF.js 6.5.438, Apache-2.0, official `pdfjs-dist` package.
- SheetJS Community Edition 0.20.3, Apache-2.0, official SheetJS CDN.

License texts and file hashes are included alongside the vendored assets.
