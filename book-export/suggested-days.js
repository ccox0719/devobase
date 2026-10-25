// Editorial planning only. Suggested days are never assignments or approvals.
export const BOOK_SEASONS = [
  { start: 1, end: 31, label: 'Knowing God and creation', words: ['creat','genesis','made','maker','wonder','nature','god created'] },
  { start: 32, end: 90, label: 'Identity, grace and Christ', words: ['identity','grace','beloved','love','christ','jesus','saved','gospel','redeem','known','son','daughter'] },
  { start: 91, end: 151, label: 'Trusting God in uncertainty', words: ['trust','fear','worry','uncertain','anxious','peace','waiting','faithful step','direction','control'] },
  { start: 152, end: 212, label: 'Faith and obedience', words: ['obedien','disciple','follow','wisdom','prayer','word','scripture','faith','abide','grow'] },
  { start: 213, end: 273, label: 'Relationships and love', words: ['marriage','wife','family','children','brother','neighbor','forgive','friend','relationship','kindness','tongue'] },
  { start: 274, end: 334, label: 'Perseverance and hope', words: ['hope','persever','suffer','endure','promise','faithful','trial','eternal','resurrection'] },
  { start: 335, end: 365, label: 'Advent and Christmas', words: ['advent','christmas','nativity','bethlehem','incarnation','manger','birth of jesus'] },
];
const normalize = value => String(value || '').toLocaleLowerCase();
function score(lesson, season) {
  const title = normalize(lesson.title);
  const text = normalize((lesson.raw_text || '').slice(0, 4500));
  return season.words.reduce((n, word) => n + (title.includes(word) ? 5 : 0) + (text.includes(word) ? 1 : 0), 0);
}
export function suggestReadingDays(lessons = []) {
  const used = new Set();
  const suggestions = new Map();
  // Keep series entries together when they carry explicit series metadata.
  const groups = new Map();
  for (const lesson of lessons) {
    const series = normalize(lesson.series_name).trim();
    const key = series ? 'series:' + series : 'lesson:' + lesson.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lesson);
  }
  const ordered = [...groups.values()].map(group => group.sort((a,b) =>
    (Number(a.series_order) || 0) - (Number(b.series_order) || 0) ||
    String(a.title).localeCompare(String(b.title))));
  ordered.sort((a,b) => {
    const best = group => Math.max(...BOOK_SEASONS.map(season => group.reduce((n,l) => n + score(l,season),0)));
    return best(b) - best(a) || String(a[0].title).localeCompare(String(b[0].title));
  });
  for (const group of ordered) {
    const ranked = BOOK_SEASONS.map((season,index) => ({
      season,index,score:group.reduce((n,l) => n + score(l,season),0)
    })).sort((a,b) => b.score - a.score || a.index - b.index);
    // Preserve December for explicitly Advent-related entries.
    const candidates = ranked.filter(x => x.index !== 6 || x.score > 0);
    let placed = false;
    for (const {season} of candidates) {
      for (let day = season.start; day + group.length - 1 <= season.end; day++) {
        if (group.some((_,i) => used.has(day+i))) continue;
        group.forEach((lesson,i) => {
          used.add(day+i);
          suggestions.set(String(lesson.id), { day:day+i, theme:season.label, provisional:true });
        });
        placed = true; break;
      }
      if (placed) break;
    }
    if (!placed) group.forEach(lesson => suggestions.set(String(lesson.id), null));
  }
  return suggestions;
}
