/* Arena Beasts - the 3D arena: floor, border, stands with a crowd, banners, lamps, props and the 2 trainers.
   The arena floor is 15.6 x 6.88 world units (780 x 344 game pixels). 4 themes change colours, props and light. */
import * as THREE from 'three';
import { canvasTex } from './geo.js';

const AW = 7.8, AD = 3.44;   // half sizes of the arena floor
export const THEMES = [
  { name: 'Sandstone Court', base: '#dcb574', sp: ['#cba05c', '#ecd09a'], line: 'rgba(255,255,255,0.86)', floor: '#1b2b4a', wall: '#31497a', trim: '#e2ab3c', seat: '#22355c',
    key: '#fff0d2', keyK: 2.4, sky: '#f2e6d0', gnd: '#4a4c6a', bg: '#0e182c', fog: '#132038', prop: 'rock', pc: ['#c9a064', '#a8804c', '#5fae5a'] },
  { name: 'Moss Garden', base: '#74b45e', sp: ['#5f9e4c', '#92cc78'], line: 'rgba(255,255,255,0.86)', floor: '#182e40', wall: '#2c5a52', trim: '#e2ab3c', seat: '#1f4040',
    key: '#fff6e0', keyK: 2.3, sky: '#deeee0', gnd: '#3c5a50', bg: '#0c1a26', fog: '#122430', prop: 'bush', pc: ['#3f8a44', '#5fae5a', '#ff8ac0'] },
  { name: 'Glass Rink', base: '#a4d4ea', sp: ['#8cc0dc', '#c6e8f6'], line: 'rgba(28,84,160,0.8)', floor: '#1b2c4e', wall: '#3c62a0', trim: '#cfdcec', seat: '#27406c',
    key: '#f0f6fc', keyK: 2.2, sky: '#d8e6f4', gnd: '#4c628a', bg: '#0e182c', fog: '#132038', prop: 'ice', pc: ['#a8dcf4', '#e4f2fa', '#58a6ff'] },
  { name: 'Slate Hall', base: '#9690bc', sp: ['#827ca8', '#aca6d0'], line: 'rgba(255,200,61,0.88)', floor: '#1c1f40', wall: '#3d3a72', trim: '#e2ab3c', seat: '#292750',
    key: '#ffeed4', keyK: 2.3, sky: '#d4d0ea', gnd: '#3e3c62', bg: '#0e1228', fog: '#141a36', prop: 'pillar', pc: ['#5c5890', '#484478', '#ffc83d'] }
];

function floorTex(th) {
  return canvasTex(2048, 904, (g, W, H) => {
    let i, x, y, r;
    g.fillStyle = th.base; g.fillRect(0, 0, W, H);
    // soft large patches, then small specks
    for (i = 0; i < 70; i++) {
      x = Math.random() * W; y = Math.random() * H; r = 80 + Math.random() * 220;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, th.sp[i & 1]); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.22; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (i = 0; i < 5200; i++) {
      g.fillStyle = th.sp[i & 1]; g.globalAlpha = 0.14 + Math.random() * 0.26;
      x = Math.random() * W; y = Math.random() * H; r = 1 + Math.random() * 3.2;
      g.beginPath(); g.ellipse(x, y, r * (1 + Math.random()), r, Math.random() * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    // a light tint for each team half
    let gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(60,130,240,0.16)'); gr.addColorStop(0.45, 'rgba(60,130,240,0)'); gr.addColorStop(0.55, 'rgba(240,80,60,0)'); gr.addColorStop(1, 'rgba(240,80,60,0.16)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // field lines
    const cx = W / 2, cy = H / 2, u = W / 780;
    g.strokeStyle = th.line; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, cy, 118 * u, 0, 7); g.stroke();
    g.beginPath(); g.arc(cx, cy, 58 * u, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, H); g.stroke();
    g.lineWidth = 4;
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 390 * u, cy, 96 * u, sx > 0 ? Math.PI / 2 : -Math.PI / 2, sx > 0 ? Math.PI * 1.5 : Math.PI / 2); g.stroke(); }
    // centre emblem: a claw mark in a diamond
    g.save(); g.translate(cx, cy); g.fillStyle = th.line; g.globalAlpha = 0.9;
    for (i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 26 - 10, -44 + Math.abs(i) * 8); g.quadraticCurveTo(i * 26 + 14, 0, i * 26 - 4, 46 - Math.abs(i) * 8); g.quadraticCurveTo(i * 26 + 2, 0, i * 26 - 10, -44 + Math.abs(i) * 8); g.fill(); }
    g.restore();
    // darker edge and a white border line
    gr = g.createRadialGradient(cx, cy, H * 0.5, cx, cy, W * 0.62);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(8,16,40,0.26)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = th.line; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
  });
}
function outerTex(th) {
  const t = canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = th.floor; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { g.fillStyle = i & 1 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)'; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 14, 2 + Math.random() * 3); }
    g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, H); g.moveTo(0, i * 128); g.lineTo(W, i * 128); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 10);
  return t;
}
function bannerTex(type) {
  const TG = window.G;
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = TG.TCOL[type]; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
    TG.drawTypeIcon(g, type, W / 2, H / 2, 168, true);
  });
}

function trainer(side) {
  const g = new THREE.Group(), jacket = side ? '#ee5a4c' : '#3f8eea', skin = ['#f0c8a0', '#b98860'][side], dark = '#262a44';
  const std = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.7 : r });
  const add = (geo, mat, x, y, z, par) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; (par || g).add(m); return m; };
  const legs = add(new THREE.CapsuleGeometry(0.16, 0.34, 4, 10), std(dark), 0, 0.36, 0);
  legs.scale.set(1, 1, 0.8);
  const body = new THREE.Group(); body.position.y = 0.62; g.add(body);
  add(new THREE.CapsuleGeometry(0.19, 0.26, 4, 12), std(jacket), 0, 0.2, 0, body);
  add(new THREE.TorusGeometry(0.19, 0.035, 8, 16), std('#ffffff'), 0, 0.06, 0, body).rotation.x = Math.PI / 2;
  const head = add(new THREE.SphereGeometry(0.19, 18, 14), std(skin, 0.6), 0, 0.62, 0, body);
  const cap = add(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), std(jacket), 0, 0.03, 0, head);
  cap.rotation.z = -0.15;
  add(new THREE.CylinderGeometry(0.14, 0.16, 0.025, 14), std(jacket), 0.14, 0.03, 0, head).scale.set(1, 1, 0.8);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.03, 8, 6), std('#1c1830', 0.3), 0.165, 0.0, s * 0.07, head);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0, 0.36, s * 0.22); body.add(sh);
    add(new THREE.CapsuleGeometry(0.06, 0.26, 4, 8), std(jacket), 0, -0.17, 0, sh);
    add(new THREE.SphereGeometry(0.065, 10, 8), std(skin, 0.6), 0, -0.36, 0, sh);
    arms.push(sh);
  }
  g.userData = { body, head, arms, cheer: 0 };
  return g;
}

export class Arena {
  constructor(scene) {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    this.theme = THEMES[0]; this.tex = {};
    const G = this.group;
    // ground
    this.outer = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), new THREE.MeshStandardMaterial({ roughness: 0.95, envMapIntensity: 0.25 }));
    this.outer.rotation.x = -Math.PI / 2; this.outer.receiveShadow = true; G.add(this.outer);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(AW * 2, AD * 2), new THREE.MeshStandardMaterial({ roughness: 0.88, envMapIntensity: 0.22 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = 0.012; this.floor.receiveShadow = true; G.add(this.floor);
    // border with team lights
    this.trimMat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.7, envMapIntensity: 0.7 });
    const bar = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), this.trimMat); m.position.set(x, 0.1, z); m.castShadow = m.receiveShadow = true; G.add(m); };
    bar(AW * 2 + 0.7, 0.32, 0, -AD - 0.18); bar(AW * 2 + 0.7, 0.32, 0, AD + 0.18); bar(0.32, AD * 2 + 0.04, -AW - 0.18, 0); bar(0.32, AD * 2 + 0.04, AW + 0.18, 0);
    const strip = (c, x0, x1, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), 0.05, 0.09), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.85) })); m.position.set((x0 + x1) / 2, 0.215, z); G.add(m); };
    strip('#58a6ff', -AW, -0.3, -AD - 0.18); strip('#ff6b5e', 0.3, AW, -AD - 0.18); strip('#58a6ff', -AW, -0.3, AD + 0.18); strip('#ff6b5e', 0.3, AW, AD + 0.18);
    const vs = (c, x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, AD * 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.85) })); m.position.set(x, 0.215, 0); G.add(m); };
    vs('#58a6ff', -AW - 0.18); vs('#ff6b5e', AW + 0.18);
    // stands behind the arena and at the sides
    this.wallMat = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.3 }); this.seatMat = new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.3 });
    const spots = [];
    const tier = (x, z, w, d, rotY) => {
      const tg = new THREE.Group(); tg.position.set(x, 0, z); tg.rotation.y = rotY; G.add(tg);
      const front = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.3), this.wallMat); front.position.set(0, 0.45, 0); front.castShadow = front.receiveShadow = true; tg.add(front);
      for (let i = 0; i < 4; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, d), this.seatMat); st.position.set(0, 0.62 + i * 0.5, -0.3 - d / 2 - i * d); st.receiveShadow = true; tg.add(st);
        const n = Math.floor(w / 0.46);
        for (let k = 0; k < n; k++) if (Math.random() < 0.86) { const v = new THREE.Vector3(-w / 2 + 0.3 + k * 0.46 + (Math.random() - 0.5) * 0.12, 0.9 + i * 0.5, -0.3 - d / 2 - i * d); tg.updateMatrixWorld(true); spots.push(tg.localToWorld(v)); }
      }
      return tg;
    };
    tier(0, -AD - 1.9, 26, 0.75, 0);
    tier(-AW - 3.3, 0.4, 9, 0.75, Math.PI / 2); tier(AW + 3.3, 0.4, 9, 0.75, -Math.PI / 2);
    // crowd: bodies and heads
    const N = this.crowdN = spots.length;
    const bodyG = new THREE.CapsuleGeometry(0.15, 0.2, 3, 8), headG = new THREE.SphereGeometry(0.13, 10, 8);
    this.bodies = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.8, envMapIntensity: 0.3 }), N);
    this.heads = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.7, envMapIntensity: 0.3 }), N);
    const pal = ['#ff6b5e', '#58a6ff', '#5fd068', '#ffc83d', '#b88cff', '#ff9a4a', '#4fd2c8', '#f2f5fb', '#ff8ac0', '#8ea2c8', '#8ea2c8'], skins = ['#f0c8a0', '#d8a878', '#a87850', '#7a5236'];
    const c = new THREE.Color();
    this.spots = spots; this.phase = [];
    for (let i = 0; i < N; i++) {
      this.bodies.setColorAt(i, c.set(pal[Math.floor(Math.random() * pal.length)])); this.heads.setColorAt(i, c.set(skins[Math.floor(Math.random() * skins.length)]));
      this.phase.push(Math.random() * 6.28);
    }
    G.add(this.bodies, this.heads);
    this.cheer = 0; this.dummy = new THREE.Object3D();
    // banners on the back wall
    const btype = ['Ember', 'Tide', 'Bloom', 'Volt', 'Mind', 'Frost'];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshStandardMaterial({ map: bannerTex(btype[i]), roughness: 0.75 }));
      m.position.set(-10 + i * 4, 0.47, -AD - 1.74); G.add(m);
    }
    // lamp towers
    this.lamps = [];
    for (const sx of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 4.6, 10), new THREE.MeshStandardMaterial({ color: '#3a3f52', roughness: 0.5, metalness: 0.6 }));
      pole.position.set(sx * (AW + 1.5), 2.3, -AD - 1.2); pole.castShadow = true; G.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.3), new THREE.MeshStandardMaterial({ color: '#2a2e3e', roughness: 0.5 }));
      head.position.set(sx * (AW + 1.5), 4.6, -AD - 1.2); head.rotation.set(0.5, -sx * 0.5, 0); G.add(head);
      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d0').multiplyScalar(3) }));
      lamp.position.set(0, 0, 0.16); head.add(lamp); this.lamps.push(lamp);
    }
    // trainer platforms and trainers
    this.trainers = [];
    for (const side of [0, 1]) {
      const x = side ? AW + 0.95 : -AW - 0.95;
      const pf = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.16, 28), new THREE.MeshStandardMaterial({ color: '#263c63', roughness: 0.5, metalness: 0.4 }));
      pf.position.set(x, 0.08, 0); pf.castShadow = pf.receiveShadow = true; G.add(pf);
      const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 8, 36), new THREE.MeshBasicMaterial({ color: new THREE.Color(side ? '#ff6b5e' : '#58a6ff').multiplyScalar(1.25) }));
      ringM.rotation.x = Math.PI / 2; ringM.position.set(x, 0.17, 0); G.add(ringM);
      const t = trainer(side); t.position.set(x, 0.16, 0); t.rotation.y = side ? Math.PI : 0; G.add(t); this.trainers.push(t);
    }
    // props: 3 instanced sets, their shape changes with the theme
    this.propGroup = new THREE.Group(); G.add(this.propGroup);
  }
  setTheme(i) {
    const th = this.theme = THEMES[i % THEMES.length];
    if (!this.tex[th.name]) this.tex[th.name] = { floor: floorTex(th), outer: outerTex(th) };
    this.floor.material.map = this.tex[th.name].floor; this.floor.material.needsUpdate = true;
    this.outer.material.map = this.tex[th.name].outer; this.outer.material.color.set('#ffffff'); this.outer.material.needsUpdate = true;
    this.trimMat.color.set(th.trim); this.wallMat.color.set(th.wall); this.seatMat.color.set(th.seat);
    // props
    const P = this.propGroup;
    while (P.children.length) { const o = P.children.pop(); o.geometry.dispose(); o.material.dispose(); }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const place = (geo, col, n, sMin, sMax, o) => {
      const mat = new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.8, flatShading: true, envMapIntensity: 0.3 }, o || {}));
      const im = new THREE.InstancedMesh(geo, mat, n), d = this.dummy;
      for (let k = 0; k < n; k++) {
        const back = Math.random() < 0.72;
        if (back) d.position.set(rnd(-AW - 2.4, AW + 2.4), 0, rnd(-AD - 1.45, -AD - 0.6));
        else { const sx = Math.random() < 0.5 ? -1 : 1; d.position.set(sx * rnd(AW + 1.8, AW + 2.6), 0, rnd(-AD, AD - 0.5)); }
        const s = rnd(sMin, sMax); d.scale.set(s, s * rnd(0.8, 1.3), s); d.rotation.set(0, rnd(0, 6.28), 0); d.updateMatrix(); im.setMatrixAt(k, d.matrix);
      }
      im.castShadow = im.receiveShadow = true; P.add(im);
    };
    if (th.prop === 'rock') {
      const g = new THREE.DodecahedronGeometry(0.4, 0); g.translate(0, 0.25, 0);
      place(g, th.pc[0], 16, 0.5, 1.2); place(g.clone(), th.pc[1], 10, 0.3, 0.7);
      const cac = new THREE.CapsuleGeometry(0.14, 0.6, 4, 8); cac.translate(0, 0.44, 0); place(cac, th.pc[2], 9, 0.7, 1.3, { flatShading: false });
    } else if (th.prop === 'bush') {
      const g = new THREE.IcosahedronGeometry(0.4, 1); g.translate(0, 0.3, 0);
      place(g, th.pc[0], 16, 0.6, 1.3); place(g.clone(), th.pc[1], 12, 0.4, 0.9);
      const fl = new THREE.IcosahedronGeometry(0.09, 0); fl.translate(0, 0.5, 0); place(fl, th.pc[2], 22, 0.7, 1.4, { emissive: th.pc[2], emissiveIntensity: 0.35 });
    } else if (th.prop === 'ice') {
      const g = new THREE.OctahedronGeometry(0.34, 0); g.scale(1, 1.9, 1); g.translate(0, 0.5, 0);
      place(g, th.pc[0], 18, 0.5, 1.3, { roughness: 0.15, emissive: '#3aa8d8', emissiveIntensity: 0.35 });
      const sn = new THREE.SphereGeometry(0.5, 10, 6, 0, 6.3, 0, Math.PI / 2); place(sn, th.pc[1], 12, 0.6, 1.3, { flatShading: false });
    } else {
      const g = new THREE.CylinderGeometry(0.2, 0.24, 1.3, 6); g.translate(0, 0.65, 0);
      place(g, th.pc[0], 12, 0.8, 1.2);
      const top = new THREE.OctahedronGeometry(0.17, 0); top.translate(0, 1.5, 0); place(top, th.pc[2], 12, 0.8, 1.2, { emissive: th.pc[2], emissiveIntensity: 2.2 });
      const rb = new THREE.DodecahedronGeometry(0.3, 0); rb.translate(0, 0.18, 0); place(rb, th.pc[1], 12, 0.5, 1.1);
    }
    return th;
  }
  // crowd and trainer motion. cheer rises on big hits and falls again.
  update(dt, time) {
    this.cheer = Math.max(0, this.cheer - dt * 0.8);
    const d = this.dummy, ch = Math.min(1, this.cheer), sp = 2.2 + ch * 7;
    for (let i = 0; i < this.crowdN; i++) {
      const p = this.spots[i], b = Math.abs(Math.sin(time * sp + this.phase[i])) * (0.03 + ch * 0.2);
      d.position.set(p.x, p.y + 0.17 + b, p.z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); this.bodies.setMatrixAt(i, d.matrix);
      d.position.y += 0.3; d.updateMatrix(); this.heads.setMatrixAt(i, d.matrix);
    }
    this.bodies.instanceMatrix.needsUpdate = true; this.heads.instanceMatrix.needsUpdate = true;
    for (let s = 0; s < 2; s++) {
      const t = this.trainers[s], u = t.userData;
      u.cheer = Math.max(0, u.cheer - dt * 1.4);
      u.body.position.y = 0.62 + Math.sin(time * 2.2 + s * 2) * 0.012 + Math.abs(Math.sin(time * 9)) * 0.08 * Math.min(1, u.cheer);
      u.body.rotation.z = -0.06 - Math.min(1, u.cheer) * 0.1;
      u.head.rotation.y = Math.sin(time * 0.6 + s) * 0.25;
      u.arms[0].rotation.z = 0.1 + Math.min(1, u.cheer) * 2.4; u.arms[1].rotation.z = 0.1 + Math.min(1, u.cheer) * (1.2 + Math.sin(time * 14) * 0.5);
    }
  }
  command(side) { this.trainers[side].userData.cheer = 1; }
}
