const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('extension/library.js', 'utf8');
function setup() {
  const dom = new JSDOM('', { url: 'https://archiveofourown.org', runScripts: 'outside-only' }); dom.window.eval(source);
  const data = {}; const storage = { async get(keys) { return Object.fromEntries((keys || Object.keys(data)).map(key => [key, data[key]])); }, async set(value) { Object.assign(data, structuredClone(value)); } };
  return { library: new dom.window.ChapterlightLibrary(storage, 'https://archiveofourown.org'), data, close: () => dom.window.close() };
}
test('independent bookmark keys avoid losing simultaneous saves and validate work URLs', async () => {
  const b = setup(); const work = { id: '123', title: 'Novel', url: 'https://archiveofourown.org/works/123' };
  const position = { url: work.url, index: 4, text: 'a passage' };
  await Promise.all([b.library.bookmark(work, position, 'A'), b.library.bookmark(work, position, 'B')]);
  assert.equal((await b.library.entries()).bookmarks.length, 2);
  await assert.rejects(b.library.bookmark(work, { url: 'https://evil.example/works/123' }, 'bad'));
  await assert.rejects(b.library.bookmark(work, { url: 'https://archiveofourown.org/works/999' }, 'bad'));
  b.close();
});
test('history uses latest saved chapter and text position, not the most recently opened URL', async () => {
  const b = setup(); await b.library.visit({ id: '123', title: 'Novel', url: 'https://archiveofourown.org/works/123' });
  b.data['progress:123'] = { url: 'https://archiveofourown.org/works/123/chapters/456', updated: Date.now(), pageAnchor: { index: 3, character: 90, text: 'line' } };
  const entry = (await b.library.entries()).history[0];
  assert.equal(entry.url, b.data['progress:123'].url); assert.equal(entry.position.pageAnchor.character, 90);
  b.data['progress:123'].url = 'https://evil.example/works/123';
  assert.equal((await b.library.entries()).history[0].position, null); b.close();
});
test('positions saved by previous versions appear in history without extra metadata', async () => {
  const b = setup(); b.data['progress:42'] = { url: 'https://archiveofourown.org/works/42/chapters/99', index: 3, updated: 12 };
  const entries = await b.library.entries(); assert.equal(entries.history.length, 1);
  assert.equal(entries.history[0].id, '42'); assert.equal(entries.history[0].position.index, 3); b.close();
});
