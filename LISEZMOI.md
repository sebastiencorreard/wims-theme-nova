# Nova — thème WIMS

Thème pour WIMS 4.32, dérivé de `standard` : sobre et lumineux, adapté au téléphone, mode sombre
automatique, chronomètre d'examen lisible. Maquettes validées :
https://claude.ai/artifact/BGmJJSzw8F45U1YmS9ZPrN

## Principes

- **Le HTML de WIMS n'est pas touché.** Les liens et formulaires (les fonctions) viennent des
  modules et des widgets ; Nova les *dispose* (CSS) et ajoute ce qui manque (JS sans dépendance).
- **Une seule couleur d'accent** : `ref_bgcolor` du site ou de la classe ; si elle est restée au
  gris par défaut de WIMS (`#676767`), la prune Nova (`#7A3B69`). Fond, image de fond et couleurs de
  menu de la classe sont ignorés : la lisibilité prime.
- **Feuilles métier de WIMS gardées** (`themes/_css/` : exercices, feuilles, examens, forum…), et
  surchargées par Nova en fin de fichier. Foundation n'est gardé que pour ce que WIMS utilise
  (`_css/foundation-min.css`) ; son JavaScript reste chargé.
- **Mode sombre** : le cadre (barre, menu, fil d'Ariane, fond) passe en sombre ; la zone de contenu
  (`.wimsbody`) reste une feuille claire, car modules et jQuery UI écrivent leurs couleurs pour un
  fond clair (audit : 70 pages sur 88 illisibles en tout-sombre).

## Organisation

| Fichier | Rôle |
|---|---|
| `css.css.template` | liste ordonnée des feuilles concaténées dans `css.css` |
| `construire-css.sh` | construit `css.css` (remplace `mkcss.pl`, sans Java) ; `--lisible` pour ne pas minifier |
| `_css/polices.css`, `polices/` | Atkinson Hyperlegible Next et Mono, servies localement (OFL) |
| `_css/jetons.css` | toutes les couleurs, tailles, espaces ; clair, sombre, et contenu clair en sombre |
| `_css/composants.css` | boutons, champs, tableaux, légendes, messages (couleurs que Standard écrivait dans htmlheader) |
| `_css/cadre.css` | barre du haut, fil d'Ariane, menu latéral (grille sur ordinateur, replié sur téléphone), contextes particuliers |
| `_css/chrono.css` | chronomètre d'examen et ses états |
| `_css/contenu.css` | contenu des modules : onglets, séquences, débordements, contrastes repris |
| `_css/foundation-min.css` | le sous-ensemble de Foundation encore utilisé |
| `_css/base.css` | police et couleurs de page, en dernier |
| `js/nova.js` | bouton du menu sur téléphone ; états du chronomètre, bandeau de fin, « Fin à » |
| `_widgets/headmenu.phtml`, `user_links.phtml` | copies des widgets WIMS ; l'entrée `chrono` devient le chronomètre Nova |
| `lang/name.phtml.{fr,en,nl}` | textes propres au thème (**latin-1**) |
| `htmlheader.phtml` | variables `--wims_*` reliées aux jetons ; accent ; `<meta name="nova-sombre">` |

Après toute modification de `_css/` : `./construire-css.sh`.

## Points de surcharge d'un thème WIMS (vérifiés dans 4.32)

- Les fichiers `header`, `tail`, `visitor`, `user`, `supervisor`, `docheader`, `doctail`,
  `mhelpheader`… du thème sont appelés par `html/themes.phtml` ; `htmlheader.phtml` et `css.css`
  sont lus par le code C. Il n'y a **pas** de surcharge générale de `html/*.phtml`.
- Un thème peut lire **ses propres copies de widgets** (`!read themes/Nova/_widgets/…`).
- Traductions : `lang/<module avec des _>_<script>.<langue>` est lu après le module
  (`scripts/adm/language`), par exemple `lang/adm_class_exam_lang_names.phtml.fr`.

## Pièges

- `css.css` mélange UTF-8 (feuilles Nova) et latin-1 (feuilles WIMS) et est lu en windows-1252 :
  dans `content:`, écrire les caractères en échappement CSS (`"\203A"`).
- Les gabarits `.phtml` et `lang/` sont envoyés au navigateur en windows-1252 : texte affiché en
  ASCII ou latin-1 ; les commentaires `!!` peuvent contenir n'importe quoi (jamais envoyés).
- Exceptions connues : cibles de glisser-déposer Dynapi (positionnées en absolu par leur script) ;
  pages allégées sans aucune feuille de style (aide de module, taxonomie `job=light`).

## Vérifier

Le banc de test est dans `../../banc-nova` (voir son LISEZMOI) : inventaire de toutes les pages par
rôle, comparaison avec Standard, scénario d'examen, mesures à 390 px et en sombre.
