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
      });
    }
    if (secret !== expected) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    try {
      const body = await req.json();
      if (typeof body.value !== 'string') {
        return new Response(JSON.stringify({ ok: false, error: 'value must be a string' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await store.set(storageKey, body.value);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = {
  path: '/api/content'
};
