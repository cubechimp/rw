/* Ryukyu World: the bag. Things you hold, wear, eat and win, the bubbles and petals they make, and the emote panel. */
'use strict';
const GEAR_NONE = [0, 0, 0];
const ITEMS = {
  bubbles: { ic: '🫧', name: 'Bubble blower', jp: 'シャボン玉', slot: 'hand', code: 1, use: 2, verb: 'Blow bubbles', note: 'Blow a stream of bubbles for everyone nearby.' },
  hibiscus: { ic: '🌺', name: 'Hibiscus bouquet', jp: 'アカバナー', slot: 'hand', code: 2, use: 3, verb: 'Wave flowers', note: 'Akabanā, the red hibiscus that flowers here all year.' },
  shisa: { ic: '🦁', name: 'Shisa figure', jp: 'シーサー', slot: 'hand', code: 3, use: 3, verb: 'Show it off', note: 'A pocket-sized guardian lion-dog.', from: 'gacha' },
  starsand: { ic: '⭐', name: 'Star sand bottle', jp: '星の砂', slot: 'hand', code: 4, use: 3, verb: 'Show it off', note: 'Star-shaped grains from Taketomi: the shells of tiny sea creatures.', from: 'gacha' },
  paranku: { ic: '🥁', name: 'Pārankū drum', jp: 'パーランクー', slot: 'hand', code: 5, use: 3, verb: 'Beat the drum', note: 'The small hand drum that eisā dancers beat as they go.', from: 'gacha' },
  sanshin: { ic: '🪕', name: 'Mini sanshin', jp: '三線', slot: 'hand', code: 6, use: 3, verb: 'Strum', note: 'Three strings and a long neck: the sound of the islands.', from: 'gacha' },
  jinbei: { ic: '🐋', name: 'Whale shark plush', jp: 'ジンベエザメ', slot: 'hand', code: 7, use: 3, verb: 'Hold it up', note: 'Jinbē-zame, the gentle giant of the Churaumi Aquarium.', from: 'claw' },
  kuina: { ic: '🐦', name: 'Yanbaru kuina plush', jp: 'ヤンバルクイナ', slot: 'hand', code: 8, use: 3, verb: 'Hold it up', note: 'The flightless rail that lives only in the Yanbaru forest.', from: 'claw' },
  kame: { ic: '🐢', name: 'Sea turtle plush', jp: 'ウミガメ', slot: 'hand', code: 9, use: 3, verb: 'Hold it up', note: 'Like the turtles you can meet when you snorkel.', from: 'claw' },
  kubagasa: { ic: '👒', name: 'Kubagasa hat', jp: 'クバ笠', slot: 'head', code: 1, note: 'Woven from fan-palm leaves. Farmers and fishers wear it against the sun.' },
  hanagasa: { ic: '🌸', name: 'Hanagasa', jp: '花笠', slot: 'head', code: 2, note: 'The red flower hat of Ryukyu court dance.', from: 'gacha' },
  backpack: { ic: '🎒', name: 'Backpack', jp: 'リュック', slot: 'back', code: 1, note: 'For carrying snacks across the island.' },
};
const FOOD_SHAPE = { '🍜': 0, '🥣': 0, '🍚': 0, '🍩': 1, '🍬': 1, '🥜': 1, '🍠': 1, '🍋': 2, '🍵': 2, '☕': 2, '🍍': 3, '🥭': 3, '🍇': 3, '🍧': 4, '🍦': 4 };
function foodShape(id) { const f = DATA.foods[id]; return f && FOOD_SHAPE[f[0]] !== undefined ? FOOD_SHAPE[f[0]] : 5; }
function bagState() {      // the first time: a few things to start with
  if (!S.own) S.own = { bubbles: 1, hibiscus: 1, kubagasa: 1, backpack: 1 };
  if (!S.bag) S.bag = { sata: 2, shikuwasa: 1 };
  if (!S.eq) S.eq = { hand: '', head: '', back: '' };
  return S;
}
function gearCodes() {      // what other players need to know to draw you: [hand, head, back]
  const e = bagState().eq, h = e.hand;
  return [!h ? 0 : h.startsWith('food:') ? 10 + foodShape(h.slice(5)) : ITEMS[h] ? ITEMS[h].code : 0, e.head && ITEMS[e.head] ? ITEMS[e.head].code : 0, e.back ? 1 : 0];
}

/* ---------- models: small things in the right hand, on the head, on the back ---------- */
const GEAR_GEO = {};
function flowerParts(x, y, z, r) { const ps = []; for (let k = 0; k < 5; k++) ps.push(part(gSph(r, 7, 5), 0xff2d55, { p: [x + Math.cos(k * 1.257) * r, y, z + Math.sin(k * 1.257) * r], s: [1, .5, 1], glow: .15 })); ps.push(part(gSph(r * .5, 6, 4), 0xffe14a, { p: [x, y + r * .4, z], glow: .6 })); return ps; }
function handGeo(code) {
  if (GEAR_GEO['h' + code]) return GEAR_GEO['h' + code]; const ps = [], S_ = (r, c, o) => ps.push(part(gSph(r, 9, 7), c, o)), C = (a, b, h, c, o) => ps.push(part(gCyl(a, b, h, 10), c, o)), B = (w, h, d, c, o) => ps.push(part(gBox(w, h, d), c, o));
  if (code === 1) { C(.018, .018, .36, 0xff7ac8, { p: [0, .26, 0] }); ps.push(part(new T.TorusGeometry(.1, .02, 6, 14), 0xff7ac8, { p: [0, .52, 0], glow: .3 })); C(.06, .06, .12, 0x7fe9ff, { p: [.0, .1, .1], glow: .3 }); }
  else if (code === 2) { for (const [x, z] of [[-.05, 0], [.05, .02], [0, -.04]]) C(.014, .014, .34, 0x3fae3c, { p: [x, .26, z] }); ps.push(...flowerParts(-.1, .46, 0, .075), ...flowerParts(.1, .48, .03, .075), ...flowerParts(0, .56, -.05, .08)); S_(.09, 0x58c947, { p: [0, .36, 0], s: [1.2, .5, 1.2] }); }
  else if (code === 3) ps.push(part(shisaGeo(), 0xd8552b, { p: [0, .12, 0], s: [.17, .17, .17], glow: .1 }));
  else if (code === 4) { C(.07, .07, .1, 0xf3e3b4, { p: [0, .17, 0], glow: .2 }); C(.07, .07, .12, 0xcfefff, { p: [0, .28, 0], glow: .45 }); C(.04, .045, .06, 0x8a5a3c, { p: [0, .37, 0] }); S_(.03, 0xffe14a, { p: [0, .2, -.07], glow: 1 }); }
  else if (code === 5) { C(.21, .21, .07, 0xc8281e, { p: [0, .32, -.04], r: [Math.PI / 2, 0, 0] }); C(.18, .18, .08, 0xfff6e0, { p: [0, .32, -.04], r: [Math.PI / 2, 0, 0], glow: .2 }); C(.03, .03, .14, 0x8a5a3c, { p: [0, .14, -.04] }); }
  else if (code === 6) { B(.2, .22, .08, 0xcaa46a, { p: [0, .2, 0] }); B(.2, .22, .01, 0x4a3a2a, { p: [0, .2, .045] }); B(.04, .5, .04, 0x2a1a10, { p: [0, .54, 0] }); for (const y of [.7, .75, .8]) B(.12, .02, .02, 0xf3e3b4, { p: [0, y, 0] }); }
  else if (code === 7) { S_(.2, 0x3f78c8, { p: [0, .3, 0], s: [.75, .62, 1.5] }); S_(.17, 0xf3f6f8, { p: [0, .25, -.02], s: [.7, .5, 1.35] }); ps.push(part(gCone(.12, .22, 4), 0x3f78c8, { p: [0, .34, .34], r: [1.2, 0, 0] })); for (const [x, z] of [[-.08, -.1], [.08, -.02], [-.05, .08], [.07, .14], [0, -.18]]) S_(.022, 0xffffff, { p: [x, .42, z], glow: .5 }); for (const s of [-1, 1]) { S_(.07, 0x3f78c8, { p: [s * .17, .26, -.02], s: [1.3, .3, .8] }); S_(.022, 0x1b2a4a, { p: [s * .11, .32, -.24] }); } }
  else if (code === 8) { S_(.17, 0x4b4a3c, { p: [0, .28, 0], s: [.85, .9, 1.1] }); S_(.11, 0x3a3a30, { p: [0, .44, -.12] }); ps.push(part(gCone(.04, .14, 5), 0xe8452c, { p: [0, .43, -.27], r: [-Math.PI / 2, 0, 0], glow: .2 })); S_(.1, 0xe9e6dc, { p: [0, .22, -.1], s: [.8, .5, .6] }); for (const s of [-1, 1]) { C(.018, .018, .12, 0xe8452c, { p: [s * .06, .1, 0] }); S_(.02, 0xffffff, { p: [s * .06, .47, -.2], glow: .6 }); } }
  else if (code === 9) { S_(.2, 0x2f9a4a, { p: [0, .3, 0], s: [1, .55, 1.2] }); S_(.15, 0x7fd08a, { p: [0, .24, 0], s: [1.1, .4, 1.25] }); S_(.09, 0x7fd08a, { p: [0, .3, -.27] }); for (const sx of [-1, 1]) { S_(.08, 0x7fd08a, { p: [sx * .22, .25, -.12], s: [1.5, .3, .8] }); S_(.06, 0x7fd08a, { p: [sx * .17, .25, .2], s: [1.2, .3, .8] }); S_(.018, 0x1b2a4a, { p: [sx * .05, .33, -.34] }); } }
  else {      // food, by its shape
    const k = code - 10;
    if (k === 0) { C(.2, .12, .14, 0xb5302a, { p: [0, .22, 0] }); C(.18, .18, .03, 0xf6e7b8, { p: [0, .29, 0], glow: .2 }); S_(.05, 0x8a4a2a, { p: [.05, .31, .02], s: [1.4, .5, 1] }); S_(.03, 0x58c947, { p: [-.06, .31, -.04] }); for (const s of [-1, 1]) C(.008, .008, .34, 0x6b4630, { p: [.12 + s * .02, .34, 0], r: [0, 0, -.5] }); }
    else if (k === 1) { S_(.13, 0xc98a3c, { p: [0, .26, 0], glow: .1 }); S_(.05, 0xe2b06a, { p: [.04, .34, -.04], s: [1.4, .5, 1] }); }
    else if (k === 2) { C(.09, .07, .24, 0xf3f6f8, { p: [0, .26, 0], glow: .2 }); C(.085, .085, .02, 0xb8e986, { p: [0, .36, 0], glow: .3 }); C(.012, .012, .2, 0x3fae3c, { p: [.03, .44, 0], r: [0, 0, -.2] }); }
    else if (k === 3) { S_(.14, 0xffb52e, { p: [0, .28, 0], s: [1, 1.15, 1], glow: .1 }); ps.push(part(gCone(.07, .16, 5), 0x3fae3c, { p: [0, .5, 0] })); }
    else if (k === 4) { ps.push(part(gCone(.1, .24, 8), 0xe9c48a, { p: [0, .22, 0], r: [Math.PI, 0, 0] })); S_(.12, 0xff9fc2, { p: [0, .4, 0], glow: .2 }); S_(.03, 0xe8452c, { p: [0, .53, 0], glow: .3 }); }
    else { C(.2, .2, .025, 0xffffff, { p: [0, .16, 0], glow: .2 }); S_(.11, 0xd9773a, { p: [0, .22, 0], s: [1.2, .6, 1] }); S_(.05, 0x58c947, { p: [.09, .22, .06] }); S_(.04, 0xffe14a, { p: [-.08, .22, .05], glow: .2 }); }
  }
  return (GEAR_GEO['h' + code] = merge(ps));
}
function hatGeo(code) {
  if (GEAR_GEO['t' + code]) return GEAR_GEO['t' + code]; const ps = [];
  if (code === 1) ps.push(part(gCone(.68, .34, 16), 0xdcbb72, { p: [0, .47, 0] }), part(gCyl(.69, .69, .03, 16), 0xc39f55, { p: [0, .3, 0] }), part(gCyl(.05, .07, .07, 6), 0xa9843f, { p: [0, .66, 0] }));
  else {
    ps.push(part(gCyl(.52, .55, .1, 16), 0x2f74e0, { p: [0, .3, 0], glow: .1 }), part(gCyl(.56, .56, .03, 16), 0xe8eef5, { p: [0, .27, 0], glow: .3 }), part(gSph(.48, 14, 8), 0xe5283e, { p: [0, .38, 0], s: [1, .62, 1], glow: .1 }));
    for (let k = 0; k < 6; k++) ps.push(part(gSph(.2, 8, 6), 0xff5d7a, { p: [Math.cos(k * 1.047) * .3, .56, Math.sin(k * 1.047) * .3], s: [1, .45, 1], glow: .15 }));
    ps.push(part(gSph(.11, 8, 6), 0xffd24a, { p: [0, .68, 0], glow: .6 }));
  }
  return (GEAR_GEO['t' + code] = merge(ps));
}
function packGeo() {
  if (GEAR_GEO.b) return GEAR_GEO.b;
  return (GEAR_GEO.b = merge([part(gBox(.46, .5, .26), 0xff8a2a, { p: [0, .02, .4] }), part(gBox(.48, .16, .28), 0xe0641a, { p: [0, .22, .4] }), part(gBox(.3, .2, .08), 0xffc21f, { p: [0, -.08, .55], glow: .15 }),
    part(gCyl(.1, .1, .44, 8), 0x3fbfa8, { p: [0, .34, .4], r: [0, 0, Math.PI / 2] }), part(gBox(.07, .5, .5), 0x7a3a12, { p: [-.2, .06, .14] }), part(gBox(.07, .5, .5), 0x7a3a12, { p: [.2, .06, .14] })]));
}
function setGear(g, q) {
  const u = g.userData, key = q[0] + ',' + q[1] + ',' + q[2]; if (u.gearKey === key) return; u.gearKey = key;
  if (u.gear) for (const m of u.gear) m.removeFromParent(); u.gear = [];
  const add = (parent, geo) => { const m = new T.Mesh(geo, objMat); m.frustumCulled = false; parent.add(m); u.gear.push(m); };
  if (q[0] > 0 && q[0] < 16) add(u.parts.handR, handGeo(q[0])); if (q[1] === 1 || q[1] === 2) add(u.parts.head, hatGeo(q[1])); if (q[2]) add(u.parts.torso, packGeo());
}

/* ---------- bubbles and petals ---------- */
const BUB_N = 240, bubPos = new Float32Array(BUB_N * 3), bubVel = new Float32Array(BUB_N * 3), bubLife = new Float32Array(BUB_N), bubSize = new Float32Array(BUB_N), bubKind = new Float32Array(BUB_N);
let bubNext = 0, bubLive = 0;
const bubGeo = new T.BufferGeometry(); bubGeo.setAttribute('position', new T.BufferAttribute(bubPos, 3)); bubGeo.setAttribute('aLife', new T.BufferAttribute(bubLife, 1)); bubGeo.setAttribute('aSize', new T.BufferAttribute(bubSize, 1)); bubGeo.setAttribute('aKind', new T.BufferAttribute(bubKind, 1));
const bubPts = new T.Points(bubGeo, new T.ShaderMaterial({
  uniforms: U, transparent: true, depthWrite: false,
  vertexShader: `attribute float aLife,aSize,aKind;varying float vL,vK;void main(){vL=aLife;vK=aKind;vec4 mv=viewMatrix*modelMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aLife>0.?aSize*520./max(1.,-mv.z):0.;}`,
  fragmentShader: `varying float vL,vK;void main(){vec2 q=gl_PointCoord-.5;float d=length(q)*2.;if(d>1.||vL<=0.)discard;float fade=min(1.,vL*4.);
    if(vK>.5){gl_FragColor=vec4(mix(vec3(1.,.3,.5),vec3(1.,.78,.85),d*.7),(1.-smoothstep(.7,1.,d))*fade*.95);return;}
    float rim=smoothstep(.5,.96,d)*(1.-smoothstep(.96,1.,d)),hi=1.-smoothstep(0.,.2,length(q-vec2(-.17,-.17)));
    vec3 irid=.62+.38*cos(6.283*(d*1.3+atan(q.y,q.x)*.16+vec3(0.,.33,.67)));
    gl_FragColor=vec4(mix(vec3(.86,.97,1.),irid,rim)+hi*.5,(.1+rim*.72+hi*.6)*fade);}`,
}));
bubPts.frustumCulled = false; bubPts.renderOrder = 9;
function bubEmit(x, y, z, vx, vy, vz, size, life, kind) {
  const i = bubNext; bubNext = (bubNext + 1) % BUB_N; bubPos[i * 3] = x; bubPos[i * 3 + 1] = y; bubPos[i * 3 + 2] = z; bubVel[i * 3] = vx; bubVel[i * 3 + 1] = vy; bubVel[i * 3 + 2] = vz; bubSize[i] = size; bubLife[i] = life; bubKind[i] = kind || 0; bubLive = Math.max(bubLive, life);
}
function bubStep(dt, t) {
  if (bubLive <= 0) { if (bubPts.parent) bubPts.removeFromParent(); return; } bubLive -= dt;
  const home = INSIDE ? inScene : scene; if (bubPts.parent !== home) home.add(bubPts);
  for (let i = 0; i < BUB_N; i++) {
    if (bubLife[i] <= 0) continue; bubLife[i] -= dt; const k = Math.exp(-dt * 1.3), o = i * 3;
    bubVel[o] *= k; bubVel[o + 2] *= k; if (bubKind[i] > .5) bubVel[o + 1] = Math.max(-.9, bubVel[o + 1] - 2.4 * dt); else bubVel[o + 1] += (.42 - bubVel[o + 1]) * dt * 1.4;
    bubPos[o] += (bubVel[o] + Math.sin(t * 2.3 + i) * .18) * dt; bubPos[o + 1] += bubVel[o + 1] * dt; bubPos[o + 2] += (bubVel[o + 2] + Math.cos(t * 1.9 + i * 1.7) * .18) * dt;
  }
  bubGeo.attributes.position.needsUpdate = true; bubGeo.attributes.aLife.needsUpdate = true; bubGeo.attributes.aSize.needsUpdate = true; bubGeo.attributes.aKind.needsUpdate = true;
}
/* What using something looks like, for you and for everyone watching: kind 2 blows bubbles, kind 3 with the bouquet scatters petals. */
function useFx(g, kind, ut, dt, hand) {
  const home = INSIDE ? inScene : scene; if (g.parent !== home) return; const u = g.userData, sc = g.scale.x, h = -g.rotation.y, fx = Math.sin(h), fz = -Math.cos(h);
  if (kind === 2 && ut > .45 && ut < USE_DUR[2] - .5) {
    u.fx = (u.fx || 0) + dt * 15;
    while (u.fx >= 1) { u.fx--; const hp = u.parts.head.position, a = (Math.random() - .5) * .9, sp = (1.4 + Math.random() * 1.6) * sc, dx = fx * Math.cos(a) - fz * Math.sin(a), dz = fz * Math.cos(a) + fx * Math.sin(a);
      bubEmit(g.position.x + fx * .62 * sc, g.position.y + (hp.y - .16) * sc, g.position.z + fz * .62 * sc, dx * sp, (.2 + Math.random() * .7) * sc, dz * sp, (.12 + Math.random() * .2) * sc, 2.6 + Math.random() * 2.4, 0); }
  } else if (kind === 3 && hand === 2 && ut > .3 && ut < USE_DUR[3] - .3) {
    u.fx = (u.fx || 0) + dt * 9;
    while (u.fx >= 1) { u.fx--; const hp = u.parts.handR.position, rx = Math.cos(h), rz = Math.sin(h);
      bubEmit(g.position.x + (rx * hp.x + fx * .1) * sc, g.position.y + (hp.y + .5) * sc, g.position.z + (rz * hp.x + fz * .1) * sc, (Math.random() - .5) * 1.6 * sc, (.6 + Math.random()) * sc, (Math.random() - .5) * 1.6 * sc, (.07 + Math.random() * .06) * sc, 1.8 + Math.random() * 1.2, 1); }
  }
}

/* ---------- using what you hold ---------- */
function drumSfx(when, f) {
  if (typeof AC === 'undefined' || !AC) return; const t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f || 190, t); o.frequency.exponentialRampToValueAtTime(70, t + .16);
  g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .22); o.connect(g); g.connect(master); o.start(t); o.stop(t + .25);
}
function useItem() {
  if (!started || modalOpen || chill || P.diving || P.fly) return; const e = bagState().eq, h = e.hand; if (!h || (P.use && tNow - P.useAt < USE_DUR[P.use])) return;
  const food = h.startsWith('food:'); if (!food && !ITEMS[h]) return;
  P.use = food ? 1 : ITEMS[h].use; P.useAt = tNow; P.useStamp = Date.now(); P.useItem = h;
  if (h === 'paranku') [0, .3, .6, .75, .9, 1.5, 1.8].forEach((w, i) => drumSfx(w, i % 3 === 2 ? 240 : 190));
  else if (h === 'sanshin' && AC) [0, 2, 4, 3, 5, 4, 2].forEach((n, i) => pluck(n, .4, AC.currentTime + i * .3));
  else if (food) pluck(1, .15);
}
function bagStep(dt) {      // every frame: wear what is equipped, play out what is being used
  if (!me) return; const q = gearCodes(); setGear(me, q);
  if (P.use) {
    const ut = tNow - P.useAt;
    if (ut < USE_DUR[P.use]) useFx(me, P.use, ut, dt, q[0]);
    else {
      if (P.use === 1 && P.useItem && P.useItem.startsWith('food:')) {      // the last bite
        const id = P.useItem.slice(5), f = DATA.foods[id];
        if (f && S.bag[id] > 0) { if (--S.bag[id] <= 0) { delete S.bag[id]; S.eq.hand = ''; } S.foods[id] = 1; P.buffT = 150; ding(990, 1485); toast('Māsan! ' + f[0], f[1] + ' eaten. You move 15% faster for a while.'); learn('maasan'); save(); }
      }
      P.use = 0;
    }
  }
  bubStep(dt, tNow);
  const b = $('#bUse'), h = S.eq.hand, show = !!h && started && !chill && !P.fly && !P.diving; if (b.hidden === show) b.hidden = !show;
  if (show) { const food = h.startsWith('food:'), f = food ? DATA.foods[h.slice(5)] : null, lab = food ? (f ? 'Eat ' + f[0] : 'Eat') : ITEMS[h] ? ITEMS[h].verb + ' ' + ITEMS[h].ic : ''; if (b.textContent !== lab) b.textContent = lab; }
}
function poseOpt(o) { o.emote = P.emoteAt !== undefined ? [P.emote, tNow - P.emoteAt] : null; o.use = P.use ? [P.use, tNow - P.useAt] : null; return o; }      // what the pose needs to know about your emote and your hands
function bagGive(id, n) { bagState(); if (ITEMS[id]) { const had = !!S.own[id]; S.own[id] = 1; save(); return !had; } S.bag[id] = (S.bag[id] || 0) + (n || 1); save(); return true; }

/* ---------- the bag itself ---------- */
function openBag() {
  if (!started || chill) return; const B = bagState(), body = el('div'), hint = () => (MOBILE ? 'Tap the button under Bag' : 'Press Q, or the button under Bag');
  const row = (ic, title, sub, on, fn) => el('button', { class: 'act' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', on: { click: fn } }, el('span', { class: 'ic' }, ic), el('span', null, el('b', null, title), el('small', null, sub)));
  const render = () => {
    body.textContent = ''; const hold = el('div', { class: 'acts' }), wear = el('div', { class: 'acts' }), e = B.eq; let foods = 0;
    for (const id in B.bag) { const f = DATA.foods[id]; if (!f || !(B.bag[id] > 0)) continue; foods++; const key = 'food:' + id, on = e.hand === key;
      hold.append(row(f[0], f[1] + ' ' + f[2] + '  ×' + B.bag[id], on ? 'In your hand. ' + hint() + ' to eat it.' : 'Hold it, then eat it for a 15% speed boost.', on, () => { e.hand = on ? '' : key; save(); render(); })); }
    for (const id in ITEMS) { const it = ITEMS[id]; if (!B.own[id]) continue; const on = e[it.slot] === id;
      (it.slot === 'hand' ? hold : wear).append(row(it.ic, it.name + ' ' + it.jp, on ? (it.slot === 'hand' ? 'In your hand. ' + hint() + ': ' + it.verb.toLowerCase() + '.' : 'You are wearing it. Tap to take it off.') : it.note, on, () => { e[it.slot] = on ? '' : id; save(); render(); })); }
    const missing = Object.keys(ITEMS).filter((id) => !B.own[id]).length;
    body.append(el('p', null, el('b', null, 'Hold 手に持つ')), hold, foods ? null : el('p', { class: 'src' }, 'No food in the bag. Every dish you buy at a counter or a food stall puts a portion in here.'), el('p', null, el('b', null, 'Wear 身につける')), wear,
      el('p', { class: 'src' }, missing ? missing + ' more things to find: turn the gachapon and play the claw game in any game centre (ゲームセンター).' : 'You have everything. Chura!'));
    const arc = nearestArcade(); if (arc && !INSIDE) body.append(el('div', { class: 'acts' }, row('🕹️', 'Go to the nearest game centre', arc.name + ' · ' + fmtDist(arc.dist) + ' away. Look for the pink and blue shopfront.', false, () => travelTo(arc.x + 7, arc.z + 7, 'Off to ' + arc.name + '…'))));
  };
  render();
  openModal(el('div', null, el('div', { class: 'head' }, el('div', { class: 'seal' }, el('span', null, '🎒'), el('small', null, 'BAG')), el('div', null, el('h2', { id: 'mTitle' }, 'Your bag', el('small', null, 'かばん · others see what you hold and wear')))), body));
}

/* ---------- emote panel ---------- */
(function () {
  const grid = $('#emoGrid'), btn = $('#bEmo'); if (!grid || !btn) return;
  EMOTES.forEach((t, i) => { const b = document.createElement('button'); b.className = 'glass pill'; b.dataset.e = i; b.textContent = t; grid.append(b); });
  const set = (open) => { grid.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
  btn.addEventListener('click', () => set(grid.hidden)); grid.addEventListener('click', (e) => { if (e.target.closest('[data-e]')) set(false); });
  window.toggleEmotes = () => set(grid.hidden);
  $('#bBag').addEventListener('click', () => openBag()); $('#bUse').addEventListener('click', () => useItem());
})();
