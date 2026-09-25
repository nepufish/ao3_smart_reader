(() => {
  'use strict';
  // Uses the original DOM and CSS column fragmentation, never cloned story text.
  class ChapterlightPager {
    constructor(content, onChange) {
      this.content = content;
      this.onChange = onChange;
      this.page = 0;
      this.count = 1;
      this.stride = 1;
      this.enabled = false;
      this.motion = true;
      this.animation = null;
      this.anchor = null;
      this.background = new Set();
      this.viewport = document.createElement('div');
      this.viewport.id = 'cl-page-viewport';
      content.before(this.viewport);
      this.viewport.append(content);
      this.elements = [...content.querySelectorAll('p, h2, h3, li')];
      this.resize = () => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => {
          if (!this.enabled) return;
          const anchor = this.anchor;
          this.layout();
          if (anchor) this.restore(anchor);
          this.onChange();
        });
      };
      window.addEventListener('resize', this.resize);
      content.addEventListener('load', this.resize, true);
      document.fonts?.ready.then(this.resize);
      this.viewport.addEventListener('focusin', event => {
        if (this.enabled && event.target !== this.viewport) this.reveal(event.target);
      });
    }
    configure(enabled, motion) {
      this.stop();
      this.enabled = enabled;
      this.motion = motion;
      document.documentElement.classList.toggle('cl-paged', enabled);
      if (enabled) {
        if (!this.viewport.isConnected) {
          this.content.before(this.viewport);
          this.viewport.append(this.content);
        }
        // Hide sibling branches at every level: mirrors may wrap navigation and
        // metadata differently. Keep the original story and its ancestors intact.
        for (let branch = this.viewport; branch && branch !== document.body; branch = branch.parentElement) {
          for (const sibling of branch.parentElement?.children || []) {
            if (sibling === branch || sibling.id === 'chapterlight-root' || sibling.matches('.cl-site-header') || sibling.querySelector('.cl-site-header') || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(sibling.tagName)) continue;
            if (!sibling.classList.contains('cl-page-background')) {
              sibling.classList.add('cl-page-background');
              this.background.add(sibling);
            }
          }
        }
        this.layout();
      }
      else {
        for (const node of this.background) node.classList.remove('cl-page-background');
        this.background.clear();
        this.content.style.removeProperty('--cl-page-offset');
        this.anchor = null;
        if (this.viewport.isConnected) {
          this.viewport.before(this.content);
          this.viewport.remove();
        }
      }
    }
    stop() { this.animation?.cancel(); this.animation = null; }
    layout() {
      this.stop();
      this.viewport.scrollLeft = 0;
      this.content.scrollLeft = 0;
      this.stride = Math.max(1, this.viewport.clientWidth + 64);
      this.count = Math.max(1, Math.round((this.content.scrollWidth + 64) / this.stride));
      this.go(Math.min(this.page, this.count - 1), false);
    }
    go(index, animate = true) {
      const next = Math.max(0, Math.min(this.count - 1, index));
      const from = getComputedStyle(this.content).transform;
      const changed = next !== this.page;
      this.stop();
      this.page = next;
      const to = `translateX(${-next * this.stride}px)`;
      this.content.style.setProperty('--cl-page-offset', `${-next * this.stride}px`);
      this.anchor = this.capture();
      this.onChange();
      if (changed && animate && this.motion && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && this.content.animate) {
        const animation = this.content.animate([{ transform: from === 'none' ? 'translateX(0px)' : from }, { transform: to }], { duration: 340, easing: 'cubic-bezier(.22,.7,.22,1)' });
        this.animation = animation;
        animation.finished.then(() => { if (this.animation === animation) { this.animation = null; this.onChange(); } }).catch(() => {});
      }
      return changed;
    }
    pageOf(rect) {
      return Math.max(0, Math.min(this.count - 1, Math.floor((rect.left - this.viewport.getBoundingClientRect().left + this.page * this.stride + 1) / this.stride)));
    }
    textRange(element, character = 0) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node, left = Math.max(0, character);
      while ((node = walker.nextNode())) {
        if (left < node.length) {
          const range = document.createRange();
          range.setStart(node, left); range.setEnd(node, Math.min(node.length, left + 1));
          return range;
        }
        left -= node.length;
      }
      return null;
    }
    capture() {
      if (!this.enabled) return null;
      const box = this.viewport.getBoundingClientRect();
      const element = this.elements.find(node => [...node.getClientRects()].some(rect => rect.width > 0 && rect.right > box.left + 1 && rect.left < box.right - 1));
      if (!element) return null;
      // Find the first character on this page, including a paragraph spanning pages.
      let low = 0, high = Math.max(0, element.textContent.length - 1);
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        const rect = this.textRange(element, middle)?.getBoundingClientRect();
        if (rect && this.pageOf(rect) < this.page) low = middle + 1; else high = middle;
      }
      return { index: this.elements.indexOf(element), text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 180), character: low };
    }
    captureScroll() {
      const top = this.readingTop();
      const element = this.elements.find(node => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > top;
      });
      if (!element) return null;
      let low = 0, high = Math.max(0, element.textContent.length - 1);
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        const rect = this.textRange(element, middle)?.getBoundingClientRect();
        if (rect && rect.bottom <= top) low = middle + 1; else high = middle;
      }
      return { index: this.elements.indexOf(element), text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 180), character: low };
    }
    resolve(anchor) {
      if (!anchor || !Number.isInteger(anchor.index)) return null;
      const matches = this.elements.map((node, index) => ({ node, index })).filter(({ node }) => node.textContent.trim().replace(/\s+/g, ' ').slice(0, 180) === anchor.text);
      matches.sort((a, b) => Math.abs(a.index - anchor.index) - Math.abs(b.index - anchor.index));
      const node = matches[0]?.node || this.elements[anchor.index];
      if (!node) return null;
      const character = Number.isFinite(anchor.character) ? Math.min(Math.max(0, anchor.character), Math.max(0, node.textContent.length - 1)) : 0;
      return { node, range: this.textRange(node, character) };
    }
    restore(anchor) {
      this.stop();
      const resolved = this.resolve(anchor);
      if (!resolved) return false;
      const rect = resolved.range?.getBoundingClientRect() || resolved.node.getBoundingClientRect();
      if (this.enabled) this.go(this.pageOf(rect), false);
      else window.scrollTo({ top: Math.max(0, scrollY + rect.top - this.readingTop()), behavior: 'instant' });
      return true;
    }
    readingTop() { return 100 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cl-nav-height')) || 0); }
    reveal(element) {
      if (!this.enabled || !this.content.contains(element)) return;
      this.stop();
      this.viewport.scrollLeft = 0;
      const rect = element.getClientRects()[0];
      if (rect) this.go(this.pageOf(rect), false);
    }
  }
  globalThis.ChapterlightPager = ChapterlightPager;
})();
