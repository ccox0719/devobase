import test from 'node:test';
import assert from 'node:assert/strict';
import { bookProgress } from '../../book-export/progress.js';

test('calculates saved devotional progress toward a 365-day book', () => {
  assert.deepEqual(bookProgress(91), {
    savedCount: 91,
    target: 365,
    percentage: 25,
    displayPercentage: 25,
    remaining: 274,
    milestone: 'A quarter of the way toward a full year.'
  });
});

test('caps the visual progress at 100 percent while preserving the actual count', () => {
  const progress = bookProgress(400);
  assert.equal(progress.savedCount, 400);
  assert.equal(progress.percentage, 110);
  assert.equal(progress.displayPercentage, 100);
  assert.equal(progress.remaining, 0);
});

test('rejects invalid counts and targets', () => {
  assert.throws(() => bookProgress(-1), /non-negative integer/);
  assert.throws(() => bookProgress(1, 0), /positive integer/);
});
