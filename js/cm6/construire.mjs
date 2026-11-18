// Nova : assemble l'éditeur de code (lancé par construire-cm6.sh ; 2026-11-18). Quatre fichiers, chacun en IIFE, ASCII
// seul (fichiers du thème lus en windows-1252), réduits :
//   js/cm6.js         éditeur, barre, langue des documents (entree.js)
//   js/cm6-wims.js    OEF, WIMS, WIMS data, Flydraw, Pari/GP, Octave, diff (langues-wims.js)
//   js/cm6-web.js     HTML, CSS, JavaScript (langues-web.js)
//   js/cm6-python.js  Python (langues-python.js)
// Les fichiers de langues ne recopient pas les modules que CodeMirror veut uniques (état, vue, langage, arbre,
// étiquettes) : ils les prennent dans window.NovaEditeur.modules, posé par cm6.js.
// usage : node construire.mjs <dossier outils-js> <empreinte>
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const [outils, empreinte] = process.argv.slice(2);
const require = createRequire(path.resolve(outils, 'package.json'));
const esbuild = require('esbuild');
const ici = path.dirname(fileURLToPath(import.meta.url));
const theme = path.resolve(ici, '../..');
const PARTAGES = ['@codemirror/state', '@codemirror/view', '@codemirror/language', '@lezer/common', '@lezer/highlight', 'nova-etiquettes'];
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

const etiquettes = { name: 'etiquettes', setup(b) { b.onResolve({ filter: /^nova-etiquettes$/ }, () => ({ path: path.join(ici, 'etiquettes.js') })); } };
const partages = { name: 'partages', setup(b) {
  b.onResolve({ filter: new RegExp('^(' + PARTAGES.map(echapper).join('|') + ')$') }, (a) => ({ path: a.path, namespace: 'nova-partage' }));
  b.onLoad({ filter: /.*/, namespace: 'nova-partage' }, (a) => ({ contents: 'module.exports = window.NovaEditeur.modules[' + JSON.stringify(a.path) + '];', loader: 'js' }));
} };

const SORTIES = [
  ['entree.js', 'cm6.js', etiquettes, 'CodeMirror 6 et langue des documents de WIMS'],
  ['langues-wims.js', 'cm6-wims.js', partages, 'langues de WIMS (OEF, WIMS, WIMS data, Flydraw, Pari/GP, Octave, diff)'],
  ['langues-web.js', 'cm6-web.js', partages, 'HTML, CSS et JavaScript (paquets de CodeMirror 6)'],
  ['langues-python.js', 'cm6-python.js', partages, 'Python (paquet de CodeMirror 6)'],
];
for (const [source, sortie, greffon, objet] of SORTIES) {
  const r = await esbuild.build({
    entryPoints: [path.join(ici, source)], bundle: true, minify: true, format: 'iife', charset: 'ascii', legalComments: 'none',
    target: 'es2019', write: false, logLevel: 'warning', nodePaths: [path.resolve(outils, 'node_modules')], plugins: [greffon],
  });
  const entete = `/*! Nova, js/${sortie} ${empreinte} : ${objet}. CodeMirror 6 (MIT, codemirror.net), assemble par construire-cm6.sh (GPL v2+). Sources : js/cm6. */\n`;
  fs.writeFileSync(path.join(theme, 'js', sortie), entete + r.outputFiles[0].text);
}
