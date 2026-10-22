# DealLens | Protecting B2B quote margin before a customer proposal

## A €5,000 order can still lose money

For a modeled industrial-equipment supplier in Germany, a buyer requests two compressors, a 10% discount and free delivery. DealLens makes the consequences visible before the proposal is prepared, then rechecks the source catalog after a manager approves the terms.

**Project status:** independent working prototype with synthetic data and real closed-test n8n/Gmail integrations. Germany is the scenario context, not a customer claim. No measured client savings or commercial deployment is asserted.

![Complete original workflow](../assets/deallens-workflow.png)

## 1. The business risk

A sales team can approve a discount, promise free delivery and prepare a polished offer without noticing that the concessions consume the entire contribution. Even a correct initial calculation can become stale while approval is pending.

The commercial control needs to happen before generating a customer document, not only after a sale.

## 2. Transparent economics

| Amount excluding VAT | Requested terms | Alternative for approval |
| --- | ---: | ---: |
| Equipment catalog value | €5,000 | €5,000 |
| Equipment revenue after discount | €4,500 | €5,000 |
| Delivery charged to customer | €0 | €250 |
| Procurement | €4,300 | €4,300 |
| Delivery cost | €250 | €250 |
| **Contribution before overhead and tax** | **−€50** | **€700** |

The alternative removes the discount and charges delivery separately. Buyer acceptance is not guaranteed. These are modeled commercial terms, not collected revenue, net profit or measured client savings. The minimum-margin threshold is a demonstration policy, not a German industry standard.

## 3. What I built

1. The operator launches a scoped review of one labelled Gmail request.
2. AI extracts products and quantities with evidence from the source text. The manager verifies the request and discount.
3. Code matches the current catalog, calculates integer-cent amounts and stores a quote snapshot.
4. A human selects an acceptable alternative or rejects the quote.
5. After approval, the workflow reloads the pending state and reads the catalog again. Changed or expired terms trigger re-review rather than an old PDF.
6. A verified approved decision produces a customer-safe PDF and a Gmail draft with no recipient. The returned draft ID is saved and checked.

**AI does not set prices, approve concessions or send email.** The prototype also does not accept an order or reserve stock.

## 4. The decisive test

I changed procurement cost while the workflow waited for manager approval. On resumption, the system detected the changed catalog and stopped at `REQUOTE_REQUIRED`. Neither the PDF nor Gmail draft branch ran for that stale calculation.

In a fresh approved revision, both artifacts were created. A separate Gmail read-back confirmed zero To/CC/BCC recipients, DRAFT without SENT, and a 3,316-byte attachment matching the approved snapshot byte for byte.

A serial replay of the same revision stopped before another AI/PDF/draft operation. This is not a concurrent-load or exactly-once guarantee.

The public package contains **18 passing offline tests**, including the original 16 checks plus public-export/layout safeguards. They are reproducible without credentials and do not rerun the historical live test.

## 5. Value for a client

- **Commercial visibility:** see what discount and delivery terms leave before agreeing to them.
- **Current terms at document creation:** reduce the risk of preparing an offer from an outdated cost snapshot.
- **Less copying and document assembly:** approved fields become a PDF and draft attachment; time savings still need measurement in the client's process.
- **Appropriate information boundaries:** the customer PDF excludes procurement costs, margin, original request and internal notes.
- **Traceability:** explicit revision, stored snapshot, decision status and saved Gmail draft reference.

For an implementation estimate, I would first review request volume, catalog ownership, approval rules, average preparation time and failure-recovery needs. No unsupported ROI or payroll-saving percentage is used here.

## 6. Implementation materials

- [GitHub repository](https://github.com/vladyslav-moskalkov/deallens)
- [Inactive, sanitized workflow JSON](../workflows/deallens-email-to-approved-pdf.json)
- [Offline customer-facing PDF sample](../examples/approved-proposal-sample.pdf)
- [Setup](setup.md) · [All nodes explained](nodes.md) · [Validation boundaries](validation.md)

The downloadable sample is generated from synthetic approved data and is not the historical live attachment. The original workflow screenshot is retained without redrawing message text, node labels or outcomes.

## 7. What a production rollout requires

Authenticated approval roles, an authoritative catalog adapter, transactional uniqueness, concurrency tests, durable draft/journal recovery, monitoring and data-retention controls. The current PDF supports ASCII product names only; Unicode fonts, localization and agreed tax/document fields are separate rollout work.

The public export is inactive and contains no live credentials, table IDs, webhook IDs, mailbox snapshots or signed approval links. Its operator Form must not be activated publicly as an authenticated production approval service.

## Discuss your process

Are discount checks, price changes or manual proposal preparation slowing your sales team down? Let's review the current process and identify which checks and integrations would have the most practical value.

[Email](mailto:vladyslavmoskalkov@gmail.com) · [Telegram](https://t.me/vladislavbulldozer) · [LinkedIn](https://www.linkedin.com/in/vladyslav-moskalkov/)
