import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestReadingDays } from '../../book-export/suggested-days.js';

test('reserves December for Advent entries and leaves approval untouched', () => {
  const lessons = [
    { id: 'a', title: 'God Created Me', raw_text: 'Creation is good.' },
    { id: 'b', title: 'Advent: The Birth of Jesus', raw_text: 'Bethlehem and the manger.' },
    { id: 'c', title: 'Learning to Trust God', raw_text: 'Fear and uncertainty.' },
  ];
  const before = JSON.stringify(lessons);
  const days = suggestReadingDays(lessons);
  assert.ok(days.get('a').day <= 31);
  assert.ok(days.get('b').day >= 335);
  assert.ok(days.get('c').day >= 91 && days.get('c').day <= 151);
  assert.equal(new Set([...days.values()].filter(Boolean).map(x=>x.day)).size, 3);
  assert.equal(JSON.stringify(lessons), before);
});

test('keeps ordered series entries adjacent', () => {
  const lessons = [
    {id:'2',title:'Trust Part Two',series_name:'The Next Faithful Step',series_order:2},
    {id:'1',title:'Trust Part One',series_name:'The Next Faithful Step',series_order:1},
  ];
  const days = suggestReadingDays(lessons);
  assert.equal(days.get('2').day, days.get('1').day + 1);
});

test('never fills reserved Advent days with unrelated entries', () => {
  const lessons = Array.from({length:340},(_,i)=>({id:String(i),title:'Untitled lesson '+i}));
  const days = suggestReadingDays(lessons);
  assert.ok([...days.values()].filter(Boolean).every(x=>x.day < 335));
});
