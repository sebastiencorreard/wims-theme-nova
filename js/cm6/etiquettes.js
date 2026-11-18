// Nova : étiquettes de coloration des langues de WIMS (2026-11-18). Partagées entre js/cm6.js et les fichiers de langues
// chargés à la demande (cm6-wims.js…) sous le nom « nova-etiquettes » (construire.mjs) : une seule copie, sinon les
// couleurs de entree.js ne s'appliqueraient pas. Les langues officielles (HTML, CSS, JavaScript, Python) gardent les
// étiquettes standard de @lezer/highlight, colorées aussi par entree.js.
import { Tag } from '@lezer/highlight';

export const controle = Tag.define();
export const commande = Tag.define();
export const predefinie = Tag.define();
export const variable = Tag.define();
export const type = Tag.define();
export const fonction = Tag.define();
export const condition = Tag.define();
export const balise = Tag.define();
export const attribut = Tag.define();
export const chaine = Tag.define();
export const commentaire = Tag.define();
export const maths = Tag.define();
export const nombre = Tag.define();
export const accolade = Tag.define();
export const supprime = Tag.define();
export const insere = Tag.define();
export const entete = Tag.define();
