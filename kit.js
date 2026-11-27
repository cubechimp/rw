/* Ryukyu World: real building pieces hung on the real footprints near you.
   The pieces come from AlleyBits' Japan Street Modular Pack, baked into kit/kit.json. Optional: without that file the game runs as before. */
'use strict';
const KIT = { ready: false, carYaw: Math.PI / 2, m: {}, R: 0, max: MOBILE ? 45 : 85, cap: MOBILE ? 700 : 3000, t: 0, px: 1e9, pz: 1e9, ox: 0, oz: 0, n: 0, built: 0 };
function kitMaterial(tex) {
  return new T.ShaderMaterial({
    uniforms: Object.assign({ map: { value: tex } }, U), side: T.DoubleSide,
    vertexShader: `varying vec3 vN,vW,vTint;varying vec2 vUv;
      void main(){vec4 p=instanceMatrix*vec4(position,1.);vec4 w=modelMatrix*p;vW=w.xyz;vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);vUv=uv;vTint=instanceColor;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform sampler2D map;varying vec3 vN,vW,vTint;varying vec2 vUv;${GL_COMMON}
      void main(){
        if(distance(vW.xz,uRing.xy)>uRing.z+45.)discard;
        vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
        vec3 col=texture2D(map,vUv).rgb*vTint;float dl=max(dot(n,uSunDir),0.),hemi=n.y*.5+.5;
        gl_FragColor=vec4(fogged(col*(mix(uAmbGnd,uAmbSky,hemi)+uSunCol*dl),vW),1.);
      }`,
  });
}
async function loadKit() {
  try {
    const r = await fetch('kit/kit.json'); if (!r.ok) return; const j = await r.json(), L = new T.TextureLoader();
    const tex = (src, nearest) => { const t = L.load(src); t.flipY = false; t.colorSpace = T.NoColorSpace; t.generateMipmaps = !nearest; t.magFilter = nearest ? T.NearestFilter : T.LinearFilter; t.minFilter = nearest ? T.NearestFilter : T.LinearMipmapLinearFilter; return t; };
    const mats = [kitMaterial(tex('kit/atlas.png', true)), kitMaterial(tex('kit/signage.png', false))];      // the palette atlas is flat swatches: no blending between them
    const caps = { Pole_Plain: 40, Pole_Transformer: 20, Vending_HD_Red_103: 14, Vending_HD_White_103: 14, Vending_HD_Blue_103: 14, Bicycle_Plain_Silver: 24, Cone: 16, KeiCar_Wagon_White: 16, KeiCar_Truck_White: 8, AcOutdoor: 220 };
    for (const k in j.mods) {
      const d = j.mods[k], g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(d.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(d.n, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(d.u, 2)); g.setIndex(d.i);
      const cap = caps[k] || (MOBILE ? 320 : 700), m = new T.InstancedMesh(g, mats[d.m], cap); m.count = 0; m.frustumCulled = false; m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); scene.add(m);
      KIT.m[k] = { mesh: m, cap, n: 0, bb: d.bb, tris: d.i.length / 3 };
    }
    KIT.ready = true;
  } catch (e) { /* no kit in this build */ }
}
function kitPut(k, x, y, z, rot) {      // one piece, turned so its front (+z) faces the way rot says
  const M = KIT.m[k]; if (!M || M.n >= M.cap) return; const a = M.mesh.instanceMatrix.array, o = M.n++ * 16, c = Math.cos(rot), s = Math.sin(rot);
  a[o] = c; a[o + 1] = 0; a[o + 2] = -s; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = 1; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = s; a[o + 9] = 0; a[o + 10] = c; a[o + 11] = 0; a[o + 12] = x - OX; a[o + 13] = y; a[o + 14] = z - OZ; a[o + 15] = 1; KIT.n++;
}
/* Work out, once per building, which pieces go where: [piece, x, y, z, rot] in world metres. The rules are the ones the wall shader in
   naha.js paints with, cell for cell, so each piece lands on its own painted twin. two: use the walls of the surveyed 3D model. */
function kitDeco(t, fi, two) {
  const f = t.foot[fi], walls = two ? f.walls2 : f.walls, S = two ? f.st2 : f.st, out = []; if (!walls || !S) return out;
  const x0 = t.tx * NAHA.size, z0 = t.tz * NAHA.size, back = two ? 0 : f.ins * .6, live = walls.filter((w) => w && w.cls && w.nb);
  const sz = S.wide ? '256' : '165', win = 'Window' + sz + (S.tall ? '20' : '11' + (S.shut ? '_Shutter' : '')), bal = 'BalconyShort' + sz + '20_' + (S.alu ? 'AluPanel' : 'White'), can = 'Canopy' + sz + '11', door = ['Door07423_Black', 'Door08423_WoodBrown', 'Door08423_WoodOrange'][S.door];
  // The pack's windows and doors are made to sit in a hole in the wall. These walls are solid, so they are mounted just proud of the surface instead.
  const proud = (k) => (k.startsWith('Garage') ? .37 : k.startsWith('Window') || k.startsWith('Door') || k.startsWith('ShopFront') ? .1 : .03);
  const inTri = (W, u, y) => { for (const q of W.tris) { const d1 = (u - q[2]) * (q[1] - q[3]) - (q[0] - q[2]) * (y - q[3]), d2 = (u - q[4]) * (q[3] - q[5]) - (q[2] - q[4]) * (y - q[5]), d3 = (u - q[0]) * (q[5] - q[1]) - (q[4] - q[0]) * (y - q[1]); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true; } return false; };
  const put = (W, u, y, k, extra) => {
    const M = KIT.m[k]; if (!M) return false;
    if (W.tris && !extra) { const hx = M.bb[3] * .85, lo = y + Math.max(M.bb[1], 0) + .12, hi = y + M.bb[4] - .12; if (!(inTri(W, u - hx, lo) && inTri(W, u + hx, lo) && inTri(W, u - hx, hi) && inTri(W, u + hx, hi))) return false; }      // a surveyed wall can be any shape: the piece must fit on it
    const d = proud(k) - back; out.push(k, x0 + W.ax + W.ux * u + W.nx * d, y, z0 + W.az + W.uz * u + W.nz * d, Math.atan2(W.nx, W.nz)); return true;
  };
  let top = 0; for (const W of live) top = Math.max(top, W.floors);
  for (let k = 0; k < top && out.length < 5 * 90; k++) for (const W of live) {      // lowest storeys first: a big building that runs out of pieces keeps its upper windows painted
    if (k >= W.floors) continue; const sh = W.hw / W.floors, kk = k + W.upper, us = (W.L - W.nb * W.w) / 2, y = W.base + k * sh, fit = (h) => h <= sh + .02;
    for (let b = 0; b < W.nb; b++) {
      const u = us + (b + .5) * W.w, r = kitRand(b, k, S.sid);
      if (kk === 0) {      // street level: one front door, then a shopfront, a garage or windows
        if (W.cls === 3 && b === 0) { if (fit(2.43) && put(W, u, y + .06, door)) put(W, u, y + .06, 'CanopyD08423', 1); }
        else if (W.cls === 3 && S.shop && S.wide && b === 1) { if (fit(2.64)) put(W, u, y, 'ShopFrontS39_SlideR_Silver'); }
        else if (W.cls === 3 && S.wide && r > .7) { if (fit(2.6)) put(W, u, y, 'Garage25_Closed'); }
        else if (W.cls >= 2) { if (r > .25 && fit(2.21)) put(W, u, y + 1, S.wide ? 'Window25611' : 'Window16511'); }
        else if (r > .55 && fit(2.11)) put(W, u, y + 1.1, r > .8 ? 'Window06909_Grille' : 'Window11907');
      } else if (W.cls >= 2) {
        if (r >= .12) { if (S.tall) { if (fit(2.19) && put(W, u, y + .12, win) && r > .3) put(W, u, y + .12, bal, 1); } else if (fit(2.21) && put(W, u, y + 1, win) && r > .6) put(W, u, y + 1, can, 1); }
      } else if (r > .45) { if (r > .75) { if (fit(2.56)) put(W, u, y + 1.15, 'Window03613_Black'); } else if (fit(1.96)) put(W, u, y + 1.15, 'Window11907'); }
    }
  }
  // by the wall at street level: an air-conditioner unit, sometimes a drinks machine or a parked bicycle
  const front = live.find((w) => w.cls === 3), side = live.find((w) => w.cls === 2 && !w.upper), seed = S.sid / 256, seed2 = hash(t.tx * 19 + fi, t.tz * 7, 92), gx = (W, u, d) => x0 + W.ax + W.ux * u + W.nx * d, gz = (W, u, d) => z0 + W.az + W.uz * u + W.nz * d;
  if (side && side.L > 2.4) { const u = Math.min(side.L - .6, .8 + seed * 1.5); out.push('AcOutdoor', gx(side, u, .2 - back), side.base, gz(side, u, .2 - back), Math.atan2(side.nx, side.nz)); }
  if (front && seed2 > .78 && front.L > 5) out.push(['Vending_HD_Red_103', 'Vending_HD_White_103', 'Vending_HD_Blue_103'][Math.floor(seed * 3)], gx(front, front.L - 1.3, .08), front.base, gz(front, front.L - 1.3, .08), Math.atan2(front.nx, front.nz));
  else if (front && seed2 < .16 && front.L > 4) out.push('Bicycle_Plain_Silver', gx(front, front.L - 1.4, .5), front.base, gz(front, front.L - 1.4, .5), Math.atan2(front.nx, front.nz) + Math.PI / 2);
  return out;
}
function kitPoles(t) {      // utility poles down one side of the wider streets
  const out = [], S = NAHA.size;
  for (const r of t.roads || []) {
    if (r.w < 5 || r.w > 14) continue; const pts = r.pts, n = pts.length / 2; let carry = 12 + hash(Math.round(pts[0]), Math.round(pts[1]), 94) * 20, k = 0;
    for (let i = 0; i + 1 < n; i++) {
      const ax = pts[i * 2], az = pts[i * 2 + 1], dx = pts[i * 2 + 2] - ax, dz = pts[i * 2 + 3] - az, L = Math.hypot(dx, dz); if (L < .1) continue; const ux = dx / L, uz = dz / L; let s = carry;
      for (; s < L; s += 36) { const x = ax + ux * s - uz * (r.w / 2 + .45), z = az + uz * s + ux * (r.w / 2 + .45); out.push(k++ % 3 === 2 ? 'Pole_Transformer' : 'Pole_Plain', t.tx * S + x, 0, t.tz * S + z, Math.atan2(ux, uz)); }
      carry = s - L;
    }
  }
  return out;
}
function updateKit(dt) {
  if (!KIT.ready || !NAHA.idx) return; KIT.t -= dt;
  if (KIT.t > 0 && Math.hypot(P.x - KIT.px, P.z - KIT.pz) < 5 && KIT.ox === OX && KIT.oz === OZ) return;
  KIT.t = .5; KIT.px = P.x; KIT.pz = P.z; KIT.ox = OX; KIT.oz = OZ; KIT.n = 0; for (const k in KIT.m) KIT.m[k].n = 0;
  const S = NAHA.size, c = [], off = INSIDE || P.fly || P.y > 60;
  if (!off) for (const t of NAHA.tiles.values()) {
    if (t.state !== 3 || !t.foot || !t.cg) continue; const x0 = t.tx * S, z0 = t.tz * S; if (P.x < x0 - KIT.max || P.x > x0 + S + KIT.max || P.z < z0 - KIT.max || P.z > z0 + S + KIT.max) continue;
    for (let i = 0; i < t.foot.length; i++) { const f = t.foot[i]; if (f.hut || !f.walls) continue; const d = Math.hypot(x0 + f.cx - P.x, z0 + f.cz - P.z); if (d < KIT.max) c.push([d, t, i]); }
  }
  c.sort((a, b) => a[0] - b[0]); let R = KIT.max, used = 0, built = 0;
  for (const [d, t, i] of c) {
    const f = t.foot[i], two = !!(f.has2 && t.show2 && f.walls2), key = two ? 'deco2' : 'deco'; if (!f[key]) f[key] = kitDeco(t, i, two); const D = f[key]; if (used + D.length / 5 > KIT.cap) { R = d; break; }
    for (let k = 0; k < D.length; k += 5) kitPut(D[k], D[k + 1], D[k + 2], D[k + 3], D[k + 4]); used += D.length / 5; built++;
  }
  KIT.R = R; KIT.built = built;
  if (!off) for (const t of NAHA.tiles.values()) {
    if (t.set !== 'pref' || t.state !== 3 || !t.roads) continue; if (!t.poles) t.poles = kitPoles(t); const D = t.poles;
    for (let k = 0; k < D.length; k += 5) { const d = Math.hypot(D[k + 1] - P.x, D[k + 3] - P.z); if (d > 130) continue; if (D[k + 2] === 0) { const y = groundAt(D[k + 1], D[k + 3]); D[k + 2] = y < .4 || nahaBlocked(D[k + 1], D[k + 3], y + 1) ? -999 : y + .001; } if (D[k + 2] > -900) kitPut(D[k], D[k + 1], D[k + 2], D[k + 3], D[k + 4]); }
  }
  for (const k in KIT.m) { const M = KIT.m[k]; if (k.startsWith('KeiCar')) continue; M.mesh.count = M.n; M.mesh.instanceMatrix.needsUpdate = true; }
}
loadKit();
