import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');
const W = 1200;
const H = 630;
const SS = 3;

const NAVY = [19, 33, 58];
const BEZEL = [11, 18, 32];
const SCREEN = [247, 247, 250];
const GREY = [229, 229, 234];
const GREY_TEXT = [196, 198, 206];
const SMS = [52, 199, 89];
const SMS_TEXT = [160, 232, 180];
const RED = [216, 57, 43];
const GREEN = [43, 209, 126];
const HIVIS = [255, 208, 42];
const LINE = [58, 75, 105];
const LABEL = [92, 110, 140];
const WHITE = [255, 255, 255];

const shapes = [];
const rrect = (x, y, w, h, r, col) => shapes.push({ kind: 'rrect', x, y, w, h, r, col });
const circle = (cx, cy, r, col) => shapes.push({ kind: 'circle', cx, cy, r, col });
const seg = (ax, ay, bx, by, t, col) => shapes.push({ kind: 'seg', ax, ay, bx, by, t, col });

rrect(72, 66, 64, 64, 16, HIVIS);
rrect(88, 84, 34, 24, 6, NAVY);
seg(96, 108, 92, 118, 4, NAVY);

const steps = [
  [RED, 250],
  [GREEN, 330],
  [GREEN, 410],
  [GREEN, 490]
];
seg(112, 250, 112, 490, 3, LINE);
steps.forEach(([col, y], i) => {
  circle(112, y, 22, col);
  rrect(156, y - 14, [250, 210, 280, 190][i], 12, 6, WHITE);
  rrect(156, y + 6, [170, 230, 150, 210][i], 9, 4.5, LABEL);
});
seg(103, 250 - 9, 121, 250 + 9, 4, WHITE);
seg(121, 250 - 9, 103, 250 + 9, 4, WHITE);
for (const [, y] of steps.slice(1)) {
  seg(102, y + 1, 109, y + 8, 4, NAVY);
  seg(109, y + 8, 123, y - 7, 4, NAVY);
}

const PX = 740;
const PY = 70;
const PW = 330;
const PH = 640;
rrect(PX, PY, PW, PH, 52, BEZEL);
rrect(PX + 12, PY + 12, PW - 24, PH - 24, 42, SCREEN);
rrect(PX + PW / 2 - 50, PY + 26, 100, 28, 14, [0, 0, 0]);
const bubbles = [
  ['them', 110, 196, 3],
  ['me', 214, 160, 2],
  ['them', 290, 206, 3],
  ['me', 394, 120, 1],
  ['them', 444, 212, 3]
];
for (const [who, y, w, lines] of bubbles) {
  const h = 22 + lines * 20;
  const x = who === 'me' ? PX + PW - 30 - w : PX + 30;
  rrect(x, PY + y, w, h, 20, who === 'me' ? SMS : GREY);
  for (let i = 0; i < lines; i++) {
    const lw = (i === lines - 1 && lines > 1 ? 0.55 : 0.82) * (w - 28);
    rrect(x + 14, PY + y + 16 + i * 20, lw, 9, 4.5, who === 'me' ? SMS_TEXT : GREY_TEXT);
  }
}

function sdf(s, x, y) {
  if (s.kind === 'circle') return Math.hypot(x - s.cx, y - s.cy) - s.r;
  if (s.kind === 'seg') {
    const px = x - s.ax;
    const py = y - s.ay;
    const bx = s.bx - s.ax;
    const by = s.by - s.ay;
    const h = Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by)));
    return Math.hypot(px - bx * h, py - by * h) - s.t / 2;
  }
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const qx = Math.abs(x - cx) - s.w / 2 + s.r;
  const qy = Math.abs(y - cy) - s.h / 2 + s.r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - s.r;
}

function background(x, y) {
  const c = [...NAVY];
  const g = Math.max(0, 1 - Math.hypot((x - 900) / 620, (y - 360) / 520));
  c[0] += 28 * g * g;
  c[1] += 50 * g * g;
  c[2] += 110 * g * g;
  return c;
}

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const acc = [0, 0, 0];
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS;
        const py = y + (sy + 0.5) / SS;
        let col = background(px, py);
        for (const s of shapes) if (sdf(s, px, py) <= 0) col = s.col;
        acc[0] += col[0];
        acc[1] += col[1];
        acc[2] += col[2];
      }
    }
    const o = y * (W * 3 + 1) + 1 + x * 3;
    raw[o] = Math.round(acc[0] / (SS * SS));
    raw[o + 1] = Math.round(acc[1] / (SS * SS));
    raw[o + 2] = Math.round(acc[2] / (SS * SS));
  }
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = buf => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, png);
console.log('og.png', png.length, 'bytes');
