(() => {
  'use strict';
  class ChapterlightLibrary {
    constructor(storage, origin) { this.storage = storage; this.origin = origin; }
    safeUrl(raw, workId) {
      try {
        const url = new URL(raw, this.origin);
        const match = url.pathname.match(/^\/works\/(\d+)(?:\/chapters\/\d+)?\/?$/);
        if (url.origin !== this.origin || url.username || url.password || !match || (workId && match[1] !== String(workId))) return null;
        return url;
      } catch { return null; }
    }
    async visit(work) {
      if (!this.storage) return;
      await this.storage.set({ [`history:${work.id}`]: { ...work, visited: Date.now() } });
    }
    async entries() {
      if (!this.storage) return { history: [], bookmarks: [] };
      const data = await this.storage.get(null);
      const history = [], bookmarks = [];
      for (const [key, value] of Object.entries(data)) {
        if (!value || typeof value !== 'object') continue;
        if (key.startsWith('history:')) {
          const id = key.slice(8);
          if (!/^\d+$/.test(id)) continue;
          const progress = data[`progress:${id}`];
          const position = progress && this.safeUrl(progress.url, id) ? progress : null;
          const url = this.safeUrl(position?.url || value.url, id);
          if (url) history.push({ ...value, id, url: url.href, position, updated: Math.max(Number(value.visited) || 0, Number(position?.updated) || 0) });
        } else if (/^progress:\d+$/.test(key) && !data[`history:${key.slice(9)}`] && this.safeUrl(value.url, key.slice(9))) {
          const id = key.slice(9);
          history.push({ id, title: value.title || `作品 ${id}`, url: value.url, position: value, updated: Number(value.updated) || 0 });
        } else if (key.startsWith('bookmark:') && !value.removed && typeof value.id === 'string' && key === `bookmark:${value.id}` && this.safeUrl(value.position?.url, value.workId)) {
          bookmarks.push(value);
        }
      }
      history.sort((a, b) => b.updated - a.updated);
      bookmarks.sort((a, b) => b.created - a.created);
      return { history, bookmarks };
    }
    async bookmark(work, position, label) {
      if (!this.storage) throw new Error('Storage unavailable');
      if (!position || !this.safeUrl(position.url, work.id)) throw new Error('Invalid position');
      const id = crypto.randomUUID();
      const entry = { id, workId: work.id, title: work.title, author: work.author, label: label.trim().slice(0, 100), position, created: Date.now() };
      await this.storage.set({ [`bookmark:${id}`]: entry });
      return entry;
    }
    async getBookmark(id, workId) {
      if (!/^[a-zA-Z0-9-]{1,64}$/.test(id) || !this.storage) return null;
      const key = `bookmark:${id}`;
      const entry = (await this.storage.get([key]))[key];
      return entry && !entry.removed && entry.workId === workId && this.safeUrl(entry.position?.url, workId) ? entry : null;
    }
    async removeBookmark(entry) { await this.storage.set({ [`bookmark:${entry.id}`]: { ...entry, removed: true } }); }
    async undoRemove(entry) { await this.storage.set({ [`bookmark:${entry.id}`]: { ...entry, removed: false } }); }
  }
  globalThis.ChapterlightLibrary = ChapterlightLibrary;
})();
