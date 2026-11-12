/* Headless check of creature models: builds each blueprint, makes a Creature, runs its animation in many poses.
   Run: node test/build-models.mjs [id ...]   (needs: npm i three@0.160.0 --no-save) */
const ctx = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : typeof k === 'string' ? (() => {}) : undefined, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
const { register, blueprint, Creature, newPose } = await import('../js/gfx/rig.js');
const fs = await import('node:fs');
let ids = process.argv.slice(2);
if (!ids.length) ids = fs.readdirSync(new URL('../js/gfx/models/', import.meta.url)).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
let bad = 0;
for (const id of ids) {
  try {
    const def = (await import('../js/gfx/models/' + id + '.js')).default;
    if (def.id !== id) throw new Error('def.id "' + def.id + '" does not match the file name');
    register(def);
    const t0 = performance.now(), bp = blueprint(id), ms = performance.now() - t0, c = new Creature(id), bb = bp.geo.boundingBox;
    for (const k of ['melee', 'shot', 'slam', 'buff']) for (const key of ['mv', 'a', 's', 'h', 'gl']) {
      const t = newPose(); t.k = k; t[key] = 1; t.sw = 0.7; t.sl = -0.4; t.tm = 1.3; t.p = 2.1; t.w = 4; t.o = 1; c.update(t);
      for (const b of c.boneList) if (!isFinite(b.position.x + b.rotation.x + b.scale.x + b.position.y + b.rotation.y + b.position.z + b.rotation.z)) throw new Error('NaN in bone ' + b.name + ' (pose ' + key + ', ' + k + ')');
    }
    if (def.focus && !c.parts[def.focus] && !c.b[def.focus]) throw new Error('focus "' + def.focus + '" is not a bone or a named part');
    console.log('ok   ' + id.padEnd(16) + bp.verts + ' verts, ' + bp.bones.length + ' bones, ' + bp.atts.length + ' parts, ' + bp.eyes.length + ' eyes, build ' + ms.toFixed(0) + ' ms, body box x[' + bb.min.x.toFixed(2) + ',' + bb.max.x.toFixed(2) + '] y[' + bb.min.y.toFixed(2) + ',' + bb.max.y.toFixed(2) + '] z[' + bb.min.z.toFixed(2) + ',' + bb.max.z.toFixed(2) + ']');
  } catch (e) { bad++; console.log('FAIL ' + id + ': ' + (e.stack || e).split('\n').slice(0, 3).join(' | ')); }
}
process.exit(bad ? 1 : 0);
