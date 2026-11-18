// Nova : HTML, CSS et JavaScript pour l'éditeur de code (js/cm6-web.js, chargé à la demande par js/cm6.js ;
// 2026-11-18). Paquets officiels de CodeMirror 6 (analyseurs Lezer) ; HTML colore aussi ses <style> et <script>.
// S'inscrit dans window.NovaEditeur.langues.
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

Object.assign(window.NovaEditeur.langues, { html: html(), css: css(), js: javascript() });
