import { buildBookReadinessReport } from './readiness.js';
import { suggestReadingDays, BOOK_SEASONS } from './suggested-days.js';
import { BOOK_TARGET, bookProgress } from './progress.js';

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
      .select('id,title,scripture_ref,key_verse,key_verse_ref,raw_text,series_name,series_order,editorial_status,assigned_day,created_at')
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
.book-admin button,.book-admin select,.book-admin input,.book-admin textarea {font:inherit;border:1px solid #d6cbb6;background:#faf6ee;color:#1e1a12;border-radius:4px;padding:9px 12px}
.book-admin button {cursor:pointer}
.book-admin .toolbar {display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:24px 0}
.book-admin .toolbar input {flex:1;min-width:180px}
.book-admin .stats {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:25px 0}
.book-admin .stat,.book-admin .lesson {background:#faf6ee;border:1px solid #ddd5be;border-radius:5px;padding:15px}
.book-admin .stat strong {display:block;font:500 34px 'Cormorant Garamond',Georgia,serif}
.book-admin .stat span {font-size:12px;color:#7a6e58}
.book-admin .progress-card {background:#1e1a12;color:#faf6ee;border-radius:6px;padding:20px;margin:25px 0}
.book-admin .progress-card h2 {margin:0;color:#faf6ee;font-size:clamp(25px,5vw,32px)}
.book-admin .progress-card p {margin:6px 0;color:#e9dfc9}
.book-admin .progress-track {height:14px;background:#5c5344;border-radius:999px;overflow:hidden;margin:15px 0 9px}
.book-admin .progress-fill {height:100%;background:#d6a84c;border-radius:inherit;transition:width .2s ease}
.book-admin .progress-meta {display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:12px}
.book-admin .progress-meta strong {color:#faf6ee;font-size:16px}
.book-admin .lesson {margin-bottom:10px}
.book-admin .editor {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:15px 0}
.book-admin .editor label {display:flex;flex-direction:column;gap:5px;font-weight:600}
.book-admin .editor .wide {grid-column:1/-1}
.book-admin .editor textarea {width:100%;min-height:260px;white-space:pre-wrap;font:13px/1.6 monospace}
.book-admin .editor input,.book-admin .editor select {width:100%;min-width:0}
.book-admin .editor .save {background:#4e6347;color:white}
@media(max-width:620px){.book-admin .editor {grid-template-columns:1fr}}
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
  element('div', 'Private editorial workspace. Changes save only when you press Save. Publication approval is always explicit.', wrap, 'hint');
  const status = element('div', 'Loading and verifying your library…', wrap);
  status.setAttribute('role', 'status');
  try {
    const lessons = await fetchLessons(client, userId);
    if (!root.isConnected) return;
    const report = buildBookReadinessReport(lessons);
    const progress = bookProgress(lessons.length, BOOK_TARGET);
    const byId = new Map(lessons.map(lesson => [String(lesson.id), lesson]));
    const suggestions = suggestReadingDays(lessons);
    status.replaceChildren();
    const progressCard = element('section', null, status, 'progress-card');
    progressCard.setAttribute('aria-label', '365-day devotional book progress');
    element('div', 'YOUR 365-DAY BOOK', progressCard, 'eyebrow');
    element('h2', `${progress.savedCount} saved devotionals toward ${progress.target}`, progressCard);
    element('p', progress.milestone, progressCard);
    const progressTrack = element('div', null, progressCard, 'progress-track');
    progressTrack.setAttribute('role', 'progressbar');
    progressTrack.setAttribute('aria-valuemin', '0');
    progressTrack.setAttribute('aria-valuemax', String(progress.target));
    progressTrack.setAttribute('aria-valuenow', String(Math.min(progress.savedCount, progress.target)));
    progressTrack.setAttribute('aria-valuetext', `${progress.savedCount} of ${progress.target} saved devotionals (${progress.percentage}%)`);
    const progressFill = element('div', null, progressTrack, 'progress-fill');
    progressFill.style.width = `${progress.displayPercentage}%`;
    const progressMeta = element('div', null, progressCard, 'progress-meta');
    element('strong', `${progress.percentage}% complete`, progressMeta);
    element('span', progress.remaining ? `${progress.remaining} to go` : 'Target reached', progressMeta);
    element('p', 'Saved devotionals are not automatically approved for publication. Editorial approval is tracked separately from saved lesson count.', progressCard);
    const stats = element('div', null, status, 'stats');
    for (const [value,label] of [
      [report.total,'Saved lessons'],[report.structurallyComplete,'Structurally complete'],
      [report.formattingReview,'Formatting review'],[lessons.filter(l=>l.editorial_status==='approved').length,'Approved for publication']
    ]) {
      const card = element('div', null, stats, 'stat');
      element('strong', value, card); element('span', label, card);
    }
    element('h2', 'Publication planning', status);
    element('p', 'Suggested reading days are provisional and based on title and theme keywords. They are not saved assignments or publication approvals. December is reserved for Advent and Christmas.', status, 'muted');
    element('p', BOOK_SEASONS.map(x => `Days ${x.start}–${x.end}: ${x.label}`).join(' · '), status, 'muted');
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
        const lesson = byId.get(String(item.id));
        const summary = element('summary', null, details);
        element('div',item.title,summary,'lesson-title');
        element('div',[item.scripture,item.seriesName ? 'Series: '+item.seriesName+(item.seriesOrder == null ? '' : ' · '+item.seriesOrder) : 'Standalone', suggestions.get(String(item.id)) ? 'Suggested day '+suggestions.get(String(item.id)).day : null].filter(Boolean).join(' · '),summary,'lesson-meta');
        const label = item.complete ? 'Structurally complete' : item.reviewStatus === 'formatting_review' ? 'Formatting review' : 'Likely missing content';
        element('span',label,summary,'pill');
        const body = element('div',null,details,'lesson-body');
        const suggestion = suggestions.get(String(item.id));
        element('p','Editorial status: '+(lesson.editorial_status || 'Needs Review')+' · Assigned day: '+(lesson.assigned_day || 'Not assigned')+' · Suggested day: '+(suggestion ? suggestion.day+' ('+suggestion.theme+')' : 'Awaiting space'),body);
        const editor = element('div',null,body,'editor');
        const field = (name,value,kind='input',wide=false) => {
          const label = element('label',name,editor,wide?'wide':'');
          const input = element(kind,null,label);
          if (kind !== 'select') input.value = value ?? '';
          return input;
        };
        const titleInput=field('Lesson title',lesson.title);
        const scriptureInput=field('Scripture reference',lesson.scripture_ref);
        const verseInput=field('Key verse text',lesson.key_verse,'textarea',true);
        verseInput.style.minHeight='75px';
        const verseRefInput=field('Key verse reference',lesson.key_verse_ref);
        const seriesInput=field('Series name',lesson.series_name);
        const seriesOrderInput=field('Series order',lesson.series_order);
        seriesOrderInput.type='number';seriesOrderInput.min='1';
        const dayInput=field('Assigned reading day (1–365)',lesson.assigned_day);
        dayInput.type='number';dayInput.min='1';dayInput.max='365';
        const statusInput=field('Editorial status',null,'select');
        for (const [value,label] of [['needs_review','Needs Review'],['needs_revision','Needs Revision'],['ready_for_approval','Ready for Approval'],['approved','Approved for Publication']]) {
          const option=element('option',label,statusInput);option.value=value;
        }
        statusInput.value=lesson.editorial_status || 'needs_review';
        const rawInput=field('Original devotional text (authoritative)',lesson.raw_text,'textarea',true);
        const actions=element('div',null,body,'toolbar');
        const save=element('button','Save Editorial Changes',actions);
        save.className='save';
        const message=element('span','',actions);
        save.onclick=async()=>{
          const dayText=dayInput.value.trim();
          const day=dayText ? Number(dayText) : null;
          const seriesOrderText=seriesOrderInput.value.trim();
          const seriesOrder=seriesOrderText ? Number(seriesOrderText) : null;
          const newStatus=statusInput.value;
          if (day!==null && (!Number.isInteger(day)||day<1||day>365)) {message.textContent='Reading day must be 1–365.';return;}
          if (seriesOrder!==null && (!Number.isInteger(seriesOrder)||seriesOrder<1)) {message.textContent='Series order must be positive.';return;}
          if (newStatus==='approved' && day===null) {message.textContent='Assign a reading day before approving.';return;}
          if (!titleInput.value.trim() || !rawInput.value.trim()) {message.textContent='Title and original text are required.';return;}
          if (day!==null && lessons.some(l=>String(l.id)!==String(lesson.id) && Number(l.assigned_day)===day)) {message.textContent='Day '+day+' is already assigned to another lesson.';return;}
          const changes={
            title:titleInput.value.trim(),scripture_ref:scriptureInput.value.trim(),
            key_verse:verseInput.value.trim(),key_verse_ref:verseRefInput.value.trim(),
            series_name:seriesInput.value.trim()||null,series_order:seriesOrder,
            raw_text:rawInput.value,assigned_day:day,editorial_status:newStatus
          };
          save.disabled=true;message.textContent='Saving…';
          try {
            const {data,error}=await client.from('devotional_lessons').update(changes)
              .eq('id',lesson.id).eq('user_id',userId).select('id').single();
            if(error) throw error;
            if(!data) throw new Error('No lesson was updated.');
            Object.assign(lesson,changes);
            message.textContent='Saved. Reopen Book Admin to refresh readiness and progress.';
          } catch(error) {message.textContent='Save failed: '+(error.message||'Unknown error');}
          finally {save.disabled=false;}
        };
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
