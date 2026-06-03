const STORE_NAME = 'mustang-vb';
const CONTENT_KEY = 'content';
const PWD_KEY = 'admin-pwd-hash';

function blobUrl(siteID, storeName, key) {
  return 'https://api.netlify.com/api/v1/blobs/' + siteID + '/' + storeName + '/' + encodeURIComponent(key);
}

async function blobGet(siteID, token, storeName, key) {
  const r = await fetch(blobUrl(siteID, storeName, key), {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Blob read failed: ' + r.status);
  return await r.text();
}

async function blobSet(siteID, token, storeName, key, value) {
  const r = await fetch(blobUrl(siteID, storeName, key), {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/octet-stream'
    },
    body: value
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error('Blob write failed: ' + r.status + ' ' + text);
  }
  return true;
}

exports.handler = async function(event, context) {
  const params = event.queryStringParameters || {};
  const which = params.key || 'content';
  const storageKey = which === 'pwd' ? PWD_KEY : CONTENT_KEY;

  const siteID = process.env.SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;
  const adminSecret = process.env.ADMIN_SECRET;

  const json = function(status, obj) {
    return {
      statusCode: status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(obj)
    };
  };

  if (event.httpMethod === 'GET') {
    try {
      if (!siteID || !token) return json(500, { ok: false, error: 'Missing SITE_ID or NETLIFY_API_TOKEN' });
      const value = await blobGet(siteID, token, STORE_NAME, storageKey);
      return json(200, { ok: true, value: value || null });
    } catch (e) {
      return json(500, { ok: false, error: e.message });
    }
  }

  if (event.httpMethod === 'POST') {
    const secret = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
    if (!adminSecret) return json(500, { ok: false, error: 'Missing ADMIN_SECRET' });
    if (secret !== adminSecret) return json(401, { ok: false, error: 'Unauthorized' });
    if (!siteID || !token) return json(500, { ok: false, error: 'Missing SITE_ID or NETLIFY_API_TOKEN' });
    try {
      const body = JSON.parse(event.body || '{}');
      if (typeof body.value !== 'string') return json(400, { ok: false, error: 'value must be a string' });
      await blobSet(siteID, token, STORE_NAME, storageKey, body.value);
      return json(200, { ok: true });
    } catch (e) {
      return json(500, { ok: false, error: e.message });
    }
  }

  return json(405, { ok: false, error: 'Method not allowed' });
};
