import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');
const W = 1200;
const H = 630;
const SS = 2;
const CX = 600;
const CY = 315;
const R = 262;
const SWEEP = -38;
const SPAN = 64;

const BG = [5, 8, 14];
const CYAN = [56, 225, 255];
const RED = [255, 77, 109];
const AMBER = [255, 184, 77];
const GREEN = [46, 230, 166];
const VIOLET = [139, 125, 255];

let seed = 20260928;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const blips = Array.from({ length: 44 }, () => {
  const ang = rand() * 360;
  const lv = rand();
  const [col, dist, rad] = lv < 0.24 ? [RED, 0.18 + rand() * 0.2, 7.5] : lv < 0.36 ? [AMBER, 0.42 + rand() * 0.18, 6] : [GREEN, 0.64 + rand() * 0.3, 5.5];
  const a = ((ang - 90) * Math.PI) / 180;
  return { x: CX + Math.cos(a) * R * dist, y: CY + Math.sin(a) * R * dist, col, rad, ang };
});

const mix = (c, col, a) => {
  c[0] += (col[0] - c[0]) * a;
  c[1] += (col[1] - c[1]) * a;
  c[2] += (col[2] - c[2]) * a;
};
const add = (c, col, a) => {
  c[0] += col[0] * a;
  c[1] += col[1] * a;
  c[2] += col[2] * a;
};
const band = (d, half) => Math.max(0, 1 - Math.max(0, Math.abs(d) - half));

function shade(x, y) {
  const c = [...BG];
  const g1 = Math.hypot(x - 80, y + 60) / 700;
  add(c, CYAN, 0.1 * Math.max(0, 1 - g1) ** 2);
  const g2 = Math.hypot(x - 1180, y - 700) / 760;
  add(c, VIOLET, 0.12 * Math.max(0, 1 - g2) ** 2);
  const mask = Math.max(0, 1 - Math.hypot((x - CX) / 700, (y - CY) / 420));
  const gx = Math.min(x % 44, 44 - (x % 44));
  const gy = Math.min(y % 44, 44 - (y % 44));
  add(c, [128, 190, 255], 0.05 * mask * Math.max(band(gx, 0.4), band(gy, 0.4)));

  const dx = x - CX;
  const dy = y - CY;
  const r = Math.hypot(dx, dy);
  const ang = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
  if (r < R) {
    add(c, CYAN, 0.05 * (1 - r / R));
    if (r < R * 0.34) add(c, RED, 0.16 * (1 - r / (R * 0.34)) ** 1.5);
    const lead = (SWEEP + 90 + 360) % 360;
    const behind = (lead - ang + 360) % 360;
    if (behind < SPAN) mix(c, CYAN, 0.36 * (1 - behind / SPAN) ** 2.2);
    if (behind < 1.2 || behind > 359.6) mix(c, CYAN, 0.9 * band(behind > 180 ? behind - 360 : behind, 0.3));
  }
  for (const f of [0.34, 0.6, 0.86]) mix(c, CYAN, 0.28 * band(r - R * f, 0.6));
  mix(c, CYAN, 0.9 * band(r - R, 1.2));
  add(c, CYAN, 0.18 * Math.max(0, 1 - Math.abs(r - R) / 26) ** 2);
  if (r > R * 0.34 && r < R) {
    const spoke = ang % 30;
    const off = (Math.min(spoke, 30 - spoke) * Math.PI * r) / 180;
    mix(c, CYAN, 0.1 * band(off, 0.4));
  }
  if (r > R + 6 && r < R + 22) {
    const t = ang % 5;
    const off = (Math.min(t, 5 - t) * Math.PI * r) / 180;
    const long = Math.round(ang / 5) % 6 === 0;
    if (r < R + (long ? 22 : 14)) mix(c, CYAN, 0.45 * band(off, 0.5));
  }
  for (const b of blips) {
    const d = Math.hypot(x - b.x, y - b.y);
    if (d < b.rad * 4) add(c, b.col, 0.35 * Math.max(0, 1 - d / (b.rad * 4)) ** 2);
    mix(c, b.col, Math.max(0, Math.min(1, b.rad - d + 0.5)));
  }
  const dc = Math.hypot(dx, dy);
  add(c, CYAN, 0.5 * Math.max(0, 1 - dc / 26) ** 2);
  mix(c, CYAN, Math.max(0, Math.min(1, 6.5 - dc)));
  return c;
}

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const acc = [0, 0, 0];
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = shade(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
        acc[0] += c[0];
        acc[1] += c[1];
        acc[2] += c[2];
      }
    }
    const o = y * (W * 3 + 1) + 1 + x * 3;
    for (let k = 0; k < 3; k++) raw[o + k] = Math.max(0, Math.min(255, Math.round(acc[k] / (SS * SS))));
  }
}

const table = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
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
  chunk('IEND', Buffer.alloc(0)),
]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, png);
console.log('og.png', png.length, 'bytes');
