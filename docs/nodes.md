# Every node explained

One workflow, not several customer-facing workflows. The public builder retains the operating logic and connections, with a compact two-row presentation and sanitized instance configuration.

| Stage | Node purpose |
| --- | --- |
| 01 | Manager manually launches the labelled-email review and enters verified discount, explicit revision and operator reference. |
| 02 | Native Gmail reads one marked demo email, without attachments or background polling. |
| 03 | Gate: continue only if a message was found. |
| 04 | Bound the source text, validate the demo subject/message identity, normalize discount precision and explicit revision. |
| 05 | Read the journal for that message/revision quote ID. |
| 06 | Serial preflight gate: continue only for an unseen revision. |
| 07 | OpenAI structured extraction returns product identities, quantities, verbatim evidence and uncertainties. It does not set prices or approve terms. |
| 08 | Read the current configured supplier catalog. |
| 09 | Deterministic code validates evidence, matches products, checks availability/freshness and calculates cent-based economics. Save the source and extraction audit in the quote snapshot. |
| 10 | Persist the pending quote and review snapshot in the journal. |
| 11 | Gate: only complete, grounded requests reach commercial review. |
| 12 | Manager reviews acceptable alternatives and confirms or rejects the proposal. This Form is not authenticated multi-user approval. |
| 13 | Reload the saved pending state and verify the quote is still waiting. |
| 14 | Re-read catalog cost, price, availability, version and freshness after human review. |
| 15 | Revalidate terms and compute approve/reject/requote status. |
| 16 | Conditional journal update requires the expected row and pending status. |
| 17 | Verify that the returned durable decision matches the intended quote/status/snapshot. |
| 18 | Gate: only an approved decision reaches artifact creation. |
| 19 | Generate the customer-safe PDF locally from an explicit field allowlist; prepare n8n binary data. |
| 20 | Native Gmail creates a draft with the PDF. No recipient, CC/BCC, thread ID or sending operation is configured. |
| 21 | Save the returned Gmail draft ID and `DRAFT_READY` state in the journal. |
| 22 | Verify the saved draft reference matches Gmail's result. |
| 23 | Merge the verified result with the approved PDF binary for the operator response. |
| 24 | Finish the Form with the PDF download and draft-only completion state. |

## Six exception endings

- **No test email:** stop without a proposal.
- **Existing revision:** stop before another model/PDF/draft operation in a serial replay.
- **Clarification:** incomplete, ambiguous or unsupported items do not become an offer.
- **Decision persistence conflict:** release no artifact; inspect the journal.
- **Requote/rejection:** no PDF or Gmail draft from that run.
- **Artifact-reference conflict:** a Gmail draft may exist; inspect and reconcile manually, without automatic recreation.

## Three full guide notes

The screenshot and JSON preserve the notes for input/evidence, loss-making economics and human approval/recheck/PDF/draft boundaries. The descriptions are not executable logic.

## Source modules

- `engine.mjs`: pure catalog validation, quote economics, policy and approval revalidation.
- `email-rules.mjs`: email scope/revisions, review choices and blocked-result HTML.
- `extraction-config.mjs`: structured extraction prompt/schema and model configuration.
- `proposal-pdf.mjs`: local PDF serialization and customer-field allowlist.
- `build.mjs`: deterministic n8n JSON compilation, safe placeholders and two-row layout.
- `tests.mjs`: offline regression and public-export checks.
