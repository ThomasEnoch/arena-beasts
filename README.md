# Arena Beasts

A real-time creature battle game for the browser. 20 Beasts, solo play against the AI, and online play for 2 players.

Play: https://thomasenoch.github.io/arena-beasts/

## Run it on your computer

```bash
node serve.js
```

Then open http://localhost:5173. There is no build step.

## The version stamp

A git hook stamps the version at each commit. Switch the hook on one time for each copy of the repository:

```bash
git config core.hooksPath tools/hooks
```

After that, `git commit` runs `tools/stamp.js` and adds `index.html` to the commit. To run the tool by hand:

```bash
node tools/stamp.js
```

A browser keeps each file for some minutes. After a release it can mix old files with new files, and the game breaks.
The stamp tool puts one version on the address of each file that the page loads (`file.js?v=VERSION`), so that the browser
gets all files of a release together. The version is a hash of the file contents. It changes only when a file changes.

The tool writes into `index.html` only. `node tools/stamp.js --check` changes nothing and fails if the stamp is old.

If you add a file that the page loads at run time (not through a `<script>` tag or an `import`), add `?v=` + `window.AB_V` to its address,
as `js/main.js` does for `LORE.md`.

## Tests

```bash
node test/sim.js 400 hard
```

AI against AI: balance and errors.

```bash
node test/build-models.mjs
```

Builds each creature model without a browser. It needs `npm i three@0.160.0 --no-save` one time.

- `test/viewer.html?id=<id>`: one model from 3 sides.
- `test/gallery.html`: all models in a grid. `?pose=sim` shows them in motion.

## Screens and settings

| File | Contents |
|---|---|
| `js/settings.js` | `G.SET`: the one store for all settings of the player (name, difficulty, volume, mute, screen shake, graphics, keys). |
| `js/ui.js` | `G.UI`: the title screen, the Settings screen (4 tabs) and the pause menu. It also changes between the screens. |
| `js/main.js` | The Beast screen (views: solo, online, beasts), the online lobby, the battle flow, the input and the loop. |

- To add a setting: add its default value and its check in `js/settings.js`. Then add a row to a tab in `index.html` and connect it in `js/ui.js`.
- To add a Settings tab: add a button to `#stabs` and a section with the id `tab-<name>` in `index.html`.
- To add a screen: add its element to `index.html` and show it in `UI.go` in `js/ui.js`.
- The Beast grid shows 4 rows of 5. With more than 20 Beasts, the grid scrolls.

## Documents

- `LORE.md`: the world and the story of each Beast. The source of truth for models, moves and texts.
- `MODEL_GUIDE.md`: the rules for creature models, motion, paint and finish.
