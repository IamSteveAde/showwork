# Generate studio refresh

Generate now uses a blue-accented introduction, numbered purpose/timing/channel/direction sections, a resizable creative-direction field, local social-platform logos, and a live draft-count summary beside the form on wide screens. On smaller screens the summary stacks below the form and the generation action spans the available width. Existing platform grouping, scheduling, knowledge clarification, research/reporting handoffs, billing feedback, async generation and draft review remain in place. Invalid zero-draft selections disable the generation action, matching the existing submit validation.

No AI/provider prompt changes, migration, environment variable changes, paid calls, deployment or VPS changes. Release with a website deployment. If the earlier Research migration has not been applied, that separate feature still needs its migration; this UI adds no schema changes.

Validation: 13 reporting/research regression tests; server-render smoke checks with and without knowledge; all six platform SVG assets verified locally; stylesheet syntax and source TypeScript check. The test loader was updated to resolve the new component and current local dependencies. Real mobile/desktop visual interaction remains to be checked before production release.
