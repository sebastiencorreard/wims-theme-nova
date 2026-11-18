// Nova : langues « à barre oblique inverse » de WIMS pour CodeMirror 6 (2026-11-18, utilisateur, maquette B) : documents
// (msg2wims : documents de la classe, pages de présentation des feuilles, modules de documents) et exercices OEF (la
// fabrique est reprise par langues-wims.js). Analyse ligne à ligne (StreamLanguage, même principe qu'un mode de
// CodeMirror 5) ; \comment{...} à accolades imbriquées et \( ... \) peuvent passer d'une ligne à l'autre.
// Documents : commandes de modules/adm/doc/primitives ; variables qu'adm/sheet donne à une page de présentation
// (scripts/adm/docsheet.prep) ; types, fonctions et conditions repris de la syntaxe wimsoef d'EditArea.
import { StreamLanguage } from '@codemirror/language';
import * as e from 'nova-etiquettes';

const liste = (mots) => new Set(mots);

/* o : controle, commandes, types (\def{type x=…} ; avec typesCommandes, aussi \type{…} en OEF), predefinies (Set ou
   fonction), fonctions, conditions, commentaireLigne (ex. '%%'), reponses (mots de type=… d'une réponse OEF), slib. */
export function langueBarre(nom, o) {
  const estPredefinie = typeof o.predefinies === 'function' ? o.predefinies : (m) => o.predefinies.has(m);
  return StreamLanguage.define({
    name: nom,
    startState: () => ({ commentaire: 0, maths: false, balise: false, def: false, type: false }),
    copyState: (s) => Object.assign({}, s),
    token(flux, etat) {
      if (o.commentaireLigne && flux.sol() && flux.match(o.commentaireLigne)) { flux.skipToEnd(); return 'commentaire'; }
      if (etat.commentaire === 0 && flux.match('\\comment{')) etat.commentaire = 1;
      // Commentaire en cours : on compte les accolades jusqu'à la fermante du \comment{.
      if (etat.commentaire > 0) {
        while (!flux.eol()) {
          const c = flux.next();
          if (c === '{') etat.commentaire++;
          else if (c === '}' && --etat.commentaire === 0) break;
        }
        return 'commentaire';
      }
      if (etat.maths) {
        if (flux.skipTo('\\)')) { flux.match('\\)'); etat.maths = false; } else flux.skipToEnd();
        return 'maths';
      }
      if (etat.balise) {
        if (flux.eatSpace()) return null;
        if (flux.eat('>')) { etat.balise = false; return 'balise'; }
        if (flux.match(/^[\w:-]+(?==)/)) return 'attribut';
        if (flux.eat('=')) return 'balise';
        if (flux.match(/^"[^"]*"?/) || flux.match(/^'[^']*'?/)) return 'chaine';
        if (flux.match(/^\\[A-Za-z_]\w*/)) return 'variable';
        flux.next();
        return 'balise';
      }
      if (flux.match('\\(')) { etat.maths = true; return 'maths'; }
      const commande = flux.match(/^\\([A-Za-z_]\w*)/);
      if (commande) {
        const n = commande[1];
        if (n === 'def' || n === 'define') etat.def = true;
        if (o.controle.has(n)) return 'controle';
        if (o.typesCommandes && o.types.has(n)) return 'type';
        if (o.commandes.has(n)) return 'commande';
        return estPredefinie(n) ? 'predefinie' : 'variable';
      }
      if (etat.def && flux.eat('{')) {
        etat.def = false;
        const t = flux.match(/^\s*(\w+)(?=\s)/, false);
        if (t && o.types.has(t[1])) etat.type = true;
        return 'accolade';
      }
      if (etat.type) { etat.type = false; flux.eatSpace(); flux.match(/^\w+/); return 'type'; }
      if (flux.match(/^<!--.*?(-->|$)/)) return 'commentaire';
      if (flux.match(/^<\/?[A-Za-z][\w-]*/)) { etat.balise = true; return 'balise'; }
      if (o.reponses && flux.match(/^type\s*=\s*/)) { const m = flux.match(/^\w+/); return m && o.reponses.has(m[0]) ? 'type' : 'condition'; }
      if (o.slib) { const m = flux.match(/^[a-z]+\/[\w-]+/, false); if (m && o.slib.has(m[0])) { flux.match(m[0]); return 'predefinie'; } }
      const mot = flux.match(/^[A-Za-z_]\w*/);
      if (mot) {
        if (o.fonctions.has(mot[0]) && /^\s*\(/.test(flux.string.slice(flux.pos))) return 'fonction';
        if (o.conditions.has(mot[0])) return 'condition';
        return null;
      }
      if (flux.match(/^\d+(\.\d+)?/)) return 'nombre';
      if (flux.eat(/[{}]/)) return 'accolade';
      if (flux.match(/^(==|!=|<=|>=|\.\.)/) || flux.eat(/[<>=]/)) return 'condition';
      flux.next();
      etat.def = false;
      return null;
    },
    tokenTable: {
      controle: e.controle, commande: e.commande, predefinie: e.predefinie, variable: e.variable, type: e.type,
      fonction: e.fonction, condition: e.condition, balise: e.balise, attribut: e.attribut, chaine: e.chaine,
      commentaire: e.commentaire, maths: e.maths, nombre: e.nombre, accolade: e.accolade,
    },
  });
}

const TYPES = liste(['text', 'integer', 'real', 'complex', 'rational', 'function', 'matrix']);
const FONCTIONS = liste(['wims', 'items', 'item', 'rows', 'row', 'column', 'position', 'floor', 'ceil', 'rint', 'abs', 'sqrt',
  'max', 'min', 'randint', 'random', 'shuffle', 'randitem', 'randomitem', 'evalue', 'simplify', 'solve', 'diff', 'int', 'pari',
  'maxima', 'yacas', 'draw', 'slib', 'teximg', 'htmlmath', 'texmath', 'asis']);
const CONDITIONS = liste(['isin', 'notin', 'iswordof', 'notwordof', 'isitemof', 'notitemof', 'islineof', 'notlineof', 'isvarof',
  'notvarof', 'issamecase', 'notsamecase', 'issametext', 'notsametext', 'and', 'or']);

export const langueDocuments = langueBarre('wimsdoc', {
  controle: liste(['def', 'define', 'if', 'for', 'while', 'else', 'comment']),
  commandes: liste(['exercise', 'link', 'href', 'tool', 'doc', 'fold', 'embed', 'glossary', 'target', 'ref', 'slib', 'audio',
    'canvasdraw', 'draw', 'form', 'docform', 'example', 'help', 'adm', 'reload', 'resource', 'calcform', 'special',
    'exercisecheckbox']),
  predefinies: (m) => /^(sheet|scorerequire|scoregot|scoremean|scorebests|scorelevels|scorealltries|infoexo\d*|nbexo|title|desc|today|expiration|user_login|user_firstname|user_lastname|class_code)$/.test(m),
  types: TYPES, fonctions: FONCTIONS, conditions: CONDITIONS,
});
