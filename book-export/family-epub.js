import { parseBookMetadata, parseBookSections } from './readiness.js';

const encoder = new TextEncoder();
const xml = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const p = value => String(value || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean).map(part => '<p>'+xml(part.replace(/\n/g,' '))+'</p>').join('\n');
const xhtml = (title, body) => '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>'+xml(title)+'</title><meta charset="UTF-8"/><link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+body+'</body></html>';
const date = () => new Date().toISOString().slice(0,10);
const css = 'body{font-family:serif;line-height:1.65;margin:5%}h1{font-size:2em;line-height:1.2}h2{font-size:1.35em;margin-top:2em}blockquote{margin:1.5em 0;padding:1em;border-top:1px solid #aaa;border-bottom:1px solid #aaa}li{margin-bottom:.8em}.subtle{color:#666;font-size:.9em}';

export function buildFamilyBook(lessons, { title = 'DevoBase Family Devotionals', edition = date() } = {}) {
  if (!Array.isArray(lessons) || !lessons.length) throw new Error('Select at least one devotional for the family edition.');
  const unique = new Set(lessons.map(l => String(l.id)));
  if (unique.size !== lessons.length) throw new Error('Duplicate devotional IDs in selection.');
  const entries = lessons.map((lesson,i) => {
    const meta = parseBookMetadata(lesson.raw_text || '');
    const sec = parseBookSections(lesson.raw_text || '');
    const name = String(lesson.title || meta.title || '').trim();
    if (!name || !sec.devotional.trim() || !sec.prayer.trim()) throw new Error('Incomplete devotional: '+(name || lesson.id));
    const scripture = meta.scripture || lesson.scripture_ref || '';
    const verse = meta.keyVerse || lesson.key_verse || '';
    const verseRef = meta.keyVerseRef || lesson.key_verse_ref || '';
    const body = '<h1>'+xml(name)+'</h1>'+
      (scripture ? '<p class="subtle">'+xml(scripture)+'</p>' : '')+
      (verse ? '<blockquote>'+p(verse)+(verseRef ? '<p class="subtle">'+xml(verseRef)+'</p>' : '')+'</blockquote>' : '')+
      '<h2>Devotional Thought</h2>'+p(sec.devotional)+
      (sec.numberedQuestions.length ? '<h2>Reflection Questions</h2><ol>'+sec.numberedQuestions.map(q=>'<li>'+xml(q)+'</li>').join('')+'</ol>' : '')+
      (sec.application.trim() ? '<h2>Application</h2>'+p(sec.application) : '')+
      '<h2>Prayer</h2>'+p(sec.prayer);
    return { id:String(lesson.id), title:name, href:'lesson-'+(i+1)+'.xhtml', body:xhtml(name,body) };
  });
  const identifier = 'urn:uuid:devobase-family-'+edition.replace(/[^0-9a-z-]/gi,'')+'-'+entries.length;
  const manifest = entries.map((e,i)=>'<item id="l'+i+'" href="'+e.href+'" media-type="application/xhtml+xml"/>').join('\n');
  const spine = entries.map((_,i)=>'<itemref idref="l'+i+'"/>').join('\n');
  const nav = xhtml('Contents','<nav epub:type="toc" id="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>Contents</h1><ol>'+entries.map(e=>'<li><a href="'+e.href+'">'+xml(e.title)+'</a></li>').join('')+'</ol></nav>');
  const opf = '<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">'+xml(identifier)+'</dc:identifier><dc:title>'+xml(title)+'</dc:title><dc:language>en</dc:language><dc:creator>DevoBase Family</dc:creator><meta property="dcterms:modified">'+edition+'T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/>'+manifest+'</manifest><spine>'+spine+'</spine></package>';
  return [
    ['mimetype','application/epub+zip'],
    ['META-INF/container.xml','<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'],
    ['OEBPS/content.opf',opf],['OEBPS/nav.xhtml',nav],['OEBPS/style.css',css],
    ...entries.map(e=>['OEBPS/'+e.href,e.body])
  ];
}
// EPUB ZIP writer: STORE only, so mimetype is first and uncompressed as required.
const u16 = (view,offset,n) => view.setUint16(offset,n,true);
const u32 = (view,offset,n) => view.setUint32(offset,n>>>0,true);
function crc32(bytes) {
  let crc = -1;
  for (const b of bytes) { crc ^= b; for(let j=0;j<8;j++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
  return (crc^-1)>>>0;
}
export function zipStore(files) {
  if (!files.length || files[0][0] !== 'mimetype') throw new Error('EPUB mimetype must be first.');
  const chunks=[], central=[]; let offset=0;
  for (const [name,text] of files) {
    const n=encoder.encode(name), data=encoder.encode(text), crc=crc32(data);
    const local=new Uint8Array(30+n.length), v=new DataView(local.buffer);
    u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u16(v,8,0);
    u32(v,14,crc);u32(v,18,data.length);u32(v,22,data.length);u16(v,26,n.length);
    local.set(n,30);chunks.push(local,data);
    const record=new Uint8Array(46+n.length), c=new DataView(record.buffer);
    u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u16(c,8,0x0800);
    u32(c,16,crc);u32(c,20,data.length);u32(c,24,data.length);u16(c,28,n.length);
    u32(c,42,offset);record.set(n,46);central.push(record);
    offset+=local.length+data.length;
  }
  const centralLength=central.reduce((sum,b)=>sum+b.length,0);
  const end=new Uint8Array(22),e=new DataView(end.buffer);
  u32(e,0,0x06054b50);u16(e,8,files.length);u16(e,10,files.length);
  u32(e,12,centralLength);u32(e,16,offset);
  return new Blob([...chunks,...central,end],{type:'application/epub+zip'});
}
export function exportFamilyEpub(lessons) {
  const blob=zipStore(buildFamilyBook(lessons));
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='DevoBase-Family-'+date()+'.epub';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  return lessons.length;
}
