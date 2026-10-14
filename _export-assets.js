const fs = require('fs');
const path = require('path');
const https = require('https');

const env = fs.readFileSync(path.join(__dirname, 'Figma.env'), 'utf8');
const token = env.match(/figma_api_token=(\S+)/)[1];
const file = 'wDa98bLOH3H7apRugClo4m';
const outDir = path.join(__dirname, 'assets', 'image');
fs.mkdirSync(outDir, { recursive: true });

const nodes = {
  'hero-main': '182:892',
  'hero-sub': '182:897',
  'service-1': '182:742',
  'service-2': '182:872',
  'service-3': '182:878',
  'service-4': '182:879',
  'service-5': '182:882',
  'card-company': '182:761',
  'card-recruit': '182:775',
  'card-fc': '182:794',
  'card-blog': '182:809',
  'president': '182:1579',
  'logo-mark': '182:1728',
  'video-1': '182:1736',
  'video-2': '182:1737',
  'header': '182:928',
};

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'X-Figma-Token': token } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode === 429) {
          reject(Object.assign(new Error('429'), { retry: true, body: buf.toString().slice(0, 200) }));
          return;
        }
        if (res.statusCode >= 400) {
          reject(new Error(res.statusCode + ' ' + buf.toString().slice(0, 300)));
          return;
        }
        resolve(JSON.parse(buf.toString()));
      });
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fileStream.close();
        fs.unlink(dest, () => {});
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(() => resolve(dest)));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const ids = Object.values(nodes).join(',');
  let images;
  for (let i = 0; i < 4; i++) {
    try {
      images = await get(
        `https://api.figma.com/v1/images/${file}?ids=${encodeURIComponent(ids)}&format=png&scale=2`
      );
      break;
    } catch (err) {
      if (!err.retry || i === 3) throw err;
      console.log('rate limited, wait', (i + 1) * 20);
      await sleep((i + 1) * 20000);
    }
  }
  for (const [name, id] of Object.entries(nodes)) {
    const url = images.images && images.images[id];
    if (!url) {
      console.log('missing', name, id);
      continue;
    }
    const dest = path.join(outDir, name + '.png');
    await download(url, dest);
    console.log('saved', name);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
