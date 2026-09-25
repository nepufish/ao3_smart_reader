const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const code = fs.readFileSync('extension/pagination.js', 'utf8');

function setup() {
  const dom = new JSDOM('<main><div id="workskin"><p>' + '春'.repeat(600) + '</p></div></main>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.eval(code);
  const content = w.document.querySelector('#workskin');
  const p = content.querySelector('p');
  let capacity = 100, reduced = false;
  const animations = [];
  w.matchMedia = () => ({ matches: reduced });
  const scrolls = [];
  w.scrollTo = value => scrolls.push(value);
  content.animate = frames => {
    const animation = { frames, cancelled: false, cancel() { this.cancelled = true; }, finished: new Promise(() => {}) };
    animations.push(animation); return animation;
  };
  const pager = new w.ChapterlightPager(content, () => {});
  Object.defineProperty(pager.viewport, 'clientWidth', { get: () => 400 });
  Object.defineProperty(content, 'scrollWidth', { get: () => Math.ceil(600 / capacity) * 464 - 64 });
  pager.viewport.getBoundingClientRect = () => ({ left: 20, right: 420, top: 96, bottom: 696, width: 400, height: 600 });
  const rectFor = page => {
    const left = 20 + page * 464 + parseFloat(content.style.getPropertyValue('--cl-page-offset') || '0');
    return { left, right: left + 400, top: 100, bottom: 600, width: 400, height: 500 };
  };
  p.getClientRects = () => Array.from({ length: Math.ceil(600 / capacity) }, (_, i) => rectFor(i));
  w.Range.prototype.getBoundingClientRect = function() { return rectFor(Math.floor(this.startOffset / capacity)); };
  return { w, pager, p, animations, scrolls, setCapacity(value) { capacity = value; }, reduce() { reduced = true; }, close() { w.close(); } };
}

test('page boundaries clamp safely and page turns animate in both directions', () => {
  const b = setup(); b.pager.configure(true, true);
  assert.equal(b.pager.count, 6);
  assert.equal(b.pager.go(-1), false);
  assert.equal(b.animations.length, 0);
  b.pager.go(1); assert.equal(b.pager.page, 1); assert.equal(b.animations.length, 1);
  b.pager.go(0); assert.equal(b.animations[0].cancelled, true); assert.equal(b.animations.length, 2);
  b.pager.go(100); assert.equal(b.pager.page, 5);
  assert.equal(b.pager.go(6), false); b.close();
});
test('a saved anchor inside a long paragraph follows the same character after repagination', () => {
  const b = setup(); b.pager.configure(true, false); b.pager.go(3, false);
  const anchor = b.pager.capture(); assert.equal(anchor.character, 300);
  b.setCapacity(200); b.pager.layout(); b.pager.restore(anchor);
  assert.equal(b.pager.count, 3); assert.equal(b.pager.page, 1);
  b.pager.configure(false, false); b.pager.restore(anchor);
  assert.equal(b.scrolls.length, 1);
  assert.equal(b.w.document.documentElement.classList.contains('cl-paged'), false); b.close();
});
test('reduced-motion preference and explicit animation toggle skip transitions', () => {
  const b = setup(); b.reduce(); b.pager.configure(true, true); b.pager.go(1);
  assert.equal(b.animations.length, 0);
  b.pager.configure(true, false); b.pager.go(2); assert.equal(b.animations.length, 0); b.close();
});
test('text changes fall back to a valid anchor and invalid anchors fail safely', () => {
  const b = setup(); b.pager.configure(true, false); b.pager.go(2, false);
  const anchor = b.pager.capture(); anchor.text = 'author edited this paragraph';
  assert.equal(b.pager.restore(anchor), true);
  assert.equal(b.pager.restore({ index: -1 }), false);
  assert.equal(b.pager.restore({ index: 100000 }), false); b.close();
});
test('scrolling captures the first visible text character inside a long paragraph', () => {
  const b = setup();
  b.p.getBoundingClientRect = () => ({ top: -500, bottom: 700, width: 400, height: 1200 });
  b.w.Range.prototype.getBoundingClientRect = function() { const top = -500 + Math.floor(this.startOffset / 10) * 20; return { top, bottom: top + 20, width: 10, height: 20 }; };
  const anchor = b.pager.captureScroll(); assert.equal(anchor.character, 300);
  b.pager.restore(anchor); assert.equal(b.scrolls[0].top, 0); b.close();
});

test('scroll anchors account for the retained navigation height', () => {
  const b = setup();
  b.w.document.documentElement.style.setProperty('--cl-nav-height', '40px');
  b.p.getBoundingClientRect = () => ({ top: -500, bottom: 700, width: 400, height: 1200 });
  b.w.Range.prototype.getBoundingClientRect = function() { const top = -500 + Math.floor(this.startOffset / 10) * 20; return { top, bottom: top + 20, width: 10, height: 20 }; };
  const anchor = b.pager.captureScroll(); assert.equal(anchor.character, 320);
  b.pager.restore(anchor); assert.equal(b.scrolls[0].top, 0); b.close();
});
