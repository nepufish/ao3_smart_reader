(() => {
  'use strict';
  const match = location.pathname.match(/^\/works\/(\d+)(?:\/chapters\/(\d+))?\/?$/);
  const workskin = document.querySelector('#workskin');
  const story = document.querySelector('#chapters');
  if (document.querySelector('#chapterlight-root')) return;
  const isWork = !!(match && workskin && story?.querySelector('.userstuff'));
  const workId = isWork ? match[1] : '';
  const pageChapterId = isWork ? match[2] || '' : '';
  const key = `progress:${workId}`;
  // Retain the original navigation, including its forms, menus and event handlers.
  const siteHeader = document.querySelector('#header');
  const primaryNav = siteHeader?.querySelector('.primary.navigation');
  const siteNav = primaryNav?.closest('nav') || primaryNav || siteHeader?.querySelector('nav[aria-label="Site"]');
  if (siteNav) {
    siteHeader.classList.add('cl-site-header');
    for (let branch = siteNav; branch !== siteHeader; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) if (sibling !== branch) sibling.classList.add('cl-site-header-extra');
    }
  }
  let navHeight = 0;
  const readingTop = () => 100 + navHeight;
  const defaults = { enabled: true, mode: 'paged', animation: true, libraryOpen: true, theme: 'paper', font: 'serif', customFont: '', weight: 400, tracking: 0, size: 22, width: 760, leading: 2, gap: 0.8, indent: false, speed: 500, notes: true, resume: true };
  const fonts = {
    serif: '"Songti SC", "SimSun", "PMingLiU", "Noto Serif CJK SC", "Source Han Serif SC", serif',
    book: '"KaiTi", "STKaiti", "Kaiti SC", "BiauKai", serif',
    sans: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Microsoft JhengHei", sans-serif'
  };
  let settings = { ...defaults }, saved = null, ready = false, interacted = false, saveTimer, scrollFrame, navigatingToPosition = false;
  let libraryView = 'history', libraryData = { history: [], bookmarks: [] }, libraryRequest = 0, removedBookmark = null;
  function normalizeFont(value) {
    if (typeof value !== 'string') return '';
    return value.slice(0, 160).split(/[,，]/).slice(0, 5).map(name => name.trim().replace(/^["']|["']$/g, '')).filter(name => /^[\p{L}\p{N} _.-]+$/u.test(name)).join(', ');
  }
  function fontStack() {
    if (settings.font !== 'custom' || !settings.customFont) return fonts[settings.font] || fonts.serif;
    return settings.customFont.split(', ').map(name => `"${name}"`).join(', ') + ', ' + fonts.serif;
  }
  const host = document.createElement('div');
  host.id = 'chapterlight-root';
  host.lang = 'zh-CN';
  // Isolate controls from both site skins and work skins. Story markup stays untouched.
  const ui = host.attachShadow({ mode: 'open' });
  ui.innerHTML = `<style>
    :host { all: initial; --paper:#f6f3ec; --ink:#343832; --muted:#787e73; --line:#dddfd4; --accent:#506349; --card:#fcfaf5; font:14px/1.65 "Microsoft YaHei","PingFang SC",system-ui,sans-serif; color:var(--ink); }
    :host([data-native=true]) { display:block; height:70px; }
    :host([data-disabled=true]) { display:block; height:0; }
    :host([data-theme=light]) { --paper:#fff; --card:#fff; --line:#e1e6df; }
    :host([data-theme=dark]) { --paper:#202723; --ink:#dadfd5; --muted:#a1aea3; --line:#414d43; --accent:#b4c7a6; --card:#29322c; color-scheme:dark; }
    * { box-sizing:border-box; } [hidden] { display:none !important; }
    button,select,input { font:inherit; } button,a,select,input { -webkit-tap-highlight-color:transparent; }
    button,a { color:inherit; } button { border:1px solid transparent; background:transparent; cursor:pointer; border-radius:7px; padding:9px 12px; }
    button:hover,a.nav:hover { background:color-mix(in srgb,var(--accent) 9%,transparent); }
    button:focus-visible,a:focus-visible,select:focus-visible,input:focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
    button[aria-pressed=true] { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 8%,transparent); }
    .reader-switch { position:fixed; z-index:2147483647; right:24px; bottom:76px; display:flex; align-items:center; gap:12px; min-height:58px; padding:12px 18px; border:1px solid var(--accent); border-radius:30px; background:var(--card); box-shadow:0 6px 24px #0003; font-size:16px; transition:transform .18s, box-shadow .18s; }
    .reader-switch:hover { background:var(--card); transform:translateY(-3px); box-shadow:0 9px 28px #0004; }
    .switch-track { width:42px; height:24px; padding:3px; border-radius:20px; background:var(--muted); }
    .switch-track::after { content:""; display:block; width:18px; height:18px; border-radius:50%; background:var(--paper); transition:transform .18s; }
    .reader-switch[aria-checked=true] .switch-track { background:var(--accent); }
    .reader-switch[aria-checked=true] .switch-track::after { transform:translateX(18px); }
    @media(prefers-reduced-motion:reduce) { .reader-switch,.switch-track::after { transition:none; } }
    .top { position:fixed; z-index:2147483646; top:0; left:0; right:0; height:70px; display:flex; align-items:center; gap:22px; padding:0 34px; border-bottom:1px solid var(--line); background:var(--paper); }
    .brand { display:flex; align-items:center; gap:10px; font:23px "Songti SC","SimSun",serif; letter-spacing:2px; white-space:nowrap; }
    .mark { color:var(--accent); font-size:26px; } .tag { margin-left:12px; font:10px system-ui,sans-serif; letter-spacing:2px; color:var(--muted); }
    .work-title { margin:auto; color:var(--muted); max-width:30vw; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:12px; }
    .tools { display:flex; gap:7px; align-items:center; } .tools button { white-space:nowrap; } .appearance { font-family:Georgia,serif; font-size:19px; }
    .tools a { text-decoration:none; padding:9px 12px; border-radius:7px; white-space:nowrap; } .tools a:hover { background:color-mix(in srgb,var(--accent) 9%,transparent); }
    .panel { position:fixed; z-index:2147483647; right:26px; top:calc(84px + var(--cl-nav-height, 0px)); width:310px; max-height:calc(100vh - 155px - var(--cl-nav-height, 0px)); overflow:auto; padding:24px; border:1px solid var(--line); border-radius:12px; background:var(--card); box-shadow:0 12px 45px #00000012; }
    .panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; } h2 { font:22px "Songti SC","SimSun",serif; margin:0; } .close { padding:2px 8px; font-size:22px; }
    .eyebrow { display:block; color:var(--muted); text-transform:uppercase; letter-spacing:1.6px; font-size:10px; margin:23px 0 10px; }
    .themes { display:flex; gap:8px; } .themes button { flex:1; border:1px solid var(--line); padding:12px 0; font-size:12px; } .themes [data-theme=light] { background:#fff;color:#343832; } .themes [data-theme=paper] { background:#eee8da;color:#343832; } .themes [data-theme=dark] { background:#263029;color:#e1e5da; }
    select { background:var(--paper); color:var(--ink); border:1px solid var(--line); border-radius:6px; padding:10px; width:100%; } .range-label { display:flex; justify-content:space-between; margin:21px 0 8px; font-size:12px; } output { color:var(--muted); } input[type=range] { width:100%; accent-color:var(--accent); } input[type=checkbox] { accent-color:var(--accent); }
    .check { display:flex; align-items:center; gap:8px; margin:17px 0; font-size:12px; } .small { font-size:11px; color:var(--muted); line-height:1.7; } .reset { padding-left:0; color:var(--muted); font-size:12px; }
    .chapter-list { display:grid; gap:5px; } .chapter-list a { text-decoration:none; padding:12px; border-radius:5px; border:1px solid var(--line); font-size:13px; } .chapter-list a:hover { color:var(--accent); background:var(--paper); }
    .bottom { position:fixed; z-index:2147483646; bottom:0; left:0; right:0; height:53px; background:var(--paper); border-top:1px solid var(--line); display:flex; gap:20px; align-items:center; padding:0 34px; font-size:11px; color:var(--muted); }
    .progress { position:absolute; top:-2px; left:0; height:2px; background:var(--accent); width:0; } .bottom .spacer { flex:1; } .nav { text-decoration:none; border-radius:5px; padding:7px; } .dot { color:var(--accent); margin-right:6px; }
    .page-controls { display:flex; gap:12px; align-items:center; color:var(--ink); } .page-controls button { border:1px solid var(--line); padding:6px 12px; } button:disabled { opacity:.35; cursor:default; } #page-count { min-width:76px; text-align:center; font-variant-numeric:tabular-nums; } :host([data-mode=paged]) #text-count, :host([data-mode=paged]) #save-state { display:none; }
    .sidebar { position:fixed; z-index:2147483644; top:var(--cl-library-top, calc(84px + var(--cl-nav-height, 0px))); bottom:70px; left:18px; width:var(--cl-library-width,min(330px,calc(100vw - 36px))); background:var(--card); border:1px solid var(--line); border-radius:12px; padding:22px; box-shadow:0 12px 45px #0002; overflow:auto; }
    .library-tabs { display:flex; gap:7px; margin:14px 0; } .library-tabs button { flex:1; border:1px solid var(--line); }
    .sidebar .bookmark-current { display:block; width:100%; margin:0 0 16px; padding:12px; }
    .sidebar.mini { width:60px; padding:8px; display:flex; flex-direction:column; gap:10px; }
    .mini button { width:100%; padding:9px 2px; font-size:11px; }
    .mini .mini-icon { display:block; font-size:22px; line-height:1.3; margin-bottom:4px; }
    .mini-status { color:var(--accent); font-size:10px; line-height:1.6; text-align:center; margin:0; overflow-wrap:anywhere; }
    input[type=text],input[type=search] { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:6px; color:var(--ink); background:var(--paper); }
    .library-list { display:grid; gap:12px; margin:18px 0; } .library-item { border-bottom:1px solid var(--line); padding:0 0 16px; }
    .library-item a { display:block; text-decoration:none; font-size:14px; line-height:1.7; overflow-wrap:anywhere; } .library-item a:hover { color:var(--accent); text-decoration:underline; }
    .library-item p { margin:6px 0; } .library-item .excerpt { font-size:12px; color:var(--muted); overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .library-item button { padding:4px 0; font-size:11px; color:var(--muted); } .primary { background:var(--accent); color:var(--paper); margin-top:10px; } .primary:hover { background:var(--accent); opacity:.9; }
    .library-status { font-size:12px; color:var(--accent); margin:12px 0; } .font-preview { padding:14px; border:1px solid var(--line); border-radius:6px; overflow-wrap:anywhere; font-size:18px; }
    @media(max-width:1250px) { .tag { display:none; } } @media(max-width:700px) { .tools { gap:0; } .tools button { padding:8px; } }
    .resume { position:fixed; bottom:72px; left:50%; transform:translateX(-50%); z-index:2147483646; background:var(--card); border:1px solid var(--line); border-radius:9px; padding:9px 15px; box-shadow:0 5px 25px #0001; display:flex; align-items:center; gap:10px; white-space:nowrap; font-size:12px; } .resume a { color:var(--accent); }
    @media(max-width:850px) { .tag,.work-title,#text-count { display:none; } .top { padding:0 18px; justify-content:space-between; gap:8px; } .bottom { padding:0 18px; gap:9px; } .brand { font-size:20px; } }
    @media(max-width:550px) { .brand { font-size:0; gap:0; } .mark { font-size:24px; } .top { gap:4px; } .tools { gap:0; } .tools button { padding:8px; } .panel { right:12px; width:min(310px,calc(100vw - 24px)); } #save-state { display:none; } }
  </style>
  <button id="reader-switch" class="reader-switch" role="switch" aria-label="阅读模式" aria-checked="true" hidden>阅读模式<span class="switch-track" aria-hidden="true"></span><span id="reader-switch-state" aria-hidden="true">开</span></button>
  <header class="top"><div class="brand"><span class="mark" aria-hidden="true">❧</span>章灯<span class="tag">留一盏灯，读一段故事</span></div><div class="work-title"></div><nav class="tools" aria-label="阅读工具"><button id="contents-button" aria-expanded="false" aria-controls="contents">☷ &nbsp; 目录</button><button id="appearance-button" aria-label="阅读设置" aria-expanded="false" aria-controls="appearance">字 &nbsp; 排版</button></nav></header>
  <section class="panel" id="appearance" aria-label="阅读设置" hidden><div class="panel-head"><h2>读得舒服一点</h2><button class="close" aria-label="关闭阅读设置">×</button></div><span class="eyebrow">纸张颜色</span><div class="themes"><button data-theme="light">日光</button><button data-theme="paper">暖纸</button><button data-theme="dark">夜读</button></div><label class="eyebrow" for="font">正文字体</label><select id="font"><option value="serif">宋体 · 书卷</option><option value="book">楷体 · 手札</option><option value="sans">黑体 · 清晰</option></select><p class="small">使用本机可用字体；未安装时由系统替代。</p><label class="range-label" for="size">字号 <output id="size-value"></output></label><input id="size" type="range" min="16" max="30" step="1"><label class="range-label" for="width">每行字数 <output id="width-value"></output></label><input id="width" type="range" min="480" max="960" step="20"><label class="range-label" for="leading">行间距 <output id="leading-value"></output></label><input id="leading" type="range" min="1.4" max="2.4" step="0.05"><label class="range-label" for="gap">段间距 <output id="gap-value"></output></label><input id="gap" type="range" min="0" max="2" step="0.1"><label class="check"><input id="indent" type="checkbox">中文正文首行缩进两字</label><p class="small">已有缩进、居中段落和手动换行保持原样。</p><label class="check"><input id="notes" type="checkbox">显示作者的话</label><label class="check"><input id="resume" type="checkbox">自动回到上次阅读位置</label><label class="range-label" for="speed">阅读速度（用于估时）<output id="speed-value"></output></label><input id="speed" type="range" min="200" max="1000" step="50"><button class="reset" id="reset">恢复默认排版</button><p class="small">设置和进度仅保存在此浏览器。</p></section>
  <section class="panel" id="contents" aria-label="章节目录" hidden><div class="panel-head"><h2>再读一章</h2><button class="close" aria-label="关闭目录">×</button></div><div class="chapter-list"></div><p class="small">Alt + ← / → 切换上一章 / 下一章。</p></section>
  <footer class="bottom"><div class="progress"></div><span id="percentage">本页已读 0%</span><span id="text-count"></span><span id="remaining"></span><span class="spacer"></span><span id="save-state"><span class="dot">●</span>进度仅保存在本机</span><a class="nav" id="previous" hidden>← 上一章</a><a class="nav" id="next" hidden>下一章 →</a></footer>
  <div class="resume" hidden><span>上次读到这里</span><a id="resume-link">继续阅读 →</a><button id="dismiss-resume" aria-label="关闭继续阅读提示">×</button></div>
  `;
  document.body.prepend(host);
  const $ = selector => ui.querySelector(selector);
  $('.tools').insertAdjacentHTML('afterbegin', '<button id="library-button" aria-label="书签与阅读历史" aria-controls="library" aria-expanded="false">☰ 书架</button><button id="save-bookmark" title="手动保存当前阅读位置">☆ 记住这里</button>');
  ui.append(Object.assign(document.createElement('aside'), { id: 'library', className: 'sidebar', hidden: true }));
  $('#library').setAttribute('aria-label', '书签与阅读历史');
  $('#library').innerHTML = '<div class="panel-head"><h2>我的书架</h2><button id="close-library" class="close" aria-label="关闭书架">×</button></div><nav class="library-tabs" aria-label="阅读记录分类"><button id="history-tab" aria-pressed="true">最近阅读</button><button id="bookmarks-tab" aria-pressed="false">我的书签</button></nav><label class="eyebrow" for="library-search">搜索作品或书签</label><input id="library-search" type="search" placeholder="书名、作者、备注…"><div id="bookmark-form" hidden><label class="eyebrow" for="bookmark-label">书签备注（选填）</label><input id="bookmark-label" type="text" maxlength="100" placeholder="例如：从这里继续 / 喜欢的片段"><button id="record-position" class="primary">保存当前位置</button></div><p id="library-status" class="library-status" role="status"></p><button id="undo-bookmark" hidden>撤销移除</button><div id="library-list" class="library-list"></div><p class="small">历史仅记录在章灯中打开的小说。书签和阅读位置保存在此浏览器，不会同步到 AO3。</p>';
  $('#library h2').textContent = '书签与历史';
  $('#close-library').setAttribute('aria-label', '收起为迷你侧栏');
  $('#close-library').title = '收起为迷你侧栏';
  $('#close-library').textContent = '«';
  $('#library .panel-head').after($('#save-bookmark'));
  $('#save-bookmark').className = 'primary bookmark-current';
  $('#save-bookmark').textContent = '☆ 书签 · 记住这里';
  ui.append(Object.assign(document.createElement('aside'), { id: 'library-mini', className: 'sidebar mini', hidden: true }));
  $('#library-mini').setAttribute('aria-label', '迷你书签与历史侧栏');
  $('#library-mini').innerHTML = '<button id="mini-expand" aria-label="展开侧栏" title="展开书签与历史" aria-controls="library" aria-expanded="false"><span class="mini-icon" aria-hidden="true">»</span>展开</button><button id="mini-history" aria-label="展开阅读历史" title="最近阅读"><span class="mini-icon" aria-hidden="true">◷</span>历史</button><button id="mini-bookmarks" aria-label="展开我的书签" title="我的书签"><span class="mini-icon" aria-hidden="true">▤</span>书签</button><button id="mini-save" aria-label="记住这里" title="添加当前阅读位置的书签"><span class="mini-icon" aria-hidden="true">☆</span>记住</button><p id="mini-status" class="mini-status" role="status"></p>';
  $('#font').insertAdjacentHTML('beforeend', '<option value="custom">自定义字体</option>');
  $('#font').insertAdjacentHTML('afterend', '<div id="custom-font-controls" hidden><label class="eyebrow" for="custom-font">已安装的字体名称</label><input id="custom-font" type="text" maxlength="160" placeholder="例如：Microsoft YaHei, Noto Serif CJK SC"><button id="apply-font" class="primary">应用字体</button><p class="small">可用逗号填写备用字体；字体未安装时使用宋体备用。不下载字体文件。</p></div><label class="eyebrow" for="weight">字重</label><select id="weight"><option value="300">轻 · 300</option><option value="400">常规 · 400</option><option value="500">适中 · 500</option><option value="600">半粗 · 600</option><option value="700">粗体 · 700</option></select><label class="range-label" for="tracking">字间距 <output id="tracking-value"></output></label><input id="tracking" type="range" min="0" max="0.15" step="0.01"><p class="font-preview">春水照归途，灯火待故人。<br>天地有时，故事未完。Aa 123</p><p id="font-status" class="small" role="status"></p>');
  $('#appearance .eyebrow').insertAdjacentHTML('beforebegin', '<label class="eyebrow" for="mode">阅读方式</label><select id="mode"><option value="scroll">上下滚动</option><option value="paged">左右翻页</option></select><label class="check"><input id="animation" type="checkbox">柔和翻页动画</label><p class="small">翻页模式：← / →、空格或滚轮翻页。<br>自动遵循系统的减少动态效果设置。</p>');
  $('.bottom .spacer').insertAdjacentHTML('beforebegin', '<div class="page-controls" hidden><button id="page-previous" aria-label="上一页">←</button><span id="page-count" role="status" aria-live="polite"></span><button id="page-next" aria-label="下一页">→</button></div>');
  const pager = isWork ? new ChapterlightPager(workskin, () => {
    updateProgress();
    if (ready && interacted && !pager.animation) { clearTimeout(saveTimer); saveTimer = setTimeout(save, 500); }
  }) : null;
  function measureNavigation() {
    const height = settings.enabled && isWork && siteNav ? Math.ceil(siteHeader.getBoundingClientRect().height) : 0;
    const libraryTop = settings.enabled && isWork ? 84 + height : Math.max(84, Math.ceil(siteHeader?.getBoundingClientRect().bottom || 70) + 14);
    document.documentElement.style.setProperty('--cl-library-top', `${libraryTop}px`);
    if (height === navHeight) return;
    navHeight = height;
    document.documentElement.style.setProperty('--cl-nav-height', `${height}px`);
    if (pager?.enabled) pager.resize();
  }
  if (siteNav && typeof ResizeObserver !== 'undefined') new ResizeObserver(measureNavigation).observe(siteHeader);
  window.addEventListener('resize', measureNavigation, { passive: true });
  $('.work-title').textContent = isWork ? workskin.querySelector('h2.title')?.textContent.trim() || '静读时光' : '浏览 AO3';
  const storage = typeof chrome !== 'undefined' && chrome.storage?.local;
  const library = new ChapterlightLibrary(storage, location.origin);
  const work = isWork ? { id: workId, title: $('.work-title').textContent.slice(0, 240), author: (workskin.querySelector('.byline')?.textContent.trim() || '').slice(0, 160), url: location.href } : null;
  const paragraphs = isWork ? [...story.querySelectorAll('.userstuff p, .userstuff blockquote, .userstuff li, .userstuff h3')].filter(p => !p.closest('.preface, .notes, .summary') && p.textContent.trim()) : [];
  const blocks = paragraphs.length ? paragraphs : isWork ? [...story.querySelectorAll('.userstuff')] : [];
  const fingerprint = node => node.textContent.trim().replace(/\s+/g, ' ').slice(0, 180);
  const chapterOf = node => node.closest('.chapter')?.id || pageChapterId;
  // Count story containers once, including text separated with <br> rather than <p>.
  const prose = isWork ? [...story.querySelectorAll('.userstuff')].filter(node => !node.closest('.preface, .notes, .summary') && !node.parentElement.closest('.userstuff')) : [];
  const text = prose.map(node => node.textContent).join('\n');
  const hanCount = (text.match(/\p{Script=Han}/gu) || []).length;
  const otherWords = (text.replace(/\p{Script=Han}/gu, ' ').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
  // Optional indentation only for ordinary Chinese prose with no existing indent.
  for (const node of paragraphs) {
    if (node.tagName !== 'P' || !/\p{Script=Han}/u.test(node.textContent) || /^[\s\u3000]/u.test(node.textContent) || node.querySelector('br, img') || node.closest('blockquote, li, pre, .preface')) continue;
    const style = getComputedStyle(node);
    if (['center', 'right', 'end'].includes(style.textAlign) || parseFloat(style.textIndent)) continue;
    node.classList.add('cl-indentable');
  }

  function safeUrl(raw) {
    try { const url = new URL(raw, location.href); return url.origin === location.origin && new RegExp(`^/works/${workId}(?:/chapters/\\d+)?/?$`).test(url.pathname) ? url : null; } catch { return null; }
  }
  function chapterUrl(id) { const url = new URL(location.href); url.pathname = `/works/${workId}/chapters/${id}`; url.searchParams.delete('view_full_work'); url.hash = ''; return url.href; }
  function addChapter(label, href) { const a = document.createElement('a'); a.textContent = label; a.href = href; $('.chapter-list').append(a); }
  const chapterSelect = isWork && document.querySelector('select#selected_id, select#chapter_index, select[name="selected_id"]');
  const localChapters = isWork ? [...story.querySelectorAll('.chapter[id]')] : [];
  if (localChapters.length > 1) {
    localChapters.forEach((node, i) => { if (!node.id) return; addChapter(node.querySelector('.title')?.textContent.trim() || `第 ${i + 1} 章`, `#${encodeURIComponent(node.id)}`); });
  } else if (chapterSelect) {
    [...chapterSelect.options].forEach(option => { if (/^\d+$/.test(option.value)) addChapter(option.textContent.trim(), chapterUrl(option.value)); });
  }
  if (!$('.chapter-list').children.length) addChapter('回到本章开头', '#chapters');
  for (const [id, selector] of [['previous', 'li.chapter.previous a, a[rel="prev"]'], ['next', 'li.chapter.next a, a[rel="next"]']]) {
    const link = document.querySelector(selector); const url = link && safeUrl(link.getAttribute('href'));
    if (url) { $(`#${id}`).href = url.href; $(`#${id}`).hidden = false; }
  }

  function samePage(url) {
    return url && url.origin === location.origin && url.pathname === location.pathname && url.searchParams.get('view_full_work') === new URL(location.href).searchParams.get('view_full_work');
  }
  function positionUrl() { const url = new URL(location.href); url.hash = ''; return url.href; }
  function describePosition(position) {
    const node = position.pageAnchor ? pager.resolve(position.pageAnchor)?.node : blocks.filter(p => chapterOf(p) === position.chapter)[position.index];
    const chapter = node?.closest('.chapter[id]')?.querySelector('.title')?.textContent.trim() || story.querySelector('.title')?.textContent.trim() || '正文';
    return { ...position, title: work.title, locationLabel: `${chapter} · ${pager?.enabled ? $('#page-count').textContent : $('#percentage').textContent}`, excerpt: position.pageAnchor?.text || position.text || '' };
  }
  function setLibraryView(view) {
    libraryView = view;
    $('#history-tab').setAttribute('aria-pressed', String(view === 'history'));
    $('#bookmarks-tab').setAttribute('aria-pressed', String(view === 'bookmarks'));
    $('#bookmark-form').hidden = view !== 'bookmarks' || !isWork;
    renderLibrary();
  }
  async function refreshLibrary() {
    const request = ++libraryRequest;
    try { const data = await library.entries(); if (request === libraryRequest) { libraryData = data; renderLibrary(); } }
    catch { $('#library-status').textContent = '无法读取书架，请刷新页面重试。'; }
  }
  async function openLibrary(view = libraryView) {
    closePanels();
    setLibraryExpanded(true);
    void persistSettings();
    setLibraryView(view);
    await refreshLibrary();
  }
  function setLibraryExpanded(open, preserve = true) {
    const position = preserve && ready && isWork && (pager?.enabled || blocks[0]?.getBoundingClientRect().top <= readingTop()) ? currentPosition() : null;
    settings.libraryOpen = open;
    $('#library').hidden = !settings.enabled || !open;
    $('#library-mini').hidden = !settings.enabled || open;
    $('#library-button').setAttribute('aria-expanded', String(open));
    $('#mini-expand').setAttribute('aria-expanded', String(open));
    $('#library-button').title = open ? '收起为迷你侧栏' : '展开书签与历史';
    document.documentElement.classList.toggle('cl-library-open', settings.enabled && open);
    document.documentElement.classList.toggle('cl-library-mini', settings.enabled && !open);
    if (preserve) {
      if (pager?.enabled) pager.layout();
      if (position) restore(position);
    }
  }
  function collapseLibrary(focus = false) {
    setLibraryExpanded(false);
    void persistSettings();
    if (focus) $('#mini-expand').focus();
  }
  function renderLibrary() {
    const container = $('#library-list'); container.replaceChildren();
    const query = $('#library-search').value.trim().toLocaleLowerCase();
    const entries = libraryData[libraryView].filter(entry => `${entry.title || ''} ${entry.author || ''} ${entry.label || ''}`.toLocaleLowerCase().includes(query));
    if (!entries.length) {
      const empty = document.createElement('p'); empty.className = 'small';
      empty.textContent = query ? '没有找到匹配的记录。' : libraryView === 'bookmarks' ? '还没有书签。在小说阅读页点击「记住这里」，保存阅读位置。' : '打开小说后，阅读记录会出现在这里。';
      container.append(empty); return;
    }
    for (const entry of entries) {
      const bookmark = libraryView === 'bookmarks';
      const position = entry.position;
      const url = library.safeUrl(position?.url || entry.url, bookmark ? entry.workId : entry.id);
      if (!url) continue;
      url.hash = bookmark ? `cl-bookmark=${entry.id}` : 'cl-resume';
      const row = document.createElement('article'); row.className = 'library-item';
      const a = document.createElement('a'); a.href = url.href;
      a.textContent = bookmark ? (entry.label || entry.title || '未命名书签') : (entry.title || `作品 ${entry.id}`);
      a.addEventListener('click', event => {
        if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        if (position) { event.preventDefault(); void goToPosition(position, url); }
      });
      row.append(a);
      const meta = document.createElement('p'); meta.className = 'small';
      const date = new Date(entry.created || entry.updated || Date.now()).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      meta.textContent = `${bookmark ? `${entry.title} · ` : ''}${position?.locationLabel || '从正文开始'} · ${date}`;
      row.append(meta);
      if (position?.excerpt) { const excerpt = document.createElement('p'); excerpt.className = 'excerpt'; excerpt.textContent = position.excerpt; row.append(excerpt); }
      if (bookmark) {
        const remove = document.createElement('button'); remove.textContent = '移除书签';
        remove.addEventListener('click', async () => {
          try { await library.removeBookmark(entry); removedBookmark = entry; $('#undo-bookmark').hidden = false; $('#library-status').textContent = '书签已移除，可撤销。'; await refreshLibrary(); }
          catch { $('#library-status').textContent = '移除失败，请重试。'; }
        }); row.append(remove);
      }
      container.append(row);
    }
  }
  async function goToPosition(position, url) {
    if (!library.safeUrl(url.href) || !library.safeUrl(position.url)) return;
    if (isWork && samePage(url)) {
      closePanels();
      if (restore(position)) { interacted = true; await save(true); }
      else { await openLibrary(); $('#library-status').textContent = '未找到原位置，正文可能已修改。'; }
    } else {
      navigatingToPosition = true; clearTimeout(saveTimer);
      await progressWrite.catch(() => {});
      location.assign(url.href);
    }
  }
  async function recordBookmark(keepMini = false) {
    if (!ready || !isWork || !settings.enabled) return;
    const raw = currentPosition();
    if (!raw) { await openLibrary('bookmarks'); $('#library-status').textContent = '请先翻到要记录的正文位置。'; return; }
    const position = describePosition(raw);
    const label = $('#bookmark-label').value.trim() || position.locationLabel;
    $('#record-position').disabled = $('#save-bookmark').disabled = $('#mini-save').disabled = true;
    try {
      await library.bookmark(work, position, label);
      await save(true);
      $('#bookmark-label').value = '';
      if (keepMini) { await refreshLibrary(); $('#mini-status').textContent = '已记住'; }
      else { await openLibrary('bookmarks'); $('#library-status').textContent = '已保存当前位置。继续阅读不会覆盖此书签。'; }
    } catch { await openLibrary('bookmarks'); $('#library-status').textContent = '书签保存失败，请重试。'; }
    finally { $('#record-position').disabled = $('#save-bookmark').disabled = $('#mini-save').disabled = false; }
  }

  function closePanels(focus = false) {
    for (const id of ['appearance', 'contents']) { const wasOpen = !$(`#${id}`).hidden; $(`#${id}`).hidden = true; $(`#${id}-button`).setAttribute('aria-expanded', 'false'); if (focus && wasOpen) $(`#${id}-button`).focus(); }
  }
  function apply() {
    const reading = isWork && settings.enabled;
    document.documentElement.classList.toggle('cl-reading', reading);
    document.documentElement.classList.toggle('cl-browsing', !isWork && settings.enabled);
    document.documentElement.classList.toggle('cl-hide-notes', reading && !settings.notes);
    document.documentElement.classList.toggle('cl-indent', reading && settings.indent);
    host.dataset.native = String(!reading);
    host.dataset.disabled = String(!settings.enabled);
    $('#reader-switch').hidden = false;
    $('#reader-switch').setAttribute('aria-checked', String(settings.enabled));
    $('#reader-switch-state').textContent = settings.enabled ? '开' : '关';
    $('#reader-switch').title = settings.enabled ? '关闭阅读模式，恢复 AO3 原始页面' : '开启章灯阅读模式';
    document.documentElement.dataset.clTheme = settings.theme;
    host.dataset.theme = settings.theme;
    host.dataset.mode = settings.mode;
    const style = document.documentElement.style;
    style.setProperty('--cl-size', `${settings.size}px`); style.setProperty('--cl-width', `${settings.width}px`); style.setProperty('--cl-leading', settings.leading); style.setProperty('--cl-font', fontStack());
    style.setProperty('--cl-weight', settings.weight); style.setProperty('--cl-tracking', `${settings.tracking}em`);
    style.setProperty('--cl-gap', `${settings.gap}em`);
    $('.top').hidden = !settings.enabled;
    $('.bottom').hidden = !reading;
    for (const id of ['contents-button', 'appearance-button', 'save-bookmark', 'mini-save']) $(`#${id}`).hidden = !reading;
    $('#bookmark-form').hidden = libraryView !== 'bookmarks' || !reading;
    if (!reading) { closePanels(); $('.resume').hidden = true; }
    setLibraryExpanded(settings.libraryOpen, false);
    for (const id of ['size', 'width', 'leading', 'gap', 'speed', 'font', 'mode', 'weight', 'tracking']) $(`#${id}`).value = settings[id];
    $('#custom-font').value = settings.customFont;
    $('#custom-font-controls').hidden = settings.font !== 'custom';
    $('#tracking-value').textContent = `${settings.tracking.toFixed(2)} em`;
    $('.font-preview').style.fontFamily = fontStack(); $('.font-preview').style.fontWeight = settings.weight; $('.font-preview').style.letterSpacing = `${settings.tracking}em`;
    $('#size-value').textContent = `${settings.size}px`; $('#leading-value').textContent = `${settings.leading.toFixed(2)} 倍`;
    $('#gap-value').textContent = `${settings.gap.toFixed(1)} 倍`; $('#speed-value').textContent = `${settings.speed} 字 / 分钟`;
    for (const id of ['notes', 'resume', 'indent', 'animation']) $(`#${id}`).checked = settings[id];
    ui.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === settings.theme)));
    measureNavigation();
    pager?.configure(reading && settings.mode === 'paged', settings.animation);
    $('.page-controls').hidden = !pager?.enabled;
    updateProgress();
  }
  function storageError() { $('#save-state').textContent = '保存失败 · 请刷新重试'; }
  async function persistSettings() { if (storage) try { await storage.set({ settings }); } catch { storageError(); } }
  function currentPosition() {
    if (!isWork) return null;
    if (pager?.enabled) {
      pager.stop();
      const pageAnchor = pager.capture();
      return pageAnchor ? { pageAnchor, url: positionUrl(), updated: Date.now() } : null;
    }
    const node = blocks.find(p => p.getBoundingClientRect().bottom > readingTop()) || blocks.at(-1);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { chapter: chapterOf(node), index: blocks.filter(p => chapterOf(p) === chapterOf(node)).indexOf(node), text: fingerprint(node), offset: Math.max(0, Math.min(1, (readingTop() - rect.top) / Math.max(rect.height, 1))), pageAnchor: pager.captureScroll(), url: positionUrl(), updated: Date.now() };
  }
  function restore(position) {
    if (!isWork) return false;
    if (position.pageAnchor) return pager.restore(position.pageAnchor);
    const candidates = blocks.filter(p => chapterOf(p) === position.chapter);
    // Prefer the original index when prose repeats; otherwise find the closest text match.
    const matches = candidates.map((p, index) => ({ p, index })).filter(({ p }) => fingerprint(p) === position.text);
    matches.sort((a, b) => Math.abs(a.index - position.index) - Math.abs(b.index - position.index));
    const node = matches[0]?.p || candidates[position.index];
    if (node) {
      if (pager?.enabled) pager.reveal(node);
      else window.scrollTo({ top: Math.max(0, scrollY + node.getBoundingClientRect().top + node.getBoundingClientRect().height * (position.offset || 0) - readingTop()), behavior: 'instant' });
    }
    return !!node;
  }
  let progressWrite = Promise.resolve();
  async function save(manual = false) {
    if (!settings.enabled || !isWork || !ready || navigatingToPosition || (!interacted && !manual)) return;
    const raw = currentPosition();
    if (raw && storage) {
      const position = describePosition(raw);
      progressWrite = progressWrite.catch(() => {}).then(() => storage.set({ [key]: position }));
      try {
        await progressWrite; saved = position; $('#save-state').textContent = '● 阅读进度已保存';
        const entry = libraryData.history.find(entry => entry.id === workId);
        if (entry) {
          entry.position = position; entry.url = position.url; entry.updated = position.updated;
          libraryData.history.sort((a, b) => b.updated - a.updated);
          if (!$('#library').hidden && libraryView === 'history') renderLibrary();
        }
      } catch { storageError(); }
    }
  }
  function updateProgress() {
    if (!isWork || !settings.enabled) return;
    $('#width-value').textContent = `约 ${Math.max(1, Math.floor(Math.min(settings.width, innerWidth - 56) / (settings.size * (1 + settings.tracking))))} 字 / 行`;
    const rect = story.getBoundingClientRect();
    const fraction = pager?.enabled ? (pager.count > 1 ? pager.page / (pager.count - 1) : 0) : Math.max(0, Math.min(1, (readingTop() - rect.top) / Math.max(1, rect.height - innerHeight + 160)));
    $('#page-count').textContent = `第 ${pager.page + 1} / ${pager.count} 页`;
    $('#page-previous').disabled = pager.page === 0;
    $('#page-next').disabled = pager.page >= pager.count - 1;
    $('#percentage').textContent = `${pager?.enabled ? '阅读进度' : '本页已读'} ${Math.round(fraction * 100)}%`;
    $('.progress').style.width = `${fraction * 100}%`;
    const minutes = (hanCount / settings.speed + otherWords / 230) * (1 - fraction);
    $('#remaining').textContent = fraction >= 1 ? (pager?.enabled ? '已到末页' : '本页已读完') : `${pager?.enabled ? '剩余约' : '本页剩余约'} ${Math.max(1, Math.ceil(minutes))} 分钟`;
    $('#text-count').textContent = hanCount ? `本页 ${hanCount.toLocaleString('zh-CN')} 汉字` : `本页 ${otherWords.toLocaleString('zh-CN')} 词`;
  }
  function changeSetting(name, value) {
    if (!isWork || !settings.enabled) return;
    const position = (pager?.enabled || blocks[0]?.getBoundingClientRect().top <= readingTop()) ? currentPosition() : null;
    settings[name] = value; apply(); if (position) restore(position); void persistSettings();
  }
  for (const id of ['appearance', 'contents']) {
    $(`#${id}-button`).addEventListener('click', () => { const open = $(`#${id}`).hidden; closePanels(); $(`#${id}`).hidden = !open; $(`#${id}-button`).setAttribute('aria-expanded', String(open)); if (open) $(`#${id} .close`).focus(); });
    $(`#${id} .close`).addEventListener('click', () => closePanels(true));
  }
  $('#reader-switch').addEventListener('click', async () => {
    if (!ready) return;
    $('#reader-switch').disabled = true;
    try {
      if (settings.enabled) {
        await save(true);
        clearTimeout(saveTimer);
        settings.enabled = false;
        apply();
        window.scrollTo({ top: 0, behavior: 'instant' });
        await persistSettings();
      } else {
        settings.enabled = true;
        interacted = false;
        ready = false;
        await persistSettings();
        await init();
      }
    } finally { $('#reader-switch').disabled = false; $('#reader-switch').focus(); }
  });
  $('#library-button').addEventListener('click', () => { if ($('#library').hidden) void openLibrary(); else collapseLibrary(true); });
  $('#close-library').addEventListener('click', () => collapseLibrary(true));
  $('#mini-expand').addEventListener('click', () => { void openLibrary(); $('#close-library').focus(); });
  $('#mini-history').addEventListener('click', () => { void openLibrary('history'); $('#history-tab').focus(); });
  $('#mini-bookmarks').addEventListener('click', () => { void openLibrary('bookmarks'); $('#bookmarks-tab').focus(); });
  $('#mini-save').addEventListener('click', () => { void recordBookmark(true); });
  $('#history-tab').addEventListener('click', () => setLibraryView('history'));
  $('#bookmarks-tab').addEventListener('click', () => setLibraryView('bookmarks'));
  $('#library-search').addEventListener('input', renderLibrary);
  $('#record-position').addEventListener('click', () => { void recordBookmark(); });
  $('#save-bookmark').addEventListener('click', () => { void recordBookmark(); });
  $('#undo-bookmark').addEventListener('click', async () => {
    if (!removedBookmark) return;
    try { await library.undoRemove(removedBookmark); removedBookmark = null; $('#undo-bookmark').hidden = true; $('#library-status').textContent = '书签已恢复。'; await refreshLibrary(); }
    catch { $('#library-status').textContent = '恢复失败，请重试。'; }
  });
  for (const id of ['size', 'width', 'leading', 'gap', 'speed', 'tracking']) $(`#${id}`).addEventListener('input', event => changeSetting(id, Number(event.target.value)));
  $('#font').addEventListener('change', event => changeSetting('font', event.target.value));
  $('#weight').addEventListener('change', event => changeSetting('weight', Number(event.target.value)));
  $('#apply-font').addEventListener('click', () => {
    const customFont = normalizeFont($('#custom-font').value);
    if (!customFont) { $('#font-status').textContent = '请输入字体名称，例如 Microsoft YaHei。'; return; }
    changeSetting('customFont', customFont);
    $('#font-status').textContent = '已应用本机字体设置。未安装的字体会使用备用字体。';
  });
  $('#mode').addEventListener('change', event => changeSetting('mode', event.target.value));
  for (const id of ['notes', 'resume', 'indent', 'animation']) $(`#${id}`).addEventListener('change', event => changeSetting(id, event.target.checked));
  function turnPage(delta) { interacted = true; pager.go(pager.page + delta); }
  $('#page-previous').addEventListener('click', () => turnPage(-1));
  $('#page-next').addEventListener('click', () => turnPage(1));
  ui.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => changeSetting('theme', button.dataset.theme)));
  $('#reset').addEventListener('click', () => {
    const position = isWork && (pager?.enabled || blocks[0]?.getBoundingClientRect().top <= readingTop()) ? currentPosition() : null;
    settings = { ...defaults }; apply(); if (position) restore(position); void persistSettings();
  });
  $('.chapter-list').addEventListener('click', () => { interacted = true; void save(); closePanels(); });
  function revealHash() {
    if (!pager?.enabled || !location.hash) return;
    try { const target = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (target && workskin.contains(target)) pager.reveal(target); } catch { /* Malformed author anchor. */ }
  }
  window.addEventListener('hashchange', revealHash);
  document.addEventListener('click', event => {
    const link = event.composedPath().find(node => node instanceof HTMLAnchorElement);
    if (!pager?.enabled || !link) return;
    const url = new URL(link.href, location.href);
    if (url.pathname === location.pathname && url.search === location.search && url.hash) requestAnimationFrame(revealHash);
  });
  $('#dismiss-resume').addEventListener('click', () => { $('.resume').hidden = true; });
  document.addEventListener('keydown', event => {
    if (!settings.enabled) return;
    const target = event.composedPath()[0];
    if (siteHeader?.contains(target)) return;
    if (target instanceof Element && (target.matches('input, textarea, select') || target.isContentEditable)) return;
    if (event.key === 'Escape') {
      const panelOpen = !$('#appearance').hidden || !$('#contents').hidden;
      closePanels(true);
      if (!panelOpen && !$('#library').hidden) collapseLibrary(true);
      return;
    }
    if (event.composedPath().includes($('#library')) || event.composedPath().includes($('#library-mini'))) return;
    if (pager?.enabled && !event.altKey && !event.ctrlKey && !event.metaKey && $('#appearance').hidden && $('#contents').hidden && !(target instanceof Element && target.closest('button, a, [role="button"]'))) {
      const forward = ['ArrowRight', 'PageDown', ' '].includes(event.key);
      const backward = ['ArrowLeft', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey);
      if (forward || backward) { event.preventDefault(); turnPage(backward ? -1 : 1); return; }
    }
    if (isWork && event.altKey && !event.shiftKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { const a = $(event.key === 'ArrowLeft' ? '#previous' : '#next'); if (!a.hidden) { event.preventDefault(); a.click(); } }
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) interacted = true;
  });
  document.addEventListener('pointerdown', event => { if (event.target !== host) { interacted = true; closePanels(); } }, { passive: true });
  window.addEventListener('wheel', () => { interacted = true; }, { passive: true });
  let wheelAmount = 0, lastWheel = 0, lastTurn = 0;
  document.addEventListener('wheel', event => {
    if (!pager?.enabled || event.ctrlKey || event.target === host || siteHeader?.contains(event.target) || !$('#appearance').hidden || !$('#contents').hidden) return;
    event.preventDefault();
    const now = Date.now();
    if (now - lastWheel > 180) wheelAmount = 0;
    lastWheel = now;
    if (now - lastTurn < 550) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.sign(delta) !== Math.sign(wheelAmount)) wheelAmount = 0;
    wheelAmount += delta * (event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? innerHeight : 1);
    if (Math.abs(wheelAmount) >= 65) { turnPage(Math.sign(wheelAmount)); wheelAmount = 0; lastTurn = now; }
  }, { passive: false });
  window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { if (!isWork) measureNavigation(); updateProgress(); scrollFrame = null; }); clearTimeout(saveTimer); saveTimer = setTimeout(save, 500); }, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  window.addEventListener('pagehide', () => { void save(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateProgress(); else void save(); });
  document.addEventListener('click', event => { if (event.composedPath().includes($('#library'))) return; if (event.composedPath().some(node => node instanceof HTMLAnchorElement)) void save(); }, true);

  async function init() {
    if (storage) try {
      const data = await storage.get(isWork ? ['settings', key] : ['settings']); saved = isWork ? data[key] : null;
      const input = data.settings || {};
      for (const id of ['enabled', 'notes', 'resume', 'indent', 'animation', 'libraryOpen']) if (typeof input[id] === 'boolean') settings[id] = input[id];
      if (['scroll', 'paged'].includes(input.mode)) settings.mode = input.mode;
      if (['light', 'paper', 'dark'].includes(input.theme)) settings.theme = input.theme;
      if (Object.hasOwn(fonts, input.font) || input.font === 'custom') settings.font = input.font;
      settings.customFont = normalizeFont(input.customFont);
      if ([300, 400, 500, 600, 700].includes(input.weight)) settings.weight = input.weight;
      for (const [id, min, max] of [['size', 16, 30], ['width', 480, 960], ['leading', 1.4, 2.4], ['gap', 0, 2], ['speed', 200, 1000], ['tracking', 0, .15]]) if (Number.isFinite(input[id])) settings[id] = Math.max(min, Math.min(max, input[id]));
    } catch { storageError(); }
    apply();
    if (!settings.enabled) { ready = true; return; }
    if (!isWork) { if (settings.libraryOpen) await refreshLibrary(); ready = true; return; }
    try { await library.visit(work); } catch { storageError(); }
    if (settings.libraryOpen) await refreshLibrary();
    const bookmarkId = location.hash.match(/^#cl-bookmark=([a-zA-Z0-9-]{1,64})$/)?.[1];
    const explicitResume = location.hash === '#cl-resume';
    let requestedPosition = null;
    if (bookmarkId) {
      try { requestedPosition = (await library.getBookmark(bookmarkId, workId))?.position || null; } catch { storageError(); }
      if (!requestedPosition) { await openLibrary('bookmarks'); $('#library-status').textContent = '这个书签已移除或无法读取。'; }
    } else if (explicitResume) requestedPosition = saved;
    if (requestedPosition) {
      const target = safeUrl(requestedPosition.url);
      if (target && !samePage(target)) {
        target.hash = bookmarkId ? `cl-bookmark=${bookmarkId}` : 'cl-resume';
        navigatingToPosition = true; location.replace(target.href); return;
      }
      if (target) {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(resolve));
        restore(requestedPosition);
        history.replaceState(history.state, '', positionUrl());
        ready = true; await save(true); return;
      }
    }
    // Respect deliberate anchor links and browser back/forward position restoration.
    const backForward = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    if (isWork && settings.resume && saved && !location.hash && !backForward) {
      const url = safeUrl(saved.url);
      if (samePage(url)) { await document.fonts.ready; requestAnimationFrame(() => { if (!interacted) restore(saved); ready = true; }); }
      else if (url && !pageChapterId && new URL(location.href).searchParams.get('view_full_work') !== 'true') {
        url.hash = 'cl-resume'; navigatingToPosition = true; location.replace(url.href); return;
      }
      else if (url) { url.hash = 'cl-resume'; $('#resume-link').href = url.href; $('.resume').hidden = false; ready = true; }
      else ready = true;
    } else ready = true;
    revealHash();
  }
  void init();
})();
