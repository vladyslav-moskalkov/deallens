# DealLens

### Catch a loss-making quote before it becomes a customer promise.

AI-assisted B2B quote review in n8n: email → evidence-backed items → deterministic economics → human approval → fresh catalog recheck → customer-safe PDF → Gmail draft.

**Independent working prototype.** Germany is the modeled business context: a B2B industrial-equipment supplier. No German customer, client deployment, collected revenue or measured savings are claimed. Catalog data and commercial assumptions are synthetic.

![Complete DealLens workflow in two rows](assets/deallens-workflow.png)

*Author-supplied original screenshot. Open the image for detail. The Published badge belongs to the author's test workspace; the public JSON is inactive and contains no live connections.*

## The business problem

A €5,000 equipment request can become an unprofitable promise when discount and delivery concessions are approved separately from their actual costs. A second risk is less visible: procurement cost may change while a manager reviews an older calculation.

| Scenario, all amounts excluding VAT | Requested terms | Alternative for review |
| --- | ---: | ---: |
| Equipment catalog value | €5,000 | €5,000 |
| Equipment revenue after discount | €4,500 | €5,000 |
| Delivery charged to customer | €0 | €250 |
| Procurement cost | €4,300 | €4,300 |
| Seller's delivery cost | €250 | €250 |
| **Contribution before overhead and tax** | **−€50** | **€700** |

The alternative removes the discount and charges delivery to the buyer. It still requires the buyer's agreement. The €750 difference is a scenario comparison, not money earned or saved for a client. The demo's 10% minimum contribution-margin policy is configurable, not a German industry benchmark.

## What this gives a business

- **Visible deal economics:** a manager sees the effect of concessions before approving terms.
- **A second check before document creation:** changed price, cost, stock, catalog version or expired terms stop the old quote.
- **Less document preparation:** approved terms become a PDF attachment in a Gmail draft. Actual time savings have not been measured.
- **A customer-safe document:** supplier cost, margin, source email and internal notes are excluded from PDF fields.
- **A traceable review:** an explicit message revision, quote snapshot, decision status and saved draft reference.

## How it works

1. An operator manually starts the closed-test Form. Gmail reads one specifically labelled demo email, not the whole inbox.
2. Structured AI extraction identifies requested products and quantities with source evidence. A manager verifies the request and discount; this is not a generic commercial-terms parser.
3. Code matches the catalog and calculates integer-cent economics. Incomplete, ambiguous or unavailable items go to clarification.
4. A manager reviews acceptable alternatives or rejects the quote.
5. The workflow reloads the pending snapshot and re-reads the catalog after review. A stale calculation requires a new review, with no PDF or draft from that run.
6. After a verified decision write, it generates an allowlisted PDF, creates a no-recipient Gmail draft and verifies that its ID was recorded.

**There is no send node.** This prototype does not accept orders, collect payments or reserve stock. AI extracts meaning; code calculates commercial amounts; the human retains approval and sending decisions.

## Evidence, not assumed client results

| Check | What was actually established |
| --- | --- |
| Cost changed during a waiting review | Live n8n test stopped at recalculation; PDF and Gmail draft branches did not run. |
| New, approved revision | Live run produced a PDF and a Gmail draft, with the draft reference saved in the journal. |
| Same revision replayed | Serial replay stopped before another model call, PDF or draft. |
| Independent Gmail read-back | 0 To/CC/BCC recipients; DRAFT present, SENT absent; the 3,316-byte PDF matched the approved snapshot byte for byte. |
| Reproducible offline checks | 18 tests: the original 16 business/integration checks plus 2 public-export/layout checks. No live credentials or network calls needed. |

The read-back above describes the historical closed test. The PDF below is a separately generated offline sample, not its live attachment.

## Inspect or reproduce

- [Importable n8n JSON](workflows/deallens-email-to-approved-pdf.json)
- [Customer-facing PDF sample](examples/approved-proposal-sample.pdf)
- [Setup and safe test procedure](docs/setup.md)
- [Every node explained](docs/nodes.md)
- [Validation scope and limitations](docs/validation.md)
- [English business case](docs/case-study-en.md) · [Кейс українською](docs/case-study-uk.md)
- [Notion case in English](https://vladyslav-ai-automation.notion.site/4017a4cb52cc81bbb535c1b2271930a7) · [Кейс у Notion українською](https://vladyslav-ai-automation.notion.site/4017a4cb52cc817b8f4fdac54d254185)
- [Security and deployment boundaries](SECURITY.md)

Requires Node.js 22+ for the dependency-free offline checks:

```sh
node build.mjs
node --test tests.mjs
```

The builder defaults to table placeholders and removes credentials, webhook IDs and runtime data. Import into an isolated n8n workspace and configure your own tables and credentials. Do not activate an unauthenticated approval form on a public server.

## Implementation

One workflow: **30 operational nodes + 3 guide notes**, including 4 Code nodes. Native Gmail, OpenAI, Data table, Form, If and Merge nodes handle orchestration. Source modules cover deterministic rules, email/revision handling and local PDF generation.

```text
workflows/   Sanitized two-row n8n export
assets/      Original workflow screenshot
data/        Synthetic catalog and empty journal schema seed
examples/    Offline PDF sample
docs/        Business case, setup, node guide and validation
*.mjs        Builder, pure rules, extraction configuration, PDF generator and tests
```

## Before a real deployment

Connect an authoritative catalog, implement authenticated approval identity, transactional uniqueness and artifact recovery, and establish monitoring and personal-data retention. Native Data tables and a serial revision guard are not proof of concurrency-safe exactly-once processing. See [validation boundaries](docs/validation.md).

The current PDF generator supports ASCII product names only. The Germany scenario is not a claim of German-language PDF support, tax compliance or local invoicing readiness.

## Discuss your quoting process

Does your team manually check discounts, copy quote lines into documents, or discover cost changes after approval? I can review the current process, data source and controls needed before adapting this approach.

[Portfolio](https://vladyslav-ai-automation.notion.site/3fb7a4cb52cc815d9f3ff810b715d3a4) · [LinkedIn](https://www.linkedin.com/in/vladyslav-moskalkov/) · [Email](mailto:vladyslavmoskalkov@gmail.com)

No license file is included. Contact the author to discuss reuse or licensing.
