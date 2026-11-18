// Nova : langue des documents de WIMS (msg2wims : documents de la classe, pages de présentation des feuilles), pour
// CodeMirror 6 (2026-11-18, utilisateur, maquette B). Mots repris de la syntaxe wimsoef d'EditArea (types, fonctions,
// conditions) ; commandes de document de modules/adm/doc/primitives ; variables qu'adm/sheet donne à une page de
// présentation (scripts/adm/docsheet.prep). Analyse ligne à ligne (StreamLanguage, même principe qu'un mode de
// CodeMirror 5) ; \comment{...} à accolades imbriquées et \( ... \) peuvent passer d'une ligne à l'autre.
import { StreamLanguage, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const CONTROLE = /^(def|define|if|for|while|else|comment)$/;
const COMMANDES = /^(exercise|link|href|tool|doc|fold|embed|glossary|target|ref|slib|audio|canvasdraw|draw|form|docform|example|help|adm|reload|resource|calcform|special|exercisecheckbox)$/;
const PREDEFINIES = /^(sheet|scorerequire|scoregot|scoremean|scorebests|scorelevels|scorealltries|infoexo\d*|nbexo|title|desc|today|expiration|user_login|user_firstname|user_lastname|class_code)$/;
const TYPES = /^(text|integer|real|complex|rational|function|matrix)$/;
const FONCTIONS = /^(wims|items|item|rows|row|column|position|floor|ceil|rint|abs|sqrt|max|min|randint|random|shuffle|randitem|randomitem|evalue|simplify|solve|diff|int|pari|maxima|yacas|draw|slib|teximg|htmlmath|texmath|asis)$/;
const CONDITIONS = /^(isin|notin|iswordof|notwordof|isitemof|notitemof|islineof|notlineof|isvarof|notvarof|issamecase|notsamecase|issametext|notsametext|and|or)$/;

const langue = {
  name: 'wimsdoc',
  startState: () => ({ commentaire: 0, maths: false, balise: false, def: false }),
  copyState: (s) => Object.assign({}, s),
  token(flux, etat) {
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
      const nom = commande[1];
      if (nom === 'def' || nom === 'define') etat.def = true;
      return CONTROLE.test(nom) ? 'controle' : COMMANDES.test(nom) ? 'commande' : PREDEFINIES.test(nom) ? 'predefinie' : 'variable';
    }
    if (etat.def && flux.eat('{')) {
      etat.def = false;
      const type = flux.match(/^\s*(\w+)(?=\s)/, false);
      if (type && TYPES.test(type[1])) { etat.type = true; }
      return 'accolade';
    }
    if (etat.type) { etat.type = false; flux.eatSpace(); flux.match(/^\w+/); return 'type'; }
    if (flux.match(/^<\/?[A-Za-z][\w-]*/)) { etat.balise = true; return 'balise'; }
    if (flux.match(/^<!--.*?(-->|$)/)) return 'commentaire';
    const mot = flux.match(/^[A-Za-z_]\w*/);
    if (mot) {
      if (FONCTIONS.test(mot[0]) && flux.peek() === '(') return 'fonction';
      if (CONDITIONS.test(mot[0])) return 'condition';
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
    controle: t.controlKeyword, commande: t.keyword, predefinie: t.special(t.variableName), variable: t.variableName,
    type: t.typeName, fonction: t.function(t.variableName), condition: t.compareOperator, balise: t.tagName,
    attribut: t.attributeName, chaine: t.string, commentaire: t.blockComment, maths: t.special(t.string),
    nombre: t.number, accolade: t.brace,
  },
};

export const langueDocuments = StreamLanguage.define(langue);

// Couleurs par classes (_css/editeur.css, jetons de Nova).
export const couleursDocuments = HighlightStyle.define([
  { tag: t.controlKeyword, class: 'nova-cm-controle' },
  { tag: t.keyword, class: 'nova-cm-commande' },
  { tag: t.special(t.variableName), class: 'nova-cm-predefinie' },
  { tag: t.variableName, class: 'nova-cm-variable' },
  { tag: t.typeName, class: 'nova-cm-type' },
  { tag: t.function(t.variableName), class: 'nova-cm-fonction' },
  { tag: t.compareOperator, class: 'nova-cm-condition' },
  { tag: t.tagName, class: 'nova-cm-balise' },
  { tag: t.attributeName, class: 'nova-cm-attribut' },
  { tag: t.string, class: 'nova-cm-chaine' },
  { tag: t.blockComment, class: 'nova-cm-commentaire' },
  { tag: t.special(t.string), class: 'nova-cm-maths' },
  { tag: t.number, class: 'nova-cm-nombre' },
  { tag: t.brace, class: 'nova-cm-accolade' },
]);
