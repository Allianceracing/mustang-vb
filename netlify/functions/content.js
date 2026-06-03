// Netlify Function: content.js
// Handles GET (read content) and POST (save content) using Netlify Blobs.
// Saves are protected by a shared secret (ADMIN_SECRET env var in Netlify).

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'mustang-vb';
const CONTENT_KEY = 'content';
const PWD_KEY = 'admin-pwd-hash';

export default async (req, context) => {
  const store = getStore(STORE_NAME);
  const url = new URL(req.url);
  const which = url.searchParams.get('key') || 'content'; // 'content' or 'pwd'
  const storageKey = which === 'pwd' ? PWD_KEY : CONTENT_KEY;

  // ─── GET: anyone can read ───
  if (req.method === 'GET') {
    try {
      const value = await store.get(storageKey);
      return new Response(JSON.stringify({ ok: true, value: value || null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // ─── POST: requires shared secret ───
  if (req.method === 'POST') {
    const secret = req.headers.get('x-admin-secret');
    const expected = Netlify.env.get('ADMIN_SECRET');
    if (!expected) {
      return new Response(JSON.stringify({ ok: false, error: 'Server not configured: missing ADMIN_SECRET' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
