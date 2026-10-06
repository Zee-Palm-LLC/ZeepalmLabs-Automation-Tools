export const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === '1';

const API = PUBLIC_DEMO ? '' : String(import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export async function fetchCare() {
  if (PUBLIC_DEMO) return (await import('../demo/backend.js')).demoFetch();
  if (!API) throw new Error('VITE_API_BASE is not set');
  const res = await fetch(API + '/dc-api', { cache: 'no-store' });
  if (!res.ok) throw new Error('n8n answered with status ' + res.status);
  return res.json();
}

export async function postAction(action, params = {}) {
  if (PUBLIC_DEMO) return (await import('../demo/backend.js')).demoAction(action, params);
  if (!API) throw new Error('VITE_API_BASE is not set');
  const query = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  const res = await fetch(API + '/dc-action?' + query.toString(), { method: 'POST' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw new Error(body.message || 'n8n refused the request');
  return body;
}
