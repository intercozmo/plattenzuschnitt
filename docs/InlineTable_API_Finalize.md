# InlineTable API Finalization (Phase 1)

This document outlines the finalized public API for the InlineTable core to be used by Phase 1 migrations and future components.

- Expose exported types: Column, Row, CsvExportConfig, CsvImportConfig from InlineTable
- Public API surface for InlineTable component: props include columns, rows, onSave, onDelete, onAdd, addLabel, onGrainToggle, csvExport, csvImport
- Compatibility shim: keep backward-compatible props for StockTable and PiecesTable until fully migrated
- Validation: API will be locked via a formal PR review; breaking changes require a major version bump
