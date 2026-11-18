// Nova : éditeur de code des documents (CodeMirror 6), assemblé en js/cm6.js par construire-cm6.sh (2026-11-18,
// utilisateur). Publie window.NovaEditeur.creer(zone, textes) : l'éditeur se pose après la zone de texte de WIMS,
// qu'il cache et tient à jour (c'est elle qui part avec le formulaire : sans JavaScript, rien ne change).
// Chargé par nova.js (editeurDocuments) sur les seules pages qui en ont besoin.
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, syntaxHighlighting } from '@codemirror/language';
import { search, searchKeymap, highlightSelectionMatches, SearchQuery, setSearchQuery, getSearchQuery, findNext, findPrevious,
  replaceNext, replaceAll, openSearchPanel } from '@codemirror/search';
import { langueDocuments, couleursDocuments } from './langue-documents.js';

// Barre de recherche et de remplacement (2026-11-18, utilisateur) : panneau de recherche de CodeMirror redessiné, ouvert
// en permanence au-dessus du texte (Echap ne le ferme pas ; Ctrl+F y place le curseur). Aucun champ n'a de nom : la barre
// est dans le formulaire de WIMS et ne doit rien y ajouter ; boutons type=button, Entree interceptee (sinon envoi).
function barreRecherche(vue) {
  const p = (s) => vue.state.phrase(s);
  const el = (tag, attrs, ...enfants) => {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    enfants.forEach((x) => e.append(x));
    return e;
  };
  const champ = el('input', { class: 'cm-textfield', placeholder: p('Find'), 'aria-label': p('Find'), 'main-field': 'true', autocomplete: 'off', spellcheck: 'false' });
  const rempl = el('input', { class: 'cm-textfield', placeholder: p('Replace'), 'aria-label': p('Replace'), autocomplete: 'off', spellcheck: 'false' });
  const option = (texte) => { const c = el('input', { type: 'checkbox' }); return [c, el('label', {}, c, ' ' + texte)]; };
  const [casse, lCasse] = option(p('match case'));
  const [re, lRe] = option(p('regexp'));
  const [mot, lMot] = option(p('by word'));
  const lire = () => new SearchQuery({ search: champ.value, caseSensitive: casse.checked, regexp: re.checked, wholeWord: mot.checked, replace: rempl.value });
  const maj = () => { const q = lire(); if (!q.eq(getSearchQuery(vue.state))) vue.dispatch({ effects: setSearchQuery.of(q) }); };
  const bouton = (texte, cmd, cls) => {
    const b = el('button', { type: 'button', class: 'cm-button' + (cls ? ' ' + cls : '') }, texte);
    b.addEventListener('click', () => { maj(); cmd(vue); });
    return b;
  };
  const touches = (e, cmd) => {
    if (e.key === 'Enter') { e.preventDefault(); maj(); (e.shiftKey && cmd === findNext ? findPrevious : cmd)(vue); }
    else if (e.key === 'Escape') { e.preventDefault(); vue.focus(); }
  };
  champ.addEventListener('input', maj); rempl.addEventListener('input', maj);
  [casse, re, mot].forEach((c) => c.addEventListener('change', maj));
  champ.addEventListener('keydown', (e) => touches(e, findNext));
  rempl.addEventListener('keydown', (e) => touches(e, replaceNext));
  const dom = el('div', { class: 'nova-cm-barre', role: 'search' },
    el('div', { class: 'nova-cm-groupe' }, champ, bouton(p('previous'), findPrevious), bouton(p('next'), findNext), lCasse, lRe, lMot),
    el('div', { class: 'nova-cm-groupe' }, rempl, bouton(p('replace'), replaceNext), bouton(p('replace all'), replaceAll)));
  return {
    dom, top: true,
    update(u) {
      for (const tr of u.transactions) for (const e of tr.effects) {
        if (e.is(setSearchQuery) && !e.value.eq(lire())) {
          const q = e.value;
          champ.value = q.search; rempl.value = q.replace; casse.checked = q.caseSensitive; re.checked = q.regexp; mot.checked = q.wholeWord;
        }
      }
    },
  };
}

function creer(zone, textes) {
  const recopier = (v) => { if (zone.value !== v) zone.value = v; };
  const vue = new EditorView({
    parent: zone.parentNode,
    state: EditorState.create({
      doc: zone.value,
      extensions: [
        lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), drawSelection(),
        highlightActiveLine(), bracketMatching(), highlightSelectionMatches(), search({ top: true, createPanel: barreRecherche }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap.filter((k) => k.key !== 'Escape'), indentWithTab]),
        langueDocuments, syntaxHighlighting(couleursDocuments),
        EditorState.tabSize.of(2),
        EditorState.phrases.of(textes || {}),
        // Classe de l'éditeur déclarée ici : CodeMirror réécrit les classes de son élément à chaque mise à jour.
        EditorView.editorAttributes.of({ class: 'nova-editeur' }),
        // Lignes longues repliées : l'éditeur garde la largeur de la zone de WIMS.
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': (textes && textes['Source']) || 'Source', spellcheck: 'false' }),
        EditorView.updateListener.of((u) => { if (u.docChanged) recopier(u.state.doc.toString()); }),
      ],
    }),
  });
  zone.parentNode.insertBefore(vue.dom, zone.nextSibling);
  zone.classList.add('nova-editeur-zone');
  openSearchPanel(vue); // barre ouverte d'emblée (sans prendre le curseur : notre panneau ne le demande pas)
  // Envoi : dernière recopie (sécurité), avant que le formulaire ne parte.
  if (zone.form) zone.form.addEventListener('formdata', () => recopier(vue.state.doc.toString()));
  return vue;
}

window.NovaEditeur = { creer };
