/* Ryukyu World actors: islanders, rides, landmarks, sea life, particles. */
'use strict';
const CRAFTS = ['jetski', 'sabani', 'sup'];
const CRAFT_INFO = {
  jetski: { label: 'Jet ski', max: 15, turn: 2.2, acc: 8, seat: .62 },      // metres per second: about 54, 20 and 9 km/h
  sabani: { label: 'Sabani', max: 5.5, turn: 1.2, acc: 2.5, seat: .36 },
  sup: { label: 'SUP', max: 2.4, turn: 2.0, acc: 3, seat: .16 },
};

const LAND = {      // what you can ride on land
  bike: { label: 'Bicycle', tip: 'An easy 27 km/h. It can bunny-hop.', max: 7.5, turn: 3.0, acc: 6, m: 4 },      // about 27, 47 and 60 km/h
  kart: { label: 'Go-kart', tip: 'Low, quick and twitchy.', max: 13, turn: 3.0, acc: 12, m: 6 },
  kei: { label: 'Kei car', tip: 'Yellow plate, right-hand drive, board on the roof.', max: 16.5, turn: 2.0, acc: 7, m: 7 },
};
function islanderParts(shirt) {      // head, body, hands and feet float apart, all glossy like Ryukyu glass
  const dark = 0x1b2a4a, s = (r, hexc, o) => part(gSph(r, 14, 10), hexc, o);
  return {
    torso: merge([s(.34, shirt, { s: [1, 1.12, .92] })]),
    head: merge([s(.4, shirt, { s: [1.06, .96, 1] }), s(.07, dark, { p: [-.15, .03, -.35], s: [.8, 1.35, .5] }), s(.07, dark, { p: [.15, .03, -.35], s: [.8, 1.35, .5] }),
      s(.025, 0xffffff, { p: [-.13, .07, -.39], glow: 1 }), s(.025, 0xffffff, { p: [.17, .07, -.39], glow: 1 }),
      s(.06, 0xff9db0, { p: [-.26, -.1, -.3], s: [1, .6, .5] }), s(.06, 0xff9db0, { p: [.26, -.1, -.3], s: [1, .6, .5] }),
      ...[0, 1, 2, 3, 4].map((k) => s(.1, 0xff3b5c, { p: [.24 + Math.cos(k * 1.257) * .1, .36 + Math.sin(k * 1.257) * .1, -.08], s: [1, 1, .5], glow: .2 })), s(.05, 0xffe14a, { p: [.24, .36, -.14], glow: .6 })]),
    hand: merge([s(.14, shirt, { s: [1, 1.15, 1] })]), foot: merge([s(.17, shirt, { s: [.92, .62, 1.45] })]),
  };
}
function bikeGeo(accent) {
  const dark = 0x24304a, R = [0, 0, Math.PI / 2];
  return merge([part(gCyl(.34, .34, .06, 14), dark, { p: [0, .34, -.55], r: R }), part(gCyl(.34, .34, .06, 14), dark, { p: [0, .34, .55], r: R }),
    part(gCyl(.24, .24, .07, 12), 0xdfe5ea, { p: [0, .34, -.55], r: R }), part(gCyl(.24, .24, .07, 12), 0xdfe5ea, { p: [0, .34, .55], r: R }),
    part(gBox(.06, .06, 1.1), accent, { p: [0, .58, 0] }), part(gBox(.05, .62, .05), accent, { p: [0, .64, -.5], r: [.2, 0, 0] }), part(gBox(.05, .5, .05), accent, { p: [0, .66, .3] }),
    part(gBox(.2, .06, .32), dark, { p: [0, .93, .3] }), part(gCyl(.025, .025, .52, 5), dark, { p: [0, .98, -.46], r: R })]);
}
function kartGeo(accent) {
  const dark = 0x24304a, R = [0, 0, Math.PI / 2], w = (x, z) => [part(gCyl(.26, .26, .28, 12), dark, { p: [x, .26, z], r: R }), part(gCyl(.13, .13, .3, 8), 0xffe14a, { p: [x, .26, z], r: R })];
  return merge([...w(-.72, -.78), ...w(.72, -.78), ...w(-.76, .78), ...w(.76, .78),
    part(gBox(1.0, .1, 2.1), dark, { p: [0, .24, 0] }),
    part(gBox(.26, .22, 1.05), accent, { p: [-.6, .36, .02] }), part(gBox(.26, .22, 1.05), accent, { p: [.6, .36, .02] }),
    part(gSph(1, 10, 6), accent, { p: [0, .36, -1.02], s: [.42, .2, .5] }), part(gBox(1.3, .08, .12), 0xffffff, { p: [0, .26, -1.3] }),
    part(gBox(.62, .7, .1), accent, { p: [0, .68, .62], r: [.22, 0, 0] }), part(gBox(.62, .1, .5), accent, { p: [0, .36, .36] }),
    part(gCyl(.03, .03, .6, 5), dark, { p: [0, .75, -.56], r: [1.05, 0, 0] }), part(gCyl(.2, .2, .05, 12), dark, { p: [0, .9, -.3], r: [1.05, 0, 0] }),
    part(gBox(.6, .34, .4), 0x8b97a8, { p: [0, .48, .98] }), part(gCyl(.05, .05, .5, 6), 0xdfe5ea, { p: [.36, .5, 1.2], r: [Math.PI / 2, 0, 0] }),
    part(gBox(1.3, .07, .08), 0xffffff, { p: [0, .46, 1.3] }), part(gBox(.36, .26, .04), 0xffffff, { p: [0, .52, -1.2], r: [-.5, 0, 0] })]);
}
function keiGeo(accent) {      // a closed, tall and boxy kei wagon of our own design
  const dark = 0x24304a, clad = 0x2b3340, w = 0xffffff, R = [0, 0, Math.PI / 2], ps = [];
  for (const x of [-.84, .84]) for (const z of [-1.08, 1.08]) ps.push(part(gCyl(.37, .37, .24, 14), 0x1b2233, { p: [x, .37, z], r: R }), part(gCyl(.2, .2, .26, 8), 0xdfe5ea, { p: [x, .37, z], r: R }), part(gBox(.08, .14, 1.0), clad, { p: [x * 1.045, .82, z] }));
  for (const x of [-.82, .82]) { for (const z of [.3, 1.58]) ps.push(part(gBox(.11, 1.14, .13), accent, { p: [x, 1.83, z] })); ps.push(part(gBox(.11, 1.2, .1), accent, { p: [x, 1.84, -.86], r: [-.2, 0, 0] }), part(gBox(.03, .84, .03), dark, { p: [x * 1.065, .86, .3] }), part(gBox(.03, .05, .2), dark, { p: [x * 1.07, 1.12, .02] }), part(gBox(.03, .05, .2), dark, { p: [x * 1.07, 1.12, 1.18] }), part(gBox(.16, .13, .1), accent, { p: [x * 1.17, 1.36, -.8] })); }
  ps.push(part(gBox(1.74, .86, 3.3), accent, { p: [0, .83, 0] }), part(gBox(1.8, .22, 3.36), clad, { p: [0, .5, 0] }), part(gBox(1.1, .1, .08), 0xc9d1d9, { p: [0, .46, -1.68] }),
    part(gBox(1.76, .12, 2.5), w, { p: [0, 2.44, .42] }), part(gBox(1.74, .42, .1), accent, { p: [0, 1.47, 1.6] }), part(gBox(1.74, .1, .1), accent, { p: [0, 2.34, 1.6] }), part(gBox(1.74, .1, .1), accent, { p: [0, 2.36, -.74] }),
    part(gBox(1.0, .2, .05), dark, { p: [0, .9, -1.66] }), part(gBox(.42, .15, .05), 0xfff6c8, { p: [-.58, 1.06, -1.66], glow: 1 }), part(gBox(.42, .15, .05), 0xfff6c8, { p: [.58, 1.06, -1.66], glow: 1 }), part(gBox(.74, .04, .05), 0xfff6c8, { p: [0, 1.06, -1.66], glow: .6 }),
    part(gBox(.42, .2, .04), 0xffd21f, { p: [0, .62, -1.69] }), part(gBox(.42, .2, .04), 0xffd21f, { p: [0, .86, 1.67] }), part(gBox(.12, .5, .05), 0xff3b5c, { p: [-.78, 1.5, 1.66], glow: .7 }), part(gBox(.12, .5, .05), 0xff3b5c, { p: [.78, 1.5, 1.66], glow: .7 }),
    part(gBox(1.5, .06, .5), dark, { p: [0, 1.28, -1.02] }), part(gCyl(.19, .19, .05, 12), dark, { p: [.38, 1.5, -.5], r: [1.15, 0, 0] }), part(gBox(.5, .5, .12), 0x556070, { p: [.38, 1.5, .34] }), part(gBox(.5, .5, .12), 0x556070, { p: [-.38, 1.5, .34] }),
    part(gBox(.06, .06, 2.0), dark, { p: [-.7, 2.54, .42] }), part(gBox(.06, .06, 2.0), dark, { p: [.7, 2.54, .42] }), part(gSph(1, 10, 6), 0x7fe9ff, { p: [0, 2.63, .4], s: [.3, .05, 1.3] }), part(gBox(.08, .03, 2.2), 0xff4fa3, { p: [0, 2.68, .4] }));
  return merge(ps);
}
function keiGlassGeo() {      // windscreen, four side windows and the tailgate glass
  const ps = [part(gBox(1.54, 1.16, .03), 0, { p: [0, 1.84, -.87], r: [-.2, 0, 0] }), part(gBox(1.54, .6, .03), 0, { p: [0, 1.99, 1.6] })];
  for (const x of [-.84, .84]) ps.push(part(gBox(.03, 1.02, .98), 0, { p: [x, 1.81, -.24] }), part(gBox(.03, 1.02, 1.14), 0, { p: [x, 1.81, .94] }));
  return merge(ps);
}
function jetskiGeo(accent) {
  return merge([
    part(gSph(1, 10, 6), 0xffffff, { p: [0, .22, 0], s: [.66, .36, 1.75] }),
    part(gSph(1, 10, 6), accent, { p: [0, .46, .05], s: [.5, .26, 1.3] }),
    part(gBox(.5, .2, .95), 0x24304a, { p: [0, .74, .5] }),
    part(gBox(.34, .42, .3), accent, { p: [0, .86, -.42], r: [-.4, 0, 0] }),
    part(gCyl(.035, .035, .9, 5), 0x24304a, { p: [0, 1.08, -.5], r: [0, 0, Math.PI / 2] }),
    part(gBox(.5, .05, .5), 0x7fe9ff, { p: [0, .56, -1.2], glow: .5 }),
  ]);
}
function sabaniGeo() {
  const sail = new T.PlaneGeometry(2.3, 3.3);
  return merge([
    part(gSph(1, 10, 6), 0x8a5a34, { p: [0, .2, 0], s: [.56, .42, 3.5] }), part(gSph(1, 10, 6), 0x5e3c22, { p: [0, .36, 0], s: [.44, .3, 3.2] }),
    part(gCyl(.05, .07, 4.4, 5), 0x6b4a34, { p: [0, 2.5, -.7] }),
    part(sail, 0xfff8ea, { p: [.35, 2.9, -.1], r: [0, 1.15, 0] }), part(new T.PlaneGeometry(2.3, .4), 0xd8322a, { p: [.37, 3.6, -.09], r: [0, 1.15, 0] }),
    part(gCyl(.03, .03, 2.4, 4), 0x6b4a34, { p: [.35, 1.28, -.1], r: [0, 1.15, Math.PI / 2] }),
  ]);
}
function supGeo(accent) {
  return merge([
    part(gSph(1, 10, 5), 0xffffff, { p: [0, .06, 0], s: [.44, .08, 1.75] }), part(gBox(.5, .03, 1.2), accent, { p: [0, .135, .1] }),
    part(gCyl(.03, .03, 2.1, 5), 0x24304a, { p: [.42, 1.0, -.25], r: [.25, 0, -.1] }), part(gBox(.2, .44, .04), accent, { p: [.5, .02, -.5], r: [.25, 0, -.1] }),
  ]);
}
function planeGeo(accent) {      // a small seaplane on floats
  const w = 0xffffff, dark = 0x24304a;
  return merge([part(gSph(1, 12, 8), w, { p: [0, .95, .1], s: [.55, .52, 2.2] }), part(gSph(1, 10, 6), accent, { p: [0, .95, -1.75], s: [.4, .4, .5] }),
    part(gBox(6.6, .1, 1.15), accent, { p: [0, 1.5, -.25] }), part(gBox(6.6, .04, .3), w, { p: [0, 1.56, -.25] }), part(gBox(.08, .95, .7), accent, { p: [0, 1.6, 2.0] }), part(gBox(2.3, .08, .6), w, { p: [0, 1.15, 2.0] }),
    part(gSph(1, 8, 6), w, { p: [-1.15, .22, -.1], s: [.26, .24, 1.6] }), part(gSph(1, 8, 6), w, { p: [1.15, .22, -.1], s: [.26, .24, 1.6] }),
    part(gBox(.07, .8, .07), dark, { p: [-1.15, .7, -.4] }), part(gBox(.07, .8, .07), dark, { p: [1.15, .7, -.4] }), part(gBox(.07, .8, .07), dark, { p: [-1.15, .7, .5] }), part(gBox(.07, .8, .07), dark, { p: [1.15, .7, .5] })]);
}
function makeIslander(colorIdx) {
  const shirt = DATA.shirts[colorIdx % DATA.shirts.length], g = new T.Group(), G = islanderParts(shirt), parts = {};
  for (const [n, geo] of [['torso', G.torso], ['head', G.head], ['handL', G.hand], ['handR', G.hand], ['footL', G.foot], ['footR', G.foot]]) { const m = new T.Mesh(geo, glassMat); m.frustumCulled = false; g.add(m); parts[n] = m; }
  const rides = { jetski: new T.Mesh(jetskiGeo(shirt), objMat), sabani: new T.Mesh(sabaniGeo(), objMat), sup: new T.Mesh(supGeo(shirt), objMat), bike: new T.Mesh(bikeGeo(shirt), objMat), kart: new T.Mesh(kartGeo(shirt), objMat), kei: new T.Mesh(keiGeo(shirt), objMat), plane: new T.Mesh(planeGeo(shirt), objMat) };
  const prop = new T.Mesh(merge([part(gBox(1.9, .16, .05), 0x24304a), part(gBox(.16, 1.9, .05), 0x24304a)]), objMat); prop.position.set(0, .95, -2.28); prop.frustumCulled = false; rides.plane.add(prop); rides.plane.userData.prop = prop;
  const glass = new T.Mesh(keiGlassGeo(), paneMat); glass.frustumCulled = false; glass.renderOrder = 6; rides.kei.add(glass);
  for (const k in rides) { rides[k].visible = false; rides[k].frustumCulled = false; g.add(rides[k]); }
  g.userData = { parts, rides, a: { ph: 0 } }; scene.add(g); return g;
}
function poseIslander(g, mode, craft, diving, t, speed, opt) {
  const u = g.userData, p = u.parts, a = u.a, dt = (opt && opt.dt) || .016, ride = mode === 'land' && opt && LAND[opt.ride] ? opt.ride : null, biking = ride === 'bike', air = !!(opt && opt.air);
  for (const k of CRAFTS) u.rides[k].visible = mode === 'sea' && k === craft && !diving; for (const k in LAND) u.rides[k].visible = ride === k; u.rides.plane.visible = mode === 'air'; if (mode === 'air') u.rides.plane.userData.prop.rotation.z = t * 38;
  const br = Math.sin(t * 2.2) * .025; let by = .72, bz = 0, hy = 1.44, hz = 0, sy = 1, tilt = 0, ox = 0;
  let hl = [-.52, .78, 0], hr = [.52, .78, 0], fl = [-.2, .12, 0], fr = [.2, .12, 0];
  if (mode === 'air') { by = 1.5 + br; bz = .35; hy = by + .7; hz = bz - .04; hl = [-.3, 1.55, -.2]; hr = [.3, 1.55, -.2]; fl = [-.2, 1.1, .1]; fr = [.2, 1.1, .1]; }
  else if (diving) {      // swimming flat, kicking
    const k = Math.sin(t * 7); by = -.35; hy = -.3; hz = -.62; hl = [-.5 - Math.abs(k) * .1, -.35, -.25 + k * .3]; hr = [.5 + Math.abs(k) * .1, -.35, -.25 - k * .3]; fl = [-.16, -.35 + k * .14, .7]; fr = [.16, -.35 - k * .14, .7];
  } else if (mode === 'sea' || ride) {
    const seat = biking ? [1.2, .28] : ride === 'kart' ? [.74, .32] : ride === 'kei' ? [1.25, -.02] : craft === 'jetski' ? [.98, .45] : craft === 'sabani' ? [.8, 1.2] : [.86, .1];
    const jig = Math.sin(t * 13) * .03 * Math.min(1, speed / 8); by = seat[0] + jig + br; bz = seat[1]; hy = by + .7 + jig * 1.6; hz = bz - .04;
    if (biking) { a.ph += dt * (2 + speed * .9); const c = Math.cos(a.ph), s = Math.sin(a.ph); hl = [-.25, 1.02, -.44]; hr = [.25, 1.02, -.44]; fl = [-.16, .36 + s * .17, .02 + c * .17]; fr = [.16, .36 - s * .17, .02 - c * .17]; }
    else if (ride === 'kart') { hl = [-.2, .92, -.3]; hr = [.2, .92, -.3]; fl = [-.26, .42, -.72]; fr = [.26, .42, -.72]; }
    else if (ride === 'kei') { ox = .38; hl = [-.2, 1.5, -.46]; hr = [.2, 1.5, -.46]; fl = [-.15, .95, -.4]; fr = [.15, .95, -.4]; }
    else if (craft === 'sup') { const s = Math.sin(t * 2.4); hl = [-.3, 1.0 + s * .12, -.35 + s * .2]; hr = [.34, .8 - s * .12, -.2 - s * .2]; fl = [-.18, .26, .25]; fr = [.18, .26, -.1]; }
    else if (craft === 'jetski') { hl = [-.4, 1.06, -.5]; hr = [.4, 1.06, -.5]; fl = [-.42, .5, .3]; fr = [.42, .5, .3]; }
    else { hl = [-.5, .85 + br, .9]; hr = [.5, .85 + br, .9]; fl = [-.2, .5, .75]; fr = [.2, .5, .75]; }
  } else if (mode === 'sit') { by = .42 + br; hy = 1.1 + br * 1.5; hl = [-.5, .3, -.1]; hr = [.5, .3, -.1]; fl = [-.22, .12, -.5]; fr = [.22, .12, -.5]; }
  else {      // on foot: every step is a bounce, with squash and stretch
    const k = Math.min(1, speed / 3); if (speed > .3) a.ph += dt * (7 + speed * .9); else a.ph += (Math.round(a.ph / Math.PI) * Math.PI - a.ph) * Math.min(1, dt * 10);
    const s = Math.sin(a.ph), c = Math.cos(a.ph), hop = Math.abs(s), hop2 = Math.abs(Math.sin(a.ph - .55));
    by = .72 + hop * .24 * k + br; sy = 1 + (hop - .45) * .34 * k + br; hy = 1.44 + hop2 * .34 * k + br * 1.6; tilt = s * .1 * k;
    fl = [-.2, .12 + Math.max(0, c) * .3 * k, -s * .36 * k]; fr = [.2, .12 + Math.max(0, -c) * .3 * k, s * .36 * k];
    hl = [-.52 - hop * .08 * k, .78 + hop2 * .2 * k + br, s * .42 * k]; hr = [.52 + hop * .08 * k, .78 + hop2 * .2 * k + br, -s * .42 * k];
    if (air) { sy = 1.28; hy += .12; hl[1] += .45; hr[1] += .45; fl[1] += .1; fr[1] += .1; }
  }
  const sx = 1 / Math.sqrt(sy); p.torso.position.set(ox, by, bz); p.torso.scale.set(sx, sy, sx); p.torso.rotation.x = diving ? -1.35 : 0;
  p.head.position.set(ox + tilt * .3, hy, hz); p.head.rotation.set(diving ? -1.2 : 0, 0, tilt);
  p.handL.position.set(ox + hl[0], hl[1], hl[2]); p.handR.position.set(ox + hr[0], hr[1], hr[2]); p.footL.position.set(ox + fl[0], fl[1], fl[2]); p.footR.position.set(ox + fr[0], fr[1], fr[2]);
}

/* text sprites */
function textSprite(lines, opt) {
  opt = opt || {}; const cv = document.createElement('canvas'), W = opt.w || 512, H = opt.h || 128; cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.5, 'rgba(225,246,255,.9)'); g.addColorStop(1, 'rgba(170,228,255,.9)');
  const r = H * .42; c.beginPath(); c.moveTo(r, 4); c.arcTo(W - 4, 4, W - 4, H - 4, r); c.arcTo(W - 4, H - 4, 4, H - 4, r); c.arcTo(4, H - 4, 4, 4, r); c.arcTo(4, 4, W - 4, 4, r); c.closePath();
  c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = opt.stroke || '#ffffff'; c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (lines.length > 1) {
    c.fillStyle = '#0a56d8'; c.font = `800 ${H * .36}px "M PLUS Rounded 1c","Hiragino Maru Gothic ProN",sans-serif`; c.fillText(lines[0], W / 2, H * .36, W - 40);
    c.fillStyle = '#c2187a'; c.font = `800 ${H * .22}px "M PLUS Rounded 1c",sans-serif`; c.fillText(lines[1], W / 2, H * .72, W - 40);
  } else { c.fillStyle = '#0b2a5b'; c.font = `800 ${H * .46}px "M PLUS Rounded 1c","Hiragino Maru Gothic ProN",sans-serif`; c.fillText(lines[0], W / 2, H * .54, W - 36); }
  const tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter;
  const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false })); sp.renderOrder = 20; sp.userData.aspect = W / H; return sp;
}

/* ---------------- places ---------------- */
function stallGeo() {
  const ps = [part(gBox(3.6, 1.1, 1.4), 0xfff4d6, { p: [0, .55, 0] }), part(gBox(3.8, .12, 1.7), 0x19c8ff, { p: [0, 1.14, 0] })];
  for (const x of [-1.7, 1.7]) for (const z of [-.7, .9]) ps.push(part(gCyl(.06, .06, 2.9, 5), 0xffffff, { p: [x, 1.45, z] }));
  for (let k = 0; k < 6; k++) ps.push(part(gBox(.66, .1, 2.3), k % 2 ? 0xffffff : 0xff4fa3, { p: [-1.65 + k * .66, 2.95 - .0, .1], r: [.22, 0, 0] }));
  ps.push(part(gBox(2.4, .6, .1), 0xffe14a, { p: [0, 3.5, -.9], glow: 1 }), part(gSph(.22, 8, 6), 0xff6b4a, { p: [-1.2, 1.4, 0], glow: .4 }), part(gSph(.22, 8, 6), 0x8fe01f, { p: [-.6, 1.4, 0], glow: .4 }));
  return merge(ps);
}
function shisaGeo() {
  return merge([part(gBox(.9, .5, 1.1), 0xc9c2b4, { p: [0, .25, 0] }), part(gSph(.42, 8, 6), 0xc8663a, { p: [0, .95, .1], s: [1, 1.05, 1.25] }),
    part(gSph(.4, 8, 6), 0xd9773f, { p: [0, 1.5, -.25] }), part(gIco(.56), 0xa84a22, { p: [0, 1.55, -.02], s: [1.05, 1.05, .6] }),
    part(gSph(.07, 5, 4), 0x1a1a2a, { p: [-.15, 1.6, -.62] }), part(gSph(.07, 5, 4), 0x1a1a2a, { p: [.15, 1.6, -.62] }),
    part(gBox(.34, .12, .1), 0xfff4d6, { p: [0, 1.36, -.62] }), part(gCone(.1, .22, 4), 0xa84a22, { p: [-.26, 1.92, -.2] }), part(gCone(.1, .22, 4), 0xa84a22, { p: [.26, 1.92, -.2] })]);
}
function landmarkGeo(kind) {
  if (kind === 'lighthouse') return merge([part(gCyl(1.6, 2.4, 26, 10), 0xffffff, { p: [0, 13, 0] }), part(gCyl(2.2, 2.2, .6, 10), 0xdfe5ea, { p: [0, 26.3, 0] }),
    part(gCyl(1.3, 1.3, 2.4, 8), 0xfff0a0, { p: [0, 27.8, 0], glow: 2 }), part(gCone(1.7, 1.6, 8), 0xd8322a, { p: [0, 29.8, 0] })]);
  if (kind === 'torii') return merge([part(gCyl(.35, .4, 7, 8), 0xe23a2a, { p: [-2.6, 3.5, 0] }), part(gCyl(.35, .4, 7, 8), 0xe23a2a, { p: [2.6, 3.5, 0] }),
    part(gBox(7.8, .5, .6), 0xe23a2a, { p: [0, 6.9, 0] }), part(gBox(8.6, .4, .8), 0x24304a, { p: [0, 7.4, 0] }), part(gBox(6.2, .35, .4), 0xe23a2a, { p: [0, 5.6, 0] })]);
  if (kind === 'castle') return merge([part(gBox(30, 3, 16), 0xd9d2c0, { p: [0, 1.5, 0] }), part(gBox(24, 6, 11), 0xc8322a, { p: [0, 6, 0] }),
    part(gBox(27, .7, 14), 0xb5552f, { p: [0, 9.3, 0] }), part(gBox(18, 4.5, 8), 0xc8322a, { p: [0, 11.8, 0] }),
    part(gCone(13.5, 4.5, 4), 0xb5552f, { p: [0, 16.2, 0], r: [0, Math.PI / 4, 0], s: [1, 1, .55] }), part(gBox(7, 4, .3), 0xffd14a, { p: [0, 5, 5.6], glow: .6 }),
    part(gBox(26, .3, 13), 0xffffff, { p: [0, 9.75, 0] })]);
  if (kind === 'gusuku') { const ps = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 1.5; ps.push(part(gBox(5.2, 4.5 + (k % 3), 1.8), 0xcfc8b6, { p: [Math.cos(a) * 14, 2.2, Math.sin(a) * 10], r: [0, -a + Math.PI / 2, 0] })); } return merge(ps); }
  if (kind === 'utaki') return merge([part(gBox(2.5, 13, 9), 0x9a9a8c, { p: [-2.6, 5.5, 0], r: [0, 0, -.42] }), part(gBox(3, 14, 9), 0x8a8a7e, { p: [3.2, 6, 0], r: [0, 0, .2] })]);
  if (kind === 'stones') { const ps = []; for (let k = 0; k < 9; k++) { const a = (k - 4) * .2; ps.push(part(gBox(4.4, 1.9, .6), 0x3a3f4a, { p: [Math.sin(a) * 30, .95, -Math.cos(a) * 30 + 30], r: [0, -a, 0] })); } ps.push(part(gCone(1.2, 2.4, 8), 0xfff0a0, { p: [0, 1.4, 6], glow: 1.5 })); return merge(ps); }
  return null;
}
const crystalGeo = merge([part(new T.OctahedronGeometry(1.1), 0xffffff, { s: [1, 1.6, 1], glow: 1.2 })]);
const pillarMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16, blending: T.AdditiveBlending, depthWrite: false, fog: false });
const PLACES = [];
function initPlaces() {
  const sg = stallGeo(), hg = shisaGeo();
  for (const d of DATA.places) {
    const w = WORLD.places[d.id]; if (!w) continue;
    const pl = Object.assign({ x: w[0], z: w[1], cx: w[2], cz: w[3] }, d); pl.y = Math.max(.3, heightAt(pl.x, pl.z));
    const g = new T.Group(), face = Math.atan2(pl.cx - pl.x, -(pl.cz - pl.z));   // face the sea
    if (d.food) { const s = new T.Mesh(sg, objMat); s.rotation.y = -face + Math.PI; s.position.set(Math.sin(face + 1.3) * 7, 0, -Math.cos(face + 1.3) * 7); g.add(s); }
    for (const sgn of [-1, 1]) { const s = new T.Mesh(hg, objMat); s.scale.setScalar(.62); s.rotation.y = -face + Math.PI; s.position.set(Math.sin(face + sgn * .5 + 3.14) * 6, 0, -Math.cos(face + sgn * .5 + 3.14) * 6); g.add(s); }
    demAt(pl.x, pl.z); const lg = demW > .5 ? null : landmarkGeo(d.lm); if (lg) { const s = new T.Mesh(lg, objMat); s.rotation.y = -face + Math.PI; const off = d.lm === 'torii' ? 9 : d.lm === 'stones' ? 14 : 26; s.position.set(Math.sin(face + 3.14) * off, 0, -Math.cos(face + 3.14) * off); s.position.y = Math.max(0, heightAt(pl.x + s.position.x, pl.z + s.position.z) - pl.y) - .2; g.add(s); }
    const cr = new T.Mesh(crystalGeo, new T.ShaderMaterial({ uniforms: Object.assign({ uTint: { value: new T.Vector3(1, .4, .7) } }, U), vertexShader: objMat.vertexShader,
      fragmentShader: objMat.fragmentShader.replace('varying float vGlow;', 'varying float vGlow;uniform vec3 uTint;').replace('vec3 lit=vCol*', 'vec3 lit=uTint*vCol*').replace('lit+=vCol*vGlow', 'lit+=uTint*vGlow') }));
    cr.position.y = 9; g.add(cr);
    const pil = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 260, 8, 1, true), pillarMat); pil.position.y = 140; g.add(pil);
    const label = textSprite([d.jp, d.en], { w: 640, h: 150 }); g.add(label);
    g.traverse((o) => { o.frustumCulled = false; }); scene.add(g);
    pl.group = g; pl.crystal = cr; pl.label = label; pl.pillar = pil; PLACES.push(pl);
  }
}
function syncPlaces() { for (const p of PLACES) p.group.position.set(p.x - OX, p.y, p.z - OZ); }
function updatePlaces(t, px, pz, stamps) {
  for (const p of PLACES) {
    const d = Math.hypot(p.x - px, p.z - pz); p.dist = d; p.group.visible = d < VIEW * 1.6;
    if (!p.group.visible) continue;
    p.crystal.rotation.y = t * 1.2; p.crystal.position.y = 9 + Math.sin(t * 1.6 + p.x) * .5;
    const seen = !!stamps[p.id]; p.crystal.material.uniforms.uTint.value.set(seen ? .35 : 1, seen ? .95 : .35, seen ? 1 : .7);
    const s = clamp(d * .11, 3, 1500); p.label.scale.set(s * p.label.userData.aspect * .5, s * .5, 1); p.label.position.y = 12 + s * .3;
    p.label.material.opacity = clamp(1 - (d - VIEW * .8) / (VIEW * .7), 0, 1); p.pillar.visible = d > 120;
  }
}

/* ---------------- particles ---------------- */
const PN = 220, pPos = new Float32Array(PN * 3), pLife = new Float32Array(PN), pVel = new Float32Array(PN * 3), pSize = new Float32Array(PN); let pNext = 0;
const pGeo = new T.BufferGeometry(); pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3)); pGeo.setAttribute('aLife', new T.BufferAttribute(pLife, 1)); pGeo.setAttribute('aSize', new T.BufferAttribute(pSize, 1));
const particles = new T.Points(pGeo, new T.ShaderMaterial({
  uniforms: U, transparent: true, depthWrite: false,
  vertexShader: `attribute float aLife,aSize;varying float vL;void main(){vL=aLife;vec4 mv=viewMatrix*modelMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*(.4+aLife)*420./max(1.,-mv.z);}`,
  fragmentShader: `varying float vL;uniform vec3 uAmbSky,uSunCol;void main(){float d=length(gl_PointCoord-.5);if(d>.5||vL<=0.)discard;gl_FragColor=vec4(uAmbSky+uSunCol*.6,(1.-d*2.)*min(1.,vL*1.6)*.8);}`,
}));
particles.frustumCulled = false; particles.renderOrder = 8; scene.add(particles);
function emit(rx, y, rz, vx, vy, vz, size, life) {
  const i = pNext; pNext = (pNext + 1) % PN; pPos[i * 3] = rx; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = rz; pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz; pSize[i] = size; pLife[i] = life || 1;
}
function splash(rx, rz, n, pow) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = Math.random() * pow; emit(rx, .2, rz, Math.cos(a) * s, 2 + Math.random() * pow, Math.sin(a) * s, .5 + Math.random() * .7, 1); } }
function updateParticles(dt) {
  for (let i = 0; i < PN; i++) {
    if (pLife[i] <= 0) continue; pLife[i] -= dt * .9;
    pVel[i * 3 + 1] -= 9 * dt; pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    if (pPos[i * 3 + 1] < 0 && pVel[i * 3 + 1] < 0) { pPos[i * 3 + 1] = 0; pVel[i * 3 + 1] = 0; pVel[i * 3] *= .9; pVel[i * 3 + 2] *= .9; }
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.aLife.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true;
}

/* ---------------- sea life ---------------- */
const fishGeo = merge([part(gSph(.3, 6, 5), 0xffffff, { s: [.35, .7, 1.2] }), part(gCone(.22, .34, 4), 0xffffff, { p: [0, 0, .46], r: [-Math.PI / 2, 0, 0], s: [.3, 1, 1] })]);
const FISH_N = 150; makeInst('fish', fishGeo, FISH_N, objMat);
const FISH_COL = [[1, .55, .2], [.3, .95, .9], [1, .9, .25], [.35, .6, 1], [1, .5, .75]];
const schoolCache = new Map(); let schoolsNear = 0;
function school(ix, iz) {
  const k = ix + '_' + iz; let s = schoolCache.get(k); if (s !== undefined) return s;
  s = null;
  if (hash(ix, iz, 21) < .45) {
    const x = (ix + hash(ix, iz, 22)) * 26, z = (iz + hash(ix, iz, 23)) * 26, h = heightAt(x, z);
    if (h < -1.3 && h > -9) s = { x, z, y: Math.max(h + .5, -3.2) * .6 - .4, c: Math.floor(hash(ix, iz, 24) * 5), ph: hash(ix, iz, 25) * 6.28 };
  }
  if (schoolCache.size > 4000) schoolCache.clear(); schoolCache.set(k, s); return s;
}
function updateFish(t, px, pz) {
  const I = INST.fish, M = I.mesh.instanceMatrix.array, Cc = I.mesh.instanceColor.array, ix0 = Math.floor(px / 26), iz0 = Math.floor(pz / 26); let n = 0; schoolsNear = 0;
  for (let b = -3; b <= 3 && n < FISH_N - 4; b++) for (let a = -3; a <= 3 && n < FISH_N - 4; a++) {
    const s = school(ix0 + a, iz0 + b); if (!s) continue;
    if (Math.hypot(s.x - px, s.z - pz) < 14) schoolsNear++;
    for (let f = 0; f < 4; f++) {
      const ang = t * (.5 + f * .07) + s.ph + f * 1.6, r = 1.6 + f * .7;
      _e.set(0, -ang, Math.sin(t * 6 + f) * .15); _q.setFromEuler(_e);
      _m.compose(_p.set(s.x + Math.cos(ang) * r - OX, s.y + Math.sin(t + f) * .25, s.z + Math.sin(ang) * r - OZ), _q, _s.set(1, 1, 1)); _m.toArray(M, n * 16);
      const c = FISH_COL[s.c]; Cc[n * 3] = c[0]; Cc[n * 3 + 1] = c[1]; Cc[n * 3 + 2] = c[2]; n++;
    }
  }
  I.mesh.count = n; I.mesh.instanceMatrix.needsUpdate = true; I.mesh.instanceColor.needsUpdate = true;
}
const turtle = new T.Mesh(merge([part(gSph(.6, 10, 6), 0x4f8f5a, { s: [1, .45, 1.25] }), part(gSph(.22, 8, 6), 0x9fc98a, { p: [0, .05, -.85] }),
  part(gBox(.7, .06, .3), 0x9fc98a, { p: [-.75, 0, -.3], r: [0, .5, 0] }), part(gBox(.7, .06, .3), 0x9fc98a, { p: [.75, 0, -.3], r: [0, -.5, 0] }),
  part(gBox(.4, .06, .22), 0x9fc98a, { p: [-.5, 0, .6] }), part(gBox(.4, .06, .22), 0x9fc98a, { p: [.5, 0, .6] })]), objMat);
turtle.visible = false; turtle.frustumCulled = false; scene.add(turtle);

/* ---------------- other islanders (room presence) ---------------- */
const remotes = new Map();
function nickOf(n) { const a = DATA.nickA, b = DATA.nickB; return a[Math.abs(n[0] | 0) % a.length] + ' ' + b[Math.abs(n[1] | 0) % b.length]; }
function upsertRemote(id, s) {
  let r = remotes.get(id);
  if (!r || r.color !== s.c || r.nk !== s.nk) {
    if (r) { r.g.removeFromParent(); r.label.removeFromParent(); }
    r = { g: makeIslander(s.c), label: textSprite([nickOf(s.n)], { w: 384, h: 96, stroke: '#8fe01f' }), color: s.c, nk: s.nk, x: s.x, z: s.z, y: s.y, h: s.h, bubble: null, et: 0 };
    scene.add(r.label); remotes.set(id, r);
  }
  r.tx = s.x; r.tz = s.z; r.ty = s.y; r.th = s.h; r.mode = s.m === 5 ? 'air' : s.m === 0 || s.m === 4 || s.m >= 6 ? 'land' : 'sea'; r.ride = s.m === 4 ? 'bike' : s.m === 6 ? 'kart' : s.m === 7 ? 'kei' : null; r.in = s.m === 8 ? s.i : 0; r.tix = s.ix; r.tiz = s.iz; r.craft = CRAFTS[clamp(s.m - 1, 0, 2)] || 'jetski'; r.diving = !!s.d; r.name = nickOf(s.n);
  if (s.et && s.et !== r.et) { r.et = s.et; if (r.bubble) scene.remove(r.bubble); r.bubble = textSprite([EMOTES[s.e] || EMOTES[0]], { w: 384, h: 110, stroke: '#ff4fa3' }); r.bubbleT = 4; (r.g.parent || scene).add(r.bubble); }
  return r;
}
const EMOTES = ['Haisai! 👋', 'Māsan! 😋', 'Chura! ✨'];
function dropRemote(id) { const r = remotes.get(id); if (!r) return; r.g.removeFromParent(); r.label.removeFromParent(); if (r.bubble) r.bubble.removeFromParent(); remotes.delete(id); }
function updateRemotes(dt, t) {
  for (const r of remotes.values()) {
    const k = 1 - Math.exp(-dt * 8), far = Math.hypot(r.tx - r.x, r.tz - r.z) > 300;
    r.x = far ? r.tx : lerp(r.x, r.tx, k); r.z = far ? r.tz : lerp(r.z, r.tz, k); r.y = lerp(r.y, r.ty, k);
    let dh = r.th - r.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); r.h += dh * k;
    const here = !!(r.in && INSIDE && INSIDE.id === r.in), home = here ? inScene : scene;      // people inside a restaurant are only seen by others in the same one
    if (r.g.parent !== home) { home.add(r.g); home.add(r.label); r.ix = r.tix; r.iz = r.tiz; } r.g.visible = r.label.visible = here || !r.in;
    let sp = far ? 0 : Math.hypot(r.tx - r.x, r.tz - r.z) * 8;
    if (here) { sp = Math.hypot(r.tix - r.ix, r.tiz - r.iz) * 8; r.ix = lerp(r.ix, r.tix, k); r.iz = lerp(r.iz, r.tiz, k); r.g.position.set(r.ix, 0, r.iz); } else r.g.position.set(r.x - OX, r.y, r.z - OZ);
    r.g.rotation.y = -r.h; const gp = r.g.position;
    poseIslander(r.g, here ? 'land' : r.mode, r.craft, r.diving, t, sp, { dt, ride: here ? null : r.ride });
    r.label.position.set(gp.x, gp.y + 3.1, gp.z); r.label.scale.set(2.6, .65, 1);
    if (r.bubble) { r.bubbleT -= dt; r.bubble.position.set(gp.x, gp.y + 4.1, gp.z); r.bubble.scale.set(3.2, .92, 1); if (r.bubbleT <= 0) { r.bubble.removeFromParent(); r.bubble = null; } }
  }
}
