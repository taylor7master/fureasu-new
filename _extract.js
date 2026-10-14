const fs = require('fs');
const path = require('path');
const https = require('https');

const env = fs.readFileSync(path.join(__dirname, 'Figma.env'), 'utf8');
const token = env.match(/figma_api_token=(\S+)/)[1];
const file = 'wDa98bLOH3H7apRugClo4m';
const outDir = path.join(__dirname, '_design');
fs.mkdirSync(outDir, { recursive: true });

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'X-Figma-Token': token } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 400) {
          reject(new Error(res.statusCode + ' ' + buf.toString().slice(0, 400)));
          return;
        }
        const type = res.headers['content-type'] || '';
        if (type.includes('json') || buf[0] === 0x7b) resolve(JSON.parse(buf.toString()));
        else resolve(buf);
      });
    });
    req.on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', reject);
  });
}

function hex(color) {
  if (!color) return '';
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

function solid(node) {
  const fills = (node.fills || []).filter((f) => f.visible !== false && f.type === 'SOLID');
  if (!fills.length) return '';
  return hex(fills[0].color);
}

const pages = {
  'pc-top': '182:398',
  'sp-top': '182:977',
  'pc-company': '182:1504',
  'sp-company': '182:1797',
  'dropdown': '182:2052',
  'hamburger': '182:2096',
};

function walk(node, origin, lines, depth) {
  if (!node || node.visible === false) return;
  const bb = node.absoluteBoundingBox;
  const y = bb ? Math.round(bb.y - origin.y) : 0;
  const x = bb ? Math.round(bb.x - origin.x) : 0;
  const w = bb ? Math.round(bb.width) : 0;
  const h = bb ? Math.round(bb.height) : 0;
  if (node.type === 'TEXT') {
    const style = node.style || {};
    const text = (node.characters || '').replace(/\n/g, '\\n');
    lines.push(
      [
        String(y).padStart(5),
        String(x).padStart(5),
        String(w).padStart(4),
        String(h).padStart(4),
        (style.fontFamily || '') + ' ' + (style.fontWeight || '') + ' ' + (style.fontSize || ''),
        solid(node),
        'lh' + (style.lineHeightPx ? Math.round(style.lineHeightPx) : ''),
        'ls' + (style.letterSpacing || 0),
        text,
      ].join('\t')
    );
  }
  const kids = node.children || [];
  for (const k of kids) walk(k, origin, lines, depth + 1);
}

(async () => {
  const ids = Object.values(pages).join(',');
  console.log('request images');
  const images = await get(
    `https://api.figma.com/v1/images/${file}?ids=${encodeURIComponent(ids)}&format=png&scale=0.35`
  );
  for (const [name, id] of Object.entries(pages)) {
    const url = images.images[id];
    if (!url) {
      console.log('no image', name);
      continue;
    }
    const dest = path.join(outDir, name + '.png');
    await download(url, dest);
    console.log('saved', dest);
  }

  for (const [name, id] of Object.entries(pages)) {
    console.log('fetch node', name);
    const data = await get(
      `https://api.figma.com/v1/files/${file}/nodes?ids=${encodeURIComponent(id)}`
    );
    const doc = data.nodes[id].document;
    const origin = doc.absoluteBoundingBox;
    const lines = [];
    walk(doc, origin, lines, 0);
    fs.writeFileSync(path.join(outDir, name + '-text.txt'), lines.join('\n'), 'utf8');
    console.log(name, 'texts', lines.length);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
