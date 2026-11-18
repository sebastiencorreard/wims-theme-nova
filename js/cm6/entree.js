// Nova : éditeur de code des documents (CodeMirror 6), assemblé en js/cm6.js par construire-cm6.sh (2026-11-18,
// utilisateur). Publie window.NovaEditeur.creer(zone, textes) : l'éditeur se pose après la zone de texte de WIMS,
// qu'il cache et tient à jour (c'est elle qui part avec le formulaire : sans JavaScript, rien ne change).
// Chargé par nova.js (editeurDocuments) sur les seules pages qui en ont besoin.
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, syntaxHighlighting } from '@codemirror/language';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { langueDocuments, couleursDocuments } from './langue-documents.js';

function creer(zone, textes) {
  const recopier = (v) => { if (zone.value !== v) zone.value = v; };
  const vue = new EditorView({
    parent: zone.parentNode,
    state: EditorState.create({
      doc: zone.value,
      extensions: [
        lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), drawSelection(),
        highlightActiveLine(), bracketMatching(), highlightSelectionMatches(), search({ top: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        langueDocuments, syntaxHighlighting(couleursDocuments),
        EditorState.tabSize.of(2),
        EditorState.phrases.of(textes || {}),
        // Classe de l'éditeur déclarée ici : CodeMirror réécrit les classes de son élément à chaque mise à jour.
        EditorView.editorAttributes.of({ class: 'nova-editeur' }),
        EditorView.contentAttributes.of({ 'aria-label': (textes && textes['Source']) || 'Source', spellcheck: 'false' }),
        EditorView.updateListener.of((u) => { if (u.docChanged) recopier(u.state.doc.toString()); }),
      ],
    }),
  });
  zone.parentNode.insertBefore(vue.dom, zone.nextSibling);
  zone.classList.add('nova-editeur-zone');
  // Envoi : dernière recopie (sécurité), avant que le formulaire ne parte.
  if (zone.form) zone.form.addEventListener('formdata', () => recopier(vue.state.doc.toString()));
  return vue;
}

window.NovaEditeur = { creer };
