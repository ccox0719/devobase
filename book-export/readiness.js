// Read-only editorial readiness checks for DevoBase's Digital Book.
// This module never writes to Supabase or mutates source lesson objects.
// Publication approval is NOT inferred from completeness.

export function parseBookSections(rawText = '') {
  const text = String(rawText || '').replace(/\r\n?/g, '\n');
  const aliases = {
    devotional: /^(?:devotional thought|devotional|devotion)\s*:?$/i,
    questions: /^(?:reflection questions|discussion questions|questions)\s*:?$/i,
    application: /^(?:application|practical application|next steps)\s*:?$/i,
    prayer: /^(?:prayer|closing prayer)\s*:?$/i,
  };
  const sections = { devotional: '', questions: '', application: '', prayer: '' };
  let current = null;
  for (const line of text.split('\n')) {
    const cleaned = line.trim().replace(/^#{1,6}\s*/, '');
    const heading = Object.keys(aliases).find(key => aliases[key].test(cleaned));
    if (heading) { current = heading; continue; }
    if (!current || /^(?:-{3,}|⸻|\*{3,})$/.test(cleaned)) continue;
    sections[current] += line + '\n';
  }
  for (const key of Object.keys(sections)) sections[key] = sections[key].trim();
  const questions = (sections.questions.match(/^\s*\d+[.)]\s+.+$/gm) || [])
    .map(line => line.replace(/^\s*\d+[.)]\s+/, '').trim());
  return {
    ...sections,
    paragraphs: sections.devotional.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    numberedQuestions: questions,
  };
}

export function assessBookReadiness(lesson) {
  const sections = parseBookSections(lesson?.raw_text);
  const checks = {
    title: Boolean(String(lesson?.title || '').trim()),
    scripture: /\b\d+:\d+/.test(String(lesson?.scripture_ref || '')),
    keyVerse: Boolean(String(lesson?.key_verse || '').trim()),
    keyVerseReference: /\b\d+:\d+/.test(String(lesson?.key_verse_ref || '')),
    devotionalThought: sections.paragraphs.length > 0,
    reflectionQuestions: sections.numberedQuestions.length >= 4,
    application: Boolean(sections.application),
    prayer: /\bamen\s*\.\s*$/i.test(sections.prayer),
  };
  const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return {
    id: lesson?.id ?? null,
    title: lesson?.title || 'Untitled',
    seriesName: lesson?.series_name || null,
    seriesOrder: lesson?.series_order ?? null,
    checks,
    missing,
    complete: missing.length === 0,
    // No published/approved state exists in the current schema.
    publicationStatus: 'not_assessed',
    sections,
  };
}

export function buildBookReadinessReport(lessons = []) {
  const entries = lessons.map(assessBookReadiness);
  return {
    total: entries.length,
    structurallyComplete: entries.filter(x => x.complete).length,
    needsReview: entries.filter(x => !x.complete).length,
    publicationApproved: null,
    entries,
  };
}
