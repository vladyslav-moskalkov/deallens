# Validation and evidence boundaries

## Historical closed test, 21 October 2026

The author ran the workflow through native Gmail, OpenAI and n8n Forms using a synthetic equipment request. The operational evidence recorded at that time established:

1. Procurement cost changed while review was waiting: `REQUOTE_REQUIRED`; PDF and draft creation did not execute.
2. A new approved revision produced a PDF, a native Gmail draft and a saved `DRAFT_READY` journal reference.
3. A serial replay of the same revision stopped before AI and artifact creation.
4. A separate read-only Gmail check established 0 To/CC/BCC addresses, DRAFT present and SENT absent. Its 3,316-byte attachment matched the approved snapshot's generated PDF byte for byte.

Private execution IDs, message IDs, signed Form URLs, credential references and mailbox screenshots are intentionally not distributed. This is an author-recorded closed test, not an independent audit or a real-client outcome. The screenshot supplied for this repository shows the actual n8n graph after presentation-only rearrangement.

## Reproducible public checks

```sh
node build.mjs
node --test tests.mjs
```

18 tests: 16 original money/input/revision/catalog/approval/PDF/integration-scope/compilation tests, plus 2 public-export and layout checks. The suite uses fixed synthetic timestamps and no network or credentials. It does not rerun the historical live integrations.

The two-row editor rearrangement retained all 33 elements. A before/after comparison found no changes to operational-node settings or connections; note wording was retained with larger Markdown formatting. The public template additionally replaces instance-specific configuration and removes webhook IDs.

## Economic claims

The modeled requested terms produce −€50 contribution. List price plus paid delivery produces €700 contribution. Both exclude overhead and tax, and all scenario amounts exclude VAT. These are deterministic examples, not measured savings, recovered revenue, net profit or a guaranteed buyer decision. Germany identifies the scenario only; no customer relationship or local tax/invoicing compliance is asserted.

No time-saving percentage or implementation ROI has been measured. A client estimate would require actual request volume, handling time, cost authority, rejected/accepted quote rates, overhead, operating cost and before/after observations.

## Production gates

- Authenticated, attributable approval identity and roles.
- Authoritative catalog integration and freshness ownership.
- Transactional unique quote/revision enforcement and concurrent-load tests.
- Durable recovery across PDF/draft creation and journal updates; an external Gmail draft and a Data table row are not atomic.
- Monitoring, backups, access control and personal-data retention.
- Inventory reservation/order lifecycle if commercially required.
- Embedded Unicode fonts, localization and agreed document/tax fields for a broader rollout.

The current source rejects unsupported PDF characters. Serial replay checks are not an exactly-once or parallel-concurrency guarantee. Manager forms in this prototype must not be exposed as an authenticated production approval service.
