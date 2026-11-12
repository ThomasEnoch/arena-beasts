# Arena Beasts - how to write a creature model

A creature model is one ES module in `js/gfx/models/<id>.js` that default-exports a definition object.
The game builds a skinned 3D mesh from it at load time. There are no asset files: everything is code.

## Read these files first (in the project root)
- `js/gfx/sculpt.js` - the `Sculpt` class (volumes, bones, parts, eyes). This is the API you call in `build(S)`.
- `js/gfx/rig.js` - `Creature`, `fxMat` (material description fields), eye options, `newPose`, helpers `A.quad`, `A.chain`.
- `js/gfx/geo.js` - geometry helpers for rigid parts: `tube`, `blade`, `wing`, `lathe`, `crystal`, `ball`, `cone`, `rbox`, `torus`, `flame`, `canvasTex`.
- `LORE.md` - the story, the look, the heart piece and the maker's mark of each Beast. The model must agree with it.
- Finished examples: the 20 files in `js/gfx/models/`. `kilnhound.js` (quadruped), `basaltgorilla.js` (biped), `censerserpent.js` (bone chain), `compasshawk.js` (hover bird), `chandeliermoth.js` (many rigid parts).

## Model space
- +X = forward (the creature looks at +X). +Y = up. Z = side. Feet on y = 0. Centre of the body above the origin.
- A name that ends in `L` is on +Z. `{ m: 1 }` makes the mirror twin on -Z with the name ending in `R`.
- Size classes (the game scales the model): S x0.75, M x0.875, L x1.0. Build all classes at about the same model size:
  body length 1.2 to 2.2, height 1.0 to 2.0, half-width up to 0.8 (wings can go to 1.4).
- Hover creatures: body centre at y 0.8 to 1.0, lowest point not below y 0.2. The game adds the bob motion; add your own small bob too.

## Sculpt volumes (the skinned body)
`S.ell(bone, centre, radii, o)`, `S.cap(bone, a, b, ra, rb, o)`, `S.box(bone, centre, half, round, o)`, `S.tor(bone, centre, R, r, o)`, `S.tube(bones, pts, radii, o)`.
Options `o`: `col` (hex), `k` (blend radius: 0.06 default; 0.008-0.03 = hard seam for plates and mechanical parts; 0.08 = soft organic),
`glow` (emissive x colour: 1 to 3.5 is visible, bloom starts near 1.5), `gloss` 0..1, `metal` 0..1, `cb` (colour blend width),
`sub: 1` (cut a hole; its col/glow colours the inside), `paint: 1` (colour only, no shape; `op` = opacity), `m: 1` (mirror), `rot: [x, y, z]` degrees.
- Grid cell is 0.028 (`opts: { cell: 0.024 }` for small detailed creatures; never below 0.024). A feature thinner than about 0.05 will vanish:
  make thin things (wires, needles, antennas, thin legs, feathers, glass sheets, blades) as rigid parts.
- Order matters: later volumes blend onto earlier ones; a `sub` cuts only what was added before it.
- Every volume belongs to a bone. Skin weights come from the volumes, so give each moving section its own volumes and bone.
- Use metal for brass, steel, copper, gold, iron: `{ metal: 1, gloss: 0.5 }`. Use `k` 0.01-0.02 so metal parts keep crisp edges.

## Finish (no matte surfaces)
Each solid surface has a clear coat, set in FINISH in js/gfx/rig.js. It gives a sharp highlight and a reflection on all materials.
- Do not make a surface matte to show that it is rough. Use shape (grooves, studs, plates) to show that.
- coat: 0 in a material description removes the coat from one rigid part. Glass, flames and glow parts (noOut) have no coat.
- The coat is weaker on bright colours, so that white surfaces do not wash out.

## Paint rules (colour is stored for each vertex)
The body has no texture. Each vertex has one colour, and the vertices are about 0.028 apart.
- A soft paint volume (a large cb, or op below 1) becomes a blur. It looks as if the texture did not load. Do not use it for rust, soot, stains or light patches.
- A thin painted line (radius below about 0.04) breaks into dashes. Do not paint cracks, seams, veins or stripes.
- For a glowing crack or seam: cut a groove with sub: 1 (radius 0.03 or more, k 0.008) and give it the glow, or add a thin flat tube as a rigid part with a glow material.
- For stripes, marks, letters and patterns: add a thin rigid plate with a canvasTex map.
- Paint is good for large areas with a hard edge: a polished face, a band, a belly, a medallion (cb 0.012, no op).
- Keep mottle at 0.1 or less on metal and stone. Higher values make the surface look dirty.

## Bones
`S.bone(name, parent, [x, y, z], { m: 1 })` - the position is the pivot in model space. First bone: `S.bone('root', null, [0, 0, 0])`.
Keep it under about 40 bones. Chains (tail, neck, tentacle): 3 to 5 bones.

## Rigid parts
`S.add(bone, geometry, materialDescription, { p: [x, y, z], r: [degX, degY, degZ], s: scale, m: 1, name: 'x', order: 'YXZ' })`
- The geometry is relative to `p`. A named part is in `c.parts[name]` inside `anim` (mirror twin: name ending in `R`).
- Material description fields: `col`, `rough`, `metal`, `glow` (emissive hex), `glowK`, `flat` (faceted), `map`, `emap`, `op` (opacity, for glass: 0.35-0.6),
  `add` (additive), `noOut: true` (no ink outline: use it for thin sheets, glass, flames, glow balls), `env` (reflection strength).
- Define each material description once as a constant and reuse the same object.
- Glass: `{ col: '#8fd0ff', op: 0.45, rough: 0.05, env: 1.5, noOut: true }`. Put a glowing part inside it.
- Textured flat parts (wings, fans, sails): `wing(outline, thickness)` + `canvasTex(w, h, draw)` as `map`. Create the texture once (module variable), inside `build`.

## Eyes
`S.eye(bone, p, radius, { dir: [x, y, z], iris, iris2, pupil: 'round'|'slit'|'bar'|'none', sclera, lid, open, tilt, glow, size, m: 1 })`
- `open`: 16 = narrow and fierce, 45 = normal, 70 = wide. `tilt`: negative = angry brow. `lid` = colour of the skin around the eye.
- Mechanical lens eye: dark `sclera`, bright `iris`, `glow: 1` or more. The eye must sit half inside the head volume.

## Animation: `anim(b, t, c)`
`b` = bones by name, reset to rest each frame. Add to `rotation` / `position` / `scale`. `c.parts` = named parts (also reset each frame).
Pose `t`: `p` idle phase, `w` walk phase (follows the distance), `o` orbit phase, `tm` seconds, `mv` 0..1 moving,
`a` 0..1 wind-up, `s` strike (1 then falls to 0 in 0.3 s), `h` hurt, `sw` forward lag (+ when it moves forward), `sl` side lag,
`gl` 0..1 ultimate ready, `u` 0..1 ultimate active (the wind-up, the action and the time that its form lasts), `lk` look -1..1, `k` strike style: `'melee'`, `'shot'`, `'slam'` (area burst around itself), `'buff'`.
Sign rules:
- `rotation.z` + lifts the nose of a forward-pointing part. A leg that hangs down swings forward with `rotation.z` +.
- With `t.sw` > 0: parts that point up lean back with `rotation.z` +; parts that hang down trail with `rotation.z` -.
- With `t.sl`: parts that point back yaw with `rotation.y` + `t.sl`; parts that point up lean with `rotation.x` + `t.sl`.
- A mirrored `R` bone needs the opposite sign for `rotation.x` and `rotation.y`.
Every creature must have: idle breathing or hum, a walk or float cycle from `t.w` / `t.mv`, wind-up anticipation from `t.a`,
a different strike for at least 2 styles of `t.k`, a hurt flinch from `t.h`, secondary motion from `t.sw` / `t.sl`, more glow or motion with `t.gl`, and a pose for the ultimate from `t.u` that no other pose uses.

## Motion of the body (new)
The game measures how the body moves and puts it in the pose. Use these fields to make the motion natural.
All values are in model units and model axes (+X forward, +Z = the L side).
- `t.vf`, `t.vs`: speed forward and to the L side (about 2.6 at full speed). Negative `vf` = it walks backward. Use them for strafe and back-step gaits.
- `t.af`, `t.as`: acceleration forward and to the L side (up to about 40 at a start or a stop).
- `t.va`: speed upward (jumps, lifts, landings).
- `t.tn`: turn rate, -1..1. Positive = the body turns to its L side. With no walk input the creature turns on the spot: `t.w` still advances and `t.mv` rises to about 0.5, so the legs step.
- `t.hd`: angle in rad from the nose to the aim direction. Positive = the aim is on the L side. The rig turns the head (and neck) by this angle before the body follows.
- `t.hx`, `t.hz`: direction of the push of the last hit (unit vector). Multiply with `t.h`. `hx` < 0 = pushed backward.
- To turn a forward-pointing bone to the L side: `rotation.y -= angle`. To lean an upright bone to the L side: `rotation.x += angle`.
The game already does these things to the whole body, do not repeat them: the turn itself, lean into a turn, dip with acceleration, rock with a hit, a small bob for each step.

## Spring bones and head lead (new)
Add these two optional fields to the definition object.
```js
dyn: [
  { b: ['tail1', 'tail2', 'tail3'], k: 55, d: 6.5, amt: 1, drag: 3 },      // a chain: from its root to its tip
  { b: ['earL'], k: 90, d: 8, amt: 0.6 }, { b: ['earR'], k: 90, d: 8, amt: 0.6 },
  { b: ['chainA'], k: 30, d: 4, drag: 5, dir: [0, -1, 0] }               // a named rigid part that hangs down
],
rig: { head: 'head', neck: ['neck1', 'neck2'] }
```
- `dyn`: each listed bone or named part gets spring motion from the acceleration, the speed and the turn of the body. It lags, swings past and settles (follow-through). Later bones in a chain are softer, so the chain whips.
  `k` stiffness (30 = loose cord, 55 = tail, 90 = stiff antenna or ear), `d` damping (4 = swings long, 8 = settles fast), `amt` strength, `drag` how much it trails behind when the body moves (0 = heavy part, 5 = ribbon, flame or feather), `dir` where the part points (only necessary for rigid parts, or when the bone order does not show it).
  A rigid part swings round its own origin `p`: put the origin at the point where the part is attached.
- Without a `dyn` field the rig uses bones whose names start with tail, ant, ear, lure, chain, whisk, tent, wire, plume, tassel, cord, crest, frill, kelp, drop, beard, ribbon, fringe (at reduced strength). An explicit `dyn` list is better. `dyn: []` turns it off.
- When a part is in `dyn`, remove the hand-made sway from `t.sw` / `t.sl` on that part in `anim`, or the motion is doubled. Keep the motion that the creature makes on purpose (a wag, a lash, a flick).
- `rig`: names of the head bone and the neck bones. Default: a bone named `head` and bones named `neck`, `neck1`, ... If the head bone has another name, set `rig.head`. `rig: { head: null }` is not supported: a creature with no head bone gets no head lead.
- See it in motion: `test/gallery.html?ids=<id>&pose=sim&zoom=0.8` runs a loop of start, run, turn, side step, stop and hit. Add `&game=1` for the high camera of the battle.

## Definition object
```js
export default {
  id: 'kilnhound',            // = file name
  rim: '#ffb070',             // edge light colour
  focus: 'core',              // bone or named part where the element particles come out
  top: 1.6,                   // height of the highest point in model units (for the HP bar)
  opts: { cell: 0.028, mottle: 0.1, mottleF: 9 },   // optional. mottle = surface noise (0.04 for clean metal, 0.2 for fur)
  rough: 0.6,                 // optional body roughness
  build(S) { ... },
  anim(b, t, c) { ... }
};
```

## Quality bar
- 30 to 70 volumes and 6 to 30 rigid parts. A clear silhouette that matches the description from 10 metres.
- 3 to 5 palette colours with material contrast: matte against metal against glow. Add paint volumes for markings.
- At least one glow feature. Keep base colours darker than `#e8e8e8` (pure white burns out under the bloom).
- No flat single-colour blobs. Add secondary forms: rivets, bands, plates, seams, toes, joints.
- All names in code are original. No names from existing games or shows.

## Check your work
Run from the project root: `node test/build-models.mjs <id> [<id> ...]`
It builds the model without a browser, runs the animation in all poses and prints the body box. Fix all `FAIL` lines.
The printed box is the sculpted body only (rigid parts are not included). Check it against the size rules.
View the model: `test/viewer.html?id=<id>&still=1` on the preview server. Options: `&one=1`, `&zoom=`, `&yaw=`, `&pitch=`, `&pose=idle|move|wind|strike|hurt|ult|cycle`, `&k=melee|shot|slam|buff`, `&glow=1`, `&t=`.
