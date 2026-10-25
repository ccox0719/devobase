import { buildBookReadinessReport } from './readiness.js';

const element = (tag, text, parent, cls) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = String(text);
  if (cls) node.className = cls;
  if (parent) parent.append(node);
  return node;
};

async function fetchLessons(client, userId) {
  const { count, error } = await client.from('devotional_lessons')
    .select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  if (count == null) throw new Error('Unable to verify lesson count.');
  const lessons = [];
  for (let offset = 0; offset < count; offset += 200) {
    const result = await client.from('devotional_lessons')
      .select('id,title,scripture_ref,key_verse,key_verse_ref,raw_text,series_name,series_order,created_at')
      .eq('user_id', userId).order('created_at', { ascending: true })
      .order('id', { ascending: true }).range(offset, offset + 199);
    if (result.error) throw result.error;
    lessons.push(...(result.data || []));
  }
  if (lessons.length !== count || new Set(lessons.map(x => x.id)).size !== count)
    throw new Error('Lesson collection changed during loading. Please retry.');
  return lessons;
}

const css = `
.book-admin { position:fixed;inset:0;z-index:22000;overflow:auto;background:#f2ece0;color:#1e1a12;font:14px/1.65 'Karla',sans-serif; }
.book-admin * {box-sizing:border-box}
.book-admin .admin-wrap {max-width:1100px;margin:auto;padding:26px 22px 90px}
.book-admin h1 {font:400 clamp(35px,7vw,53px)/1.1 'Cormorant Garamond',Georgia,serif;margin:10px 0}
.book-admin h2 {font:500 28px 'Cormorant Garamond',Georgia,serif;margin:24px 0 10px}
.book-admin .eyebrow {text-transform:uppercase;letter-spacing:.16em;color:#b07d2a;font-size:11px}
.book-admin .muted {color:#7a6e58}
.book-admin button,.book-admin select,.book-admin input {font:inherit;border:1px solid #d6cbb6;background:#faf6ee;color:#1e1a12;border-radius:4px;padding:9px 12px}
.book-admin button {cursor:pointer}
.book-admin .toolbar {display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:24px 0}
.book-admin .toolbar input {flex:1;min-width:180px}
.book-admin .stats {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:25px 0}
.book-admin .stat,.book-admin .lesson {background:#faf6ee;border:1px solid #ddd5be;border-radius:5px;padding:15px}
.book-admin .stat strong {display:block;font:500 34px 'Cormorant Garamond',Georgia,serif}
.book-admin .stat span {font-size:12px;color:#7a6e58}
.book-admin .lesson {margin-bottom:10px}
.book-admin .lesson summary {cursor:pointer;list-style:none}
.book-admin .lesson summary::-webkit-details-marker {display:none}
.book-admin .lesson-title {font:500 24px 'Cormorant Garamond',Georgia,serif}
.book-admin .lesson-meta {color:#7a6e58;font-size:12px;margin-top:3px}
.book-admin .pill {display:inline-block;border:1px solid #d6cbb6;border-radius:20px;padding:2px 9px;margin-top:9px;font-size:11px}
.book-admin .lesson-body {border-top:1px solid #ddd5be;margin-top:15px;padding-top:12px}
.book-admin .original {white-space:pre-wrap;overflow-wrap:anywhere;background:#f2ece0;border:1px solid #ddd5be;padding:15px;max-height:460px;overflow:auto;font:13px/1.7 'Karla',sans-serif}
.book-admin .hint {background:#e9dfc9;padding:12px 15px;margin:20px 0;border-radius:4px}
.book-admin .empty {padding:24px;text-align:center;color:#7a6e58}
@media(max-width:620px){.book-admin .stats{grid-template-columns:repeat(2,minmax(0,1fr))}.book-admin .admin-wrap{padding:20px 16px 70px}}
`;

export async function mountBookAdmin({ client, userId }) {
  document.getElementById('devobaseBookAdmin')?.remove();
  const root = element('div', null, document.body, 'book-admin');
  root.id = 'devobaseBookAdmin';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Private Book Admin');
  element('style', css, root);
  const wrap = element('div', null, root, 'admin-wrap');
  const close = element('button', '← Back to Library', wrap);
  close.onclick = () => root.remove();
  element('div', 'PRIVATE EDITORIAL WORKSPACE', wrap, 'eyebrow');
  element('h1', 'Book Admin', wrap);
  element('p', 'Review the collection before arranging and approving the 365-day book.', wrap, 'muted');
  element('div', 'Read-only preview. No approval or reading-day changes can be saved here. No lessons are automatically published.', wrap, 'hint');
  const status = element('div', 'Loading and verifying your library…', wrap);
  status.setAttribute('role', 'status');
  try {
    const lessons = await fetchLessons(client, userId);
    if (!root.isConnected) return;
    const report = buildBookReadinessReport(lessons);
    const byId = new Map(lessons.map(lesson => [String(lesson.id), lesson]));
    status.replaceChildren();
    const stats = element('div', null, status, 'stats');
    for (const [value,label] of [
      [report.total,'Saved lessons'],[report.structurallyComplete,'Structurally complete'],
      [report.formattingReview,'Formatting review'],[365,'Target reading days']
    ]) {
      const card = element('div', null, stats, 'stat');
      element('strong', value, card); element('span', label, card);
    }
    element('h2', 'Publication planning', status);
    element('p', 'Approved: not yet tracked. Assigned days: not yet tracked. Unfilled days: cannot be calculated until approvals and ordering are implemented.', status, 'muted');
    element('h2', 'Lesson review', status);
    const toolbar = element('div', null, status, 'toolbar');
    const search = element('input', null, toolbar);
    search.type = 'search'; search.placeholder = 'Search title, Scripture, or series';
    search.setAttribute('aria-label','Search lessons');
    const filter = element('select', null, toolbar);
    filter.setAttribute('aria-label','Filter by formatting status');
    for (const [value,label] of [
      ['all','All lessons'],['complete','Structurally complete'],
      ['formatting_review','Formatting review'],['missing_content','Likely missing content']
    ]) { const option = element('option',label,filter); option.value=value; }
    const list = element('div', null, status);
    function render() {
      list.replaceChildren();
      const term = search.value.toLocaleLowerCase().trim();
      const matches = report.entries.filter(item =>
        (filter.value === 'all' || item.reviewStatus === filter.value) &&
        [item.title,item.scripture,item.seriesName].some(value => String(value || '').toLocaleLowerCase().includes(term))
      );
      element('p', matches.length + ' of ' + report.total + ' lessons', list, 'muted');
      if (!matches.length) element('p','No lessons match your filters.',list,'empty');
      for (const item of matches) {
        const details = element('details', null, list, 'lesson');
        const summary = element('summary', null, details);
        element('div',item.title,summary,'lesson-title');
        element('div',[item.scripture,item.seriesName ? 'Series: '+item.seriesName+(item.seriesOrder == null ? '' : ' · '+item.seriesOrder) : 'Standalone'].filter(Boolean).join(' · '),summary,'lesson-meta');
        const label = item.complete ? 'Structurally complete' : item.reviewStatus === 'formatting_review' ? 'Formatting review' : 'Likely missing content';
        element('span',label,summary,'pill');
        const body = element('div',null,details,'lesson-body');
        element('p','Publication: Not assessed · Reading day: Not assigned',body);
        element('p','Checks: '+Object.entries(item.checks).map(([name,ok]) => name+': '+(ok?'Pass':'Review')).join(' · '),body,'muted');
        if (item.formattingIssues.length) element('p','Detection issues: '+item.formattingIssues.join(', '),body);
        if (item.missingContent.length) element('p','Check original for: '+item.missingContent.join(', '),body);
        element('h2','Original lesson text',body);
        element('div',byId.get(String(item.id))?.raw_text || 'No original text stored.',body,'original');
      }
    }
    search.addEventListener('input',render);
    filter.addEventListener('change',render);
    render();
  } catch (error) {
    if (root.isConnected) status.textContent = 'Could not safely load the complete library: '+(error?.message || 'Unknown error');
  }
}
