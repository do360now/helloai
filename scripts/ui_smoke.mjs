#!/usr/bin/env node
// Rendered-page smoke check for the "why this rank" line. Unit tests cannot see this: a formatter bug
// ("Curator's pick +0.00" on an unlabelled model) only showed up on a rendered page.
//
//   node scripts/ui_smoke.mjs [BASE_URL]        default http://localhost:3000
//
// No dependencies: it drives a local Chromium over the DevTools protocol using Node's built-in fetch and
// WebSocket (Node 22+). Set CHROME=/path/to/chrome, or it looks in the Playwright cache and common paths.
// Exits 0 with a message when no Chromium is found (a missing browser never fails a deploy).
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const PORT = 9333 + Math.floor(Math.random() * 500);

function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
      const p = join(cache, dir, 'chrome-linux64', 'chrome');
      if (existsSync(p)) return p;
    }
  }
  return ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(existsSync);
}

const chrome = findChrome();
if (!chrome) {
  console.log('ui_smoke: no Chromium found (set CHROME=...); skipping.');
  process.exit(0);
}

const profile = mkdtempSync(join(tmpdir(), 'ui-smoke-'));
const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill(); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 30 && !target; i++) {
  try { target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { await sleep(300); }
}
if (!target) { console.log('ui_smoke: could not reach the browser.'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const run = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.result.value;

await send('Page.enable');
await send('Page.navigate', { url: BASE });
await sleep(6000);

const failures = [];
const chips = await run(`[...document.querySelectorAll('.model-filter-chip')].map(b => b.textContent.trim())`);
const categories = chips.filter((c) => !/price|Under \$|Any/i.test(c));
if (categories.length === 0) failures.push('no category filter chips rendered (page did not hydrate?)');

for (const chip of categories) {
  await run(`[...document.querySelectorAll('.model-filter-chip')].find(b => b.textContent.trim() === ${JSON.stringify(chip)})?.click()`);
  await sleep(700);
  const lines = await run(`[...document.querySelectorAll('.model-why-rank')].map(p => p.textContent)`);
  console.log(`[${chip}] ${lines.length} why-rank line(s)`);
  lines.forEach((l) => console.log('   ' + l));
  if (lines.length === 0) failures.push(`${chip}: no "why this rank" line rendered`);
  for (const l of lines) {
    if (/Curator's pick \+0\.00|Curator-rated strength \+0\.00/.test(l)) failures.push(`${chip}: a zero curator part is labelled as a pick/strength: ${l}`);
    if (!/Elo \+\d/.test(l) || !/cost \+\d/.test(l) || !/context \+\d/.test(l)) failures.push(`${chip}: incomplete breakdown: ${l}`);
  }
  // A model in the "Not yet rated" group is never explained as a rank.
  const unratedLines = await run(`document.querySelectorAll('.models-unrated .model-why-rank').length`);
  if (unratedLines > 0) failures.push(`${chip}: an unrated card shows a why-rank line`);
  await run(`[...document.querySelectorAll('.model-filter-chip')].find(b => b.textContent.trim() === ${JSON.stringify(chip)})?.click()`);
  await sleep(300);
}

ws.close();
cleanup();
if (failures.length) { console.log('\nFAIL'); failures.forEach((f) => console.log(' - ' + f)); process.exit(1); }
console.log('\nPASS');
process.exit(0);
