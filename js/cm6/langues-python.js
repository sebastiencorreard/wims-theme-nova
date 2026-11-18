// Nova : Python pour l'éditeur de code (js/cm6-python.js, chargé à la demande par js/cm6.js ; 2026-11-18). Paquet
// officiel de CodeMirror 6. S'inscrit dans window.NovaEditeur.langues.
import { python } from '@codemirror/lang-python';

Object.assign(window.NovaEditeur.langues, { python: python() });
