import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFamilyBook, zipStore } from '../../book-export/family-epub.js';

const lesson = {id:'1',title:'God Created Me',scripture_ref:'Genesis 1:1',raw_text:'Title: God Created Me\nScripture: Genesis 1:1\n\nDevotional Thought\n\nGod created.\n\nReflection Questions\n\n1. What did God make?\n\nApplication\n\nGo outside.\n\nPrayer\n\nThank you, Lord. Amen.'};
test('exports only explicitly selected lessons and escapes HTML', () => {
 const files=buildFamilyBook([lesson]);
 assert.equal(files[0][0],'mimetype');
 assert.equal(files[0][1],'application/epub+zip');
 assert.ok(files.some(([path])=>path==='OEBPS/content.opf'));
 assert.ok(files.some(([path,body])=>path.endsWith('lesson-1.xhtml')&&body.includes('God Created Me')));
 assert.equal(files.filter(([path])=>path.endsWith('.xhtml')).length,2);
});
test('refuses empty selection and incomplete devotional', () => {
 assert.throws(()=>buildFamilyBook([]),/Select at least one/);
 assert.throws(()=>buildFamilyBook([{id:'x',title:'Empty',raw_text:'Title: Empty'}]),/Incomplete devotional/);
});
test('creates a ZIP with mimetype first and central directory',async () => {
 const blob=zipStore(buildFamilyBook([lesson]));
 const data=new Uint8Array(await blob.arrayBuffer());
 const view=new DataView(data.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);
 assert.equal(view.getUint16(8,true),0);
 assert.equal(new TextDecoder().decode(data.slice(30,38)),'mimetype');
 assert.equal(view.getUint32(data.length-22,true),0x06054b50);
});
