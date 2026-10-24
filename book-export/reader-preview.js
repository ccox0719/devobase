import { parseBookMetadata, parseBookSections } from './readiness.js';

const make = (tag, text, parent, className) => {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  if (parent) parent.append(node);
  return node;
};

async function loadOwnedLessons(client, userId) {
  const { count, error } = await client.from('devotional_lessons')
    .select('id', { head: true, count: 'exact' }).eq('user_id', userId);
  if (error) throw error;
  if (count === null) throw new Error('Unable to verify lesson count.');
  const lessons = [];
  for (let i = 0; i < count; i += 200) {
    const page = await client.from('devotional_lessons')
      .select('id,title,scripture_ref,key_verse,key_verse_ref,raw_text,created_at')
      .eq('user_id', userId).order('created_at', { ascending: true })
      .order('id', { ascending: true }).range(i, i + 199);
    if (page.error) throw page.error;
    lessons.push(...(page.data || []));
  }
  if (lessons.length !== count || new Set(lessons.map(x => x.id)).size !== count)
    throw new Error('Lesson collection changed during loading. Please retry.');
  return lessons;
}

const css = `
.reader-preview { position:fixed; inset:0; z-index:21000; overflow:auto; background:#f2ece0; color:#1e1a12; font-family:'Karla',sans-serif; }
.reader-preview * { box-sizing:border-box; }
.reader-preview .reader-top { max-width:760px; margin:auto; padding:18px 22px; display:flex; justify-content:space-between; align-items:center; gap:12px; border-bottom:1px solid #ddd5be; }
.reader-preview button,.reader-preview select { font:inherit; background:#faf6ee; color:#4a4030; border:1px solid #ddd5be; border-radius:4px; padding:10px 12px; cursor:pointer; }
.reader-preview button:disabled { opacity:.35; cursor:default; }
.reader-preview .reader-page { max-width:680px; margin:0 auto; padding:34px 26px 90px; }
.reader-preview .reader-kicker { font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#b07d2a; text-align:center; }
.reader-preview h1 { font:400 clamp(39px,8vw,64px)/1.07 'Cormorant Garamond',Georgia,serif; text-align:center; margin:16px 0; }
.reader-preview .reader-ref { color:#7a6e58; text-align:center; margin-bottom:32px; }
.reader-preview .reader-verse { padding:23px 20px; margin:0 0 35px; border-top:1px solid #d6c6a4; border-bottom:1px solid #d6c6a4; text-align:center; font:italic 400 26px/1.35 'Cormorant Garamond',Georgia,serif; }
.reader-preview .reader-verse small { display:block; font:12px/1.6 'Karla',sans-serif; color:#7a6e58; margin-top:10px; }
.reader-preview h2 { font:500 29px 'Cormorant Garamond',Georgia,serif; margin:30px 0 14px; }
.reader-preview .reader-prose p { font-size:17px; line-height:1.85; margin:0 0 19px; white-space:pre-wrap; }
.reader-preview ol { padding-left:24px; font-size:16px; line-height:1.8; }
.reader-preview li { padding-left:5px; margin-bottom:12px; }
.reader-preview .reader-divider { height:1px; background:#ddd5be; margin:35px 0 22px; }
.reader-preview .reader-nav { display:flex; justify-content:space-between; gap:12px; border-top:1px solid #ddd5be; margin-top:45px; padding-top:24px; }
.reader-preview .reader-preview-banner { background:#e9dfc9; padding:12px 20px; text-align:center; font-size:12px; line-height:1.6; color:#4a4030; }
.reader-preview .reader-select { max-width:100%; min-width:0; }
@media (max-width:480px) { .reader-preview .reader-page { padding:26px 22px 80px; } .reader-preview .reader-top { flex-wrap:wrap; } .reader-preview .reader-prose p { font-size:16px; } }
`;

function addParagraphs(parent, value) {
  const holder = make('div', null, parent, 'reader-prose');
  for (const paragraph of String(value || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean))
    make('p', paragraph, holder);
}

export async function mountReaderPreview({ client, userId }) {
  document.getElementById('devobaseReaderPreview')?.remove();
  const root = make('div', null, document.body, 'reader-preview');
  root.id = 'devobaseReaderPreview';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Private devotional reader preview');
  const style = make('style', css, root);
  const banner = make('div', 'PRIVATE PREVIEW · These lessons are not approved or published. Order is temporary.', root, 'reader-preview-banner');
  const top = make('div', null, root, 'reader-top');
  const back = make('button', '← Library', top);
  back.onclick = () => root.remove();
  const chooser = make('select', null, top, 'reader-select');
  chooser.setAttribute('aria-label', 'Choose a devotional');
  const page = make('main', 'Loading your devotional library…', root, 'reader-page');
  try {
    const lessons = await loadOwnedLessons(client, userId);
    if (!root.isConnected) return;
    if (!lessons.length) { page.textContent = 'No devotionals are saved yet.'; return; }
    lessons.forEach((lesson, i) => {
      const option = make('option', lesson.title || 'Untitled', chooser);
      option.value = String(i);
    });
    let position = 0;
    function render() {
      const lesson = lessons[position];
      chooser.value = String(position);
      const meta = parseBookMetadata(lesson.raw_text);
      const sections = parseBookSections(lesson.raw_text);
      page.replaceChildren();
      make('div', 'DEVOTIONAL LIBRARY · READER PREVIEW', page, 'reader-kicker');
      make('h1', meta.title || lesson.title || 'Untitled', page);
      make('div', meta.scripture || lesson.scripture_ref || '', page, 'reader-ref');
      const verse = meta.keyVerse || lesson.key_verse;
      if (verse) {
        const quote = make('blockquote', '“' + verse + '”', page, 'reader-verse');
        make('small', meta.keyVerseRef || lesson.key_verse_ref || '', quote);
      }
      const section = (heading, content, numbered = false) => {
        if (!content || (Array.isArray(content) && !content.length)) return;
        make('div', null, page, 'reader-divider');
        make('h2', heading, page);
        if (numbered) {
          const ol = make('ol', null, page);
          for (const question of content) make('li', question, ol);
        } else addParagraphs(page, content);
      };
      section('Devotional Thought', sections.devotional);
      section('Reflection Questions', sections.numberedQuestions, true);
      section('Application', sections.application);
      section('Prayer', sections.prayer);
      const nav = make('div', null, page, 'reader-nav');
      const prev = make('button', '← Previous', nav);
      const next = make('button', 'Next →', nav);
      prev.disabled = position === 0;
      next.disabled = position === lessons.length - 1;
      prev.onclick = () => { position--; render(); root.scrollTo(0,0); };
      next.onclick = () => { position++; render(); root.scrollTo(0,0); };
    }
    chooser.onchange = () => { position = Number(chooser.value); render(); root.scrollTo(0,0); };
    render();
  } catch (err) {
    if (root.isConnected) page.textContent = 'Reader preview could not load safely: ' + (err?.message || 'Unknown error');
  }
}
