(() => {
  const host = document.querySelector('#chapterlight-root');
  if (!host?.shadowRoot) return;
  const ui = host.shadowRoot;
  const $ = selector => ui.querySelector(selector);
  const prefix = 'chapterlight:';
  const read = key => { try { return JSON.parse(localStorage.getItem(prefix + key) || 'null'); } catch { return null; } };
  const allowedPosition = raw => {
    try { const url = new URL(raw, location.href); return url.origin === location.origin && /^\/works\/\d+(?:\/chapters\/\d+)?\/?$/.test(url.pathname) && !url.username && !url.password; } catch { return false; }
  };
  const filters = document.querySelector('form.filters');
  if (filters && !filters.closest('details')) {
    const details = document.createElement('details'); details.className = 'cl-mobile-filters';
    const summary = document.createElement('summary'); summary.textContent = '筛选与排序';
    filters.before(details); details.append(summary, filters);
  }
  window.ChapterlightMobile = {
    state() {
      return { reading: document.documentElement.classList.contains('cl-reading'),
        enabled: $('#reader-switch')?.getAttribute('aria-checked') === 'true',
        title: $('.work-title')?.textContent || '', page: $('#page-count')?.textContent || '',
        percentage: $('#percentage')?.textContent || '',
        previous: !!$('#page-previous') && !$('#page-previous').disabled, next: !!$('#page-next') && !$('#page-next').disabled,
        mode: $('#mode')?.value || 'paged', size: Number($('#size')?.value || 20),
        leading: Number($('#leading')?.value || 1.8), font: $('#font')?.value || 'serif',
        theme: host.dataset.theme || 'paper', customFont: $('#custom-font')?.value || '', bookmarkStatus: $('#mini-status')?.textContent || '',
        chapters: [...ui.querySelectorAll('.chapter-list a')].map(a => ({ title:a.textContent, url:a.href })),
        previousChapter: $('#previous')?.hidden ? '' : $('#previous')?.href,
        nextChapter: $('#next')?.hidden ? '' : $('#next')?.href };
    },
    action(name) {
      const ids = { next:'page-next', previous:'page-previous', bookmark:'mini-save', toggle:'reader-switch' };
      if (ids[name]) $('#' + ids[name])?.click();
    },
    setting(name, value) {
      if (name === 'theme' && ['paper','light','dark'].includes(value)) { $('[data-theme="' + value + '"]')?.click(); return; }
      if (name === 'customFont') {
        const input = $('#custom-font'), font = $('#font');
        if (input && font && String(value).trim()) {
          input.value=String(value).slice(0,160); $('#apply-font')?.click();
          font.value='custom'; font.dispatchEvent(new Event('change',{bubbles:true}));
        }
        return;
      }
      if (!['size','leading','font','mode'].includes(name)) return;
      const control = $('#' + name); if (!control) return;
      control.value = String(value);
      control.dispatchEvent(new Event(['size','leading'].includes(name) ? 'input' : 'change', {bubbles:true}));
    },
    snapshot() {
      const history = [], bookmarks = [];
      for (const key of Object.keys(localStorage).filter(k => k.startsWith(prefix))) {
        const id = key.slice(prefix.length), item = read(id);
        if (!item || typeof item !== 'object') continue;
        if (id.startsWith('history:')) {
          const position = read('progress:' + item.id);
          const raw = position?.url || item.url;
          if (allowedPosition(raw)) history.push({title:item.title, author:item.author || '', url:raw.split('#')[0] + '#cl-resume', location:position?.locationLabel || '从正文开始', updated:position?.updated || item.visited || 0});
        } else if (id.startsWith('bookmark:') && !item.removed && allowedPosition(item.position?.url) && /^[a-zA-Z0-9-]{1,64}$/.test(item.id)) {
          bookmarks.push({title:item.title, author:item.label || '', url:item.position.url.split('#')[0] + '#cl-bookmark=' + item.id, location:item.position.locationLabel || '已保存位置', updated:item.created || 0});
        }
      }
      return {origin:location.origin, history:history.sort((a,b) => b.updated-a.updated).slice(0,150), bookmarks:bookmarks.sort((a,b) => b.updated-a.updated).slice(0,300)};
    }
  };
  let start = null;
  document.addEventListener('touchstart', event => {
    if (!document.documentElement.classList.contains('cl-paged') || event.touches.length !== 1
        || event.target === host || event.target.closest('a,button,input,textarea,select,#header') || getSelection()?.toString()) { start=null; return; }
    start={x:event.touches[0].clientX,y:event.touches[0].clientY,time:Date.now()};
  }, {passive:true});
  document.addEventListener('touchend', event => {
    if (!start || !event.changedTouches.length) return;
    const first=start; start=null;
    const dx=event.changedTouches[0].clientX-first.x,dy=event.changedTouches[0].clientY-first.y;
    if (Date.now()-first.time>650 || Math.abs(dx)<64 || Math.abs(dx)<Math.abs(dy)*1.8 || getSelection()?.toString()) return;
    if (!$('#appearance')?.hidden || !$('#contents')?.hidden) return;
    window.ChapterlightMobile.action(dx<0?'next':'previous');
  }, {passive:true});
  document.addEventListener('touchcancel', () => {start=null;}, {passive:true});
})();
