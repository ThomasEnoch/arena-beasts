/* Arena Beasts - version stamp. Run before each commit:  node tools/stamp.js
   A browser keeps each file for some minutes. After a new release it can thus mix old files with new files, and the game breaks.
   This tool puts one version on the address of each file that the page loads (file.js?v=VERSION). A new version is a new address,
   so the browser gets all files of a release together.

   The version is a hash of the contents of the site files. It changes only when a file changes.
   What the tool writes into index.html:
     - window.AB_V = 'VERSION'                    (main.js and app.js use it for the files that they load at run time)
     - css/style.css?v=VERSION and js/*.js?v=VERSION on the link and script tags
     - the import map: one entry for each module in js/gfx, so that "import './rig.js'" inside a module gets the version too
   Options:  --check  = change nothing; exit code 1 if index.html does not have the current version. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), check = process.argv.includes('--check');
const THREE_MAP = { 'three': 'https://unpkg.com/three@0.160.0/build/three.module.js', 'three/addons/': 'https://unpkg.com/three@0.160.0/examples/jsm/' };

function walk(dir, out) {
  for (const n of fs.readdirSync(path.join(root, dir)).sort()) {
    const rel = dir + '/' + n, st = fs.statSync(path.join(root, rel));
    if (st.isDirectory()) walk(rel, out); else if (/\.(js|css)$/.test(n)) out.push(rel);
  }
  return out;
}
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
// index.html without the parts that this tool writes
const bare = html => html
  .replace(/window\.AB_V = '[^']*'/, "window.AB_V = ''")
  .replace(/\?v=[0-9a-f]+/g, '')
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, '<script type="importmap"></script>');

const files = walk('js', []).concat(walk('css', []), ['LORE.md']);
const html0 = read('index.html');
const h = crypto.createHash('sha256');
h.update(bare(html0));
for (const f of files) { h.update('\0' + f + '\0'); h.update(read(f)); }
const V = h.digest('hex').slice(0, 10);

const imports = Object.assign({}, THREE_MAP);
for (const f of files) if (f.indexOf('js/gfx/') === 0) imports['./' + f] = './' + f + '?v=' + V;
let html = bare(html0);
if (!/window\.AB_V = ''/.test(html)) throw new Error('index.html: the line "window.AB_V = \'...\'" is missing');
if (!/<script type="importmap"><\/script>/.test(html)) throw new Error('index.html: the import map tag is missing');
html = html
  .replace("window.AB_V = ''", "window.AB_V = '" + V + "'")
  .replace('<script type="importmap"></script>', '<script type="importmap">' + JSON.stringify({ imports }) + '</script>')
  .replace(/(<link rel="stylesheet" href="css\/[^"?]+)"/g, '$1?v=' + V + '"')
  .replace(/(<script[^>]* src="js\/[^"?]+)"/g, '$1?v=' + V + '"');

if (html === html0) { console.log('version ' + V + ' (index.html is up to date)'); process.exit(0); }
if (check) { console.log('index.html does not have the current version ' + V + '. Run: node tools/stamp.js'); process.exit(1); }
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('version ' + V + ' written to index.html (' + files.length + ' files in the hash, ' + (Object.keys(imports).length - 2) + ' modules in the import map)');
