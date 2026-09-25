(() => {
  const host = document.querySelector('#chapterlight-root');
  if (!host?.shadowRoot) return;
  const ui = host.shadowRoot;
  const style = document.createElement('style');
  style.textContent = `@media(max-width:700px) {
    .top { padding:0 10px; }
    .sidebar { left:8px; bottom:116px; padding:14px; }
    .sidebar.mini { width:44px; padding:4px; gap:8px; }
    .mini button { padding:7px 0; font-size:10px; }
    .mini .mini-icon { font-size:20px; }
    .reader-switch { right:12px; bottom:62px; min-height:44px; padding:8px 12px; font-size:13px; gap:8px; }
    .bottom { padding:0 8px; gap:6px; }
    #remaining,#text-count,#save-state { display:none; }
    .page-controls { gap:4px; }
    .page-controls button { padding:6px 9px; }
    #page-count { min-width:66px; }
    .bottom .nav { padding:5px 2px; }
    .resume { max-width:calc(100vw - 24px); white-space:normal; bottom:116px; }
  }`;
  ui.append(style);
  let start = null;
  document.addEventListener('touchstart', event => {
    const target = event.target;
    if (!document.documentElement.classList.contains('cl-paged') || event.touches.length !== 1
        || target === host || target.closest('a,button,input,textarea,select,#header') || getSelection()?.toString()) {
      start = null; return;
    }
    start = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', event => {
    if (!start || !event.changedTouches.length) return;
    const gesture = start; start = null;
    const dx = event.changedTouches[0].clientX - gesture.x;
    const dy = event.changedTouches[0].clientY - gesture.y;
    if (Date.now() - gesture.time > 650 || Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.8 || getSelection()?.toString()) return;
    if (!ui.querySelector('#appearance').hidden || !ui.querySelector('#contents').hidden) return;
    ui.querySelector(dx < 0 ? '#page-next' : '#page-previous')?.click();
  }, { passive: true });
  document.addEventListener('touchcancel', () => { start = null; }, { passive: true });
})();
