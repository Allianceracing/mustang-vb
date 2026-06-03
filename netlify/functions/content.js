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

exports.handler = async function(event, context) {
  const params = event.queryStringParameters || {};
  const which = params.key || 'content';
  const storageKey = which === 'pwd' ? PWD_KEY : CONTENT_KEY;

  const siteID = process.env.SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;
  const adminSecret = process.env.ADMIN_SECRET;

  const json = (status, obj) => ({
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Con
