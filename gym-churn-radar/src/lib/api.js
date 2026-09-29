export const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === '1';

const API = PUBLIC_DEMO ? '' : (import.meta.env.VITE_API_BASE || 'https://shameelirtaza.app.n8n.cloud/webhook').replace(/\/$/, '');

export const uploadFormUrl = PUBLIC_DEMO ? '' : API.replace(/\/webhook$/, '/form/gym-churn-upload');
export const checkinWebhookUrl = PUBLIC_DEMO ? 'https://your-n8n-workspace/webhook/gym-checkin' : API + '/gym-checkin';

export async function fetchGym() {
  if (PUBLIC_DEMO) return (await import('../demo/backend.js')).demoFetch();
  const res = await fetch(API + '/gym-churn-api', { cache: 'no-store' });
  if (!res.ok) throw new Error('n8n answered with status ' + res.status);
  return res.json();
}

export async function postAction(action, params = {}) {
  if (PUBLIC_DEMO) return (await import('../demo/backend.js')).demoAction(action, params);
  const query = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const res = await fetch(API + '/gym-churn-action?' + query.toString(), { method: 'POST' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw new Error(body.message || 'n8n refused the request');
  return body;
}
