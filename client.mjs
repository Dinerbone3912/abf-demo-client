#!/usr/bin/env node
// Minimal MCP (Streamable HTTP, JSON-RPC) client for Agent Bounty Feed.
// No dependencies. Node 18+ (global fetch).
// Usage: node client.mjs            -> list_bounties (default limit 10)
//        node client.mjs stats      -> get_feed_stats
const MCP_URL = process.env.ABF_MCP_URL || 'https://agent-bounty-feed.dailydollar.workers.dev/mcp';

let _id = 0;
async function rpc(method, params, sessionId) {
  const headers = { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: ++_id, method, params }),
  });
  const sid = res.headers.get('mcp-session-id') || sessionId;
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  // Streamable HTTP may reply with SSE framing; extract the JSON-RPC payload.
  let payload = text;
  if (ct.includes('text/event-stream')) {
    for (const line of text.split('\n')) {
      if (line.startsWith('data:')) { payload = line.slice(5).trim(); if (payload) break; }
    }
  }
  let json;
  try { json = JSON.parse(payload); } catch { throw new Error('non-JSON response: ' + text.slice(0, 200)); }
  return { json, sid };
}

async function init() {
  const { json, sid } = await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'abf-demo-client', version: '1.0.0' },
  });
  if (json.error) throw new Error('initialize error: ' + JSON.stringify(json.error));
  // best-effort initialized notification (some servers require it)
  await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream', ...(sid ? { 'mcp-session-id': sid } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  }).catch(() => {});
  return { serverInfo: json.result?.serverInfo, sid };
}

async function callTool(name, args, sid) {
  const { json } = await rpc('tools/call', { name, arguments: args }, sid);
  if (json.error) throw new Error('tool error: ' + JSON.stringify(json.error));
  // MCP tool results: result.content = [{type:'text', text:'...'}]
  const parts = json.result?.content || [];
  const textPart = parts.find(p => p.type === 'text');
  if (textPart) { try { return JSON.parse(textPart.text); } catch { return textPart.text; } }
  return json.result;
}

(async () => {
  const mode = process.argv[2] || 'list';
  const { serverInfo, sid } = await init();
  console.error(`connected to ${serverInfo?.name || 'MCP'} v${serverInfo?.version || '?'}`);
  if (mode === 'stats') {
    console.log(JSON.stringify(await callTool('get_feed_stats', {}, sid), null, 2));
    return;
  }
  const data = await callTool('list_bounties', { limit: 10 }, sid);
  console.log(JSON.stringify(data, null, 2));
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
