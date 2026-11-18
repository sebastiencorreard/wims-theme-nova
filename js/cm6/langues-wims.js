// Nova : langues de WIMS pour l'éditeur de code (js/cm6-wims.js, chargé à la demande par js/cm6.js ; 2026-11-18,
// utilisateur : remplacer EditArea partout). OEF, WIMS (.phtml, .proc), WIMS data, Flydraw, Pari/GP, Octave, diff.
// Mots repris des syntaxes d'EditArea (mots-wims.js) ; règles écrites pour Nova, plus fines que celles d'EditArea
// (commentaires « !! » de WIMS, « %% » d'OEF, « \\ » et « /* */ » de GP, lignes < > de diff). Octave : mode de
// @codemirror/legacy-modes. S'inscrit dans window.NovaEditeur.langues.
import { StreamLanguage } from '@codemirror/language';
import { octave } from '@codemirror/legacy-modes/mode/octave';
import * as e from 'nova-etiquettes';
import { langueBarre } from './langue-documents.js';
import * as M from './mots-wims.js';

const liste = (...l) => new Set([].concat(...l));
const TABLE = {
  controle: e.controle, commande: e.commande, predefinie: e.predefinie, variable: e.variable, type: e.type,
  fonction: e.fonction, condition: e.condition, balise: e.balise, attribut: e.attribut, chaine: e.chaine,
  commentaire: e.commentaire, maths: e.maths, nombre: e.nombre, accolade: e.accolade, supprime: e.supprime,
  insere: e.insere, entete: e.entete,
};

// --- OEF : même syntaxe que les documents, mots d'oefdoc.pl.
const oef = langueBarre('wimsoef', {
  controle: liste(['if', 'for', 'while', 'else', 'def', 'define', 'comment']),
  commandes: liste(M.OEF_COMMANDES, M.OEF_SPECIAL),
  types: liste(M.OEF_TYPES), typesCommandes: true,
  predefinies: (m) => /^(reply|choice|step|sc_reply|reply_)\d*$/.test(m) || M.OEF_PREDEFINIES.includes(m),
  fonctions: liste(M.OEF_FONCTIONS), conditions: liste(M.OEF_CONDITIONS),
  commentaireLigne: '%%', reponses: liste(M.OEF_REPONSES), slib: liste(M.OEF_SLIB),
});

// --- Variables de WIMS : $nom, $(…), $[…] (calcul), à parenthèses imbriquées.
function variableWims(flux) {
  if (!flux.eat('$')) return null;
  const ouvre = flux.peek();
  if (ouvre === '(' || ouvre === '[') {
    const ferme = ouvre === '(' ? ')' : ']';
    let n = 0;
    while (!flux.eol()) {
      const c = flux.next();
      if (c === ouvre) n++;
      else if (c === ferme && --n === 0) break;
    }
    return ouvre === '[' ? 'maths' : 'variable';
  }
  flux.match(/^\w*/);
  return 'variable';
}
function baliseHtml(flux, etat) {
  if (flux.eatSpace()) return null;
  if (flux.eat('>')) { etat.balise = false; return 'balise'; }
  if (flux.match(/^[\w:-]+(?==)/)) return 'attribut';
  if (flux.eat('=')) return 'balise';
  if (flux.match(/^"[^"]*"?/) || flux.match(/^'[^']*'?/)) return 'chaine';
  const v = variableWims(flux);
  if (v) return v;
  flux.next();
  return 'balise';
}

// --- WIMS (.phtml, .proc) : « !! » commentaire, « !commande » (contrôle ou commande), variables, HTML.
const WIMS_CONTROLE = liste(['if', 'ifval', 'else', 'endif', 'for', 'next', 'while', 'endwhile', 'goto', 'label', 'exit',
  'return', 'break', 'read', 'readproc', 'exec', 'restart', 'changeto', 'header', 'tail']);
const WIMS_COMMANDES = liste(M.WIMS_COMMANDES);
const WIMS_CONDITIONS = liste(M.WIMS_CONDITIONS);
const WIMS_LOGICIELS = liste(M.WIMS_LOGICIELS);
const wims = StreamLanguage.define({
  name: 'wims',
  startState: () => ({ balise: false }),
  copyState: (s) => Object.assign({}, s),
  token(flux, etat) {
    if (flux.sol()) {
      flux.eatSpace();
      if (flux.match('!!')) { flux.skipToEnd(); return 'commentaire'; }
      if (flux.peek() === ':' && flux.pos === 0) { flux.skipToEnd(); return 'entete'; }
      if (flux.pos > 0) return null;
    }
    if (etat.balise) return baliseHtml(flux, etat);
    const c = flux.match(/^!([a-z]\w*)/);
    if (c) return WIMS_CONTROLE.has(c[1]) ? 'controle' : WIMS_COMMANDES.has(c[1]) ? 'commande' : 'variable';
    const v = variableWims(flux);
    if (v) return v;
    if (flux.match(/^<!--.*?(-->|$)/)) return 'commentaire';
    if (flux.match(/^<\/?[A-Za-z][\w-]*/)) { etat.balise = true; return 'balise'; }
    const mot = flux.match(/^[A-Za-z_]\w*/);
    if (mot) return WIMS_CONDITIONS.has(mot[0]) ? 'condition' : WIMS_LOGICIELS.has(mot[0]) ? 'fonction' : null;
    if (flux.match(/^\d+(\.\d+)?/)) return 'nombre';
    if (flux.match(/^(==|!=|<=|>=)/) || flux.eat(/[<>=]/)) return 'condition';
    if (flux.eat(/[{}]/)) return 'accolade';
    flux.next();
    return null;
  },
  tokenTable: TABLE,
});

// --- WIMS data : « :nom » en tête d'enregistrement, ??question??, variables, HTML.
const wimsdata = StreamLanguage.define({
  name: 'wimsdata',
  startState: () => ({ balise: false }),
  copyState: (s) => Object.assign({}, s),
  token(flux, etat) {
    if (flux.sol() && flux.eat(':')) { flux.skipToEnd(); return 'entete'; }
    if (etat.balise) return baliseHtml(flux, etat);
    if (flux.match(/^\?\?[^?]*\?\?/)) return 'predefinie';
    const v = variableWims(flux);
    if (v) return v;
    if (flux.match(/^\\[A-Za-z_]\w*/)) return 'variable';
    if (flux.match(/^<!--.*?(-->|$)/)) return 'commentaire';
    if (flux.match(/^<\/?[A-Za-z][\w-]*/)) { etat.balise = true; return 'balise'; }
    if (flux.match(/^\d+(\.\d+)?/)) return 'nombre';
    if (flux.eat(/[{}]/)) return 'accolade';
    flux.next();
    return null;
  },
  tokenTable: TABLE,
});

// --- Flydraw : une commande par ligne (premier mot), variables $… et \…, nombres.
const FLYDRAW = liste(M.FLYDRAW);
const flydraw = StreamLanguage.define({
  name: 'flydraw',
  token(flux) {
    if (flux.sol()) {
      flux.eatSpace();
      if (flux.match(/^#.*/)) return 'commentaire';
      const m = flux.match(/^[a-z]\w*/);
      if (m) return FLYDRAW.has(m[0]) ? 'commande' : null;
      if (flux.pos > 0) return null;
    }
    const v = variableWims(flux);
    if (v) return v;
    if (flux.match(/^\\[A-Za-z_]\w*/)) return 'variable';
    if (flux.match(/^"[^"]*"?/)) return 'chaine';
    if (flux.match(/^-?\d+(\.\d+)?/)) return 'nombre';
    flux.next();
    return null;
  },
  tokenTable: TABLE,
});

// --- Pari/GP : « \\ » et « /* */ » commentaires, chaînes, mots-clés, fonctions.
const GP_CONTROLE = liste(M.GP_CONTROLE);
const GP_REGLAGES = liste(M.GP_REGLAGES);
const GP_FONCTIONS = liste(M.GP_FONCTIONS);
const gp = StreamLanguage.define({
  name: 'gp',
  startState: () => ({ bloc: false }),
  copyState: (s) => Object.assign({}, s),
  token(flux, etat) {
    if (etat.bloc) {
      if (flux.skipTo('*/')) { flux.match('*/'); etat.bloc = false; } else flux.skipToEnd();
      return 'commentaire';
    }
    if (flux.match('\\\\')) { flux.skipToEnd(); return 'commentaire'; }
    if (flux.match('/*')) { etat.bloc = true; return 'commentaire'; }
    if (flux.match(/^"(?:[^"\\]|\\.)*"?/)) return 'chaine';
    const mot = flux.match(/^[A-Za-z_]\w*/);
    if (mot) return GP_CONTROLE.has(mot[0]) ? 'controle' : GP_REGLAGES.has(mot[0]) ? 'predefinie' : GP_FONCTIONS.has(mot[0]) ? 'fonction' : null;
    if (flux.match(/^\d+(\.\d*)?(e[+-]?\d+)?/i)) return 'nombre';
    if (flux.match(/^(==|!=|<=|>=|&&|\|\|)/) || flux.eat(/[<>!]/)) return 'condition';
    if (flux.eat(/[{}]/)) return 'accolade';
    flux.next();
    return null;
  },
  tokenTable: TABLE,
});

// --- diff : comparaisons de Modtool (format normal < >, et unifié + - @@).
const diff = StreamLanguage.define({
  name: 'diff',
  token(flux) {
    const ligne = flux.string;
    flux.skipToEnd();
    if (/^(<|-(?!--))/.test(ligne)) return 'supprime';
    if (/^(>|\+(?!\+\+))/.test(ligne)) return 'insere';
    if (/^(\d+(,\d+)?[acd]\d+(,\d+)?$|@@|diff |Only in |Seulement dans |---|\+\+\+|\*\*\*)/.test(ligne)) return 'entete';
    return null;
  },
  tokenTable: TABLE,
});

Object.assign(window.NovaEditeur.langues, {
  wimsoef: oef, wims, wimsdata, flydraw, gp, diff, octave: StreamLanguage.define(octave),
});
