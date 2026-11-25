/* Ryukyu World: player, controls, sound, menus, online presence, main loop. */
'use strict';
const SAVE_KEY = 'ryukyu-world-v1';
const S = { name: [Math.floor(Math.random() * 12), Math.floor(Math.random() * 12)], color: Math.floor(Math.random() * 7), stamps: {}, foods: {}, words: {}, fish: {}, glass: 4, pos: null, craft: 'jetski', muted: false, bike: true, gba: true };
try { const j = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (j && typeof j === 'object') Object.assign(S, j); } catch (e) { /* no storage: play without saving */ }
function save() { try { S.pos = [Math.round(P.x), Math.round(P.z)]; localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

const P = { x: 0, z: 0, y: 0, h: 0, speed: 0, mode: 'land', craft: S.craft, diving: false, jy: 0, vy: 0, air: false, spin: 0, emote: 0, emoteT: 0, buffT: 0, luckT: 0, gh: 0, bike: true };
const cam = { yaw: 0, pitch: .2, dist: 9, lastDrag: -10 };
let me = null, myBubble = null, myBubbleT = 0, started = false, modalOpen = false, chill = false, tNow = 0, ROOM = null, onlineN = 0;
const inp = { jx: 0, jy: 0, boost: false };
const keys = {};

/* ---------------- helpers ---------------- */
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) { if (k === 'class') e.className = props[k]; else if (k === 'on') for (const ev in props.on) e.addEventListener(ev, props.on[ev]); else if (k in e) e[k] = props[k]; else e.setAttribute(k, props[k]); }
  for (const k of kids) if (k != null) e.append(k); return e;
}
function toast(title, text) {
  const d = el('div', { class: 'glass' }, el('b', null, title), text ? ' ' + text : null); $('#toast').append(d);
  while ($('#toast').children.length > 3) $('#toast').firstChild.remove();
  setTimeout(() => d.remove(), 4200);
}
const fmtDist = (d) => (d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(d < 10000 ? 1 : 0) + ' km');
function regionAt(x, z) { for (let i = 0; i < DATA.regions.length; i++) { const b = DATA.regions[i].b; if (x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]) return i; } return 0; }
function learn(id) { if (!S.words[id]) { S.words[id] = 1; const w = DATA.words[id]; toast('New word: ' + w[0], w[2]); } }

/* ---------------- sound ---------------- */
let AC = null, master = null, engineOsc = null, engineGain = null, plucks = [], musicOn = true;
const NOTES = [261.63, 329.63, 349.23, 392.0, 493.88, 523.25, 659.25, 698.46], KUNKUNSHI = ['合', '老', '四', '上', '尺', '工', '六', '七'], SOLFA = ['C', 'E', 'F', 'G', 'B', 'C', 'E', 'F'];
function initAudio() {
  if (AC) return; const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
  try { AC = new Ctx(); } catch (e) { AC = null; return; }
  master = AC.createGain(); master.gain.value = S.muted ? 0 : .8; master.connect(AC.destination);
  const sr = AC.sampleRate, nb = AC.createBuffer(1, sr * 2, sr), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(); src.buffer = nb; src.loop = true; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
  const og = AC.createGain(); og.gain.value = .11; const lfo = AC.createOscillator(); lfo.frequency.value = .13; const lg = AC.createGain(); lg.gain.value = .06; lfo.connect(lg); lg.connect(og.gain);
  src.connect(lp); lp.connect(og); og.connect(master); src.start(); lfo.start();
  AC._noise = nb;
  for (const f of NOTES) {      // plucked string (Karplus-Strong), bright and short like a sanshin
    const N = Math.round(sr / f), len = Math.floor(sr * 1.3), b = AC.createBuffer(1, len, sr), d = b.getChannelData(0), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1; let k = 0;
    for (let i = 0; i < len; i++) { const nx = (k + 1) % N; d[i] = ring[k] * Math.min(1, i / 40) * Math.min(1, (len - i) / 2000); ring[k] = (ring[k] + ring[nx]) * .5 * .9965; k = nx; }
    plucks.push(b);
  }
  engineOsc = AC.createOscillator(); engineOsc.type = 'sawtooth'; const elp = AC.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 340;
  engineGain = AC.createGain(); engineGain.gain.value = 0; engineOsc.connect(elp); elp.connect(engineGain); engineGain.connect(master); engineOsc.start();
  setInterval(musicTick, 110);
}
function pluck(i, vol, when) { if (!AC) return; const s = AC.createBufferSource(); s.buffer = plucks[i]; const g = AC.createGain(); g.gain.value = vol == null ? .5 : vol; s.connect(g); g.connect(master); s.start(when || AC.currentTime); }
function ding(a, b) { if (!AC) return; const t = AC.currentTime; for (const [f, v] of [[a || 1320, .16], [b || 1980, .09]]) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0005, t + .5); o.connect(g); g.connect(master); o.start(t); o.stop(t + .55); } }
function splashSfx(v) { if (!AC) return; const s = AC.createBufferSource(); s.buffer = AC._noise; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; const g = AC.createGain(), t = AC.currentTime; g.gain.setValueAtTime(v || .25, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + .55); }
let nextBeat = 0, beatN = 0, melIdx = 2;
function musicTick() {
  if (!AC || !musicOn || S.muted || !started || modalOpen) { if (AC) nextBeat = AC.currentTime + .1; return; }
  while (nextBeat < AC.currentTime + .3) {
    const step = beatN % 16;
    if (step % 8 === 0) { const root = step === 0 ? 130.81 : 174.61, t = nextBeat; for (const m of [1, 1.5, 2.005]) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = root * m; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + .8); g.gain.linearRampToValueAtTime(0, t + 3.1); o.connect(g); g.connect(master); o.start(t); o.stop(t + 3.2); } }
    if (Math.random() < (step % 2 === 0 ? .62 : .25)) { melIdx = clamp(melIdx + Math.floor(Math.random() * 5) - 2, 0, 7); pluck(melIdx, .12 + Math.random() * .08, nextBeat); }
    nextBeat += .36; beatN++;
  }
}

/* ---------------- input ---------------- */
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys[e.code] = true;
  if (!started) return;
  if (e.code === 'Escape' && modalOpen) closeModal();
  if (modalOpen) return;
  if (e.code === 'KeyE') doAction(); if (e.code === 'KeyM') openMap(); if (e.code === 'KeyP') openPassport(); if (e.code === 'Space') { e.preventDefault(); jump(); }
  if (e.code === 'KeyB') toggleBike();
  if (e.code === 'Digit1') setCraft('jetski'); if (e.code === 'Digit2') setCraft('sabani'); if (e.code === 'Digit3') setCraft('sup');
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; inp.boost = false; });
(() => {
  const st = $('#stick'), kn = $('#knob'); let id = null;
  const mv = (e) => { const r = st.getBoundingClientRect(), R = r.width / 2 - 14; let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } inp.jx = dx / R; inp.jy = -dy / R; kn.style.transform = `translate(${dx}px,${dy}px)`; };
  st.addEventListener('pointerdown', (e) => { id = e.pointerId; st.setPointerCapture(id); mv(e); });
  st.addEventListener('pointermove', (e) => { if (e.pointerId === id) mv(e); });
  const up = (e) => { if (e.pointerId !== id) return; id = null; inp.jx = inp.jy = 0; kn.style.transform = ''; };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, m: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!drag || drag.id !== e.pointerId) return; drag.m += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y); cam.yaw += (e.clientX - drag.x) * .006; cam.pitch = clamp(cam.pitch + (e.clientY - drag.y) * .004, -.05, 1.1); drag.x = e.clientX; drag.y = e.clientY; cam.lastDrag = tNow; });
  const cu = (e) => { if (drag && drag.id === e.pointerId) { if (e.type === 'pointerup' && drag.m < 8 && started && !modalOpen && !chill) inspectAt(e.clientX, e.clientY); drag = null; } }; canvas.addEventListener('pointerup', cu); canvas.addEventListener('pointercancel', cu);
  canvas.addEventListener('wheel', (e) => { cam.dist = clamp(cam.dist + e.deltaY * .01, 5, 40); }, { passive: true });
  const bb = $('#bBoost'); bb.addEventListener('pointerdown', (e) => { inp.boost = true; bb.classList.add('on'); bb.setPointerCapture(e.pointerId); });
  for (const ev of ['pointerup', 'pointercancel']) bb.addEventListener(ev, () => { inp.boost = false; bb.classList.remove('on'); });
  $('#bJump').addEventListener('click', jump); $('#bBike').addEventListener('click', toggleBike);
  $('#style').addEventListener('click', () => { S.gba = !S.gba; applyStyle(); save(); }); $('#act').addEventListener('click', doAction);
  $('#bMap').addEventListener('click', openMap); $('#bBook').addEventListener('click', openPassport);
  $('#bSky').addEventListener('click', () => { moodAuto = false; moodT = (Math.floor(moodT) + 1) % 3; const m = MOODS[Math.floor(moodT)]; toast(m.name, m.jp); });
  $('#bSnd').addEventListener('click', () => { S.muted = !S.muted; if (master) master.gain.value = S.muted ? 0 : .8; $('#sndw').style.display = S.muted ? 'none' : ''; save(); });
  for (const b of document.querySelectorAll('[data-craft]')) b.addEventListener('click', () => setCraft(b.dataset.craft));
  for (const b of document.querySelectorAll('[data-e]')) b.addEventListener('click', () => sayEmote(+b.dataset.e));
  $('#close').addEventListener('click', closeModal); $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('#chill').addEventListener('click', () => { chill = false; $('#chill').hidden = true; $('#hud').hidden = false; });
})();
function setCraft(c, quiet) {
  P.craft = S.craft = c; for (const b of document.querySelectorAll('[data-craft]')) b.classList.toggle('sel', b.dataset.craft === c);
  if (started && !quiet) toast(CRAFT_INFO[c].label, c === 'sabani' ? 'A traditional Okinawan fishing canoe under sail.' : c === 'sup' ? 'Slow down. Listen to the lagoon.' : 'Hold Boost to fly across the bay.');
}
function toggleBike() { P.bike = S.bike = !P.bike; $('#bBike').classList.toggle('sel', P.bike); if (started) toast(P.bike ? 'Bicycle' : 'On foot', P.bike ? 'As fast on land as the jet ski on water.' : 'Bouncy walking.'); save(); }
function inspectAt(x, y) { const r = nahaPick(x, y); if (r) toast(r.title, r.text); }
function applyStyle() { document.body.classList.toggle('gba', S.gba !== false); $('#style').textContent = 'Menu style: ' + (S.gba !== false ? 'Pixel' : 'Aero'); }
function sayEmote(i) {
  P.emote = i; P.emoteT = Date.now(); if (myBubble) scene.remove(myBubble);
  myBubble = textSprite([EMOTES[i]], { w: 384, h: 110, stroke: '#ff4fa3' }); myBubbleT = 4; scene.add(myBubble); if (i === 0) learn('haisai'); if (i === 1) learn('maasan'); if (i === 2) learn('churasan'); pluck(5 - i, .3);
}
function jump() { if (!started || modalOpen || P.air || P.diving) return; P.air = true; P.vy = P.mode === 'sea' ? 7.5 + P.speed * .12 : 6; P.spin = P.mode === 'sea' && P.speed > 14 ? 1 : 0; if (P.mode === 'sea') { splash(P.x - OX, P.z - OZ, 10, 4); splashSfx(.18); } }

/* ---------------- player ---------------- */
function nearestPlace(onlyNew) { let best = null; for (const p of PLACES) { if (onlyNew && S.stamps[p.id]) continue; if (!best || p.dist < best.dist) best = p; } return best; }
function currentAction() {
  if (P.diving) return { label: 'Surface', fn: () => { P.diving = false; turtle.visible = false; splash(P.x - OX, P.z - OZ, 14, 3); splashSfx(.2); } };
  const p = nearestPlace(false); if (p && p.dist < 70) return { label: 'Visit ' + p.en, fn: () => openPlace(p) };
  if (P.mode === 'sea' && P.gh < -1.3 && P.speed < 6) return { label: 'Snorkel here', fn: startDive };
  return null;
}
function doAction() { if (!started || modalOpen) return; const a = currentAction(); if (a) a.fn(); }
let diveLog = 0;
function startDive() {
  P.diving = true; P.speed = 0; diveLog = 3; splash(P.x - OX, P.z - OZ, 16, 3); splashSfx(.25); learn('ino');
  if (Math.random() < .6) { turtle.visible = true; turtle.userData = { x: P.x + Math.sin(P.h) * 9, z: P.z - Math.cos(P.h) * 9, a: Math.random() * 6 }; }
}
function updatePlayer(dt) {
  let ix = inp.jx, iy = inp.jy;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
  if (modalOpen || chill) ix = iy = 0;
  const mag = Math.min(1, Math.hypot(ix, iy)), sea = P.mode === 'sea', ci = CRAFT_INFO[P.craft];
  const biking = !sea && P.bike && !chill;
  let maxS = P.diving ? 3.2 : sea ? ci.max : biking ? 26 : 7.5, turn = P.diving ? 5 : sea ? ci.turn : biking ? 3.4 : 10, acc = P.diving ? 6 : sea ? ci.acc : biking ? 16 : 30;
  const boosting = (inp.boost || keys.ShiftLeft || keys.ShiftRight) && mag > .1 && !P.diving;      // no cooldown
  if (boosting) maxS *= sea ? 1.6 : 1.7;
  if (P.buffT > 0) { P.buffT -= dt; maxS *= 1.15; } if (P.luckT > 0) P.luckT -= dt;
  if (mag > .05) {
    const want = cam.yaw + Math.atan2(ix, iy); let dh = want - P.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    const stepA = turn * dt * ((sea && !P.diving) || biking ? .35 + .65 * Math.min(1, P.speed / 6 + .3) : 1); P.h += clamp(dh, -stepA, stepA);
    P.lean = lerp(P.lean || 0, clamp(dh, -1, 1) * (sea || biking ? .35 : 0), dt * 5);
  } else P.lean = lerp(P.lean || 0, 0, dt * 5);
  P.speed += clamp(mag * maxS - P.speed, -acc * dt * 1.6, acc * dt);
  let nx = P.x + Math.sin(P.h) * P.speed * dt, nz = P.z - Math.cos(P.h) * P.speed * dt;
  nx = clamp(nx, -498000, 365000); nz = clamp(nz, -190000, 242000);
  let gh = heightAt(nx, nz);
  if (sea) {
    if (P.diving) { if (gh > -1.0) { nx = P.x; nz = P.z; gh = P.gh; P.speed = 0; } }
    else if (gh > .55) { P.mode = 'land'; if (!P.bike) P.speed = Math.min(P.speed, 5); splash(nx - OX, nz - OZ, 8, 3); }
  } else if (gh < -.5 && !P.air) { P.mode = 'sea'; splash(nx - OX, nz - OZ, 14, 4); splashSfx(.25); if (!S.launched) { S.launched = 1; toast('On the water', 'Hold Boost and look for glowing Ryukyu glass floats.'); } }
  P.x = nx; P.z = nz; P.gh = gh;
  const surf = waveH(P.x - OX, P.z - OZ, tNow);
  let base;
  if (P.diving) base = lerp(P.y, Math.max(gh + .9, -2.2), dt * 3);
  else if (P.mode === 'sea') base = Math.max(surf, gh + .12);
  else base = gh;
  if (P.air) { P.vy -= 20 * dt; P.jy += P.vy * dt; if (P.jy <= 0) { P.jy = 0; P.air = false; P.spin = 0; if (P.mode === 'sea') { splash(P.x - OX, P.z - OZ, 22, 6); splashSfx(.3); } } }
  P.y = base + P.jy;
  // wake
  if (P.mode === 'sea' && !P.diving && !P.air && P.speed > 5) {
    const n = P.speed > 18 ? 3 : 1, bx = P.x - Math.sin(P.h) * 1.6 - OX, bz = P.z + Math.cos(P.h) * 1.6 - OZ;
    for (let i = 0; i < n; i++) { const sd = (Math.random() - .5) * 2; emit(bx + Math.cos(P.h) * sd, .15, bz + Math.sin(P.h) * sd, -Math.sin(P.h) * P.speed * .25 + (Math.random() - .5) * 2, 1 + Math.random() * P.speed * .14, Math.cos(P.h) * P.speed * .25 + (Math.random() - .5) * 2, .5 + Math.random() * .8, .9); }
  }
  // pose
  me.position.set(P.x - OX, P.y, P.z - OZ); me.rotation.set(0, 0, 0);
  me.rotation.order = 'YXZ'; me.rotation.y = -P.h;
  if (P.mode === 'sea' && !P.diving) {
    const e = 1.2, rx = P.x - OX, rz = P.z - OZ, fwd = waveH(rx + Math.sin(P.h) * e, rz - Math.cos(P.h) * e, tNow) - waveH(rx - Math.sin(P.h) * e, rz + Math.cos(P.h) * e, tNow);
    me.rotation.x = clamp(fwd * .35 + (P.air ? P.vy * .03 : 0) + (boosting ? .08 : 0), -.5, .5); me.rotation.z = -(P.lean || 0);
    if (P.spin) me.rotation.y = -P.h + (1 - Math.max(0, P.vy + 7.5) / 15) * Math.PI * 2;
  }
  const onBike = P.mode === 'land' && P.bike && !chill; if (onBike) me.rotation.z = -(P.lean || 0);
  poseIslander(me, chill ? 'sit' : P.mode, P.craft, P.diving, tNow, P.speed, { dt, biking: onBike, air: P.air });
  if (engineGain) { const on = P.mode === 'sea' && P.craft === 'jetski' && !P.diving && !S.muted; engineGain.gain.value = lerp(engineGain.gain.value, on ? .012 + Math.min(.05, P.speed * .0018) : 0, .1); engineOsc.frequency.value = 46 + P.speed * 3.2; }
  // glass floats
  const now = performance.now();
  for (const ch of nearChunks.values()) for (const o of ch.orbs) {
    if (Math.abs(o.x - P.x) > 3.4 || Math.abs(o.z - P.z) > 3.4) continue; const t = collected.get(o.id); if (t && now - t < 240000) continue;
    collected.set(o.id, now); instDirty = true; const gain = P.luckT > 0 ? 2 : 1; S.glass += gain; ding(1180 + o.c * 140, 1770 + o.c * 210); splash(o.x - OX, o.z - OZ, 8, 3);
    if (S.glass === 5 || S.glass % 10 === 0) toast(S.glass + ' Ryukyu glass', 'Trade them for food at any island stall.');
  }
  // sea life
  if (P.diving) {
    diveLog -= dt;
    if (turtle.visible) { const u = turtle.userData; u.a += dt * .35; const tx = u.x + Math.cos(u.a) * 6, tz = u.z + Math.sin(u.a) * 6; turtle.position.set(tx - OX, Math.max(P.gh + 1, -2.4), tz - OZ); turtle.rotation.y = -u.a; if (Math.hypot(tx - P.x, tz - P.z) < 7 && !S.fish[5]) logFish(5); }
    if (diveLog <= 0 && schoolsNear > 0) { diveLog = 5; const reg = regionAt(P.x, P.z), cand = []; DATA.fish.forEach((f, i) => { if (i !== 5 && f[3].includes(reg)) cand.push(i); }); const fresh = cand.filter((i) => !S.fish[i]); if (fresh.length) logFish(fresh[Math.floor(Math.random() * fresh.length)]); }
  }
}
function logFish(i) { S.fish[i] = 1; const f = DATA.fish[i]; toast('Sea life: ' + f[0], f[1] + ' · ' + f[2]); ding(880, 1320); save(); }

function updateCamera(dt) {
  const moving = P.speed > 1.5;
  if (!started) { cam.yaw = P.h + Math.sin(tNow * .12) * .7; cam.pitch = .2; cam.dist = 13; }
  else if (chill) { cam.yaw = lerp(cam.yaw, -Math.PI / 2 + Math.sin(tNow * .1) * .25, dt); cam.pitch = lerp(cam.pitch, .08, dt); cam.dist = lerp(cam.dist, 7, dt); }
  else if (moving && tNow - cam.lastDrag > 2.2) { let d = P.h - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 1.6); }
  const dist = P.diving ? Math.min(cam.dist, 5.5) : cam.dist + (started ? P.speed * .13 : 0), pitch = P.diving ? Math.min(cam.pitch, .12) : cam.pitch;
  const tx = P.x - OX, ty = P.y + (P.diving ? .4 : 2.1), tz = P.z - OZ, cp = Math.cos(pitch);
  let cx = tx - Math.sin(cam.yaw) * dist * cp, cz = tz + Math.cos(cam.yaw) * dist * cp, cy = ty + dist * Math.sin(pitch) + .4;
  const g = heightAt(cx + OX, cz + OZ);
  if (P.diving) cy = Math.min(Math.max(cy, g + .5), -.45); else cy = Math.max(cy, Math.max(g, 0) + 1.1);
  camera.position.set(cx, cy, cz); camera.lookAt(tx, ty, tz);
  const want = 62 + clamp((P.speed - 22) * .7, 0, 14); if (Math.abs(camera.fov - want) > .1) { camera.fov = lerp(camera.fov, want, dt * 3); camera.updateProjectionMatrix(); }
}

/* ---------------- world placement ---------------- */
function rebase(x, z) {
  OX = Math.round(x / 4096) * 4096; OZ = Math.round(z / 4096) * 4096; clearChunks(); lastCK = ''; syncPlaces(); updateShore(x, z, true); shoreRectSync();
  planChunks(x, z); pumpChunks(1e9); rebuildInstances(); syncNaha();
  for (let i = 0; i < PN; i++) pLife[i] = 0;
}
function setPos(x, z) { P.x = x; P.z = z; P.speed = 0; P.diving = false; P.air = false; P.jy = 0; turtle.visible = false; const h = heightAt(x, z); P.gh = h; P.mode = h > .3 ? 'land' : 'sea'; P.y = Math.max(h, 0); rebase(x, z); }
function travelTo(x, z, label) {
  closeModal(); const f = $('#fade'); f.textContent = label; f.classList.add('on');
  setTimeout(() => { setPos(x, z); cam.yaw = P.h; save(); setTimeout(() => f.classList.remove('on'), 150); }, 520);
}

/* ---------------- modals ---------------- */
function openModal(node) { const b = $('#mBody'); b.textContent = ''; b.append(node); $('#modal').hidden = false; modalOpen = true; inp.boost = false; }
function closeModal() { $('#modal').hidden = true; modalOpen = false; }
const SEAL = { chatan: '北谷', naha: '波の上', kokusai: '国際通り', shuri: '首里城', zanpa: '残波岬', maeda: '青の洞窟', manzamo: '万座毛', nago: '名護湾', sesoko: '瀬底', churaumi: '美ら海', ie: '伊江島', kouri: '古宇利島', ogimi: '大宜味', hedo: '辺戸岬', katsuren: '勝連城', sefa: '斎場御嶽', peace: '平和祈念', itoman: '糸満', zamami: '座間味', tokashiki: '阿波連', kume: '久米島', miyako: '前浜', irabu: '伊良部', ishigaki: '石垣港', kabira: '川平湾', taketomi: '竹富島', iriomote: '西表島', hateruma: '波照間', yonaguni: '西崎' };
function seal(p, on) { return el('div', { class: 'seal' + (on ? '' : ' off') }, el('span', null, SEAL[p.id] || p.jp.slice(0, 4)), el('small', null, on ? 'RYUKYU WORLD' : '?')); }
function wordCard(id) { const w = DATA.words[id]; return el('div', { class: 'word' }, el('b', null, w[0] + '  ' + w[1]), w[2]); }
function openPlace(p) {
  const first = !S.stamps[p.id];
  if (first) { S.stamps[p.id] = Date.now(); ding(660, 990); pluck(0, .4); pluck(3, .4, AC ? AC.currentTime + .12 : 0); pluck(5, .4, AC ? AC.currentTime + .24 : 0); }
  S.words[p.word] = 1; save();
  const acts = el('div', { class: 'acts' });
  if (p.food) {
    const f = DATA.foods[p.food], price = 2;
    const btn = el('button', { class: 'act', on: { click: () => {
      if (S.glass < price) { info.textContent = 'You need ' + price + ' Ryukyu glass. They float on the lagoon just offshore: ride through them.'; return; }
      S.glass -= price; S.foods[p.food] = 1; P.buffT = 150; S.words.kwatchi = 1; S.words.nuchigusui = 1; save();
      info.textContent = ''; info.append(el('b', null, 'Kwatchī sabira! '), f[3] + ' You ride 15% faster for a while.'); ding(990, 1485); btn.disabled = true;
    } } }, el('span', { class: 'ic' }, f[0]), el('span', null, el('b', null, 'Eat ' + f[1] + ' ' + f[2]), el('small', null, price + ' Ryukyu glass · you have ' + S.glass)));
    acts.append(btn);
  }
  if (p.sanshin) acts.append(el('button', { class: 'act', on: { click: openSanshin } }, el('span', { class: 'ic' }, '🪕'), el('span', null, el('b', null, 'Play the sanshin 三線'), el('small', null, 'Someone left one on the bench.'))));
  if (!p.quiet) acts.append(el('button', { class: 'act', on: { click: (e) => { P.luckT = 150; info.textContent = 'The shisa pair guards the island: one mouth open to scare off bad spirits, one closed to keep the good in. Glass floats count double for a while.'; ding(784, 1175); e.currentTarget.disabled = true; } } }, el('span', { class: 'ic' }, '🦁'), el('span', null, el('b', null, 'Pat the shisa シーサー'), el('small', null, 'For a little luck.'))));
  acts.append(el('button', { class: 'act', on: { click: () => { closeModal(); chill = true; $('#hud').hidden = true; $('#chill').hidden = false; S.words.yuntaku = 1; } } }, el('span', { class: 'ic' }, '🌅'), el('span', null, el('b', null, p.quiet ? 'Sit quietly' : 'Sit and watch the sea'), el('small', null, 'No goals. Just the west sky.'))));
  const info = el('p', { 'aria-live': 'polite' });
  openModal(el('div', null,
    el('div', { class: 'head' }, seal(p, true), el('div', null, el('h2', { id: 'mTitle' }, p.en, el('small', null, p.jp)), first ? el('small', { style: 'color:#d8322a;font-weight:800' }, 'Stamp collected · ' + Object.keys(S.stamps).length + ' of ' + PLACES.length) : null)),
    el('p', null, p.note), acts, info, wordCard(p.word)));
}
function openSanshin() {
  let played = 0; const msg = el('p', null, 'Three strings, a snakeskin body, and the Ryukyu scale: C E F G B. Tap the pads. The characters are kunkunshi, the old sanshin notation.');
  const pads = el('div', { class: 'pads' });
  NOTES.forEach((f, i) => pads.append(el('button', { class: 'pad', on: { pointerdown: (e) => { pluck(i, .6); played++; e.currentTarget.classList.add('hit'); const b = e.currentTarget; setTimeout(() => b.classList.remove('hit'), 120); if (played === 12) { msg.textContent = 'That is a song. When the tempo rises, everyone stands up for kachāshī.'; S.words.kachashi = 1; S.sanshin = 1; save(); } } } }, KUNKUNSHI[i], el('small', null, SOLFA[i] + (i > 4 ? '′' : '')))));
  openModal(el('div', null, el('h2', { id: 'mTitle' }, 'Sanshin', el('small', null, '三線')), msg, pads));
}
function openPassport(tab) {
  tab = typeof tab === 'number' ? tab : 0; const body = el('div');
  const names = ['Stamps ' + Object.keys(S.stamps).length + '/' + PLACES.length, 'Food ' + Object.keys(S.foods).length + '/' + Object.keys(DATA.foods).length, 'Words ' + Object.keys(S.words).length + '/' + Object.keys(DATA.words).length, 'Sea life ' + Object.keys(S.fish).length + '/' + DATA.fish.length];
  const tabs = el('div', { class: 'tabs', role: 'tablist' }); names.forEach((n, i) => tabs.append(el('button', { role: 'tab', 'aria-selected': String(i === tab), on: { click: () => openPassport(i) } }, n)));
  if (tab === 0) { const g = el('div', { class: 'grid' }); for (const p of PLACES) g.append(el('div', { style: 'text-align:center;font-size:11px' }, seal(p, !!S.stamps[p.id]), el('div', { style: 'margin-top:4px' }, S.stamps[p.id] ? p.en : DATA.regions[p.region].name))); body.append(g); }
  if (tab === 1) { const l = el('div', { class: 'list' }); for (const k in DATA.foods) { const f = DATA.foods[k], on = S.foods[k]; l.append(el('div', { class: 'item' + (on ? '' : ' off') }, el('span', { class: 'ic' }, on ? f[0] : '🍽'), el('span', null, el('b', null, on ? f[1] + ' ' + f[2] : 'Not tasted yet'), on ? el('div', null, f[3]) : null))); } body.append(l); }
  if (tab === 2) { const l = el('div', { class: 'list' }); for (const k in DATA.words) { const w = DATA.words[k], on = S.words[k]; l.append(el('div', { class: 'item' + (on ? '' : ' off') }, el('span', null, el('b', null, on ? w[0] + '  ' + w[1] : '· · ·'), on ? el('div', null, w[2]) : null))); } body.append(l); }
  if (tab === 3) { const l = el('div', { class: 'list' }); DATA.fish.forEach((f, i) => { const on = S.fish[i]; l.append(el('div', { class: 'item' + (on ? '' : ' off') }, el('span', { class: 'ic' }, on ? (i === 5 ? '🐢' : i === 7 ? '🐍' : '🐠') : '🌊'), el('span', null, el('b', null, on ? f[0] + ' ' + f[1] : 'Not met yet'), on ? el('div', null, f[2]) : el('div', null, 'Stop over a reef and snorkel.')))); }); body.append(l); }
  openModal(el('div', null, el('h2', { id: 'mTitle' }, nickOf(S.name) + '’s passport', el('small', null, '島のパスポート')), tabs, body));
}
function openMap(region, sel) {
  region = typeof region === 'number' ? region : regionAt(P.x, P.z); const R = DATA.regions[region], b = R.b, bw = b[2] - b[0], bh = b[3] - b[1];
  const tabs = el('div', { class: 'tabs', role: 'tablist' }); DATA.regions.forEach((r, i) => tabs.append(el('button', { role: 'tab', 'aria-selected': String(i === region), on: { click: () => openMap(i) } }, r.name)));
  const W = 1040, H = Math.round(W * bh / bw), cv = el('canvas', { id: 'map', width: W, height: H }), c = cv.getContext('2d'), sc = W / bw;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2aa6ff'); g.addColorStop(1, '#0a63cf'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (const pass of [0, 1]) {
    c.beginPath();
    for (const r of coarseRings) { if (r.bb[2] < b[0] || r.bb[0] > b[2] || r.bb[3] < b[1] || r.bb[1] > b[3]) continue; for (let i = 0; i < r.n; i++) { const x = (r.xs[i] - b[0]) * sc, y = (r.zs[i] - b[1]) * sc; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); }
    if (pass === 0) { c.lineWidth = 14; c.strokeStyle = 'rgba(110,245,225,.55)'; c.lineJoin = 'round'; c.stroke(); } else { c.fillStyle = '#8fe01f'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff6d8'; c.stroke(); }
  }
  const wrap = el('div', { id: 'mapwrap' }, cv), detail = el('div', { class: 'acts' });
  const pos = (x, z) => `left:${((x - b[0]) / bw * 100).toFixed(2)}%;top:${((z - b[1]) / bh * 100).toFixed(2)}%`;
  const inB = (x, z) => x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3];
  const show = (p) => { detail.textContent = ''; for (const d of wrap.querySelectorAll('.dot')) d.classList.toggle('sel', d.dataset.id === p.id);
    detail.append(el('div', { class: 'item' }, el('span', null, el('b', null, p.en + ' ' + p.jp), el('div', null, (S.stamps[p.id] ? 'Stamped. ' : 'Not visited yet. ') + fmtDist(Math.hypot(p.x - P.x, p.z - P.z)) + ' from you at true scale.'))),
      el('button', { class: 'act', on: { click: () => travelTo(p.x, p.z, 'Sailing to ' + p.en + '…') } }, el('span', { class: 'ic' }, '⛴'), el('span', null, el('b', null, 'Take the ferry here'), el('small', null, 'Or ride there yourself. It is a real distance.')))); };
  let n = 0; const list = el('div', { class: 'tabs' });
  for (const p of PLACES) { if (p.region !== region) continue; n++; const num = String(n);
    wrap.append(el('button', { class: 'dot' + (S.stamps[p.id] ? ' seen' : ''), style: pos(p.x, p.z), 'data-id': p.id, 'aria-label': p.en, on: { click: () => show(p) } }, num));
    list.append(el('button', { on: { click: () => show(p) } }, num + ' ' + p.en)); }
  if (inB(P.x, P.z)) wrap.append(el('div', { class: 'dot peer', style: pos(P.x, P.z) + ';background:#fff', title: 'You' }));
  for (const r of remotes.values()) if (inB(r.x, r.z)) wrap.append(el('button', { class: 'dot peer', style: pos(r.x, r.z), 'aria-label': r.name, title: r.name, on: { click: () => { detail.textContent = ''; detail.append(el('button', { class: 'act', on: { click: () => travelTo(r.x + 6, r.z + 6, 'Going to say haisai…') } }, el('span', { class: 'ic' }, '👋'), el('span', null, el('b', null, 'Join ' + r.name), el('small', null, 'Ichariba chōdē: once we meet, we are family.')))); } } }));
  openModal(el('div', null, el('h2', { id: 'mTitle' }, R.name, el('small', null, R.jp + ' · ' + Math.round(bw / 1000) + ' km across')), tabs, wrap, list, detail));
  if (sel) show(sel);
}

/* ---------------- HUD ---------------- */
let hudT = 0, curMuni = '';
const mini = $('#mini'), mc = mini.getContext('2d');
function updateHud(dt) {
  hudT -= dt; const a = currentAction(), ab = $('#act'); ab.hidden = !a; if (a && ab.textContent !== a.label) ab.textContent = a.label;
  if (hudT > 0) return; hudT = .25;
  let code = ''; for (const r of muniRings) { if (P.x < r.bb[0] || P.x > r.bb[2] || P.z < r.bb[1] || P.z > r.bb[3]) continue; if (inRing(r, P.x, P.z)) { code = r.code; break; } }
  const ll = xz2ll(P.x, P.z), loc = $('#loc'), m = DATA.muni[code];
  loc.firstChild.textContent = m ? m[1] + ' ' + m[0] : 'On the water 海上'; loc.lastChild.textContent = ll[1].toFixed(4) + '°N  ' + ll[0].toFixed(4) + '°E';
  if (code !== curMuni) { curMuni = code; }
  const tp = nearestPlace(true) || nearestPlace(false), tg = $('#target');
  if (tp) { const br = Math.atan2(tp.x - P.x, -(tp.z - P.z)) - cam.yaw; tg.firstChild.style.transform = `rotate(${br}rad)`; tg.lastChild.textContent = tp.en + ' · ' + fmtDist(tp.dist); }
  $('#glass').textContent = S.glass;
  $('#buff').textContent = (P.buffT > 0 ? 'Māsan boost ' : '') + (P.luckT > 0 ? 'Shisa luck ×2' : '');
  $('#online').textContent = ROOM ? (onlineN > 1 ? onlineN + ' islanders online' : 'Online · just you so far') : 'Solo session';
  // minimap, north up, 3.5 km radius
  const S2 = 208, R = 3500, k = S2 / 2 / R; mc.fillStyle = '#1b8fee'; mc.fillRect(0, 0, S2, S2); mc.beginPath();
  for (const r of coastRings) { if (r.bb[2] < P.x - R || r.bb[0] > P.x + R || r.bb[3] < P.z - R || r.bb[1] > P.z + R) continue; for (let i = 0; i < r.n; i++) { const x = (r.xs[i] - P.x) * k + S2 / 2, y = (r.zs[i] - P.z) * k + S2 / 2; if (i) mc.lineTo(x, y); else mc.moveTo(x, y); } mc.closePath(); }
  mc.lineWidth = 9; mc.strokeStyle = 'rgba(110,245,225,.6)'; mc.lineJoin = 'round'; mc.stroke(); mc.fillStyle = '#8fe01f'; mc.fill(); mc.lineWidth = 1.5; mc.strokeStyle = '#fff6d8'; mc.stroke();
  for (const p of PLACES) { if (p.dist > R) continue; mc.beginPath(); mc.arc((p.x - P.x) * k + S2 / 2, (p.z - P.z) * k + S2 / 2, 6, 0, 6.3); mc.fillStyle = S.stamps[p.id] ? '#19c8ff' : '#ff4fa3'; mc.fill(); mc.lineWidth = 2; mc.strokeStyle = '#fff'; mc.stroke(); }
  for (const r of remotes.values()) { const dx = r.x - P.x, dz = r.z - P.z; if (Math.abs(dx) > R || Math.abs(dz) > R) continue; mc.beginPath(); mc.arc(dx * k + S2 / 2, dz * k + S2 / 2, 5, 0, 6.3); mc.fillStyle = '#eaff7a'; mc.fill(); mc.strokeStyle = '#2c9a14'; mc.stroke(); }
  mc.save(); mc.translate(S2 / 2, S2 / 2); mc.rotate(P.h); mc.beginPath(); mc.moveTo(0, -11); mc.lineTo(7, 8); mc.lineTo(0, 4); mc.lineTo(-7, 8); mc.closePath(); mc.fillStyle = '#fff'; mc.fill(); mc.lineWidth = 2; mc.strokeStyle = '#0a56d8'; mc.stroke(); mc.restore();
}

/* ---------------- online presence ---------------- */
let lastSent = '';
function readPeer(pr) {
  const s = pr.presence || {}, num = (v) => typeof v === 'number' && isFinite(v); if (!num(s.x) || !num(s.z)) return null;
  const n = Array.isArray(s.n) ? [s.n[0] | 0, s.n[1] | 0] : [0, 0], c = num(s.c) ? clamp(Math.round(s.c), 0, 7) : 0;
  return { x: clamp(s.x, -6e5, 6e5), z: clamp(s.z, -6e5, 6e5), y: num(s.y) ? clamp(s.y, -10, 600) : 0, h: num(s.h) ? s.h : 0, m: num(s.m) ? clamp(Math.round(s.m), 0, 4) : 0, d: s.d ? 1 : 0, n, c, e: num(s.e) ? clamp(Math.round(s.e), 0, 2) : 0, et: num(s.et) ? s.et : 0, nk: n.join('_') + '_' + c };
}
async function initRoom() {
  let room = null; try { room = window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { room = null; }
  if (!room) return; ROOM = room;
  try {
    room.onPeers((ch) => {
      const seen = new Set(); let n = 0;
      for (const pr of ch.peers) { if (pr.kind !== 'viewer') continue; n++; if (pr.isMe && pr.sameTab) continue; const s = readPeer(pr); if (!s) continue; seen.add(pr.peer); upsertRemote(pr.peer, s); }
      for (const id of [...remotes.keys()]) if (!seen.has(id)) dropRemote(id);
      if (n > onlineN && started && n > 1) toast('Mensōre!', 'Another islander arrived.'); onlineN = n;
    }, () => { ROOM = null; for (const id of [...remotes.keys()]) dropRemote(id); });
  } catch (e) { ROOM = null; return; }
  setInterval(() => {
    if (!ROOM || !started) return;
    const st = { x: Math.round(P.x * 10) / 10, z: Math.round(P.z * 10) / 10, y: Math.round(P.y * 10) / 10, h: Math.round(P.h * 100) / 100, m: P.mode === 'land' ? (P.bike ? 4 : 0) : CRAFTS.indexOf(P.craft) + 1, d: P.diving ? 1 : 0, n: S.name, c: S.color, e: P.emote, et: P.emoteT };
    const js = JSON.stringify(st); if (js === lastSent) return; lastSent = js; ROOM.presence(st).catch(() => {});
  }, 150);
}

/* ---------------- title + boot ---------------- */
function refreshTitle() {
  $('#nick').textContent = nickOf(S.name); const sw = $('#swatches'); sw.textContent = '';
  DATA.shirts.forEach((c, i) => sw.append(el('button', { style: 'background:#' + c.toString(16).padStart(6, '0'), 'aria-label': 'Shirt colour ' + (i + 1), 'aria-pressed': String(i === S.color), on: { click: () => { S.color = i; rebuildMe(); refreshTitle(); } } })));
}
function rebuildMe() { if (me) scene.remove(me); me = makeIslander(S.color); me.position.set(P.x - OX, P.y, P.z - OZ); me.rotation.order = 'YXZ'; me.rotation.y = -P.h; poseIslander(me, P.mode, P.craft, false, 0, 0); }
$('#reroll').addEventListener('click', () => { S.name = [Math.floor(Math.random() * 12), Math.floor(Math.random() * 12)]; refreshTitle(); });
$('#go').addEventListener('click', () => {
  initAudio(); started = true; $('#title').hidden = true; $('#hud').hidden = false; cam.dist = 9; cam.pitch = .2; cam.lastDrag = -10; save();
  $('#sndw').style.display = S.muted ? 'none' : ''; setCraft(P.craft, true);
  toast('Haisai, ' + nickOf(S.name) + '!', 'Pink crystals mark places to visit. In Naha, tap a building to read about it.'); learn('mensore');
});

let lastFrame = performance.now(), frameCount = 0, fpsT = 0, fpsN = 0, pxr = renderer.getPixelRatio();
const PXR_MAX = pxr;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now; tNow += dt; U.uTime.value = tNow; frameCount++;
  if (moodAuto) moodT = (moodT + dt / 170) % 3;
  fpsT += (now - (frame.prev || now)) / 1000; frame.prev = now; fpsN++;
  if (fpsT > 2.5) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (started && !document.hidden) { if (fps < 27 && pxr > .7) { pxr = Math.max(.7, pxr * .85); renderer.setPixelRatio(pxr); resize(); } else if (fps > 56 && pxr < PXR_MAX) { pxr = Math.min(PXR_MAX, pxr * 1.1); renderer.setPixelRatio(pxr); resize(); } } }
  if (started) updatePlayer(dt); else { me.position.set(P.x - OX, P.y, P.z - OZ); }
  if (Math.abs(P.x - OX) > 9000 || Math.abs(P.z - OZ) > 9000) rebase(P.x, P.z);
  planChunks(P.x, P.z); pumpChunks(MOBILE ? 5 : 7); if (instDirty) rebuildInstances();
  updateNaha(P.x, P.z, 1);
  updateShore(P.x, P.z, false); shoreRectSync();
  updateCamera(dt);
  const under = camera.position.y < waveH(camera.position.x, camera.position.z, tNow) - .05 && P.diving;
  applyMood(under);
  U.uRing.value.x = P.x - OX; U.uRing.value.y = P.z - OZ;
  water.position.set(P.x - OX, 0, P.z - OZ); deepPlane.position.x = P.x - OX; deepPlane.position.z = P.z - OZ; sky.position.copy(camera.position);
  updatePlaces(tNow, P.x, P.z, S.stamps); updateFish(tNow, P.x, P.z); updateRemotes(dt, tNow); updateParticles(dt);
  if (myBubble) { myBubbleT -= dt; myBubble.position.set(P.x - OX, P.y + 3.6, P.z - OZ); myBubble.scale.set(3.2, .92, 1); if (myBubbleT <= 0) { scene.remove(myBubble); myBubble = null; } }
  if (started && !chill) updateHud(dt);
  renderer.render(scene, camera);
}
async function boot(data) {
  if (data && data.stamps) Object.assign(S, data);
  refreshTitle(); applyStyle(); P.bike = S.bike !== false; $('#bBike').classList.toggle('sel', P.bike);
  try { await loadWorld(); } catch (e) { $('#go').textContent = 'Could not load the islands. Reload to retry.'; return; }
  await loadNaha();
  initPlaces();
  const start = PLACES.find((p) => p.id === 'chatan') || PLACES[0];
  const sp = Array.isArray(S.pos) && isFinite(S.pos[0]) && isFinite(S.pos[1]) ? S.pos : [start.x, start.z];
  P.craft = CRAFT_INFO[S.craft] ? S.craft : 'jetski'; me = makeIslander(S.color); me.rotation.order = 'YXZ';
  setPos(sp[0], sp[1]); P.h = Math.atan2(start.cx - start.x, -(start.cz - start.z)); cam.yaw = P.h + 2.4; rebuildMe();
  applyMood(false); requestAnimationFrame(frame);
  const go = $('#go'); go.disabled = false; go.textContent = 'Haisai! Dive in';
  initRoom(); setInterval(() => { if (started) save(); }, 6000);
  window.__rw = { P, S, cam, renderer, NAHA, nahaReady, nahaPick, toggleBike, INST, startDive, setMood: (m) => { moodAuto = false; moodT = m; }, travelTo, setPos, openPlace, openMap, openPassport, PLACES, get frames() { return frameCount; } };
}
const HOT = window.claude && window.claude.hot;
if (HOT && HOT.snapshot) HOT.snapshot(() => JSON.parse(JSON.stringify(S)));
if (HOT && HOT.ready) HOT.ready(boot); else boot((HOT && HOT.data) || {});
