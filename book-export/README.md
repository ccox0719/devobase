# DevoBase Digital Book (development only)

This directory is the foundation for a digital reader, editorial readiness report, and later print-ready PDF export.

## Current state
- `readiness.js` is a pure, read-only module. It parses lesson sections and checks structural completeness.
- It does not access Supabase, write to the database, change lesson content, or mark lessons published.
- No application UI is wired to this module yet. It has not been deployed.
- `complete` means structurally complete, **not** editorially approved.

## Next steps
1. Inspect live `public.devotional_lessons` schema and records with read-only permissions; confirm current owner, row counts, pagination, local-only lessons, and old-format variations.
2. Add unit tests with representative canonical and legacy lessons. Verify no source objects are mutated and no content is silently dropped.
3. Add authenticated paginated retrieval with explicit count reconciliation; abort if incomplete.
4. Add a read-only Book section showing reader preview and admin readiness warnings. Until explicit approval state exists, do not expose content publicly.
5. Design owner-only editorial approval and ordering, review schema/RLS and backups, and request separate approval before any migration.
6. Generate a print-ready PDF from a verified manuscript snapshot; test with a physical proof.

## Security
- Production remains on `main`. Never merge or deploy this branch without review.
- Do not expose service-role keys in browser code.
- Preserve owner-based RLS and existing library/import behavior.
- An admin toggle is only presentation; permissions must be enforced on the server/database.
- A future public reader must receive only deliberately approved lessons, not all complete rows.
