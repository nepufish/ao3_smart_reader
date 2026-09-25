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
  // Replace result chrome only. Original nodes stay available when reader mode is off.
  const main = document.querySelector('#main');
  const results = main?.querySelector('ol.work.index, ol.work-list');
  const resultHeading = [...(main?.querySelectorAll('h2.heading,h3.heading') || [])].find(n => /Search Results|\bFound\b/i.test(n.textContent) && !n.closest('.blurb'));
  if (main && (results || resultHeading)) {
    const query = new URL(location.href).searchParams.get('work_search[query]') || new URL(location.href).searchParams.get('q') || '';
    const count = [...main.querySelectorAll('h2,h3,p')].filter(n=>!n.closest('.blurb,form')).map(n=>n.textContent.match(/([\d,]+)\s+(?:Found|Works?\b)/i)?.[1]).find(Boolean);
    const compact=document.createElement('div'); compact.className='cl-results-header';
    const info=document.createElement('div'), title=document.createElement('h2'), meta=document.createElement('p');
    title.textContent=query ? `“${query}”` : '作品'; meta.textContent=count ? `${count} 部作品` : '探索故事';
    info.append(title,meta); compact.append(info);
    const edit=[...main.querySelectorAll('a')].find(a=>!a.closest('.blurb') && /^(Edit (Your )?Search|编辑搜索)$/i.test(a.textContent.trim()));
    const action=document.createElement('a'); action.textContent='筛选';
    const editUrl=edit ? new URL(edit.href,location.href) : new URL('/works/search',location.origin);
    action.href=editUrl.origin===location.origin ? editUrl.href : '/works/search';
    if(filters) action.addEventListener('click',event=>{event.preventDefault();const details=filters.closest('details');if(details)details.open=true;filters.scrollIntoView({block:'start',behavior:'smooth'});});
    compact.append(action);
    for(const node of main.querySelectorAll('h2.heading,h3.heading,p,.work-search')) {
      if(node.closest('.blurb,form') || node.contains(results)) continue;
      if(/Search Results|[\d,]+\s+(?:Found|Works?\b)|^\s*You searched for:/i.test(node.textContent)) node.classList.add('cl-search-original');
    }
    edit?.closest('.actions')?.classList.add('cl-search-original');
    main.prepend(compact);
  }
  window.ChapterlightMobile = {
    tap(x,y) {
      if(!document.documentElement.classList.contains('cl-reading') || getSelection()?.toString()) return {};
      const target=document.elementFromPoint(x*innerWidth,y*innerHeight);
      if(!target || target.closest('a,button,input,textarea,select,summary,[contenteditable=true]')) return {};
      return {intent:'controls'};
    },
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
