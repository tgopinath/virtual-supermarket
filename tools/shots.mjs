// Captures the portfolio screenshots from the live site: node tools/shots.mjs
// Phone shots: 600-wide JPEGs in prototype/shots. Desktop: prototype/shots/web.jpg (1440x900, for the card's browser window).
// A demo shopper 'Asha' is created through onboarding first (progress lives in this headless profile's IndexedDB only).
// The 3D store needs WebGL: Chrome runs with SwiftShader.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'prototype', 'shots');
const LIVE = process.env.LIVE || 'https://my-supermarket-mu.vercel.app';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

fs.mkdirSync(SHOTS, { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, '.shots-'));
const dbg = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${dbg}`, `--user-data-dir=${tmp}/profile`, 'about:blank'], { stdio: 'ignore' });
try {
  let ws;
  for (let i = 0; i < 160 && !ws; i++) {
    try { const p = (await (await fetch(`http://127.0.0.1:${dbg}/json`)).json()).find(t => t.type === 'page'); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {}
    if (!ws) await sleep(250);
  }
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = {};
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  const phone = () => send('Emulation.setDeviceMetricsOverride', { width: 390, height: 849, deviceScaleFactor: 2, mobile: true });
  const capture = async (out, width) => {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    const png = path.join(tmp, 'shot.png');
    fs.writeFileSync(png, Buffer.from(s.result.data, 'base64'));
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', '--resampleWidth', String(width), png, '--out', out], { stdio: 'pipe' });
  };
  const grab = async (hash, file, { wait = 3500, js } = {}) => {
    await send('Page.navigate', { url: `${LIVE}/?shot=${file}${hash}` }); await sleep(wait);
    if (js) { await send('Runtime.evaluate', { expression: js, awaitPromise: true }); await sleep(2500); }
    await capture(path.join(SHOTS, file + '.jpg'), 600);
  };
  await phone();
  const run = async (js, wait = 1500) => { await send('Runtime.evaluate', { expression: js, awaitPromise: true }); await sleep(wait); };
  const click = re => `[...document.querySelectorAll('button')].find(b => ${re}.test(b.textContent) && !b.disabled)?.click()`;
  const ONBOARD = `(async () => { const s = ms => new Promise(r => setTimeout(r, ms));
    ${click('/start/i')}; await s(800);
    const i = document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'Asha'); i.dispatchEvent(new Event('input', { bubbles: true })); await s(300);
    [...document.querySelectorAll('button.btn-primary')].pop().click(); await s(800);
    document.querySelectorAll('button.panel')[1].click(); await s(800); })()`;
  await grab('', 'welcome');
  await run(ONBOARD, 2000);
  await capture(path.join(SHOTS, 'modes.jpg'), 600);
  await run(click('/learning path/i'), 1500); await capture(path.join(SHOTS, 'levels.jpg'), 600);
  await run(click('/^←$/'), 1000);
  await run(click('/my progress/i'), 1500); await capture(path.join(SHOTS, 'progress.jpg'), 600);
  await run(click('/^←$/'), 1000);
  await run(click('/free shopping/i'), 9000); await capture(path.join(SHOTS, 'entrance.jpg'), 600);
  await run(click('/enter the store/i'), 6000); await capture(path.join(SHOTS, 'store.jpg'), 600);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${LIVE}/?shot=desktop` }); await sleep(3000);
  await run(click('/play as/i'), 1500); await run(click('/free shopping/i'), 9000); await run(click('/enter the store/i'), 6000);
  await capture(path.join(SHOTS, 'web.jpg'), 1440);
  console.log('captured', fs.readdirSync(SHOTS).join(', '), '');
  ws.close();
} finally {
  const exited = new Promise(r => chrome.once('exit', r));
  chrome.kill();
  await Promise.race([exited, sleep(5000)]);
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
