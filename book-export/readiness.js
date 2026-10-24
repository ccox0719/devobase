// Read-only editorial checks. Structural completeness is not publication approval.
// Original raw_text is authoritative; structured fields are fallback metadata.

const HEADINGS = {
  devotional: /^(?:devotional thought|devotional|devotion)\s*:?\s*$/i,
  questions: /^(?:reflection questions?|discussion questions?|questions)\s*:?\s*$/i,
  application: /^(?:application|practical application|next steps)\s*:?\s*$/i,
  prayer: /^(?:prayer|closing prayer)\s*:?\s*$/i,
};
const DIVIDER = /^(?:-{3,}|⸻|—{3,}|\*{3,})$/;
const REFERENCE = /\b(?:[1-3]\s*)?[A-Za-z][A-Za-z ]+\s+\d+:\d+/;
const nonempty = value => String(value ?? '').trim();

export function parseBookSections(rawText = '') {
  const text = String(rawText ?? '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const sections = { devotional: '', questions: '', application: '', prayer: '' };
  let current = null;
  for (const line of lines) {
    const clean = line.trim().replace(/^#{1,6}\s*/, '');
    const heading = Object.keys(HEADINGS).find(key => HEADINGS[key].test(clean));
    if (heading) { current = heading; continue; }
    if (!current || DIVIDER.test(clean)) continue;
    sections[current] += line + '\n';
  }
  for (const key of Object.keys(sections)) sections[key] = sections[key].trim();
  const numberedLines = sections.questions.split('\n').filter(l => /^\s*\d+[.)]\s+\S/.test(l));
  const numbers = numberedLines.map(l => Number(l.match(/^\s*(\d+)/)[1]));
  const sequentialQuestions = numbers.every((n, i) => n === i + 1);
  const numberedQuestions = numberedLines.map(l => l.replace(/^\s*\d+[.)]\s+/, '').trim());
  return {
    ...sections,
    paragraphs: sections.devotional.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    numberedQuestions,
    sequentialQuestions,
  };
}

export function parseBookMetadata(rawText = '') {
  const text = String(rawText ?? '').replace(/\r\n?/g, '\n');
  const beforeBody = text.split(/^\s*#{0,6}\s*(?:devotional thought|devotional|devotion)\s*:?\s*$/im)[0];
  const title = beforeBody.match(/^\s*(?:#{1,6}\s*)?Title\s*:\s*(.+)$/im)?.[1]?.trim() || '';
  const scripture = beforeBody.match(/^\s*(?:#{1,6}\s*)?Scripture\s*:\s*(.+)$/im)?.[1]?.trim() || '';
  const keyLine = beforeBody.match(/^\s*(?:#{1,6}\s*)?Key\s+(?:Verse|Passage)\s*:\s*(.+)$/im)?.[1]?.trim() || '';
  let keyVerse = '', keyVerseRef = '';
  // Canonical inline form, accepting straight/smart quotes and hyphen/en/em dash.
  const inline = keyLine.match(/^[“"]([\s\S]+)[”"]\s*[-–—]\s*(.+)$/);
  if (inline) {
    keyVerse = inline[1].trim();
    keyVerseRef = inline[2].trim();
  } else if (keyLine) {
    // Some legacy entries put verse and reference on following lines.
    const m = keyLine.match(/^(.+?)\s+[-–—]\s+((?:[1-3]\s*)?[A-Za-z ]+\d+:\d+.*)$/);
    if (m) { keyVerse = m[1].replace(/^[“"]|[”"]$/g, '').trim(); keyVerseRef = m[2].trim(); }
  }
  if (!keyVerse) {
    const legacy = beforeBody.match(/^\s*(?:#{0,6}\s*)?Key\s+(?:Verse|Passage)\s*:?\s*\n\s*[“"]([^”"\n]+)[”"]\s*\n\s*[-–—]\s*(.+)$/im);
    if (legacy) { keyVerse = legacy[1].trim(); keyVerseRef = legacy[2].trim(); }
  }
  return { title, scripture, keyVerse, keyVerseRef };
}

export function assessBookReadiness(lesson) {
  const raw = lesson?.raw_text || lesson?.rawText || '';
  const metadata = parseBookMetadata(raw);
  const sections = parseBookSections(raw);
  const title = metadata.title || nonempty(lesson?.title);
  const scripture = metadata.scripture || nonempty(lesson?.scripture_ref);
  const keyVerse = metadata.keyVerse || nonempty(lesson?.key_verse);
  // When the original text has a verse, its explicit reference wins over
  // structured key_verse_ref, which may incorrectly contain the whole passage.
  const keyVerseRef = metadata.keyVerseRef || nonempty(lesson?.key_verse_ref);
  const checks = {
    title: Boolean(title),
    scripture: REFERENCE.test(scripture),
    keyVerse: Boolean(keyVerse),
    keyVerseReference: REFERENCE.test(keyVerseRef),
    devotionalThought: sections.paragraphs.length > 0,
    reflectionQuestions: sections.numberedQuestions.length >= 4 && sections.sequentialQuestions,
    application: Boolean(sections.application),
    prayer: /\bamen\s*\.\s*$/i.test(sections.prayer),
  };
  const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  // A format/parser warning is not evidence that the lesson lacks content.
  // Classify conservatively: only mark absent when the original source
  // provides no candidate text. Otherwise require human formatting review.
  const source = String(raw);
  const hasCandidate = {
    title: /\btitle\s*:/i.test(source) || Boolean(nonempty(lesson?.title)),
    scripture: /\bscripture\s*:/i.test(source) || Boolean(nonempty(lesson?.scripture_ref)),
    keyVerse: /\bkey\s*(?:verse|passage)\b/i.test(source) ||
      Boolean(nonempty(lesson?.key_verse)),
    keyVerseReference: /\bkey\s*(?:verse|passage)\b/i.test(source) ||
      Boolean(nonempty(lesson?.key_verse_ref)),
    devotionalThought: /\bdevotional\s*(?:thought)?\b/i.test(source),
    reflectionQuestions: /\b(?:reflection|discussion)\s*questions?\b/i.test(source),
    application: /\bapplication\b/i.test(source),
    prayer: /\bprayer\b/i.test(source),
  };
  const formattingIssues = missing.filter(name => hasCandidate[name]);
  const missingContent = missing.filter(name => !hasCandidate[name]);
  const reviewStatus = !missing.length ? 'complete'
    : missingContent.length ? 'missing_content' : 'formatting_review';
  return {
    id: lesson?.id ?? null,
    title: title || 'Untitled',
    scripture,
    keyVerse,
    keyVerseRef,
    seriesName: lesson?.series_name || null,
    seriesOrder: lesson?.series_order ?? null,
    checks,
    missing,
    formattingIssues,
    missingContent,
    reviewStatus,
    complete: missing.length === 0,
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
    formattingReview: entries.filter(x => x.reviewStatus === 'formatting_review').length,
    missingContent: entries.filter(x => x.reviewStatus === 'missing_content').length,
    publicationApproved: null,
    entries,
  };
}
