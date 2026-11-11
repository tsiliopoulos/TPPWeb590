const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'Wasm');
const output = path.join(root, '_site');
fs.mkdirSync(output, { recursive: true });
fs.cpSync(source, output, { recursive: true });

const wasm = path.join(output, 'TPPWeb590/Binaries/Wasm/TPPWeb590-Wasm-Shipping.wasm');
fs.writeFileSync(wasm, zlib.brotliDecompressSync(fs.readFileSync(wasm + '.br')));

// Packaging can reset this option. Enable it in the deployment copy every time.
const htmlPath = path.join(output, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const isolation = /(<meta\s+name="ue-sw-isolation"\s+content=")[01](">)/;
if (!isolation.test(html)) throw new Error('Missing ue-sw-isolation setting');
const updated = html.replace(isolation, '$11$2');
fs.writeFileSync(htmlPath, updated);
fs.writeFileSync(htmlPath + '.br', zlib.brotliCompressSync(Buffer.from(updated)));

// Check the reconstructed binary and every cached asset against the export.
const entries = JSON.parse(fs.readFileSync(path.join(output, 'wasm-cache.json'), 'utf8'));
for (const entry of entries) {
  const bytes = fs.readFileSync(path.join(output, entry.url));
  const hash = crypto.createHash('sha1').update(bytes).digest('hex');
  if (bytes.length !== entry.size || hash !== entry.sha1) {
    throw new Error('Export integrity check failed: ' + entry.url);
  }
}
console.log('Prepared _site; verified ' + entries.length + ' cached assets.');
