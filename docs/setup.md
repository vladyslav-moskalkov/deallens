# Setup and isolated test

## Requirements

- An n8n instance supporting the node types/versions in the export: native Data tables, multi-page Forms, Gmail and OpenAI Responses.
- Your own Gmail OAuth and OpenAI credentials, configured inside n8n only.
- Two separate test Data tables. Do not reuse production tables.
- Node.js 22+ for offline checks; no npm dependencies are required.

## Offline checks

```sh
node build.mjs
node --test tests.mjs
```

Expected: 18 passing tests. They do not read Gmail, call a model or change the running workflow.

The committed export is generated with placeholders. To build a private instance-specific copy, set `DEALLENS_CATALOG_ID` and `DEALLENS_JOURNAL_ID` in your shell before running the builder. Never commit that private copy. Do not put API tokens in these variables or in the JSON.

## Data tables

1. Create a catalog from `data/catalog.csv`. Numeric columns must be numbers: `unit_price_cents`, `unit_cost_cents`, `stock`. Keep `sku`, `name`, `aliases`, `currency`, `version`, `verified_at` as strings. The supplied `aliases` field uses JSON-array text.
2. Create a quote journal with string columns `quote_id`, `status`, `snapshot_json`, `draft_id`, as in `data/journal.csv`. The seed is a schema example, not a completed transaction. n8n supplies its own row ID.
3. Replace **every** `REPLACE_CATALOG_TABLE_ID` / `REPLACE_QUOTES_TABLE_ID` reference using the n8n table selectors, or generate a private export with the two environment variables.
4. Catalog fixtures are deliberately dated 21 October 2026. The workflow rejects a catalog older than 24 hours. Reverify the synthetic fixture and explicitly set its timestamp for a new test; never silently refresh a real catalog without checking its source.

## Import safely

1. Import `workflows/deallens-email-to-approved-pdf.json` into an isolated workspace. It is inactive; keep it that way during setup.
2. Select your own Gmail and OpenAI credentials. The export contains none.
3. Verify that the two table selections point only to test tables.
4. Keep the manager Form off the public internet until authenticated identity and access controls are implemented. The prototype's operator reference is not authentication.
5. Review execution-data retention before using any real messages. Closed tests should use invented request data.

## Demo email

In the connected Gmail account, label one synthetic email `DealLens-Test`:

```text
Subject: [DEALLENS-DEMO] Compressor request

Please quote 2 AIR-75 compressors. We request a 10% discount and free delivery.
```

The query reads one non-draft email matching that label and subject. It does not poll the inbox. Avoid multiple matching messages when testing a specific request.

## Three live scenarios

### 1. Changed cost during approval

Start the test Form with manager-verified discount 10 and revision 1. At review, change the catalog unit cost from 215000 to 235000 cents. Approve list price plus paid delivery. Expected: `REQUOTE_REQUIRED`, no PDF or Gmail draft from that run.

### 2. Fresh, approved revision

Restore unit cost to 215000 and intentionally start revision 2 after confirming catalog freshness. Approve `LIST_PLUS_DELIVERY`. Expected: €5,250 total excluding VAT, customer-safe PDF, no-recipient Gmail draft, `DRAFT_READY` journal row and saved draft ID.

### 3. Serial duplicate

Run revision 2 again for the same message. Expected: existing-revision ending before AI, PDF and Gmail draft creation. Do not describe this serial test as a concurrent-load guarantee.

## Failure recovery

If Gmail creates a draft but the journal update fails, a draft may already exist. Inspect the execution and existing Gmail draft, then reconcile its ID manually. Do not automatically retry draft creation. Approval and Gmail are not one atomic transaction.

The successful binary-ending Form needed a GET reload in the historical operator-preview test. Recheck that UX in your n8n version; do not resubmit the approval POST as a download workaround.

## Deployment boundary

No ERP adapter, inventory reservation, tax calculation, order acceptance, payment collection or email sending is included. Confirm the real business workflow, authentication, data authority, language/font support, retention and recovery before rollout.
