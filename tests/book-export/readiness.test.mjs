import test from 'node:test';
import assert from 'node:assert/strict';
import { assessBookReadiness, buildBookReadinessReport, parseBookMetadata } from '../../book-export/readiness.js';

const body = [
  'Devotional Thought', '', 'God is faithful even when the next step is unclear.',
  '', 'He gives grace before asking us to follow.', '', '---', '',
  'Reflection Questions', '', '1. What does the passage say?',
  '2. What do I fear?', '3. How can I trust God?',
  '4. What step will I take?', '', '---', '', 'Application', '',
  'Pray each morning before deciding your next step.', '', '---', '',
  'Prayer', '', 'Father, thank You for Your grace. Help me trust You. Amen.'
].join('\n');

const header = ['Title: The Next Step', 'Scripture: Joshua 1:9',
  '', 'Key Verse: "Be strong and courageous." — Joshua 1:9', '', '---', ''].join('\n');

test('canonical key verse is read from raw text and source is unchanged', () => {
  const source = { id: 'a', title: 'The Next Step', scripture_ref: 'Joshua 1:9',
    key_verse: null, key_verse_ref: 'Joshua 1:1-9', raw_text: header + body };
  const before = JSON.stringify(source);
  const report = assessBookReadiness(source);
  assert.equal(report.complete, true);
  assert.equal(report.keyVerse, 'Be strong and courageous.');
  assert.equal(report.keyVerseRef, 'Joshua 1:9');
  assert.equal(JSON.stringify(source), before);
});

test('smart quotes and multiple scripture references are preserved', () => {
  const metadata = parseBookMetadata([
    'Title: Grace', 'Scripture: John 17:3; 1 John 4:19',
    'Key Verse: “Now this is eternal life.” — John 17:3',
    '', 'Devotional Thought'
  ].join('\n'));
  assert.equal(metadata.scripture, 'John 17:3; 1 John 4:19');
  assert.equal(metadata.keyVerseRef, 'John 17:3');
});

test('missing prayer and skipped question numbering are flagged', () => {
  const raw_text = header + body.replace('4. What step will I take?', '5. What step will I take?')
    .replace('Help me trust You. Amen.', 'Help me trust You.');
  const report = assessBookReadiness({ raw_text });
  assert.equal(report.complete, false);
  assert.ok(report.missing.includes('prayer'));
  assert.ok(report.missing.includes('reflectionQuestions'));
});

test('completion does not imply publication approval', () => {
  const result = buildBookReadinessReport([{ raw_text: header + body }]);
  assert.equal(result.structurallyComplete, 1);
  assert.equal(result.publicationApproved, null);
  assert.equal(result.entries[0].publicationStatus, 'not_assessed');
});

test('unparsed legacy key verse is flagged as formatting review, not confirmed absent', () => {
  const raw_text = header.replace('Key Verse: "Be strong and courageous." — Joshua 1:9', 'Key Verse: Be strong and courageous. Joshua 1:9') + body;
  const result = assessBookReadiness({ raw_text });
  assert.equal(result.reviewStatus, 'formatting_review');
  assert.ok(result.formattingIssues.includes('keyVerse'));
  assert.equal(result.missingContent.length, 0);
});

test('truly absent key verse heading is flagged as likely missing content', () => {
  const raw_text = header.replace('Key Verse: "Be strong and courageous." — Joshua 1:9', '') + body;
  const result = assessBookReadiness({ raw_text });
  assert.equal(result.reviewStatus, 'missing_content');
  assert.ok(result.missingContent.includes('keyVerse'));
});
