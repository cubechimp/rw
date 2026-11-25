/* Ryukyu World engine: real coastline at 1:1, streamed terrain, water, sky. Classic script; shares globals with actors.js and ui.js. */
'use strict';
const T = THREE;
T.ColorManagement.enabled = false;
const DATA = window.RW_DATA;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const D2R = Math.PI / 180;
function hash(ix, iz, s) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul((s | 0) + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash(ix, iz, 7), hash(ix + 1, iz, 7), u), lerp(hash(ix, iz + 1, 7), hash(ix + 1, iz + 1, 7), u), v);
}
const hex3 = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 720;

/* ---------------- world data ---------------- */
let WORLD = null, PR = 6364600, LON0 = 127.75, LAT0 = 26.25;
function ll2xz(lon, lat) {
  const lam = (lon - LON0) * D2R, phi = lat * D2R, B = Math.cos(phi) * Math.sin(lam);
  return [PR * Math.atanh(B), -PR * (Math.atan2(Math.tan(phi), Math.cos(lam)) - LAT0 * D2R)];
}
function xz2ll(x, z) {
  const D = -z / PR + LAT0 * D2R, phi = Math.asin(Math.sin(D) / Math.cosh(x / PR));
  return [Math.atan2(Math.sinh(x / PR), Math.cos(D)) / D2R + LON0, phi / D2R];
}
function decodeRings(arr) {
  return arr.map((r) => {
    const n = r.length / 2, xs = new Float32Array(n), zs = new Float32Array(n);
    let x = r[0], z = r[1], a = x, b = z, c = x, d = z; xs[0] = x; zs[0] = z;
    for (let i = 1; i < n; i++) {
      x += r[2 * i]; z += r[2 * i + 1]; xs[i] = x; zs[i] = z;
      if (x < a) a = x; if (x > c) c = x; if (z < b) b = z; if (z > d) d = z;
    }
    return { xs, zs, n, bb: [a, b, c, d] };
  });
}
function inRing(r, x, z) {
  let inside = false; const xs = r.xs, zs = r.zs;
  for (let i = 0, j = r.n - 1; i < r.n; j = i++) {
    if ((zs[i] > z) !== (zs[j] > z) && x < (xs[j] - xs[i]) * (z - zs[i]) / (zs[j] - zs[i]) + xs[i]) inside = !inside;
  }
  return inside;
}

/* coast segment index */
const CELL = 256, SDR = 320;
let SX, SZ, SDX, SDZ, SIL, cellMap = new Map(), segStamp, stampN = 1;
let coastRings = [], coarseRings = [], muniRings = [];
function buildCoastIndex() {
  let total = 0; for (const r of coastRings) total += r.n;
  SX = new Float32Array(total); SZ = new Float32Array(total); SDX = new Float32Array(total); SDZ = new Float32Array(total); SIL = new Float32Array(total);
  segStamp = new Int32Array(total);
  const tmp = new Map(); let k = 0;
  for (const r of coastRings) {
    for (let i = 0; i < r.n; i++) {
      const j = (i + 1) % r.n, ax = r.xs[i], az = r.zs[i], bx = r.xs[j], bz = r.zs[j];
      SX[k] = ax; SZ[k] = az; SDX[k] = bx - ax; SDZ[k] = bz - az; SIL[k] = 1 / Math.max(1e-6, SDX[k] * SDX[k] + SDZ[k] * SDZ[k]);
      const c0 = Math.floor(Math.min(ax, bx) / CELL), c1 = Math.floor(Math.max(ax, bx) / CELL);
      const d0 = Math.floor(Math.min(az, bz) / CELL), d1 = Math.floor(Math.max(az, bz) / CELL);
      for (let c = c0; c <= c1; c++) for (let d = d0; d <= d1; d++) {
        const key = (c + 4096) * 8192 + (d + 4096); let a = tmp.get(key); if (!a) tmp.set(key, a = []); a.push(k);
      }
      k++;
    }
  }
  for (const [key, a] of tmp) cellMap.set(key, Int32Array.from(a));
}
function collectSegs(x0, z0, x1, z1) {
  const out = []; stampN++;
  const c0 = Math.floor(x0 / CELL), c1 = Math.floor(x1 / CELL), d0 = Math.floor(z0 / CELL), d1 = Math.floor(z1 / CELL);
  for (let c = c0; c <= c1; c++) for (let d = d0; d <= d1; d++) {
    const a = cellMap.get((c + 4096) * 8192 + (d + 4096)); if (!a) continue;
    for (let i = 0; i < a.length; i++) { const s = a[i]; if (segStamp[s] !== stampN) { segStamp[s] = stampN; out.push(s); } }
  }
  return out;
}
/* signed distance to the coast (positive on land), capped at SDR */
function sdFrom(list, x, z) {
  let best = SDR * SDR, bo = -1, sign = 0;
  for (let n = 0; n < list.length; n++) {
    const i = list[n], px = x - SX[i], pz = z - SZ[i], dx = SDX[i], dz = SDZ[i];
    let t = (px * dx + pz * dz) * SIL[i]; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = px - dx * t, qz = pz - dz * t, d2 = qx * qx + qz * qz;
    if (d2 > best + 1e-3) continue;
    const cr = dx * pz - dz * px, ortho = cr * cr * SIL[i] / (d2 + 1e-6);
    if (d2 < best - 1e-3 || ortho > bo) { best = Math.min(best, d2); bo = ortho; sign = cr >= 0 ? 1 : -1; }
  }
  if (sign === 0) { sampleR(x, z); return rHh > 0 ? SDR : -SDR; }
  return sign * Math.sqrt(best);
}
function sdAt(x, z) { return sdFrom(collectSegs(x - SDR, z - SDR, x + SDR, z + SDR), x, z); }

/* coarse raster: land height + reef proximity, 128 m pixels in 32x32 tiles */
let RPX = 128, RX0 = 0, RZ0 = 0; const rTiles = new Map();
function rv(i, j) {
  if (i < 0 || j < 0) return 0;
  const t = rTiles.get((j >> 5) * 4096 + (i >> 5)); return t ? t[((j & 31) << 5) | (i & 31)] : 0;
}
let rHh = 0, rS = 0, rL = 0;      // pseudo height, shallow factor, land height
function sampleR(x, z) {
  const fx = (x - RX0) / RPX - 0.5, fz = (z - RZ0) / RPX - 0.5, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const a = rv(i, j), b = rv(i + 1, j), c = rv(i, j + 1), d = rv(i + 1, j + 1);
  const w0 = (1 - u) * (1 - v), w1 = u * (1 - v), w2 = (1 - u) * v, w3 = u * v;
  const hh = (q) => (q >= 16 ? 3 + (q - 16) * 2.2 : -2 - (15 - q) * 1.2), ss = (q) => (q >= 16 ? 1 : q / 15), ll = (q) => (q >= 16 ? (q - 16) * 2.2 : 0);
  rHh = hh(a) * w0 + hh(b) * w1 + hh(c) * w2 + hh(d) * w3;
  rS = ss(a) * w0 + ss(b) * w1 + ss(c) * w2 + ss(d) * w3;
  rL = ll(a) * w0 + ll(b) * w1 + ll(c) * w2 + ll(d) * w3;
}
/* real ground heights where a surveyed city model is loaded (Naha) */
let DEMR = null, demW = 0;
function demAt(x, z) {
  demW = 0; if (!DEMR) return 0; const fx = (x - DEMR.x0) / DEMR.step, fz = (z - DEMR.z0) / DEMR.step;
  if (fx < 0 || fz < 0 || fx >= DEMR.nx - 1 || fz >= DEMR.nz - 1) return 0;
  const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, o = j * DEMR.nx + i, n = DEMR.nx, W = DEMR.w, H = DEMR.h;
  demW = ((W[o] * (1 - u) + W[o + 1] * u) * (1 - v) + (W[o + n] * (1 - u) + W[o + n + 1] * u) * v) / 255; if (demW <= 0) return 0;
  return ((H[o] * (1 - u) + H[o + 1] * u) * (1 - v) + (H[o + n] * (1 - u) + H[o + n + 1] * u) * v) * DEMR.q - 2;
}
/* exact height from signed coast distance; call after sdFrom (uses raster) */
function heightFrom(x, z, sd) {
  sampleR(x, z);
  if (sd >= 0) {
    const k = smooth(18, 300, sd);
    const det = (vnoise(x / 70, z / 70) - 0.5) * 6 + (vnoise(x / 23, z / 23) - 0.5) * 2;
    const hp = 0.04 + 6 * (1 - Math.exp(-sd / 55)) + rL * k + det * k * Math.min(1, 0.3 + rL / 60), rh = demAt(x, z);
    return demW > 0 ? lerp(hp, 0.04 + Math.max(rh, .3) * smooth(0, 22, sd), demW) : hp;
  }
  const d = -sd, lag = -0.04 - Math.min(d, SDR) * 0.016 - vnoise(x / 31, z / 31) * 0.7 * smooth(20, 120, d);
  return lerp(-26, lag, smooth(0.08, 0.36, rS));
}
function heightAt(x, z) { return heightFrom(x, z, sdAt(x, z)); }
let lastSd = 0;
function heightAtSd(x, z) { lastSd = sdAt(x, z); return heightFrom(x, z, lastSd); }

let cityC = [];
function cityDens(x, z) {
  let d = 0, tw = 0;
  for (const c of cityC) { const dx = x - c[0], dz = z - c[1], r2 = (dx * dx + dz * dz) / (c[2] * c[2]); if (r2 < 4) { const v = c[3] * Math.exp(-r2 * 1.4); if (v > d) { d = v; tw = c[4]; } } }
  cityTow = tw; return d;
}
let cityTow = 0;

/* ---------------- renderer ---------------- */
const canvas = $('#gl');
const renderer = new T.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.outputColorSpace = T.LinearSRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2));
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(62, 1, 0.6, 46000);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* floating origin: everything is rendered relative to (OX, OZ) so float32 stays precise 500 km from Naha */
let OX = 0, OZ = 0;

const U = {
  uSunDir: { value: new T.Vector3(-1, .2, .2).normalize() }, uSunCol: { value: new T.Vector3(1, .8, .5) },
  uAmbSky: { value: new T.Vector3(.6, .5, .6) }, uAmbGnd: { value: new T.Vector3(.4, .3, .4) },
  uFogCol: { value: new T.Vector3(1, .7, .4) }, uGlowCol: { value: new T.Vector3(1, .6, .3) },
  uFogDist: { value: 14000 }, uTime: { value: 0 }, uNight: { value: 0 }, uUnder: { value: 0 },
  uRing: { value: new T.Vector3(0, 0, 1400) },
};
const GL_COMMON = `
uniform vec3 uSunDir,uSunCol,uAmbSky,uAmbGnd,uFogCol,uGlowCol;
uniform float uFogDist,uTime,uNight,uUnder;
uniform vec3 uRing;
float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hsh(i),hsh(i+vec2(1.,0.)),f.x),mix(hsh(i+vec2(0.,1.)),hsh(i+vec2(1.,1.)),f.x),f.y);}
vec3 fogged(vec3 c,vec3 wpos){
  vec3 v=wpos-cameraPosition;float d=length(v);
  float f=1.-exp(-d/uFogDist);
  float s=pow(max(dot(normalize(v.xz+vec2(1e-4)),normalize(uSunDir.xz)),0.),6.);
  return mix(c,mix(uFogCol,uGlowCol,s*.5*(1.-uUnder)),f);
}`;
const GL_WAVE = `
vec3 wave(vec2 p,float t){float h=0.;vec2 d=vec2(0.);float ph;
  ph=(p.x*.80+p.y*.60)*.18+t*.9; h+=.26*sin(ph); d+=.26*.18*cos(ph)*vec2(.80,.60);
  ph=(-p.x*.50+p.y*.86)*.30+t*1.2; h+=.14*sin(ph); d+=.14*.30*cos(ph)*vec2(-.50,.86);
  ph=(p.x*.95-p.y*.31)*.52+t*1.7; h+=.07*sin(ph); d+=.07*.52*cos(ph)*vec2(.95,-.31);
  return vec3(h,d);}`;
function waveH(rx, rz, t) {      // must match GL_WAVE, render coords
  return .26 * Math.sin((rx * .80 + rz * .60) * .18 + t * .9) + .14 * Math.sin((-rx * .50 + rz * .86) * .30 + t * 1.2) + .07 * Math.sin((rx * .95 - rz * .31) * .52 + t * 1.7);
}

function objMaterial(ringCut) {
  return new T.ShaderMaterial({
    uniforms: U, side: T.DoubleSide, defines: ringCut ? { RINGCUT: 1 } : {},
    vertexShader: `attribute vec3 aCol;attribute float aGlow;varying vec3 vCol,vN,vW;varying float vGlow;
      void main(){vec4 p=vec4(position,1.);vec3 n=normal;
        #ifdef USE_INSTANCING
          p=instanceMatrix*p;n=mat3(instanceMatrix)*n;
        #endif
        vCol=aCol;
        #ifdef USE_INSTANCING_COLOR
          vCol*=instanceColor;
        #endif
        vec4 w=modelMatrix*p;vW=w.xyz;vN=normalize(mat3(modelMatrix)*n);vGlow=aGlow;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `varying vec3 vCol,vN,vW;varying float vGlow;${GL_COMMON}
      void main(){
        #ifdef RINGCUT
          if(distance(vW.xz,uRing.xy)>uRing.z+45.)discard;
        #endif
        vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
        float dl=max(dot(n,uSunDir),0.);float hemi=n.y*.5+.5;
        vec3 V=normalize(cameraPosition-vW);float rim=pow(1.-max(dot(n,V),0.),3.);
        vec3 lit=vCol*(mix(uAmbGnd,uAmbSky,hemi)+uSunCol*dl)+rim*uAmbSky*.2;
        lit+=vCol*vGlow*(.5+uNight*1.3);
        gl_FragColor=vec4(fogged(lit,vW),1.);
      }`,
  });
}
const objMat = objMaterial(false), scatterMat = objMaterial(true);
const glassMat = new T.ShaderMaterial({
  uniforms: U, vertexShader: objMat.vertexShader,
  fragmentShader: `varying vec3 vCol,vN,vW;varying float vGlow;${GL_COMMON}
    void main(){vec3 n=normalize(vN);vec3 V=normalize(cameraPosition-vW);float nv=max(dot(n,V),0.);float hemi=n.y*.5+.5;
      vec3 base=vCol*(.5+.55*hemi)*(mix(uAmbGnd,uAmbSky,hemi)+uSunCol*.35*max(dot(n,uSunDir),0.)+.28);
      vec3 col=mix(base,vec3(1.),pow(1.-nv,2.2)*.3)+vCol*.11*pow(nv,3.);
      col+=pow(max(dot(n,normalize(V+normalize(vec3(-.35,.8,.3)))),0.),70.)*.47+pow(max(dot(n,normalize(V+uSunDir)),0.),28.)*uSunCol*.17;
      col+=vCol*vGlow*(.5+uNight*1.3);
      gl_FragColor=vec4(fogged(col,vW),1.);}`,
});

/* ---------------- sky ---------------- */
const skyU = { uZen: { value: new T.Vector3() }, uMid: { value: new T.Vector3() }, uHor: { value: new T.Vector3() }, uCloud: { value: new T.Vector3() },
  uDiscA: { value: new T.Vector3() }, uDiscB: { value: new T.Vector3() }, uSunSize: { value: .1 }, uStripe: { value: 1 }, uSkySun: { value: new T.Vector3() } };
const sky = new T.Mesh(new T.SphereGeometry(900, 24, 16), new T.ShaderMaterial({
  uniforms: Object.assign({}, U, skyU), side: T.BackSide, depthTest: false, depthWrite: false,
  vertexShader: `varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec3 vDir;uniform vec3 uZen,uMid,uHor,uCloud,uDiscA,uDiscB,uSkySun;uniform float uSunSize,uStripe;${GL_COMMON}
    void main(){
      vec3 d=normalize(vDir);float h=d.y;
      vec3 c=mix(uHor,uMid,smoothstep(0.,.2,h));c=mix(c,uZen,smoothstep(.14,.62,h));
      c=mix(c,uHor*.8,smoothstep(0.,-.25,h));
      float sd=dot(d,uSkySun);
      c+=uGlowCol*(pow(max(sd,0.),28.)*.5+pow(max(sd,0.),5.)*.2);
      vec2 p=d.xz/(max(h,0.)+.16)*.9+uTime*vec2(.006,.002);
      float n=vn(p*1.3)*.55+vn(p*2.9+3.1)*.3+vn(p*6.3)*.15;
      float cl=smoothstep(.5,.7,n)*smoothstep(.015,.14,h);
      c=mix(c,mix(uCloud,vec3(1.),.4*max(sd,0.)),cl*.82);
      float ang=acos(clamp(sd,-1.,1.));
      float disc=1.-smoothstep(uSunSize*.96,uSunSize,ang);
      float yy=(d.y-uSkySun.y)/uSunSize;
      float mask=yy>-.05?1.:step(.16+.6*(-yy),fract(-yy*5.5));
      c=mix(c,mix(uDiscB,uDiscA,smoothstep(-1.,.7,yy)),disc*mix(1.,mask,uStripe));
      if(uNight>.02){vec3 q=floor(d*170.);c+=step(.9975,hsh(q.xy+q.z*17.))*uNight*smoothstep(.05,.4,h)*.9;}
      if(uUnder>.5)c=mix(uFogCol,c,.15);
      gl_FragColor=vec4(c,1.);
    }`,
}));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

/* ---------------- water ---------------- */
const SHORE_N = 256; const shoreData = new Uint8Array(SHORE_N * SHORE_N * 4);
const shoreTex = new T.DataTexture(shoreData, SHORE_N, SHORE_N, T.RGBAFormat);
shoreTex.magFilter = shoreTex.minFilter = T.LinearFilter; shoreTex.wrapS = shoreTex.wrapT = T.ClampToEdgeWrapping;
let shoreI = 1e9, shoreJ = 1e9;
const waterU = { uShore: { value: shoreTex }, uShoreRect: { value: new T.Vector3() }, uShallow: { value: new T.Vector3() }, uDeep: { value: new T.Vector3() },
  uHor: skyU.uHor, uMid: skyU.uMid };
function updateShore(x, z, force) {
  const ci = Math.floor((x - RX0) / RPX), cj = Math.floor((z - RZ0) / RPX);
  if (!force && Math.abs(ci - shoreI) < 40 && Math.abs(cj - shoreJ) < 40) return;
  shoreI = ci; shoreJ = cj; const i0 = ci - SHORE_N / 2, j0 = cj - SHORE_N / 2;
  for (let j = 0; j < SHORE_N; j++) for (let i = 0; i < SHORE_N; i++) {
    const q = rv(i0 + i, j0 + j), o = (j * SHORE_N + i) * 4; shoreData[o] = q >= 16 ? 255 : q * 17; shoreData[o + 3] = 255;
  }
  shoreTex.needsUpdate = true;
}
function shoreRectSync() { waterU.uShoreRect.value.set(RX0 + (shoreI - SHORE_N / 2) * RPX - OX, RZ0 + (shoreJ - SHORE_N / 2) * RPX - OZ, SHORE_N * RPX); }
function discGeo() {
  const rings = 78, segs = MOBILE ? 40 : 56, pos = [0, 0, 0], idx = [];
  for (let k = 0; k < rings; k++) { const r = 3 * Math.pow(1.132, k); for (let s = 0; s < segs; s++) { const a = s / segs * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
  for (let s = 0; s < segs; s++) idx.push(0, 1 + (s + 1) % segs, 1 + s);
  for (let k = 0; k < rings - 1; k++) for (let s = 0; s < segs; s++) {
    const a = 1 + k * segs + s, b = 1 + k * segs + (s + 1) % segs, c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
const water = new T.Mesh(discGeo(), new T.ShaderMaterial({
  uniforms: Object.assign({}, U, waterU), transparent: true, depthWrite: false, side: T.DoubleSide,
  vertexShader: `varying vec3 vW;varying float vFade;uniform float uTime;${GL_WAVE}
    void main(){vec4 w=modelMatrix*vec4(position,1.);vFade=1.-smoothstep(220.,900.,length(position.xz));
      w.y+=wave(w.xz,uTime).x*vFade;vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader: `varying vec3 vW;varying float vFade;uniform sampler2D uShore;uniform vec3 uShoreRect,uShallow,uDeep,uHor,uMid;${GL_COMMON}${GL_WAVE}
    void main(){
      vec2 suv=(vW.xz-uShoreRect.xy)/uShoreRect.z;
      float s=texture2D(uShore,suv).r*step(0.,suv.x)*step(suv.x,1.)*step(0.,suv.y)*step(suv.y,1.);
      float rd=distance(vW.xz,uRing.xy);float dc=distance(vW,cameraPosition);
      vec3 wv=wave(vW.xz,uTime);
      vec2 rp=vW.xz*.9;float t=uTime;float rf=1.-smoothstep(50.,420.,dc);
      vec2 rip=vec2(cos(rp.x*1.7+t*1.9)+cos(rp.x*.8-rp.y*1.3+t*1.3),cos(rp.y*1.5-t*1.6)+cos(rp.y*.9+rp.x*1.1+t*1.1))*.04*rf;
      vec3 n=normalize(vec3(-wv.y*vFade-rip.x,1.,-wv.z*vFade-rip.y));
      vec3 V=normalize(cameraPosition-vW);
      float lum=dot(uAmbSky,vec3(.33));
      vec3 body=mix(uDeep,uShallow,smoothstep(.03,.85,s))*mix(vec3(1.),uAmbSky/lum,.35)*clamp(lum*1.3+.15,0.,.98);
      if(!gl_FrontFacing){gl_FragColor=vec4(mix(body*1.5,vec3(1.),.25),.5);return;}
      float fres=.03+.97*pow(1.-max(dot(n,V),0.),5.);
      vec3 R=reflect(-V,n);R.y=abs(R.y);
      vec3 skyc=mix(uHor,uMid,smoothstep(0.,.4,R.y))+uGlowCol*pow(max(dot(R,uSunDir),0.),18.)*.7;
      vec3 col=mix(body,skyc,fres*.72);
      float sr=max(dot(R,uSunDir),0.);
      col+=uSunCol*pow(sr,160.)*1.5;
      vec2 sg=vW.xz*5.;float sp=step(.987,hsh(floor(sg)+floor(uTime*2.5)))*smoothstep(.5,.1,length(fract(sg)-.5));
      col+=sp*(.35+pow(sr,2.))*rf*1.6;
      float band=smoothstep(.15,.21,s)*smoothstep(.31,.24,s);
      float fn=vn(vW.xz*.11+vec2(uTime*.22,0.))*vn(vW.xz*.45-vec2(0.,uTime*.35));
      col=mix(col,uAmbSky+uSunCol*.6,band*smoothstep(.14,.36,fn)*.9);
      float near=1.-smoothstep(uRing.z*.5,uRing.z*.93,rd);
      float a=clamp(mix(1.,mix(.5,.92,fres)+(1.-s)*.34,near),0.,1.);
      gl_FragColor=vec4(fogged(col,vW),a);
    }`,
}));
water.renderOrder = 5; water.frustumCulled = false; scene.add(water);
const deepU = Object.assign({ uCol: waterU.uDeep }, U);
const deepPlane = new T.Mesh(new T.CircleGeometry(4000, 24).rotateX(-Math.PI / 2), new T.ShaderMaterial({
  uniforms: deepU, vertexShader: `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader: `varying vec3 vW;uniform vec3 uCol;${GL_COMMON}void main(){gl_FragColor=vec4(fogged(uCol*(uAmbSky*.8+uSunCol*.15),vW),1.);}`,
}));
deepPlane.position.y = -27; deepPlane.frustumCulled = false; scene.add(deepPlane);

function terrainMat(far) {
  return new T.ShaderMaterial({
    uniforms: Object.assign({ uFar: { value: far ? 1 : 0 }, uShallow: waterU.uShallow, uDeep: waterU.uDeep }, U),
    vertexShader: `attribute vec3 aCol;attribute float aTown;varying vec3 vCol,vN,vW;varying float vTown;
      void main(){vCol=aCol;vN=normal;vTown=aTown;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `varying vec3 vCol,vN,vW;varying float vTown;uniform float uFar;uniform vec3 uShallow,uDeep;
      #ifdef HAS_ROAD
      uniform sampler2D uRoad;uniform vec3 uRoadRect;
      #endif
      ${GL_COMMON}
      void main(){
        float rd=distance(vW.xz,uRing.xy);
        if(uFar>.5){if(rd<uRing.z)discard;}else{if(rd>uRing.z+45.)discard;}
        vec3 n=normalize(vN);float dl=max(dot(n,uSunDir),0.);float hemi=n.y*.5+.5;
        vec3 col=vCol*(.92+.16*vn(vW.xz*.3));
        if(vTown>.2&&uFar<.5){vec2 g=min(fract(vW.xz/64.),1.-fract(vW.xz/64.))*64.;float rd2=min(g.x,g.y);
          float road=(1.-smoothstep(2.6,3.4,rd2))*smoothstep(.2,.32,vTown);
          float dash=step(.5,fract(max(g.x,g.y)/8.))*(1.-smoothstep(.12,.3,rd2));
          col=mix(col,mix(vec3(.40,.41,.50),vec3(1.,.95,.7),dash),road);}
        #ifdef HAS_ROAD
        {vec2 ruv=(vW.xz-uRoadRect.xy)/uRoadRect.z;float rr=texture2D(uRoad,ruv).r;
          col=mix(col,vec3(.34,.35,.43)*(.92+.16*vn(vW.xz*.9)),smoothstep(.35,.65,rr));
          col=mix(col,vec3(.82,.82,.78),smoothstep(.2,.42,rr)*(1.-smoothstep(.42,.6,rr))*.45);}
        #endif
        vec3 lit=col*(mix(uAmbGnd,uAmbSky,hemi)+uSunCol*dl);
        if(vW.y<.7&&uFar<.5){
          vec2 p=vW.xz*.5;float t=uTime*.9;
          float c=sin(p.x+t+sin(p.y*1.3-t*.7))*sin(p.y*1.1-t*.8+sin(p.x*.9+t*.5));
          c=pow(.5+.5*c,5.)*smoothstep(.05,-.5,vW.y)*(1.-clamp(-vW.y/9.,0.,1.));
          lit+=uSunCol*c*.55;
          float wob=.13*sin(uTime*1.2+vn(vW.xz*.07)*6.28);
          float f=smoothstep(.34,.02,abs(vW.y-.03-wob))*(.5+.5*vn(vW.xz*1.6+uTime*.3));
          lit=mix(lit,uAmbSky+uSunCol*.7,f*.85);
          if(vW.y<0.){float dep=-vW.y;float lum=min(dot(uAmbSky,vec3(.33))*1.3+.15,.98);
            lit=mix(lit,mix(uShallow,uDeep,smoothstep(2.5,15.,dep))*lum,(1.-exp(-dep*.42))*.92);}
        }
        gl_FragColor=vec4(fogged(lit,vW),1.);
      }`,
  });
}
const nearMat = terrainMat(false), farMat = terrainMat(true);

/* ---------------- moods ---------------- */
const MOODS = [
  { name: 'Aero noon', jp: '真昼', zen: 0x0f6fe6, mid: 0x4ab8ff, hor: 0xcdf3ff, cloud: 0xffffff, glow: 0xfff3c4, discA: 0xffffff, discB: 0xfff6c8,
    el: .95, size: .045, stripe: 0, amb: [.58, .66, .80], gnd: [.44, .50, .42], sun: [.60, .58, .50], shallow: 0x3df5d6, deep: 0x0a62cf, night: 0, fog: 16000 },
  { name: 'Sunset', jp: '夕焼け', zen: 0x3a2fa3, mid: 0xff5c9c, hor: 0xffc063, cloud: 0xffa3b8, glow: 0xff9a4a, discA: 0xfff2a8, discB: 0xff4f9a,
    el: .10, size: .105, stripe: 1, amb: [.66, .50, .68], gnd: [.56, .40, .44], sun: [1.12, .70, .42], shallow: 0x58efd0, deep: 0x2b3fa6, night: .28, fog: 13000 },
  { name: 'Neon dusk', jp: '宵', zen: 0x08093a, mid: 0x47228f, hor: 0xff4f9b, cloud: 0x6d3aa8, glow: 0xff3f9a, discA: 0xff8ac0, discB: 0xff2f8a,
    el: -.085, size: .105, stripe: 1, amb: [.34, .34, .62], gnd: [.26, .22, .40], sun: [.30, .22, .46], shallow: 0x22cfe0, deep: 0x0c1558, night: 1, fog: 11000 },
];
let moodT = 0.0, moodAuto = true;      // start at bright resort noon
const _ca = [0, 0, 0];
function mixHex(a, b, t, out) { const x = hex3(a), y = hex3(b); out.set(lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)); }
function applyMood(under) {
  const i = Math.floor(moodT) % 3, a = MOODS[i], b = MOODS[(i + 1) % 3], t = smooth(.72, 1, moodT - Math.floor(moodT));
  mixHex(a.zen, b.zen, t, skyU.uZen.value); mixHex(a.mid, b.mid, t, skyU.uMid.value); mixHex(a.hor, b.hor, t, skyU.uHor.value);
  mixHex(a.cloud, b.cloud, t, skyU.uCloud.value); mixHex(a.glow, b.glow, t, U.uGlowCol.value);
  mixHex(a.discA, b.discA, t, skyU.uDiscA.value); mixHex(a.discB, b.discB, t, skyU.uDiscB.value);
  mixHex(a.shallow, b.shallow, t, waterU.uShallow.value); mixHex(a.deep, b.deep, t, waterU.uDeep.value);
  const el = lerp(a.el, b.el, t), ce = Math.cos(el);
  skyU.uSkySun.value.set(-ce * .97, Math.sin(el), ce * .24).normalize();
  const le = Math.max(el, .16), cl = Math.cos(le); U.uSunDir.value.set(-cl * .97, Math.sin(le), cl * .24).normalize();
  skyU.uSunSize.value = lerp(a.size, b.size, t); skyU.uStripe.value = lerp(a.stripe, b.stripe, t);
  for (let k = 0; k < 3; k++) _ca[k] = lerp(a.amb[k], b.amb[k], t); U.uAmbSky.value.set(_ca[0], _ca[1], _ca[2]);
  U.uAmbGnd.value.set(lerp(a.gnd[0], b.gnd[0], t), lerp(a.gnd[1], b.gnd[1], t), lerp(a.gnd[2], b.gnd[2], t));
  U.uSunCol.value.set(lerp(a.sun[0], b.sun[0], t), lerp(a.sun[1], b.sun[1], t), lerp(a.sun[2], b.sun[2], t));
  U.uNight.value = lerp(a.night, b.night, t);
  if (under) { U.uFogCol.value.copy(waterU.uShallow.value).multiplyScalar(.55).add(new T.Vector3(0, .08, .18)); U.uFogDist.value = 55; U.uUnder.value = 1; }
  else { U.uFogCol.value.copy(skyU.uHor.value); U.uFogDist.value = lerp(a.fog, b.fog, t); U.uUnder.value = 0; }
}

/* ---------------- geometry helpers ---------------- */
const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3();
function part(g, hexc, o) {
  o = o || {}; g = g.index ? g.toNonIndexed() : g;
  const r = o.r || [0, 0, 0], p = o.p || [0, 0, 0], s = o.s || [1, 1, 1];
  _e.set(r[0], r[1], r[2], o.o || 'XYZ'); _q.setFromEuler(_e); _e.order = 'XYZ'; _m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
  g.applyMatrix4(_m); return { g, c: hex3(hexc), glow: o.glow || 0 };
}
function merge(parts) {
  let n = 0; for (const p of parts) n += p.g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), glow = new Float32Array(n); let o = 0;
  for (const p of parts) {
    const c = p.g.attributes.position.count; pos.set(p.g.attributes.position.array, o * 3); nor.set(p.g.attributes.normal.array, o * 3);
    for (let i = 0; i < c; i++) { col[(o + i) * 3] = p.c[0]; col[(o + i) * 3 + 1] = p.c[1]; col[(o + i) * 3 + 2] = p.c[2]; glow[o + i] = p.glow; }
    o += c; p.g.dispose();
  }
  const G = new T.BufferGeometry();
  G.setAttribute('position', new T.BufferAttribute(pos, 3)); G.setAttribute('normal', new T.BufferAttribute(nor, 3));
  G.setAttribute('aCol', new T.BufferAttribute(col, 3)); G.setAttribute('aGlow', new T.BufferAttribute(glow, 1)); return G;
}
const gBox = (w, h, d) => new T.BoxGeometry(w, h, d), gCyl = (a, b, h, s) => new T.CylinderGeometry(a, b, h, s || 6),
  gSph = (r, a, b) => new T.SphereGeometry(r, a || 10, b || 7), gCone = (r, h, s) => new T.ConeGeometry(r, h, s || 4), gIco = (r, d) => new T.IcosahedronGeometry(r, d || 0);

/* ---------------- scatter models ---------------- */
const gTube = (a, b, h, s) => new T.CylinderGeometry(a, b, h, s || 5, 1, true);
function palmGeo() {
  const ps = []; let x = 0, y = 0;
  for (let k = 0; k < 3; k++) { const h = 2.6; ps.push(part(gTube(.2 - k * .03, .26 - k * .03, h, 5), 0xb08a5c, { p: [x + .18, y + h / 2, 0], r: [0, 0, -.14] })); x += .36; y += h * .98; }
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2, g = new T.PlaneGeometry(.95, 3.6, 1, 2); g.translate(0, 1.8, 0);
    const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const yy = pa.getY(i); pa.setZ(i, -yy * yy * .16); } g.computeVertexNormals();
    ps.push(part(g, k % 2 ? 0x3fbf4f : 0x2f9e58, { p: [x, y, 0], r: [1.15, a, 0], o: 'YXZ' }));
  }
  return merge(ps);
}
function treeGeo() {
  return merge([part(gTube(.28, .42, 2.6, 5), 0x7d6248, { p: [0, 1.3, 0] }), part(gIco(2.3), 0x2f9e58, { p: [0, 3.8, 0], s: [1.25, .8, 1.25] }),
    part(gIco(1.5), 0x4fc35a, { p: [1.1, 4.9, .4], s: [1.1, .8, 1.1] })]);
}
function houseGeo() {       // low concrete house, red akagawara hip roof, a shisa on top
  const pl = (w, h) => new T.PlaneGeometry(w, h);
  return merge([part(gBox(7, 2.8, 5.6), 0xf4eee0, { p: [0, 1.4, 0] }), part(gCone(5.6, 2.1, 4), 0xd8552b, { p: [0, 3.85, 0], r: [0, Math.PI / 4, 0], s: [1, 1, .82] }),
    part(pl(1.1, 1.7), 0x6b4a34, { p: [-1.2, .85, 2.83] }), part(pl(1.5, 1.0), 0xbfeaff, { p: [1.6, 1.6, 2.83], glow: .8 }),
    part(gBox(.5, .45, .7), 0xb5552f, { p: [0, 4.7, .8] })]);
}
function towerGeo() {       // flat-roofed concrete block with the rooftop water tank every Okinawan building has
  const ps = [part(gBox(11, 9, 9), 0xffffff, { p: [0, 4.5, 0] }), part(gBox(11.4, .5, 9.4), 0xdfe5ea, { p: [0, 9.2, 0] }), part(gCyl(.9, .9, 1.6, 6), 0xcfd8e0, { p: [2.8, 10.3, -1.5] })];
  for (let f = 0; f < 3; f++) for (const z of [4.53, -4.53]) ps.push(part(new T.PlaneGeometry(8.6, 1.1), 0xfff0b0, { p: [0, 2 + f * 2.7, z], glow: .9 }));
  return merge(ps);
}
function orbGeo() { return merge([part(gIco(.62, 1), 0xffffff, { glow: .9 }), part(gIco(.2, 0), 0xffffff, { p: [-.22, .26, .3], glow: 2 })]); }

const INST = {};
function makeInst(name, geom, cap, mat) {
  const m = new T.InstancedMesh(geom, mat, cap); m.count = 0; m.frustumCulled = false;
  m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); scene.add(m); INST[name] = { mesh: m, cap };
}
makeInst('palm', palmGeo(), MOBILE ? 1400 : 2600, scatterMat); makeInst('tree', treeGeo(), MOBILE ? 2600 : 5200, scatterMat);
makeInst('house', houseGeo(), MOBILE ? 1500 : 3000, scatterMat); makeInst('tower', towerGeo(), MOBILE ? 500 : 1000, scatterMat);
makeInst('orb', orbGeo(), 400, objMat);
const INST_TYPES = ['palm', 'tree', 'house', 'tower', 'orb'];

/* ---------------- terrain chunks ---------------- */
const CS = 384, NS = 24, FS = 3072, NEAR_R = MOBILE ? 3 : 4, FAR_R = MOBILE ? 5 : 7;
U.uRing.value.z = NEAR_R * CS - 110;
const gridIndex = (() => { const a = []; const w = NS + 1; for (let j = 0; j < NS; j++) for (let i = 0; i < NS; i++) { const p = j * w + i; a.push(p, p + w, p + 1, p + 1, p + w, p + w + 1); } return new T.BufferAttribute(new Uint16Array(a), 1); })();
const nearChunks = new Map(), farChunks = new Map(); let instDirty = false;
const collected = new Map();
const TC = { sand: [.99, .94, .80], wet: [.88, .82, .66], grass: [.50, .85, .32], field: [.74, .88, .40], jungle: [.12, .52, .30], rock: [.74, .72, .64], town: [.84, .84, .80],
  real: [.66, .67, .63], seasand: [.97, .98, .88], coralA: [.33, .47, .42], coralB: [.56, .38, .52], deep: [.05, .26, .55] };
const _c = [0, 0, 0];
function mix3(a, b, t) { _c[0] = lerp(a[0], b[0], t); _c[1] = lerp(a[1], b[1], t); _c[2] = lerp(a[2], b[2], t); return _c; }

function gridMesh(x0, z0, size, H, col, mat, town) {
  const w = NS + 1, m = NS + 3, st = size / NS, pos = new Float32Array(w * w * 3), nor = new Float32Array(w * w * 3);
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 3, q = (j + 1) * m + i + 1; pos[o] = i * st; pos[o + 1] = H[q]; pos[o + 2] = j * st;
    const nx = H[q - 1] - H[q + 1], nz = H[q - m] - H[q + m], l = 1 / Math.hypot(nx, 2 * st, nz); nor[o] = nx * l; nor[o + 1] = 2 * st * l; nor[o + 2] = nz * l;
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setAttribute('aCol', new T.BufferAttribute(col, 3)); g.setAttribute('aTown', new T.BufferAttribute(town || new Float32Array(w * w), 1)); g.setIndex(gridIndex);
  const mesh = new T.Mesh(g, mat); mesh.position.set(x0 - OX, 0, z0 - OZ); mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); scene.add(mesh);
  return mesh;
}
function groundAt(x, z) {      // the ground as it is drawn nearby (a 16 m grid of triangles), so wheels and doorsteps sit on it instead of sinking in
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS), ch = nearChunks.get(cx + ',' + cz); if (!ch || !ch.H) return heightAt(x, z);
  const st = CS / NS, m = NS + 3, fx = (x - cx * CS) / st, fz = (z - cz * CS) / st, i = Math.min(NS - 1, Math.floor(fx)), j = Math.min(NS - 1, Math.floor(fz)), u = fx - i, v = fz - j, q = (j + 1) * m + i + 1, H = ch.H;
  return u + v <= 1 ? H[q] + (H[q + 1] - H[q]) * u + (H[q + m] - H[q]) * v : H[q + m + 1] + (H[q + m] - H[q + m + 1]) * (1 - u) + (H[q + 1] - H[q + m + 1]) * (1 - v);
}
function buildNear(cx, cz) {
  const x0 = cx * CS, z0 = cz * CS, st = CS / NS, m = NS + 3, w = NS + 1;
  const segs = collectSegs(x0 - SDR - 2 * st, z0 - SDR - 2 * st, x0 + CS + SDR + 2 * st, z0 + CS + SDR + 2 * st);
  const H = new Float32Array(m * m), SD = new Float32Array(m * m); let any = false;
  const realB = nahaHasReal(cx, cz, true), realT = nahaHasReal(cx, cz, false);      // real buildings / real roads exist here: no generated ones
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
    const x = x0 + (i - 1) * st, z = z0 + (j - 1) * st, sd = sdFrom(segs, x, z), h = heightFrom(x, z, sd);
    H[j * m + i] = h; SD[j * m + i] = sd; if (h > -15) any = true;
  }
  const ch = { mesh: null, inst: { palm: [], tree: [], house: [], tower: [], orb: [] }, tint: { palm: [], tree: [], house: [], tower: [], orb: [] }, orbs: [] };
  if (!any) return ch;
  ch.H = H;
  const col = new Float32Array(w * w * 3), town = new Float32Array(w * w);
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
    const q = (j + 1) * m + i + 1, h = H[q], sd = SD[q], x = x0 + i * st, z = z0 + j * st, o = (j * w + i) * 3; let c;
    if (sd > 0) {
      const slope = Math.hypot(H[q - 1] - H[q + 1], H[q - m] - H[q + m]) / (2 * st), n1 = vnoise(x / 190, z / 190), dens = cityDens(x, z);
      c = mix3(TC.grass, TC.jungle, clamp(smooth(12, 150, h) * .85 + (vnoise(x / 60, z / 60) - .5) * .5, 0, 1));
      if (n1 > .6 && h < 70) c = mix3(c, TC.field, smooth(.6, .7, n1) * .8);
      if (dens > .12) c = mix3(c, TC.town, smooth(.12, .5, dens) * .6);
      demAt(x, z); const dw = demW; town[j * w + i] = sd > 30 && slope < .3 && dw < .5 && !realT ? dens : 0;
      if (dw > 0) c = mix3(c, TC.real, dw * .9);
      c = mix3(c, TC.rock, smooth(.35, .7, slope));
      const sw = 1 - smooth(10, 26 + 26 * vnoise(x / 90, z / 90), sd); if (sw > 0) c = mix3(c, sd < 4 ? TC.wet : TC.sand, sw);
    } else {
      const dep = -h, cn = vnoise(x / 40, z / 40) * vnoise(x / 13, z / 13);
      c = mix3(TC.wet, TC.seasand, smooth(0, 1.2, dep));
      if (cn > .3 && dep > 1) c = mix3(c, hash(Math.floor(x / 60), Math.floor(z / 60), 3) > .5 ? TC.coralA : TC.coralB, smooth(.3, .42, cn) * .8);
      c = mix3(c, TC.deep, smooth(5.5, 17, dep));
    }
    col[o] = c[0]; col[o + 1] = c[1]; col[o + 2] = c[2];
  }
  ch.mesh = gridMesh(x0, z0, CS, H, col, nahaMatFor(cx, cz) || nearMat, town);
  // scatter
  const G = 12, cell = CS / G, keep = MOBILE ? .6 : 1, bil = (A, fx, fz) => {
    const i = Math.min(NS - 1, Math.floor(fx)), j = Math.min(NS - 1, Math.floor(fz)), u = fx - i, v = fz - j, q = (j + 1) * m + i + 1;
    return lerp(lerp(A[q], A[q + 1], u), lerp(A[q + m], A[q + m + 1], u), v);
  };
  const put = (type, x, y, z, rot, sx, sy, tint) => {
    _e.set(0, rot, 0); _q.setFromEuler(_e); _m.compose(_p.set(x - OX, y, z - OZ), _q, _s.set(sx, sy, sx));
    const a = ch.inst[type]; for (let k = 0; k < 16; k++) a.push(_m.elements[k]); ch.tint[type].push(tint[0], tint[1], tint[2]);
  };
  const pls = PLACES.filter((p) => Math.abs(p.x - x0 - CS / 2) < CS && Math.abs(p.z - z0 - CS / 2) < CS);
  for (let b = 0; b < G; b++) for (let a = 0; a < G; a++) {
    const gx = cx * G + a, gz = cz * G + b, tn = cityDens(x0 + (a + .5) * cell, z0 + (b + .5) * cell) > .2, jl = tn ? .3 : 0, js = tn ? .4 : 1;
    const x = x0 + (a + jl + hash(gx, gz, 1) * js) * cell, z = z0 + (b + jl + hash(gx, gz, 2) * js) * cell;
    if (pls.some((p) => Math.hypot(p.x - x, p.z - z) < 46)) continue;
    const fx = (x - x0) / st, fz = (z - z0) / st, sd = bil(SD, fx, fz), h = bil(H, fx, fz), r = hash(gx, gz, 4), r2 = hash(gx, gz, 5);
    if (sd < -14 && h > -6.5) {
      if (r < .028) { const id = gx + '_' + gz; ch.orbs.push({ id, x, z, c: Math.floor(r2 * 5) }); }
      continue;
    }
    if (sd < 9 || h < .9) continue;
    demAt(x, z); if (demW > .55) continue;
    const slope = Math.abs(bil(H, Math.min(NS, fx + .5), fz) - bil(H, Math.max(0, fx - .5), fz)) / st + Math.abs(bil(H, fx, Math.min(NS, fz + .5)) - bil(H, fx, Math.max(0, fz - .5))) / st;
    const dens = cityDens(x, z), tw = cityTow;
    if (sd < 26) { if (r < .55) put('palm', x, h - .1, z, r2 * 6.28, .8 + r2 * .6, .8 + r * .7, [.9 + r2 * .2, 1, .9 + r * .2]); continue; }
    if (!realB && slope < .22 && r < dens + .012) {
      const ang = Math.floor(r2 * 4) * Math.PI / 2;
      if (tw && dens > .5 && r2 < dens - .3) { const pc = [[1, .96, .9], [.86, .95, 1], [1, .9, .92], [.93, 1, .93]][Math.floor(hash(gx, gz, 6) * 4)]; put('tower', x, h - .3, z, ang, .8 + r2 * .5, .7 + hash(gx, gz, 8) * 2.2, pc); }
      else put('house', x, h - .2, z, ang, .85 + r2 * .35, .9 + r * .25, [1, .97 + r2 * .03, .93 + r2 * .07]);
      continue;
    }
    if (dens > .45) continue;
    if (sd < 70 && r < .3) { put('palm', x, h - .1, z, r2 * 6.28, .9 + r2 * .6, .9 + r * .8, [1, 1, 1]); continue; }
    const jungle = smooth(15, 140, h);
    if (r < (.2 + jungle * .3) * keep) { const s = 1.5 + r2 * 1.4; put('tree', x, h - .3, z, r2 * 6.28, s, s * (.85 + r * .5), [.85 + r2 * .25, .9 + r * .2, .85]); }
  }
  return ch;
}
function buildFar(cx, cz) {
  const x0 = cx * FS, z0 = cz * FS, st = FS / NS, m = NS + 3, w = NS + 1, H = new Float32Array(m * m); let any = false;
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const x = x0 + (i - 1) * st, z = z0 + (j - 1) * st; sampleR(x, z); let h = rHh; if (h > 0 && DEMR) { const rh = demAt(x, z); if (demW > 0) h = lerp(h, rh + 1.5, demW); } H[j * m + i] = h; if (h > -1) any = true; }
  if (!any) return { mesh: null };
  const col = new Float32Array(w * w * 3);
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
    const q = (j + 1) * m + i + 1, h = H[q], x = x0 + i * st, z = z0 + j * st, o = (j * w + i) * 3;
    const slope = Math.hypot(H[q - 1] - H[q + 1], H[q - m] - H[q + m]) / (2 * st), dens = cityDens(x, z);
    let c = mix3(TC.grass, TC.jungle, clamp(smooth(8, 110, h) * .9 + .12, 0, 1));
    if (vnoise(x / 190, z / 190) > .6 && h < 70) c = mix3(c, TC.field, .6);
    if (dens > .12) c = mix3(c, TC.town, smooth(.12, .5, dens) * .8);
    c = mix3(c, TC.rock, smooth(.4, .8, slope)); if (h < 4.5) c = mix3(TC.sand, c, smooth(2.2, 4.5, h));
    col[o] = c[0] * .92; col[o + 1] = c[1] * .92; col[o + 2] = c[2] * .92;
  }
  return { mesh: gridMesh(x0, z0, FS, H, col, farMat) };
}
function dropChunk(ch) { if (ch.mesh) { scene.remove(ch.mesh); ch.mesh.geometry.dispose(); } }
function clearChunks() { for (const c of nearChunks.values()) dropChunk(c); for (const c of farChunks.values()) dropChunk(c); nearChunks.clear(); farChunks.clear(); instDirty = true; }
let pendNear = [], pendFar = [], lastCK = '';
function planChunks(x, z) {
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS), fx = Math.floor(x / FS), fz = Math.floor(z / FS), key = cx + ',' + cz;
  if (key === lastCK) return; lastCK = key; pendNear = []; pendFar = [];
  for (let b = -NEAR_R; b <= NEAR_R; b++) for (let a = -NEAR_R; a <= NEAR_R; a++) if (!nearChunks.has((cx + a) + ',' + (cz + b))) pendNear.push([cx + a, cz + b, a * a + b * b]);
  for (let b = -FAR_R; b <= FAR_R; b++) for (let a = -FAR_R; a <= FAR_R; a++) if (!farChunks.has((fx + a) + ',' + (fz + b))) pendFar.push([fx + a, fz + b, a * a + b * b]);
  pendNear.sort((p, q) => q[2] - p[2]); pendFar.sort((p, q) => q[2] - p[2]);
  for (const [k, c] of nearChunks) { const [a, b] = k.split(',').map(Number); if (Math.abs(a - cx) > NEAR_R + 1 || Math.abs(b - cz) > NEAR_R + 1) { dropChunk(c); nearChunks.delete(k); instDirty = true; } }
  for (const [k, c] of farChunks) { const [a, b] = k.split(',').map(Number); if (Math.abs(a - fx) > FAR_R + 1 || Math.abs(b - fz) > FAR_R + 1) { dropChunk(c); farChunks.delete(k); } }
}
function pumpChunks(ms) {
  const t0 = performance.now();
  while (pendNear.length && performance.now() - t0 < ms) { const [a, b] = pendNear.pop(); nearChunks.set(a + ',' + b, buildNear(a, b)); instDirty = true; }
  while (pendFar.length && performance.now() - t0 < ms) { const [a, b] = pendFar.pop(); farChunks.set(a + ',' + b, buildFar(a, b)); }
}
function rebuildInstances() {
  instDirty = false; const now = performance.now();
  for (const type of INST_TYPES) {
    const I = INST[type], M = I.mesh.instanceMatrix.array, Cc = I.mesh.instanceColor.array; let n = 0;
    if (type === 'orb') {
      for (const ch of nearChunks.values()) for (const o of ch.orbs) {
        const t = collected.get(o.id); if (t && now - t < 240000) continue; if (n >= I.cap) break;
        o.slot = n; _m.makeTranslation(o.x - OX, .9, o.z - OZ); _m.toArray(M, n * 16);
        const oc = ORB_COLORS[o.c]; Cc[n * 3] = oc[0]; Cc[n * 3 + 1] = oc[1]; Cc[n * 3 + 2] = oc[2]; n++;
      }
    } else {
      for (const ch of nearChunks.values()) {
        const a = ch.inst[type], c = ch.tint[type], k = Math.min(a.length / 16, I.cap - n); if (k <= 0) continue;
        for (let i = 0; i < k * 16; i++) M[n * 16 + i] = a[i]; for (let i = 0; i < k * 3; i++) Cc[n * 3 + i] = c[i]; n += k;
      }
    }
    I.mesh.count = n; I.mesh.instanceMatrix.needsUpdate = true; I.mesh.instanceColor.needsUpdate = true;
  }
}
const ORB_COLORS = [[.35, .95, 1], [.3, .5, 1], [.5, 1, .55], [1, .75, .3], [1, .5, .8]];

async function loadWorld() {
  const res = await fetch('world.json'); WORLD = await res.json();
  PR = WORLD.proj.R; LON0 = WORLD.proj.lon0; LAT0 = WORLD.proj.lat0;
  coastRings = decodeRings(WORLD.coast); coarseRings = decodeRings(WORLD.coarse);
  for (const code in WORLD.muni) for (const r of decodeRings(WORLD.muni[code])) { r.code = code; muniRings.push(r); }
  const R = WORLD.raster; RPX = R.px; RX0 = R.x0; RZ0 = R.z0;
  for (const k in R.tiles) { const [ti, tj] = k.split('_').map(Number), bin = atob(R.tiles[k]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); rTiles.set(tj * 4096 + ti, a); }
  buildCoastIndex();
  cityC = DATA.cities.map((c) => { const p = ll2xz(c[0], c[1]); return [p[0], p[1], c[2], c[3], c[4]]; });
  WORLD.coast = WORLD.coarse = WORLD.muni = null; R.tiles = null;
}
