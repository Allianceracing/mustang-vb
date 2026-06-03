const STORE_NAME = 'mustang-vb';
const CONTENT_KEY = 'content';
const PWD_KEY = 'admin-pwd-hash';

function blobUrl(siteID, storeName, key) {
  return `https://api.netlify.com/api/v1/blobs/${siteID}/${storeName}/${encodeURIComponent(key)}`;
}

async function blobGet(siteID, token, storeName, key) {
  const r = await fetch(blobUrl(siteID, storeName, key), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Blob read failed: ${r.status}`);
  return await r.text();
}

async function blobSet(siteID, token, storeName, key, value) {
  const r = await fetch(blobUrl(siteID, storeName, key), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream'
    },
    body: value
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Blob write failed: ${r.status} ${text}`);
  }
  return true;
}

export default async (req, context) => {
  const url = new URL(req.url);
  const which = url.searchParams.get('key') || 'content';
  const storageKey = which === 'pwd' ? PWD_KEY : CONTENT_KEY;

  const siteID = Netlify.env.get('SITE_ID') || context?.site?.id;
  const token = Netlify.env.get('NETLIFY_API_TOKEN');

  if (req.method === 'GET') {
    try {
      if (!siteID || !token) {
        return new Response(JSON.stringify({ ok: false, error: 'Server not configured: missing SITE_ID or NETLIFY_API_TOKEN' }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
      const value = await blobGet(siteID, token, STORE_NAME, storageKey);
      return new Response(JSON.stringify({ ok: true, value: value || null }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (req.method === 'POST') {
    const secret = req.headers.get('x-admin-secret');
    const expected = Netlify.env.get('ADMIN_SECRET');
    if (!expected) return new Response(JSON.stringify({ ok: false, error: 'Missing ADMIN_SECRET' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    if (secret !== expected) return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (!siteID || !token) return new Response(JSON.stringify({ ok: false, error: 'Missing SITE_ID or NETLIFY_API_TOKEN' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    try {
      const body = await req.json();
      if (typeof body.value !== 'string') return new Response(JSON.stringify({ ok: false, error: 'value must be a string' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      await blobSet(siteID, token, STORE_NAME, storageKey, body.value);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
};

export const config = { path: '/api/content' };
