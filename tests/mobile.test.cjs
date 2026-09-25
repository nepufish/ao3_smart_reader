const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const storage = fs.readFileSync('android/app/src/main/assets/storage.js', 'utf8');
const mobile = fs.readFileSync('android/app/src/main/assets/mobile.js', 'utf8');

test('native shelf snapshot keeps positions and excludes off-site bookmark URLs', () => {
  const dom = new JSDOM('<div id="chapterlight-root"></div>', {url:'https://archiveofourown.org/works',runScripts:'outside-only'});
  const w=dom.window;
  w.document.querySelector('#chapterlight-root').attachShadow({mode:'open'});
  const put=(key,value)=>w.localStorage.setItem('chapterlight:'+key,JSON.stringify(value));
  put('history:101',{id:'101',title:'A story',url:'https://archiveofourown.org/works/101',visited:1});
  put('progress:101',{url:'https://archiveofourown.org/works/101/chapters/202',locationLabel:'第 3 页',updated:2});
  put('bookmark:valid',{id:'valid',title:'Saved',position:{url:'https://archiveofourown.org/works/101',locationLabel:'第 2 页'},created:3});
  put('bookmark:bad',{id:'bad',position:{url:'https://evil.example/works/101'}});
  put('bookmark:removed',{id:'removed',removed:true,position:{url:'https://archiveofourown.org/works/101'}});
  w.eval(mobile);
  const result=w.ChapterlightMobile.snapshot();
  assert.equal(result.history[0].url,'https://archiveofourown.org/works/101/chapters/202#cl-resume');
  assert.equal(result.history[0].location,'第 3 页');
  assert.equal(result.bookmarks.length,1);
  assert.equal(result.bookmarks[0].url,'https://archiveofourown.org/works/101#cl-bookmark=valid');
  w.close();
});

test('native settings API uses reader events and preserves real filter forms', () => {
  const dom=new JSDOM('<div id="chapterlight-root"></div><form class="filters"><input name="q" value="test"></form>',{url:'https://archiveofourown.org/works',runScripts:'outside-only'});
  const w=dom.window, ui=w.document.querySelector('#chapterlight-root').attachShadow({mode:'open'});
  ui.innerHTML='<input id="size" type="range" min="16" max="30"><button id="reader-switch" aria-checked="true"></button><input id="custom-font"><button id="apply-font"></button><select id="font"><option value="serif">Serif</option><option value="custom">Custom</option></select>';
  const form=w.document.querySelector('form');let received=0;
  ui.querySelector('#size').addEventListener('input',()=>received++);
  w.eval(mobile); w.ChapterlightMobile.setting('size',26);
  assert.equal(received,1);assert.equal(w.ChapterlightMobile.state().size,26);
  w.ChapterlightMobile.setting('customFont','Noto Serif CJK SC');
  assert.equal(ui.querySelector('#custom-font').value,'Noto Serif CJK SC');
  assert.equal(w.ChapterlightMobile.state().font,'custom');
  assert.equal(w.document.querySelector('details form'),form);
  assert.equal(new w.FormData(form).get('q'),'test');
  assert.equal(w.ChapterlightMobile.state().reading,false); w.close();
});

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
