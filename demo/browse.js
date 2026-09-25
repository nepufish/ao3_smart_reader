// Same preview-only storage as the novel fixture; never shipped with the extension.
window.chrome = { storage: { local: {
  async get(keys) { const requested = keys || Object.keys(localStorage).filter(key => key.startsWith('cl-demo:')).map(key => key.slice(8)); return Object.fromEntries(requested.map(key => [key, JSON.parse(localStorage.getItem('cl-demo:' + key) || 'null')])); },
  async set(values) { for (const [key, value] of Object.entries(values)) localStorage.setItem('cl-demo:' + key, JSON.stringify(value)); }
} } };
