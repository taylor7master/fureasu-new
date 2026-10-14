const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, 'Figma.env'), 'utf8');
const token = (env.match(/figma_api_token\s*=\s*(\S+)/) || [])[1];
const fileKey = 'wDa98bLOH3H7apRugClo4m';

function slim(node) {
  const b = node.absoluteBoundingBox || {};
  const out = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: b.x != null ? Math.round(b.x) : null,
    y: b.y != null ? Math.round(b.y) : null,
    w: b.width != null ? Math.round(b.width) : null,
    h: b.height != null ? Math.round(b.height) : null
  };
  if (node.layoutMode) {
    out.layout = {
      mode: node.layoutMode,
      gap: node.itemSpacing,
      pad: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft],
      primary: node.primaryAxisAlignItems,
      counter: node.counterAxisAlignItems,
      wrap: node.layoutWrap
    };
  }
  if (node.characters) out.text = node.characters;
  if (node.style) {
    out.style = {
      font: node.style.fontFamily,
      size: node.style.fontSize,
      weight: node.style.fontWeight,
      lh: node.style.lineHeightPx,
      ls: node.style.letterSpacing,
      align: node.style.textAlignHorizontal
    };
  }
  if (node.fills && node.fills.length) {
    out.fills = node.fills.filter(f => f.visible !== false).map(f => {
      if (f.type === 'SOLID') return { t: 'SOLID', c: f.color, o: f.opacity };
      if (f.type === 'IMAGE') return { t: 'IMAGE', ref: f.imageRef, scale: f.scaleMode };
      return { t: f.type };
    });
  }
  if (node.strokes && node.strokes.length) {
    out.stroke = node.strokes.filter(s => s.visible !== false).map(s => ({ c: s.color, w: node.strokeWeight }));
  }
  if (node.cornerRadius) out.radius = node.cornerRadius;
  if (node.children) out.children = node.children.map(slim);
  return out;
}

function lines(node, depth, acc) {
  const indent = '  '.repeat(depth);
  let label = indent + node.type + ' ' + node.w + 'x' + node.h + ' @' + node.x + ',' + node.y + ' [' + node.name + ']';
  if (node.text) label += ' "' + node.text.replace(/\n/g, '\\n').slice(0, 80) + '"';
  if (node.style) label += ' ' + node.style.size + '/' + node.style.weight + ' ' + node.style.font;
  if (node.fills && node.fills[0] && node.fills[0].t === 'SOLID' && node.fills[0].c) {
    const c = node.fills[0].c;
    label += ' #' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
  if (node.layout) label += ' layout=' + node.layout.mode + ' gap=' + node.layout.gap;
  acc.push(label);
  (node.children || []).forEach(c => lines(c, depth + 1, acc));
}

async function getNodes() {
  for (let i = 0; i < 8; i++) {
    const res = await fetch('https://api.figma.com/v1/files/' + fileKey + '/nodes?ids=218:335,218:518', {
      headers: { 'X-Figma-Token': token }
    });
    if (res.status === 429) {
      const wait = 20000 * (i + 1);
      console.log('429, wait', wait);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return res;
  }
  throw new Error('still 429');
}
getNodes().then(async (res) => {
  const text = await res.text();
  if (!res.ok) {
    console.error('status', res.status, text.slice(0, 400));
    process.exit(1);
  }
  const data = JSON.parse(text);
  const pc = slim(data.nodes['218:335'].document);
  const sp = slim(data.nodes['218:518'].document);
  fs.writeFileSync(path.join(__dirname, '_design', 'csr-pc.json'), JSON.stringify(pc));
  fs.writeFileSync(path.join(__dirname, '_design', 'csr-sp.json'), JSON.stringify(sp));
  const acc = [];
  lines(pc, 0, acc);
  fs.writeFileSync(path.join(__dirname, '_design', 'csr-pc.txt'), acc.join('\n'));
  const acc2 = [];
  lines(sp, 0, acc2);
  fs.writeFileSync(path.join(__dirname, '_design', 'csr-sp.txt'), acc2.join('\n'));
  console.log('pc lines', acc.length, 'sp lines', acc2.length);
  console.log(acc.slice(0, 80).join('\n'));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
