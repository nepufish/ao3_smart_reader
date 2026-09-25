const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('demo/index.html', 'utf8');
const fixture = fs.readFileSync('demo/fixture.js', 'utf8');
const reader = fs.readFileSync('extension/reader.js', 'utf8');
const pagination = fs.readFileSync('extension/pagination.js', 'utf8');
const library = fs.readFileSync('extension/library.js', 'utf8');
async function boot(path = '/works/101/chapters/201', initial = {}, prepare = () => {}) {
  const dom = new JSDOM(html, { url: 'https://archiveofourown.org' + path, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.eval(fixture);
  const data = structuredClone(initial);
  w.chrome.storage.local = { async get(keys) { return Object.fromEntries((keys || Object.keys(data)).map(k => [k, data[k]])); }, async set(values) { Object.assign(data, structuredClone(values)); } };
  w.performance.getEntriesByType = () => [];
  w.document.fonts = { ready: Promise.resolve() };
  const scrolls = [];
  w.scrollTo = value => scrolls.push(value);
  prepare(w);
  w.eval(pagination);
  w.eval(library);
  w.eval(reader);
  await new Promise(resolve => setTimeout(resolve, 35));
  return { w, data, scrolls, ui: w.document.querySelector('#chapterlight-root')?.shadowRoot, close: () => w.close() };
}
test('chapter reader preserves prose, builds all chapters and respects first-chapter boundary', async () => {
  const b = await boot();
  assert.ok(b.w.document.documentElement.classList.contains('cl-reading'));
  assert.equal(b.w.document.querySelectorAll('[role=article] p').length, 12);
  assert.equal(b.ui.querySelectorAll('.chapter-list a').length, 2);
  assert.equal(b.ui.querySelector('#next').href, 'https://archiveofourown.org/works/101/chapters/202');
  assert.equal(b.ui.querySelector('#previous').hidden, true);
  b.close();
});
test('entire work gets local chapter anchors; one-shot still activates; content gate stays untouched', async () => {
  const full = await boot('/works/101?view_full_work=true');
  assert.deepEqual([...full.ui.querySelectorAll('.chapter-list a')].map(a => a.hash), ['#chapter-1', '#chapter-2']); full.close();
  const one = await boot('/works/102'); assert.ok(one.ui); one.close();
  const gate = await boot('/works/103'); assert.ok(gate.ui); assert.equal(gate.ui.querySelector('.launch'), null); assert.equal(gate.ui.querySelector('#contents-button').hidden, true); assert.equal(gate.w.document.querySelector('#cl-page-viewport'), null); assert.equal(gate.w.document.documentElement.classList.contains('cl-reading'), false); assert.equal(Object.keys(gate.data).length, 0); gate.close();
});
test('theme and typography persist with a floating reader switch', async () => {
  const b = await boot();
  b.ui.querySelector('[data-theme=dark]').click();
  assert.equal(b.w.document.documentElement.dataset.clTheme, 'dark');
  assert.equal(b.data.settings.theme, 'dark');
  const range = b.ui.querySelector('#size'); range.value = '25'; range.dispatchEvent(new b.w.Event('input'));
  assert.equal(b.w.document.documentElement.style.getPropertyValue('--cl-size'), '25px');
  assert.equal(b.ui.querySelector('#exit'), null);
  assert.equal(b.ui.querySelector('.launch'), null);
  assert.ok(b.w.document.documentElement.classList.contains('cl-reading')); b.close();
});

test('native search and list pages retain the bar, library and original content without reader effects', async () => {
  const initial = {
    settings: { mode: 'paged', enabled: true },
    'history:101': { id: '101', title: 'A saved novel', url: 'https://archiveofourown.org/works/101', visited: 1 },
    'progress:101': { url: 'https://archiveofourown.org/works/101/chapters/202', chapter: 'chapter-2', index: 3 },
    'bookmark:test': { id: 'test', workId: '101', title: 'A saved novel', label: 'My place', position: { url: 'https://archiveofourown.org/works/101', index: 2 }, created: 1 }
  };
  for (const path of ['/works/search?q=test', '/tags/example/works', '/users/example', '/works/101/comments']) {
    let original;
    const b = await boot(path, initial, w => {
      const main = w.document.querySelector('#main');
      main.innerHTML = '<h1>Search results</h1><form><input name="q"><button>Search</button></form><ol><li class="work"><p class="userstuff">A result summary</p><a href="/works/101">Read</a></li></ol>';
      original = main.innerHTML;
    });
    assert.equal(b.w.document.querySelector('#main').innerHTML, original);
    assert.equal(b.w.document.body.firstElementChild, b.ui.host);
    assert.equal(b.ui.querySelector('.top').hidden, false);
    assert.equal(b.ui.querySelector('.bottom').hidden, true);
    assert.equal(b.ui.querySelector('.launch'), null);
    assert.equal(b.ui.host.dataset.native, 'true');
    assert.equal(b.ui.querySelector('#reader-switch').hidden, false);
    assert.equal(b.w.document.documentElement.classList.contains('cl-browsing'), true);
    assert.equal(b.w.document.querySelector('#cl-page-viewport'), null);
    assert.equal(b.w.document.documentElement.classList.contains('cl-reading'), false);
    const key = new b.w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    b.w.document.dispatchEvent(key); assert.equal(key.defaultPrevented, false);
    const wheel = new b.w.WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
    b.w.document.dispatchEvent(wheel); assert.equal(wheel.defaultPrevented, false);
    assert.equal(b.ui.querySelector('#library').hidden, false);
    assert.equal(b.ui.querySelector('.library-item a').textContent, 'A saved novel');
    assert.ok(b.ui.querySelector('.library-item a').href.endsWith('/202#cl-resume'));
    b.ui.querySelector('#bookmarks-tab').click();
    assert.equal(b.ui.querySelector('.library-item a').textContent, 'My place');
    assert.equal(b.ui.querySelector('#bookmark-form').hidden, true);
    b.ui.querySelector('#record-position').click();
    b.w.dispatchEvent(new b.w.Event('pagehide'));
    assert.deepEqual(b.data, initial); b.close();
  }
});

test('settings reject invalid stored values and unsafe cross-site resume links', async () => {
  const b = await boot(undefined, { settings: { size: 999, font: 'bad', theme: 'bad' }, 'progress:101': { url: 'https://evil.example/works/101', chapter: 'chapter-1' } });
  assert.equal(b.ui.querySelector('#size').value, '30'); assert.equal(b.ui.querySelector('#font').value, 'serif');
  assert.equal(b.ui.querySelector('.resume').hidden, true); b.close();
});

test('original AO3 navigation survives paging with forms, handlers and measured height intact', async () => {
  let nav, form, input, calls = 0;
  const b = await boot(undefined, {}, w => {
    const header = w.document.querySelector('#header');
    header.innerHTML = '<h1>AO3</h1><div id="login">Login</div><nav aria-label="Site"><ul class="primary navigation"><li><a href="/menu/fandoms">Fandoms</a></li></ul><form action="/works/search"><input name="work_search[query]" value="a query"><button>Search</button></form></nav>';
    nav = header.querySelector('nav'); form = nav.querySelector('form'); input = form.querySelector('input');
    form.addEventListener('submit', e => { e.preventDefault(); calls++; });
    header.getBoundingClientRect = () => ({ height: 42 });
  });
  assert.equal(b.w.document.querySelector('#header nav'), nav);
  assert.equal(nav.querySelector('form'), form);
  assert.equal(input.value, 'a query');
  assert.equal(nav.closest('.cl-page-background'), null);
  assert.equal(nav.closest('.cl-site-header-extra'), null);
  assert.equal(b.w.document.documentElement.style.getPropertyValue('--cl-nav-height'), '42px');
  const wheel = new b.w.WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
  nav.dispatchEvent(wheel); assert.equal(wheel.defaultPrevented, false);
  const space = new b.w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  input.dispatchEvent(space); assert.equal(space.defaultPrevented, false);
  form.dispatchEvent(new b.w.Event('submit', { bubbles: true, cancelable: true })); assert.equal(calls, 1);
  const mode = b.ui.querySelector('#mode');
  for (const value of ['scroll', 'paged', 'scroll', 'paged']) {
    mode.value = value; mode.dispatchEvent(new b.w.Event('change'));
    assert.equal(nav.closest('.cl-page-background'), null);
    assert.equal(nav.querySelector('form'), form);
  }
  assert.equal(b.ui.querySelector('#exit'), null); assert.equal(b.ui.querySelector('.launch'), null);
  b.close();
});
test('another chapter offers safe resume and does not overwrite saved progress on load', async () => {
  const original = { url: 'https://archiveofourown.org/works/101/chapters/202', chapter: 'chapter-2', index: 4 };
  const b = await boot(undefined, { 'progress:101': original });
  assert.equal(b.ui.querySelector('.resume').hidden, false);
  assert.equal(b.ui.querySelector('#resume-link').href, original.url + '#cl-resume');
  assert.deepEqual(b.data['progress:101'], original); b.close();
});
test('reading position saves after interaction and restores on reload', async () => {
  const b = await boot(undefined, { settings: { mode: 'scroll' } });
  const paragraphs = [...b.w.document.querySelectorAll('[role=article] p')];
  paragraphs.forEach((p, i) => { p.getBoundingClientRect = () => ({ top: (i - 5) * 120, bottom: (i - 5) * 120 + 110, height: 110 }); });
  b.w.dispatchEvent(new b.w.WheelEvent('wheel'));
  b.w.dispatchEvent(new b.w.Event('scroll'));
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(b.data['progress:101'].index, 5);
  assert.ok(b.data['progress:101'].text.includes('或许'));
  assert.equal(b.ui.querySelector('.library-item .excerpt').textContent, b.data['progress:101'].excerpt);
  const copy = structuredClone(b.data); b.close();
  const restored = await boot(undefined, copy); assert.ok(restored.scrolls.length > 0); restored.close();
  const anchored = await boot('/works/101/chapters/201#chapters', copy); assert.equal(anchored.scrolls.length, 0); anchored.close();
});
test('Escape returns focus and the former exit shortcut leaves the reader active', async () => {
  const b = await boot();
  b.ui.querySelector('#appearance-button').click();
  assert.equal(b.ui.querySelector('#appearance').hidden, false);
  b.w.document.dispatchEvent(new b.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(b.ui.querySelector('#appearance').hidden, true);
  assert.equal(b.ui.activeElement.id, 'appearance-button');
  b.ui.querySelector('#size').dispatchEvent(new b.w.KeyboardEvent('keydown', { code: 'KeyR', altKey: true, shiftKey: true, bubbles: true, composed: true }));
  assert.ok(b.w.document.documentElement.classList.contains('cl-reading'));
  b.w.document.dispatchEvent(new b.w.KeyboardEvent('keydown', { code: 'KeyR', altKey: true, shiftKey: true, bubbles: true }));
  assert.equal(b.w.document.documentElement.classList.contains('cl-reading'), true); b.close();
});
test('appearance changes preserve the top of the page before the story starts', async () => {
  const b = await boot(undefined, { settings: { mode: 'scroll' } });
  b.w.document.querySelector('[role=article] p').getBoundingClientRect = () => ({ top: 600, bottom: 800, height: 200 });
  b.ui.querySelector('[data-theme=dark]').click();
  assert.equal(b.scrolls.length, 0); b.close();
});
test('unspaced Chinese is counted by character, including traditional and supplementary Han', async () => {
  const b = await boot(undefined, { settings: { mode: 'scroll' } }, w => {
    w.document.querySelector('[role=article]').textContent = '閱讀𠀀'.repeat(500) + '，。！？';
    w.document.querySelector('#chapters').getBoundingClientRect = () => ({ top: 100, height: 10000 });
  });
  assert.equal(b.ui.querySelector('#text-count').textContent, '本页 1,500 汉字');
  assert.equal(b.ui.querySelector('#remaining').textContent, '本页剩余约 3 分钟');
  const speed = b.ui.querySelector('#speed'); speed.value = '1000'; speed.dispatchEvent(new b.w.Event('input'));
  assert.equal(b.ui.querySelector('#remaining').textContent, '本页剩余约 2 分钟');
  assert.equal(b.data.settings.speed, 1000); b.close();
});
test('mixed Chinese and English contributes to estimates without double-counting nested text', async () => {
  const b = await boot(undefined, { settings: { mode: 'scroll' } }, w => {
    w.document.querySelector('[role=article]').innerHTML = `<blockquote><p>${'繁體'.repeat(500)}</p></blockquote><p>${'hello '.repeat(230)}</p>`;
    w.document.querySelector('#chapters').getBoundingClientRect = () => ({ top: 100, height: 10000 });
  });
  assert.equal(b.ui.querySelector('#text-count').textContent, '本页 1,000 汉字');
  assert.equal(b.ui.querySelector('#remaining').textContent, '本页剩余约 3 分钟'); b.close();
});
test('indentation leaves existing whitespace, styled paragraphs, line breaks and quotations alone', async () => {
  const content = '<p>普通中文段落。</p><p>　　已有缩进。</p><p style="text-indent:2em">作者的缩进。</p><p style="text-align:center">居中题词。</p><p>诗的上句<br>诗的下句</p><blockquote><p>引用文字。</p></blockquote><p>English paragraph.</p>';
  const b = await boot(undefined, {}, w => { w.document.querySelector('[role=article]').innerHTML = content; });
  const prose = b.w.document.querySelector('[role=article]');
  assert.equal(prose.querySelectorAll('.cl-indentable').length, 1);
  const before = prose.textContent;
  b.ui.querySelector('#indent').click();
  assert.ok(b.w.document.documentElement.classList.contains('cl-indent'));
  assert.equal(prose.textContent, before);
  assert.equal(b.data.settings.indent, true);
  b.ui.querySelector('#indent').click();
  assert.equal(b.w.document.documentElement.classList.contains('cl-indent'), false); b.close();
});
test('paging is the default, saved scroll preference persists, and reset restores paging', async () => {
  const b = await boot();
  const mode = b.ui.querySelector('#mode');
  assert.equal(mode.value, 'paged');
  assert.ok(b.w.document.documentElement.classList.contains('cl-paged'));
  assert.equal(b.ui.querySelector('.page-controls').hidden, false);
  assert.equal(b.ui.querySelector('#page-previous').disabled, true);
  mode.value = 'scroll'; mode.dispatchEvent(new b.w.Event('change'));
  assert.equal(b.w.document.documentElement.classList.contains('cl-paged'), false);
  const copy = structuredClone(b.data); b.close();
  const loaded = await boot(undefined, copy);
  assert.equal(loaded.ui.querySelector('#mode').value, 'scroll');
  loaded.ui.querySelector('#reset').click();
  assert.equal(loaded.ui.querySelector('#mode').value, 'paged');
  assert.equal(loaded.data.settings.mode, 'paged'); loaded.close();
});

test('paging hides nested site panels and restores original nodes when scrolling', async () => {
  const b = await boot('/works/101/chapters/201?layout_regression=1', { settings: { mode: 'scroll' } });
  const panels = [...b.w.document.querySelectorAll('.mirror-panel')];
  const story = b.w.document.querySelector('#workskin');
  const text = story.textContent;
  const mode = b.ui.querySelector('#mode');
  for (let i = 0; i < 3; i++) {
    mode.value = 'paged'; mode.dispatchEvent(new b.w.Event('change'));
    assert.ok(panels.every(node => node.classList.contains('cl-page-background')));
    assert.ok(!story.closest('.cl-page-background'));
    assert.ok(!b.w.document.querySelector('#chapterlight-root').closest('.cl-page-background'));
    assert.equal(b.w.document.querySelector('#workskin'), story);
    assert.equal(story.textContent, text);
    mode.value = 'scroll'; mode.dispatchEvent(new b.w.Event('change'));
    assert.equal(b.w.document.querySelectorAll('.cl-page-background').length, 0);
  }
  assert.equal(b.w.document.querySelectorAll('.cl-page-background').length, 0);
  assert.ok(panels.every(node => node.isConnected)); b.close();
});
test('visits populate history and sidebar safely renders stored titles and search', async () => {
  const b = await boot(undefined, { 'history:777': { id: '777', title: '<img src=x onerror=alert(1)>', url: 'https://archiveofourown.org/works/777', visited: 1 } });
  assert.equal(b.data['history:101'].title, '借一盏灯等你');
  assert.equal(b.ui.querySelector('#library').hidden, false);
  assert.equal(b.ui.querySelectorAll('.library-item').length, 2);
  assert.equal(b.ui.querySelector('#library-list img'), null);
  b.ui.querySelector('#library-search').value = '借一盏灯';
  b.ui.querySelector('#library-search').dispatchEvent(new b.w.Event('input'));
  assert.equal(b.ui.querySelectorAll('.library-item').length, 1);
  assert.ok(b.ui.querySelector('.library-item a').href.endsWith('#cl-resume')); b.close();
});
test('manual bookmarks remain fixed while automatic progress moves and support remove/undo', async () => {
  const b = await boot(undefined, { settings: { mode: 'scroll' } });
  assert.equal(b.ui.querySelector('#save-bookmark').closest('aside').id, 'library');
  assert.equal(b.ui.querySelector('#save-bookmark').hidden, false);
  b.ui.querySelector('#bookmark-label').value = '喜欢的片段';
  b.ui.querySelector('#save-bookmark').click(); await new Promise(r => setTimeout(r, 30));
  const key = Object.keys(b.data).find(key => key.startsWith('bookmark:'));
  assert.ok(key); const original = structuredClone(b.data[key]);
  assert.equal(original.label, '喜欢的片段');
  const paragraphs = [...b.w.document.querySelectorAll('[role=article] p')];
  paragraphs.forEach((p, i) => { p.getBoundingClientRect = () => ({ top: (i - 5) * 120, bottom: (i - 5) * 120 + 110, height: 110 }); });
  b.w.dispatchEvent(new b.w.WheelEvent('wheel')); b.w.dispatchEvent(new b.w.Event('scroll'));
  await new Promise(r => setTimeout(r, 550));
  assert.equal(b.data['progress:101'].index, 5); assert.deepEqual(b.data[key], original);
  b.ui.querySelector('.library-item button').click(); await new Promise(r => setTimeout(r, 20));
  assert.equal(b.data[key].removed, true);
  b.ui.querySelector('#undo-bookmark').click(); await new Promise(r => setTimeout(r, 20));
  assert.equal(b.data[key].removed, false); b.close();
});

test('sidebar starts full, remembers mini mode and allows its shortcuts to expand specific tabs', async () => {
  const b = await boot();
  assert.equal(b.ui.querySelector('#library').hidden, false);
  assert.equal(b.ui.querySelector('#library-mini').hidden, true);
  assert.equal(b.ui.querySelector('#library-button').getAttribute('aria-expanded'), 'true');
  assert.equal(b.w.document.documentElement.classList.contains('cl-library-open'), true);
  const next = new b.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
  b.w.document.dispatchEvent(next); assert.equal(next.defaultPrevented, true);
  const shelfKey = new b.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true, cancelable: true });
  b.ui.querySelector('#library-search').dispatchEvent(shelfKey); assert.equal(shelfKey.defaultPrevented, false);
  b.ui.querySelector('#bookmarks-tab').click();
  assert.equal(b.ui.querySelector('#save-bookmark').hidden, false);
  b.ui.querySelector('#close-library').click();
  assert.equal(b.ui.querySelector('#library').hidden, true);
  assert.equal(b.ui.querySelector('#library-mini').hidden, false);
  assert.equal(b.ui.activeElement.id, 'mini-expand');
  assert.equal(b.data.settings.libraryOpen, false);
  assert.equal(b.w.document.documentElement.classList.contains('cl-library-open'), false);
  assert.equal(b.w.document.documentElement.classList.contains('cl-library-mini'), true);
  const hidden = structuredClone(b.data); b.close();
  const loaded = await boot(undefined, hidden);
  assert.equal(loaded.ui.querySelector('#library').hidden, true);
  assert.equal(loaded.ui.querySelector('#library-mini').hidden, false);
  loaded.ui.querySelector('#mini-bookmarks').click();
  assert.equal(loaded.ui.querySelector('#library').hidden, false);
  assert.equal(loaded.ui.querySelector('#library-mini').hidden, true);
  assert.equal(loaded.ui.querySelector('#bookmarks-tab').getAttribute('aria-pressed'), 'true');
  assert.equal(loaded.data.settings.libraryOpen, true);
  loaded.ui.querySelector('#close-library').click();
  loaded.ui.querySelector('#mini-history').click();
  assert.equal(loaded.ui.querySelector('#history-tab').getAttribute('aria-pressed'), 'true'); loaded.close();
});

test('mini sidebar saves a bookmark without expanding and does not offer saving on native pages', async () => {
  const b = await boot(undefined, { settings: { mode: 'scroll', libraryOpen: false } });
  b.ui.querySelector('#mini-save').click(); await new Promise(r => setTimeout(r, 30));
  assert.equal(Object.keys(b.data).filter(key => key.startsWith('bookmark:')).length, 1);
  assert.equal(b.ui.querySelector('#library').hidden, true);
  assert.equal(b.ui.querySelector('#library-mini').hidden, false);
  assert.equal(b.ui.querySelector('#mini-status').textContent, '已记住');
  assert.equal(b.data.settings.libraryOpen, false); b.close();
  const native = await boot('/works/search', { settings: { libraryOpen: false } });
  assert.equal(native.ui.querySelector('#mini-save').hidden, true);
  native.ui.querySelector('#mini-save').click();
  assert.equal(Object.keys(native.data).filter(key => key.startsWith('bookmark:')).length, 0); native.close();
});
test('explicit bookmark links restore their own location even with automatic resume disabled', async () => {
  const position = { chapter: 'chapter-1', index: 5, text: 'old excerpt', offset: 0, url: 'https://archiveofourown.org/works/101/chapters/201' };
  const b = await boot('/works/101/chapters/201#cl-bookmark=test-bookmark', {
    settings: { resume: false, mode: 'scroll' }, 'bookmark:test-bookmark': { id: 'test-bookmark', workId: '101', label: 'here', title: 'Story', position, created: 1 }
  });
  assert.ok(b.scrolls.length > 0); assert.equal(b.w.location.hash, ''); b.close();
});
test('custom font, weight and spacing persist with CSS-safe family names', async () => {
  const b = await boot();
  const font = b.ui.querySelector('#font'); font.value = 'custom'; font.dispatchEvent(new b.w.Event('change'));
  b.ui.querySelector('#custom-font').value = 'Microsoft YaHei, 思源宋体'; b.ui.querySelector('#apply-font').click();
  const weight = b.ui.querySelector('#weight'); weight.value = '600'; weight.dispatchEvent(new b.w.Event('change'));
  const tracking = b.ui.querySelector('#tracking'); tracking.value = '.08'; tracking.dispatchEvent(new b.w.Event('input'));
  assert.equal(b.data.settings.customFont, 'Microsoft YaHei, 思源宋体');
  assert.equal(b.data.settings.weight, 600); assert.equal(b.data.settings.tracking, .08);
  const copy = structuredClone(b.data); b.close(); const loaded = await boot(undefined, copy);
  assert.ok(loaded.w.document.documentElement.style.getPropertyValue('--cl-font').startsWith('"Microsoft YaHei", "思源宋体"'));
  assert.equal(loaded.ui.querySelector('#weight').value, '600'); loaded.close();
  const invalid = await boot(undefined, { settings: { font: 'custom', customFont: 'bad; color:red; url(https://evil.example)' } });
  assert.equal(invalid.ui.querySelector('#custom-font').value, '');
  assert.ok(!invalid.w.document.documentElement.style.getPropertyValue('--cl-font').includes('evil')); invalid.close();
});


test('floating switch fully restores native DOM, stops progress writes and survives reload', async () => {
  for (const mode of ['paged', 'scroll']) {
    const geometry = w => {
      const rect = () => ({ left: 0, right: 760, top: 140, bottom: 250, width: 760, height: 110 });
      w.HTMLElement.prototype.getBoundingClientRect = rect;
      w.HTMLElement.prototype.getClientRects = () => [rect()];
      w.Range.prototype.getBoundingClientRect = rect;
    };
    const b = await boot(undefined, { settings: { mode, libraryOpen: false } }, geometry);
    const root = b.w.document.documentElement;
    const toggle = b.ui.querySelector('#reader-switch');
    const workskin = b.w.document.querySelector('#workskin');
    const prose = workskin.querySelector('.userstuff');
    assert.equal(toggle.getAttribute('role'), 'switch');
    assert.equal(toggle.getAttribute('aria-checked'), 'true');
    toggle.click();
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(toggle.getAttribute('aria-checked'), 'false');
    assert.equal(b.data.settings.enabled, false);
    assert.equal(root.classList.contains('cl-reading'), false);
    assert.equal(root.classList.contains('cl-paged'), false);
    assert.equal(b.w.document.querySelector('#cl-page-viewport'), null);
    assert.equal(b.w.document.querySelector('.cl-page-background'), null);
    assert.equal(workskin.parentElement.id, 'main');
    assert.equal(workskin.querySelector('.userstuff'), prose);
    for (const selector of ['.top', '.bottom', '#library', '#library-mini', '#appearance', '#contents']) assert.equal(b.ui.querySelector(selector).hidden, true, selector);
    const position = structuredClone(b.data['progress:101']);
    assert.ok(position);
    const key = new b.w.KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, cancelable: true, bubbles: true });
    b.w.document.dispatchEvent(key); assert.equal(key.defaultPrevented, false);
    const wheel = new b.w.WheelEvent('wheel', { deltaY: 100, cancelable: true });
    b.w.document.dispatchEvent(wheel); assert.equal(wheel.defaultPrevented, false);
    b.w.dispatchEvent(new b.w.Event('pagehide'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(b.data['progress:101'], position);
    const reloaded = await boot(undefined, b.data, geometry);
    assert.equal(reloaded.ui.querySelector('#reader-switch').getAttribute('aria-checked'), 'false');
    assert.equal(reloaded.w.document.documentElement.classList.contains('cl-reading'), false);
    assert.deepEqual(reloaded.data, b.data);
    reloaded.ui.querySelector('#reader-switch').click();
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.equal(reloaded.ui.querySelector('#reader-switch').getAttribute('aria-checked'), 'true');
    assert.equal(reloaded.w.document.documentElement.classList.contains('cl-reading'), true);
    assert.equal(reloaded.ui.querySelector('#library-mini').hidden, false);
    assert.equal(reloaded.data.settings.mode, mode);
    assert.equal(reloaded.data.settings.enabled, true);
    reloaded.close(); b.close();
  }
});

test('disabled reader leaves native browsing clean and can be enabled again', async () => {
  const b = await boot('/works/search', { settings: { enabled: false } });
  assert.equal(b.ui.querySelector('.top').hidden, true);
  assert.equal(b.ui.querySelector('#library').hidden, true);
  assert.equal(b.ui.querySelector('#library-mini').hidden, true);
  assert.equal(b.ui.querySelector('#reader-switch').hidden, false);
  assert.equal(b.w.document.documentElement.classList.contains('cl-browsing'), false);
  b.ui.querySelector('#reader-switch').click();
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(b.ui.querySelector('#reader-switch').hidden, false);
  assert.equal(b.ui.querySelector('.top').hidden, false);
  assert.equal(b.w.document.documentElement.classList.contains('cl-browsing'), true);
  assert.equal(b.w.document.documentElement.classList.contains('cl-reading'), false);
  b.ui.querySelector('#close-library').click();
  assert.equal(b.w.document.documentElement.classList.contains('cl-library-mini'), true);
  b.ui.querySelector('#reader-switch').click();
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(b.ui.querySelector('#reader-switch').hidden, false);
  assert.equal(b.ui.querySelector('#reader-switch').getAttribute('aria-checked'), 'false');
  assert.equal(b.w.document.documentElement.classList.contains('cl-browsing'), false);
  assert.equal(b.w.document.documentElement.classList.contains('cl-library-mini'), false);
  for (const selector of ['.top', '.bottom', '#library', '#library-mini', '#appearance', '#contents', '.resume']) assert.equal(b.ui.querySelector(selector).hidden, true, selector);
  assert.equal(Object.keys(b.data).some(key => /^(history|progress):/.test(key)), false);
  const reloaded = await boot('/works/search', b.data);
  assert.equal(reloaded.ui.querySelector('#reader-switch').hidden, false);
  assert.equal(reloaded.ui.querySelector('#reader-switch').getAttribute('aria-checked'), 'false');
  assert.equal(reloaded.ui.querySelector('.top').hidden, true);
  reloaded.close();
  b.close();
});
