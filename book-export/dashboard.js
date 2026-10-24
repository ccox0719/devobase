import { buildBookReadinessReport } from './readiness.js';
const el = (tag, text, parent) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (parent) parent.append(node); return node; };
async function fetchLessons(client, userId) {
  const { count, error } = await client.from('devotional_lessons').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  if (count == null) throw new Error('Could not verify total lesson count');
  const lessons = [];
  for (let offset = 0; offset < count; offset += 200) {
    const result = await client.from('devotional_lessons').select('id,title,scripture_ref,key_verse,key_verse_ref,raw_text,series_name,series_order,created_at').eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 199);
    if (result.error) throw result.error;
    lessons.push(...(result.data || []));
  }
  if (lessons.length !== count || new Set(lessons.map(x => x.id)).size !== count) throw new Error('Library changed during retrieval or a page is missing. Please retry.');
  return lessons;
}
export async function mountBookReadiness({ client, userId }) {
  document.getElementById('bookReadinessOverlay')?.remove();
  const overlay = el('div', null, document.body); overlay.id = 'bookReadinessOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:20000;overflow:auto;background:#f7f5f0;color:#282820;padding:20px;font:15px/1.6 system-ui,sans-serif';
  const wrap = el('div', null, overlay); wrap.style.cssText = 'max-width:1000px;margin:0 auto';
  el('h1', 'Book Readiness', wrap).style.fontFamily = 'Georgia,serif';
  el('p', 'Private editorial dashboard · Read-only', wrap);
  const close = el('button', '← Return to Library', wrap); close.type = 'button'; close.onclick = () => overlay.remove();
  const status = el('div', 'Loading and verifying all lessons…', wrap); status.setAttribute('role','status');
  try {
    const lessons = await fetchLessons(client, userId);
    if (!overlay.isConnected) return;
    const report = buildBookReadinessReport(lessons); status.replaceChildren();
    const summary = el('div', null, status); summary.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin:20px 0';
    for (const [label, value] of [['Saved',report.total],['Structurally complete',report.structurallyComplete],['Needs review',report.needsReview]]) {
      const card = el('div', null, summary); card.style.cssText = 'flex:1;min-width:140px;background:white;border:1px solid #ddd;padding:16px;border-radius:10px';
      el('strong', String(value), card).style.fontSize = '28px'; el('div', label, card);
    }
    el('p','No publication approval field exists yet. Completeness is not publication approval. No lessons were changed.',status);
    const search = el('input',null,status); search.type='search'; search.placeholder='Search title, Scripture, or series'; search.style.cssText='padding:12px;width:65%;max-width:420px;margin:8px;border:1px solid #aaa;border-radius:7px';
    const filter = el('select',null,status); filter.style.cssText='padding:12px;border:1px solid #aaa;border-radius:7px';
    for (const [value,label] of [['all','All lessons'],['ready','Structurally complete'],['review','Needs review']]) { const option=el('option',label,filter); option.value=value; }
    const list = el('div',null,status);
    const render = () => {
      list.replaceChildren();
      const term=search.value.toLowerCase().trim();
      const matches=report.entries.filter(item => (filter.value==='all'||(filter.value==='ready')===item.complete) && [item.title,item.scripture,item.seriesName].some(s=>String(s||'').toLowerCase().includes(term)));
      el('p',String(matches.length)+' of '+report.total+' lessons',list);
      for (const item of matches) {
        const details=el('details',null,list); details.style.cssText='background:white;border:1px solid #ddd;padding:14px;margin:8px 0;border-radius:8px';
        el('summary',(item.complete?'✓ ':'⚠ ')+item.title+' · '+item.scripture,details).style.cursor='pointer';
        el('p','Series: '+(item.seriesName||'Standalone')+(item.seriesOrder==null?'':' · '+item.seriesOrder),details);
        el('p','Key verse: '+(item.keyVerse||'Not detected')+(item.keyVerseRef?' · '+item.keyVerseRef:''),details);
        el('p','Checks: '+Object.entries(item.checks).map(([k,v])=>(v?'✓ ':'✕ ')+k).join(' · '),details);
        if (item.missing.length) el('p','Review: '+item.missing.join(', '),details);
        el('small','Publication approval: not assessed',details);
      }
    };
    search.addEventListener('input',render); filter.addEventListener('change',render); render();
  } catch (error) { if (overlay.isConnected) status.textContent='Could not safely load the complete library: '+(error?.message||'Unknown error'); }
}
