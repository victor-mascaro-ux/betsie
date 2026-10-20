// Copies the Figma images the app uses into src/assets with readable names,
// sized for 2x screens. Source: figma/raw/images (written by extract.js).
//
//   node figma/pick-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAW = 'figma/raw/images';
const OUT = 'src/assets';
const files = fs.readdirSync(RAW);
const src = (prefix) => path.join(RAW, files.find((f) => f.startsWith(prefix)));

// name: [hash prefix, width px (2x of the largest use)]
const IMAGES = {
  // people
  'people/maxine': ['92f5d12a', 420],
  'people/sylvia': ['927435c8', 420],
  'people/christopher': ['f5291637', 200],
  'people/megan': ['93e40cec', 200],
  'people/sammanth': ['841a3360', 200],
  'people/andy': ['e64e8671', 200],
  'people/emily': ['ed00d3d8', 200],
  'people/pavel': ['e2923a1b', 200],
  'people/sarah': ['6e12ecea', 200],
  'people/jessica': ['f64224ae', 200],
  // brand + icons (Betsie red set)
  'brand/clover': ['4d87914c', 300],
  'brand/wordmark': ['c36a20a0', 700],
  'brand/notification': ['3634ad9b', 120],
  'icons/next': ['fc7adbc4', 140],
  'icons/plus': ['a10d8d81', 140],
  'icons/comment': ['69bd5f82', 140],
  'icons/share': ['bae9bc1e', 70],
  'icons/send': ['4aa44af3', 60],
  'icons/calendar': ['5e851ee1', 48],
  'icons/private': ['96623a0c', 48],
  'decide/consensus': ['9bda20f5', 200],
  'decide/moderator': ['312e5a5f', 200],
  'decide/robots': ['c06d17cf', 200],
  'decide/crowd': ['f4a0de15', 200],
  // celebration
  'fx/crown': ['8c63bfc2', 310],
  'fx/jester': ['37032c10', 272],
  'fx/puddle': ['9f3f42b2', 500],
  // stickers (memes)
  'stickers/told-you-so-sheldon': ['79e3c935', 300],
  'stickers/told-you-so-cat': ['b7f579d2', 300],
  'stickers/but-told-you-so': ['87f0b2b8', 300],
  'stickers/i-know-everything': ['1e0c7ef0', 300],
  'stickers/megaphone': ['04fb42ff', 300],
  'stickers/trophy': ['c501cdb9', 300],
  'stickers/pointing': ['d69abdd7', 300],
  'stickers/told-ya': ['216a9eb9', 300],
  // phone
  'os/wallpaper-maxine': ['d1aff5e6', 860],
  'os/wallpaper-sylvia': ['f5e53b43', 860],
  'os/keys': ['5022605e', 860],
  'os/instagram': ['91b693a7', 120],
};

fs.rmSync(OUT, { recursive: true, force: true });
const write = async (name, pipeline, ext = 'webp') => {
  const file = path.join(OUT, `${name}.${ext}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await (ext === 'png' ? pipeline.png() : pipeline.webp({ quality: 86, alphaQuality: 100 })).toFile(file);
};

for (const [name, [hash, width]] of Object.entries(IMAGES)) {
  await write(name, sharp(src(hash)).resize({ width, withoutEnlargement: true }));
}

// The iOS keyboard as Figma crops it: the bottom 45% of a screenshot, stretched to 430 x 369.
{
  const s = sharp(src('6861d429'));
  const { width, height } = await s.metadata();
  const top = Math.round(height * 0.5495734810829163);
  await write('os/keyboard', sharp(src('6861d429')).extract({ left: 0, top, width, height: height - top }).resize({ width: 860, height: 738, fit: 'fill' }));
}

// The GIPHY panel is one composite of six stickers in two masonry columns (measured gutters).
{
  const tiles = [[0, 0, 487, 541], [495, 0, 499, 418], [0, 552, 487, 438], [495, 421, 499, 551], [0, 999, 487, 417], [495, 982, 499, 509]];
  for (const [i, [left, top, width, height]] of tiles.entries()) {
    await write(`stickers/giphy-${i + 1}`, sharp(src('428f6200')).extract({ left, top, width, height }).resize({ width: 300 }));
  }
}

// Vector icons exported by Figma (figma/raw/svg), by meaning.
const SVGS = {
  'icons/bell': 'b0f59388969d1c79',
  'icons/settings': 'ec666a023eec81f0',
  'icons/back': '009a04ecb3dd56f7',
  'icons/book': '7f32474c7c64f523',
  'icons/contact': '25d3e5a497ab279b',
  'icons/clock': '7b3a69216ca950ba',
  'icons/friend': 'd51ca17289d5688c',
  'icons/search': '9862960294a73775',
  'os/status-icons': 'e7dba5ce58d778ed',
  'os/flashlight': '347a5bdbfd170bde',
  'os/camera': '0614723860536529',
  'os/focus': '2ca03f26c0d4a016',
  'os/close': 'bf33796adad0c5df',
  'os/copy': '7ffa625a365d1452',
  'os/glasses': 'c6847c5d443d93b8',
  'os/star': '42c54f287a6e167d',
  'os/next': '527fa82f63cdc4fd',
  'apps/messages': 'c88930448ccc2793',
  'apps/mail': 'c8e3e8366417bbf3',
  'apps/messenger': 'e870308462f2b218',
  'apps/whatsapp': 'a91036dddcc7cf68',
  'imessage/back': '1d5eb442d1982edd',
  'imessage/facetime': '202e9922ecd620a3',
  'imessage/chevron': 'ce7b1c8e718e75af',
  'imessage/tail-gray': 'd9b5197407b8b201',
  'imessage/tail-blue': '744e68a37c45da5e',
};
for (const [name, hash] of Object.entries(SVGS)) {
  const file = path.join(OUT, `${name}.svg`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.copyFileSync(path.join('figma/raw/svg', `${hash}.svg`), file);
}

// Confetti stays an animated GIF.
fs.mkdirSync(path.join(OUT, 'fx'), { recursive: true });
fs.copyFileSync(src('e33d7313'), path.join(OUT, 'fx/confetti.gif'));

let bytes = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => e.isDirectory() ? walk(path.join(d, e.name)) : (bytes += fs.statSync(path.join(d, e.name)).size));
walk(OUT);
console.log(`assets: ${(bytes / 1e6).toFixed(2)} MB`);
