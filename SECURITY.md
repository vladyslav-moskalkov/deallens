# Security and deployment boundary

This is a single-operator engineering prototype, not a production commercial approval service.

- The public export is inactive and has no credential objects, live Data table IDs, webhook IDs, pinned execution data or mailbox snapshots.
- Configure credentials only inside your own n8n instance. Never paste tokens into workflow JSON, issue reports, screenshots or commits.
- The Form operator reference is not authentication. Do not publicly activate the prototype without implementing and verifying access control.
- Use synthetic messages in an isolated mailbox/test scope. The source body and quote snapshot can be stored in n8n executions and tables.
- The PDF field allowlist excludes procurement costs and internal review data; do not replace it with a dump of the quote object.
- A failed journal update can leave a Gmail draft behind. Inspect and reconcile before any retry; do not add blind automatic retries.
- No payment, order acceptance, stock reservation or email send is implemented.

If you find a sensitive-data issue, contact the author through the portfolio's professional email rather than posting secrets in a public issue.
