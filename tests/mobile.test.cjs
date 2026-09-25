const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const storage = fs.readFileSync('android/app/src/main/assets/storage.js', 'utf8');
const mobile = fs.readFileSync('android/app/src/main/assets/mobile.js', 'utf8');

test('Android storage supplies phone defaults without replacing saved choices or site storage', async () => {
  const dom = new JSDOM('', { url: 'https://archiveofourown.org', runScripts: 'outside-only' });
  const w = dom.window;
  w.localStorage.setItem('site-preferences', 'untouched');
  const adapter = w.eval(`(() => { ${storage}; return chrome.storage.local; })()`);
  const defaults = (await adapter.get(['settings'])).settings;
  assert.equal(defaults.libraryOpen, false);
  await adapter.set({ settings: { enabled: false, libraryOpen: true }, 'progress:101': { page: 2 } });
  assert.equal((await adapter.get(['settings'])).settings.enabled, false);
  assert.equal((await adapter.get(['settings'])).settings.libraryOpen, true);
  assert.equal((await adapter.get(null))['progress:101'].page, 2);
  assert.equal((await adapter.get(null))['site-preferences'], undefined);
  assert.equal(w.localStorage.getItem('site-preferences'), 'untouched');
  dom.window.close();
});

test('Android swipe turns pages only for horizontal story gestures', () => {
  const dom = new JSDOM('<div id="chapterlight-root"></div><main><p>原创中文故事</p><a href="#">link</a></main>', { runScripts: 'outside-only' });
  const w = dom.window;
  w.document.documentElement.classList.add('cl-paged');
  const ui = w.document.querySelector('#chapterlight-root').attachShadow({mode:'open'});
  ui.innerHTML = '<button id="page-next"></button><button id="page-previous"></button><div id="appearance" hidden></div><div id="contents" hidden></div>';
  let count = 0;
  ui.querySelector('#page-next').onclick = () => count++;
  ui.querySelector('#page-previous').onclick = () => count--;
  w.eval(mobile);
  function swipe(target, x, y) {
    const start = new w.Event('touchstart', { bubbles: true }); start.touches = [{clientX:200,clientY:200}]; target.dispatchEvent(start);
    const end = new w.Event('touchend', { bubbles: true }); end.changedTouches = [{clientX:x,clientY:y}]; target.dispatchEvent(end);
  }
  const p = w.document.querySelector('p');
  swipe(p, 80, 202); assert.equal(count, 1);
  swipe(p, 310, 205); assert.equal(count, 0);
  swipe(p, 190, 70); assert.equal(count, 0);
  swipe(w.document.querySelector('a'), 50, 200); assert.equal(count, 0);
  ui.querySelector('#appearance').hidden = false;
  swipe(p, 50, 200); assert.equal(count, 0);
  dom.window.close();
});
