# Personal Bible Study workspace (review branch only)

## Scope
This feature is separate from `public.devotional_lessons`, the 365-day book, and publication approval. `studies.html` is reachable from the DevoBase header on this feature branch.

## Current functionality
- Add, edit and underline inductive Bible studies.
- Journal-first study prompts, with no mandatory on-screen answer fields.
- Export any individual study as HTML.
- Browser drafts are kept separately in localStorage (`devobase:personal-studies:v1`).
- Once signed in, account studies use `public.devobase_personal_studies`; a browser draft may be explicitly *copied* into the account library, without deleting its original.
- Account library is scoped by `auth.uid()` row-level security. There is deliberately no role for the 365-day book.

## Required review before release
1. Approve creation of **only** `public.devobase_personal_studies` and review `proposals/personal-studies-schema.sql`. Never execute the migration blindly. Check current database schema, ownership, backup and policies before applying.
2. Test sign-up, sign-in, read, create, edit, underline, refresh, sign-out, delete and cross-user authorization against a non-production environment.
3. Test on phone and desktop, including underlining a selected passage and exporting while offline.
4. Confirm changes saved on one device appear on another under the same account.
5. Confirm a different signed-in user cannot see, modify, or delete the first user's studies.
6. Verify existing DevoBase library import, book readiness, publication approval, and book export are unchanged.
7. Only after approval, manually import the four completed 1 Peter studies as editable drafts into the designated account; do not place them in `devotional_lessons` or approve for publication.

## Important limitations
- The proposed table has **not** been created in Supabase. Until approved and applied, browser drafts work, but cloud saving will not.
- The four previously written studies are **not yet imported**.
- No automatic merge of browser drafts into account storage. Users must select and copy a local draft.
- This first pass relies on a contenteditable browser editor and legacy `execCommand` for underlining; mobile selection and accessibility require testing. HTML is sanitized on load and export, but a more fully audited rich-text editor should be considered before broad rollout.
- Account credentials use the app's configured Supabase Auth project and never store passwords in study records.
- No deployment, production data changes, or publication changes have been made.
