# DevoBase Project Description and Editorial Contract

DevoBase is a personal devotional library and an in-progress 365-day devotional book. The GitHub repository is `ccox0719/devobase`; the application stores lessons in Supabase `public.devotional_lessons`. The long-term goal is one authoritative lesson collection powering (1) the existing lesson library and import workflow, (2) a polished digital book, (3) a read-only admin Book Readiness Report, and (4) a print-ready 6 × 9 inch PDF interior.

## Digital Book
- Reader mode shows **only explicitly publication-approved** lessons in curated Day 1–365 order. Structural completeness never automatically publishes a lesson.
- Admin mode shows all owned lessons, completeness warnings, book sequencing, and future approval/export controls. A UI toggle is not authorization; enforce owner/admin access in backend policies.
- Book Readiness is read-only until a separate, approved schema/editorial workflow is implemented.
- PDF export must use exactly the approved lessons and book order shown to readers, with a reconciled manuscript manifest and no silent omissions.
- Keep drafts and private devotional content out of any public reader or export endpoint.

## Canonical Lesson Format
Title: [Lesson Title]
Scripture: [Complete references separated by semicolons]

Key Verse: "[Complete verse text]" — [Verse Reference]

---

Devotional Thought

[Complete paragraphs separated by blank lines]

---

Reflection Questions

1. [Understanding]
2. [Self-examination]
3. [Relationship with God]
4. [Practical obedience]

---

Application

[One realistic, specific, grace-motivated practice]

---

Prayer

[First-person prayer thanking God, confessing need, asking for transformation, ending with Amen.]

## Writing Standards
- Return only a polished, complete, import-ready devotional when asked for a devotional; no introductions, commentary, or code fences.
- Use the exact section headings and order shown above. Include four to six consecutively numbered reflection questions unless otherwise requested. Do not number other sections.
- Every Scripture reference must contain a book, chapter, and verse. Include the complete key verse text in quotation marks and its precise reference.
- Preserve supplied personal stories, theological progression, tone, and intended meaning. Explain Scripture accurately, put grace before obedience, avoid repetitive conclusions, and end by inviting trust, love, or deeper relationship with God.
- Make application specific and measurable for the coming week. End prayer with `Amen.`
- For devotional series, format the series identifier as `(series title) (number only)` when naming series entries.

## Source of Truth and Legacy Compatibility
- Preserve the full original `raw_text`; structured fields can be incomplete or stale.
- Read key verses from canonical `Key Verse:` lines and accept older `Key Passage` styles.
- Recognize straight/smart quotation marks, hyphens/en/em dashes, Markdown headings, and common dividers.
- Flag missing or ambiguous sections for human review; never fabricate Scripture, silently rewrite devotional content, or treat a metadata gap as proof of missing content.
- Existing `times_done` counts use, not editorial approval.

## Development Safety
- Production is the `main` branch; current feature work is isolated to `feature/digital-book-readiness`.
- Do not modify or deploy production without explicit approval. Preserve existing import, edit, reading, and Supabase Auth functionality.
- Restrict database operations to owned `public.devotional_lessons` after confirming project reference and scope. Keep RLS; never expose privileged keys.
- Prefer read-only audits, unit tests, and fixture data before UI integration. A future publication-status/book-order migration requires separate authorization and rollback planning.
- Before a printed edition, confirm translation quotation permissions and proof the physical book.
