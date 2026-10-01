# Notes

A registry of deliberate deviations from the default approach used in this service. Each entry is a reusable reason: if a new case falls under an already-described reason, the same ID from this file is used instead of adding a new one with the same substance under a different wording.

> This file does not track where each ID is used - that's `grep`'s job, not the document's. Only the reason itself is recorded here.

Marker in code: `// NOTE[TAG-ID]: see NOTES.md#TAG-ID`.

----

<details>
<summary><strong>SQL</strong></summary>

Deviations from building queries through mikro-orm (ORM / Entity QB) in favor of kysely as a plain SQL compiler. kysely is used exclusively to build `{sql, parameters}` via `.compile()` - no connection of its own, no integration into mikro-orm. Execution always goes through `EntityManager.execute()`; the transaction context is owned by mikro-orm.

</details>

----
