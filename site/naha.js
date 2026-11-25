/* Ryukyu World: real Naha from the PLATEAU 3D city model (MLIT). Buildings, measured heights, LOD2 shapes, road surfaces. */
'use strict';
const NAHA = { idx: null, tiles: new Map(), size: 768, sets: [] };
const N_PAL = [0xf4efe6, 0xe9e4da, 0xdfe7ea, 0xf3e3d3, 0xe6d9c8, 0xd9e3d6, 0xf6e9ee, 0xcfd6dc, 0xfff6dc, 0xd8cfc4].map(hex3);
const bldMat = new T.ShaderMaterial({
  uniforms: U, side: T.DoubleSide,
  vertexShader: `attribute vec3 aCol;attribute vec2 aInfo;varying vec3 vCol,vN,vW;varying vec2 vInfo;
    void main(){vCol=aCol;vInfo=aInfo;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normal;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader: `varying vec3 vCol,vN,vW;varying vec2 vInfo;${GL_COMMON}
    void main(){
      if(distance(vW.xz,uRing.xy)>uRing.z+45.)discard;
      vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
      vec3 col=vCol;float glow=0.;
      if(abs(n.y)<.5){
        vec2 t=normalize(vec2(-n.z,n.x)+1e-5);float u=dot(vW.xz,t),v=vW.y-vInfo.x;
        float seed=hsh(vec2(floor(vInfo.x*37.),floor(vInfo.y*13.)));
        vec2 cell=vec2(floor(u/3.),floor(v/3.2)),f=vec2(fract(u/3.),fract(v/3.2));
        bool shop=vInfo.y>7.&&seed>.3;
        if(v>3.4||(!shop&&v>.4)){
          float win=step(.18,f.x)*step(f.x,.82)*step(.3,f.y)*step(f.y,.76);
          float lit=step(.52,hsh(cell+seed*40.));
          col=mix(col,mix(vec3(.15,.25,.42),uAmbSky,.45),win*.85);glow=win*lit*uNight;col=mix(col,vec3(1.,.86,.55),glow);
        }else if(v>.3){
          float sf=step(.07,f.x)*step(f.x,.93)*step(v,2.7);
          vec3 sign=.55+.45*cos(6.283*(seed*3.+vec3(0.,.33,.67)));
          col=mix(col*.9,mix(vec3(.2,.26,.36),vec3(1.,.9,.7),uNight),sf*.75);
          float band=step(2.8,v);col=mix(col,sign,band*.9);glow=max(band*uNight,sf*uNight*.7);
        }
      }
      float dl=max(dot(n,uSunDir),0.),hemi=n.y*.5+.5;
      vec3 V=normalize(cameraPosition-vW);
      vec3 lit=col*(mix(uAmbGnd,uAmbSky,hemi)+uSunCol*dl)+pow(1.-max(dot(n,V),0.),3.)*uAmbSky*.12;
      lit=mix(lit,col*1.6,glow*.85);
      gl_FragColor=vec4(fogged(lit,vW),1.);
    }`,
});
async function loadNaha() {
  try {
    const r = await fetch('naha/index.json'); if (!r.ok) return; const j = await r.json(), d = j.dem;
    const dec = (s) => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
    DEMR = { x0: d.x0, z0: d.z0, nx: d.nx, nz: d.nz, step: d.step, q: d.q, h: dec(d.h), w: dec(d.w) };
    NAHA.idx = j.tiles; NAHA.size = j.tile; NAHA.sets = [{ dir: 'naha', idx: j.tiles }];
    for (const k in j.anchors) if (WORLD.places[k]) { const a = j.anchors[k]; WORLD.places[k] = [a[0], a[1], a[0], a[1] + 1]; }
    try { const at = await (await fetch('naha/attrs.json')).json(); NAHA.attrs = at.a || {}; NAHA.names = at.n || {}; } catch (e) { NAHA.attrs = {}; NAHA.names = {}; }
    try { const pr = await fetch('pref/index.json'); if (pr.ok) { const pj = await pr.json(); NAHA.sets.push({ dir: 'pref', idx: pj.tiles, group: pj.group || 0, bundles: new Map() }); NAHA.prefReport = pj.report || null; } } catch (e) { /* prefecture tiles not built yet */ }
  } catch (e) { NAHA.idx = null; }
}
function nahaFetch(set, key) {      // prefecture tiles come in bundles of group x group tiles
  if (!set.group) return fetch(set.dir + '/t_' + key + '.json').then((r) => r.json());
  const q = key.split('_').map(Number), bk = Math.floor(q[0] / set.group) + '_' + Math.floor(q[1] / set.group);
  if (!set.bundles.has(bk)) { if (set.bundles.size > 9) set.bundles.delete(set.bundles.keys().next().value); set.bundles.set(bk, fetch(set.dir + '/b_' + bk + '.json').then((r) => r.json())); }
  return set.bundles.get(bk).then((b) => { if (!b[key]) throw new Error('no tile'); return b[key]; });
}
function nahaMatFor(cx, cz) { const k = Math.floor(cx / 2) + '_' + Math.floor(cz / 2), a = NAHA.tiles.get('naha:' + k), b = NAHA.tiles.get('pref:' + k); return a && a.mat ? a.mat : b && b.mat ? b.mat : null; }
function nahaHasReal(cx, cz, buildings) { const k = Math.floor(cx / 2) + '_' + Math.floor(cz / 2); for (const s of NAHA.sets) { const e = s.idx[k]; if (e && (!buildings || e[0] > 0)) return true; } return false; }
function nMesh(g, T_) { const m = new T.Mesh(g, bldMat); m.matrixAutoUpdate = false; m.position.set(T_.tx * NAHA.size - OX, 0, T_.tz * NAHA.size - OZ); m.updateMatrix(); g.computeBoundingSphere(); scene.add(m); return m; }
function nGeo(B) {
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(B.n, 3));
  g.setAttribute('aCol', new T.Float32BufferAttribute(B.c, 3)); g.setAttribute('aInfo', new T.Float32BufferAttribute(B.i, 2)); return g;
}
const N_GEN = [[.98, .95, .88], [.95, .9, .84], [.9, .95, .97], [1, .93, .9]];
function buildNahaTile(t) {
  const S = NAHA.size, b = t.data.b || [], A = { p: [], n: [], c: [], i: [] }, Bq = { p: [], n: [], c: [], i: [] }, gr = [], hs = [], sA = [], sB = [], cen = [], est = [], foot = []; let p = 0, bi = 0;
  const x0 = t.tx * S, z0 = t.tz * S;
  const emit = (xs, zs, n, h, fl) => {
    const has2 = fl & 3; let cx = 0, cz = 0, ar = 0, a0 = 1e9, a1 = -1e9, c0 = 1e9, c1 = -1e9;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; cx += xs[i]; cz += zs[i]; ar += xs[i] * zs[j] - xs[j] * zs[i]; if (xs[i] < a0) a0 = xs[i]; if (xs[i] > a1) a1 = xs[i]; if (zs[i] < c0) c0 = zs[i]; if (zs[i] > c1) c1 = zs[i]; }
    cx /= n; cz /= n; const gen = fl & 8, g = heightAt(x0 + cx, z0 + cz), y0 = g - 2.5, top = g + h, O = has2 ? Bq : A, sg = ar > 0 ? 1 : -1;
    // Neighbours in the data often overlap by a few centimetres, which makes their walls and roofs flicker. Draw every building a little
    // inside its outline and a little taller or shorter, by an amount of its own, so no two surfaces ever share a plane.
    const ins = .03 + hash(t.tx * 131 + bi, t.tz * 17 + n, 57) * .14, y1 = top + hash(t.tx * 53 + bi, t.tz * 29, 58) * .24, rx = new Float32Array(n), rz = new Float32Array(n);
    for (let i = 0; i < n; i++) { const dx = xs[i] - cx, dz = zs[i] - cz, k = Math.max(.6, 1 - ins / (Math.hypot(dx, dz) || 1)); rx[i] = cx + dx * k; rz[i] = cz + dz * k; }
    const col = gen ? N_GEN[Math.floor(hash(t.tx * 31 + bi, t.tz, 33) * N_GEN.length)] : N_PAL[Math.floor(hash(t.tx * 977 + bi, t.tz, 31) * N_PAL.length)], roof = gen && h < 5.5 ? [.85, .36, .2] : [col[0] * .8, col[1] * .8, col[2] * .82];
    gr.push(g); hs.push(h); est.push(fl & 12); cen.push(cx, cz); (has2 ? sB : sA).push(O.p.length / 3, bi); foot.push({ xs, zs, n, a0, a1, c0, c1, top, gen }); bi++;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = rx[i], az = rz[i], bx = rx[j], bz = rz[j]; let nx = (bz - az) * sg, nz = -(bx - ax) * sg; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      O.p.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
      for (let k = 0; k < 6; k++) { O.n.push(nx, 0, nz); O.c.push(col[0], col[1], col[2]); O.i.push(g, h); }
    }
    const cont = Array.from(rx, (v, i) => new T.Vector2(v, rz[i])); if (sg < 0) cont.reverse();
    for (const f of T.ShapeUtils.triangulateShape(cont, [])) for (const q of f) { O.p.push(cont[q].x, y1, cont[q].y); O.n.push(0, 1, 0); O.c.push(roof[0], roof[1], roof[2]); O.i.push(g, h); }
  };
  while (p < b.length) { const n = b[p++], h = b[p++] / 10, fl = b[p++], xs = new Float32Array(n), zs = new Float32Array(n); let x = 0, z = 0; for (let i = 0; i < n; i++) { x += b[p++]; z += b[p++]; xs[i] = x / 5; zs[i] = z / 5; } emit(xs, zs, n, h, fl); }
  const real = bi; let tex = null, img = null; const RK = 512 / S; t.roads = [];
  if (t.data.r) {       // surveyed road surfaces (Naha)
    const px = new Uint8Array(S * S), r = t.data.r; let o = 0, v = 0; for (let i = 0; i < r.length; i++) { if (v) px.fill(255, o, o + r[i]); o += r[i]; v ^= 1; }
    tex = new T.DataTexture(px, S, S, T.RedFormat); tex.magFilter = tex.minFilter = T.LinearFilter; tex.needsUpdate = true;
  } else if (t.data.v && t.data.v.length) {      // road lines: paint them onto a ground mask
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d', { willReadFrequently: true }), v = t.data.v; let q = 0;
    c.fillStyle = '#000'; c.fillRect(0, 0, 512, 512); c.strokeStyle = '#fff'; c.lineCap = c.lineJoin = 'round';
    while (q < v.length) { const w = v[q++], m = v[q++], pts = new Float32Array(m * 2); let x = 0, z = 0; c.lineWidth = Math.max(1.8, w * RK); c.beginPath(); for (let i = 0; i < m; i++) { x += v[q++]; z += v[q++]; pts[i * 2] = x / 2; pts[i * 2 + 1] = z / 2; if (i) c.lineTo(x / 2 * RK, z / 2 * RK); else c.moveTo(x / 2 * RK, z / 2 * RK); } c.stroke(); t.roads.push({ w, pts }); }
    img = c.getImageData(0, 0, 512, 512).data; tex = new T.CanvasTexture(cv); tex.flipY = false; tex.generateMipmaps = false; tex.magFilter = tex.minFilter = T.LinearFilter;
  }
  // Generated infill: where a street already has real buildings around it, fill the empty frontage so towns feel lived in.
  if (t.set === 'pref' && img && real > 3) {
    const CR = 32, GR = S / CR, cnt = new Uint8Array(GR * GR), OC = 8, GO = S / OC, occ = new Uint8Array(GO * GO); let made = 0;
    for (let i = 0; i < real; i++) { const a = clamp(Math.floor(cen[i * 2] / CR), 0, GR - 1), c = clamp(Math.floor(cen[i * 2 + 1] / CR), 0, GR - 1); if (cnt[c * GR + a] < 250) cnt[c * GR + a]++; }
    for (const f of foot) for (let c = Math.max(0, Math.floor(f.c0 / OC)); c <= Math.min(GO - 1, Math.floor(f.c1 / OC)); c++) for (let a = Math.max(0, Math.floor(f.a0 / OC)); a <= Math.min(GO - 1, Math.floor(f.a1 / OC)); a++) occ[c * GO + a] = 1;
    const around = (x, z) => { const gx = Math.floor(x / CR), gz = Math.floor(z / CR); let s = 0; for (let c = gz - 1; c <= gz + 1; c++) for (let a = gx - 1; a <= gx + 1; a++) if (a >= 0 && c >= 0 && a < GR && c < GR) s += cnt[c * GR + a]; return s; };
    const road = (x, z) => { const u = Math.floor(x * RK), v = Math.floor(z * RK); return u < 0 || v < 0 || u > 511 || v > 511 ? 255 : img[(v * 512 + u) * 4]; };
    for (const rd of t.roads) {
      if (rd.w < 4 || rd.w > 12) continue; const pts = rd.pts; let carry = 6;
      for (let i = 0; i + 1 < pts.length / 2 && made < 320; i++) {
        const ax = pts[i * 2], az = pts[i * 2 + 1], dx = pts[i * 2 + 2] - ax, dz = pts[i * 2 + 3] - az, L = Math.hypot(dx, dz); if (L < .5) continue; const ux = dx / L, uz = dz / L; let s = carry;
        for (; s < L; s += 12) for (const side of [-1, 1]) {
          const off = rd.w / 2 + 6, x = ax + ux * s - uz * off * side, z = az + uz * s + ux * off * side; if (x < 7 || z < 7 || x > S - 7 || z > S - 7 || around(x, z) < 3) continue;
          const oa = Math.floor(x / OC), oc = Math.floor(z / OC); let busy = false; for (let c = oc - 1; c <= oc + 1 && !busy; c++) for (let a = oa - 1; a <= oa + 1; a++) if (a >= 0 && c >= 0 && a < GO && c < GO && occ[c * GO + a]) busy = true; if (busy) continue;
          const r1 = hash(t.tx * 131 + Math.floor(x), t.tz * 71 + Math.floor(z), 40), hw = 3.2 + r1 * 1.6, hd = 2.7 + hash(Math.floor(x), Math.floor(z), 41) * 1.3, nx = -uz * side, nz = ux * side;
          if (road(x + ux * hw, z + uz * hw) > 90 || road(x - ux * hw, z - uz * hw) > 90 || road(x + nx * hd, z + nz * hd) > 90 || road(x, z) > 90) continue;
          emit(Float32Array.of(x + ux * hw + nx * hd, x - ux * hw + nx * hd, x - ux * hw - nx * hd, x + ux * hw - nx * hd), Float32Array.of(z + uz * hw + nz * hd, z - uz * hw + nz * hd, z - uz * hw - nz * hd, z + uz * hw - nz * hd), 4, 3.3 + hash(Math.floor(x), Math.floor(z), 42) * (r1 > .78 ? 6 : 2.2), 12);
          occ[oc * GO + oa] = 1; made++;
        }
        carry = s - L;
      }
    }
    t.generated = made;
  }
  t.ground = gr; t.heights = hs; t.est = est; t.foot = foot;
  const cg = new Array(48 * 48);      // collision grid, 16 m cells
  foot.forEach((f, fi) => { for (let c = clamp(Math.floor(f.c0 / 16), 0, 47); c <= clamp(Math.floor(f.c1 / 16), 0, 47); c++) for (let a = clamp(Math.floor(f.a0 / 16), 0, 47); a <= clamp(Math.floor(f.a1 / 16), 0, 47); a++) (cg[c * 48 + a] || (cg[c * 48 + a] = [])).push(fi); }); t.cg = cg;
  t.pois = (t.data.p || []).map((q) => ({ t, x: q[0], z: q[1], id: (Math.imul(q[0], 73856093) ^ Math.imul(q[1], 19349663) ^ String(q[2]).length) >>> 0, full: String(q[2]), name: String(q[2]).slice(0, 28), cat: String(q[3] || '').replace(/_/g, ' ').slice(0, 24), kind: foodKind(q[3]),
    addr: String(q[4] || '').replace(/\s*〒\s*$/, ''), tel: String(q[5] || ''), sp: null }));      // shops, restaurants and other named places
  if (A.p.length) { t.meshA = nMesh(nGeo(A), t); t.meshA.userData = { t, s: sA }; } if (Bq.p.length) { t.meshB = nMesh(nGeo(Bq), t); t.meshB.userData = { t, s: sB }; }
  const nm = t.set === 'naha' && NAHA.names && NAHA.names[t.key]; t.labels = [];      // names recorded in the city model (schools, stations, post offices...)
  if (nm) for (const k in nm) { const i = +k; if (!(i < gr.length)) continue; const sp = textSprite([String(nm[k]).slice(0, 24)], { w: 512, h: 96, stroke: '#ffb23e' }); sp.userData.w = [x0 + cen[i * 2], gr[i] + hs[i] + 5, z0 + cen[i * 2 + 1]]; sp.visible = false; scene.add(sp); t.labels.push(sp); }
  if (tex) {
    t.tex = tex; t.mat = new T.ShaderMaterial({ uniforms: Object.assign({}, nearMat.uniforms, { uRoad: { value: tex }, uRoadRect: { value: new T.Vector3(x0 - OX, z0 - OZ, S) } }), vertexShader: nearMat.vertexShader, fragmentShader: nearMat.fragmentShader, defines: { HAS_ROAD: 1 } });
    for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) { const ch = nearChunks.get((t.tx * 2 + a) + ',' + (t.tz * 2 + c)); if (ch && ch.mesh && (t.set === 'naha' || ch.mesh.material === nearMat)) ch.mesh.material = t.mat; }
  }
  t.data = null; t.state = 3;
}
function nahaPip(f, x, z) { let inside = false; const xs = f.xs, zs = f.zs; for (let i = 0, j = f.n - 1; i < f.n; j = i++) if ((zs[i] > z) !== (zs[j] > z) && x < (xs[j] - xs[i]) * (z - zs[i]) / (zs[j] - zs[i]) + xs[i]) inside = !inside; return inside; }
/* is this spot inside a building, below its roof? */
function nahaBlocked(x, z, y) {
  const S = NAHA.size, tx = Math.floor(x / S), tz = Math.floor(z / S), k = tx + '_' + tz, lx = x - tx * S, lz = z - tz * S, ci = Math.floor(lz / 16) * 48 + Math.floor(lx / 16);
  for (const set of NAHA.sets) {
    const t = NAHA.tiles.get(set.dir + ':' + k), a = t && t.cg && t.cg[ci]; if (!a) continue;
    for (const fi of a) { const f = t.foot[fi]; if (lx < f.a0 - .6 || lx > f.a1 + .6 || lz < f.c0 - .6 || lz > f.c1 + .6 || y > f.top) continue; if (nahaPip(f, lx, lz) || nahaPip(f, lx + .6, lz) || nahaPip(f, lx - .6, lz) || nahaPip(f, lx, lz + .6) || nahaPip(f, lx, lz - .6)) return true; }
  }
  return false;
}
function buildNahaLod2(t) {
  const O = { p: [], n: [], c: [], i: [] }, s2 = [];
  for (const e of t.m2) {
    s2.push(O.p.length / 3, e.i);
    const g = t.ground[e.i], h = t.heights[e.i], v = e.v, pal = N_PAL[e.i % N_PAL.length];
    for (const pl of e.p) {
      let c = pal; if (pl[0] >= 0) { const q = hex3(pl[0]), m = Math.max(q[0], q[1], q[2], .01), k = Math.min(1.45, .82 / m + .35); c = [Math.min(1, q[0] * k), Math.min(1, q[1] * k), Math.min(1, q[2] * k)]; }
      for (let k = 1; k + 2 < pl.length + 0; k += 3) {
        const a = pl[k] * 3, b = pl[k + 1] * 3, d = pl[k + 2] * 3;
        const ax = v[a] / 10, ay = g + v[a + 1] / 10, az = v[a + 2] / 10, bx = v[b] / 10, by = g + v[b + 1] / 10, bz = v[b + 2] / 10, dx = v[d] / 10, dy = g + v[d + 1] / 10, dz = v[d + 2] / 10;
        let nx = (by - ay) * (dz - az) - (bz - az) * (dy - ay), ny = (bz - az) * (dx - ax) - (bx - ax) * (dz - az), nz = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax); const l = Math.hypot(nx, ny, nz); if (l < 1e-6) continue;
        nx /= l; ny /= l; nz /= l; if (ny < -.5) { nx = -nx; ny = -ny; nz = -nz; }
        O.p.push(ax, ay, az, bx, by, bz, dx, dy, dz); for (let q = 0; q < 3; q++) { O.n.push(nx, ny, nz); O.c.push(c[0], c[1], c[2]); O.i.push(g, h); }
      }
    }
  }
  t.m2 = null; t.m2s = 3; if (O.p.length) { t.mesh2 = nMesh(nGeo(O), t); t.mesh2.userData = { t, s: s2 }; }
}
function dropNahaTile(t) { for (const m of [t.meshA, t.meshB, t.mesh2]) if (m) { scene.remove(m); m.geometry.dispose(); } if (t.tex) t.tex.dispose(); if (t.mat) t.mat.dispose(); if (t.labels) for (const l of t.labels) { scene.remove(l); l.material.map.dispose(); l.material.dispose(); } if (t.pois) for (const q of t.pois) if (q.sp) { scene.remove(q.sp); q.sp.material.map.dispose(); q.sp.material.dispose(); q.sp = null; } }
function syncNaha() { for (const t of NAHA.tiles.values()) { for (const m of [t.meshA, t.meshB, t.mesh2]) if (m) { m.position.set(t.tx * NAHA.size - OX, 0, t.tz * NAHA.size - OZ); m.updateMatrix(); } if (t.mat) t.mat.uniforms.uRoadRect.value.set(t.tx * NAHA.size - OX, t.tz * NAHA.size - OZ, NAHA.size); } NAHA.poiT = 0; }
function dropPoi(q) { if (q.sp) { scene.remove(q.sp); q.sp.material.map.dispose(); q.sp.material.dispose(); q.sp = null; } }
function updateNaha(px, pz, budget) {
  if (!NAHA.idx) return; const S = NAHA.size, R = U.uRing.value.z + 80, L2 = MOBILE ? 300 : 420; let built = 0;
  for (let tz = Math.floor((pz - R) / S); tz <= Math.floor((pz + R) / S); tz++) for (let tx = Math.floor((px - R) / S); tx <= Math.floor((px + R) / S); tx++) {
    const key = tx + '_' + tz;
    for (const set of NAHA.sets) {
      const id = set.dir + ':' + key; if (!set.idx[key] || NAHA.tiles.has(id)) continue;
      const t = { key, set: set.dir, l2: !!set.idx[key][1], tx, tz, state: 1, m2s: 0 }; NAHA.tiles.set(id, t);
      nahaFetch(set, key).then((d) => { t.data = d; t.state = 2; }).catch(() => { t.state = -1; });
    }
  }
  for (const [key, t] of NAHA.tiles) {
    const d = Math.hypot(px - (t.tx + .5) * S, pz - (t.tz + .5) * S);
    if (d > R + 1500) { dropNahaTile(t); NAHA.tiles.delete(key); continue; }
    if (t.state === 2 && built < budget) { buildNahaTile(t); built++; }
    if (t.state !== 3) continue;
    if (t.labels) for (const l of t.labels) { const w = l.userData.w, dd = Math.hypot(w[0] - px, w[2] - pz); l.visible = dd < 700; if (l.visible) { const s = clamp(dd * .09, 2.4, 60); l.scale.set(s * l.userData.aspect * .45, s * .45, 1); l.position.set(w[0] - OX, w[1] + s * .3, w[2] - OZ); } }
    if (t.l2 && t.m2s === 0 && d < L2) { t.m2s = 1; fetch(t.set + '/m_' + t.key + '.json').then((r) => r.json()).then((m) => { t.m2 = m; t.m2s = 2; }).catch(() => { t.m2s = -1; }); }
    if (t.m2s === 2 && built < budget) { buildNahaLod2(t); built++; }
    const show2 = !!t.mesh2 && d < L2 + (t.show2 ? 150 : 0); t.show2 = show2; if (t.mesh2) t.mesh2.visible = show2; if (t.meshB) t.meshB.visible = !show2;
  }
  // business labels: the nearest ones get a sign, re-chosen a few times a second
  const PR = MOBILE ? 150 : 210, PN_ = MOBILE ? 60 : 120;
  if (!(NAHA.poiT-- > 0)) {
    NAHA.poiT = 18; const c = [], food = [], KR = MOBILE ? 240 : 330;
    for (const t of NAHA.tiles.values()) if (t.pois) for (const q of t.pois) { q.dd = Math.hypot(q.x - px, q.z - pz); if (q.dd < PR) c.push(q); else dropPoi(q); if (q.kind && q.dd < KR) food.push(q); }
    c.sort((a, b) => a.dd - b.dd);
    c.forEach((q, i) => { if (i >= PN_) dropPoi(q); else if (!q.sp) { q.sp = textSprite(q.cat ? [q.name, q.cat] : [q.name], { w: 384, h: q.cat ? 96 : 72, stroke: q.kind ? '#ff4fa3' : '#19c8ff' }); q.sp.userData.q = q; if (q.lx === undefined) q.y = heightAt(q.x, q.z) + 4.2; scene.add(q.sp); } });
    NAHA.poiShown = c.slice(0, PN_); updateShops(food);
  }
  if (NAHA.poiShown) for (const q of NAHA.poiShown) if (q.sp) { const dd = Math.hypot(q.x - px, q.z - pz), s = clamp(dd * .05, 1.2, 14); q.sp.scale.set(s * q.sp.userData.aspect * .5, s * .5, 1); q.sp.position.set((q.lx === undefined ? q.x : q.lx) - OX, q.y + s * .25, (q.lz === undefined ? q.z : q.lz) - OZ); }
}
function nahaReady(px, pz) { if (!NAHA.idx) return true; for (const t of NAHA.tiles.values()) if (t.state === 1 || t.state === 2 || t.m2s === 1 || t.m2s === 2) return false; return true; }

/* tap a building: what the survey recorded about it */
const _ray = new T.Raycaster(), _nd = new T.Vector2();
const N_STRUCT = { 601: 'wood', 602: 'steel-reinforced concrete', 603: 'reinforced concrete', 604: 'steel frame', 605: 'light steel frame', 606: 'brick, block or stone', 610: 'non-wood' };
function nahaPick(cx, cy) {
  if (!NAHA.idx) return null; _nd.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); _ray.setFromCamera(_nd, camera); _ray.far = 900;
  const sps = []; if (NAHA.poiShown) for (const q of NAHA.poiShown) if (q.sp) sps.push(q.sp);      // a sign: the place card
  const sh = _ray.intersectObjects(sps, false)[0]; if (sh && sh.object.userData.q) return { poi: sh.object.userData.q };
  const ms = []; for (const t of NAHA.tiles.values()) for (const m of [t.meshA, t.meshB, t.mesh2]) if (m && m.visible) ms.push(m);
  for (const k of SHOP_KINDS) if (INST['shop_' + k].mesh.count) ms.push(INST['shop_' + k].mesh);
  const hit = _ray.intersectObjects(ms, false)[0]; if (hit && hit.object.isInstancedMesh) { const q = hit.object.userData.q && hit.object.userData.q[hit.instanceId]; return q ? { poi: q } : null; }
  if (!hit || !hit.object.userData.s) return null;
  const ud = hit.object.userData, s = ud.s, v = hit.faceIndex * 3; let lo = 0, hi = s.length / 2 - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (s[mid * 2] <= v) lo = mid; else hi = mid - 1; }
  const bi = s[lo * 2 + 1], t = ud.t;
  if (t.est[bi] & 8) return { title: 'Filler house', text: 'Generated to fill an empty street front. No real building is recorded here.' };
  if (t.set !== 'naha') return { title: 'Building', text: t.heights[bi].toFixed(1) + ' m tall' + (t.est[bi] ? ' (estimated from its footprint; no height on record)' : '') + '. Source: Overture Maps.' };
  const a = (NAHA.attrs && NAHA.attrs[t.key]) || [], o = bi * 5, name = NAHA.names && NAHA.names[t.key] && NAHA.names[t.key][bi];
  const bits = [t.heights[bi].toFixed(1) + ' m tall'];
  if (a[o + 1] > 0) bits.push(a[o + 1] + ' floors'); if (N_STRUCT[a[o + 2]]) bits.push(N_STRUCT[a[o + 2]]); if (a[o + 3] > 0) bits.push('floor area ' + a[o + 3].toLocaleString('en') + ' m²'); if (a[o + 4] > 0) bits.push('surveyed ' + a[o + 4]);
  return { title: name ? String(name) : 'Building', text: bits.join(' · ') + '. Source: Project PLATEAU.' };
}
