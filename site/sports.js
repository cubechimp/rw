/* Ryukyu World: water sports behind a tow boat. Start one from any beach. */
'use strict';
const TOW = {
  ski: { label: 'Water ski', jp: '水上スキー', icon: '🎿', rope: 15, speed: 17, swing: 1, air: 1, m: 9, tip: 'Steer left and right to carve across the wake. Cross it fast and you jump.' },
  wake: { label: 'Wakeboard', jp: 'ウェイクボード', icon: '🏄', rope: 13, speed: 13, swing: .9, air: 1.7, m: 10, tip: 'A slower boat and a bigger wake: more air on every crossing.' },
  banana: { label: 'Banana boat', jp: 'バナナボート', icon: '🍌', rope: 11, speed: 12.5, swing: .5, air: 0, m: 11, tip: 'The driver will try to throw you off. Lean into every turn to hang on.' },
  para: { label: 'Parasail', jp: 'パラセーリング', icon: '🪂', rope: 62, speed: 11, swing: .35, air: 0, m: 12, tip: 'Stick up to climb, down to come lower.' },
};
const TOW_KINDS = Object.keys(TOW), TOW_TIME = 85;
function rodGeo(a, b, th) {      // a thin bar from point a to point b
  const d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), g = new T.BoxGeometry(th, th, len);
  g.applyMatrix4(new T.Matrix4().compose(new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), d.normalize()), new T.Vector3(1, 1, 1))); return g;
}
function towGearGeo(kind, accent) {      // what the rider stands on, sits on or hangs under; rider faces -z
  const dark = 0x24304a, ps = [];
  if (kind === 'ski') { for (const x of [-.18, .18]) ps.push(part(gBox(.17, .05, 1.5), accent, { p: [x, .06, -.08] }), part(gBox(.17, .05, .32), accent, { p: [x, .13, -.95], r: [.5, 0, 0] }), part(gBox(.2, .1, .3), dark, { p: [x, .12, .02] })); }
  else if (kind === 'wake') ps.push(part(gBox(.44, .06, 1.2), accent, { p: [0, .06, 0] }), part(gBox(.44, .06, .26), accent, { p: [0, .11, -.7], r: [.45, 0, 0] }), part(gBox(.44, .06, .26), accent, { p: [0, .11, .7], r: [-.45, 0, 0] }), part(gBox(.3, .1, .22), dark, { p: [0, .13, -.32] }), part(gBox(.3, .1, .22), dark, { p: [0, .13, .34] }));
  else if (kind === 'banana') ps.push(part(gSph(1, 10, 7), 0xffd21f, { p: [0, .46, .1], s: [.44, .44, 2.0] }), part(gSph(.3, 8, 6), 0xffd21f, { p: [0, .78, -1.75] }), part(gSph(1, 8, 6), 0xffb300, { p: [-.56, .22, .2], s: [.2, .2, 1.3] }), part(gSph(1, 8, 6), 0xffb300, { p: [.56, .22, .2], s: [.2, .2, 1.3] }),
    part(gBox(.4, .05, .05), dark, { p: [0, .98, -.42] }), part(gBox(.05, .14, .05), dark, { p: [-.18, .92, -.42] }), part(gBox(.05, .14, .05), dark, { p: [.18, .92, -.42] }));
  else {      // parasail: canopy overhead, lines down to a harness bar
    ps.push(part(new T.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), accent, { p: [0, 7.1, .3], s: [3.3, 1.5, 2.1] }), part(gBox(.5, .05, 4.0), 0xffffff, { p: [0, 8.56, .3], s: [1, 1, .5] }), part(gBox(.9, .05, .05), dark, { p: [0, 1.76, 0] }));
    for (const x of [-1, 1]) for (const z of [-1, 1]) ps.push(part(rodGeo([x * .45, 1.76, 0], [x * 3.0, 7.2, .3 + z * 1.5], .03), 0xffffff));
    for (const x of [-1, 1]) ps.push(part(gBox(.9, .04, 3.6), 0xffffff, { p: [x * 1.9, 8.2, .3], r: [0, 0, -x * .42] }));
  }
  if (kind === 'ski' || kind === 'wake') ps.push(part(gBox(.5, .05, .05), dark, { p: [0, 1.05, -.6] }));      // the handle
  return merge(ps);
}
function towBoatGeo() {
  const w = 0xffffff, a = 0xff4fa3, dark = 0x24304a;
  return merge([part(gBox(2.0, .8, 4.6), w, { p: [0, .35, .3] }), part(gSph(1, 10, 6), w, { p: [0, .35, -2.0], s: [1.0, .4, 1.5] }), part(gBox(2.04, .16, 4.6), a, { p: [0, .62, .3] }), part(gBox(1.7, .1, 3.6), 0xd9b98c, { p: [0, .76, .5] }),
    part(gBox(1.7, .5, .06), 0x7fd0f0, { p: [0, 1.1, -1.05], r: [-.45, 0, 0], glow: .2 }), part(gBox(1.5, .3, .5), a, { p: [0, .95, 1.6] }), part(gBox(.5, .95, .5), dark, { p: [0, .55, 2.75] }), part(gBox(.34, .2, .7), dark, { p: [0, 1.08, 2.8] }),
    part(gCyl(.05, .05, 1.5, 6), 0xdfe5ea, { p: [0, 1.5, 1.1] }), part(gBox(.5, .3, .03), a, { p: [.27, 2.1, 1.1], glow: .3 }),
    part(gSph(.33, 8, 6), 0x35d0ff, { p: [.42, 1.2, -.3], s: [1, 1.2, 1], glow: .15 }), part(gSph(.3, 8, 6), 0x35d0ff, { p: [.42, 1.82, -.32], glow: .15 }), part(gCyl(.34, .3, .1, 10), 0xfff3c4, { p: [.42, 2.1, -.32] })]);
}
const towBoat = new T.Mesh(towBoatGeo(), objMat), towRope = new T.Mesh(merge([part(gBox(.05, .05, 1), 0xffffff)]), objMat);
for (const m of [towBoat, towRope]) { m.frustumCulled = false; m.visible = false; scene.add(m); }
towBoat.rotation.order = 'YXZ';

function seaNear(x, z) {      // the nearest open water to a spot on the shore, with room ahead for a boat
  for (let d = 40; d <= 520; d += 30) for (let k = 0; k < 16; k++) {
    const a = k / 16 * 6.283, s = Math.sin(a), c = Math.cos(a), px = x + s * d, pz = z - c * d;
    if (heightAt(px, pz) < -2 && heightAt(px + s * 70, pz - c * 70) < -2 && heightAt(px + s * 160, pz - c * 160) < -1.5) return { x: px, z: pz, h: a };
  }
  return null;
}
function atShore() {      // standing on low ground with the sea a few steps away
  if (P.mode !== 'land' || P.gh > 5) return false;
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; if (heightAt(P.x + Math.sin(a) * 38, P.z - Math.cos(a) * 38) < -.4) return true; }
  return false;
}
function sportButtons() {
  const acts = el('div', { class: 'acts' });
  for (const k of TOW_KINDS) acts.append(el('button', { class: 'act', on: { click: () => startTow(k) } }, el('span', { class: 'ic' }, TOW[k].icon), el('span', null, el('b', null, TOW[k].label + ' ' + TOW[k].jp), el('small', null, TOW[k].tip))));
  return acts;
}
function openSports() { openModal(el('div', null, el('h2', { id: 'mTitle' }, 'Water sports', el('small', null, 'マリンスポーツ')), el('p', null, 'A boat picks you up just offshore and brings you back here after the run. About a minute and a half each.'), sportButtons())); }
function startTow(kind) {
  if (P.tow || P.fly || INSIDE || IN.busy || !TOW[kind]) return; const s = seaNear(P.x, P.z); closeModal();
  if (!s) { toast('Water sports', 'There is no open water close enough here. Walk down to the shore and try again.'); return; }
  const f = $('#fade'); f.textContent = TOW[kind].label + '…'; f.classList.add('on'); IN.busy = true;
  setTimeout(() => {
    const K = TOW[kind];
    P.tow = { kind, K, home: { x: P.x, z: P.z, h: P.h }, bx: s.x + Math.sin(s.h) * (K.rope + 14), bz: s.z - Math.cos(s.h) * (K.rope + 14), bh: s.h, bs: 0, turn: 0, s: 0, sv: 0, t: 0, jumps: 0, grip: 1, alt: 0, altT: 22, top: 0, glass0: S.glass, wig: Math.random() * 9, over: false };
    P.mode = 'sea'; P.diving = false; P.air = false; P.jy = 0; P.speed = 0; P.x = s.x; P.z = s.z; P.h = s.h; cam.yaw = s.h; cam.lastDrag = -10; towBoat.visible = towRope.visible = true; IN.busy = false;
    toast(K.label + ' ' + K.jp, K.tip); setTimeout(() => f.classList.remove('on'), 150);
  }, 350);
}
function endTow(why) {
  const W = P.tow; if (!W || W.over) return; W.over = true; const K = W.K, f = $('#fade'); let line, gain;
  if (W.kind === 'ski' || W.kind === 'wake') { gain = Math.min(6, Math.floor(W.jumps / 2)); line = W.jumps + ' wake jump' + (W.jumps === 1 ? '' : 's'); }
  else if (W.kind === 'banana') { const full = W.t >= TOW_TIME; gain = full ? 4 : Math.min(3, Math.floor(W.t / 25)); line = why === 'fell' ? 'Thrown off after ' + Math.round(W.t) + ' seconds' : full ? 'You stayed on for the whole ride' : 'You stayed on for ' + Math.round(W.t) + ' seconds'; }
  else { gain = W.t < 40 ? 0 : W.top > 30 ? 2 : 1; line = 'Top height ' + Math.round(W.top) + ' m'; }
  if (why === 'fell') { splash(P.x - OX, P.z - OZ, 40, 8); splashSfx(.4); }
  f.textContent = why === 'fell' ? 'Splash!' : 'Back to the beach…'; f.classList.add('on');
  setTimeout(() => {
    const floats = S.glass - W.glass0; P.tow = null; towBoat.visible = towRope.visible = false; S.glass += gain; save(); setPos(W.home.x, W.home.z); P.h = W.home.h; cam.yaw = P.h; me.rotation.set(0, -P.h, 0);
    toast(K.label, line + '. ' + (gain ? '+' + gain + ' Ryukyu glass' : 'No glass this time') + (floats > 0 ? ', and ' + floats + ' picked up on the way.' : '.')); ding(880, 1320);
    setTimeout(() => f.classList.remove('on'), 150);
  }, 420);
}
function towHud() {
  const W = P.tow, left = Math.max(0, Math.ceil(TOW_TIME - W.t));
  if (W.kind === 'banana') return 'Grip ' + '▮'.repeat(Math.ceil(W.grip * 5)) + '▯'.repeat(5 - Math.ceil(W.grip * 5)) + ' · ' + left + ' s';
  if (W.kind === 'para') return 'Height ' + Math.round(W.alt) + ' m · ' + left + ' s';
  return W.jumps + ' wake jump' + (W.jumps === 1 ? '' : 's') + ' · ' + left + ' s';
}
function towStep(dt, ix, iy) {
  const W = P.tow, K = W.K, kind = W.kind, ending = W.t > TOW_TIME || W.over; W.t += dt;
  W.bs = lerp(W.bs, ending ? 0 : K.speed, dt * (ending ? 1.3 : .7));
  // The driver keeps to deep water, weaves a little, and stays within reach of the beach.
  const probe = (a, d) => heightAt(W.bx + Math.sin(W.bh + a) * d, W.bz - Math.cos(W.bh + a) * d);
  const ah = Math.max(probe(0, 45), probe(0, 95)), lf = Math.max(probe(-.7, 60), probe(-.35, 95)), rt = Math.max(probe(.7, 60), probe(.35, 95));
  let want = Math.sin(W.t * (kind === 'banana' ? .95 : .32) + W.wig) * (kind === 'banana' ? .6 : .16);
  if (ah > -2 || lf > -1.5 || rt > -1.5) want = (lf < rt ? -1 : 1) * (ah > -2 ? .75 : .45);
  else { const hx = W.home.x - W.bx, hz = W.home.z - W.bz; if (Math.hypot(hx, hz) > 650) { let d = Math.atan2(hx, -hz) - W.bh; d = Math.atan2(Math.sin(d), Math.cos(d)); want = clamp(d, -.4, .4); } }
  W.turn = lerp(W.turn, want, dt * 2); W.bh += W.turn * dt * Math.min(1, W.bs / 6);
  W.bx += Math.sin(W.bh) * W.bs * dt; W.bz -= Math.cos(W.bh) * W.bs * dt;
  // the rider swings on the rope: s is how far to the boat's right, in radians of rope
  const live = W.bs > 4 ? 1 : 0, was = W.s;
  W.sv += (clamp(ix, -1, 1) * 3.2 * K.swing * live - W.s * 1.8 - W.sv * 1.3 - W.turn * 1.6) * dt; W.s += W.sv * dt; if (Math.abs(W.s) > 1.05) { W.s = Math.sign(W.s) * 1.05; W.sv = 0; }
  if (K.air && was * W.s < 0 && Math.abs(W.sv) > .85 && !P.air && W.bs > 8) { P.air = true; P.vy = (3.2 + Math.abs(W.sv) * 2.4) * Math.sqrt(K.air); W.jumps++; ding(880 + W.jumps * 30, 1320 + W.jumps * 45); splash(P.x - OX, P.z - OZ, 14, 5); }
  if (P.air) { P.vy -= 20 * dt; P.jy += P.vy * dt; if (P.jy <= 0) { P.jy = 0; P.air = false; splash(P.x - OX, P.z - OZ, 18, 5); splashSfx(.2); } }
  if (kind === 'banana' && !ending) {      // lean the way the boat is turning, or lose your grip
    const need = clamp(W.turn / .55, -1, 1), off = Math.abs(need) > .25 ? Math.abs(need - clamp(ix, -1, 1)) * Math.abs(need) : 0;
    W.grip = clamp(W.grip + (off > .45 ? -(off - .45) * .32 : .25) * dt, 0, 1); if (W.grip <= 0) endTow('fell');
  }
  if (kind === 'para') { W.altT = clamp(W.altT + clamp(iy, -1, 1) * 14 * dt, 8, 46); W.alt = lerp(W.alt, W.bs > 7 ? W.altT : 0, dt * .8); W.top = Math.max(W.top, W.alt); }
  const Lh = Math.sqrt(Math.max(64, K.rope * K.rope - W.alt * W.alt)), ph = W.bh - W.s; P.x = W.bx - Math.sin(ph) * Lh; P.z = W.bz + Math.cos(ph) * Lh; P.gh = heightAt(P.x, P.z);
  P.y = waveH(P.x - OX, P.z - OZ, tNow) + P.jy + W.alt + (kind === 'para' && W.alt > 1 ? 0 : .04); P.speed = W.bs; P.h = kind === 'banana' || kind === 'para' ? ph : W.bh - W.s * .45 + W.sv * .2;
  me.position.set(P.x - OX, P.y, P.z - OZ); me.rotation.order = 'YXZ';
  me.rotation.set(P.air ? .25 : kind === 'ski' || kind === 'wake' ? .1 : kind === 'banana' ? Math.sin(tNow * 9) * .04 * live : 0, -P.h, kind === 'para' ? W.s * .25 : clamp(-W.sv * .35 - (kind === 'banana' ? W.turn * .5 : 0), -.6, .6));
  poseIslander(me, 'sea', P.craft, false, tNow, P.speed, { dt, tow: kind, air: P.air });
  // the boat and the line
  const by = waveH(W.bx - OX, W.bz - OZ, tNow) + .1; towBoat.position.set(W.bx - OX, by, W.bz - OZ); towBoat.rotation.set(clamp(W.bs * .008, 0, .14), -W.bh, -W.turn * .3);
  const ax = W.bx - Math.sin(W.bh) * 1.1 - OX, ay = by + 2.2, az = W.bz + Math.cos(W.bh) * 1.1 - OZ, fw = kind === 'banana' ? 1.9 : kind === 'para' ? 0 : .6, hy = kind === 'banana' ? .8 : kind === 'para' ? 1.2 : 1.05;
  const tx = me.position.x + Math.sin(P.h) * fw, ty = P.y + hy, tz = me.position.z - Math.cos(P.h) * fw, len = Math.hypot(tx - ax, ty - ay, tz - az);
  towRope.position.set((ax + tx) / 2, (ay + ty) / 2, (az + tz) / 2); towRope.lookAt(tx, ty, tz); towRope.scale.set(1, 1, len);
  if (W.bs > 6) { if (Math.random() < dt * 26) splash(W.bx - Math.sin(W.bh) * 2.6 - OX, W.bz + Math.cos(W.bh) * 2.6 - OZ, 3, 4); if (kind !== 'para' && !P.air && Math.random() < dt * 22) splash(P.x - OX, P.z - OZ, 2, 3); }
  collectFloats();
  if ((ending && W.bs < 1.4) || heightAt(W.bx, W.bz) > -.5) endTow('done');
}
