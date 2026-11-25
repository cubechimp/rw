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
/* Work out, once per building, which pieces go where: [piece, x, y, z, rot] in world metres. */
function kitDeco(t, fi) {
  const f = t.foot[fi], S = NAHA.size, x0 = t.tx * S, z0 = t.tz * S, out = [], n = f.n, seed = hash(t.tx * 71 + fi, t.tz * 13 + n, 91), seed2 = hash(t.tx * 19 + fi, t.tz * 7, 92);
  let ar = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; ar += f.xs[i] * f.zs[j] - f.xs[j] * f.zs[i]; } const sg = ar > 0 ? 1 : -1;
  const other = (lx, lz) => { const a = t.cg[clamp(Math.floor(lz / 16), 0, 47) * 48 + clamp(Math.floor(lx / 16), 0, 47)]; if (a) for (const k of a) if (k !== fi) { const o = t.foot[k]; if (lx >= o.a0 && lx <= o.a1 && lz >= o.c0 && lz <= o.c1 && nahaPip(o, lx, lz)) return true; } return false; };
  const edges = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ax = f.xs[i], az = f.zs[i], ex = f.xs[j] - ax, ez = f.zs[j] - az, L = Math.hypot(ex, ez); if (L < 1.5) continue;
    const ux = ex / L, uz = ez / L, nx = uz * sg, nz = -ux * sg; if (other(ax + ex / 2 + nx * .8, az + ez / 2 + nz * .8)) continue;      // a wall shared with the neighbour: nothing to see
    edges.push({ ax, az, ux, uz, nx, nz, L, rot: Math.atan2(nx, nz) });
  }
  if (!edges.length) return out; const by = edges.slice().sort((a, b) => b.L - a.L), main = new Set(by.slice(0, 2)), front = by[0];
  const floors = clamp(Math.round(f.h / 3), 1, 9), sh = f.h / floors, wide = seed > .5 && front.L >= 4.2, tall = seed2 > .55, bw = wide ? 3.3 : 2.5, back = f.ins * .6;
  const win = wide ? (tall ? 'Window25620' : seed2 > .25 ? 'Window25611_Shutter' : 'Window25611') : (tall ? 'Window16520' : seed2 > .25 ? 'Window16511_Shutter' : 'Window16511');
  const bal = wide ? (seed2 > .8 ? 'BalconyShort25620_AluPanel' : 'BalconyShort25620_White') : (seed2 > .8 ? 'BalconyShort16520_AluPanel' : 'BalconyShort16520_White'), can = wide ? 'Canopy25611' : 'Canopy16511';
  // The pack's windows and doors are made to sit in a hole in the wall. These walls are solid, so they are mounted just proud of the surface instead.
  const proud = (k) => (k.startsWith('Garage') ? .37 : k.startsWith('Window') || k.startsWith('Door') || k.startsWith('ShopFront') ? .1 : .03);
  const at = (e, u, y, k, o) => { const d = (o === undefined ? proud(k) : o) - back; out.push(k, x0 + e.ax + e.ux * u + e.nx * d, y, z0 + e.az + e.uz * u + e.nz * d, e.rot); };
  for (const e of edges) {
    if (out.length > 5 * 70) break; const isMain = main.has(e), w = isMain ? bw : 2.9, nb = Math.floor((e.L - .7) / w), u0 = (e.L - nb * w) / 2 + w / 2;
    for (let k = 0; k < floors; k++) {
      const base = f.g + k * sh;
      for (let b = 0; b < nb; b++) {
        const u = u0 + b * w, r = hash(fi * 7 + b, k * 31 + Math.round(e.L * 10), 93);
        if (k === 0) {      // street level: one front door, then a shopfront, a garage or windows
          if (e === front && b === 0) { at(e, u, base + .06, seed > .66 ? 'Door08423_WoodOrange' : seed > .33 ? 'Door08423_WoodBrown' : 'Door07423_Black'); at(e, u, base + .06, 'CanopyD08423'); continue; }
          if (e === front && f.h > 7 && seed > .3 && w >= 3.3 && b === 1) { at(e, u, base, 'ShopFrontS39_SlideR_Silver'); continue; }
          if (e === front && wide && r > .7) { at(e, u, base, 'Garage25_Closed'); continue; }
          if (isMain) { if (r > .25) at(e, u, base + 1.0, wide ? 'Window25611' : 'Window16511'); } else if (r > .55) at(e, u, base + 1.1, r > .8 ? 'Window06909_Grille' : 'Window11907');
        } else if (isMain) {
          if (r < .12) continue; if (tall) { at(e, u, base + .12, win); if (r > .3) at(e, u, base + .12, bal); } else { at(e, u, base + 1.0, win); if (r > .6) at(e, u, base + 1.0, can); }
        } else if (r > .45) at(e, u, base + 1.15, r > .75 ? 'Window03613_Black' : 'Window11907');
      }
    }
  }
  // by the wall at street level: an air-conditioner unit, sometimes a drinks machine or a parked bicycle
  const e2 = by[Math.min(1, by.length - 1)]; if (e2.L > 2.4) at(e2, Math.min(e2.L - .6, .8 + seed * 1.5), f.g, 'AcOutdoor', .2);
  if (seed2 > .78 && front.L > 5) out.push(['Vending_HD_Red_103', 'Vending_HD_White_103', 'Vending_HD_Blue_103'][Math.floor(seed * 3)], x0 + front.ax + front.ux * (front.L - 1.3) + front.nx * .08, f.g, z0 + front.az + front.uz * (front.L - 1.3) + front.nz * .08, front.rot);
  else if (seed2 < .16 && front.L > 4) out.push('Bicycle_Plain_Silver', x0 + front.ax + front.ux * (front.L - 1.4) + front.nx * .5, f.g, z0 + front.az + front.uz * (front.L - 1.4) + front.nz * .5, front.rot + Math.PI / 2);
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
    for (let i = 0; i < t.foot.length; i++) { const f = t.foot[i]; if (f.has2 || f.hut || f.h === undefined) continue; const d = Math.hypot(x0 + f.cx - P.x, z0 + f.cz - P.z); if (d < KIT.max) c.push([d, t, i]); }
  }
  c.sort((a, b) => a[0] - b[0]); let R = KIT.max, used = 0, built = 0;
  for (const [d, t, i] of c) {
    const f = t.foot[i]; if (!f.deco) f.deco = kitDeco(t, i); const D = f.deco; if (used + D.length / 5 > KIT.cap) { R = d; break; }
    for (let k = 0; k < D.length; k += 5) kitPut(D[k], D[k + 1], D[k + 2], D[k + 3], D[k + 4]); used += D.length / 5; built++;
  }
  KIT.R = R; KIT.built = built; U.uKit.value.set(P.x - OX, P.z - OZ, off ? 0 : R - .01);
  if (!off) for (const t of NAHA.tiles.values()) {
    if (t.set !== 'pref' || t.state !== 3 || !t.roads) continue; if (!t.poles) t.poles = kitPoles(t); const D = t.poles;
    for (let k = 0; k < D.length; k += 5) { const d = Math.hypot(D[k + 1] - P.x, D[k + 3] - P.z); if (d > 130) continue; if (D[k + 2] === 0) { const y = groundAt(D[k + 1], D[k + 3]); D[k + 2] = y < .4 || nahaBlocked(D[k + 1], D[k + 3], y + 1) ? -999 : y + .001; } if (D[k + 2] > -900) kitPut(D[k], D[k + 1], D[k + 2], D[k + 3], D[k + 4]); }
  }
  for (const k in KIT.m) { const M = KIT.m[k]; if (k.startsWith('KeiCar')) continue; M.mesh.count = M.n; M.mesh.instanceMatrix.needsUpdate = true; }
}
loadKit();
