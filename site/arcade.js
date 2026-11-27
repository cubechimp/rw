/* Ryukyu World: game centres. The real ones on the map can be walked into: a gachapon wall and a claw game you play for prizes. */
'use strict';
const ARCADES = [[-363663,207487,"ユーグレナモール"],[-248991,160406,"ジョイジャングル宮古南"],[-248986,160359,"ジョイジャングル 宮古南店"],[-9821,10320,"namcoイーアス沖縄豊崎店"],[-8383,5887,"モーリーファンタジー那覇店"],[-7766,12286,"モーリーファンタジー糸満店"],[-6763,3953,"GiGO 那覇国際通り"],[-6542,2989,"ジャンボ ポートアイランド店 (旧・サンシャイン ポート"],[-6176,6683,"namcoイオンとよみショッピングセンター店"],[-6116,4162,"ゲームインナハ2"],[-5529,2705,"Namco Naha Main Place"],[-5028,-1532,"namcoサンエー浦添西海岸パルコシティ店"],[-5016,-1555,"namco"],[-3701,-1286,"Jumbo G1"],[-3272,-1889,"Faraoh Slots & Pachinko"],[-3034,2833,"Amuse Joy Box"],[-3001,3355,"ラウンドワン南風原店"],[-2889,6092,"ラウンドワン南風原"],[-2723,1379,"あそびパーク サンエー経塚シティ店"],[-1381,5146,"アミュージアム南風原店"],[-572,-11422,"naval kadena joy jungle"],[-407,-13193,"Namco Arcade"],[-393,-13109,"namcoイオンタウン読谷SC店"],[549,-7433,"クラブセガ北谷"],[4401,-8678,"アミューズメント・ガリバー"],[5962,-8204,"コザスポーツレジャーランド"],[7779,-14969,"ナムコプリッズ沖縄"],[9482,-9891,"namcoイオン具志川店"],[16604,-22674,"ニュー沖縄"],[23401,-40014,"モーリーファンタジー"]];      // [east, south, name] of every game centre in the open map data
function nearestArcade() { let best = null, bd = 1e12; for (const a of ARCADES) { const d = Math.hypot(a[0] - P.x, a[1] - P.z); if (d < bd) { bd = d; best = a; } } return best ? { x: best[0], z: best[1], name: best[2], dist: bd } : null; }

/* ---------- the room ---------- */
function arcadeRoomGeo(seed) {
  const C = SHOP.arcade, ps = [], blocks = [], dark = 0x24304a, r = (k) => hash(seed % 9973, k, 78), PAL = [0xff4fa3, 0x19c8ff, 0xffe14a, 0x8fe01f, 0xb07cff, 0xff7a59];
  const B = (w, h, d, c, p, o) => ps.push(part(gBox(w, h, d), c, Object.assign({ p }, o || {}))), Sp = (rad, c, p, o) => ps.push(part(gSph(rad, 8, 6), c, Object.assign({ p }, o || {})));
  B(8.4, .3, 6.8, C.floor, [0, -.15, 0], { glow: .1 });
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) B(1, .02, 1, C.floor2, [-3.5 + i, .01, -2.5 + j], { glow: .14 }); else if (r(i * 9 + j) > .8) B(.3, .025, .3, PAL[(i + j) % 6], [-3.5 + i, .012, -2.5 + j], { glow: 1 });
  B(8.8, 3.6, .2, C.in, [0, 1.8, -3.3], { glow: .2 }); B(.2, 3.6, 6.8, C.in, [-4.3, 1.8, 0], { glow: .2 }); B(.2, 3.6, 6.8, C.in, [4.3, 1.8, 0], { glow: .2 });
  B(8.4, .12, .06, C.trim, [0, 1.0, -3.18], { glow: 1 }); B(.06, .12, 6.6, C.a, [-4.18, 1.0, 0], { glow: 1 }); B(.06, .12, 6.6, C.a, [4.18, 1.0, 0], { glow: 1 }); B(8.8, .34, .2, dark, [0, -.17, 3.4]);
  // two claw machines at the back on the left
  for (const [x, c] of [[-3.0, 0xff4fa3], [-1.5, 0x19c8ff]]) {
    const z = -2.3; B(1.3, .9, 1.2, c, [x, .45, z], { glow: .25 }); B(1.3, .1, .34, dark, [x, .95, z + .72]); ps.push(part(gCyl(.03, .03, .2, 6), 0xdfe5ea, { p: [x - .3, 1.1, z + .72] })); Sp(.07, 0xe8452c, [x - .3, 1.22, z + .72], { glow: .5 }); ps.push(part(gCyl(.08, .08, .05, 10), 0xffe14a, { p: [x + .3, 1.02, z + .72], glow: 1 }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.07, 1.3, .07, 0xffffff, [x + sx * .61, 1.55, z + sz * .56], { glow: .3 });
    B(1.3, .42, 1.2, c, [x, 2.41, z], { glow: .45 }); B(1.1, .22, .05, 0xffe14a, [x, 2.42, z + .61], { glow: 1.2 }); B(1.2, .03, 1.1, 0xfff6e6, [x, .92, z], { glow: .3 });
    for (let i = 0; i < 7; i++) Sp(.16 + r(i + x * 3) * .05, PAL[Math.floor(r(i * 5 + x) * 6)], [x - .42 + r(i * 3 + 1) * .84, 1.08 + (i > 4 ? .2 : 0), z - .38 + r(i * 7 + 2) * .76], { glow: .25 });
    ps.push(part(gCyl(.015, .015, .5, 5), 0xdfe5ea, { p: [x + .1, 1.96, z] })); Sp(.07, 0xdfe5ea, [x + .1, 1.7, z]); for (const a of [-1, 1]) B(.03, .16, .03, 0xdfe5ea, [x + .1 + a * .07, 1.6, z], { r: [0, 0, a * .4] });
  }
  blocks.push([-3.75, -2.95, -.8, -1.5]);
  // a wall of gachapon machines at the back on the right
  B(3.3, .2, .5, dark, [2.15, .1, -2.86]);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = .9 + i * .62, y = .2 + row * .66, z = -2.86, c = PAL[(i + row * 2) % 6];
    B(.54, .3, .44, c, [x, y + .15, z], { glow: .25 }); B(.5, .34, .4, 0xdff4ff, [x, y + .47, z], { glow: .55 }); ps.push(part(gCyl(.07, .07, .05, 10), 0xffffff, { p: [x, y + .16, z + .23], r: [Math.PI / 2, 0, 0], glow: .5 })); B(.14, .07, .03, dark, [x - .14, y + .07, z + .225]);
    for (let k = 0; k < 4; k++) Sp(.07, PAL[(i + k * 2 + row) % 6], [x - .15 + (k % 2) * .3 + r(i + k) * .04, y + .4 + Math.floor(k / 2) * .13, z + .17], { glow: .5 });
  }
  blocks.push([.45, -2.95, 3.75, -2.45]);
  // a drum game against the right wall
  B(.9, 1.9, 1.3, 0xe8452c, [3.3, .95, .6], { glow: .2 }); B(.05, .7, 1.0, 0x7fe9ff, [2.83, 1.45, .6], { glow: 1.1 }); B(.9, .3, 1.3, 0xffe14a, [3.3, 2.05, .6], { glow: .9 });
  for (const z of [.25, .95]) { ps.push(part(gCyl(.26, .26, .3, 12), 0x8a3a1c, { p: [2.55, .8, z], r: [0, 0, .5] }), part(gCyl(.24, .24, .31, 12), 0xfff6e0, { p: [2.55, .8, z], r: [0, 0, .5], glow: .3 })); B(.1, .7, .1, dark, [2.6, .35, z]); }
  blocks.push([2.2, -.1, 3.75, 1.3]);
  // the prize counter by the door, with plush toys on the shelves behind it
  B(1.5, 1.0, .7, 0xffffff, [-3.0, .5, 1.6], { glow: .25 }); B(1.6, .08, .8, C.b, [-3.0, 1.04, 1.6], { glow: .5 }); blocks.push([-3.75, 1.05, -2.1, 2.15]);
  for (const y of [1.7, 2.35]) { B(.34, .06, 2.4, 0xffffff, [-4.02, y, 1.3], { glow: .3 }); for (let i = 0; i < 5; i++) { const c = [0x3f78c8, 0x2f9a4a, 0xd8552b, 0x4b4a3c, 0xff9fc2][(i + (y > 2 ? 2 : 0)) % 5]; Sp(.17, c, [-4.0, y + .2, .35 + i * .48], { s: [.8, .9, 1.1], glow: .15 }); Sp(.03, 0xffffff, [-3.87, y + .25, .35 + i * .48 - .08], { glow: .6 }); } }
  // posters, neon and lamps
  for (let i = 0; i < 2; i++) B(1.2, .62, .05, [0xff4fa3, 0x19c8ff][i], [-3.0 + i * 1.5, 3.12, -3.17], { glow: .9 });
  for (let i = 0; i < 4; i++) { const x = -3 + i * 2; B(1.4, .06, .14, PAL[i], [x, 3.5, i % 2 ? .6 : -.9], { glow: 1.3 }); }
  for (const s of [-1, 1]) ps.push(part(shisaGeo(), 0xff4fa3, { p: [s * 1.55, 0, 2.95], s: [.55, .55, .55], r: [0, s > 0 ? -.5 : .5, 0], glow: .5 }));
  B(1.9, .03, 1.0, C.a, [0, .02, 2.8], { glow: .6 }); B(1.5, .035, .12, 0xffffff, [0, .03, 3.1], { glow: .9 });
  B(2.2, .1, .1, dark, [2.3, 2.72, -3.17]); B(2.2, .1, .1, dark, [2.3, 1.56, -3.17]); B(.1, 1.26, .1, dark, [1.2, 2.14, -3.17]); B(.1, 1.26, .1, dark, [3.4, 2.14, -3.17]);
  return { geo: merge(ps), blocks };
}
function arcadeSpot(x, z) {      // what you can do from where you stand
  if (x < -.4 && z < -.7) return { label: 'Play the claw game', fn: openClaw };
  if (x > .1 && z < -1.5) return { label: 'Turn the gachapon', fn: openGacha };
  return null;
}
function arcadeHead(ic, tag, title, sub) { return el('div', { class: 'head' }, el('div', { class: 'seal' }, el('span', null, ic), el('small', null, tag)), el('div', null, el('h2', { id: 'mTitle' }, title, el('small', null, sub)))); }
function prizeLine(id) {      // put a prize in the bag and say what happened
  const it = ITEMS[id];
  if (bagGive(id)) return [it.ic, it.name + ' ' + it.jp, it.note + ' It is in your bag.'];
  bagGive('kokuto', 1); return [it.ic, it.name + ' ' + it.jp, 'You already have one, so the attendant swaps it for a piece of kokutō brown-sugar candy. It is in your bag.'];
}

/* ---------- gachapon: pay, turn the handle three times, open the capsule ---------- */
function openGacha() {
  const PRICE = 2, POOL = Object.keys(ITEMS).filter((id) => ITEMS[id].from === 'gacha'), COL = ['#ff4fa3', '#19c8ff', '#ffe14a', '#8fe01f', '#b07cff', '#ff7a59'];
  const dome = el('div', { class: 'dome' }), knob = el('button', { class: 'knob', 'aria-label': 'Turn the handle' }), mach = el('div', { class: 'gacha' }, dome, el('div', { class: 'box' }), el('div', { class: 'slot' }), knob);
  const info = el('p', { 'aria-live': 'polite' }), out = el('div'); let turns = 0, paid = false, busy = false, cap = null;
  for (let i = 0; i < 11; i++) { const c = el('i'); c.style.cssText = `left:${6 + (i % 4) * 36 + (i > 7 ? 18 : 0)}px;top:${104 - Math.floor(i / 4) * 34}px;--c:${COL[i % 6]}`; dome.append(c); }
  const say = () => { info.textContent = paid ? ['', 'Clunk. Two more turns.', 'Clunk, clunk. One more.'][turns] || '' : 'One capsule costs ' + PRICE + ' Ryukyu glass. You have ' + S.glass + '. Turn the handle to pay and start.'; };
  knob.addEventListener('click', () => {
    if (busy) return;
    if (!paid) { if (S.glass < PRICE) { info.textContent = 'You need ' + PRICE + ' Ryukyu glass. They float on the lagoon just offshore: ride through them.'; return; } S.glass -= PRICE; paid = true; out.textContent = ''; if (cap) { cap.remove(); cap = null; } save(); }
    turns++; knob.style.transform = 'rotate(' + turns * 120 + 'deg)'; drumSfx(0, 140); say();
    if (turns < 3) return; busy = true;
    setTimeout(() => {      // the capsule rolls out
      const pool = []; for (const id of POOL) for (let k = 0; k < (S.own[id] ? 1 : 3); k++) pool.push(id); const id = pool[Math.floor(Math.random() * pool.length)];
      cap = el('div', { class: 'cap' }); cap.style.setProperty('--c', COL[Math.floor(Math.random() * 6)]); mach.append(cap); drumSfx(0, 260); info.textContent = 'A capsule! Opening it…';
      setTimeout(() => { const p = prizeLine(id); out.textContent = ''; out.append(el('div', { class: 'prize' }, p[0]), el('p', null, el('b', null, p[1] + '. '), p[2])); ding(990, 1485); turns = 0; paid = false; busy = false; info.textContent = 'Turn the handle again for another capsule: ' + PRICE + ' Ryukyu glass. You have ' + S.glass + '.'; }, 900);
    }, 500);
  });
  say();
  openModal(el('div', null, arcadeHead('🎰', 'GACHA', 'Gachapon', 'ガチャポン · five toys to collect'), el('div', { class: 'game' }, mach), info, out));
}

/* ---------- the claw game: steer, drop, and carry the prize to the chute ---------- */
function openClaw() {
  const W = 340, H = 316, RAIL = 30, L0 = 40, FLOOR = 272, CHUTE = 50, WALL = 92, PRICE = 1, COLR = { jinbei: '#3f78c8', kuina: '#5b5a48', kame: '#2f9a4a' };
  const cv = el('canvas', { width: W * 2, height: H * 2, 'aria-label': 'Claw machine' }), c = cv.getContext('2d'), info = el('p', { 'aria-live': 'polite' });
  const bL = el('button', { 'aria-label': 'Move left' }, '◀'), bR = el('button', { 'aria-label': 'Move right' }, '▶'), bD = el('button', { class: 'go' }, 'Start · ' + PRICE + ' glass');
  const G = { st: 'idle', x: CHUTE, vx: 0, len: 0, th: 0, om: 0, open: 1, held: null, grip: 0, slip: -1, t: 0, timer: 0, left: false, right: false, prizes: [], msg: '' };
  const fill = () => { const ids = ['jinbei', 'kuina', 'kame', 'kame', 'jinbei', 'kuina'].sort(() => Math.random() - .5); G.prizes = ids.map((id, i) => ({ id, r: 23, x: 124 + i * 37 + (Math.random() - .5) * 8, y: FLOOR - 23, vy: 0, rot: (Math.random() - .5) * .6 })); G.prizes[1].y -= 6; G.prizes[4].y -= 4; };
  fill();
  const tip = () => ({ x: G.x + Math.sin(G.th) * (L0 + G.len), y: RAIL + Math.cos(G.th) * (L0 + G.len) });
  const hold = (b, k) => { const on = (e) => { e.preventDefault(); G[k] = true; b.classList.add('down'); }, off = () => { G[k] = false; b.classList.remove('down'); }; b.addEventListener('pointerdown', on); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, off); };
  hold(bL, 'left'); hold(bR, 'right');
  const press = () => {
    if (G.st === 'move') { G.st = 'drop'; G.vx = 0; drumSfx(0, 120); }
    else if (G.st === 'idle' || G.st === 'done') {
      if (S.glass < PRICE) { info.textContent = 'You need ' + PRICE + ' Ryukyu glass to play. They float on the lagoon just offshore.'; return; }
      S.glass -= PRICE; save(); if (!G.prizes.length) fill(); G.st = 'move'; G.x = CHUTE; G.len = 0; G.open = 1; G.held = null; G.timer = 14; G.msg = ''; bD.textContent = 'Drop'; info.textContent = 'Line the claw up over a toy, wait for it to stop swinging, then drop. ' + (MOBILE ? 'Hold ◀ ▶ to move.' : 'Arrow keys or A and D to move, Space to drop.');
    }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };
  bD.addEventListener('click', press);
  const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) press(); } };
  addEventListener('keydown', onKey, true);
  const end = (won) => {
    G.st = 'done'; bD.textContent = 'Play again · ' + PRICE + ' glass';
    if (won) { const p = prizeLine(won); ding(990, 1485); info.textContent = ''; info.append(el('b', null, 'Got it! ' + p[0] + ' ' + p[1] + '. '), p[2]); } else info.textContent = G.msg || 'So close. The claw came up empty. You have ' + S.glass + ' Ryukyu glass.';
  };
  const settle = (p) => { let y = FLOOR - p.r; for (const o of G.prizes) if (o !== p && Math.abs(o.x - p.x) < p.r * 1.3 && o.y - p.r * 1.5 < y) y = o.y - p.r * 1.5; return y; };
  function step(dt) {
    const k = typeof keys === 'object' ? keys : {}, dir = G.st === 'move' ? ((G.right || k.ArrowRight || k.KeyD ? 1 : 0) - (G.left || k.ArrowLeft || k.KeyA ? 1 : 0)) : 0;
    let ax = 0;
    if (G.st === 'move') { const want = dir * 120, nv = G.vx + clamp(want - G.vx, -520 * dt, 520 * dt); ax = (nv - G.vx) / dt; G.vx = nv; G.x = clamp(G.x + G.vx * dt, CHUTE, W - 34); if (G.x <= CHUTE || G.x >= W - 34) G.vx = 0; G.timer -= dt; if (G.timer <= 0) { G.st = 'drop'; G.vx = 0; } }
    else if (G.st === 'carry') { const nv = -130; ax = (nv - G.vx) / dt * .3; G.vx = nv; G.x += G.vx * dt; if (G.x <= CHUTE) { G.x = CHUTE; G.vx = 0; G.st = 'release'; G.t = 0; } }
    G.om += (-ax * .0016 - G.th * 14 - G.om * 1.5) * dt; G.th = clamp(G.th + G.om * dt, -.5, .5);      // the claw hangs on a cable and swings when the carriage moves
    const tp = tip();
    if (G.st === 'drop') {
      G.len += 190 * dt; const t2 = tip(); let hit = t2.y >= FLOOR - 16;
      for (const p of G.prizes) if (Math.abs(t2.x - p.x) < p.r + 6 && t2.y + 12 >= p.y - p.r * .7) hit = true;
      if (hit) { G.st = 'grab'; G.t = 0; drumSfx(0, 200); }
    } else if (G.st === 'grab') {
      G.t += dt; G.open = Math.max(0, 1 - G.t / .35);
      if (G.t >= .45) {
        let best = null, bd = 1e9; for (const p of G.prizes) { const d = Math.abs(tp.x - p.x); if (d < 17 && tp.y + 14 >= p.y - p.r && d < bd) { bd = d; best = p; } }
        if (best) { G.held = best; G.grip = 1 - bd / 17; const sure = .2 + .78 * G.grip * G.grip; G.slip = Math.random() < sure ? -1 : .25 + Math.random() * .55; } else { G.held = null; G.slip = -1; }
        G.st = 'lift'; G.lift0 = G.len;
      }
    } else if (G.st === 'lift') {
      G.len = Math.max(0, G.len - 125 * dt);
      if (G.held && G.slip >= 0 && G.len < G.lift0 * G.slip) { G.held.vy = 20; G.held = null; G.msg = 'It slipped! Grab it nearer the middle. You have ' + S.glass + ' Ryukyu glass.'; drumSfx(0, 90); }
      if (G.len <= 0) { if (G.held) { G.st = 'carry'; if (G.grip < .45 && Math.random() < .35) G.slip = 2; } else end(null); }
    } else if (G.st === 'release') {
      G.t += dt; G.open = Math.min(1, G.t / .25); if (G.held && G.t > .15) { G.held.vy = 30; G.held.fall = 1; G.won = G.held; G.held = null; }
      if (G.t > 1.1) { const w = G.won; G.won = null; if (w) { G.prizes = G.prizes.filter((p) => p !== w); end(w.id); } else end(null); }
    }
    if (G.st === 'carry' && G.held && G.slip === 2 && G.x < 200 && G.x > WALL + 40) { G.held.vy = 20; G.held = null; G.slip = -1; G.msg = 'Dropped on the way! A firmer grip would have held. You have ' + S.glass + ' Ryukyu glass.'; drumSfx(0, 90); }
    if (G.st === 'carry' && !G.held && G.x <= CHUTE + 1) { /* arrives empty */ }
    if (G.held) { G.held.x = tp.x; G.held.y = tp.y + 22; G.held.rot = G.th; }
    for (const p of G.prizes) if (p !== G.held && p.vy) { p.vy += 900 * dt; p.y += p.vy * dt; if (!p.fall) { p.x = clamp(p.x, WALL + p.r + 4, W - p.r - 6); const y = settle(p); if (p.y >= y) { p.y = y; p.vy = 0; } } }
  }
  function draw() {
    c.setTransform(2, 0, 0, 2, 0, 0); const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b2a6b'); g.addColorStop(1, '#5a2a7a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.1)'; for (let i = 0; i < 14; i++) c.fillRect((i * 67) % W, 60 + (i * 41) % 170, 3, 3);
    c.fillStyle = '#ffd9ec'; c.fillRect(WALL, FLOOR, W - WALL, H - FLOOR); c.fillStyle = '#10162a'; c.fillRect(0, FLOOR - 70, WALL, H); c.fillStyle = '#ff4fa3'; c.fillRect(WALL - 5, FLOOR - 74, 5, 80);
    c.fillStyle = '#ffe14a'; c.font = '800 12px sans-serif'; c.textAlign = 'center'; c.fillText('PRIZE', WALL / 2 - 2, FLOOR - 50); c.fillText('▼', WALL / 2 - 2, FLOOR - 34);
    c.fillStyle = '#dfe5ea'; c.fillRect(8, RAIL - 8, W - 16, 8);
    const tp = tip(); c.strokeStyle = '#dfe5ea'; c.lineWidth = 2; c.beginPath(); c.moveTo(G.x, RAIL); c.lineTo(tp.x, tp.y - 6); c.stroke(); c.fillStyle = '#24304a'; c.fillRect(G.x - 16, RAIL - 12, 32, 14);
    const sorted = G.prizes.slice().sort((a, b) => (a === G.held) - (b === G.held));
    for (const p of sorted) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = COLR[p.id]; c.beginPath(); c.arc(0, 0, p.r, 0, 6.3); c.fill(); c.strokeStyle = 'rgba(16,22,42,.55)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.arc(-7, -8, 7, 0, 6.3); c.fill(); c.font = '26px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(ITEMS[p.id].ic, 0, 2); c.restore();
    }
    c.save(); c.translate(tp.x, tp.y); c.rotate(-G.th); c.strokeStyle = '#f3f6f8'; c.lineWidth = 4; c.lineCap = 'round'; const a = .28 + G.open * .5;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, -4); c.lineTo(s * Math.sin(a) * 20, Math.cos(a) * 18); c.lineTo(s * (Math.sin(a) * 20 - 6 * (1 - G.open) - 3), Math.cos(a) * 18 + 12); c.stroke(); }
    c.fillStyle = '#ff4fa3'; c.beginPath(); c.arc(0, -5, 7, 0, 6.3); c.fill(); c.restore();
    if (G.st === 'move') { c.fillStyle = 'rgba(16,22,42,.6)'; c.fillRect(W - 120, 40, 108, 10); c.fillStyle = G.timer < 4 ? '#ff7a59' : '#8fe01f'; c.fillRect(W - 120, 40, 108 * Math.max(0, G.timer / 14), 10); }
    c.fillStyle = '#fff'; c.font = '800 13px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('◉ ' + S.glass + ' glass', 12, 54);
    if (G.st === 'idle' || G.st === 'done') { c.fillStyle = 'rgba(16,22,42,.45)'; c.fillRect(WALL + 20, 120, W - WALL - 40, 46); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 15px sans-serif'; c.fillText(G.st === 'idle' ? 'Press Start to play' : 'Play again?', (W + WALL) / 2, 148); }
  }
  let last = 0;
  const frame = (ts) => {
    if (!cv.isConnected || !modalOpen) { removeEventListener('keydown', onKey, true); return; }
    const dt = Math.min(.04, last ? (ts - last) / 1000 : .016); last = ts; step(dt); draw(); requestAnimationFrame(frame);
  };
  info.textContent = 'Three kinds of plush toy to win. One go costs ' + PRICE + ' Ryukyu glass; you have ' + S.glass + '.';
  openModal(el('div', null, arcadeHead('🕹️', 'CLAW', 'Claw game', 'クレーンゲーム · carry a toy to the chute'), el('div', { class: 'game' }, cv, el('div', { class: 'cpad' }, bL, bD, bR)), info));
  window.__claw = G; requestAnimationFrame(frame);
}
