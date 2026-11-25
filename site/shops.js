/* Ryukyu World: restaurants, bars and cafes. A shopfront on the real building for every one, and a room to walk into. */
'use strict';
const FOOD_KIND = { restaurant: 'eat', casual_eatery: 'eat', food_and_drink: 'eat', food_court: 'eat', food_service: 'eat', bar: 'bar', lounge: 'bar', nightlife_venue: 'bar', brewery: 'bar', winery: 'bar',
  cafe: 'cafe', coffee_shop: 'cafe', smoothie_juice_bar: 'cafe', fast_food_restaurant: 'fast', food_truck_stand: 'fast' };
function foodKind(cat) {
  cat = String(cat || ''); if (FOOD_KIND[cat]) return FOOD_KIND[cat];
  if (/store|shop$|market|delivery|bank|supplier|barber/.test(cat) && !/coffee|tea|dessert|ice_cream|bakery/.test(cat)) return null;
  if (/fast_food|burger|pizza|food_truck|sandwich/.test(cat)) return 'fast';
  if (/cafe|coffee|tea_room|bakery|dessert|ice_cream|juice/.test(cat)) return 'cafe';
  if (/(^|_)bar($|_)|pub|izakaya|brewery|lounge/.test(cat)) return 'bar';
  if (/restaurant|eatery|diner|ramen|soba|sushi|noodle|steak|grill|bistro/.test(cat)) return 'eat';
  return null;
}
const SHOP = {
  eat: { label: 'Restaurant 食堂', icon: '🍜', a: 0xe8452c, b: 0xfff3e0, sign: 0xc8281e, wall: 0xf3e2c4, noren: 0x1d3f8f, floor: 0xc89a66, floor2: 0xb98856, in: 0xf6ead2, trim: 0x8a5a3c, lamp: 0xff5a3c,
    menu: ['okinawasoba', 'sokisoba', 'goya', 'fuchanpuru', 'rafute', 'juushii', 'yushidofu', 'tacorice', 'tempura', 'jimami'] },
  bar: { label: 'Bar 酒場', icon: '🏮', a: 0x3b2a6b, b: 0xe7c7ff, sign: 0x7a2bd0, wall: 0x4a3558, noren: 0xb01e3c, floor: 0x5a4050, floor2: 0x4c3444, in: 0x4a3a6a, trim: 0x2a1f40, lamp: 0xff4fa3,
    menu: ['umibudo', 'mozuku', 'jimami', 'rafute', 'hirayachi', 'shikuwasa', 'sanpin', 'tempura'] },
  cafe: { label: 'Café カフェ', icon: '☕', a: 0x3fbfa8, b: 0xffffff, sign: 0x2a8f7d, wall: 0xfff6e6, noren: 0x2a8f7d, floor: 0xe6cfa8, floor2: 0xdcc296, in: 0xfdf6ea, trim: 0x9fdcc8, lamp: 0xffd76a,
    menu: ['coffee', 'zenzai', 'softcream', 'beniimo', 'sata', 'sanpin', 'mango', 'pineapple', 'shikuwasa'] },
  fast: { label: 'Quick bites 軽食', icon: '🍔', a: 0xffc21f, b: 0xe8452c, sign: 0xe8452c, wall: 0xfff1c9, noren: 0xe8452c, floor: 0xfff6e6, floor2: 0xe8452c, in: 0xfff1c9, trim: 0xe8452c, lamp: 0xffe14a,
    menu: ['tacorice', 'burger', 'porktamago', 'shrimp', 'softcream', 'sata'] },
};
const SHOP_KINDS = Object.keys(SHOP), WOOD = 0x6b4630;

/* ---------- outside: a shopfront kit that goes on the wall of the real building ---------- */
function shopGeo(kind) {      // faces -z, the wall is at z = 0, 5 m wide
  const C = SHOP[kind], ps = [];
  ps.push(part(gBox(5, 3.3, .14), C.wall, { p: [0, 1.65, -.05] }), part(gBox(5, 2.6, .18), WOOD, { p: [0, -.8, -.07] }));
  for (let i = 0; i < 7; i++) ps.push(part(gBox(5 / 7, .07, 1.5), i % 2 ? C.b : C.a, { p: [-2.5 + (i + .5) * 5 / 7, 2.76, -.74], r: [-.38, 0, 0] }));
  ps.push(part(gBox(5, .22, .05), C.a, { p: [0, 2.4, -1.44] }));
  ps.push(part(gBox(4.3, .82, .12), C.sign, { p: [0, 3.6, -.14], glow: .3 }), part(gBox(3.2, .12, .14), 0xffffff, { p: [0, 3.72, -.15], glow: .7 }), part(gBox(2.2, .1, .14), 0xffffff, { p: [0, 3.46, -.15], glow: .7 }));
  // sliding door with paper panels, and a noren over it
  ps.push(part(gBox(1.5, 2.2, .08), 0xfff6dc, { p: [-.6, 1.1, -.14], glow: .3 }), part(gBox(.09, 2.3, .16), WOOD, { p: [-1.4, 1.15, -.15] }), part(gBox(.09, 2.3, .16), WOOD, { p: [.2, 1.15, -.15] }),
    part(gBox(1.7, .1, .16), WOOD, { p: [-.6, 2.26, -.15] }), part(gBox(.05, 2.2, .1), WOOD, { p: [-.6, 1.1, -.16] }), part(gBox(1.5, .05, .1), WOOD, { p: [-.6, .8, -.16] }), part(gBox(1.5, .05, .1), WOOD, { p: [-.6, 1.5, -.16] }));
  for (let i = 0; i < 3; i++) ps.push(part(gBox(.48, .62, .04), C.noren, { p: [-1.1 + i * .5, 1.96, -.28] }), part(gBox(.16, .16, .05), 0xffffff, { p: [-1.1 + i * .5, 1.94, -.29] }));
  ps.push(part(gBox(1.4, .04, .8), C.a, { p: [-.6, .03, -.62] }));
  // window with a flower box
  ps.push(part(gBox(1.7, 1.1, .08), 0x9fdcf0, { p: [1.4, 1.6, -.13], glow: .25 }), part(gBox(1.86, .08, .14), WOOD, { p: [1.4, 2.18, -.14] }), part(gBox(1.86, .08, .14), WOOD, { p: [1.4, 1.02, -.14] }),
    part(gBox(.06, 1.1, .12), WOOD, { p: [1.4, 1.6, -.15] }), part(gBox(1.8, .22, .3), WOOD, { p: [1.4, .86, -.26] }));
  for (let i = 0; i < 4; i++) ps.push(part(gIco(.2, 0), 0x58b947, { p: [.72 + i * .45, 1.04, -.28] }), part(gBox(.1, .1, .1), i % 2 ? 0xff3b5c : 0xffe14a, { p: [.72 + i * .45, 1.22, -.34], r: [.6, .6, 0], glow: .3 }));
  // what hangs by the door says what kind of place it is
  if (kind === 'eat' || kind === 'bar') ps.push(part(gSph(.3, 7, 5), kind === 'bar' ? 0xff4fa3 : 0xe8281e, { p: [.5, 2.0, -.62], s: [1, 1.25, 1], glow: .9 }), part(gBox(.26, .08, .26), 0x24304a, { p: [.5, 2.4, -.62] }), part(gBox(.26, .08, .26), 0x24304a, { p: [.5, 1.6, -.62] }));
  else if (kind === 'cafe') ps.push(part(gCyl(.24, .18, .36, 8), 0xffffff, { p: [.5, 2.0, -.62], glow: .3 }), part(gBox(.08, .2, .2), 0xffffff, { p: [.76, 2.0, -.62] }), part(gCyl(.2, .2, .04, 8), 0x6b4630, { p: [.5, 2.17, -.62] }));
  else ps.push(part(gIco(.3, 0), 0xffe14a, { p: [.5, 2.0, -.62], glow: .9 }));
  // menu board on the pavement
  ps.push(part(gBox(.62, .92, .05), 0x2b3a4a, { p: [2.05, .5, -1.3], r: [.2, 0, 0] }), part(gBox(.62, .92, .05), 0x2b3a4a, { p: [2.05, .5, -1.0], r: [-.2, 0, 0] }));
  for (let i = 0; i < 3; i++) ps.push(part(gBox(.4, .05, .02), 0xffffff, { p: [2.05, .72 - i * .18, -1.37 + i * .035], glow: .5 }));
  return merge(ps);
}
function hutGeo() {      // a small stand-alone eatery under an Okinawan red-tile roof, for places with no building on record
  return merge([part(gBox(6, 5.4, 4.6), 0xf3e9d8, { p: [0, .7, 2.3] }), part(new T.ConeGeometry(1, 1.7, 4, 1, false, Math.PI / 4), 0xd0502c, { p: [0, 4.25, 2.3], s: [4.9, 1, 3.9] }),
    part(gBox(1.7, .16, .34), 0xfff6e6, { p: [0, 5.02, 2.3] }), part(gSph(.26, 6, 5), 0xc8663a, { p: [0, 5.3, 2.3] }), part(gBox(1.1, 1.0, .06), 0x9fdcf0, { p: [-3.02, 1.7, 2.3], r: [0, Math.PI / 2, 0], glow: .2 }), part(gBox(1.1, 1.0, .06), 0x9fdcf0, { p: [3.02, 1.7, 2.3], r: [0, Math.PI / 2, 0], glow: .2 })]);
}
for (const k of SHOP_KINDS) { makeInst('shop_' + k, shopGeo(k), MOBILE ? 70 : 150, scatterMat); INST['shop_' + k].q = []; }
makeInst('hut', hutGeo(), 80, scatterMat);
const Y_AXIS = new T.Vector3(0, 1, 0);

function shopTilesReady(q) { for (const set of NAHA.sets) { if (!set.idx[q.t.key]) continue; const tt = NAHA.tiles.get(set.dir + ':' + q.t.key); if (!tt || (tt.state !== 3 && tt.state !== -1)) return false; } return true; }
/* find the wall this place's front goes on: the building its map point sits in, else the nearest wall, else its own little hut */
function placeShop(q) {
  const t = q.t, S = NAHA.size, lx = q.x - t.tx * S, lz = q.z - t.tz * S, opts = []; q.placed = 1; q.kit = 0; q.dx = q.x; q.dz = q.z; q.nh = 0;
  if (heightAt(q.x, q.z) < .35) return;      // on a pier or the sand: just the sign
  const a0 = clamp(Math.floor((lx - 14) / 16), 0, 47), a1 = clamp(Math.floor((lx + 14) / 16), 0, 47), c0 = clamp(Math.floor((lz - 14) / 16), 0, 47), c1 = clamp(Math.floor((lz + 14) / 16), 0, 47);
  for (const set of NAHA.sets) {
    const tt = NAHA.tiles.get(set.dir + ':' + t.key); if (!tt || !tt.cg) continue; const seen = new Set();
    for (let c = c0; c <= c1; c++) for (let a = a0; a <= a1; a++) {
      const arr = tt.cg[c * 48 + a]; if (!arr) continue;
      for (const fi of arr) {
        if (seen.has(fi)) continue; seen.add(fi); const f = tt.foot[fi]; if (f.gen || f.hut) continue;
        const inside = lx >= f.a0 && lx <= f.a1 && lz >= f.c0 && lz <= f.c1 && nahaPip(f, lx, lz);
        for (let i = 0; i < f.n; i++) {
          const j = (i + 1) % f.n, ax = f.xs[i], az = f.zs[i], ex = f.xs[j] - ax, ez = f.zs[j] - az, L = Math.hypot(ex, ez); if (L < 2.6) continue;
          const half = Math.min(2.5, L / 2), u = clamp(((lx - ax) * ex + (lz - az) * ez) / L, half, L - half), px = ax + ex / L * u, pz = az + ez / L * u, d = Math.hypot(lx - px, lz - pz);
          if (d > (inside ? 70 : 12)) continue;
          opts.push({ f, px, pz, ux: ex / L, uz: ez / L, L, u, half, s: d + (inside ? 0 : 8) + (L < 4.2 ? 3 : 0) });
        }
      }
    }
  }
  opts.sort((a, b) => a.s - b.s);
  const doors = t.doors || (t.doors = []), free = (x, z, r) => !doors.some((d) => Math.hypot(d[0] - x, d[1] - z) < r);
  const out = (o) => { let nx = o.uz, nz = -o.ux; if (nahaPip(o.f, o.px + nx * .4, o.pz + nz * .4)) { nx = -nx; nz = -nz; } return [nx, nz]; };
  for (let k = 0; k < Math.min(opts.length, 8); k++) {
    const o = opts[k], n = out(o);
    for (const sl of [0, 5, -5, 10, -10]) {
      const u = o.u + sl; if (u < o.half - .01 || u > o.L - o.half + .01) continue;
      const px = o.px + o.ux * sl, pz = o.pz + o.uz * sl, wx = t.tx * S + px, wz = t.tz * S + pz, fx = wx + n[0] * 1.7, fz = wz + n[1] * 1.7, sy = Math.min(groundAt(fx, fz), groundAt(wx, wz));
      if (sy < .3 || !free(px, pz, 4.8) || nahaBlocked(fx, fz, sy + 1)) continue;
      doors.push([px, pz]); q.kit = 1; q.kx = wx + n[0] * .06; q.kz = wz + n[1] * .06; q.ky = sy; q.kr = Math.atan2(-n[0], -n[1]); q.ks = clamp(o.L / 5, .56, 1);
      q.dx = fx; q.dz = fz; q.nh = Math.atan2(n[0], -n[1]); q.lx = wx + n[0] * .5; q.lz = wz + n[1] * .5; q.y = sy + 5; return;
    }
  }
  if (opts.length) {      // no frontage left on this building (a mall, a food hall): it shares a doorway
    const o = opts[0], n = out(o), wx = t.tx * S + o.px, wz = t.tz * S + o.pz; q.dx = wx + n[0] * 1.7; q.dz = wz + n[1] * 1.7; q.nh = Math.atan2(n[0], -n[1]);
    q.lx = wx + n[0] * .5; q.lz = wz + n[1] * .5; q.y = groundAt(q.dx, q.dz) + 6 + hash(q.x, q.z, 72) * 5; return;
  }
  if (lx < 9 || lz < 9 || lx > S - 9 || lz > S - 9 || !free(lx, lz, 10)) return;
  const h = hash(Math.floor(q.x), Math.floor(q.z), 71) * 6.283, nx = Math.sin(h), nz = -Math.cos(h), ux = -nz, uz = nx, gy = groundAt(q.x, q.z);
  const xs = new Float32Array(4), zs = new Float32Array(4); let k = 0, a0h = 1e9, a1h = -1e9, c0h = 1e9, c1h = -1e9;
  for (const [su, sn] of [[-3, -2.3], [3, -2.3], [3, 2.3], [-3, 2.3]]) {
    const x = lx + ux * su + nx * sn, z = lz + uz * su + nz * sn, wx = t.tx * S + x, wz = t.tz * S + z; if (heightAt(wx, wz) < .35 || nahaBlocked(wx, wz, gy + 1)) return;
    xs[k] = x; zs[k++] = z; a0h = Math.min(a0h, x); a1h = Math.max(a1h, x); c0h = Math.min(c0h, z); c1h = Math.max(c1h, z);
  }
  if (nahaBlocked(q.x, q.z, gy + 1)) return;
  const fi = t.foot.length; t.foot.push({ xs, zs, n: 4, a0: a0h, a1: a1h, c0: c0h, c1: c1h, top: gy + 4.2, hut: 1 });
  for (let c = clamp(Math.floor(c0h / 16), 0, 47); c <= clamp(Math.floor(c1h / 16), 0, 47); c++) for (let a = clamp(Math.floor(a0h / 16), 0, 47); a <= clamp(Math.floor(a1h / 16), 0, 47); a++) (t.cg[c * 48 + a] || (t.cg[c * 48 + a] = [])).push(fi);
  doors.push([lx, lz]); q.kit = 1; q.hut = 1; q.kx = q.x + nx * 2.3; q.kz = q.z + nz * 2.3; q.ky = gy; q.kr = Math.atan2(-nx, -nz); q.ks = 1;
  q.dx = q.x + nx * 4; q.dz = q.z + nz * 4; q.nh = Math.atan2(nx, -nz); q.lx = q.kx; q.lz = q.kz; q.y = gy + 6.2;
}
function updateShops(food) {
  food.sort((a, b) => a.dd - b.dd); const KN = MOBILE ? 110 : 240, n = { eat: 0, bar: 0, cafe: 0, fast: 0 }; let placed = 0, huts = 0; if (food.length > KN) food.length = KN; NAHA.food = food;
  const H = INST.hut;
  for (const q of food) {
    if (!q.placed) { if (placed >= 30 || !shopTilesReady(q)) continue; placeShop(q); placed++; if (q.sp && q.lx !== undefined) dropPoi(q); }
    if (!q.kit) continue; const I = INST['shop_' + q.kind]; if (n[q.kind] >= I.cap) continue;
    _m.compose(_p.set(q.kx - OX, q.ky, q.kz - OZ), _q.setFromAxisAngle(Y_AXIS, q.kr), _s.set(q.ks, 1, 1)); _m.toArray(I.mesh.instanceMatrix.array, n[q.kind] * 16); I.q[n[q.kind]++] = q;
    if (q.hut && huts < H.cap) { _m.compose(_p, _q, _s.set(1, 1, 1)); _m.toArray(H.mesh.instanceMatrix.array, huts++ * 16); }
  }
  for (const k of SHOP_KINDS) { const M = INST['shop_' + k].mesh; M.count = n[k]; M.instanceMatrix.needsUpdate = true; M.boundingSphere = null; M.userData.q = INST['shop_' + k].q; }
  H.mesh.count = huts; H.mesh.instanceMatrix.needsUpdate = true;
}
function shopsAtDoor() {      // restaurants whose door you are standing at
  const r = []; if (!NAHA.food) return r;
  for (const q of NAHA.food) { if (!q.placed) continue; const d = Math.hypot(q.dx - P.x, q.dz - P.z); if (d < 5.5) { q.dr = d; r.push(q); } }
  return r.sort((a, b) => a.dr - b.dr);
}

/* ---------- what is on record about a place ---------- */
function fmtTel(p) {
  let d = String(p || '').replace(/[^\d+]/g, ''); if (!d) return ''; if (d.startsWith('+81')) d = '0' + d.slice(3); else if (d.startsWith('+')) return d;
  if (/^0120\d{6}$/.test(d)) return d.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3');
  if (/^0[5789]0\d{8}$/.test(d)) return d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  if (/^0980\d{6}$/.test(d)) return d.replace(/(\d{4})(\d{2})(\d{4})/, '$1-$2-$3');
  if (/^098\d{7}$/.test(d)) return d.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  return d;
}
function bizRows(q) {
  const tel = fmtTel(q.tel);
  return el('div', { class: 'list' },
    el('div', { class: 'item' }, el('span', { class: 'ic' }, '📍'), el('span', null, el('b', null, 'Address 住所'), el('div', null, q.addr || 'No address on record for this place.'))),
    el('div', { class: 'item' }, el('span', { class: 'ic' }, '☎️'), el('span', null, el('b', null, 'Phone 電話'), el('div', null, tel ? el('a', { href: 'tel:' + String(q.tel).replace(/[^\d+]/g, '') }, tel) : 'No phone number on record for this place.'))));
}
const BIZ_SRC = 'Name, address and phone number are from Overture Maps open data, and can be out of date.';
function openBiz(q) {      // tap a sign: the card for any shop, office, hotel or restaurant
  const K = q.kind && SHOP[q.kind];
  openModal(el('div', null, el('h2', { id: 'mTitle' }, q.full, el('small', null, K ? K.label : q.cat || 'Place')), bizRows(q),
    K ? el('p', null, 'Walk up to its door and you can go inside.') : null, el('p', { class: 'src' }, BIZ_SRC)));
}
function shopMenu(q) { const m = SHOP[q.kind].menu.slice(), out = []; let s = q.id; while (out.length < 4 && m.length) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; out.push(m.splice((s >>> 8) % m.length, 1)[0]); } return out; }
function openShop(q) {      // at the counter
  const K = SHOP[q.kind], acts = el('div', { class: 'acts' }), info = el('p', { 'aria-live': 'polite' }), price = 2;
  for (const id of shopMenu(q)) {
    const f = DATA.foods[id]; if (!f) continue;
    const btn = el('button', { class: 'act', on: { click: () => {
      if (S.glass < price) { info.textContent = 'You need ' + price + ' Ryukyu glass. They float on the lagoon just offshore: ride through them.'; return; }
      S.glass -= price; S.foods[id] = 1; P.buffT = 150; S.words.kwatchi = 1; S.words.nuchigusui = 1; save(); chefSay('Kwatchī sabira!');
      info.textContent = ''; info.append(el('b', null, 'Kwatchī sabira! '), f[3] + ' You ride 15% faster for a while.'); ding(990, 1485); btn.disabled = true;
      for (const sm of acts.querySelectorAll('small')) sm.textContent = price + ' Ryukyu glass · you have ' + S.glass;
    } } }, el('span', { class: 'ic' }, f[0]), el('span', null, el('b', null, f[1] + ' ' + f[2]), el('small', null, price + ' Ryukyu glass · you have ' + S.glass)));
    acts.append(btn);
  }
  openModal(el('div', null, el('div', { class: 'head' }, el('div', { class: 'seal' }, el('span', null, K.icon), el('small', null, 'MENU')), el('div', null, el('h2', { id: 'mTitle' }, q.full, el('small', null, K.label)))),
    bizRows(q), acts, info, el('p', { class: 'src' }, 'The menu is the game\'s own: island dishes, not this kitchen\'s real list. ' + BIZ_SRC)));
}

/* ---------- inside: one room, dressed for the kind of place ---------- */
let INSIDE = null;
const inScene = new T.Scene(); inScene.background = new T.Color(0x191320);
const IN = { mesh: null, pane: null, board: null, chef: null, bubble: null, bubbleT: 0, busy: false };
function roomGeo(kind, seed) {
  const C = SHOP[kind], ps = [], blocks = [], dark = 0x24304a, r = (k) => hash(seed % 9973, k, 77);
  const B = (w, h, d, c, p, o) => ps.push(part(gBox(w, h, d), c, Object.assign({ p }, o || {})));
  B(8.4, .3, 6.8, C.floor, [0, -.15, 0], { glow: .12 });
  if (kind === 'fast') { for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) B(1, .02, 1, C.floor2, [-3.5 + i, .01, -2.5 + j], { glow: .12 }); }
  else for (let i = 0; i < 5; i++) B(.8, .02, 6.4, C.floor2, [-3.2 + i * 1.6, .01, 0], { glow: .12 });
  B(8.8, 3.6, .2, C.in, [0, 1.8, -3.3], { glow: .2 }); B(.2, 3.6, 6.8, C.in, [-4.3, 1.8, 0], { glow: .2 }); B(.2, 3.6, 6.8, C.in, [4.3, 1.8, 0], { glow: .2 });
  B(8.4, 1, .06, C.trim, [0, .5, -3.18], { glow: .12 }); B(.06, 1, 6.6, C.trim, [-4.18, .5, 0], { glow: .12 }); B(.06, 1, 6.6, C.trim, [4.18, .5, 0], { glow: .12 }); B(8.8, .34, .2, WOOD, [0, -.17, 3.4]);
  // counter along the back, with stools
  B(4.4, 1.0, .8, kind === 'cafe' ? 0xf1e4cf : kind === 'fast' ? 0xffffff : WOOD, [-1.6, .5, -1.9], { glow: .1 }); B(4.6, .08, 1.0, kind === 'bar' ? 0x1b1530 : 0xd9b98c, [-1.6, 1.04, -1.9], { glow: .12 }); B(4.4, .1, .82, C.a, [-1.6, .08, -1.9], { glow: .2 });
  blocks.push([-4.2, -2.6, .95, -1.2]);
  for (let i = 0; i < 4; i++) { const x = -3.2 + i * 1.05; ps.push(part(gCyl(.27, .27, .1, 10), C.a, { p: [x, .64, -1.0], glow: .15 }), part(gCyl(.05, .08, .6, 6), dark, { p: [x, .3, -1.0] })); }
  blocks.push([-3.6, -1.3, .3, -.75]);
  // shelves of jars and bottles behind it
  for (const y of [1.95, 2.55]) { B(4.2, .07, .34, WOOD, [-1.6, y, -3.05]); for (let i = 0; i < 9; i++) { const c = [0x7fe9ff, 0xffe14a, 0xff7a59, 0x8fe01f, 0xffffff, 0xb07cff][Math.floor(r(i * 7 + y * 10) * 6)], h = .26 + r(i + y * 31) * .2; ps.push(part(gCyl(.09, .11, h, 7), c, { p: [-3.45 + i * .46, y + .04 + h / 2, -3.05], glow: kind === 'bar' ? .7 : .25 })); } }
  // things on the counter
  if (kind === 'cafe') { B(.7, .6, .5, 0xc8ced6, [-3.3, 1.38, -1.95], { glow: .15 }); B(.5, .3, .4, 0xffffff, [.1, 1.24, -1.95], { glow: .2 }); }
  else if (kind === 'fast') { B(.5, .34, .4, dark, [-.1, 1.25, -1.9]); B(.9, .5, .06, 0xffffff, [-2.2, 1.5, -2.15], { glow: .8 }); }
  for (let i = 0; i < 3; i++) ps.push(part(gCyl(.2, .12, .12, 9), kind === 'bar' ? 0x7fe9ff : 0xffffff, { p: [-2.9 + i * 1.1, 1.14, -1.7], glow: .25 }));
  // menu on the wall: paper slips, a chalk board or lit panels
  if (kind === 'eat' || kind === 'bar') for (let i = 0; i < 7; i++) { B(.24, .66, .03, kind === 'bar' ? 0xffe9a8 : 0xffffff, [-3.3 + i * .56, 3.12, -3.18], { glow: .45 }); B(.06, .44, .035, dark, [-3.3 + i * .56, 3.12, -3.175]); }
  else if (kind === 'cafe') { B(3.6, .6, .05, 0x2b3a4a, [-1.6, 3.14, -3.17]); for (let i = 0; i < 4; i++) B(.6, .05, .06, 0xffffff, [-2.8 + i * .8, 3.2 - (i % 2) * .16, -3.165], { glow: .6 }); }
  else for (let i = 0; i < 3; i++) B(1.25, .62, .06, [0xffe14a, 0xffffff, 0xff7a59][i], [-3.0 + i * 1.4, 3.12, -3.17], { glow: .8 });
  // window frame on the back wall (the pane itself shows the sky outside)
  B(2.2, .1, .1, WOOD, [2.3, 2.72, -3.17]); B(2.2, .1, .1, WOOD, [2.3, 1.38, -3.17]); B(.1, 1.44, .1, WOOD, [1.2, 2.05, -3.17]); B(.1, 1.44, .1, WOOD, [3.4, 2.05, -3.17]); B(.06, 1.3, .08, WOOD, [2.3, 2.05, -3.16]);
  // tables
  const table = (x, z) => {
    if (kind === 'bar') { ps.push(part(gCyl(.5, .5, .07, 12), 0x1b1530, { p: [x, 1.02, z], glow: .1 }), part(gCyl(.06, .2, 1.0, 6), dark, { p: [x, .5, z] }), part(gCyl(.12, .1, .2, 8), 0xff4fa3, { p: [x, 1.16, z], glow: .9 })); blocks.push([x - .7, z - .7, x + .7, z + .7]); return; }
    if (kind === 'cafe') { ps.push(part(gCyl(.62, .62, .07, 14), 0xffffff, { p: [x, .74, z], glow: .2 }), part(gCyl(.06, .22, .74, 6), C.a, { p: [x, .37, z] })); for (const s of [-1, 1]) { B(.46, .08, .46, C.a, [x + s * .98, .46, z], { glow: .15 }); B(.08, .5, .46, C.a, [x + s * 1.2, .72, z], { glow: .15 }); B(.06, .46, .06, dark, [x + s * .98, .23, z]); } blocks.push([x - 1.5, z - .8, x + 1.5, z + .8]); return; }
    B(1.5, .08, 1.0, kind === 'fast' ? 0xffffff : 0xd9b98c, [x, .72, z], { glow: .15 }); B(.12, .72, .12, kind === 'fast' ? C.b : WOOD, [x, .36, z]);
    for (const s of [-1, 1]) { if (kind === 'fast') { B(.42, .5, 1.0, C.b, [x + s * 1.12, .25, z], { glow: .15 }); B(.1, .5, 1.0, C.b, [x + s * 1.3, .74, z], { glow: .15 }); } else for (const q of [-.28, .28]) B(.42, .16, .42, q * s > 0 ? 0xe8452c : 0x1d3f8f, [x + s * 1.1, .36, z + q], { glow: .15 }), B(.3, .3, .3, WOOD, [x + s * 1.1, .15, z + q]); }
    for (let i = 0; i < 2; i++) ps.push(part(gCyl(.16, .1, .1, 8), 0xffffff, { p: [x - .35 + i * .7, .81, z + (i ? .15 : -.15)], glow: .25 }));
    blocks.push([x - 1.65, z - .85, x + 1.65, z + .85]);
  };
  table(2.45, -1.25); table(2.45, 1.15); if (kind !== 'cafe') table(-2.5, 1.35);
  // hanging lamps
  for (let i = 0; i < 4; i++) { const x = -3 + i * 2, z = i % 2 ? -.2 : -1.1; B(.03, .7, .03, dark, [x, 3.25, z]); ps.push(part(gSph(.28, 8, 6), i % 2 && kind === 'bar' ? 0x7fe9ff : C.lamp, { p: [x, 2.75, z], s: [1, kind === 'cafe' ? .7 : 1.2, 1], glow: 1.1 })); }
  // a plant, a shisa pair by the way out, and the exit mat
  ps.push(part(gCyl(.3, .22, .5, 8), 0xc8663a, { p: [-3.5, .25, 2.6] }), part(gSph(.5, 7, 6), 0x3fae3c, { p: [-3.5, .95, 2.6], s: [1, 1.3, 1], glow: .1 }), part(gSph(.34, 6, 5), 0x58c947, { p: [-3.3, 1.5, 2.7], glow: .1 }));
  for (const s of [-1, 1]) ps.push(part(shisaGeo(), 0xc8663a, { p: [s * 1.55, 0, 2.95], s: [.55, .55, .55], r: [0, s > 0 ? -.5 : .5, 0], glow: .1 }));
  B(1.9, .03, 1.0, C.a, [0, .02, 2.8], { glow: .5 }); B(1.5, .035, .12, 0xffffff, [0, .03, 3.1], { glow: .9 });
  return { geo: merge(ps), blocks };
}
function chefSay(text) { if (IN.bubble) { IN.bubble.removeFromParent(); IN.bubble.material.map.dispose(); IN.bubble.material.dispose(); } IN.bubble = textSprite([text], { w: 384, h: 110, stroke: '#ff4fa3' }); IN.bubble.position.set(-1.6, 3.2, -2.7); IN.bubble.scale.set(2.9, .83, 1); IN.bubbleT = 4; inScene.add(IN.bubble); }
function buildRoom(q) {
  const R = roomGeo(q.kind, q.id); if (IN.mesh) { inScene.remove(IN.mesh); IN.mesh.geometry.dispose(); } IN.mesh = new T.Mesh(R.geo, objMat); IN.mesh.frustumCulled = false; inScene.add(IN.mesh);
  if (!IN.pane) { IN.pane = new T.Mesh(new T.PlaneGeometry(2.1, 1.26), new T.MeshBasicMaterial({ color: 0x8fd8ff })); IN.pane.position.set(2.3, 2.05, -3.19); inScene.add(IN.pane); }
  if (IN.board) { inScene.remove(IN.board); IN.board.material.map.dispose(); IN.board.material.dispose(); IN.board.geometry.dispose(); }
  const cv = document.createElement('canvas'); cv.width = 768; cv.height = 150; const c = cv.getContext('2d'); c.fillStyle = '#3a2618'; c.fillRect(0, 0, 768, 150); c.fillStyle = '#f7e7c4'; c.fillRect(8, 8, 752, 134);
  c.fillStyle = '#2a1a10'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 64px "M PLUS Rounded 1c","Hiragino Maru Gothic ProN",sans-serif'; c.fillText(q.full, 384, 80, 720);
  const tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter; IN.board = new T.Mesh(new T.PlaneGeometry(2.6, .51), new T.MeshBasicMaterial({ map: tex })); IN.board.position.set(2.3, 3.14, -3.18); inScene.add(IN.board);
  if (!IN.chef) {
    IN.chef = makeIslander(3); const hat = new T.Mesh(merge([part(gCyl(.3, .26, .36, 10), 0xffffff, { p: [0, .5, 0], glow: .3 }), part(gSph(.33, 8, 6), 0xffffff, { p: [0, .72, 0], s: [1, .6, 1], glow: .3 })]), objMat); hat.frustumCulled = false; IN.chef.userData.parts.head.add(hat);
    IN.chef.position.set(-1.6, 0, -2.72); IN.chef.rotation.y = Math.PI; IN.chef.scale.setScalar(1);
  }
  inScene.add(IN.chef); return R;
}
function enterShop(q) {
  if (INSIDE || IN.busy || P.fly || P.diving || !q || !SHOP[q.kind]) return; closeModal(); IN.busy = true;
  const f = $('#fade'); f.textContent = q.full; f.classList.add('on');
  setTimeout(() => {
    const R = buildRoom(q); INSIDE = { q, id: q.id, x: 0, z: 2.3, blocks: R.blocks }; inScene.add(me); me.scale.setScalar(1); P.speed = 0; P.h = 0; P.air = false; P.jy = 0; P.x = q.dx; P.z = q.dz; me.rotation.set(0, 0, 0);
    chefSay('Mensōre! いらっしゃい'); learn('mensore'); toast(q.full, q.addr || SHOP[q.kind].label); IN.busy = false;
    setTimeout(() => f.classList.remove('on'), 150);
  }, 380);
}
function leaveShop() {
  if (!INSIDE || IN.busy) return; const q = INSIDE.q, f = $('#fade'); IN.busy = true; closeModal(); f.textContent = 'Nifē dēbiru!'; f.classList.add('on');
  setTimeout(() => {
    INSIDE = null; scene.add(me); me.scale.setScalar(PS); if (IN.bubble) { IN.bubble.removeFromParent(); IN.bubbleT = 0; } P.x = q.dx; P.z = q.dz; P.h = q.nh; P.speed = 0; P.air = false; P.jy = 0; P.gh = groundAt(P.x, P.z); P.y = P.gh; cam.yaw = P.h + 2.5; cam.pitch = .22; cam.lastDrag = tNow; IN.busy = false;
    setTimeout(() => f.classList.remove('on'), 150);
  }, 300);
}
function insideAction() {
  const I = INSIDE; if (I.z < -.2 && I.x < 1.4) return { label: 'Order at the counter', fn: () => openShop(I.q) };
  return { label: 'Leave ' + (I.q.full.length > 16 ? 'this place' : I.q.full), fn: leaveShop };
}
function insideStep(dt, ix, iy) {
  const I = INSIDE, mag = Math.min(1, Math.hypot(ix, iy));
  if (mag > .05) { let dh = Math.atan2(ix, iy) - P.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); P.h += clamp(dh, -12 * dt, 12 * dt); }
  P.speed += clamp(mag * 4.8 - P.speed, -40 * dt, 30 * dt);
  let nx = I.x + Math.sin(P.h) * P.speed * dt, nz = I.z - Math.cos(P.h) * P.speed * dt;
  const hit = (x, z) => x < -3.75 || x > 3.75 || z < -2.9 || (z > 3.05 && Math.abs(x) > 1.2) || z > 3.9 || I.blocks.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3]);
  if (hit(nx, nz)) { if (!hit(nx, I.z)) nz = I.z; else if (!hit(I.x, nz)) nx = I.x; else { nx = I.x; nz = I.z; } }
  I.x = nx; I.z = nz;
  if (P.air) { P.vy -= 20 * dt; P.jy += P.vy * dt; if (P.jy <= 0) { P.jy = 0; P.air = false; } }
  me.position.set(I.x, P.jy, I.z); me.rotation.set(0, -P.h, 0); poseIslander(me, 'land', P.craft, false, tNow, P.speed, { dt, air: P.air });
  poseIslander(IN.chef, 'land', 'jetski', false, tNow + 1.3, IN.bubbleT > 3.2 ? 4 : 0, { dt });
  if (IN.bubble && (IN.bubbleT -= dt) <= 0) { IN.bubble.removeFromParent(); IN.bubble.material.map.dispose(); IN.bubble.material.dispose(); IN.bubble = null; }
  const sk = skyU.uMid.value; IN.pane.material.color.setRGB(Math.min(1, sk.x), Math.min(1, sk.y), Math.min(1, sk.z));
  if (I.z > 3.3) leaveShop();
}
function insideCam() {      // looking in through the open front, like a doll's house
  const fov = 46; if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const tanH = Math.tan(fov * Math.PI / 360) * camera.aspect, vis = clamp(9.6 * camera.aspect / 1.15, 6.6, 9.6), dist = Math.max(11.2, vis / 2 / tanH), off = Math.max(0, (9 - vis) / 2), cx = clamp(INSIDE.x * .85, -off, off);
  camera.position.set(cx, 1.5 + dist * .53, .1 + dist * .848); camera.lookAt(cx, 1.5, .1);
}
