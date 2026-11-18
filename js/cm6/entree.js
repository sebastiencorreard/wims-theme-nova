// Nova : éditeur de code (CodeMirror 6), assemblé en js/cm6.js par construire-cm6.sh (2026-11-18, utilisateur). Publie
// window.NovaEditeur.creer(zone, options) : l'éditeur se pose après la zone de texte de WIMS, qu'il cache et tient à jour
// (c'est elle qui part avec le formulaire : sans JavaScript, rien ne change). Chargé par nova.js (editeursCode) sur les
// pages qui en ont besoin : documents, page de présentation d'une feuille, et partout où WIMS lançait EditArea.
// Barre d'une ligne (maquette 2026-11-18, utilisateur) : annuler, refaire, rechercher (fenêtre dans le coin de
// l'éditeur, variante A), taille du texte, plein écran, et choix de la coloration quand WIMS le proposait.
// Langues : documents ici ; les autres dans cm6-wims.js, cm6-web.js, cm6-python.js, chargés à la demande, qui
// reprennent les modules partagés (window.NovaEditeur.modules, une seule copie : construire.mjs).
import * as moduleEtat from '@codemirror/state';
import * as moduleVue from '@codemirror/view';
import * as moduleLangage from '@codemirror/language';
import * as moduleArbre from '@lezer/common';
import * as moduleSurligne from '@lezer/highlight';
import * as e from 'nova-etiquettes';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, runScopeHandlers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth } from '@codemirror/commands';
import { bracketMatching, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { search, searchKeymap, highlightSelectionMatches, SearchQuery, setSearchQuery, getSearchQuery, findNext, findPrevious,
  replaceNext, replaceAll, openSearchPanel, closeSearchPanel, searchPanelOpen } from '@codemirror/search';
import { tags as t } from '@lezer/highlight';
import { langueDocuments } from './langue-documents.js';
import { ICONES } from './icones.js';

// --- Couleurs : classes nova-cm-… (_css/editeur.css). Étiquettes de Nova, puis étiquettes standard (langues officielles).
const couleurs = HighlightStyle.define([
  { tag: e.controle, class: 'nova-cm-controle' }, { tag: e.commande, class: 'nova-cm-commande' },
  { tag: e.predefinie, class: 'nova-cm-predefinie' }, { tag: e.variable, class: 'nova-cm-variable' },
  { tag: e.type, class: 'nova-cm-type' }, { tag: e.fonction, class: 'nova-cm-fonction' },
  { tag: e.condition, class: 'nova-cm-condition' }, { tag: e.balise, class: 'nova-cm-balise' },
  { tag: e.attribut, class: 'nova-cm-attribut' }, { tag: e.chaine, class: 'nova-cm-chaine' },
  { tag: e.commentaire, class: 'nova-cm-commentaire' }, { tag: e.maths, class: 'nova-cm-maths' },
  { tag: e.nombre, class: 'nova-cm-nombre' }, { tag: e.accolade, class: 'nova-cm-accolade' },
  { tag: e.supprime, class: 'nova-cm-supprime' }, { tag: e.insere, class: 'nova-cm-insere' }, { tag: e.entete, class: 'nova-cm-entete' },
  { tag: [t.controlKeyword, t.moduleKeyword], class: 'nova-cm-controle' },
  { tag: [t.keyword, t.operatorKeyword, t.definitionKeyword], class: 'nova-cm-commande' },
  { tag: [t.standard(t.variableName), t.self, t.special(t.variableName)], class: 'nova-cm-predefinie' },
  { tag: [t.typeName, t.className, t.namespace], class: 'nova-cm-type' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], class: 'nova-cm-fonction' },
  { tag: [t.tagName, t.angleBracket, t.meta, t.documentMeta], class: 'nova-cm-balise' },
  { tag: [t.attributeName, t.propertyName], class: 'nova-cm-attribut' },
  { tag: [t.string, t.attributeValue, t.regexp, t.escape, t.special(t.string)], class: 'nova-cm-chaine' },
  { tag: t.comment, class: 'nova-cm-commentaire' },
  { tag: [t.number, t.bool, t.null, t.atom, t.unit, t.color], class: 'nova-cm-nombre' },
  { tag: [t.compareOperator, t.logicOperator], class: 'nova-cm-condition' },
  { tag: [t.heading, t.labelName], class: 'nova-cm-entete' },
  { tag: t.deleted, class: 'nova-cm-supprime' }, { tag: t.inserted, class: 'nova-cm-insere' },
  { tag: t.invalid, class: 'nova-cm-invalide' },
]);

// --- Langues : nom WIMS (syntaxes d'EditArea) -> libellé et fichier qui la porte.
const NOMS = { wimsoef: 'OEF', wimsdata: 'WIMS data', wims: 'WIMS', css: 'CSS', html: 'HTML', js: 'JavaScript', gp: 'Pari/GP',
  octave: 'Octave', flydraw: 'Flydraw', wimsdoc: 'Doc', python: 'Python', diff: 'diff' };
const FICHIERS = { wimsoef: 'wims', wimsdata: 'wims', wims: 'wims', gp: 'wims', octave: 'wims', flydraw: 'wims', diff: 'wims',
  css: 'web', html: 'web', js: 'web', python: 'python' };
const langues = { wimsdoc: langueDocuments };
const chargements = {};
function chargerLangue(nom, adresse) {
  if (langues[nom] || !FICHIERS[nom] || !adresse) return Promise.resolve(langues[nom] || null);
  const f = FICHIERS[nom];
  if (!chargements[f]) {
    chargements[f] = new Promise((fini) => {
      const s = document.createElement('script');
      s.src = adresse(f);
      s.onload = s.onerror = () => fini();
      document.head.appendChild(s);
    });
  }
  return chargements[f].then(() => langues[nom] || null);
}

// --- Petits outils de construction.
function el(tag, attrs, ...enfants) {
  const n = document.createElement(tag);
  for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
  enfants.forEach((x) => { if (x != null) n.append(x); });
  return n;
}
function icone(nom) {
  const s = el('span', { class: 'nova-cm-icone', 'aria-hidden': 'true' });
  s.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONES[nom] + '</svg>';
  return s;
}
function bouton(nomIcone, titre, action, texte) {
  const b = el('button', { type: 'button', class: 'nova-cm-bouton', title: titre, 'aria-label': titre }, icone(nomIcone), texte || null);
  b.addEventListener('mousedown', (ev) => ev.preventDefault()); // garder le curseur dans l'éditeur
  b.addEventListener('click', action);
  return b;
}

// --- Taille du texte, commune à tous les éditeurs (localStorage nova-editeur-taille, en px).
const TAILLE = { min: 10, max: 28, defaut: 14 };
function lireTaille() {
  try { const v = parseInt(localStorage.getItem('nova-editeur-taille'), 10); if (v >= TAILLE.min && v <= TAILLE.max) return v; } catch (x) { /* stockage fermé */ }
  return TAILLE.defaut;
}
function poserTaille(v) {
  v = Math.max(TAILLE.min, Math.min(TAILLE.max, v));
  try { if (v === TAILLE.defaut) localStorage.removeItem('nova-editeur-taille'); else localStorage.setItem('nova-editeur-taille', String(v)); } catch (x) { /* stockage fermé */ }
  document.querySelectorAll('.nova-editeur-cadre').forEach((c) => {
    c.style.setProperty('--nova-editeur-taille', v + 'px');
    if (c.novaVue) c.novaVue.requestMeasure();
    const val = c.querySelector('.nova-cm-taille-valeur');
    if (val) val.textContent = v + ' px';
  });
  return v;
}

// --- Fenêtre de recherche et de remplacement (variante A) : panneau de recherche de CodeMirror, redessiné, placé dans le
// coin de l'éditeur (_css/editeur.css). Elle est DANS le formulaire de WIMS : aucun nom sur ses champs, boutons
// type=button, Entrée interceptée (sinon envoi du formulaire).
function fenetreRecherche(lecture) {
  return (vue) => {
    const p = (s) => vue.state.phrase(s);
    const champ = el('input', { class: 'nova-cm-champ', placeholder: p('Find'), 'aria-label': p('Find'), 'main-field': 'true', autocomplete: 'off', spellcheck: 'false' });
    const rempl = el('input', { class: 'nova-cm-champ', placeholder: p('Replace'), 'aria-label': p('Replace'), autocomplete: 'off', spellcheck: 'false' });
    const options = {};
    const maj = () => { const q = lire(); if (!q.eq(getSearchQuery(vue.state))) vue.dispatch({ effects: setSearchQuery.of(q) }); };
    const option = (cle, nomIcone, titre) => {
      const b = bouton(nomIcone, titre, () => { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); maj(); });
      b.setAttribute('aria-pressed', 'false');
      options[cle] = b;
      return b;
    };
    const actif = (cle) => options[cle].getAttribute('aria-pressed') === 'true';
    function lire() { return new SearchQuery({ search: champ.value, caseSensitive: actif('casse'), regexp: actif('regexp'), wholeWord: actif('mot'), replace: rempl.value }); }
    const commande = (cmd) => () => { maj(); cmd(vue); };
    const compteur = el('span', { class: 'nova-cm-compteur', 'aria-live': 'polite' });
    const compter = (etat) => {
      const q = getSearchQuery(etat);
      if (!q.search || !q.valid) { compteur.textContent = ''; compteur.classList.remove('nova-cm-aucun'); return; }
      const sel = etat.selection.main;
      let n = 0, rang = 0;
      const curseur = q.getCursor(etat);
      for (let r = curseur.next(); !r.done; r = curseur.next()) {
        n++;
        if (!rang && r.value.from >= sel.from) rang = n;
        if (n >= 1000) break;
      }
      compteur.classList.toggle('nova-cm-aucun', n === 0);
      compteur.textContent = n === 0 ? p('No results') : (rang || 1) + ' ' + p('of') + ' ' + (n >= 1000 ? '1000+' : n);
    };
    const ligneRempl = el('div', { class: 'nova-cm-ligne nova-cm-remplacement' }, rempl,
      bouton('remplacer', p('replace'), commande(replaceNext)), bouton('tout', p('replace all'), commande(replaceAll)));
    const bascule = bouton('bas', p('Show replace'), () => {
      const ouvrir = ligneRempl.hidden;
      ligneRempl.hidden = !ouvrir;
      bascule.replaceChild(icone(ouvrir ? 'bas' : 'droite'), bascule.firstChild);
      bascule.setAttribute('aria-expanded', String(ouvrir));
    });
    bascule.classList.add('nova-cm-bascule');
    bascule.setAttribute('aria-expanded', 'true');
    if (lecture) { ligneRempl.hidden = true; bascule.hidden = true; }
    champ.addEventListener('input', maj); rempl.addEventListener('input', maj);
    const dom = el('div', { class: 'nova-cm-recherche', role: 'search' },
      el('div', { class: 'nova-cm-ligne' }, bascule, champ, option('casse', 'casse', p('match case')), option('mot', 'mot', p('by word')),
        option('regexp', 'regexp', p('regexp')), compteur,
        bouton('haut', p('previous') + ' (Maj+Entrée)', commande(findPrevious)), bouton('bas', p('next') + ' (Entrée)', commande(findNext)),
        bouton('fermer', p('close') + ' (Échap)', () => { closeSearchPanel(vue); vue.focus(); })),
      ligneRempl);
    dom.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.target === champ || ev.target === rempl)) {
        ev.preventDefault();
        maj();
        (ev.target === rempl ? replaceNext : ev.shiftKey ? findPrevious : findNext)(vue);
      } else if (runScopeHandlers(vue, ev, 'search-panel')) ev.preventDefault();
    });
    compter(vue.state);
    return {
      dom, top: true,
      mount() { champ.select(); },
      update(u) {
        let q = null;
        for (const tr of u.transactions) for (const x of tr.effects) if (x.is(setSearchQuery)) q = x.value;
        if (q && !q.eq(lire())) {
          champ.value = q.search; rempl.value = q.replace;
          options.casse.setAttribute('aria-pressed', String(q.caseSensitive));
          options.mot.setAttribute('aria-pressed', String(q.wholeWord));
          options.regexp.setAttribute('aria-pressed', String(q.regexp));
        }
        if (q || u.docChanged || u.selectionSet) compter(u.state);
      },
    };
  };
}

/* zone : textarea de WIMS. o : textes (phrases), langue (nom WIMS), choix (noms proposés dans « Coloration »), lecture
   (lecture seule), adresse (f) -> adresse de cm6-<f>.js. */
function creer(zone, o) {
  o = o || {};
  const textes = o.textes || {};
  const lecture = !!o.lecture;
  const p = (s) => textes[s] || s;
  const langueC = new Compartment();
  const recopier = (v) => { if (!lecture && zone.value !== v) zone.value = v; };
  const cadre = el('div', { class: 'nova-editeur-cadre' + (lecture ? ' nova-editeur-lecture' : '') });
  cadre.style.setProperty('--nova-editeur-taille', lireTaille() + 'px');
  zone.parentNode.insertBefore(cadre, zone.nextSibling);
  let majBarre = () => {};
  const vue = new EditorView({
    parent: cadre,
    state: EditorState.create({
      doc: zone.value,
      extensions: [
        lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), drawSelection(),
        highlightActiveLine(), bracketMatching(), highlightSelectionMatches(),
        search({ top: true, createPanel: fenetreRecherche(lecture) }),
        // Échap en plein écran : en sortir d'abord (avant « désélectionner » de CodeMirror), sauf fenêtre de recherche ouverte.
        Prec.highest(keymap.of([{ key: 'Escape', run: (v) => {
          if (!cadre.classList.contains('nova-editeur-plein') || searchPanelOpen(v.state)) return false;
          plein(false); return true;
        } }])),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        langueC.of([]), syntaxHighlighting(couleurs),
        EditorState.tabSize.of(2),
        EditorState.readOnly.of(lecture),
        EditorState.phrases.of(textes),
        // Classe de l'éditeur déclarée ici : CodeMirror réécrit les classes de son élément à chaque mise à jour.
        EditorView.editorAttributes.of({ class: 'nova-editeur' }),
        // Lignes longues repliées : l'éditeur garde la largeur de la zone de WIMS.
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': p('Source'), spellcheck: 'false' }),
        EditorView.updateListener.of((u) => { if (u.docChanged) recopier(u.state.doc.toString()); majBarre(u.state); }),
      ],
    }),
  });
  cadre.novaVue = vue;
  zone.classList.add('nova-editeur-zone');
  // Envoi : dernière recopie (sécurité), avant que le formulaire ne parte.
  if (zone.form) zone.form.addEventListener('formdata', () => recopier(vue.state.doc.toString()));

  // --- Barre.
  const barre = el('div', { class: 'nova-editeur-barre', role: 'toolbar', 'aria-label': p('Source') });
  const bAnnuler = bouton('annuler', p('Undo') + ' (Ctrl+Z)', () => undo(vue));
  const bRefaire = bouton('refaire', p('Redo') + ' (Ctrl+Y)', () => redo(vue));
  const bChercher = bouton('chercher', p('Find') + ' (Ctrl+F)', () => {
    if (searchPanelOpen(vue.state)) { closeSearchPanel(vue); vue.focus(); } else openSearchPanel(vue);
  }, el('span', { class: 'nova-cm-libelle' }, p('Find')));
  bChercher.append(el('kbd', {}, 'Ctrl F'));
  const sep = () => el('span', { class: 'nova-cm-sep', 'aria-hidden': 'true' });
  // Taille du texte : bulle sous le bouton.
  const valeur = el('span', { class: 'nova-cm-taille-valeur' }, lireTaille() + ' px');
  const bDefaut = el('button', { type: 'button', class: 'nova-cm-lien' }, p('Default'));
  bDefaut.addEventListener('click', () => poserTaille(TAILLE.defaut));
  const bulle = el('div', { class: 'nova-cm-bulle', role: 'group', 'aria-label': p('Text size') },
    bouton('taille', p('Smaller text'), () => poserTaille(lireTaille() - 1), '−'), valeur,
    bouton('taille', p('Larger text'), () => poserTaille(lireTaille() + 1), '+'), bDefaut);
  bulle.hidden = true;
  const bTaille = bouton('taille', p('Text size'), () => { bulle.hidden = !bulle.hidden; bTaille.setAttribute('aria-expanded', String(!bulle.hidden)); });
  bTaille.setAttribute('aria-expanded', 'false');
  document.addEventListener('mousedown', (ev) => {
    if (!bulle.hidden && !bulle.contains(ev.target) && !bTaille.contains(ev.target)) { bulle.hidden = true; bTaille.setAttribute('aria-expanded', 'false'); }
  });
  // Plein écran : l'éditeur couvre la fenêtre du navigateur (sans l'API Fullscreen : Échap en sort aussi).
  const bPlein = bouton('plein', p('Full screen'), () => plein(!cadre.classList.contains('nova-editeur-plein')));
  function plein(oui) {
    cadre.classList.toggle('nova-editeur-plein', oui);
    document.documentElement.classList.toggle('nova-editeur-ouvert', !!document.querySelector('.nova-editeur-plein'));
    const titre = oui ? p('Exit full screen') : p('Full screen');
    bPlein.replaceChild(icone(oui ? 'quitter' : 'plein'), bPlein.firstChild);
    bPlein.title = titre; bPlein.setAttribute('aria-label', titre); bPlein.setAttribute('aria-pressed', String(oui));
    vue.requestMeasure();
    vue.focus();
  }
  cadre.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || ev.defaultPrevented) return;
    if (!bulle.hidden) { bulle.hidden = true; bTaille.focus(); ev.preventDefault(); } else if (cadre.classList.contains('nova-editeur-plein')) { plein(false); ev.preventDefault(); }
  });
  if (!lecture) barre.append(bAnnuler, bRefaire, sep());
  barre.append(bChercher, sep(), el('span', { class: 'nova-cm-ancre' }, bTaille, bulle), bPlein);
  // Coloration : proposée là où WIMS proposait le choix de syntaxe (EditArea : syntax_selection).
  let choix = null;
  const appliquer = (nom) => {
    if (choix) choix.value = nom;
    chargerLangue(nom, o.adresse).then((ext) => vue.dispatch({ effects: langueC.reconfigure(ext || []) }));
  };
  const proposes = (o.choix || []).filter((n) => NOMS[n]);
  if (o.langue && proposes.length && proposes.indexOf(o.langue) < 0 && NOMS[o.langue]) proposes.unshift(o.langue);
  if (proposes.length > 1) {
    choix = el('select', { 'aria-label': p('Syntax') });
    proposes.forEach((n) => choix.append(el('option', { value: n }, NOMS[n])));
    choix.addEventListener('change', () => appliquer(choix.value));
    barre.append(el('span', { class: 'nova-cm-espace' }), el('label', { class: 'nova-cm-choix' }, p('Syntax') + ' ', choix));
  }
  cadre.insertBefore(barre, vue.dom);
  majBarre = (etat) => {
    bAnnuler.disabled = undoDepth(etat) === 0;
    bRefaire.disabled = redoDepth(etat) === 0;
    bChercher.setAttribute('aria-pressed', String(searchPanelOpen(etat)));
  };
  majBarre(vue.state);
  if (o.langue) appliquer(o.langue);
  return vue;
}

window.NovaEditeur = {
  creer, langues,
  // Modules partagés avec les fichiers de langues (construire.mjs) : une seule copie de chacun.
  modules: { '@codemirror/state': moduleEtat, '@codemirror/view': moduleVue, '@codemirror/language': moduleLangage,
    '@lezer/common': moduleArbre, '@lezer/highlight': moduleSurligne, 'nova-etiquettes': e },
};
