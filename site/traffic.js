/* Ryukyu World: kei cars on the real roads and people walking beside them. Scenery only: each player sees their own traffic. */
'use strict';
const CAR_N = MOBILE ? 8 : 16, PED_N = MOBILE ? 12 : 26;
const CAR_COL = [[1, 1, 1], [.84, .86, .9], [1, .92, .58], [.68, .93, .84], [1, .74, .85], [.6, .8, 1], [.22, .24, .3], [.95, .46, .4]];
function catGeo(a, b) {      // two merged geometries into one
  const g = new T.BufferGeometry();
  for (const k of ['position', 'normal', 'aCol', 'aGlow']) { const x = a.attributes[k], y = b.attributes[k], arr = new Float32Array(x.array.length + y.array.length); arr.set(x.array); arr.set(y.array, x.array.length); g.setAttribute(k, new T.BufferAttribute(arr, x.itemSize)); }
  a.dispose(); b.dispose(); return g;
}
function trafficCarGeo() {      // the kei wagon in white, so each car can be tinted, with dark glass instead of see-through panes
  const gl = 0x2c3e55, ps = [part(gBox(1.54, 1.16, .03), gl, { p: [0, 1.84, -.87], r: [-.2, 0, 0], glow: .06 }), part(gBox(1.54, .6, .03), gl, { p: [0, 1.99, 1.6], glow: .06 })];
  for (const x of [-.84, .84]) ps.push(part(gBox(.03, 1.02, .98), gl, { p: [x, 1.81, -.24], glow: .06 }), part(gBox(.03, 1.02, 1.14), gl, { p: [x, 1.81, .94], glow: .06 }));
  return catGeo(keiGeo(0xffffff), merge(ps));
}
function pedGeo() {      // one islander in a single piece; the whole body hops as it walks
  const w = 0xffffff, dark = 0x24304a;
  return merge([part(gSph(.34, 9, 7), w, { p: [0, .72, 0], s: [1, 1.12, 1] }), part(gSph(.4, 10, 8), w, { p: [0, 1.44, 0] }), part(gSph(.045, 5, 4), dark, { p: [-.14, 1.5, -.37] }), part(gSph(.045, 5, 4), dark, { p: [.14, 1.5, -.37] }),
    part(gSph(.13, 6, 5), w, { p: [-.5, .8, 0] }), part(gSph(.13, 6, 5), w, { p: [.5, .8, 0] }), part(gSph(.16, 6, 5), w, { p: [-.2, .12, -.04], s: [1, .7, 1.3] }), part(gSph(.16, 6, 5), w, { p: [.2, .12, -.04], s: [1, .7, 1.3] }),
    part(gCyl(.5, .56, .05, 10), 0xffe9a8, { p: [0, 1.8, 0] }), part(gCyl(.24, .28, .2, 8), 0xffe9a8, { p: [0, 1.9, 0] })]);      // straw hat
}
makeInst('car', trafficCarGeo(), CAR_N, scatterMat); makeInst('ped', pedGeo(), PED_N, scatterMat);
const TRAFFIC = { cars: [], peds: [], eul: new T.Euler(0, 0, 0, 'YXZ'), pool: [], poolT: 0 };
for (let i = 0; i < CAR_N; i++) TRAFFIC.cars.push({ car: true, r: null, wait: Math.random() * 2 });
for (let i = 0; i < PED_N; i++) TRAFFIC.peds.push({ car: false, r: null, wait: Math.random() * 2 });

function tileRoads(t) {      // the road centre lines of a tile with their lengths, worked out once
  if (t.rd) return t.rd; const out = [];
  for (const r of t.roads || []) {
    const n = r.pts.length / 2; if (r.w < 4 || n < 2) continue; const cum = new Float32Array(n); let L = 0;
    for (let i = 1; i < n; i++) { L += Math.hypot(r.pts[i * 2] - r.pts[i * 2 - 2], r.pts[i * 2 + 1] - r.pts[i * 2 - 1]); cum[i] = L; }
    if (L > 20) out.push({ w: r.w, pts: r.pts, cum, L, n, t });
  }
  return (t.rd = out);
}
function roadAt(r, s, o) {      // point and direction at distance s along a road, in tile coordinates
  s = clamp(s, 0, r.L); let i = 1; while (i < r.n - 1 && r.cum[i] < s) i++;
  const ax = r.pts[i * 2 - 2], az = r.pts[i * 2 - 1], bx = r.pts[i * 2], bz = r.pts[i * 2 + 1], seg = r.cum[i] - r.cum[i - 1] || 1, k = (s - r.cum[i - 1]) / seg;
  o.x = ax + (bx - ax) * k; o.z = az + (bz - az) * k; o.ux = (bx - ax) / seg; o.uz = (bz - az) / seg; return o;
}
function roadTiles() { const out = []; for (const t of NAHA.tiles.values()) if (t.set === 'pref' && t.state === 3 && t.roads && tileRoads(t).length) out.push(t); return out; }
const _ra = {}, _rb = {};
function roadNext(e) {      // at the end of a line: carry on along whichever road starts here, or turn round
  const S = NAHA.size, r = e.r, end = e.dir > 0 ? r.n - 1 : 0, wx = r.t.tx * S + r.pts[end * 2], wz = r.t.tz * S + r.pts[end * 2 + 1], opts = [];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const lx0 = r.pts[end * 2], lz0 = r.pts[end * 2 + 1]; if ((dx < 0 && lx0 > 8) || (dx > 0 && lx0 < S - 8) || (dz < 0 && lz0 > 8) || (dz > 0 && lz0 < S - 8)) continue;
    const t = NAHA.tiles.get('pref:' + (r.t.tx + dx) + '_' + (r.t.tz + dz)); if (!t || t.state !== 3 || !t.roads) continue;
    const lx = wx - t.tx * S, lz = wz - t.tz * S;
    for (const q of tileRoads(t)) { if (q === r) continue; const m = q.n - 1;
      if (Math.hypot(q.pts[0] - lx, q.pts[1] - lz) < 7) opts.push([q, 1]); else if (Math.hypot(q.pts[m * 2] - lx, q.pts[m * 2 + 1] - lz) < 7) opts.push([q, -1]); }
  }
  if (opts.length) { const o = opts[Math.floor(Math.random() * opts.length)]; e.r = o[0]; e.dir = o[1]; e.s = o[1] > 0 ? 0 : o[0].L; }
  else { e.dir = -e.dir; e.s = clamp(e.s, 0, r.L); }
}
function trafficSpawn(e, tiles) {
  e.r = null; if (!tiles.length) return; const S = NAHA.size, near = e.car ? 200 : 45, far = e.car ? 460 : 200;
  for (let k = 0; k < 24; k++) {      // aim at a random spot in the ring around you, then take a road from the tile it falls in
    const a = Math.random() * 6.283, dd = near + Math.random() * (far - near), t = NAHA.tiles.get('pref:' + Math.floor((P.x + Math.sin(a) * dd) / S) + '_' + Math.floor((P.z - Math.cos(a) * dd) / S)); if (!t || t.state !== 3 || !t.roads) continue;
    const rd = tileRoads(t); if (!rd.length) continue; const r = rd[Math.floor(Math.random() * rd.length)]; if (e.car ? r.w < 4.5 : r.w > 14) continue;
    const s = Math.random() * r.L, p = roadAt(r, s, _ra), wx = t.tx * S + p.x, wz = t.tz * S + p.z, d = Math.hypot(wx - P.x, wz - P.z);
    if (d < near || d > far || heightAt(wx, wz) < .4) continue;
    e.r = r; e.s = s; e.dir = Math.random() < .5 ? 1 : -1; e.v = 0; e.h = null; e.ph = Math.random() * 6; e.side = Math.random() < .5 ? 1 : -1; e.chk = Math.random() * .5; e.size = .82 + Math.random() * .3; e.truck = Math.random() < .25;
    e.top = e.car ? (r.w >= 9 ? 12.5 : r.w >= 6 ? 9.5 : 7) * (.85 + Math.random() * .3) : 1.2 + Math.random() * .8;
    e.col = e.car ? CAR_COL[Math.floor(Math.random() * CAR_COL.length)] : hex3(DATA.shirts[Math.floor(Math.random() * DATA.shirts.length)]); return;
  }
}
function updateTraffic(dt) {
  const C = INST.car, D = INST.ped; if (!started || INSIDE || !NAHA.idx) { C.mesh.count = D.mesh.count = 0; return; }
  const S = NAHA.size, T_ = TRAFFIC; T_.poolT -= dt; if (T_.poolT <= 0) { T_.poolT = 1; T_.pool = roadTiles(); }
  let nc = 0, np = 0; const kw = KIT.ready ? KIT.m.KeiCar_Wagon_White : null, kt = KIT.ready ? KIT.m.KeiCar_Truck_White : null; let nw = 0, nt = 0;
  for (const e of T_.cars.concat(T_.peds)) {
    const live = e.r && e.r.t.state === 3 && NAHA.tiles.get('pref:' + e.r.t.key) === e.r.t;
    if (!live) { e.r = null; e.wait -= dt; if (e.wait <= 0) { e.wait = .2 + Math.random() * .5; trafficSpawn(e, T_.pool); } if (!e.r) continue; }
    const r = e.r, p = roadAt(r, e.s, _ra), fx = p.ux * e.dir, fz = p.uz * e.dir;      // fx, fz: the way it is going
    let off, x, z;
    if (e.car) { off = Math.min(r.w * .24, 2); x = r.t.tx * S + p.x + fz * off; z = r.t.tz * S + p.z - fx * off; }      // keep left, as in Japan
    else { off = (r.w / 2 + 1.1) * e.side * e.dir; x = r.t.tx * S + p.x - fz * off; z = r.t.tz * S + p.z + fx * off; }
    e.x = x; e.z = z;
    const pdx = P.x - x, pdz = P.z - z, pd = Math.hypot(pdx, pdz);
    if (pd > (e.car ? 540 : 270)) { e.r = null; continue; }
    let want = e.top;
    if (e.car) {
      const ahead = pdx * fx + pdz * fz, side = Math.abs(pdx * fz - pdz * fx); if (ahead > -1 && ahead < 12 && side < 2.8 && !P.fly) want = 0;      // wait for you
      for (const o of T_.cars) if (o !== e && o.r === r && o.dir === e.dir) { const gap = (o.s - e.s) * e.dir; if (gap > 0 && gap < 10) want = Math.min(want, gap < 6 ? 0 : o.v); }
      e.v += clamp(want - e.v, -14 * dt, 4 * dt);
    } else {
      e.v = want; e.chk -= dt; if (e.chk <= 0) { e.chk = .5; if (nahaBlocked(x + fx * 1.5, z + fz * 1.5, groundAt(x, z) + 1) || heightAt(x + fx * 3, z + fz * 3) < .3) e.dir = -e.dir; }
    }
    e.s += e.dir * e.v * dt; if (e.s > r.L || e.s < 0) roadNext(e);
    const y = groundAt(x, z), hd = Math.atan2(fx, -fz); if (e.h === null) e.h = hd; else { const dh = Math.atan2(Math.sin(hd - e.h), Math.cos(hd - e.h)); e.h += dh * Math.min(1, dt * (e.car ? 5 : 8)); }
    if (e.car) {
      if (kw) {      // with the building kit loaded, traffic uses its kei wagon and kei truck
        const K = e.truck ? kt : kw, i = e.truck ? nt : nw; if (i >= K.cap) continue;
        _m.compose(_p.set(x - OX, y, z - OZ), _q.setFromEuler(T_.eul.set(0, -e.h + KIT.carYaw, 0)), _s.set(1.18, 1.18, 1.18)); _m.toArray(K.mesh.instanceMatrix.array, i * 16); K.mesh.instanceColor.array.set(e.truck ? CAR_COL[0] : e.col, i * 3); if (e.truck) nt++; else nw++; continue;
      }
      if (nc >= C.cap) continue; const sh = Math.sin(e.h), ch = Math.cos(e.h), pitch = Math.atan2(groundAt(x + sh * 1.2, z - ch * 1.2) - groundAt(x - sh * 1.2, z + ch * 1.2), 2.4);
      _m.compose(_p.set(x - OX, y, z - OZ), _q.setFromEuler(T_.eul.set(clamp(pitch, -.4, .4), -e.h, 0)), _s.set(1, 1, 1)); _m.toArray(C.mesh.instanceMatrix.array, nc * 16); C.mesh.instanceColor.array.set(e.col, nc * 3); nc++;
    } else {
      if (np >= D.cap) continue; e.ph += dt * (7 + e.v * .9); const hop = Math.abs(Math.sin(e.ph));
      _m.compose(_p.set(x - OX, y + hop * .2 * e.size, z - OZ), _q.setFromEuler(T_.eul.set(.06, -e.h, Math.sin(e.ph) * .09)), _s.set(e.size, e.size * (1 + (hop - .5) * .12), e.size)); _m.toArray(D.mesh.instanceMatrix.array, np * 16); D.mesh.instanceColor.array.set(e.col, np * 3); np++;
    }
  }
  if (kw) for (const [K, n] of [[kw, nw], [kt, nt]]) { K.mesh.count = n; K.mesh.instanceMatrix.needsUpdate = true; K.mesh.instanceColor.needsUpdate = true; }
  C.mesh.count = nc; D.mesh.count = np; for (const I of [C, D]) { I.mesh.instanceMatrix.needsUpdate = true; I.mesh.instanceColor.needsUpdate = true; }
}
