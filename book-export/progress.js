export const BOOK_TARGET = 365;

export function bookProgress(savedCount, target = BOOK_TARGET) {
  if (!Number.isInteger(savedCount) || savedCount < 0) {
    throw new TypeError('Saved devotional count must be a non-negative integer.');
  }
  if (!Number.isInteger(target) || target <= 0) {
    throw new TypeError('Book target must be a positive integer.');
  }

  const percentage = Math.round((savedCount / target) * 100);
  const remaining = Math.max(target - savedCount, 0);
  const displayPercentage = Math.min(percentage, 100);
  let milestone = 'Every devotional begins with one faithful step.';

  if (savedCount >= target) milestone = 'The full 365-day collection is saved.';
  else if (percentage >= 75) milestone = 'The finish line is in view.';
  else if (percentage >= 50) milestone = 'Halfway there—keep building the collection.';
  else if (percentage >= 25) milestone = 'A quarter of the way toward a full year.';

  return { savedCount, target, percentage, displayPercentage, remaining, milestone };
}
