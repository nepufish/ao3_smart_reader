// App-private WebView storage, scoped by website origin. No native JS bridge.
const chrome = { storage: { local: {
  async get(keys) {
    const prefix = 'chapterlight:';
    const requested = keys || Object.keys(localStorage).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length));
    return Object.fromEntries(requested.map(key => {
      const raw = localStorage.getItem(prefix + key);
      const value = raw === null ? undefined : JSON.parse(raw);
      return [key, key === 'settings' ? { libraryOpen: false, size: 20, leading: 1.8, width: 640, ...value } : value];
    }));
  },
  async set(values) {
    for (const [key, value] of Object.entries(values)) localStorage.setItem('chapterlight:' + key, JSON.stringify(value));
  }
} } };
